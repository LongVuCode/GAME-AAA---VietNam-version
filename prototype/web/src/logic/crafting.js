// crafting.js - inventory + recipes (items.json). Mirrors ArpgCore FInventory::HasAll/RemoveAll
// (atomic). Upgrade recipes list their target item as an input: it must be owned, not consumed.
export class Inventory {
  constructor() { this.counts = new Map(); }
  add(id, n = 1) { this.counts.set(id, (this.counts.get(id) ?? 0) + n); }
  count(id) { return this.counts.get(id) ?? 0; }
  hasAll(costs) { return costs.every((c) => this.count(c.item) >= c.count); }
  removeAll(costs) {
    if (!this.hasAll(costs)) return false;
    for (const c of costs) this.counts.set(c.item, this.count(c.item) - c.count);
    return true;
  }
  toJSON() { return Object.fromEntries(this.counts); }
}

/** Inputs actually consumed by a recipe (upgrade target excluded). */
export function consumedInputs(recipe) {
  return recipe.type === 'upgrade' ? recipe.inputs.filter((i) => i.item !== recipe.target) : recipe.inputs;
}

/** Missing inputs [{item, need, have}] for a recipe; empty = craftable. owned: { [itemId]: {level} }. */
export function missingFor(recipe, inv, owned = {}) {
  const missing = [];
  if (recipe.type === 'upgrade') {
    const o = owned[recipe.target];
    if (!o) missing.push({ item: recipe.target, need: 1, have: 0 });
    else if (o.level >= recipe.to_level) missing.push({ item: recipe.target, need: recipe.to_level, have: o.level });
  }
  for (const c of consumedInputs(recipe)) {
    if (inv.count(c.item) < c.count) missing.push({ item: c.item, need: c.count, have: inv.count(c.item) });
  }
  return missing;
}

/**
 * Crafts. Returns { ok, crafted?: {item, level} }. Bảo khí go to `owned` (unique, with level);
 * other outputs go to the inventory.
 */
export function craft(recipe, inv, owned, itemsData, generation = 1) {
  if (missingFor(recipe, inv, owned).length) return { ok: false };
  if (!inv.removeAll(consumedInputs(recipe))) return { ok: false };
  const out = itemsData.items.find((i) => i.id === recipe.output.item);
  if (recipe.type === 'upgrade') {
    owned[recipe.target].level = recipe.to_level;
    return { ok: true, crafted: { item: recipe.target, level: recipe.to_level } };
  }
  if (out.category === 'bao_khi') {
    owned[out.id] = { level: 1, generation };
    return { ok: true, crafted: { item: out.id, level: 1 } };
  }
  inv.add(out.id, recipe.output.count);
  return { ok: true, crafted: { item: out.id, level: 0 } };
}

/** Effect of an owned Bảo khí at its level: { applies_to, value }. */
export function baoKhiEffect(itemDef, level) {
  if (!itemDef?.effect) return null;
  const lv = itemDef.upgrade_levels?.find((u) => u.level === level);
  return { applies_to: itemDef.effect.applies_to, type: itemDef.effect.type, value: lv?.effect_value ?? itemDef.effect.value };
}
