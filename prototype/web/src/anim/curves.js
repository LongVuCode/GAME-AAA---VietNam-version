// anim/curves.js - easing, springs and keyframe sampling for the procedural animation (pure, no three.js).
// Nothing here allocates per call except the init-time helpers marked as such.

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (u) => { const t = clamp01(u); return t * t * (3 - 2 * t); };

export const Ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  smooth: (t) => t * t * (3 - 2 * t),
};

/**
 * Critically damped spring on a scalar (no overshoot unless zeta < 1). halfLife-style tuning by
 * frequency (Hz). Used for follow-through, secondary motion and additive hit reactions.
 */
export class Spring {
  constructor(freqHz = 6, zeta = 1, value = 0) { this.w = 2 * Math.PI * freqHz; this.z = zeta; this.x = value; this.v = 0; this.target = value; }
  update(dt) {
    if (!(dt > 0)) return this.x;
    // Semi-implicit Euler, sub-stepped for stability at low frame rates.
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = -2 * this.z * this.w * this.v - this.w * this.w * (this.x - this.target);
      this.v += a * h; this.x += this.v * h;
    }
    return this.x;
  }
  /** Adds a velocity impulse (e.g. a hit kick). */
  kick(v) { this.v += v; }
  set(x) { this.x = x; this.v = 0; this.target = x; }
}

/**
 * Where we are in an attack: phase anticipation | active | follow | recovery and its local 0..1.
 * tl: { startup, active, recovery }. follow-through = first 40% of recovery (FUN_PASS_0_2 P0-2).
 */
export function attackPhase(t, tl, out = { phase: 'anticipation', u: 0 }) {
  const a = tl.startup, b = a + tl.active, f = b + tl.recovery * 0.4, e = b + tl.recovery;
  if (t < a) { out.phase = 'anticipation'; out.u = clamp01(t / Math.max(1e-3, a)); }
  else if (t < b) { out.phase = 'active'; out.u = clamp01((t - a) / Math.max(1e-3, tl.active)); }
  else if (t < f) { out.phase = 'follow'; out.u = clamp01((t - b) / Math.max(1e-3, f - b)); }
  else { out.phase = 'recovery'; out.u = clamp01((t - f) / Math.max(1e-3, e - f)); }
  return out;
}

/** Deterministic smooth noise in [-1, 1] (sum of sines) for trembles / idle sway. */
export function wobble(t, seed = 0) {
  return (Math.sin(t * 17.3 + seed) * 0.5 + Math.sin(t * 29.1 + seed * 2.1) * 0.3 + Math.sin(t * 43.7 + seed * 3.7) * 0.2);
}
