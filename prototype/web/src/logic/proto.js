// proto.js - Prototype-only constants that design data does NOT define yet.
// They are NOT design values: they exist so the graybox can run, and must be replaced by
// design data (or removed) before any balance conclusion. Every entry says where it came from.
export const PROTO = Object.freeze({
  // Mirrors ArpgCore FParryConfig::Duration default (anti-spam lockout of a parry press).
  parryActionS: 0.4,
  // Seconds after a dodge ends during which L becomes the dodge attack ("dodge,L").
  // Reuses combat_tuning.input.combo_pause_threshold_s by convention (see README).
  // Enemy locomotion speeds (m/s): design data has none yet. Graybox guesses, not balance.
  enemyMoveSpeedMps: { en_cua_cang_bun: 2.4, en_bo_ngua_lau: 3.6, en_u_bun: 1.4, boss_lon_loi_dam: 3.8 },
  // Enemy body radius (m) for collision / hit tests. Graybox only.
  enemyRadiusM: { en_cua_cang_bun: 0.8, en_bo_ngua_lau: 0.5, en_u_bun: 1.1, boss_lon_loi_dam: 1.6 },
  playerRadiusM: 0.4,
  // Front arc (deg) in which a crab's front shell applies front_damage_mult.
  frontArcDeg: 120,
  // Enemy aggro radius (m).
  aggroRadiusM: 12,
  // Fraction of attack arc used for enemy melee hit tests (deg).
  enemyHitArcDeg: 100,
  // Medium camera shake = midpoint of light/heavy amplitudes from combat_tuning.camera_shake.
});
