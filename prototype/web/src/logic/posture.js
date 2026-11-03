// posture.js - "Thế" meter. Semantic mirror of ArpgCore FPosture (Posture.h): damage accumulates
// toward max, regenerates after a delay, breaking it staggers for staggerS seconds.
export class Posture {
  constructor({ max, regenPerS, regenDelayS, staggerS, afterStaggerRatio = 0 }) {
    this.max = max;
    this.regenPerS = regenPerS;
    this.regenDelayS = regenDelayS;
    this.staggerS = staggerS;
    this.afterStaggerRatio = afterStaggerRatio;
    this.accumulated = 0;
    this.sinceDamage = 0;
    this.staggered = false;
    this.staggerPaused = false;
    this.staggerRemaining = 0;
    this.breakCount = 0;
  }

  /** Adds posture damage; returns true if this call broke posture. Ignored while staggered. */
  applyDamage(amount) {
    const v = Number.isFinite(amount) && amount > 0 ? amount : 0;
    if (this.staggered || v <= 0) return false;
    this.accumulated += v;
    this.sinceDamage = 0;
    if (this.accumulated >= this.max) {
      this.forceBreak();
      return true;
    }
    return false;
  }

  /** Breaks posture now (e.g. health floor forcing the final stagger). */
  forceBreak() {
    this.accumulated = this.max;
    this.staggered = true;
    this.staggerPaused = false;
    this.staggerRemaining = this.staggerS;
    this.breakCount += 1;
  }

  tick(dt) {
    if (!(dt > 0)) return false;
    if (this.staggered) {
      if (!this.staggerPaused) {
        this.staggerRemaining -= dt;
        if (this.staggerRemaining <= 0) { this.endStagger(); return true; }
      }
      return false;
    }
    this.sinceDamage += dt;
    if (this.sinceDamage > this.regenDelayS) {
      const t = Math.min(dt, this.sinceDamage - this.regenDelayS);
      this.accumulated = Math.max(0, this.accumulated - this.regenPerS * t);
    }
    return false;
  }

  endStagger() { this.endStaggerWithRecovery(1 - this.afterStaggerRatio); }

  /** Ends stagger, leaving the owner RecoverFraction of its posture back (accumulated = max*(1-f)). */
  endStaggerWithRecovery(recoverFraction) {
    const f = Math.min(1, Math.max(0, recoverFraction));
    this.staggered = false;
    this.staggerPaused = false;
    this.staggerRemaining = 0;
    this.sinceDamage = 0;
    this.accumulated = this.max * (1 - f);
  }

  /** Changes max (boss phase change) keeping the current ratio. */
  setMax(max) {
    const ratio = this.ratio;
    this.max = max;
    this.accumulated = Math.min(max, ratio * max);
  }

  get ratio() { return this.max > 0 ? this.accumulated / this.max : 1; }
}
