// inventory.js - Demo 0.3 pack (DEMO_0_3_DESIGN §3, items.json gear_0_3): item stacks with limits,
// owned gear pieces, the 9 equipment slots and their rules, aggregated stats with set bonuses,
// upgrade costs (+1..+3) and stat comparison. Pure: no DOM, no three.js (node --test).
//
// Prototype assumptions (not in design data yet, flagged for game-designer):
//   - stack limits per category (STACK_LIMITS) and the number of loose gear pieces the pack holds
//     (GEAR_CAPACITY);
//   - an armor piece's upgrade multiplies only its `armor` stat (armor_stat_mult_per_plus, "giáp +15%
//     mỗi bậc"); a trinket's upgrade scales the strength of every stat it has (trinket_effect_mult_per_plus).

export const STACK_LIMITS = { consumable: 20, material: 99, bao_khi: 1 };
export const GEAR_CAPACITY = 24;

/** Stat ids that combine multiplicatively (format "percent_delta" in stat_defs; 1.0 = no change). */
export function multiplicativeStats(gear) {
  return new Set(gear.stat_defs.filter((s) => s.format === 'percent_delta').map((s) => s.id));
}

// ---------------------------------------------------------------- stacks
/**
 * Stackable items (consumables, materials, Bảo khí materials) on top of a counts store with the
 * crafting Inventory interface (add / count / hasAll / removeAll), so crafting and the pack share one
 * source of truth. Counts never go negative; removals are atomic.
 */
export class Bag {
  constructor(itemsData, store, limits = STACK_LIMITS) {
    this.items = new Map(itemsData.items.map((i) => [i.id, i]));
    this.store = store; this.limits = limits;
  }
  def(id) { return this.items.get(id) ?? null; }
  stackMax(id) { return this.limits[this.def(id)?.category] ?? 99; }
  count(id) { return this.store.count(id); }
  /** Adds up to the stack limit. Returns { added, overflow }. */
  add(id, n = 1) {
    if (!this.def(id) || !(n > 0)) return { added: 0, overflow: Math.max(0, n | 0) };
    const room = Math.max(0, this.stackMax(id) - this.count(id));
    const added = Math.min(room, Math.floor(n));
    if (added > 0) this.store.add(id, added);
    return { added, overflow: Math.floor(n) - added };
  }
  hasAll(costs) { return costs.every((c) => this.count(c.item) >= c.count); }
  /** Atomic: removes every cost or nothing. */
  removeAll(costs) {
    if (!costs.every((c) => c.count >= 0) || !this.hasAll(costs)) return false;
    return this.store.removeAll(costs);
  }
  /** Stacks currently held: [{ id, count, def }] (category filter: 'all' | consumable | material | bao_khi). */
  list(filter = 'all') {
    const out = [];
    for (const def of this.items.values()) {
      const n = this.count(def.id);
      if (n > 0 && (filter === 'all' || def.category === filter)) out.push({ id: def.id, count: n, def });
    }
    return out;
  }
}

// ---------------------------------------------------------------- equipment
/** Slot definition lookups from items.gear_0_3. */
export function slotDef(gear, slotId) { return gear.slots.find((s) => s.id === slotId) ?? null; }
export function pieceDef(gear, id) { return gear.pieces.find((p) => p.id === id) ?? null; }

/**
 * Whether item `itemId` (gear piece, weapon id or Bảo khí id) may go into `slotId`.
 * kind(itemId) -> 'armor' | 'trinket' | 'weapon' | 'bao_khi' | null; weaponSlotOf(id) -> 1 | 2.
 * Returns { ok, reason? } with reason in: unknown_slot, locked, wrong_kind, wrong_slot.
 */
export function slotAccepts(gear, slotId, itemId, { unlocked = () => true, kindOf, weaponSlotOf = () => null } = {}) {
  const s = slotDef(gear, slotId);
  if (!s) return { ok: false, reason: 'unknown_slot' };
  if (!unlocked(s.unlock)) return { ok: false, reason: 'locked' };
  const kind = kindOf(itemId);
  if (kind !== s.accepts) return { ok: false, reason: 'wrong_kind' };
  if (kind === 'armor' && pieceDef(gear, itemId)?.slot !== slotId) return { ok: false, reason: 'wrong_slot' };
  if (kind === 'weapon' && `weapon_${weaponSlotOf(itemId)}` !== slotId) return { ok: false, reason: 'wrong_slot' };
  return { ok: true };
}

/** Owned gear pieces (unique per id in the demo) with their upgrade level, and what is equipped. */
export class Equipment {
  constructor(gear, capacity = GEAR_CAPACITY) {
    this.gear = gear; this.capacity = capacity;
    this.owned = new Map();   // pieceId -> { plus }
    this.slots = {};          // slotId -> pieceId (armor / trinket slots only)
  }
  owns(id) { return this.owned.has(id); }
  plus(id) { return this.owned.get(id)?.plus ?? 0; }
  equippedIn(id) { return Object.keys(this.slots).find((k) => this.slots[k] === id) ?? null; }
  /** Pieces owned but not worn (they take pack space). */
  loose() { return [...this.owned.keys()].filter((id) => !this.equippedIn(id)); }
  /** Gains a piece. Returns { ok, reason? } (duplicate / bag_full / unknown). */
  gain(id) {
    if (!pieceDef(this.gear, id)) return { ok: false, reason: 'unknown' };
    if (this.owned.has(id)) return { ok: false, reason: 'duplicate' };
    if (this.loose().length >= this.capacity) return { ok: false, reason: 'bag_full' };
    this.owned.set(id, { plus: 0 });
    return { ok: true };
  }
  kindOf(id) { return pieceDef(this.gear, id)?.kind ?? null; }
  /** Equips an owned armor / trinket piece; a trinket worn in the other trinket slot moves over. */
  equip(slotId, id, unlocked = () => true) {
    if (!this.owned.has(id)) return { ok: false, reason: 'not_owned' };
    const r = slotAccepts(this.gear, slotId, id, { unlocked, kindOf: (x) => this.kindOf(x) });
    if (!r.ok) return r;
    const from = this.equippedIn(id);
    if (from && from !== slotId) delete this.slots[from];
    this.slots[slotId] = id;
    return { ok: true, moved: from && from !== slotId ? from : null };
  }
  unequip(slotId) {
    if (!this.slots[slotId]) return { ok: false, reason: 'empty' };
    if (this.loose().length >= this.capacity) return { ok: false, reason: 'bag_full' };
    delete this.slots[slotId];
    return { ok: true };
  }
  worn() { return Object.values(this.slots); }
  toJSON() { return { owned: Object.fromEntries(this.owned), slots: { ...this.slots } }; }
  load(s) {
    this.owned = new Map(Object.entries(s?.owned ?? {}).filter(([id]) => pieceDef(this.gear, id)).map(([id, v]) => [id, { plus: Math.max(0, Math.min(this.gear.upgrades.max_plus, v.plus | 0)) }]));
    this.slots = {};
    for (const [k, v] of Object.entries(s?.slots ?? {})) if (this.owned.has(v)) this.slots[k] = v;
  }
}

// ---------------------------------------------------------------- stats
/** Stats of one piece at upgrade level `plus` ({ statId: value }). */
export function pieceStats(gear, piece, plus = 0) {
  const up = gear.upgrades, mult = multiplicativeStats(gear), out = {};
  for (const [k, v] of Object.entries(piece.stats ?? {})) {
    let val = v;
    if (piece.kind === 'armor' && k === 'armor') val = Math.round(v * (1 + up.armor_stat_mult_per_plus * plus));
    if (piece.kind === 'trinket') {
      const s = 1 + up.trinket_effect_mult_per_plus * plus;
      val = mult.has(k) ? 1 + (v - 1) * s : v * s;
    }
    out[k] = val;
  }
  return out;
}

/** Weapon multipliers at upgrade level `plus` (weapon_damage_mult_per_plus / weapon_the_damage_mult_per_plus). */
export function weaponStats(gear, plus = 0) {
  const up = gear.upgrades;
  return { weapon_damage_mult: 1 + up.weapon_damage_mult_per_plus * plus, weapon_the_damage_mult: 1 + up.weapon_the_damage_mult_per_plus * plus };
}

/** Set progress for worn pieces: [{ set, count, max, bonuses: [{ count, active, effect, effect_text, name? }] }]. */
export function setProgress(gear, wornIds) {
  const worn = new Set(wornIds);
  return gear.sets.map((s) => {
    const count = s.pieces.filter((p) => worn.has(p)).length;
    return { set: s, count, max: s.pieces.length, bonuses: s.bonuses.map((b) => ({ ...b, active: count >= b.count })) };
  });
}

/**
 * Aggregated stats from worn gear + the current weapon's upgrade level + set bonuses.
 * base: { hp_max, the_max }. Returns the stat map (every stat_def id present) plus derived values.
 */
export function computeStats(gear, { worn = [], plusOf = () => 0, weaponPlus = 0, base = { hp_max: 0, the_max: 0 } } = {}) {
  const mult = multiplicativeStats(gear);
  const stats = {};
  for (const s of gear.stat_defs) stats[s.id] = mult.has(s.id) ? 1 : 0;
  const addStat = (k, v) => { if (!(k in stats)) stats[k] = mult.has(k) ? 1 : 0; stats[k] = mult.has(k) ? stats[k] * v : stats[k] + v; };
  for (const id of worn) {
    const p = pieceDef(gear, id); if (!p) continue;
    for (const [k, v] of Object.entries(pieceStats(gear, p, plusOf(id)))) addStat(k, v);
  }
  const w = weaponStats(gear, weaponPlus);
  for (const [k, v] of Object.entries(w)) addStat(k, v);
  const effects = [];
  const sets = setProgress(gear, worn);
  for (const sp of sets) for (const b of sp.bonuses) {
    if (!b.active) continue;
    if (b.effect.type === 'stat_add') addStat(b.effect.stat, b.effect.value);
    else effects.push({ set: sp.set.id, ...b.effect });
  }
  if ('mud_slow_resist' in stats) stats.mud_slow_resist = Math.min(1, stats.mud_slow_resist);
  const k = gear.armor_formula?.k ?? 150;
  const armor = stats.armor ?? 0;
  return {
    stats, effects, sets,
    armor, damageReduction: armor > 0 ? armor / (armor + k) : 0,
    hpMax: (base.hp_max ?? 0) + (stats.hp_max_add ?? 0),
    theMax: (base.the_max ?? 0) + (stats.the_max_add ?? 0),
  };
}

/**
 * Row-by-row comparison of two stat maps against stat_defs: [{ id, before, after, delta, better }]
 * better: true (improves), false (worse), null (unchanged). Only stats present in either side and
 * different from neutral, or changed, are listed.
 */
export function compareStats(gear, before, after) {
  const mult = multiplicativeStats(gear), rows = [];
  for (const s of gear.stat_defs) {
    const neutral = mult.has(s.id) ? 1 : 0;
    const a = before[s.id] ?? neutral, b = after[s.id] ?? neutral;
    if (Math.abs(a - neutral) < 1e-9 && Math.abs(b - neutral) < 1e-9) continue;
    const delta = b - a;
    const better = Math.abs(delta) < 1e-9 ? null : (delta > 0) === s.higher_is_better;
    rows.push({ id: s.id, def: s, before: a, after: b, delta, better });
  }
  return rows;
}

/** Display string for a stat value by its format (int, percent, percent_delta). */
export function formatStat(def, v) {
  if (def.format === 'percent') return `${Math.round(v * 100)}%`;
  if (def.format === 'percent_delta') { const d = Math.round((v - 1) * 100); return `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)}%`; }
  return String(Math.round(v));
}

// ---------------------------------------------------------------- upgrades
/** Upgrade cost entry for category ('weapon' | 'cloth' | 'bronze') to reach `toPlus`, or null. */
export function upgradeCost(gear, category, toPlus) {
  return gear.upgrades.costs[category]?.find((c) => c.to_plus === toPlus) ?? null;
}
