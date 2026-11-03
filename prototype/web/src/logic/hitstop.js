// hitstop.js - hit-stop by attack weight (combat_tuning.hit_stop) and a clock that converts real
// delta into game delta. Clock mirrors ArpgCore FHitStopClock: overlapping triggers keep the longer.
export function hitStopFor(hitStopTuning, weight) {
  const map = {
    light: hitStopTuning.light_s,
    medium: hitStopTuning.medium_s,
    heavy: hitStopTuning.heavy_s,
    finisher: hitStopTuning.finisher_s,
    pry_beat: hitStopTuning.pry_beat_s,
    pry_release: hitStopTuning.pry_release_s,
  };
  if (!(weight in map)) throw new Error(`unknown hit weight ${weight}`);
  return map[weight];
}

/** Camera shake amplitude for a weight; medium is the midpoint of light/heavy (no data value yet). */
export function shakeFor(shakeTuning, weight) {
  const { light_amplitude: l, heavy_amplitude: h, max_amplitude: m } = shakeTuning;
  const v = weight === 'light' ? l : weight === 'medium' ? (l + h) / 2 : h;
  return Math.min(v, m);
}

export class HitStopClock {
  constructor(timeScaleDuringStop = 0) { this.timeScale = timeScaleDuringStop; this.remaining = 0; }
  trigger(duration) { if (duration > this.remaining) this.remaining = duration; }
  advance(realDt) {
    if (!(realDt > 0)) return 0;
    if (this.remaining <= 0) return realDt;
    const stopped = Math.min(this.remaining, realDt);
    this.remaining -= stopped;
    return (realDt - stopped) + stopped * this.timeScale;
  }
  get stopped() { return this.remaining > 0; }
}
