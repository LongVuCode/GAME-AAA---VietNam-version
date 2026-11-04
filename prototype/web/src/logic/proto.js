// proto.js - Prototype-only constants that design data does NOT define yet.
// They are NOT design values: they exist so the graybox can run, and must be replaced by
// design data (or removed) before any balance conclusion. Every entry says where it came from.
export const PROTO = Object.freeze({
  // Mirrors ArpgCore FParryConfig::Duration default (anti-spam lockout of a parry press).
  parryActionS: 0.4,
  // Demo 0.2: enemy speed, radius, aggro / leash radius now come from enemies[].behavior (data).
  playerRadiusM: 0.4,
  // Front arc (deg) in which a crab's front shell applies front_damage_mult.
  frontArcDeg: 120,
  // Fraction of attack arc used for enemy melee hit tests (deg).
  enemyHitArcDeg: 100,
});
