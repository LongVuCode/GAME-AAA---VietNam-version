// Demo 0.3 pack: equipment slot rules, set bonuses, upgrade costs (no negative counts), Thế võ ranks
// limited by max level and XP, XP sources and drops (logic/inventory.js, logic/progression.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA } from '../src/data.js';
import { Inventory } from '../src/logic/crafting.js';
import { Bag, computeStats, compareStats, pieceStats, STACK_LIMITS, formatStat } from '../src/logic/inventory.js';
import { Progress } from '../src/logic/progression.js';

const gear = DATA.items.gear_0_3;
const mk = (ctx = {}) => {
  const store = new Inventory();
  const flags = new Set(ctx.flags ?? []);
  const p = new Progress(DATA, { store, weapons: () => ctx.weapons ?? ['wp_giao_dong'], isUnlocked: (k) => flags.has(k) || (k === 'character_weapon_slots_2' && (ctx.weapons ?? []).length > 1), ...ctx.extra });
  return { p, store, flags };
};

test('starting gear: tunic + leg wraps worn, starting Thế võ at rank 1, XP 0', () => {
  const { p } = mk();
  assert.equal(p.equipment.slots.body, 'ar_ao_gai_cham');
  assert.equal(p.equipment.slots.legs, 'ar_quan_chan_vo_cay');
  assert.equal(p.getSkillLevel('sk_giao_cam_sao_vot'), 1);
  assert.equal(p.getSkillLevel('sk_giao_quet_song'), 0);
  assert.equal(p.xp, 0);
  const s = p.getStats();
  assert.equal(s.armor, 22);
  assert.equal(s.hpMax, DATA.combat.player.hp_max + 20);
  assert.equal(s.theMax, DATA.combat.player.the_max + 10, '2-piece set bonus +10 Thế');
});

test('equip respects slot kind and slot id; locked slots refuse', () => {
  const { p, flags } = mk();
  p.addItem('ar_khan_gai');
  assert.equal(p.equipment.slots.head, 'ar_khan_gai', 'a new piece goes into its empty slot');
  assert.equal(p.unequip('head').ok, true);
  assert.deepEqual(p.equip('body', 'ar_khan_gai'), { ok: false, reason: 'wrong_slot' });
  assert.deepEqual(p.equip('trinket_1', 'ar_khan_gai'), { ok: false, reason: 'wrong_kind' });
  assert.equal(p.equip('head', 'ar_khan_gai').ok, true);
  assert.deepEqual(p.equip('head', 'ar_vong_tay_ong'), { ok: false, reason: 'not_owned' });
  p.addItem('tr_chuong_dong_nho'); p.addItem('tr_chuoi_hat_dat');
  assert.equal(p.equipment.slots.trinket_1, 'tr_chuong_dong_nho');
  assert.equal(p.equipment.slots.trinket_2, undefined, 'trinket 2 is locked until the villager is saved');
  assert.deepEqual(p.equip('trinket_2', 'tr_chuoi_hat_dat'), { ok: false, reason: 'locked' });
  flags.add('flag_villager_saved');
  assert.equal(p.equip('trinket_2', 'tr_chuoi_hat_dat').ok, true);
  // Moving a trinket to the other slot frees the first one.
  assert.equal(p.equip('trinket_2', 'tr_chuong_dong_nho').ok, true);
  assert.equal(p.equipment.slots.trinket_2, 'tr_chuong_dong_nho');
  assert.equal(p.equipment.slots.trinket_1, undefined);
  assert.equal(p.equip('weapon_1', 'wp_giao_dong').ok, false, 'weapons are tied to their lineage slot');
  assert.equal(p.slots().find((s) => s.def.id === 'weapon_2').unlocked, false);
});

test('set bonus: 2 pieces +10 Thế, 4 pieces "Nhịp chèo" cooldown refund effect', () => {
  const { p } = mk();
  let s = p.getStats();
  assert.equal(s.sets[0].count, 2);
  assert.equal(s.effects.length, 0);
  p.addItem('ar_khan_gai'); p.addItem('ar_vong_tay_ong');
  s = p.getStats();
  assert.equal(s.sets[0].count, 4);
  assert.equal(s.armor, 36);
  assert.ok(Math.abs(s.damageReduction - 36 / 186) < 1e-9, 'armor / (armor + 150) ≈ 19%');
  assert.equal(s.effects.length, 1);
  assert.equal(s.effects[0].type, 'skill_cooldown_refund_on');
  assert.equal(s.effects[0].value_s, 1.5);
  assert.ok(Math.abs(s.stats.guard_the_cost_mult - 0.9) < 1e-9);
  p.unequip('body');
  s = p.getStats();
  assert.equal(s.sets[0].count, 3);
  assert.equal(s.effects.length, 0);
  assert.equal(s.theMax, DATA.combat.player.the_max + 5 + 10);
});

test('compare: putting on the head wrap shows armor and Thế going up, stance cost multipliers read lower=better', () => {
  const { p } = mk();
  p.addItem('ar_khan_gai'); p.unequip('head');
  const rows = compareStats(gear, p.getStats().stats, p.previewStats('head', 'ar_khan_gai').stats);
  const armor = rows.find((r) => r.id === 'armor');
  assert.equal(armor.delta, 6); assert.equal(armor.better, true);
  assert.equal(rows.find((r) => r.id === 'the_max_add').better, true);
  p.addItem('tr_chuoi_hat_dat');
  const r2 = compareStats(gear, p.previewStats('trinket_1', null).stats, p.getStats().stats).find((r) => r.id === 'the_regen_delay_mult');
  assert.equal(r2.better, true, 'a 0.8x recovery delay is better (higher_is_better=false)');
  assert.equal(formatStat(r2.def, 0.8), '−20%');
});

test('upgrade: spends exactly the listed materials, refuses without them or off-station, never goes negative', () => {
  const { p, store } = mk();
  const id = 'ar_ao_gai_cham';
  assert.equal(p.upgradeInfo(id).reason, 'materials');
  store.add('mat_soi_gai', 2);
  assert.equal(p.upgradeInfo(id, { atStation: false }).reason, 'station');
  const before = pieceStats(gear, gear.pieces.find((x) => x.id === id), 0).armor;
  const r = p.upgrade(id);
  assert.equal(r.ok, true); assert.equal(p.plusOf(id), 1);
  assert.equal(store.count('mat_soi_gai'), 0);
  assert.equal(p.getStats().armor, 22 - before + Math.round(before * 1.15));
  // +2 needs 3 sợi gai + 1 dây mây: with only 2 sợi gai nothing is consumed.
  store.add('mat_soi_gai', 2); store.add('mat_day_may', 1);
  assert.equal(p.upgrade(id).ok, false);
  assert.equal(store.count('mat_soi_gai'), 2); assert.equal(store.count('mat_day_may'), 1);
  store.add('mat_soi_gai', 1);
  assert.equal(p.upgrade(id).ok, true);
  assert.equal(store.count('mat_soi_gai'), 0); assert.equal(store.count('mat_day_may'), 0);
  store.add('mat_soi_gai', 5); store.add('mat_day_may', 1);
  assert.equal(p.upgrade(id).ok, true);
  assert.equal(p.plusOf(id), 3);
  store.add('mat_soi_gai', 9); store.add('mat_day_may', 9);
  assert.equal(p.upgradeInfo(id).reason, 'max');
  assert.equal(p.upgrade(id).ok, false);
  for (const v of Object.values(store.toJSON())) assert.ok(v >= 0);
});

test('weapon and bronze upgrades use their cost tables; weapon +1 raises damage multipliers', () => {
  const { p, store } = mk();
  store.add('mat_thiec_song', 2); store.add('mat_day_may', 1);
  assert.equal(p.upgrade('wp_giao_dong').ok, true);
  assert.equal(store.count('mat_thiec_song'), 0); assert.equal(store.count('mat_day_may'), 0);
  const s = p.getStats('wp_giao_dong').stats;
  assert.ok(Math.abs(s.weapon_damage_mult - 1.08) < 1e-9 && Math.abs(s.weapon_the_damage_mult - 1.06) < 1e-9);
  p.addItem('tr_chuong_dong_nho');
  store.add('mat_thiec_song', 1); store.add('mat_day_may', 1);
  assert.equal(p.upgrade('tr_chuong_dong_nho').ok, true);
  assert.ok(Math.abs(p.getStats().stats.drum_gain_mult - 1.125) < 1e-9, 'trinket +25% effect strength per rank');
});

test('stacks: limits per category, atomic removal, no negative counts', () => {
  const store = new Inventory();
  const bag = new Bag(DATA.items, store);
  assert.deepEqual(bag.add('it_cu_sung', STACK_LIMITS.consumable + 5), { added: STACK_LIMITS.consumable, overflow: 5 });
  assert.deepEqual(bag.add('unknown_item', 2), { added: 0, overflow: 2 });
  bag.add('mat_day_may', 3);
  assert.equal(bag.removeAll([{ item: 'mat_day_may', count: 2 }, { item: 'mat_soi_gai', count: 1 }]), false);
  assert.equal(bag.count('mat_day_may'), 3);
  assert.equal(bag.removeAll([{ item: 'mat_day_may', count: -1 }]), false);
  assert.equal(bag.removeAll([{ item: 'mat_day_may', count: 3 }]), true);
  assert.equal(bag.count('mat_day_may'), 0);
  assert.equal(bag.list('consumable').length, 1);
});

test('Thế võ: unlock 60 KN, rank costs 120 / 220, max rank 3, XP never negative; respec refunds', () => {
  const { p } = mk();
  const q = 'sk_giao_quet_song';
  assert.deepEqual(p.canRankUp(q), { ok: false, reason: 'xp', cost: 60 });
  p.addXp(59);
  assert.equal(p.rankUp(q).ok, false); assert.equal(p.xp, 59);
  p.addXp(1);
  assert.equal(p.rankUp(q).level, 1); assert.equal(p.xp, 0);
  p.addXp(1000);
  assert.equal(p.rankUp(q).cost, 120); assert.equal(p.rankUp(q).cost, 220);
  assert.equal(p.getSkillLevel(q), 3);
  assert.deepEqual(p.rankUp(q), { ok: false, reason: 'max' });
  assert.equal(p.xp, 1000 - 340);
  assert.equal(p.getSkillLevel('sk_riu_bo_don_cay'), 1);
  assert.equal(p.canRankUp('sk_riu_bo_don_cay').reason, 'weapon', 'axe arts need the axe (Bương)');
  const info = p.getSkillInfo(q);
  assert.equal(info.cooldownS, 11); assert.equal(info.nextCost, null);
  assert.equal(p.respec(), 400);
  assert.equal(p.getSkillLevel(q), 0); assert.equal(p.xp, 1060);
});

test('XP sources and drops come from data; onChange fires', () => {
  const { p } = mk();
  const evs = [];
  const off = p.onChange((e) => evs.push(e.type));
  assert.equal(p.awardXp('enemy', 'en_cua_cang_bun'), 15);
  assert.equal(p.awardXp('enemy', 'boss_lon_loi_dam'), 200);
  assert.equal(p.awardXp('discovery_point'), 15);
  assert.equal(p.awardXp('environment_secret'), 25);
  assert.equal(p.awardXp('secret_chain_end', 'sec_lo_bo_hoang'), 60);
  assert.equal(p.awardXp('non_combat_success', 'nc_nguoi_bi_me'), 50);
  assert.equal(p.awardXp('enemy', 'nobody'), 0);
  assert.equal(p.xp, 365);
  const ub = DATA.enemies.enemies.find((e) => e.id === 'en_u_bun');
  assert.deepEqual(p.rollDrops(ub, () => 0.6), [{ item: 'mat_thiec_song', count: 2 }]);
  assert.equal(p.rollDrops(ub, () => 0).length, 2);
  p.addItem('mat_thiec_song', 2);
  assert.equal(p.count('mat_thiec_song'), 2);
  off();
  p.addXp(1);
  assert.ok(evs.includes('xp') && evs.includes('item'));
  assert.equal(evs.filter((t) => t === 'xp').length, 6);
});

test('save / load round trip clamps bad values', () => {
  const { p } = mk();
  p.addXp(300); p.rankUp('sk_giao_quet_song'); p.addItem('ar_khan_gai');
  const j = JSON.parse(JSON.stringify(p.toJSON()));
  const { p: p2 } = mk();
  assert.equal(p2.load(j), true);
  assert.equal(p2.xp, 240); assert.equal(p2.getSkillLevel('sk_giao_quet_song'), 1); assert.equal(p2.equipment.slots.head, 'ar_khan_gai');
  j.skills.sk_giao_quet_song = 99; j.xp = -5;
  p2.load(j);
  assert.equal(p2.getSkillLevel('sk_giao_quet_song'), 3); assert.equal(p2.xp, 0);
  assert.equal(computeStats(gear, {}).armor, 0);
});
