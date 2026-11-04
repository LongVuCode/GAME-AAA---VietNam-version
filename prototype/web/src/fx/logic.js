// fx/logic.js - the pure (no three.js, no DOM, no WebAudio) parts of the FX module, unit-tested by
// test/fx.test.mjs: particle pool, slow-motion time scale, camera shake and FOV kick state, impact
// and footstep profiles, sound variation. Nothing here allocates per frame.

// ------------------------------------------------------------------ particle pool
/**
 * Fixed-capacity particle store in flat typed arrays (struct of arrays). spawn() is O(1): a ring
 * cursor overwrites the oldest slot when the pool is full (recycling), so a burst never allocates and
 * never grows the pool. `limit` caps the slots in use (quality Low/High) without reallocating.
 * Output arrays (pos, color, size, alpha) are shared directly with the GPU buffer attributes.
 */
export class ParticlePool {
  constructor(capacity) {
    this.capacity = capacity; this.limit = capacity;
    this.pos = new Float32Array(capacity * 3); this.vel = new Float32Array(capacity * 3);
    this.color = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity); this.alpha = new Float32Array(capacity);  // outputs
    this.life = new Float32Array(capacity); this.maxLife = new Float32Array(capacity);
    this.size0 = new Float32Array(capacity); this.size1 = new Float32Array(capacity); this.alpha0 = new Float32Array(capacity);
    this.drag = new Float32Array(capacity); this.gravity = new Float32Array(capacity);
    this.floor = new Float32Array(capacity); // y of the ground plane (NaN = no ground contact)
    this.cursor = 0; this.active = 0; this.spawnedTotal = 0; this.recycled = 0;
  }
  setLimit(n) {
    const lim = Math.max(1, Math.min(this.capacity, n | 0));
    for (let i = lim; i < this.limit; i++) this._kill(i);
    this.limit = lim; if (this.cursor >= lim) this.cursor = 0;
  }
  /** Returns the slot index of a fresh particle (overwriting the oldest one when full). */
  spawn(x, y, z, vx, vy, vz, life, size0, size1, alpha0, r, g, b, drag = 0, gravity = 0, floorY = NaN) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.limit;
    if (this.life[i] > 0) this.recycled += 1; else this.active += 1;
    const k = i * 3;
    this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z;
    this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
    this.color[k] = r; this.color[k + 1] = g; this.color[k + 2] = b;
    this.life[i] = life; this.maxLife[i] = life;
    this.size0[i] = size0; this.size1[i] = size1; this.alpha0[i] = alpha0;
    this.size[i] = size0; this.alpha[i] = 0;
    this.drag[i] = drag; this.gravity[i] = gravity; this.floor[i] = floorY;
    this.spawnedTotal += 1;
    return i;
  }
  _kill(i) { if (this.life[i] > 0) this.active -= 1; this.life[i] = 0; this.alpha[i] = 0; this.size[i] = 0; }
  /** Integrates every live particle by dt (s). Returns the number still alive. */
  step(dt) {
    if (!(dt > 0)) return this.active;
    const { pos, vel } = this;
    let alive = 0;
    for (let i = 0; i < this.limit; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.life[i] = 0; this.alpha[i] = 0; this.size[i] = 0; continue; }
      alive += 1;
      const k = i * 3, damp = Math.max(0, 1 - this.drag[i] * dt);
      vel[k] *= damp; vel[k + 1] = vel[k + 1] * damp - this.gravity[i] * dt; vel[k + 2] *= damp;
      pos[k] += vel[k] * dt; pos[k + 1] += vel[k + 1] * dt; pos[k + 2] += vel[k + 2] * dt;
      const fl = this.floor[i];
      if (fl === fl && pos[k + 1] < fl) { // ground contact: stick and fade quickly (mud, drops)
        pos[k + 1] = fl; vel[k] = 0; vel[k + 1] = 0; vel[k + 2] = 0;
        if (this.life[i] > 0.25) this.life[i] = 0.25;
      }
      const t = 1 - this.life[i] / this.maxLife[i];
      this.size[i] = this.size0[i] + (this.size1[i] - this.size0[i]) * t;
      // Fast fade-in (first 8%), then ease-out fade.
      const fade = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;
      this.alpha[i] = this.alpha0[i] * fade * (2 - fade);
    }
    this.active = alive;
    return alive;
  }
}

// ------------------------------------------------------------------ slow motion (time scale)
/**
 * Slow motion. CONTRACT (QA S2): the scale multiplies ONLY the game simulation step
 * (gameDt = hitStop.advance(realDt) * timeScale.value). It is advanced with REAL time, so a slow-mo
 * of N seconds lasts N real seconds. It must NOT be applied to: the pry rhythm clock (PryJudge runs
 * on wall time), game timers (Game.after), UI, audio, or the FX module itself.
 * Overlapping requests keep the slowest scale and the latest end. After the hold, the scale eases
 * back to 1 over `releaseS` (real time).
 */
export class TimeScale {
  constructor({ releaseS = 0.12, minScale = 0.05 } = {}) {
    this.releaseS = releaseS; this.minScale = minScale;
    this.target = 1; this.holdLeft = 0; this.releaseLeft = 0; this.value = 1; this.enabled = true;
  }
  slowMo(scale, durationS) {
    if (!this.enabled || !(durationS > 0)) return this.value;
    const s = Math.max(this.minScale, Math.min(1, scale));
    if (this.holdLeft > 0 || this.releaseLeft > 0) this.target = Math.min(this.target, s); else this.target = s;
    this.holdLeft = Math.max(this.holdLeft, durationS); this.releaseLeft = 0;
    this.value = this.target;
    return this.value;
  }
  /** Advance by REAL dt (s). Returns the current scale. */
  advance(realDt) {
    if (realDt > 0) {
      if (this.holdLeft > 0) {
        this.holdLeft -= realDt;
        if (this.holdLeft <= 0) { this.releaseLeft = Math.max(0, this.releaseS + this.holdLeft); this.holdLeft = 0; }
      } else if (this.releaseLeft > 0) this.releaseLeft = Math.max(0, this.releaseLeft - realDt);
    }
    if (this.holdLeft > 0) this.value = this.target;
    else if (this.releaseLeft > 0 && this.releaseS > 0) this.value = 1 + (this.target - 1) * (this.releaseLeft / this.releaseS);
    else { this.value = 1; this.target = 1; }
    return this.value;
  }
  get active() { return this.value < 1; }
  reset() { this.target = 1; this.holdLeft = 0; this.releaseLeft = 0; this.value = 1; }
}

/** The one place the game step is composed: hit-stop first (real → game), then slow-mo. */
export function gameStep(realDt, hitStopClock, timeScale) {
  return hitStopClock.advance(realDt) * (timeScale ? timeScale.value : 1);
}

// ------------------------------------------------------------------ camera shake
/**
 * Camera shake: amplitude envelope (1 - t/d)^2, smooth deterministic noise (sum of sines with
 * incommensurate frequencies), so the offset is continuous and never exceeds the amplitude.
 * A new shake replaces the current one only if it is stronger right now. Disabled → always 0.
 */
export class CameraShake {
  constructor({ maxAmplitude = 0.6, frequencyHz = 22 } = {}) {
    this.max = maxAmplitude; this.freq = frequencyHz;
    this.amp = 0; this.dur = 0; this.t = 0; this.clock = 0; this.enabled = true;
    this.x = 0; this.y = 0; this.roll = 0;
  }
  current() { return this.dur > 0 && this.t < this.dur ? this.amp * (1 - this.t / this.dur) ** 2 : 0; }
  add(amplitude, durationS) {
    if (!this.enabled || !(amplitude > 0) || !(durationS > 0)) return false;
    const a = Math.min(this.max, amplitude);
    if (a < this.current()) return false;
    this.amp = a; this.dur = durationS; this.t = 0;
    return true;
  }
  /** Advance by real dt; returns { x, y, roll } in metres / radians (also stored on this). */
  update(realDt) {
    this.clock += realDt > 0 ? realDt : 0;
    if (realDt > 0 && this.t < this.dur) this.t += realDt;
    const a = this.enabled ? this.current() : 0;
    if (a <= 0) { this.x = 0; this.y = 0; this.roll = 0; this.amp = this.t >= this.dur ? 0 : this.amp; return this; }
    const w = this.clock * this.freq * Math.PI * 2;
    // Each axis: weights sum to 1, so |offset| <= a.
    this.x = a * (0.6 * Math.sin(w * 1.0) + 0.4 * Math.sin(w * 2.31 + 1.7));
    this.y = a * (0.6 * Math.sin(w * 1.17 + 0.5) + 0.4 * Math.sin(w * 1.93 + 2.9));
    this.roll = a * 0.06 * Math.sin(w * 0.71 + 0.3);
    return this;
  }
  reset() { this.amp = 0; this.dur = 0; this.t = 0; this.x = this.y = this.roll = 0; }
}

// ------------------------------------------------------------------ FOV kick
/** Transient FOV kicks (fast attack, ease-out return) + named sustained offsets (e.g. sprint),
 *  smoothed. Total clamped to +/- maxDeg. Real time. */
export class FovKick {
  constructor({ maxDeg = 15, attackS = 0.05, smoothS = 0.25 } = {}) {
    this.maxDeg = maxDeg; this.attackS = attackS; this.smoothS = smoothS;
    this.kicks = [{ d: 0, dur: 0, t: 0 }, { d: 0, dur: 0, t: 0 }, { d: 0, dur: 0, t: 0 }, { d: 0, dur: 0, t: 0 }];
    this.sustained = new Map(); this.sustainedNow = 0; this.value = 0; this.enabled = true;
  }
  kick(deltaDeg, durationS) {
    if (!this.enabled || !(durationS > 0) || !deltaDeg) return;
    let slot = this.kicks[0];
    for (const k of this.kicks) if (k.t >= k.dur) { slot = k; break; } else if (k.dur - k.t < slot.dur - slot.t) slot = k;
    slot.d = deltaDeg; slot.dur = durationS; slot.t = 0;
  }
  setOffset(name, deg) { if (deg) this.sustained.set(name, deg); else this.sustained.delete(name); }
  update(realDt) {
    const dt = realDt > 0 ? realDt : 0;
    let v = 0;
    for (const k of this.kicks) {
      if (k.t >= k.dur) continue;
      k.t += dt;
      if (k.t >= k.dur) continue;
      const e = k.t < this.attackS ? k.t / this.attackS : 1 - ((k.t - this.attackS) / Math.max(1e-6, k.dur - this.attackS));
      v += k.d * (k.t < this.attackS ? e : e * e);
    }
    let want = 0; for (const d of this.sustained.values()) want += d;
    this.sustainedNow += (want - this.sustainedNow) * Math.min(1, dt / this.smoothS);
    this.value = Math.max(-this.maxDeg, Math.min(this.maxDeg, v + this.sustainedNow));
    return this.value;
  }
  reset() { for (const k of this.kicks) { k.t = k.dur = 0; } this.sustained.clear(); this.sustainedNow = 0; this.value = 0; }
}

// ------------------------------------------------------------------ impact profiles
export const WEIGHTS = ['light', 'medium', 'heavy', 'finisher', 'parry', 'perfect_parry', 'guard', 'posture_break',
  'khoen_crack', 'pry_beat', 'freed', 'hurt'];
export const SURFACES = ['mud', 'water', 'flesh', 'bronze', 'wood', 'dirt'];

// Visual recipe per hit weight. sparks: additive glints; dust: soft puffs; ring: shockwave radius (m)
// on the ground (g) or facing the camera (v); light: flash light strength; flash: screen flash (0..1,
// suppressed by "reduce flashing"); flare: size of the bright core point.
// Art direction (docs/ART_DIRECTION.md): no "magic" light, red-bronze is reserved for unparryable
// warnings (never used here), the pry has no flicker and the release is calm (no screen flash).
const IMPACT = {
  light:         { sparks: 7,  speed: 4.5, dust: 4,  ringG: 0,   ringV: 0,   light: 0.5, flash: 0,    flare: 0.55 },
  medium:        { sparks: 11, speed: 5.5, dust: 6,  ringG: 0,   ringV: 0.9, light: 0.8, flash: 0,    flare: 0.8 },
  heavy:         { sparks: 16, speed: 6.5, dust: 10, ringG: 2.0, ringV: 1.2, light: 1.2, flash: 0,    flare: 1.1 },
  finisher:      { sparks: 20, speed: 7.0, dust: 16, ringG: 3.0, ringV: 0,   light: 1.4, flash: 0.06, flare: 1.3 },
  parry:         { sparks: 14, speed: 6.0, dust: 0,  ringG: 0,   ringV: 0.9, light: 1.0, flash: 0,    flare: 0.9 },
  perfect_parry: { sparks: 26, speed: 8.0, dust: 0,  ringG: 2.4, ringV: 1.6, light: 2.0, flash: 0.12, flare: 1.6 },
  guard:         { sparks: 6,  speed: 3.5, dust: 2,  ringG: 0,   ringV: 0.6, light: 0.4, flash: 0,    flare: 0.5 },
  posture_break: { sparks: 10, speed: 5.0, dust: 18, ringG: 3.5, ringV: 0,   light: 1.0, flash: 0.08, flare: 1.0 },
  khoen_crack:   { sparks: 18, speed: 5.5, dust: 4,  ringG: 0,   ringV: 1.1, light: 0.8, flash: 0,    flare: 1.0 },
  pry_beat:      { sparks: 9,  speed: 3.5, dust: 4,  ringG: 0,   ringV: 0,   light: 0,   flash: 0,    flare: 0.6 },
  freed:         { sparks: 12, speed: 4.0, dust: 26, ringG: 5.5, ringV: 0,   light: 0,   flash: 0,    flare: 0.8 },
  hurt:          { sparks: 0,  speed: 3.0, dust: 6,  ringG: 0,   ringV: 0,   light: 0,   flash: 0,    flare: 0.6 },
};
// Per surface: spark tint + secondary debris (mud clumps, droplets, splinters) with gravity.
const SURFACE = {
  mud:    { spark: 'gold',  sparkMult: 0.5, debris: 'mud',    debrisMult: 1.6, dust: 'mud' },
  water:  { spark: 'white', sparkMult: 0.4, debris: 'water',  debrisMult: 1.8, dust: 'mist', ripple: true },
  flesh:  { spark: 'ivory', sparkMult: 0.7, debris: null,     debrisMult: 0,   dust: 'dirt' },
  bronze: { spark: 'gold',  sparkMult: 1.5, debris: null,     debrisMult: 0,   dust: 'dirt' },
  wood:   { spark: 'ivory', sparkMult: 0.6, debris: 'splinter', debrisMult: 0.8, dust: 'dirt' },
  dirt:   { spark: 'ivory', sparkMult: 0.5, debris: 'dirt',   debrisMult: 0.8, dust: 'dirt' },
};
/** Resolves a visual impact spec. Unknown weight/surface fall back to light/flesh (never throws). */
export function impactSpec(weight, surface) {
  const w = IMPACT[weight] ?? IMPACT.light, s = SURFACE[surface] ?? SURFACE.flesh;
  return {
    weight: IMPACT[weight] ? weight : 'light', surface: SURFACE[surface] ? surface : 'flesh',
    sparks: Math.round(w.sparks * s.sparkMult), sparkColor: s.spark, speed: w.speed,
    dust: w.dust, dustKind: s.dust, debris: s.debris ? Math.round((w.dust + 4) * s.debrisMult) : 0, debrisKind: s.debris,
    ringG: w.ringG, ringV: w.ringV, ripple: !!s.ripple, light: w.light, flash: w.flash, flare: w.flare,
  };
}

/** Footstep puff: count/size grow with speed (walk 2.2, run 5, sprint more). */
export function footstepSpec(surface, speedMps) {
  const k = Math.max(0.3, Math.min(2, (speedMps || 0) / 5));
  const kind = SURFACE[surface] ? surface : 'dirt';
  const base = kind === 'water' ? 5 : kind === 'mud' ? 4 : kind === 'wood' ? 0 : 2;
  return { kind, count: Math.round(base * k + (k > 1.1 ? 2 : 0)), size: 0.35 + 0.35 * k, ripple: kind === 'water', k };
}

/** Stride length (m) between footsteps for a speed; used by the footstep poller. */
export function strideFor(speedMps) { return speedMps > 5.5 ? 1.5 : speedMps > 3 ? 1.15 : 0.75; }

// ------------------------------------------------------------------ sound variation / specs
/** Small random variation (anti-repetition): returns base * (1 +/- pct) using rng() in [0,1). */
export function vary(base, pct, rng = Math.random) { return base * (1 + (rng() * 2 - 1) * pct); }

// Layered impact sound: transient (click), body by material, tail (send to the delay bus).
// gain: overall level; body: material of the body layer; pitch: base pitch multiplier; tail: send.
const SOUND_WEIGHT = {
  light: { gain: 0.45, pitch: 1.1, tail: 0.15 }, medium: { gain: 0.6, pitch: 1.0, tail: 0.2 },
  heavy: { gain: 0.8, pitch: 0.88, tail: 0.3 }, finisher: { gain: 0.9, pitch: 0.8, tail: 0.35 },
  parry: { gain: 0.6, pitch: 1.0, tail: 0.3, body: 'bronze' }, perfect_parry: { gain: 0.8, pitch: 1.35, tail: 0.45, body: 'bronze' },
  guard: { gain: 0.45, pitch: 0.9, tail: 0.15, body: 'bronze' }, posture_break: { gain: 0.9, pitch: 0.7, tail: 0.4, boom: true },
  khoen_crack: { gain: 0.8, pitch: 0.8, tail: 0.35, body: 'bronze', crack: true }, pry_beat: { gain: 0.7, pitch: 0.75, tail: 0.3, body: 'bronze', creak: true },
  freed: { gain: 0.9, pitch: 0.55, tail: 0.5, body: 'bronze', boom: true }, hurt: { gain: 0.6, pitch: 0.9, tail: 0.1, body: 'flesh' },
};
export function impactSoundSpec(weight, surface) {
  const w = SOUND_WEIGHT[weight] ?? SOUND_WEIGHT.light;
  const body = w.body ?? (SURFACE[surface] ? (surface === 'dirt' ? 'mud' : surface) : 'flesh');
  return { gain: w.gain, pitch: w.pitch, tail: w.tail, body, boom: !!w.boom, crack: !!w.crack, creak: !!w.creak,
    splash: surface === 'water' && body !== 'water', squelch: surface === 'mud' && body !== 'mud' };
}
