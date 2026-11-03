// drum.js - "Nhịp trống": 4 segments x points_per_segment, gains per action, loss when hit (full
// segments kept), decay of the partial segment out of combat, "Hồi trống" spends 4 segments.
// Semantics follow combat_tuning.drum_rhythm; mirrors ArpgCore FDrumMeter (DrumMeter.h) where they
// overlap (decay keeps full notches, surge spends all).
export class DrumMeter {
  constructor(tuning, mods = {}) {
    this.t = tuning;
    this.mods = { perfectParryBonus: 0, decayDelayAddS: 0, ...mods };
    this.points = 0;
    this.sinceActivity = 0;
  }
  setMods(mods) { this.mods = { ...this.mods, ...mods }; }
  get maxPoints() { return this.t.segments * this.t.points_per_segment; }
  get fullSegments() { return Math.min(this.t.segments, Math.floor(this.points / this.t.points_per_segment + 1e-9)); }
  get partial() { return (this.points - this.fullSegments * this.t.points_per_segment) / this.t.points_per_segment; }

  /** action: key of drum_rhythm.gain (light_hit, heavy_hit, parry, perfect_parry, perfect_dodge, the_break, pry_beat). */
  gain(action) {
    if (!(action in this.t.gain)) throw new Error(`unknown drum action ${action}`);
    let g = this.t.gain[action];
    if (action === 'perfect_parry') g += this.mods.perfectParryBonus;
    this.points = Math.min(this.maxPoints, this.points + g);
    this.sinceActivity = 0;
    return g;
  }

  /** Player got hit: lose loss_on_hit_taken, but never below the last full segment if configured. */
  hitTaken() {
    const floor = this.t.keeps_full_segments_on_hit ? this.fullSegments * this.t.points_per_segment : 0;
    this.points = Math.max(floor, this.points - this.t.loss_on_hit_taken);
    this.sinceActivity = 0;
  }

  activity() { this.sinceActivity = 0; }

  tick(dt) {
    if (!(dt > 0)) return;
    this.sinceActivity += dt;
    const delay = this.t.decay_delay_s + this.mods.decayDelayAddS;
    if (this.sinceActivity <= delay || this.points <= 0) return;
    const t = Math.min(dt, this.sinceActivity - delay);
    const floor = this.t.decay_only_partial_segment ? this.fullSegments * this.t.points_per_segment : 0;
    this.points = Math.max(floor, this.points - this.t.decay_per_s * t);
  }

  canBurst() { return this.fullSegments >= this.t.drum_burst_cost_segments; }
  tryBurst() {
    if (!this.canBurst()) return false;
    this.points = Math.max(0, this.points - this.t.drum_burst_cost_segments * this.t.points_per_segment);
    this.sinceActivity = 0;
    return true;
  }
}
