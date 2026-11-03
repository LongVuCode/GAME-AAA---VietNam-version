// damage.js - player -> enemy and enemy -> player damage (data: weapons.json, enemies.json,
// combat_tuning.guard, difficulty). Mirrors the intent of ArpgCore ComputeDamage (Damage.h).
import { chargeMult } from './combo.js';
import { Outcome } from './defense.js';

/**
 * @param p { move, chargeLevel, kind, difficulty, mods, baoKhi, frontal, frontMult, postPerfectDodge }
 *   mods: skill modifiers (lineage.skillModifiers)
 *   baoKhi: { applies_to, value } | null (equipped Bảo khí effect)
 */
export function playerHitDamage(p) {
  const cm = chargeMult(p.move, p.chargeLevel ?? 0);
  const front = p.frontal ? (p.frontMult ?? 1) : 1;
  const dealt = p.difficulty?.damageDealt ?? 1;
  let theMult = 1 + (p.mods?.theMult ?? 0);
  if (p.baoKhi && p.baoKhi.applies_to === 'heavy_and_branch' && (p.kind === 'heavy' || p.kind === 'branch')) {
    theMult += p.baoKhi.value;
  }
  if (p.postPerfectDodge && p.kind === 'chain' && p.move.hit_weight === 'light') {
    theMult *= p.mods?.postPerfectDodgeTheMult ?? 1;
  }
  return {
    hp: p.move.damage * cm * dealt * front,
    the: p.move.the_damage * cm * theMult * front,
  };
}

/** Drum burst: one of N hits. */
export function burstHitDamage(burst, difficulty, mods) {
  const n = burst.hits;
  return {
    hp: (burst.damage_total / n) * (difficulty?.damageDealt ?? 1),
    the: (burst.the_damage_total / n) * (1 + (mods?.theMult ?? 0) + (mods?.burstTheMult ?? 0)),
  };
}

/** Damage the player takes from one hit of an enemy attack, given the defense outcome. */
export function enemyHitDamage(attack, outcome, guardTuning, difficulty) {
  const taken = difficulty?.damageTaken ?? 1;
  switch (outcome) {
    case Outcome.HIT:
      return { hp: attack.damage * taken, the: 0 };
    case Outcome.GUARDED:
      return {
        hp: attack.damage * (1 - guardTuning.damage_reduction) * taken,
        the: attack.player_the_damage * guardTuning.player_the_damage_mult,
      };
    default:
      return { hp: 0, the: 0 };
  }
}

/** Posture damage dealt to the attacking enemy by a successful parry. */
export function parryTheDamage(outcome, guardTuning) {
  if (outcome === Outcome.PERFECT_PARRY) return guardTuning.perfect_parry_enemy_the_damage;
  if (outcome === Outcome.PARRIED) return guardTuning.parry_enemy_the_damage;
  return 0;
}
