// skills.js - Demo 0.3 Weapon Arts ("Thế võ", design/data/skills.json, DEMO_0_3_DESIGN §3.4) for the
// game layer: per-skill cooldowns (start when the Art ends, tick for every weapon so swapping keeps
// them: rules.weapon_swap_keeps_cooldowns), level lookup through the progression API, cooldown
// multiplier from gear stats, and drops / XP when a normal enemy is driven off (enemies[].drops,
// skills.xp_sources). Pure: no DOM, no three.js.
//
// Progression is owned by another module (game.progress: inventory / XP / skill ranks). This file only
// READS it through a small adapter; when it is absent the safe default is rank 1 and base stats.

/** The two Arts of a weapon (weapons[].skills_0_3 order, else skills[].slot). */
export function skillsForWeapon(skillsData, weapon) {
  const all = skillsData?.skills ?? [];
  const ids = weapon?.skills_0_3 ?? all.filter((s) => s.weapon === weapon?.id).sort((a, b) => a.slot - b.slot).map((s) => s.id);
  return ids.map((id) => all.find((s) => s.id === id)).filter(Boolean);
}

/** levels[] entry for a rank (clamped to 1..max). Rank 0 = locked → null. */
export function levelEntry(def, level) {
  if (!def || !(level >= 1)) return null;
  const lv = Math.min(def.levels.length, Math.max(1, Math.floor(level)));
  return def.levels.find((l) => l.level === lv) ?? def.levels[lv - 1];
}

/** Cooldown of a rank × gear skill_cooldown_mult (hud_0_3.skills: levels[].cooldown_s × skill_cooldown_mult). */
export function effectiveCooldown(entry, stats = {}) {
  // progress.getStats() -> { stats: { skill_cooldown_mult } } (logic/progression.js); a flat object also works.
  const m = stats?.stats?.skill_cooldown_mult ?? stats?.skill_cooldown_mult ?? 1;
  return (entry?.cooldown_s ?? 0) * (m > 0 ? m : 1);
}

/** Read-only adapter over game.progress (getSkillLevel, getStats, addItem, addXp), with safe defaults. */
export function progressAdapter(progress) {
  const p = progress ?? null;
  const fn = (name) => (p && typeof p[name] === 'function' ? p[name].bind(p) : null);
  const getLevel = fn('getSkillLevel'), getStats = fn('getStats'), addItem = fn('addItem'), addXp = fn('addXp');
  return {
    present: !!p,
    level(id) { if (!getLevel) return 1; const v = getLevel(id); return Number.isFinite(v) ? v : 1; },
    stats() { if (!getStats) return {}; try { return getStats() ?? {}; } catch { return {}; } },
    addItem, addXp,
  };
}

export class SkillCooldowns {
  constructor() { this.left = new Map(); this.total = new Map(); }
  start(id, seconds) { if (seconds > 0) { this.left.set(id, seconds); this.total.set(id, seconds); } }
  /** Cut seconds off a running cooldown (Bổ đốn cây rank 3, set bonus "Nhịp chèo"). */
  cut(id, seconds) { if (this.left.has(id)) { const v = this.left.get(id) - seconds; if (v <= 0) this.left.delete(id); else this.left.set(id, v); } }
  /** All cooldowns run whatever weapon is in hand (weapon_swap_keeps_cooldowns). */
  tick(dt) { if (!(dt > 0)) return; for (const [k, v] of this.left) { const n = v - dt; if (n <= 0) this.left.delete(k); else this.left.set(k, n); } }
  remaining(id) { return this.left.get(id) ?? 0; }
  ready(id) { return !this.left.has(id); }
  /** 1 = just used, 0 = ready (HUD setCooldown contract). */
  ratio(id) { const t = this.total.get(id) ?? 0; return t > 0 ? Math.min(1, this.remaining(id) / t) : 0; }
  clear() { this.left.clear(); this.total.clear(); }
}

/** Drops of a normal enemy that ran off / dissipated (chance < 1 allowed for normal enemies only). */
export function rollDrops(drops, rng = Math.random) {
  const out = [];
  for (const d of drops ?? []) if (rng() < (d.chance ?? 1)) out.push({ item: d.item, count: d.count ?? 1 });
  return out;
}

/** XP for driving an enemy off (skills.xp_sources kind enemy_driven_off / enemy_dissipated / boss_freed). */
export function xpForEnemy(skillsData, enemyId) {
  const s = (skillsData?.xp_sources ?? []).find((x) => x.enemy === enemyId);
  return s?.xp ?? 0;
}
