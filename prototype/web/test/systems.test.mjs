import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA } from '../src/data.js';
import { SecretChain, checkNoSoftlock } from '../src/logic/secrets.js';
import { Inventory, craft, missingFor, baoKhiEffect, consumedInputs } from '../src/logic/crafting.js';
import { SkillTree, newGeneration, handoff, handoffWarnings, canHandoff, skillPointsFor, forbiddenHits, eraTags } from '../src/logic/lineage.js';
import { pickLockTarget, shouldBreakLock, softAimTarget } from '../src/logic/lockon.js';
import { createI18n } from '../src/logic/i18n.js';

const L = DATA.lineage;
const chain = DATA.secrets.chains[0];

test('secret chain: alternate trap sources, kiln, end reward; clues never consumed', () => {
  const s = new SecretChain(chain); s.start();
  assert.deepEqual(s.available().sort(), ['sn_trap_a', 'sn_trap_b']);
  assert.equal(s.isAvailable('sn_scrap'), false);
  assert.ok(s.complete('sn_trap_b').ok);
  assert.ok(s.isAvailable('sn_trap_a'), 'other source still available, harmless');
  assert.ok(s.complete('sn_scrap').ok);
  assert.ok(s.complete('sn_kiln').ok);
  const r = s.complete('sn_end');
  assert.ok(r.ok && s.finished);
  assert.deepEqual(r.reward.items, [{ item: 'mat_sap_ong_cu', count: 1 }]);
  assert.deepEqual(r.reward.codex_unlock_extra, ['cx_khoen']);
  assert.equal(s.clues.size, 3, 'all clues kept');
  assert.equal(s.complete('sn_end').ok, false, 'cannot repeat');
});

test('secret hints: 3 tiers, player-initiated, follow the next useful node, can be disabled', () => {
  const s = new SecretChain(chain); s.start();
  const h1 = s.hint(1), h3 = s.hint(3);
  assert.ok(h1.vi && h1.en && h3.vi);
  assert.notEqual(h1.vi, h3.vi);
  s.complete('sn_trap_a');
  assert.equal(s.hint(2).vi, chain.nodes.find((n) => n.id === 'sn_scrap').hints[1].text.vi, 'skips the redundant trap B');
  s.hintsEnabled = false; assert.equal(s.hint(1), null);
});

test('secret chain has no softlock (exhaustive, mirror of validator/ArpgCore check)', () => {
  const r = checkNoSoftlock(chain);
  assert.ok(r.ok, JSON.stringify(r)); assert.ok(r.states > 1);
});

test('crafting Nanh Đầm: shed tusk + village bronze + 2 rattan, upgrade with old beeswax', () => {
  const inv = new Inventory(); const owned = {};
  const rcp = DATA.items.recipes.find((r) => r.id === 'rcp_nanh_dam');
  const up = DATA.items.recipes.find((r) => r.id === 'rcp_nanh_dam_up');
  assert.equal(missingFor(rcp, inv, owned).length, 3);
  inv.add('mat_nanh_rung'); inv.add('mat_dong_lo_lang'); inv.add('mat_day_may', 3);
  assert.equal(craft(up, inv, owned, DATA.items).ok, false, 'upgrade needs the item');
  const r = craft(rcp, inv, owned, DATA.items);
  assert.ok(r.ok); assert.equal(owned.bk_nanh_dam.level, 1);
  assert.equal(inv.count('mat_day_may'), 1); assert.equal(inv.count('mat_nanh_rung'), 0);
  const def = DATA.items.items.find((i) => i.id === 'bk_nanh_dam');
  assert.equal(baoKhiEffect(def, 1).value, 0.15);
  assert.equal(craft(up, inv, owned, DATA.items).ok, false, 'needs beeswax');
  inv.add('mat_sap_ong_cu');
  assert.deepEqual(consumedInputs(up).map((i) => i.item).sort(), ['mat_day_may', 'mat_sap_ong_cu']);
  assert.ok(craft(up, inv, owned, DATA.items).ok);
  assert.equal(owned.bk_nanh_dam.level, 2); assert.equal(baoKhiEffect(def, 2).value, 0.2);
  assert.equal(craft(up, inv, owned, DATA.items).ok, false, 'max level');
});

test('no item, recipe input or drop comes from the khoen (V9)', () => {
  for (const it of DATA.items.items) assert.ok(!/khoen/i.test(it.id) && it.source.kind !== 'khoen', it.id);
  for (const r of DATA.items.recipes) for (const i of r.inputs) assert.ok(!/khoen/i.test(i.item));
});

test('skill tree: costs, prereqs, locked Vảy branch, modifiers', () => {
  const st = new SkillTree(L.skill_tree, 2);
  assert.equal(st.canBuy('sk_vo_danh_the'), false, 'prereq');
  assert.ok(st.buy('sk_vo_gong_suc')); assert.equal(st.canBuy('sk_vo_danh_the'), false, 'cost 2, 1 point left');
  st.points += 1; assert.ok(st.buy('sk_vo_danh_the'));
  const m = st.modifiers();
  assert.equal(m.heavyMaxLevel, 2); assert.equal(m.theMult, 0.1);
  const buyWithPrereqs = (t, id) => { for (const p of t.node(id).prereqs) buyWithPrereqs(t, p); t.buy(id); };
  for (const n of L.skill_tree.nodes) { const t = new SkillTree(L.skill_tree, 99); buyWithPrereqs(t, n.id); assert.ok(t.has(n.id), n.id); t.modifiers(); }
  assert.equal(skillPointsFor(L, 'nc_nguoi_bi_me'), 1); assert.equal(skillPointsFor(L, 'flag_boss_lon_loi_freed'), 2);
});

test('handoff Cói → Bương: skills 100%, +1 point, slot 2 axe, house move, Thạp, Mũi Sào', () => {
  const coi = newGeneration(L, 'chr_coi');
  assert.equal(coi.skills.points, 2); assert.equal(coi.slots, 1);
  assert.equal(canHandoff(L, coi), false);
  assert.throws(() => handoff(L, coi));
  coi.skills.buy('sk_vo_noi_don'); coi.skills.points += 3;
  coi.flags.add('flag_boss_lon_loi_freed'); coi.houseMoves.push('hm_chong_sao');
  coi.owned.bk_nanh_dam = { level: 1, generation: 1 };
  const w = handoffWarnings(L, { secretFinished: () => false, crafted: () => true });
  assert.deepEqual(w, ['sec_lo_bo_hoang']);
  const b = handoff(L, coi);
  assert.equal(b.character, 'chr_buong'); assert.equal(b.era, 'era_hung_vuong_6');
  assert.ok(b.skills.has('sk_vo_noi_don')); assert.equal(b.skills.points, 4 + 1);
  assert.deepEqual(b.weapons, ['wp_giao_dong', 'wp_riu_xeo']); assert.equal(b.slots, 2);
  assert.deepEqual(b.houseMoves, ['hm_chong_sao']); assert.deepEqual(b.tools, ['tool_mui_sao']);
  assert.deepEqual(b.thap, [{ item: 'bk_nanh_dam', level: 1, generation: 1 }]);
  assert.ok(b.owned.bk_nanh_dam, 'Bảo khí equippable by the next generation');
  assert.equal(coi.character, 'chr_coi', 'pure: previous generation untouched');
});

test('forbidden-word matcher mirrors the validator (word boundaries, vi + en)', () => {
  const tags = eraTags(L, 'era_hung_vuong_6');
  assert.deepEqual(forbiddenHits({ vi: 'Khoen nứt', en: 'x' }, tags), ['khoen']);
  assert.deepEqual(forbiddenHits({ vi: 'x', en: 'a broken pin' }, tags), ['pin']);
  assert.deepEqual(forbiddenHits({ vi: 'mảnh', en: 'spinning' }, tags), ['mảnh']);
  assert.deepEqual(forbiddenHits({ vi: 'Giữ bến bằng tay mình.', en: 'Keep the landing with your own hands.' }, tags), []);
  assert.deepEqual(eraTags(L, 'era_lac_long_quan'), []);
});

test('lock-on picks inside the cone and range; breaks beyond break distance', () => {
  const lt = DATA.combat.lock_on;
  const c = [{ id: 'a', x: 0, z: -5 }, { id: 'b', x: 5, z: 0 }, { id: 'far', x: 0, z: -30 }, { id: 'x', x: 0, z: -2, lockable: false }];
  assert.equal(pickLockTarget({ x: 0, z: 0 }, { x: 0, z: -1 }, c, lt), 'a');
  assert.equal(pickLockTarget({ x: 0, z: 0 }, { x: 0, z: 1 }, c, lt), 'a', 'falls back to nearest in range');
  assert.ok(shouldBreakLock({ x: 0, z: 0 }, { x: 0, z: -21 }, lt));
  assert.ok(!shouldBreakLock({ x: 0, z: 0 }, { x: 0, z: -19 }, lt));
  assert.equal(softAimTarget({ x: 0, z: 0 }, { x: 0, z: -1 }, c, lt, 6), 'a');
});

test('i18n: vi/en, variables, missing keys reported', () => {
  const i = createI18n(DATA.strings, 'vi');
  assert.equal(i.t('hud_the'), 'Thế'); i.setLang('en'); assert.equal(i.t('hud_the'), 'Stance');
  assert.equal(i.t('msg_got_item', { name: 'X', n: 2 }), 'Received: X × 2');
  assert.equal(i.t('nope_key'), '⟨nope_key⟩'); assert.deepEqual(i.missingKeys(), ['nope_key']);
  assert.throws(() => i.setLang('fr'));
});
