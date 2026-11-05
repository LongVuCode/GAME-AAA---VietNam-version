// progression.js - Demo 0.3 progression state behind game.progress (DEMO_0_3_DESIGN §3.3-3.4):
// Kinh nghiệm (XP, skills.json currency), Thế võ ranks (2 per weapon, 3 ranks, unlock / rank-up with
// XP, respec at a resting fire), gear ownership / equipment / upgrades (logic/inventory.js), item
// grants with stack limits, enemy drops, and the aggregated stats the gameplay layer reads.
// Pure: no DOM, no three.js (node --test).
//
// Contract used by the gameplay layer (game.progress):
//   progress.getStats(weaponId?) -> { hpMax, theMax, armor, damageReduction, stats{...}, effects[], sets[] }
//   progress.getSkillLevel(skillId) -> 0 (locked) .. 3;  progress.getSkillInfo(skillId)
//   progress.addItem(id, n) -> { kind: 'gear' | 'stack', added, overflow?, reason? }
//   progress.addXp(n, source?) -> new XP total;  progress.awardXp(kind, ref) -> xp granted
//   progress.onChange(fn) -> unsubscribe; fn({ type, ... }) on every change
import { Bag, Equipment, computeStats, pieceDef, slotAccepts, upgradeCost, weaponStats, setProgress } from './inventory.js';
import { Inventory } from './crafting.js';

const ARMOR_SLOTS = ['head', 'body', 'hands', 'legs'];

/**
 * data: { items, skills, weapons, combat, enemies }.
 * ctx (all optional; defaults keep everything in this object, used by unit tests):
 *   store            counts store (crafting Inventory) or a getter () => store
 *   weapons()        owned weapon ids in slot order (lineage generation)
 *   currentWeapon()  weapon id in hand
 *   isUnlocked(key)  slot unlock keys of gear_0_3.slots ('start', 'character_weapon_slots_2', flags)
 *   baoKhi           { owned(): ids, get(): id | null, set(id | null) }
 */
export class Progress {
  constructor(data, ctx = {}) {
    this.data = data; this.gear = data.items.gear_0_3; this.sk = data.skills;
    const own = new Inventory();
    this._store = typeof ctx.store === 'function' ? ctx.store : () => ctx.store ?? own;
    this.ctx = ctx;
    this._bk = null;
    this.listeners = new Set();
    this.reset();
  }

  // ---------------------------------------------------------------- lifecycle / events
  /** New game: starting gear worn, XP 0, start-unlocked Thế võ at rank 1. */
  reset() {
    this.equipment = new Equipment(this.gear);
    this.weaponPlus = {};
    this.xp = 0; this.xpSpent = 0; this.xpTotal = 0;
    this.skillLevels = {};
    for (const s of this.sk.skills) this.skillLevels[s.id] = s.unlock.kind === 'start' ? 1 : 0;
    for (const p of this.gear.pieces) {
      if (p.source?.kind !== 'starting') continue;
      this.equipment.gain(p.id); this.equipment.equip(p.slot, p.id);
    }
    this._emit({ type: 'reset' });
  }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit(ev) { for (const fn of this.listeners) { try { fn(ev); } catch (e) { console.error(e); } } }

  get bag() { return new Bag(this.data.items, this._store()); }
  weapons() { return this.ctx.weapons?.() ?? this.data.weapons.weapons.filter((w) => w.slot === 1).map((w) => w.id); }
  currentWeapon() { return this.ctx.currentWeapon?.() ?? this.weapons()[0] ?? null; }
  isUnlocked(key) { return key === 'start' || !!this.ctx.isUnlocked?.(key); }
  weaponDef(id) { return this.data.weapons.weapons.find((w) => w.id === id) ?? null; }

  // ---------------------------------------------------------------- items
  /** Kind of any item id: 'armor' | 'trinket' (gear), 'weapon', 'bao_khi', 'consumable', 'material' or null. */
  kindOf(id) {
    const p = pieceDef(this.gear, id); if (p) return p.kind;
    if (this.weaponDef(id)) return 'weapon';
    return this.data.items.items.find((i) => i.id === id)?.category ?? null;
  }
  /** Grants an item: gear pieces become owned (unique), stackables respect the stack limit. */
  addItem(id, n = 1) {
    if (pieceDef(this.gear, id)) {
      const r = this.equipment.gain(id);
      if (r.ok) {
        // A new piece goes straight into an empty slot that accepts it (no menu trip needed).
        const free = this.gear.slots.find((s) => !this.equipment.slots[s.id] && slotAccepts(this.gear, s.id, id, { unlocked: (k) => this.isUnlocked(k), kindOf: (x) => this.kindOf(x) }).ok);
        if (free) this.equipment.equip(free.id, id, (k) => this.isUnlocked(k));
        this._emit({ type: 'item', id, n: 1, gear: true, autoEquipped: free?.id ?? null });
      }
      return { kind: 'gear', added: r.ok ? 1 : 0, reason: r.reason };
    }
    const r = this.bag.add(id, n);
    if (r.added > 0) this._emit({ type: 'item', id, n: r.added });
    return { kind: 'stack', ...r };
  }
  count(id) { return pieceDef(this.gear, id) ? (this.equipment.owns(id) ? 1 : 0) : this._store().count(id); }

  // ---------------------------------------------------------------- equipment
  /** Every slot: { def, unlocked, item (id | null), plus }. Weapon slots show the lineage weapons. */
  slots() {
    const ws = this.weapons();
    return this.gear.slots.map((s) => {
      const unlocked = this.isUnlocked(s.unlock);
      let item = null;
      if (s.accepts === 'weapon') item = ws.find((w) => `weapon_${this.weaponDef(w)?.slot}` === s.id) ?? null;
      else if (s.accepts === 'bao_khi') item = this._baoKhiGet();
      else item = this.equipment.slots[s.id] ?? null;
      return { def: s, unlocked, item: unlocked ? item : null, plus: item ? this.plusOf(item) : 0 };
    });
  }
  /** Items that could go in a slot (owned, accepted). */
  candidates(slotId) {
    const s = this.gear.slots.find((x) => x.id === slotId); if (!s) return [];
    if (s.accepts === 'weapon') return this.weapons().filter((w) => `weapon_${this.weaponDef(w)?.slot}` === slotId);
    if (s.accepts === 'bao_khi') return this._baoKhiOwned();
    return [...this.equipment.owned.keys()].filter((id) => slotAccepts(this.gear, slotId, id, { kindOf: (x) => this.kindOf(x) }).ok);
  }
  canEquip(slotId, id) {
    const s = this.gear.slots.find((x) => x.id === slotId);
    if (s?.accepts === 'bao_khi') return this._baoKhiOwned().includes(id) ? (this.isUnlocked(s.unlock) ? { ok: true } : { ok: false, reason: 'locked' }) : { ok: false, reason: 'not_owned' };
    if (s?.accepts === 'weapon') return { ok: false, reason: 'fixed' }; // weapons are tied to their slot by lineage
    if (!this.equipment.owns(id)) return { ok: false, reason: 'not_owned' };
    return slotAccepts(this.gear, slotId, id, { unlocked: (k) => this.isUnlocked(k), kindOf: (x) => this.kindOf(x) });
  }
  equip(slotId, id) {
    const s = this.gear.slots.find((x) => x.id === slotId);
    const c = this.canEquip(slotId, id); if (!c.ok) return c;
    if (s.accepts === 'bao_khi') { this._baoKhiSet(id); this._emit({ type: 'equip', slot: slotId, id }); return { ok: true }; }
    const r = this.equipment.equip(slotId, id, (k) => this.isUnlocked(k));
    if (r.ok) this._emit({ type: 'equip', slot: slotId, id });
    return r;
  }
  unequip(slotId) {
    const s = this.gear.slots.find((x) => x.id === slotId);
    if (s?.accepts === 'weapon') return { ok: false, reason: 'fixed' };
    if (s?.accepts === 'bao_khi') { if (!this._baoKhiGet()) return { ok: false, reason: 'empty' }; this._baoKhiSet(null); this._emit({ type: 'unequip', slot: slotId }); return { ok: true }; }
    const r = this.equipment.unequip(slotId);
    if (r.ok) this._emit({ type: 'unequip', slot: slotId });
    return r;
  }
  _baoKhiOwned() { return this.ctx.baoKhi?.owned() ?? []; }
  _baoKhiGet() { return this.ctx.baoKhi ? this.ctx.baoKhi.get() : this._bk; }
  _baoKhiSet(id) { if (this.ctx.baoKhi) this.ctx.baoKhi.set(id); else this._bk = id; }

  // ---------------------------------------------------------------- stats
  plusOf(id) { return this.kindOf(id) === 'weapon' ? (this.weaponPlus[id] ?? 0) : this.equipment.plus(id); }
  /** Aggregated stats (worn gear + weapon upgrade + set bonuses). */
  getStats(weaponId = this.currentWeapon(), worn = this.equipment.worn()) {
    const p = this.data.combat.player;
    return computeStats(this.gear, { worn, plusOf: (id) => this.equipment.plus(id), weaponPlus: weaponId ? (this.weaponPlus[weaponId] ?? 0) : 0, base: { hp_max: p.hp_max, the_max: p.the_max } });
  }
  /** Stats if `id` were worn in `slotId` (for the compare arrows). */
  previewStats(slotId, id) {
    const worn = { ...this.equipment.slots };
    if (id == null) delete worn[slotId];
    else { for (const k of Object.keys(worn)) if (worn[k] === id) delete worn[k]; worn[slotId] = id; }
    return this.getStats(this.currentWeapon(), Object.values(worn));
  }
  setProgress() { return setProgress(this.gear, this.equipment.worn()); }

  // ---------------------------------------------------------------- upgrades
  /** Category of an upgradeable item ('weapon' | 'cloth' | 'bronze') or null. */
  upgradeCategory(id) {
    const k = this.kindOf(id);
    if (k === 'weapon') return 'weapon';
    return pieceDef(this.gear, id)?.upgrade_category ?? null;
  }
  /** { ok, reason?, toPlus, inputs[], have{} }; reasons: not_owned, not_upgradeable, max, station, materials. */
  upgradeInfo(id, { atStation = true } = {}) {
    const cat = this.upgradeCategory(id), max = this.gear.upgrades.max_plus;
    const owned = this.kindOf(id) === 'weapon' ? this.weapons().includes(id) : this.equipment.owns(id);
    const plus = this.plusOf(id), toPlus = plus + 1;
    if (!owned) return { ok: false, reason: 'not_owned', plus, toPlus, inputs: [] };
    if (!cat) return { ok: false, reason: 'not_upgradeable', plus, toPlus, inputs: [] };
    if (plus >= max) return { ok: false, reason: 'max', plus, toPlus: plus, inputs: [] };
    const cost = upgradeCost(this.gear, cat, toPlus);
    const inputs = cost?.inputs ?? [];
    const have = Object.fromEntries(inputs.map((c) => [c.item, this._store().count(c.item)]));
    if (!atStation) return { ok: false, reason: 'station', plus, toPlus, inputs, have };
    if (!this.bag.hasAll(inputs)) return { ok: false, reason: 'materials', plus, toPlus, inputs, have };
    return { ok: true, plus, toPlus, inputs, have };
  }
  /** Spends the materials (atomic) and raises the item by +1. */
  upgrade(id, opts = {}) {
    const info = this.upgradeInfo(id, opts);
    if (!info.ok) return info;
    if (!this.bag.removeAll(info.inputs)) return { ...info, ok: false, reason: 'materials' };
    if (this.kindOf(id) === 'weapon') this.weaponPlus[id] = info.toPlus;
    else this.equipment.owned.get(id).plus = info.toPlus;
    this._emit({ type: 'upgrade', id, plus: info.toPlus });
    return { ...info, ok: true, plus: info.toPlus };
  }
  weaponStatsOf(id) { return weaponStats(this.gear, this.weaponPlus[id] ?? 0); }

  // ---------------------------------------------------------------- XP and Thế võ
  addXp(n, source = null) {
    const v = Math.max(0, Math.round(n));
    if (!v) return this.xp;
    this.xp += v; this.xpTotal += v;
    this._emit({ type: 'xp', n: v, total: this.xp, source });
    return this.xp;
  }
  /** XP for a source (skills.json xp_sources): kind enemy (ref = enemy id), discovery_point,
   *  environment_secret, secret_chain_end (ref = chain), non_combat_success (ref). Returns XP granted. */
  awardXp(kind, ref = null) {
    const src = this.sk.xp_sources.find((s) => (kind === 'enemy' ? s.enemy === ref
      : s.kind === kind && (!s.chain || s.chain === ref) && (!s.ref || s.ref === ref)));
    if (!src) return 0;
    this.addXp(src.xp, src.id);
    return src.xp;
  }
  skillDef(id) { return this.sk.skills.find((s) => s.id === id) ?? null; }
  /** Thế võ of a weapon in slot order. */
  skillsFor(weaponId) { return this.sk.skills.filter((s) => s.weapon === weaponId).sort((a, b) => a.slot - b.slot); }
  getSkillLevel(id) { return this.skillLevels[id] ?? 0; }
  /** { def, level, maxLevel, cooldownS (× gear skill_cooldown_mult), effect, nextCost } */
  getSkillInfo(id) {
    const def = this.skillDef(id); if (!def) return null;
    const level = this.getSkillLevel(id), max = this.sk.rules.max_level;
    const lv = def.levels[Math.max(0, level - 1)];
    const mult = this.getStats().stats.skill_cooldown_mult ?? 1;
    return { def, level, maxLevel: max, cooldownS: lv.cooldown_s * mult, baseCooldownS: lv.cooldown_s, effect: level > 0 ? lv.effect : null, nextCost: this.nextSkillCost(id) };
  }
  /** XP to unlock (rank 0 -> 1) or rank up; null at max. */
  nextSkillCost(id) {
    const def = this.skillDef(id); if (!def) return null;
    const level = this.getSkillLevel(id);
    if (level >= this.sk.rules.max_level) return null;
    if (level === 0) return def.unlock.kind === 'xp' ? def.unlock.cost_xp : 0;
    return def.levels[level].cost_xp;
  }
  /** { ok, reason? } reasons: unknown, max, weapon (weapon not owned), xp. */
  canRankUp(id) {
    const def = this.skillDef(id); if (!def) return { ok: false, reason: 'unknown' };
    if (this.getSkillLevel(id) >= this.sk.rules.max_level) return { ok: false, reason: 'max' };
    if (!this.weapons().includes(def.weapon)) return { ok: false, reason: 'weapon' };
    const cost = this.nextSkillCost(id);
    if (this.xp < cost) return { ok: false, reason: 'xp', cost };
    return { ok: true, cost };
  }
  /** Unlocks (0 -> 1) or ranks up one Thế võ, paying XP. */
  rankUp(id) {
    const c = this.canRankUp(id); if (!c.ok) return c;
    this.xp -= c.cost; this.xpSpent += c.cost;
    this.skillLevels[id] += 1;
    this._emit({ type: 'skill', id, level: this.skillLevels[id] });
    return { ok: true, level: this.skillLevels[id], cost: c.cost };
  }
  /** Relearn (rules.respec, at a resting fire): ranks back to their start, spent XP refunded × refund_ratio. */
  respec() {
    const refund = Math.floor(this.xpSpent * (this.sk.rules.respec?.refund_ratio ?? 1));
    for (const s of this.sk.skills) this.skillLevels[s.id] = s.unlock.kind === 'start' ? 1 : 0;
    this.xp += refund; this.xpSpent = 0;
    this._emit({ type: 'respec', refund });
    return refund;
  }

  // ---------------------------------------------------------------- drops
  /** Rolls an enemy's drops (enemies.json drops[].chance) with rng() in [0,1); returns [{ item, count }]. */
  rollDrops(enemyDef, rng = Math.random) {
    return (enemyDef?.drops ?? []).filter((d) => rng() < d.chance).map((d) => ({ item: d.item, count: d.count }));
  }

  // ---------------------------------------------------------------- persistence (optional)
  toJSON() {
    return { v: 1, xp: this.xp, xpSpent: this.xpSpent, xpTotal: this.xpTotal, skills: { ...this.skillLevels }, weaponPlus: { ...this.weaponPlus }, equipment: this.equipment.toJSON() };
  }
  load(s) {
    if (!s || s.v !== 1) return false;
    this.xp = Math.max(0, s.xp | 0); this.xpSpent = Math.max(0, s.xpSpent | 0); this.xpTotal = Math.max(0, s.xpTotal | 0);
    const max = this.sk.rules.max_level;
    for (const k of Object.keys(this.skillLevels)) this.skillLevels[k] = Math.max(0, Math.min(max, (s.skills?.[k] ?? this.skillLevels[k]) | 0));
    this.weaponPlus = Object.fromEntries(Object.entries(s.weaponPlus ?? {}).map(([k, v]) => [k, Math.max(0, Math.min(this.gear.upgrades.max_plus, v | 0))]));
    this.equipment.load(s.equipment);
    this._emit({ type: 'load' });
    return true;
  }
}

export { ARMOR_SLOTS };
