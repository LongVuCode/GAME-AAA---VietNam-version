// jump.js - Demo 0.3 jump (combat_tuning.movement.jump, DEMO_0_3_DESIGN §2). Pure: no three.js.
// Vertical motion only (the game moves x/z with air control); the jump has NO i-frames, so its
// defensive value is height: ground waves (airborne_avoids_shapes) miss above airborne_avoid_min_height_m,
// charges still hit below charge_hits_airborne_below_m (no vaulting over the boar's head).
//
//   jc.request(now)                    jump pressed (kept for jump_buffer_s)
//   jc.tryStart(now, allowedNow)       starts the take-off if a buffered press exists, the state allows it,
//                                      and the player is on the ground or left it < coyote_time_s ago
//   jc.step(dt, { held })              advances take-off / flight; returns { landed, fallHeight } on touch-down
//   jc.setGrounded(onGround, now)      for leaving the ground without jumping (coyote time)
// Heights in metres above the ground, times in seconds (game time).

export class JumpController {
  constructor(j) {
    this.j = j;
    this.reset();
  }
  reset() {
    this.phase = 'ground';    // ground | takeoff | air
    this.y = 0; this.vy = 0; this.t = 0; this.airT = 0; this.peak = 0;
    this.pressAt = -Infinity; this.leftGroundAt = -Infinity; this.onGround = true;
    this.cut = false; this.hangT = 0; this.hangScale = 1; this.plunge = false; this.fullOnTap = false;
    this.lastApexT = null;
  }
  get airborne() { return this.phase === 'air'; }
  get busy() { return this.phase !== 'ground'; }
  /** Gravity on the way up and (×fall_gravity_mult) on the way down; heavy, not floaty. */
  get gravity() { return this.j.gravity_mps2 ?? 21.5; }
  get takeoffSpeed() { return this.j.takeoff_speed_mps ?? Math.sqrt(2 * this.gravity * (this.j.height_m ?? 1.1)); }

  request(now) { this.pressAt = now; }
  hasBuffered(now) { return now - this.pressAt <= (this.j.jump_buffer_s ?? 0.12); }
  setGrounded(onGround, now) {
    if (this.onGround && !onGround && this.phase === 'ground') this.leftGroundAt = now;
    this.onGround = onGround;
  }
  /** Coyote time: a jump is still allowed shortly after leaving the ground without jumping. */
  canLeaveGround(now) { return this.phase === 'ground' && (this.onGround || now - this.leftGroundAt <= (this.j.coyote_time_s ?? 0.1)); }

  /** allowedNow: the player's action state allows a jump (movement.jump.allowed_from, decided by the game). */
  tryStart(now, allowedNow, { fullOnTap = false } = {}) {
    if (!allowedNow || !this.hasBuffered(now) || !this.canLeaveGround(now)) return false;
    this.pressAt = -Infinity;
    this.phase = 'takeoff'; this.t = 0; this.cut = false; this.plunge = false; this.fullOnTap = fullOnTap;
    this.hangT = 0; this.hangScale = 1; this.peak = 0; this.airT = 0; this.lastApexT = null;
    return true;
  }

  /** Light air attack hang (air_attacks.light_hang_s at light_hang_gravity_scale). */
  hang(s, scale) { this.hangT = Math.max(this.hangT, s); this.hangScale = scale; if (this.vy < 0) this.vy *= 0.3; }
  /** Plunge: straight down at plunge_fall_speed_mps. */
  startPlunge() { this.plunge = true; this.vy = -(this.j.air_attacks?.plunge_fall_speed_mps ?? 18); }
  /** Leaves the ground with an explicit upward speed (skills that leap: Cắm sào vọt). */
  launch(vy) { this.phase = 'air'; this.vy = vy; this.y = Math.max(this.y, 0.001); this.cut = true; this.plunge = false; this.airT = 0; this.peak = this.y; this.lastApexT = null; }

  step(dt, { held = true } = {}) {
    const out = this._out ?? (this._out = { landed: false, fallHeight: 0, tookOff: false, apex: false });
    out.landed = false; out.tookOff = false; out.apex = false; out.fallHeight = 0;
    if (!(dt > 0) || this.phase === 'ground') return out;
    if (this.phase === 'takeoff') {
      this.t += dt;
      if (!held && !this.fullOnTap) this._released = true;
      if (this.t < (this.j.takeoff_s ?? 0.05)) return out;
      this.phase = 'air'; this.vy = this.takeoffSpeed; this.y = 0; out.tookOff = true;
    }
    this.airT += dt;
    const g = this.gravity, minH = this.j.min_height_m ?? 0.5, cutR = this.j.release_cut_ratio ?? 0.45;
    // Early release: cut the upward speed, but never below the minimum jump height.
    if ((!held || this._released) && !this.fullOnTap && !this.cut && this.vy > 0 && !this.plunge) {
      const v2 = this.vy * (1 - cutR);
      if (this.y + (v2 * v2) / (2 * g) >= minH) { this.vy = v2; this.cut = true; }
    }
    if (held && !this._released) { /* holding: full height */ }
    if (this.plunge) { this.y += this.vy * dt; }
    else {
      const k = this.hangT > 0 ? this.hangScale : 1;
      this.hangT = Math.max(0, this.hangT - dt);
      const up = this.vy > 0;
      const a = (up ? g : g * (this.j.fall_gravity_mult ?? 1.4)) * k;
      const vy0 = this.vy;
      this.vy -= a * dt; this.y += (vy0 + this.vy) * 0.5 * dt;
      if (vy0 > 0 && this.vy <= 0) { out.apex = true; this.lastApexT = this.airT; }
    }
    this.peak = Math.max(this.peak, this.y);
    if (this.y <= 0 && this.vy < 0) {
      out.landed = true; out.fallHeight = this.peak;
      this.y = 0; this.vy = 0; this.phase = 'ground'; this._released = false; this.plunge = false; this.hangT = 0;
    }
    return out;
  }
}

/** Landing lag (movement.jump.landing): none below lag_free_height_m, then lag_per_m_above_s per metre, capped. */
export function landingLag(fallHeight, landing) {
  const free = landing?.lag_free_height_m ?? 1.2;
  if (!(fallHeight > free)) return 0;
  return Math.min(landing?.max_lag_s ?? 0.35, (fallHeight - free) * (landing?.lag_per_m_above_s ?? 0.12));
}

/** Does an airborne player at height y avoid an attack shape (ring_wave only, from 0.35 m)? */
export function airborneAvoids(shape, y, j) {
  return (j?.airborne_avoids_shapes ?? ['ring_wave']).includes(shape) && y >= (j?.airborne_avoid_min_height_m ?? 0.35);
}
/** Charges hit an airborne player below charge_hits_airborne_below_m (1.4 m > max jump 1.1 m). */
export function chargeHitsAirborne(y, j) { return y < (j?.charge_hits_airborne_below_m ?? 1.4); }

/** Ideal (hold) flight time of a jump: up to the apex at g, down at g × fall_gravity_mult. */
export function flightTime(j) {
  const g = j.gravity_mps2, v = j.takeoff_speed_mps, h = (v * v) / (2 * g);
  return v / g + Math.sqrt((2 * h) / (g * (j.fall_gravity_mult ?? 1)));
}

/**
 * Ring-wave hit test (enemies.json ring_wave): the ring edge radius grows from start to end over the
 * active window; the player is touched when the band [r - thick/2, r + thick/2] swept this frame
 * contains the player's distance (plus body radius). Returns true on contact.
 */
export function ringWaveTouches(dist, r0, r1, thick, bodyR = 0.4) {
  const lo = Math.min(r0, r1) - thick / 2 - bodyR, hi = Math.max(r0, r1) + thick / 2 + bodyR;
  return dist >= lo && dist <= hi;
}
