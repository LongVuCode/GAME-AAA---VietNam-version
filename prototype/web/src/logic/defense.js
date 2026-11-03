// defense.js - dodge (i-frames, perfect dodge) and parry/guard. Semantic mirror of ArpgCore
// FDefenseController (Defense.h) plus a held guard ("Đỡ") after the parry window, as in the design.
import { PROTO } from './proto.js';

export const Outcome = Object.freeze({
  HIT: 'hit', DODGED: 'dodged', PERFECT_DODGE: 'perfect_dodge',
  PARRIED: 'parried', PERFECT_PARRY: 'perfect_parry', GUARDED: 'guarded',
});

export class DefenseController {
  /**
   * @param dodge combat_tuning.dodge
   * @param guard combat_tuning.guard
   * @param parryWindowS effective parry window (difficulty / custom); perfect window scales with it.
   */
  constructor(dodge, guard, parryWindowS = guard.parry_window_s) {
    this.dodge = dodge;
    this.guard = guard;
    this.setParryWindow(parryWindowS);
    this.action = 'none'; // none | dodge | parry
    this.elapsed = 0;
    this.guardHeld = false;
  }

  setParryWindow(parryWindowS) {
    const scale = parryWindowS / this.guard.parry_window_s;
    this.parryWindow = Math.min(parryWindowS, PROTO.parryActionS);
    this.perfectParryWindow = Math.min(this.guard.perfect_parry_window_s * scale, this.parryWindow);
  }

  get busy() { return this.action !== 'none'; }

  startDodge() {
    if (this.action === 'dodge') return false;
    this.action = 'dodge'; this.elapsed = 0; return true;
  }
  startParry() {
    if (this.busy) return false;
    this.action = 'parry'; this.elapsed = 0; return true;
  }
  setGuardHeld(held) { this.guardHeld = held; }

  tick(dt) {
    if (this.action === 'none' || !(dt > 0)) return;
    this.elapsed += dt;
    const dur = this.action === 'dodge' ? this.dodge.duration_s : PROTO.parryActionS;
    if (this.elapsed >= dur) { this.action = 'none'; this.elapsed = 0; }
  }

  get invulnerable() {
    return this.action === 'dodge' && this.elapsed >= this.dodge.iframe_start_s
      && this.elapsed < this.dodge.iframe_start_s + this.dodge.iframe_duration_s;
  }

  /** Is the player guarding right now (held guard after the parry window, or parry action past its window)? */
  get guarding() {
    if (!this.guardHeld) return false;
    if (this.action === 'dodge') return false;
    return !(this.action === 'parry' && this.elapsed <= this.parryWindow);
  }

  /** attack: { parryable, guardable }. Does not change state. */
  resolve(attack) {
    if (this.action === 'dodge') {
      if (!this.invulnerable) return Outcome.HIT;
      const perfectEnd = this.dodge.iframe_start_s + this.dodge.perfect_dodge_window_s;
      return this.elapsed <= perfectEnd ? Outcome.PERFECT_DODGE : Outcome.DODGED;
    }
    if (this.action === 'parry' && this.elapsed <= this.parryWindow) {
      if (attack.parryable) {
        return this.elapsed <= this.perfectParryWindow ? Outcome.PERFECT_PARRY : Outcome.PARRIED;
      }
      // Unparryable attack during the parry window: guard still applies if the attack is guardable.
      return attack.guardable && this.guardHeld ? Outcome.GUARDED : Outcome.HIT;
    }
    if (this.guarding && attack.guardable) return Outcome.GUARDED;
    return Outcome.HIT;
  }
}
