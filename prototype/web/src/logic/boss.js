// boss.js - boss fight glue: health (with floor while the khoen is enabled), posture with per-phase
// max, khoen cracks, phase transitions and the pry finisher. Mirrors ArpgCore FBossEncounter
// (BossEncounter.h). Data: enemies.json boss entry + combat_tuning.pry.
import { Posture } from './posture.js';
import { Khoen, KhoenState, PryJudge } from './shackle.js';

export class BossEncounter {
  constructor(def, tuning, { khoenEnabled = true } = {}) {
    this.def = def;
    this.tuning = tuning;
    this.hp = def.hp;
    this.phaseIndex = 0;
    this.posture = new Posture({
      max: def.phases[0].the_max ?? def.the_max,
      regenPerS: def.the_regen_per_s,
      regenDelayS: def.the_regen_delay_s,
      staggerS: def.stagger_duration_s,
      afterStaggerRatio: tuning.enemy_the_defaults.post_stagger_the_ratio,
    });
    this.khoen = new Khoen({
      enabled: khoenEnabled && !!def.khoen,
      crackStages: def.khoen?.crack_stages ?? 0,
      cracksToOpen: def.khoen?.pry_condition?.khoen_cracks_at_least ?? def.khoen?.crack_stages ?? 0,
    });
    this.floorReached = false;
    this.outcome = 'in_progress'; // in_progress | freed | shoved
    this.judge = null;
  }

  get phase() { return this.def.phases[this.phaseIndex]; }
  get hpRatio() { return this.hp / this.def.hp; }
  get staggered() { return this.posture.staggered; }
  get prying() { return this.khoen.state === KhoenState.PRYING; }

  /** A player hit {hp, the}. Returns { broke, cracked, phaseChanged, floorReached }. */
  receiveHit({ hp = 0, the = 0 }) {
    const r = { broke: false, cracked: false, phaseChanged: false, floorReached: false };
    if (this.outcome !== 'in_progress' || this.prying) return r;
    this.hp -= Math.max(0, hp);
    const floor = this.def.hp_floor ?? 1;
    if (this.hp <= floor) {
      this.hp = floor;
      if (!this.floorReached) {
        this.floorReached = true;
        r.floorReached = true;
        if (this.def.hp_floor_forces_final_stagger) {
          if (!this.posture.staggered) { this.posture.forceBreak(); r.broke = true; }
          this.khoen.forceReady();
        }
      }
    }
    if (!r.broke && this.posture.applyDamage(the)) {
      r.broke = true;
      r.cracked = this.khoen.onTheBreak();
    }
    r.phaseChanged = this._checkPhase();
    return r;
  }

  _checkPhase() {
    const next = this.def.phases[this.phaseIndex + 1];
    if (!next || next.enter?.type !== 'any') return false;
    const ok = next.enter.conditions.some((c) =>
      (c.khoen_cracks_at_least != null && this.khoen.enabled && this.khoen.cracks >= c.khoen_cracks_at_least)
      || (c.hp_ratio_at_most != null && this.hpRatio <= c.hp_ratio_at_most));
    if (!ok) return false;
    this.phaseIndex += 1;
    this.posture.setMax(next.the_max ?? this.posture.max);
    return true;
  }

  /** Pry (or shove when the khoen is disabled) is available. */
  canFinish() {
    if (this.outcome !== 'in_progress') return false;
    if (!this.khoen.enabled) return this.floorReached && this.posture.staggered;
    return this.khoen.canBeginPry(this.posture.staggered);
  }

  beginPry(opts = {}) {
    if (!this.khoen.enabled || !this.khoen.beginPry(this.posture.staggered)) return null;
    this.posture.staggerPaused = true;
    this.judge = new PryJudge(this.tuning.pry, opts);
    return this.judge;
  }

  /** Feed judge events back; returns 'freed' | 'failed' | null. */
  resolvePry() {
    if (!this.judge || !this.judge.done) return null;
    const res = this.judge.result;
    this.judge = null;
    if (res === 'freed') {
      this.khoen.free();
      this.posture.endStagger();
      this.outcome = 'freed';
    } else {
      this.khoen.abortPry();
      // combat_tuning.pry.on_fail = boss_recovers_the_half
      this.posture.endStaggerWithRecovery(this.tuning.pry.on_fail === 'boss_recovers_the_half' ? 0.5 : 0);
    }
    return res;
  }

  /** Khoen disabled (feature flag off, K0): final stagger ends with a shove. */
  shove() {
    if (this.khoen.enabled || !this.canFinish()) return false;
    this.outcome = 'shoved';
    this.posture.endStagger();
    return true;
  }

  /** Drops on finish (data: khoen.on_pry_success / fallback_when_disabled). Never a khoen item. */
  finishDrops() {
    if (this.outcome === 'freed') return this.def.khoen.on_pry_success.drops;
    if (this.outcome === 'shoved') return this.def.khoen.fallback_when_disabled.drops;
    return [];
  }

  /** Simulation tick (game time). Returns true when a stagger ended this tick. */
  tick(dt) {
    if (this.outcome !== 'in_progress') return false;
    return this.posture.tick(dt);
  }
}
