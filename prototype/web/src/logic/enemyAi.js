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
  constructor({ max_simultaneous_attackers: max, attack_token_cooldown_s: cooldown }) {
    this.max = max; this.cooldown = cooldown; this.holders = new Set(); this.cool = new Map();
  }
  tryAcquire(id) {
    if (this.holders.has(id)) return true;
    if ((this.cool.get(id) ?? 0) > 0) return false;
    if (this.holders.size >= this.max) return false;
    this.holders.add(id); return true;
  }
  release(id) { if (this.holders.delete(id)) this.cool.set(id, this.cooldown); }
  tick(dt) { for (const [k, v] of this.cool) { const n = v - dt; if (n <= 0) this.cool.delete(k); else this.cool.set(k, n); } }
  get count() { return this.holders.size; }
}
