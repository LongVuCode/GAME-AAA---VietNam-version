// enemyAi.js - pure helpers for enemy attacks: timeline (telegraph scaling), attack choice with
// cooldowns, and the attacker token pool (combat_tuning.enemy_ai: max simultaneous attackers).

/**
 * Attack timeline. Windup (the telegraph) is scaled only by telegraph multipliers, never shortened
 * by enemy speed (difficulty "Thác dữ": telegraphs stay the same). Speed scales active/recovery.
 */
export function attackTimeline(attack, { speedMult = 1, telegraphMult = 1 } = {}) {
  const windup = attack.windup_s * telegraphMult;
  const hold = (attack.hold_s ?? 0) * telegraphMult;
  const active = attack.active_s / speedMult;
  const recovery = attack.recovery_s / speedMult;
  const hits = Math.max(1, attack.hits ?? 1);
  const hitTimes = [];
  for (let i = 0; i < hits; i++) hitTimes.push(windup + hold + (hits === 1 ? 0 : (active * i) / (hits - 1)));
  const stumble = attack.ends_in_stumble_s ?? 0;
  return { windup, hold, active, recovery, stumble, total: windup + hold + active + recovery + stumble, hitTimes };
}

/** Telegraph class for UI/audio: unparryable damaging attacks get the red-bronze cue (never color only). */
export function telegraphKind(attack) {
  if (!attack.parryable && attack.damage > 0) return 'unparryable';
  if (attack.delayed) return 'delayed';
  if (attack.damage <= 0) return 'nodamage';
  return 'parryable';
}

/**
 * Chooses an attack among ids that are off cooldown and in range. Long-range attacks (charges) are
 * preferred when the player is far; otherwise weighted random by rng() in [0,1).
 */
export function chooseAttack(attacks, ids, cooldowns, distance, rng = Math.random) {
  const ready = ids.map((id) => attacks.find((a) => a.id === id))
    .filter((a) => a && (cooldowns[a.id] ?? 0) <= 0 && distance <= a.range_m);
  if (!ready.length) return null;
  return ready[Math.min(ready.length - 1, Math.floor(rng() * ready.length))];
}

/** Validates the moveset rule "max delayed attacks per moveset" (N7). */
export function delayedCount(attacks, ids) {
  return ids.map((id) => attacks.find((a) => a.id === id)).filter((a) => a?.delayed).length;
}

export class AttackTokens {
  constructor({ max_simultaneous_attackers: max, attack_token_cooldown_s: cooldown, token_priority: priority }) {
    this.max = max; this.cooldown = cooldown; this.holders = new Set(); this.cool = new Map();
    // token_priority "in_camera_front_first": an off-screen enemy gets a token only if no on-screen
    // enemy was refused one during the previous tick.
    this.frontFirst = priority === 'in_camera_front_first'; this.frontWaiting = 0; this.frontWaitingNext = 0;
  }
  tryAcquire(id, onScreen = true) {
    if (this.holders.has(id)) return true;
    if ((this.cool.get(id) ?? 0) > 0) return false;
    if (this.holders.size >= this.max || (this.frontFirst && !onScreen && this.frontWaiting > 0)) { if (onScreen) this.frontWaitingNext += 1; return false; }
    this.holders.add(id); return true;
  }
  release(id) { if (this.holders.delete(id)) this.cool.set(id, this.cooldown); }
  tick(dt) {
    for (const [k, v] of this.cool) { const n = v - dt; if (n <= 0) this.cool.delete(k); else this.cool.set(k, n); }
    this.frontWaiting = this.frontWaitingNext; this.frontWaitingNext = 0;
  }
  get count() { return this.holders.size; }
}

// ------------------------------------------------------------------ Demo 0.2 behaviour (FUN_PASS_0_2 P0-5)
// Data: combat_tuning.enemy_ai (attack_selection = weighted_range_recency, repeat_weight_mult,
// max_same_attack_in_row, token_wait_ring_m, flank_angle_deg, player_the_ratio_at_least,
// player_near_break_aggression_mult) and enemies[].behavior.

/**
 * Weighted attack choice (attack_selection: weighted_range_recency). Candidates must be ready and in
 * range. Weight favours attacks whose reach fits the distance, halves the last attack used
 * (repeat_weight_mult) and forbids a third identical attack in a row (max_same_attack_in_row).
 * history: ids of the last attacks, most recent last. prefer: id that gets x3 (e.g. retreat -> charge).
 */
export function chooseAttackWeighted(attacks, ids, cooldowns, distance, history, ai, rng = Math.random, prefer = null) {
  const repeat = ai?.repeat_weight_mult ?? 0.5, maxRow = ai?.max_same_attack_in_row ?? 2;
  const last = history.length ? history[history.length - 1] : null;
  let run = 0;
  for (let i = history.length - 1; i >= 0 && history[i] === last; i--) run++;
  const cands = [], weights = [];
  let total = 0;
  for (const id of ids) {
    const a = attacks.find((x) => x.id === id);
    if (!a || (cooldowns[a.id] ?? 0) > 0 || distance > a.range_m) continue;
    let w = 1 / (1 + Math.abs(a.range_m * 0.7 - distance) * 0.6);
    if (id === last) w = run >= maxRow ? 0 : w * repeat;
    if (prefer && id === prefer) w *= 3;
    if (w <= 0) continue;
    cands.push(a); weights.push(w); total += w;
  }
  if (!cands.length) return null;
  let r = rng() * total;
  for (let i = 0; i < cands.length; i++) { r -= weights[i]; if (r <= 0) return cands[i]; }
  return cands[cands.length - 1];
}

/** Is the player inside the enemy's rear arc (behavior.rear_punish.rear_arc_deg)? */
export function inRearArc(enemy, player, rearArcDeg) {
  const dx = player.x - enemy.x, dz = player.z - enemy.z;
  let a = Math.atan2(dx, dz) - enemy.yaw;
  while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
  return Math.abs(a) >= Math.PI - (rearArcDeg * Math.PI / 360);
}

/**
 * Steering while waiting for a token: hold the ring (token_wait_ring_m) and orbit (circle.speed_mps,
 * dir = +1 / -1). Flankers aim for an angle off the player's facing (flank_angle_deg).
 * Returns a desired velocity { vx, vz } (m/s).
 */
export function circleVelocity(enemy, player, { ring, speed, dir, flankYaw = null, approachSpeed }) {
  const dx = enemy.x - player.x, dz = enemy.z - player.z;
  const d = Math.hypot(dx, dz) || 1e-3;
  const rx = dx / d, rz = dz / d;           // radial (away from the player)
  const tx = -rz * dir, tz = rx * dir;       // tangential
  const radialErr = d - ring;                // > 0: too far
  let vr = -Math.max(-1, Math.min(1, radialErr / 1.5)) * (approachSpeed ?? speed);
  let vt = speed;
  if (flankYaw != null) {
    // Move along the ring toward the flank point.
    const cur = Math.atan2(dx, dz);
    let e = flankYaw - cur; while (e > Math.PI) e -= Math.PI * 2; while (e < -Math.PI) e += Math.PI * 2;
    vt = Math.max(-1, Math.min(1, e * 2)) * speed;
    return { vx: rx * vr + rz * vt, vz: rz * vr - rx * vt };
  }
  return { vx: rx * vr + tx * vt, vz: rz * vr + tz * vt };
}

/**
 * Reaction to posture (P0-5): own Thế >= on_own_the_high.the_ratio_at_least -> defensive action
 * (turtle_front / hop_away); player Thế >= enemy_ai.player_the_ratio_at_least -> aggression mult.
 */
export function theReaction(ownRatio, playerRatio, behavior, ai) {
  const hi = behavior?.on_own_the_high;
  const defend = hi && ownRatio >= (hi.the_ratio_at_least ?? 0.7) ? hi.action : null;
  const aggro = playerRatio >= (ai?.player_the_ratio_at_least ?? 0.7) ? (ai?.player_near_break_aggression_mult ?? 1.4) : 1;
  return { defend, aggro };
}

/** Attacks available to an enemy in Demo 0.2: base attacks + attacks_0_2. */
export function allAttacks(def) { return [...def.attacks, ...(def.attacks_0_2 ?? [])]; }

/** Boss phase moveset with moveset_add_0_2. */
export function phaseMoveset(phase) { return [...phase.moveset, ...(phase.moveset_add_0_2 ?? [])]; }
