// Demo 0.3 gameplay logic (DEMO_0_3_DESIGN §2, §5, §6): jump physics (apex, flight, early release,
// coyote time, input buffer, landing lag, ground waves vs height), Weapon Art cooldowns and the
// progression adapter, boss chains and fairness rules, habit punishes, arena helpers, and Ghì nanh's
// 2-beat rhythm on REAL time (QA S2 contract, same as the pry).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA, DATA_02 } from '../src/data.js';
import { JumpController, landingLag, airborneAvoids, chargeHitsAirborne, flightTime, ringWaveTouches } from '../src/logic/jump.js';
import { skillsForWeapon, levelEntry, effectiveCooldown, progressAdapter, SkillCooldowns, rollDrops, xpForEnemy } from '../src/logic/skills.js';
import { difficultyRow03, phaseMoveset03, phaseCombos03, comboStepWindup, comboStepAttack, validateCombos, PunishTracker, postAttackIdle, phaseMults03,
  MudTrails, stakeOnPath, distanceToArenaEdge, reaimLimited, makeTuskLockJudge, canTuskLock, attackCooldown03 } from '../src/logic/boss03.js';
import { attackTimeline } from '../src/logic/enemyAi.js';
import { HitStopClock } from '../src/logic/hitstop.js';
import { INPUT_GRACE_S } from '../src/logic/shackle.js';
import { mulberry32 } from '../src/game/world.js';

const J = DATA.combat.movement.jump;
const close = (a, b, eps = 0.03) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);
const boss = DATA_02.enemies.enemies.find((e) => e.id === 'boss_lon_loi_dam');
const RULES = DATA.combat.boss_rules_0_3;

function fly(jc, { dt = 1 / 120, heldFor = Infinity } = {}) {
  let t = 0, apexT = null, apexY = 0, landT = null, fall = 0, above = 0;
  for (let i = 0; i < 400 && landT == null; i++) {
    const r = jc.step(dt, { held: t < heldFor }); t += dt;
    if (r.apex) { apexT = jc.airT; apexY = jc.y; }
    if (jc.y >= J.airborne_avoid_min_height_m) above += dt;
    if (r.landed) { landT = jc.airT; fall = r.fallHeight; }
  }
  return { apexT, apexY: Math.max(apexY, jc.peak), landT, fall, above };
}

test('jump: full hold reaches ~1.1 m at ~0.32 s; flight ~0.59 s (heavy fall), no lingering', () => {
  const jc = new JumpController(J);
  jc.request(0); assert.ok(jc.tryStart(0, true));
  const r = fly(jc);
  close(r.apexT, J.time_to_apex_s, 0.02); close(r.fall, J.height_m, 0.03); close(r.landT, flightTime(J), 0.03);
  close(flightTime(J), 0.59, 0.02);
  assert.ok(r.above > 0.45, `time above the 0.35 m ground-wave line: ${r.above.toFixed(2)} s (Sóng bùn edge passes in ~0.2 s)`);
});

test('jump: early release cuts the rise but keeps >= min_height_m; acc option = full height on a tap', () => {
  const jc = new JumpController(J);
  jc.request(0); jc.tryStart(0, true);
  const r = fly(jc, { heldFor: 0.02 });
  assert.ok(r.fall >= J.min_height_m - 1e-3 && r.fall < J.height_m - 0.2, `low jump ${r.fall.toFixed(2)} m`);
  const full = new JumpController(J);
  full.request(0); full.tryStart(0, true, { fullOnTap: true });
  close(fly(full, { heldFor: 0.02 }).fall, J.height_m, 0.03);
});

test('jump: input buffer 0.12 s and coyote time 0.10 s; no jump from a forbidden state; no double jump', () => {
  const jc = new JumpController(J);
  jc.request(1.0);
  assert.equal(jc.tryStart(1.05, false), false, 'state forbids (e.g. attack startup)');
  assert.ok(jc.tryStart(1.0 + J.jump_buffer_s - 0.01, true), 'buffered press fires when allowed');
  const late = new JumpController(J); late.request(2.0);
  assert.equal(late.tryStart(2.0 + J.jump_buffer_s + 0.02, true), false, 'buffer expired');
  const c = new JumpController(J);
  c.setGrounded(false, 5.0); c.request(5.08); assert.ok(c.tryStart(5.08, true), 'coyote: 0.08 s after leaving the ground');
  const c2 = new JumpController(J);
  c2.setGrounded(false, 5.0); c2.request(5.0 + J.coyote_time_s + 0.03); assert.equal(c2.tryStart(5.0 + J.coyote_time_s + 0.03, true), false);
  const d = new JumpController(J); d.request(0); d.tryStart(0, true); d.step(0.2, { held: true });
  d.request(0.2); assert.equal(d.tryStart(0.2, true), false, 'no air jump');
});

test('jump: landing lag, ring waves miss from 0.35 m, charges still hit an airborne player (no vault over the boar)', () => {
  assert.equal(landingLag(1.1, J.landing), 0, 'a normal jump has no landing lag');
  close(landingLag(1.8, J.landing), 0.072, 1e-6);
  assert.equal(landingLag(9, J.landing), J.landing.max_lag_s);
  assert.ok(airborneAvoids('ring_wave', 0.5, J)); assert.equal(airborneAvoids('ring_wave', 0.2, J), false);
  assert.equal(airborneAvoids('charge', 1.0, J), false);
  assert.ok(chargeHitsAirborne(J.height_m, J), 'max jump 1.1 m < 1.4 m');
  assert.ok(J.iframes === false && J.air_dodge === false);
  // Mud Wave band test.
  const w = boss.attacks.find((a) => a.id === 'll_song_bun').ring_wave;
  assert.ok(ringWaveTouches(5.0, 4.6, 5.2, w.thickness_m)); assert.equal(ringWaveTouches(8.5, 3, 4, w.thickness_m), false);
  // Plunge reaches the ground fast.
  const p = new JumpController(J); p.request(0); p.tryStart(0, true);
  for (let i = 0; i < 30; i++) p.step(1 / 120, { held: true });
  p.startPlunge(); let n = 0; while (p.airborne && n++ < 200) p.step(1 / 120);
  assert.ok(n * (1 / 120) < 0.12, `plunge lands in ${(n / 120).toFixed(3)} s`);
});

test('Weapon Arts: 2 per weapon, rank lookup with a safe default adapter, cooldown x gear mult, swap keeps cooldowns', () => {
  const S = DATA.skills;
  const spear = DATA.weapons.weapons.find((w) => w.id === 'wp_giao_dong'), axe = DATA.weapons.weapons.find((w) => w.id === 'wp_riu_xeo');
  assert.deepEqual(skillsForWeapon(S, spear).map((s) => s.id), ['sk_giao_cam_sao_vot', 'sk_giao_quet_song']);
  assert.deepEqual(skillsForWeapon(S, axe).map((s) => s.id), ['sk_riu_bo_don_cay', 'sk_riu_moc_thuyen']);
  const def = skillsForWeapon(S, spear)[0];
  const none = progressAdapter(undefined);
  assert.equal(none.level(def.id), 1); assert.deepEqual(none.stats(), {}); assert.equal(none.addItem, null);
  const prog = progressAdapter({ getSkillLevel: (id) => (id === def.id ? 3 : 0), getStats: () => ({ skill_cooldown_mult: 0.8 }) });
  assert.equal(prog.level(def.id), 3); assert.equal(levelEntry(def, prog.level('x')), null, 'rank 0 = locked');
  close(effectiveCooldown(levelEntry(def, 3), prog.stats()), 9 * 0.8, 1e-9);
  assert.equal(effectiveCooldown(levelEntry(def, 1), none.stats()), 12);
  const cd = new SkillCooldowns();
  cd.start('a', 10); cd.tick(4); close(cd.remaining('a'), 6, 1e-9); close(cd.ratio('a'), 0.6, 1e-9);
  cd.cut('a', 5); cd.tick(1.1); assert.ok(cd.ready('a')); assert.equal(cd.ratio('a'), 0);
});

test('drops and XP of a driven-off enemy: village goods / tin, never body parts; XP from skills.xp_sources', () => {
  const crab = DATA.enemies.enemies.find((e) => e.id === 'en_cua_cang_bun');
  const rng = mulberry32(3); let n = 0;
  for (let i = 0; i < 1000; i++) n += rollDrops(crab.drops, rng).filter((d) => d.item === 'mat_thiec_song').length;
  assert.ok(n > 280 && n < 420, `35% tin: ${n}/1000`);
  for (const e of DATA.enemies.enemies) for (const d of e.drops ?? []) {
    const it = DATA.items.items.find((x) => x.id === d.item); assert.ok(it, d.item);
    assert.ok(!/nanh|da_|xuong|mau|thit|khoen/.test(d.item) || d.item === 'mat_nanh_rung', `no body part / khoen item: ${d.item}`);
  }
  assert.equal(xpForEnemy(DATA.skills, 'en_cua_cang_bun'), 15); assert.equal(xpForEnemy(DATA.skills, 'en_u_bun'), 40);
});

test('boss 0.3: moveset per phase and difficulty (no Càn khuỵu in P2, feints off on Nghe chuyện, Thác dữ double charge in P1)', () => {
  const cheo = difficultyRow03(boss, 'diff_cheo_do');
  const p1 = phaseMoveset03(boss, 0, cheo), p2 = phaseMoveset03(boss, 1, cheo);
  for (const id of ['ll_song_bun', 'll_can_xuyen', 'll_cao_mong_gia', 'll_quay_hong']) assert.ok(p1.includes(id), id);
  for (const id of ['ll_song_bun', 'll_can_hai_luot', 'll_dam_cham', 'll_quat_doi']) assert.ok(p2.includes(id), id);
  assert.ok(!p2.includes('ll_can_khuyu'), 'Càn khuỵu replaced in P2');
  assert.ok(!phaseMoveset03(boss, 0, difficultyRow03(boss, 'diff_nghe_chuyen')).includes('ll_cao_mong_gia'), 'no feints on Nghe chuyện');
  assert.ok(phaseMoveset03(boss, 0, difficultyRow03(boss, 'diff_thac_du')).includes('ll_can_hai_luot'));
  assert.ok(!p1.includes('ll_can_hai_luot'));
  assert.deepEqual(difficultyRow03(boss, 'custom'), boss.difficulty_0_3.diff_cheo_do, 'custom difficulty uses the default row');
  const m2 = phaseMults03(boss.phases[1]);
  assert.equal(m2.speed, 1.0); assert.equal(m2.telegraph, 1.1, 'P2 no longer slower; telegraph +10%');
  assert.equal(attackCooldown03(boss.attacks.find((a) => a.id === 'll_rong_dau'), boss.phases[1]), 20);
});

test('boss chains: 2-4 steps, later steps faster but never under 0.3 s (parryable) / 0.9 s (unparryable); difficulty caps length', () => {
  assert.deepEqual(validateCombos(boss, RULES), []);
  const cheo = difficultyRow03(boss, 'diff_cheo_do');
  const c1 = phaseCombos03(boss, 0, cheo, RULES), c2 = phaseCombos03(boss, 1, cheo, RULES);
  assert.deepEqual(c1.map((c) => c.id), ['cb_ba_nhip_nanh', 'cb_hat_lui_can']);
  assert.deepEqual(c2.map((c) => c.id), ['cb_giay_don', 'cb_song_bun_doi']);
  assert.equal(c2[0].steps.length, 4);
  for (const c of [...c1, ...c2]) {
    assert.ok(c.steps.length >= 2 && c.steps.length <= 4);
    c.steps.forEach((st, i) => {
      const a = boss.attacks.find((x) => x.id === st.attack), sa = comboStepAttack(a, c, i, RULES);
      const floor = a.parryable ? 0.3 : 0.9;
      assert.ok(sa.windup_s >= Math.min(a.windup_s, floor) - 1e-9 && sa.windup_s <= a.windup_s + 1e-9, `${c.id}[${i}] ${sa.windup_s}`);
      // Difficulty never shortens telegraphs: timeline windup >= chain windup at every preset.
      for (const p of DATA.combat.difficulty.presets) assert.ok(attackTimeline(sa, { telegraphMult: p.telegraph_time_mult, speedMult: p.enemy_speed_mult }).windup >= sa.windup_s - 1e-9);
    });
    const last = comboStepAttack(boss.attacks.find((x) => x.id === c.steps.at(-1).attack), c, c.steps.length - 1, RULES);
    assert.ok(last._combo.last);
  }
  const charge = comboStepAttack(boss.attacks.find((a) => a.id === 'll_can_lay'), c1[1], 1, RULES);
  assert.ok(charge.windup_s >= 1.0, `Hất, lùi, càn: charge telegraph ${charge.windup_s} >= 1.0 s`);
  assert.ok(comboStepAttack(boss.attacks.find((a) => a.id === 'll_hat_nanh'), c1[0], 2, RULES)._combo.riposte, 'Ba nhịp nanh step 3 opens the counter-beat');
  assert.ok(comboStepAttack(boss.attacks.find((a) => a.id === 'll_dam_cham'), c2[0], 3, RULES)._combo.riposte);
  const giay = boss.attacks.find((a) => a.id === 'll_dam_cham');
  close(comboStepAttack(giay, c2[0], 3, RULES).recovery_s, giay.recovery_s * 1.2, 1e-9, 'final recovery x1.2 = clear punish window');
  const nghe = difficultyRow03(boss, 'diff_nghe_chuyen');
  for (const ph of [0, 1]) for (const c of phaseCombos03(boss, ph, nghe, RULES)) assert.equal(c.steps.length, 2);
  // Feints: one per phase, distinct audio (the real charge always roars).
  const feint = boss.attacks.find((a) => a.id === 'll_cao_mong_gia'), real = boss.attacks.find((a) => a.id === 'll_can_lay');
  assert.notEqual(feint.telegraph.audio, real.telegraph.audio);
});

test('boss punishes: heal nearby (once per heal), dodge spam (Ngược nước+), kiting > 10 m for 3 s, standing behind 1.2 s', () => {
  const beh = boss.behavior_0_3;
  const t = new PunishTracker(beh, difficultyRow03(boss, 'diff_cheo_do'));
  assert.equal(t.update(0.1, 0, { dist: 20, healing: true }), null, 'far away: no heal punish');
  const h = t.update(0.1, 0.1, { dist: 6, healing: true });
  assert.equal(h.attack, 'll_can_lay'); assert.equal(h.reason, 'heal');
  assert.equal(t.update(0.1, 0.2, { dist: 6, healing: true }), null, 'once per heal');
  for (const k of [1, 1.5, 2]) t.noteDodge(k);
  assert.equal(t.update(0.1, 2.1, { dist: 5 }), null, 'Chèo đò: no dodge-spam punish');
  const hard = new PunishTracker(beh, difficultyRow03(boss, 'diff_nguoc_nuoc'));
  for (const k of [1, 1.5, 2]) hard.noteDodge(k);
  assert.equal(hard.update(0.1, 2.1, { dist: 5 }).attack, 'll_song_bun');
  const kite = new PunishTracker(beh, difficultyRow03(boss, 'diff_cheo_do'));
  let r = null; for (let i = 0; i < 31 && !r; i++) r = kite.update(0.1, i * 0.1, { dist: 12 });
  assert.equal(r?.attack, 'll_can_xuyen');
  const rear = new PunishTracker(beh, difficultyRow03(boss, 'diff_cheo_do'));
  r = null; for (let i = 0; i < 13 && !r; i++) r = rear.update(0.1, i * 0.1, { dist: 2, rear: true });
  assert.equal(r?.attack, 'll_quay_hong');
  const nghe = new PunishTracker(beh, difficultyRow03(boss, 'diff_nghe_chuyen'));
  assert.equal(nghe.update(0.1, 0, { dist: 5, healing: true }), null, 'Nghe chuyện: no heal punish');
  const rng = mulberry32(9);
  for (let i = 0; i < 50; i++) { const v = postAttackIdle(difficultyRow03(boss, 'diff_thac_du'), beh, rng); assert.ok(v >= 0.2 && v <= 0.6); }
  assert.ok(boss.behavior_0_3.token_exempt, 'boss no longer waits on the shared attack token');
});

test('arena: mud trails expire / cap at 3 / slow; stakes stop charges on the path; edge distance; double-charge re-aim <= 35 deg', () => {
  const spec = boss.attacks.find((a) => a.id === 'll_can_xuyen').mud_trail;
  const m = new MudTrails();
  for (let i = 0; i < 4; i++) m.add({ ax: 0, az: i, bx: 10, bz: i }, spec, 0);
  assert.equal(m.list.length, 3);
  assert.equal(m.at(5, 2.5)?.mult, 0.6); assert.equal(m.at(5, 9), null);
  m.tick(8.1); assert.equal(m.list.length, 0);
  const stakes = boss.phases[1].phase2_0_3.arena_change_0_3.stakes_emerge.map((s) => ({ ...s, radius: 0.35 }));
  const s = stakeOnPath(-11, -116, -11, -136, stakes, 1.6);
  assert.equal(s?.id, 'stake_p2_a'); stakes[0].broken = true;
  assert.equal(stakeOnPath(-11, -116, -11, -136, stakes, 1.6), null);
  close(distanceToArenaEdge(0, -136, 1, 0, 0, -136, 18, 1.6), 16.4, 1e-6);
  const y = reaimLimited(0, Math.PI / 2, 35);
  close(Math.abs(((y - Math.PI) + Math.PI * 3) % (Math.PI * 2) - Math.PI), 35 * Math.PI / 180, 1e-6);
});

test('Ghì nanh: 2 beats, once per fight, judged on REAL time (hit-stop on beat 1 does not shift beat 2)', () => {
  const tl = boss.phases[1].phase2_0_3.tusk_lock_0_3, pry = DATA.combat.pry;
  assert.ok(canTuskLock(tl, { bossState: 'stake_stun', dist: 2.5, used: 0 }));
  assert.equal(canTuskLock(tl, { bossState: 'stake_stun', dist: 2.5, used: 1 }), false, 'max_per_fight 1');
  assert.equal(canTuskLock(tl, { bossState: 'chase', dist: 1, used: 0 }), false);
  const run = (useGameTime) => {
    const j = makeTuskLockJudge(pry, tl); const hs = new HitStopClock(0);
    const dt = 1 / 60; let t = 0, nextPress = j.slotTime(0);
    for (let i = 0; i < 600 && !j.done; i++) {
      t += dt;
      const g = hs.advance(dt);
      j.tick(useGameTime ? g : dt);
      if (t >= nextPress) { const ev = j.press(); if (ev.some((e) => e.type === 'hit')) hs.trigger(0.3); nextPress += j.interval; }
    }
    return j;
  };
  const real = run(false);
  assert.equal(real.beats, 2); assert.equal(real.result, 'freed');
  assert.notEqual(run(true).result, 'freed', 'a hit-stop-scaled judge drifts and misses beat 2');
  const auto = makeTuskLockJudge(pry, tl, { auto: true }); auto.tick(5); assert.equal(auto.result, 'freed', 'auto on Nghe chuyện');
  assert.ok(INPUT_GRACE_S > 0);
});
