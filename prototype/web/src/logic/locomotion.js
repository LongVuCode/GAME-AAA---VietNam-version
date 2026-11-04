// locomotion.js - player movement model (combat_tuning.movement, combat_tuning.dodge, FUN_PASS_0_2
// P0-1 / P1): three gaits (walk / run / sprint), acceleration and deceleration, turn rate per gait,
// pivot turn, sprint stop skid, lean into turns and on acceleration, lock-on strafing, 8-way dodge
// planning (backstep when neutral, longer from a sprint, chain limit). Pure: numbers in, numbers out.
// Yaw convention (same as the game): yaw 0 faces +z, forward = (sin yaw, cos yaw).

export const DEG = Math.PI / 180;
export function normAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
export function turnToward(yaw, target, maxStep) { return yaw + Math.max(-maxStep, Math.min(maxStep, normAngle(target - yaw))); }
export function approach(v, target, step) { return v < target ? Math.min(target, v + step) : Math.max(target, v - step); }

/** Analog input below this magnitude walks (pad: "light tilt walks", controls.json move note). */
export const ANALOG_WALK_BELOW = 0.55;

export class Locomotion {
  constructor(mv) {
    this.mv = mv;
    this.reset();
  }
  reset() {
    this.speed = 0; this.vx = 0; this.vz = 0; this.gait = 'idle';
    this.sprintT = 0; this.sprinting = false; this.skidT = 0; this.pivotT = 0; this.pivotYaw = 0;
    this.lean = 0; this.pitchLean = 0; this.skidV0 = 0; this.turnRate = 0; this.accel = 0; this.wasSprintS = 0;
  }

  /** Target speed for the input (m/s). opts: { mag, walk, sprint, guard, strafe }. */
  targetSpeed({ mag, walk, sprint, guard, strafe }) {
    const m = this.mv;
    if (mag < 0.05) return 0;
    if (guard) return m.guard_walk_speed_mps ?? m.walk_speed_mps;
    if (sprint) return m.sprint_speed_mps;
    if (walk) return m.walk_speed_mps;
    if (strafe) return Math.min(m.run_speed_mps, m.lock_on_strafe_speed_mps ?? m.run_speed_mps) * Math.min(1, mag / ANALOG_WALK_BELOW);
    if (mag < ANALOG_WALK_BELOW) return m.walk_speed_mps; // pad light tilt
    return m.run_speed_mps;
  }

  /**
   * One step. input: { dirX, dirZ (unit, world), mag (0..1), walk, sprint (request), guard,
   * lockYaw (face this yaw while strafing, or null), surfMult }. yaw: current facing.
   * Returns { dx, dz, yaw } (displacement this step and new facing).
   */
  update(dt, yaw, input) {
    const m = this.mv;
    const out = this._out ?? (this._out = { dx: 0, dz: 0, yaw: 0 });
    if (!(dt > 0)) { out.dx = 0; out.dz = 0; out.yaw = yaw; return out; }
    const mag = input.mag ?? 0;
    const locked = input.lockYaw != null;
    const sprintOk = input.sprint && !input.guard && mag >= (m.sprint_requires_move_input_ratio ?? 0.6)
      && (!locked || m.sprint_allowed_while_locked_on !== false);
    const strafe = locked && !(sprintOk && m.sprint_breaks_strafe);
    const surf = input.surfMult ?? 1;
    const target = this.targetSpeed({ mag, walk: input.walk, sprint: sprintOk, guard: input.guard, strafe }) * surf;
    const prevSpeed = this.speed, prevYaw = yaw;

    // Sprint stop skid: released after sprinting long enough -> slide for sprint_stop_skid_s.
    if (sprintOk) { this.sprintT += dt; this.wasSprintS = this.sprintT; } else if (this.sprintT > 0) {
      if (mag < 0.05 && this.sprintT >= (m.sprint_stop_skid_after_s ?? 0.8) && this.speed > m.run_speed_mps * 0.8) { this.skidT = m.sprint_stop_skid_s ?? 0.3; this.skidV0 = this.speed; }
      this.sprintT = 0;
    }
    this.sprinting = sprintOk;

    let dirX = input.dirX ?? 0, dirZ = input.dirZ ?? 0;
    const wantYaw = mag >= 0.05 ? Math.atan2(dirX, dirZ) : yaw;
    // Pivot turn: hard reversal at speed (pivot_turn_threshold_deg).
    if (!strafe && this.pivotT <= 0 && mag >= 0.05 && this.speed >= m.run_speed_mps * 0.6
        && Math.abs(normAngle(wantYaw - yaw)) >= (m.pivot_turn_threshold_deg ?? 135) * DEG) {
      this.pivotT = m.pivot_turn_s ?? 0.18; this.pivotYaw = wantYaw;
    }

    let newYaw = yaw;
    if (this.skidT > 0) {
      this.skidT = Math.max(0, this.skidT - dt);
      // Linear slide to a stop over sprint_stop_skid_s.
      this.speed = approach(this.speed, 0, (this.skidV0 / Math.max(0.05, m.sprint_stop_skid_s ?? 0.3)) * dt);
      dirX = Math.sin(yaw); dirZ = Math.cos(yaw);
    } else if (this.pivotT > 0) {
      this.pivotT = Math.max(0, this.pivotT - dt);
      const total = m.pivot_turn_s ?? 0.18;
      newYaw = turnToward(yaw, this.pivotYaw, Math.PI / Math.max(0.05, total) * dt * 1.1);
      this.speed = approach(this.speed, Math.min(target, m.walk_speed_mps), (m.decel_mps2 ?? 40) * dt);
      dirX = Math.sin(newYaw); dirZ = Math.cos(newYaw);
    } else {
      const sprintGait = this.speed > m.run_speed_mps + 0.1 || target > m.run_speed_mps + 0.1;
      const up = target > this.speed;
      const rate = up ? (sprintGait && this.speed >= m.run_speed_mps ? m.sprint_accel_mps2 ?? m.accel_mps2 : m.accel_mps2)
        : (this.speed > m.run_speed_mps + 0.1 ? m.sprint_decel_mps2 ?? m.decel_mps2 : m.decel_mps2);
      this.speed = approach(this.speed, target, rate * dt);
      if (strafe) {
        newYaw = turnToward(yaw, input.lockYaw, (m.guard_turn_rate_deg_s ?? 540) * DEG * dt);
        if (mag < 0.05) { dirX = this.vx; dirZ = this.vz; const l = Math.hypot(dirX, dirZ); if (l > 1e-6) { dirX /= l; dirZ /= l; } }
      } else {
        const tr = (this.sprinting ? m.sprint_turn_rate_deg_s : this.speed > 0.5 ? m.run_turn_rate_deg_s : m.idle_turn_rate_deg_s) * DEG
          * (input.guard ? (m.guard_turn_rate_deg_s ?? 540) / (m.run_turn_rate_deg_s ?? 720) : 1);
        if (mag >= 0.05) newYaw = turnToward(yaw, wantYaw, tr * dt);
        // Velocity follows the facing at speed (weight), the raw input when slow (responsiveness).
        const k = Math.min(1, this.speed / m.run_speed_mps);
        const fx = Math.sin(newYaw), fz = Math.cos(newYaw);
        if (mag >= 0.05) { dirX = dirX * (1 - k) + fx * k; dirZ = dirZ * (1 - k) + fz * k; } else { dirX = fx; dirZ = fz; }
        const l = Math.hypot(dirX, dirZ) || 1; dirX /= l; dirZ /= l;
      }
    }
    this.vx = dirX * this.speed; this.vz = dirZ * this.speed;
    out.dx = this.vx * dt; out.dz = this.vz * dt; out.yaw = newYaw;

    // Gait + lean (presentation; read by the animator).
    const s = this.speed;
    this.gait = s < 0.15 ? 'idle' : this.sprinting || s > m.run_speed_mps + 0.3 ? 'sprint' : s > (m.walk_speed_mps + m.run_speed_mps) / 2 ? 'run' : 'walk';
    this.turnRate = normAngle(newYaw - prevYaw) / dt;
    this.accel = (s - prevSpeed) / dt;
    const k = Math.min(1, s / m.run_speed_mps);
    const leanT = Math.max(-1, Math.min(1, this.turnRate / 6)) * (m.lean_into_turn_max_deg ?? 12) * DEG * k;
    const pitchT = Math.max(-1, Math.min(1, this.accel / 25)) * (m.lean_on_accel_max_deg ?? 8) * DEG;
    const a = Math.min(1, dt * 10);
    this.lean += (leanT - this.lean) * a;
    this.pitchLean += ((this.skidT > 0 ? -(m.lean_on_accel_max_deg ?? 8) * DEG * 1.4 : pitchT) - this.pitchLean) * a;
    return out;
  }

  /** Stride length (m) for the current speed: interpolates stride_walk/run/sprint. */
  stride() {
    const m = this.mv, s = this.speed;
    if (s <= m.walk_speed_mps) return m.stride_walk_m ?? 0.7;
    if (s <= m.run_speed_mps) return lerp(m.stride_walk_m ?? 0.7, m.stride_run_m ?? 1.3, (s - m.walk_speed_mps) / (m.run_speed_mps - m.walk_speed_mps));
    return lerp(m.stride_run_m ?? 1.3, m.stride_sprint_m ?? 1.9, Math.min(1, (s - m.run_speed_mps) / (m.sprint_speed_mps - m.run_speed_mps)));
  }
}
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

// ------------------------------------------------------------------ dodge
/**
 * Plans a dodge (combat_tuning.dodge). input: { dirX, dirZ, mag } world, camera-relative already;
 * camYaw: camera yaw (input is snapped to 8 directions around it); yaw: facing; sprinting; locked.
 * Returns { dirX, dirZ, distance, kind: 'roll' | 'backstep' | 'sprint_roll', faceYaw, local }
 * local: 'fwd' | 'back' | 'left' | 'right' relative to the facing kept (locked) or new facing.
 */
export function planDodge(d, { dirX = 0, dirZ = 0, mag = 0, camYaw = 0, yaw = 0, sprinting = false, locked = false }) {
  if (mag < 0.2 && d.neutral_dodge === 'backstep') {
    return { dirX: -Math.sin(yaw), dirZ: -Math.cos(yaw), distance: d.backstep_distance_m ?? 2.0, kind: 'backstep', faceYaw: yaw, local: 'back' };
  }
  let ang = mag < 0.2 ? yaw : Math.atan2(dirX, dirZ);
  if ((d.direction_mode ?? '').includes('8way')) {
    const camFwd = Math.atan2(-Math.sin(camYaw), -Math.cos(camYaw)); // camera looks along -z at yaw 0
    const rel = normAngle(ang - camFwd);
    ang = camFwd + Math.round(rel / (Math.PI / 4)) * (Math.PI / 4);
  }
  const dist = sprinting ? d.sprint_dodge_distance_m ?? d.distance_m : d.distance_m;
  const dx = Math.sin(ang), dz = Math.cos(ang);
  let faceYaw = yaw, local = 'fwd';
  if (locked) {
    const rel = normAngle(ang - yaw);
    const a = Math.abs(rel);
    local = a <= Math.PI / 4 ? 'fwd' : a >= Math.PI * 3 / 4 ? 'back' : rel > 0 ? 'left' : 'right';
  } else if (d.snap_facing_on_start !== false) faceYaw = ang;
  return { dirX: dx, dirZ: dz, distance: dist, kind: sprinting ? 'sprint_roll' : 'roll', faceYaw, local };
}

/** Fraction of the dodge distance covered at time t (0..moveT): ease-out with dodge.ease_out_exponent. */
export function dodgeProgress(t, moveT, exponent = 2) {
  const u = Math.max(0, Math.min(1, t / Math.max(1e-6, moveT)));
  return 1 - Math.pow(1 - u, exponent);
}

/** Dodge chain limiter (dodge.max_chain, chain_extra_recovery_s). */
export class DodgeChain {
  constructor(d) { this.d = d; this.count = 0; this.lastEnd = -Infinity; this.blockedUntil = -Infinity; }
  /** now: game time; returns true if a new dodge may start. */
  canStart(now) { return now >= this.blockedUntil; }
  start(now) {
    const chained = now - this.lastEnd <= (this.d.recovery_s ?? 0.15) + 0.25;
    this.count = chained ? this.count + 1 : 1;
    if (this.count >= (this.d.max_chain ?? 2)) this.blockedUntil = now + (this.d.duration_s ?? 0.45) + (this.d.chain_extra_recovery_s ?? 0.25);
  }
  end(now) { this.lastEnd = now; }
}
