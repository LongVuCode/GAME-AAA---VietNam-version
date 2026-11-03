// difficulty.js - resolves a preset (combat_tuning.difficulty.presets) plus optional custom overrides
// (custom_ranges) into the effective knobs used by the game.
export function resolveDifficulty(tuning, presetId, custom = null) {
  const d = tuning.difficulty;
  const preset = d.presets.find((p) => p.id === presetId) ?? d.presets.find((p) => p.id === d.default);
  const baseParry = tuning.guard.parry_window_s;
  const eff = {
    id: preset.id,
    damageTaken: preset.damage_taken_mult,
    damageDealt: preset.damage_dealt_mult,
    enemySpeed: preset.enemy_speed_mult,
    parryWindowS: baseParry * preset.parry_window_mult,
    telegraphMult: preset.telegraph_time_mult,
    pryAuto: preset.pry_auto,
    aimAssist: preset.aim_assist,
    custom: false,
  };
  if (custom) {
    const r = d.custom_ranges;
    const clamp = (k, v) => Math.min(r[k].max, Math.max(r[k].min, v));
    if (custom.parry_window_s != null) eff.parryWindowS = clamp('parry_window_s', custom.parry_window_s);
    if (custom.damage_taken_mult != null) eff.damageTaken = clamp('damage_taken_mult', custom.damage_taken_mult);
    if (custom.enemy_speed_mult != null) eff.enemySpeed = clamp('enemy_speed_mult', custom.enemy_speed_mult);
    if (custom.telegraph_time_mult != null) eff.telegraphMult = clamp('telegraph_time_mult', custom.telegraph_time_mult);
    if (custom.pry_auto != null) eff.pryAuto = !!custom.pry_auto;
    if (custom.aim_assist != null) eff.aimAssist = !!custom.aim_assist;
    eff.custom = true;
  }
  return eff;
}
