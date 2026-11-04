// attackMotion.js - how an attack MOVES and CONNECTS (FUN_PASS_0_2 P0-2, P0-3; combat_tuning.
// attack_motion / hit_react / weapon_swap; weapons.json moves[].motion, sprint_attack, swap_attack;
// enemies.json behavior.hit_react). Pure: lunge plan with target magnetism, lunge curve over the
// startup, swept hit test across the active frames, hit-react (flinch + knockback) by weight and
// species. Positions are {x, z}; yaw 0 faces +z (forward = sin yaw, cos yaw).
import { normAngle } from './locomotion.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (u) => { const t = clamp01(u); return t * t * (3 - 2 * t); };

/**
 * Motion of one move instance. kind: chain | heavy | branch | dodge_attack | counter | house | sprint | swap.
 * Returns { lungeM, lungeStartS, lungeEndS, afterM, driftM, hitbox, knockM, react, theMult, groundImpact }.
 */
export function motionFor(move, weapon, { kind = 'chain', chargeLevel = 0 } = {}) {
  const mo = move.motion ?? {};
  let lunge = mo.lunge_m ?? 0;
  if (chargeLevel > 0 && mo.lunge_per_charge_level_m) lunge += mo.lunge_per_charge_level_m * chargeLevel;
  let theMult = 1;
  if (kind === 'sprint' && weapon?.sprint_attack) { lunge += weapon.sprint_attack.extra_lunge_m ?? 0; theMult = weapon.sprint_attack.the_damage_mult ?? 1; }
  if (kind === 'swap' && weapon?.swap_attack) theMult = weapon.swap_attack.the_damage_mult ?? 1;
  const startup = move.startup_s ?? 0.2, active = move.active_s ?? 0.1;
  return {
    lungeM: lunge,
    lungeStartS: Math.min(mo.lunge_start_s ?? 0, startup),
    lungeEndS: startup + active * 0.5,     // the step lands on the contact
    afterM: mo.self_move_after_m ?? 0,     // e.g. Đâm rút steps back 0.3 m in recovery
    driftM: mo.self_drift_m ?? 0,          // e.g. Xoay rìu staggers forward with the spin
    hitbox: mo.hitbox ?? (move.arc_deg >= 300 ? 'circle' : move.arc_deg > 40 ? 'arc' : 'line'),
    knockM: mo.target_knockback_m ?? null,
    react: mo.target_react ?? 'flinch',
    theMult,
    groundImpact: !!mo.ground_impact,
  };
}

/**
 * Lunge distance with magnetism (attack_motion.magnetism_max_m, magnetism_stop_gap_m): with a target,
 * travel so the target ends inside the reach (ideal gap ~45% of range), never closer than the stop
 * gap, and at most lunge + magnetism_max_m. Without a target the data lunge is used as is.
 * targetSurfaceDist: distance from attacker centre to the target's body surface (null = no target).
 */
export function planLunge(lungeM, range, targetSurfaceDist, am) {
  if (targetSurfaceDist == null) return lungeM;
  const maxPull = lungeM + (am?.magnetism_max_m ?? 1.5);
  const gap = Math.max(am?.magnetism_stop_gap_m ?? 0.3, range * 0.45);
  const want = targetSurfaceDist - gap;
  // Too far even with the pull: lunge the data amount only (no "teleport" toward a distant enemy).
  if (want > maxPull) return lungeM;
  return Math.max(0, Math.min(maxPull, want));
}

/** Cumulative lunge displacement (m) at time t of the move (smooth step over [start, end]). */
export function lungeAt(t, lungeM, startS, endS) {
  if (t <= startS) return 0;
  if (t >= endS) return lungeM;
  return lungeM * smooth((t - startS) / Math.max(1e-3, endS - startS));
}

/** Displacement of the recovery move (self_move_after_m) at time t: over the first 60% of recovery. */
export function afterMoveAt(t, afterM, recoveryStartS, recoveryS) {
  if (!afterM || t <= recoveryStartS) return 0;
  return afterM * smooth((t - recoveryStartS) / Math.max(1e-3, recoveryS * 0.6));
}

/**
 * Swept hit test for one frame of the active window (attack_motion.hit_detection = swept_over_active).
 * u0/u1: progress through the active window at the previous and current frame (0..1).
 * attacker { x, z, yaw }; target { x, z, radius }; spec { hitbox, range, arcDeg, sweepDir (+1 right->left) }.
 * line: the reach grows from 35% to 100% of range (thrust); arc / circle: the blade angle sweeps across
 * the arc and only targets inside the slice swept this frame are hit.
 */
export function sweepHits(attacker, target, spec, u0, u1) {
  const dx = target.x - attacker.x, dz = target.z - attacker.z;
  const dist = Math.hypot(dx, dz);
  const r = target.radius ?? 0.5;
  if (dist > spec.range + r) return false;
  if (dist < r + 0.3) return u1 >= 0.35 || u0 <= 0; // body contact
  const fx = Math.sin(attacker.yaw), fz = Math.cos(attacker.yaw);
  const bearing = normAngle(Math.atan2(dx, dz) - attacker.yaw); // + = to the attacker's left
  const slack = Math.asin(Math.min(1, r / Math.max(dist, 1e-3)));
  if (spec.hitbox === 'line') {
    const along = dx * fx + dz * fz, lateral = Math.abs(dx * fz - dz * fx);
    const reach = spec.range * (0.35 + 0.65 * smooth(u1));
    const cone = ((spec.arcDeg ?? 20) * Math.PI / 360) + slack;
    return along > 0 && along - r <= reach && (lateral <= r + 0.3 || Math.abs(bearing) <= cone);
  }
  const half = (spec.hitbox === 'circle' ? 360 : (spec.arcDeg ?? 90)) * Math.PI / 360;
  const dir = spec.sweepDir ?? 1;
  // Blade angle relative to facing: starts at +half*dir, ends at -half*dir.
  const a0 = dir * half * (1 - 2 * clamp01(u0)), a1 = dir * half * (1 - 2 * clamp01(u1));
  if (spec.hitbox === 'circle') {
    // Full turn: compare along the swept path (angles unwrap past ±pi).
    const lo = Math.min(a0, a1) - slack, hi = Math.max(a0, a1) + slack;
    for (const k of [-2, 0, 2]) { const b = bearing + k * Math.PI; if (b >= lo && b <= hi) return true; }
    return false;
  }
  const lo = Math.min(a0, a1) - slack, hi = Math.max(a0, a1) + slack;
  return bearing >= lo && bearing <= hi;
}

const WEIGHT_RANK = { light: 0, medium: 1, heavy: 2, finisher: 3 };
/**
 * Hit reaction of an enemy (combat_tuning.hit_react, enemies[].behavior.hit_react, move motion).
 * weight: light | medium | heavy | finisher. Returns { flinchS, knockM (signed: < 0 pulls), durS }.
 */
export function hitReactFor(weight, motion, behaviorReact, hr) {
  const br = behaviorReact ?? {};
  const w = weight in WEIGHT_RANK ? weight : 'light';
  let flinch = w === 'heavy' || w === 'finisher' ? hr.flinch_heavy_s : w === 'medium' ? hr.flinch_medium_s : hr.flinch_light_s;
  let knock = w === 'finisher' ? hr.knockback_finisher_m
    : motion?.knockM != null ? motion.knockM
      : w === 'heavy' ? hr.knockback_heavy_m : w === 'medium' ? hr.knockback_medium_m : hr.knockback_light_m;
  if (br.flinch_min_weight && WEIGHT_RANK[w] < (WEIGHT_RANK[br.flinch_min_weight] ?? 0)) flinch = 0;
  flinch *= br.flinch_mult ?? 1;
  knock *= br.knockback_mult ?? 1;
  return { flinchS: flinch, knockM: knock, durS: hr.knockback_duration_s ?? 0.12 };
}

/** Player knockback distance for an enemy attack (attack.player_knockback_m, else hit_react defaults). */
export function playerKnockback(attack, hr) {
  if (attack.player_knockback_m != null) return attack.player_knockback_m;
  return attack.parryable ? hr.player_knockback_light_m : hr.player_knockback_heavy_m;
}

/** Can the player swap weapons now (weapon_swap.allowed_states: free, attack_recovery)? */
export function canSwapNow(ws, state, inRecovery) {
  const allowed = ws?.allowed_states ?? ['free'];
  if (state === 'free' || state === 'guard') return allowed.includes('free');
  return state === 'attack' && inRecovery && allowed.includes('attack_recovery');
}

/** Sprint attack applies when the player sprinted at least sprint_attack_min_sprint_s. */
export function isSprintAttack(sprintS, am) { return sprintS >= (am?.sprint_attack_min_sprint_s ?? 0.4); }
