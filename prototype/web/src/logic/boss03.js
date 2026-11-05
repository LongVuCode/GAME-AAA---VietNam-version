// boss03.js - Demo 0.3 Lợn Lòi Đầm redesign for the game layer (enemies.json boss entry: moveset_add_0_3,
// combos_0_3, behavior_0_3, difficulty_0_3, phases[1].phase2_0_3; combat_tuning.boss_rules_0_3).
// Pure: no three.js. ArpgCore does not read these blocks (data note); the 0.1/0.2 fields stay as they are.
//
// Fairness rules kept here and unit-tested (test/boss03.test.mjs):
//   - telegraphs never get shorter with difficulty (difficulty_0_3 only changes chains, feints,
//     punishes and the idle after an attack);
//   - in a chain a later step may shorten its windup (windup_mult) but never below
//     min_windup_s_parryable_in_combo (0.3 s) / min_windup_s_unparryable_in_combo (0.9 s);
//   - at most max_combo_steps (4) per chain, at most max_feints_per_phase (1) feint per phase, and a
//     feint must sound different from the attack it imitates (the real charge always roars);
//   - every punish uses a normally telegraphed attack and never interrupts a heal in progress.
import { PryJudge } from './shackle.js';

const PHASE_KEY = ['ph1', 'ph2'];

/** difficulty_0_3 row for a difficulty id ('custom' and unknown ids use the data default). */
export function difficultyRow03(def, diffId, defaultId = 'diff_cheo_do') {
  const t = def.difficulty_0_3 ?? {};
  return t[diffId] ?? t[defaultId] ?? { max_combo_steps: { ph1: 3, ph2: 4 }, feints: true, punish_heal: true, punish_dodge_spam: false, post_attack_idle_s: def.behavior_0_3?.post_attack_idle_s ?? { min: 0.4, max: 1.0 }, double_charge_in_ph1: false };
}

/** Speed / telegraph multipliers of a phase for 0.3 (phase2_0_3 replaces the 0.1/0.2 values). */
export function phaseMults03(phase) {
  const p2 = phase.phase2_0_3;
  return { speed: p2?.speed_mult_0_3 ?? phase.speed_mult ?? 1, telegraph: p2?.telegraph_time_mult_0_3 ?? phase.telegraph_time_mult ?? 1 };
}

/**
 * Attack ids available in a phase for 0.3: moveset + moveset_add_0_2 + moveset_add_0_3, minus
 * phase2_0_3.removes_from_moveset_0_3; no feints when the difficulty disables them; "Thác dữ" adds the
 * double charge to phase 1 (double_charge_in_ph1).
 */
export function phaseMoveset03(def, phaseIndex, row) {
  const phase = def.phases[phaseIndex];
  const remove = new Set(phase.phase2_0_3?.removes_from_moveset_0_3 ?? []);
  const ids = [...phase.moveset, ...(phase.moveset_add_0_2 ?? []), ...(phase.moveset_add_0_3 ?? [])];
  if (phaseIndex === 0 && row?.double_charge_in_ph1) ids.push('ll_can_hai_luot');
  const atk = (id) => def.attacks.find((a) => a.id === id);
  return [...new Set(ids)].filter((id) => !remove.has(id) && atk(id) && !(row && row.feints === false && atk(id).feint));
}

/** Cooldown of an attack in a phase (phase 2 Rống đau waits rong_dau_cooldown_s_0_3). */
export function attackCooldown03(attack, phase) {
  if (attack.id === 'll_rong_dau' && phase.phase2_0_3?.rong_dau_cooldown_s_0_3) return phase.phase2_0_3.rong_dau_cooldown_s_0_3;
  return attack.cooldown_s;
}

/** Chains of a phase, truncated to the difficulty's max_combo_steps (and boss_rules_0_3.max_combo_steps). */
export function phaseCombos03(def, phaseIndex, row, rules = {}) {
  const phase = def.phases[phaseIndex];
  const ids = phase.combos_add_0_3 ?? [];
  const max = Math.min(row?.max_combo_steps?.[PHASE_KEY[phaseIndex] ?? 'ph2'] ?? 4, rules.max_combo_steps ?? 4);
  const out = [];
  for (const id of ids) {
    const c = (def.combos_0_3 ?? []).find((x) => x.id === id);
    if (!c) continue;
    const steps = c.steps.slice(0, Math.max(1, max));
    if (steps.length < 2) continue;
    // A truncated chain keeps its counter-beat on the new last step only if the original had one there.
    out.push({ ...c, steps, truncated: steps.length < c.steps.length });
  }
  return out;
}

/**
 * Windup of a chain step: base windup × windup_mult, floored at the rule minimum for its class, never
 * longer than the base windup (the chain only ever speeds up its own steps, within the floor).
 * Difficulty / phase telegraph multipliers (>= 1) are applied afterwards by attackTimeline.
 */
export function comboStepWindup(attack, step, rules = {}) {
  const base = attack.windup_s;
  const floor = attack.parryable ? (rules.min_windup_s_parryable_in_combo ?? 0.3) : (rules.min_windup_s_unparryable_in_combo ?? 0.9);
  const want = base * (step?.windup_mult ?? 1);
  return Math.max(want, Math.min(base, floor));
}

/**
 * Attack instance for one step of a chain: windup per comboStepWindup, recovery replaced by the gap
 * to the next step (the boss flows into it), last step recovery × final_recovery_mult.
 */
export function comboStepAttack(attack, combo, index, rules = {}) {
  const step = combo.steps[index], last = index === combo.steps.length - 1;
  const next = combo.steps[index + 1];
  const a = { ...attack, windup_s: comboStepWindup(attack, step, rules) };
  a.recovery_s = last ? attack.recovery_s * (combo.final_recovery_mult ?? 1) : Math.max(0.05, next?.gap_s ?? 0.15);
  a._combo = { id: combo.id, index, last, riposte: !!step.riposte_on_perfect_parry || (last && attack.id === 'll_dam_cham'), selfMoveBefore: next?.self_move_before_m ?? 0 };
  return a;
}

/** Fairness check of every chain (used by the unit test and available to a validator). */
export function validateCombos(def, rules) {
  const errors = [];
  for (const c of def.combos_0_3 ?? []) {
    if (c.steps.length > (rules.max_combo_steps ?? 4)) errors.push(`${c.id}: ${c.steps.length} steps`);
    c.steps.forEach((st, i) => {
      const a = def.attacks.find((x) => x.id === st.attack);
      if (!a) { errors.push(`${c.id}: unknown ${st.attack}`); return; }
      const w = comboStepWindup(a, st, rules);
      const floor = a.parryable ? rules.min_windup_s_parryable_in_combo : rules.min_windup_s_unparryable_in_combo;
      if (w + 1e-9 < Math.min(a.windup_s, floor)) errors.push(`${c.id}[${i}]: windup ${w}`);
    });
  }
  for (const ph of def.phases) {
    const feints = [...(ph.moveset_add_0_3 ?? [])].map((id) => def.attacks.find((a) => a.id === id)).filter((a) => a?.feint);
    if (feints.length > (rules.max_feints_per_phase ?? 1)) errors.push(`${ph.id}: ${feints.length} feints`);
    for (const f of feints) {
      const real = def.attacks.find((a) => a.id === f.feint_of);
      if (rules.feint_requires_distinct_audio && real && f.telegraph.audio === real.telegraph.audio) errors.push(`${f.id}: same audio as ${real.id}`);
    }
  }
  return errors;
}

/**
 * Habit punishes (behavior_0_3 + difficulty row): eating close by → a telegraphed charge; dodge spam
 * (dodges_at_least in window_s) → Sóng bùn; kiting (farther than player_farther_than_m for for_s) →
 * Càn xuyên bãi; standing behind (rear_punish_0_3.player_in_rear_s) → Quay hông.
 * update() returns { attack, reason } or null; the caller checks the attack is available.
 */
export class PunishTracker {
  constructor(beh, row) { this.beh = beh ?? {}; this.row = row ?? {}; this.dodges = []; this.farT = 0; this.rearT = 0; this.healSeen = false; this.spamCd = 0; }
  setRow(row) { this.row = row ?? {}; }
  noteDodge(now) { this.dodges.push(now); if (this.dodges.length > 8) this.dodges.shift(); }
  reset() { this.dodges.length = 0; this.farT = 0; this.rearT = 0; this.healSeen = false; this.spamCd = 0; }
  update(dt, now, { dist, healing, rear }) {
    const b = this.beh, r = this.row;
    this.spamCd = Math.max(0, this.spamCd - dt);
    // Eating within reach: punished once per heal, by a fully telegraphed charge (heal is never interrupted by rule).
    if (!healing) this.healSeen = false;
    if (healing && !this.healSeen && b.punish_heal?.enabled && r.punish_heal !== false && dist <= (b.punish_heal.within_m ?? 12)) {
      this.healSeen = true; return { attack: b.punish_heal.response, reason: 'heal', windupMult: b.punish_heal.windup_mult ?? 1 };
    }
    const ds = b.punish_dodge_spam;
    if (ds?.enabled && r.punish_dodge_spam && this.spamCd <= 0) {
      const recent = this.dodges.filter((t) => now - t <= (ds.window_s ?? 3));
      if (recent.length >= (ds.dodges_at_least ?? 3)) { this.dodges.length = 0; this.spamCd = ds.window_s ?? 3; return { attack: ds.response, reason: 'dodge_spam' }; }
    }
    const ak = b.anti_kite;
    if (ak) { this.farT = dist > (ak.player_farther_than_m ?? 10) ? this.farT + dt : 0; if (this.farT >= (ak.for_s ?? 3)) { this.farT = 0; return { attack: ak.response, reason: 'kite' }; } }
    const rp = b.rear_punish_0_3;
    if (rp) { this.rearT = rear ? this.rearT + dt : 0; if (this.rearT >= (rp.player_in_rear_s ?? 1.2)) { this.rearT = 0; return { attack: 'll_quay_hong', reason: 'rear' }; } }
    return null;
  }
}

/** Idle after an attack or chain (difficulty_0_3 post_attack_idle_s, else behavior_0_3). */
export function postAttackIdle(row, beh, rng = Math.random) {
  const r = row?.post_attack_idle_s ?? beh?.post_attack_idle_s ?? { min: 0.4, max: 1.0 };
  return r.min + rng() * (r.max - r.min);
}

/** Chance to open a chain at this distance (behavior_0_3.combo_chance). */
export function comboChance(beh, dist) {
  const c = beh?.combo_chance; if (!c) return 0;
  return dist <= (c.near_m ?? 3) ? c.near ?? 0.5 : c.far ?? 0.1;
}

// ------------------------------------------------------------------ arena (phase 2 water recedes, stakes, mud trails)
/** Mud trails left by the crossing charges (mud_trail): slow ×player_speed_mult, block sprint, expire. */
export class MudTrails {
  constructor() { this.list = []; }
  add(seg, spec, now) {
    this.list.push({ ...seg, w: spec.width_m ?? 1.6, until: now + (spec.duration_s ?? 8), mult: spec.player_speed_mult ?? 0.6, blocksSprint: !!spec.blocks_sprint, born: now });
    while (this.list.length > (spec.max_active ?? 3)) this.list.shift();
    return this.list[this.list.length - 1];
  }
  tick(now) { const before = this.list.length; this.list = this.list.filter((t) => t.until > now); return before !== this.list.length; }
  /** Strongest trail under (x, z), or null. */
  at(x, z) {
    let best = null;
    for (const t of this.list) if (segDist(x, z, t.ax, t.az, t.bx, t.bz) <= t.w / 2 && (!best || t.mult < best.mult)) best = t;
    return best;
  }
  clear() { this.list.length = 0; }
}

export function segDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
  const u = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / l2)) : 0;
  return Math.hypot(px - (ax + vx * u), pz - (az + vz * u));
}

/** First intact stake hit by a body of radius r moving from (x0,z0) to (x1,z1); returns the stake or null. */
export function stakeOnPath(x0, z0, x1, z1, stakes, r) {
  let best = null, bestU = Infinity;
  for (const s of stakes) {
    if (s.broken) continue;
    if (segDist(s.x, s.z, x0, z0, x1, z1) > r + (s.radius ?? 0.35)) continue;
    const vx = x1 - x0, vz = z1 - z0, l2 = vx * vx + vz * vz || 1;
    const u = ((s.x - x0) * vx + (s.z - z0) * vz) / l2;
    if (u < bestU) { bestU = u; best = s; }
  }
  return best;
}

/** Distance a charge can travel from (x,z) along (dx,dz) before leaving a circle arena (edge margin m). */
export function distanceToArenaEdge(x, z, dx, dz, cx, cz, R, margin = 1.6) {
  const ox = x - cx, oz = z - cz, r = R - margin;
  const b = ox * dx + oz * dz, c = ox * ox + oz * oz - r * r;
  const disc = b * b - c;
  if (disc < 0) return 0;
  return Math.max(0, -b + Math.sqrt(disc));
}

/** Second-pass aim of the double charge: toward the player, but at most reaim_max_deg off the reverse heading. */
export function reaimLimited(headingYaw, wantYaw, maxDeg) {
  const back = headingYaw + Math.PI;
  let d = wantYaw - back; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  const m = (maxDeg * Math.PI) / 180;
  return back + Math.max(-m, Math.min(m, d));
}

// ------------------------------------------------------------------ "Ghì nanh" (tusk_lock_0_3)
/**
 * The 2-beat rhythm of Ghì nanh uses the pry rules (rhythm_ref combat_tuning.pry): same bpm, window,
 * retries, hold option and auto mode, but beats = tusk_lock.beats. Like the pry it MUST be driven by
 * real time (wallDt), never by hit-stop / slow-mo scaled game time (QA S2).
 */
export function makeTuskLockJudge(pryTuning, tuskLock, opts = {}) {
  return new PryJudge({ ...pryTuning, beats: tuskLock?.beats ?? 2 }, opts);
}

/** Can Ghì nanh start (trigger: boss stunned by a stake, player within player_within_m, once per fight)? */
export function canTuskLock(tl, { bossState, dist, used }) {
  if (!tl || used >= (tl.max_per_fight ?? 1)) return false;
  return bossState === (tl.trigger?.boss_state ?? 'stake_stun') && dist <= (tl.trigger?.player_within_m ?? 3);
}
