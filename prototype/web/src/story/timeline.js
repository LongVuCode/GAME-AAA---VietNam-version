// story/timeline.js - pure cinematic timeline for design/data/cinematics.json (no three.js, no DOM).
//
//   const tl = new CinematicTimeline(cin, { skipHoldS });
//   const events = tl.update(realDt, { skipHeld, actionHeld });   // REAL seconds (wallDt), never game time
//
// Events: { type: 'shot', shot, index } | { type: 'line', ref, shot, duration } | { type: 'title', key, shot, duration }
//         | { type: 'interactive', shot, prompt, holdS } | { type: 'interactive_done', shot } | { type: 'end', skipped }
//
// Timing contract: the timeline runs on the real-time step the caller passes (game.js wallDt), so it never
// touches hit-stop / slow-mo and never moves the pry clock (the pry is not running during a cut-scene).
// An interactive shot (shot.interactive: hold a button) plays its lines only after the hold completes and
// then waits at its last frame until the hold is done (fail: none); after completion it keeps at least
// INTERACTIVE_TAIL_S on screen so the line can be read. Holding skip for skip_hold_s ends the scene.

export const INTERACTIVE_TAIL_S = 2.2;
export const MIN_LINE_S = 2.4;

/** Line slots inside one shot: n lines share the shot evenly (each at least MIN_LINE_S if the shot allows). */
export function lineSlots(shot) {
  const refs = shot.line_refs ?? [];
  const n = refs.length;
  if (!n) return [];
  const span = shot.duration_s / n;
  return refs.map((ref, k) => ({ ref, at: k * span, duration: Math.max(Math.min(span, shot.duration_s), Math.min(MIN_LINE_S, shot.duration_s)) }));
}

/** Total scripted length of a cinematic (sum of shot durations; equals cin.total_s in valid data). */
export function scriptedLength(cin) { return cin.shots.reduce((a, s) => a + s.duration_s, 0); }

export class CinematicTimeline {
  constructor(cin, { skipHoldS } = {}) {
    this.cin = cin;
    this.skipHoldS = skipHoldS ?? cin.skip_hold_s ?? 1;
    this.index = -1; this.t = 0; this.total = 0; this.done = false; this.skipped = false;
    this.skipT = 0; this.holdT = 0; this.waiting = false; this.interactiveDone = false; this.tail = 0;
    this._pendingLines = [];
  }
  get shot() { return this.cin.shots[this.index] ?? null; }
  /** 0..1 progress inside the current shot (camera interpolation). */
  get u() { const s = this.shot; return s ? Math.max(0, Math.min(1, this.t / s.duration_s)) : 1; }
  get skipProgress() { return Math.min(1, this.skipT / this.skipHoldS); }
  get holdProgress() { const it = this.shot?.interactive; return it ? Math.min(1, this.holdT / it.hold_s) : 0; }

  _enter(i, out) {
    this.index = i; this.t = 0; this.holdT = 0; this.waiting = false; this.interactiveDone = false; this.tail = 0;
    const s = this.shot;
    if (!s) { this.done = true; out.push({ type: 'end', skipped: false }); return; }
    out.push({ type: 'shot', shot: s, index: i });
    if (s.title_key) out.push({ type: 'title', key: s.title_key, shot: s, duration: s.duration_s });
    this._pendingLines = s.interactive ? [] : lineSlots(s);
    if (s.interactive) out.push({ type: 'interactive', shot: s, prompt: s.interactive.prompt_key, holdS: s.interactive.hold_s });
  }

  /** Advance by real seconds. input: { skipHeld, actionHeld }. Returns the events of this step in order. */
  update(dt, input = {}) {
    const out = [];
    if (this.done) return out;
    if (this.index < 0) this._enter(0, out);
    if (this.cin.skippable !== false) {
      this.skipT = input.skipHeld ? this.skipT + dt : 0;
      if (this.skipT >= this.skipHoldS) {
        this.done = true; this.skipped = true;
        out.push({ type: 'end', skipped: true });
        return out;
      }
    }
    let left = Math.max(0, dt);
    // A long real step may cross several shots; each shot consumes its share.
    for (let guard = 0; guard < 64 && !this.done; guard++) {
      const s = this.shot;
      if (s.interactive && !this.interactiveDone) {
        if (input.actionHeld) this.holdT += left; else this.holdT = Math.max(0, this.holdT - left * 2);
        if (this.holdT >= s.interactive.hold_s) {
          this.interactiveDone = true; this.waiting = false;
          out.push({ type: 'interactive_done', shot: s });
          this._pendingLines = lineSlots({ ...s, duration_s: Math.max(INTERACTIVE_TAIL_S, s.duration_s - this.t) }).map((l) => ({ ...l, at: this.t + l.at }));
          this.tail = Math.max(this.t + INTERACTIVE_TAIL_S, s.duration_s);
        }
      }
      const end = s.interactive ? (this.interactiveDone ? this.tail : s.duration_s) : s.duration_s;
      const room = end - this.t;
      const step = Math.min(left, Math.max(0, room));
      this.t += step; left -= step; this.total += step;
      while (this._pendingLines.length && this._pendingLines[0].at <= this.t + 1e-9) {
        const l = this._pendingLines.shift();
        out.push({ type: 'line', ref: l.ref, shot: s, duration: l.duration });
      }
      if (this.t >= end - 1e-9) {
        if (s.interactive && !this.interactiveDone) { this.waiting = true; break; } // hold the last frame
        this._enter(this.index + 1, out);
        if (left <= 0) break;
        continue;
      }
      break;
    }
    return out;
  }
}

/** Linear blend of two 3-vectors. */
export function lerp3(a, b, u) { return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; }
/** Smoothstep easing used for camera moves. */
export function ease(u) { const x = Math.max(0, Math.min(1, u)); return x * x * (3 - 2 * x); }

/**
 * Camera pose for a shot at progress u from its own data (from / to / look_at / fov_deg). Returns null when
 * the shot has no explicit position (subject-framed shots are resolved by the director from actor positions).
 * wide_pan without `to` pans the look point from `panFrom` (default: 35 degrees left of look_at) to look_at.
 */
export function shotCamera(shot, u, panFrom = null) {
  const c = shot.camera ?? {};
  if (!c.from) return null;
  const k = ease(u);
  const pos = c.to ? lerp3(c.from, c.to, k) : c.from.slice();
  let look = c.look_at ? c.look_at.slice() : [pos[0], pos[1], pos[2] - 10];
  if (c.kind === 'wide_pan' && !c.to && c.look_at) {
    const start = panFrom ?? (() => {
      const dx = c.look_at[0] - c.from[0], dz = c.look_at[2] - c.from[2], a = Math.atan2(dx, dz) + 0.6, d = Math.hypot(dx, dz);
      return [c.from[0] + Math.sin(a) * d, c.look_at[1], c.from[2] + Math.cos(a) * d];
    })();
    look = lerp3(start, c.look_at, k);
  }
  return { pos, look, fov: c.fov_deg ?? 50 };
}
