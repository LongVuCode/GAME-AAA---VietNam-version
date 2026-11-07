// Story Integration 0.4: cinematic timeline (real-time contract, skip, interactive holds), quest state
// machine (main quest 6 steps, side quests, sequence breaks), dialogue choices converging, barks, and the
// Hùng 6 forbidden words for the trap blade (SI-10).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA } from '../src/data.js';
import { CinematicTimeline, scriptedLength, lineSlots, shotCamera, INTERACTIVE_TAIL_S } from '../src/story/timeline.js';
import { QuestLog } from '../src/story/quests.js';
import { DialogueRun, BarkBook, conversationAvailable, conversationsFor, lineIndex, resolveLine } from '../src/story/dialogue.js';
import { forbiddenHits, eraTags, TAG_WORDS } from '../src/logic/lineage.js';
import { creatureFor, storyLineAllowed, STAGING } from '../src/story/staging.js';

const cin = (id) => DATA.cinematics.cinematics.find((c) => c.id === id);
const conv = (id) => DATA.dialogue.conversations.find((c) => c.id === id);
const run = (tl, seconds, step = 1 / 60, input = {}) => { const ev = []; for (let t = 0; t < seconds - 1e-9; t += step) ev.push(...tl.update(step, input)); return ev; };

// ------------------------------------------------------------------ cinematic timeline
test('cold open: 9 shots, 90 s, ends by itself on real time, every line once', () => {
  const c = cin('cin_cold_open');
  assert.equal(c.shots.length, 9);
  assert.equal(scriptedLength(c), 90);
  const tl = new CinematicTimeline(c);
  const ev = run(tl, 89.5);
  assert.ok(!tl.done, 'still running before 90 s');
  ev.push(...run(tl, 1));
  assert.ok(tl.done && !tl.skipped);
  const lines = ev.filter((e) => e.type === 'line').map((e) => e.ref);
  const all = c.shots.flatMap((s) => s.line_refs);
  assert.deepEqual(lines, all);
  assert.deepEqual(ev.filter((e) => e.type === 'shot').map((e) => e.shot.id), c.shots.map((s) => s.id));
  assert.ok(ev.some((e) => e.type === 'title' && e.key === 'cin_era_llq'));
  assert.equal(ev.filter((e) => e.type === 'end').length, 1);
});

test('timeline is frame-rate independent (30 / 144 Hz / one large hitch give the same shot at the same time)', () => {
  const c = cin('cin_cold_open');
  for (const step of [1 / 30, 1 / 144, 0.5]) {
    const tl = new CinematicTimeline(c); run(tl, 41, step);
    assert.equal(tl.shot.id, 'co_s05', `step ${step}`);
    assert.ok(Math.abs(tl.total - 41) < step + 1e-6);
  }
  const big = new CinematicTimeline(c); big.update(30.5); // one 30 s hitch crosses 3 shots and still emits their lines
  assert.equal(big.shot.id, 'co_s04');
});

test('skip: holding skip for skip_hold_s ends the scene; releasing early resets the hold', () => {
  const c = cin('cin_cold_open');
  const tl = new CinematicTimeline(c);
  run(tl, 3);
  run(tl, c.skip_hold_s * 0.6, 1 / 60, { skipHeld: true });
  run(tl, 0.1);
  assert.ok(!tl.done && tl.skipProgress === 0);
  const ev = run(tl, c.skip_hold_s + 0.05, 1 / 60, { skipHeld: true });
  assert.ok(tl.done && tl.skipped);
  assert.deepEqual(ev.filter((e) => e.type === 'end'), [{ type: 'end', skipped: true }]);
});

test('handoff: interactive shots wait for the hold (fail none), then play their line', () => {
  const c = cin('cin_handoff');
  assert.equal(scriptedLength(c), c.total_s);
  const tl = new CinematicTimeline(c);
  let ev = run(tl, 30);
  assert.equal(tl.shot.id, 'ho_s02');
  assert.ok(tl.waiting, 'waits for the carve hold');
  assert.ok(!ev.some((e) => e.ref === 'ln_ho_c1'), 'line only after the action');
  ev = run(tl, c.shots[1].interactive.hold_s + 0.1, 1 / 60, { actionHeld: true });
  assert.ok(ev.some((e) => e.type === 'interactive_done'));
  assert.ok(ev.some((e) => e.type === 'line' && e.ref === 'ln_ho_c1'));
  ev = run(tl, INTERACTIVE_TAIL_S + 0.1);
  assert.equal(tl.shot.id, 'ho_s03');
  // Release while holding halves back (no instant completion by tapping).
  run(tl, 0.5, 1 / 60, { actionHeld: true }); run(tl, 0.3);
  assert.ok(tl.holdProgress < 0.5);
  // Every interactive shot can be completed; the scene ends.
  for (let k = 0; k < 3000 && !tl.done; k++) tl.update(0.1, { actionHeld: true });
  assert.ok(tl.done && !tl.skipped);
});

test('line slots fit inside their shot; explicit cameras interpolate from -> to', () => {
  for (const c of DATA.cinematics.cinematics) for (const s of c.shots) {
    for (const l of lineSlots(s)) assert.ok(l.at < s.duration_s && l.duration > 0, `${s.id}`);
  }
  const s2 = cin('cin_cold_open').shots[1];
  assert.deepEqual(shotCamera(s2, 0).pos, s2.camera.from);
  assert.deepEqual(shotCamera(s2, 1).pos, s2.camera.to);
  assert.deepEqual(shotCamera(s2, 0.5).look, s2.camera.look_at);
  assert.equal(shotCamera(cin('cin_cold_open').shots[0], 0), null, 'black shot has no camera');
});

test('every line ref of every cinematic resolves (dialogue.json or strings.dialogue), and staging covers every shot', () => {
  const idx = lineIndex(DATA.dialogue);
  for (const c of DATA.cinematics.cinematics) for (const s of c.shots) {
    for (const ref of s.line_refs) {
      const l = idx.get(ref)?.line ?? DATA.strings.dialogue.find((d) => d.id === ref);
      assert.ok(l, `${s.id} ${ref}`);
      const r = l.line_ref || l.text ? resolveLine(l, DATA.strings.dialogue) : null;
      assert.ok(r?.text?.vi && r?.text?.en, `${ref} has vi + en`);
    }
    assert.ok(STAGING[s.id], `staging for ${s.id}`);
  }
});

test("cut-scene lines shown in Hùng 6 shots pass the era's forbidden words (incl. trap blade, SI-10)", () => {
  const idx = lineIndex(DATA.dialogue), tags = eraTags(DATA.lineage, 'era_hung_vuong_6');
  for (const c of DATA.cinematics.cinematics) for (const s of c.shots) {
    const era = s.era ?? c.era;
    if (era !== 'era_hung_vuong_6') continue;
    for (const ref of s.line_refs) {
      const l = idx.get(ref)?.line ?? { line_ref: ref };
      const r = resolveLine(l, DATA.strings.dialogue);
      assert.ok(storyLineAllowed(r, era, DATA.lineage), `${s.id} ${ref}`);
      assert.deepEqual(forbiddenHits(r.text, tags), [], ref);
    }
  }
  // The after-pry verse is refused in Hùng 6 by the same rule.
  const ve = resolveLine({ line_ref: 'dlg_04_ve_after_pry' }, DATA.strings.dialogue);
  assert.ok(!storyLineAllowed(ve, 'era_hung_vuong_6', DATA.lineage));
});

// ------------------------------------------------------------------ quests
test('main quest "Người chưa về": 6 steps advance in order through the game facts, then the handoff quest', () => {
  const q = new QuestLog(DATA.quests);
  const main = q.quest('q_main_nguoi_chua_ve');
  assert.equal(main.steps.length, 6);
  q.record('cinematic', 'cin_cold_open');
  assert.equal(q.currentStep(main.id).id, 'qs_m1_vet_lon_loi');
  const seq = [['inspect', 'trap_a'], ['talk', 'cv_dot_dam_nong'], ['non_combat_success', 'nc_nguoi_bi_me'], ['talk', 'cv_nghe_rescue'],
    ['enter_zone', 'z_dau_truong'], ['boss_freed', 'boss_lon_loi_dam'], ['talk', 'cv_gianh_furnace'], ['craft', 'rcp_nanh_dam']];
  const seen = [];
  for (const [t, r] of seq) {
    for (const e of q.record(t, r)) if (e.type === 'step_done' && e.quest.id === main.id) seen.push(e.step.id);
  }
  assert.deepEqual(seen, main.steps.map((s) => s.id));
  assert.ok(q.isDone(main.id));
  assert.ok(q.isActive('q_handoff_dai_cham'), 'transition quest starts when the main quest is done');
  assert.equal(q.tracked().id, 'q_handoff_dai_cham');
  q.record('interact', 'drum');
  assert.ok(q.isDone('q_handoff_dai_cham'));
});

test('step 3 needs both the call and the talk; facts recorded early complete a step when it is reached', () => {
  const q = new QuestLog(DATA.quests);
  q.record('cinematic', 'cin_cold_open');
  q.record('enter_zone', 'z_dau_truong'); // walked to the mire first (sequence break)
  q.record('inspect', 'trap_a'); q.record('talk', 'cv_dot_dam_nong');
  q.record('non_combat_success', 'nc_nguoi_bi_me');
  assert.equal(q.currentStep('q_main_nguoi_chua_ve').id, 'qs_m3_goi_nghe');
  assert.deepEqual(q.progress(q.currentStep('q_main_nguoi_chua_ve')), { met: 1, total: 2 });
  const ev = q.record('talk', 'cv_nghe_rescue');
  assert.deepEqual(ev.filter((e) => e.type === 'step_done').map((e) => e.step.id), ['qs_m3_goi_nghe', 'qs_m4_theo_dau']);
  assert.equal(q.currentStep('q_main_nguoi_chua_ve').id, 'qs_m5_cay');
  assert.equal(q.record('talk', 'cv_nghe_rescue').length, 0, 'idempotent');
});

test('side quests: start facts, 3 traps, basket alias (choice or chest), bundle of Nghệ', () => {
  const q = new QuestLog(DATA.quests);
  assert.equal(q.status('sq_bay_nha_dot'), 'inactive');
  q.record('talk', 'cv_dot_dam_nong');
  assert.ok(q.isActive('sq_bay_nha_dot'));
  q.record('interact', 'trap_dot_1'); q.record('interact', 'trap_dot_3');
  assert.deepEqual(q.progress(q.currentStep('sq_bay_nha_dot')), { met: 2, total: 3 });
  q.record('interact', 'trap_dot_2');
  assert.equal(q.currentStep('sq_bay_nha_dot').id, 'sq_dot_s2');
  assert.ok(q.readyOrDone('sq_bay_nha_dot'));
  // Basket: opening the chest first starts the quest and completes step 1.
  const ev = q.record('open_chest', 'chest_bai_lau');
  assert.ok(ev.some((e) => e.type === 'quest_started' && e.quest.id === 'sq_gio_cua_nan'));
  assert.equal(q.currentStep('sq_gio_cua_nan').id, 'sq_nan_s2');
  assert.ok(q.stepDone('sq_nan_s1'));
  const q2 = new QuestLog(DATA.quests);
  q2.record('choice', 'ch_nan_stay');
  assert.equal(q2.currentStep('sq_gio_cua_nan').id, 'sq_nan_s1');
  q2.record('talk', 'cv_nghe_rescue');
  assert.ok(q2.isActive('sq_boc_do_nghe'));
  q2.record('environment_secret', 'es_go_kho'); q2.record('talk', 'cv_nghe_bracers');
  assert.ok(q2.isDone('sq_boc_do_nghe'));
  assert.deepEqual(q2.activeSide().map((x) => x.id), ['sq_gio_cua_nan']);
});

test('quest objectives use the strings.ui objective keys (tracker text = data text)', () => {
  for (const q of DATA.quests.quests) for (const s of q.steps) {
    const u = DATA.strings.ui[s.objective_key];
    assert.ok(u, s.objective_key);
    assert.equal(u.vi, s.objective.vi); assert.equal(u.en, s.objective.en);
  }
});

// ------------------------------------------------------------------ dialogue
const ctx = (flags = new Set(), steps = new Set(), ready = new Set()) => ({ hasFlag: (f) => flags.has(f), setFlag: (f) => flags.add(f), stepDone: (s) => steps.has(s), readyOrDone: (q) => ready.has(q) });

test('every choice sets only flag_choice_* flags and every branch converges on the same continuation', () => {
  for (const c of DATA.dialogue.conversations.filter((x) => x.choices?.length)) {
    const tails = new Set();
    for (let i = 0; i < c.choices.length; i++) {
      const flags = new Set();
      const r = new DialogueRun(c, DATA.strings.dialogue, ctx(flags));
      const ids = r.autoplay(i);
      assert.ok(r.done, c.id);
      for (const f of flags) assert.match(f, /^flag_choice_/, `${c.id} sets ${f}`);
      assert.equal(flags.size, 1, `${c.id} choice ${i} sets one flag`);
      const resp = new Set((c.choices[i].response ?? []).map((l) => l.id));
      tails.add(ids.filter((id) => !resp.has(id)).join('|'));
    }
    assert.equal(tails.size, 1, `${c.id}: branches converge (same lines apart from the chosen response)`);
  }
});

test('Đót conversation: lines, choice, response, after_choice; the furnace variant follows the choice', () => {
  const flags = new Set();
  const r = new DialogueRun(conv('cv_dot_dam_nong'), DATA.strings.dialogue, ctx(flags));
  assert.equal(r.node.kind, 'line'); assert.equal(r.node.line.speaker, 'npc_dot');
  for (let k = 0; k < 4; k++) r.next();
  assert.equal(r.node.kind, 'choice');
  assert.deepEqual(r.choose(1), ['flag_choice_dot_eased']);
  assert.equal(r.node.line.id, 'ln_dot_05b');
  r.next(); assert.equal(r.node.line.id, 'ln_dot_06'); r.next(); assert.ok(r.done);
  const f2 = new Set(['flag_choice_dot_eased']);
  const fur = new DialogueRun(conv('cv_gianh_furnace'), DATA.strings.dialogue, ctx(f2, new Set(), new Set(['sq_bay_nha_dot'])));
  const ids = fur.autoplay(0);
  assert.ok(ids.includes('ln_gi_04c') && ids.includes('ln_gi_07a') && !ids.includes('ln_gi_07b'));
  assert.ok(ids.includes('ln_gi_05_ref'), 'line_ref to strings.dialogue resolves');
});

test('availability: Năn before the rescue, basket after its step, Bà Mơ between rescue and boss', () => {
  const flags = new Set(), steps = new Set();
  const c = ctx(flags, steps);
  assert.deepEqual(conversationsFor(DATA.dialogue, 'npc_nan_ben_say', c).map((x) => x.id), ['cv_nan_ben_say']);
  assert.equal(conversationAvailable(conv('cv_mo_after_rescue'), c), false);
  flags.add('flag_nguoi_bi_me_saved'); steps.add('sq_nan_s1');
  assert.deepEqual(conversationsFor(DATA.dialogue, 'npc_nan_ben_say', c).map((x) => x.id), ['cv_nan_basket']);
  assert.ok(conversationAvailable(conv('cv_mo_after_rescue'), c));
  flags.add('flag_boss_lon_loi_freed');
  assert.equal(conversationAvailable(conv('cv_mo_after_rescue'), c), false);
  assert.ok(conversationAvailable(conv('cv_gianh_furnace'), c));
});

test('barks: cooldown, era, flag-gated boss intro, pry beats and Ghì nanh lines exist', () => {
  const b = new BarkBook(DATA.dialogue);
  const flags = new Set(['flag_choice_coi_look']);
  const c = (now, era = 'era_lac_long_quan') => ({ era, hasFlag: (f) => flags.has(f), now });
  assert.equal(b.pick('perfect_parry', c(0)).id, 'bk_c_parry');
  assert.equal(b.pick('perfect_parry', c(5)), null, 'cooldown 12 s');
  assert.equal(b.pick('perfect_parry', c(13)).id, 'bk_c_parry');
  assert.equal(b.pick('boss_intro', c(20)).id, 'bk_s_arena_look');
  assert.equal(b.pick('enemy_fled', c(30, 'era_hung_vuong_6')).id, 'bk_b_crab');
  for (const t of ['pin_tusk_start', 'pin_tusk_success', 'pry_beat_1', 'pry_beat_2', 'pry_beat_3', 'after_pry_silence_before_ve', 'after_ve_pick_blade']) {
    assert.ok(b.pick(t, { ...c(100 + t.length * 3), force: true }), t);
  }
});

// ------------------------------------------------------------------ era words (SI-10) and creature display names
test('Hùng 6 blocks the trap-blade words (lưỡi bẫy, đồng cũ, mắc ở cổ) and mirrors tools/design_validate.py', () => {
  const tags = eraTags(DATA.lineage, 'era_hung_vuong_6');
  for (const w of ['lưỡi bẫy', 'đồng cũ', 'mắc ở cổ']) {
    assert.ok(TAG_WORDS.khoen[0].includes(w));
    assert.deepEqual(forbiddenHits({ vi: `Cái ${w} ấy`, en: 'x' }, tags), [w]);
  }
  assert.deepEqual(forbiddenHits({ vi: 'x', en: 'the trap blade' }, tags), ['trap blade']);
  assert.deepEqual(forbiddenHits({ vi: 'Lưỡi cày mới', en: 'a new ploughshare' }, tags), []);
  assert.deepEqual(forbiddenHits({ vi: 'Lưỡi bẫy', en: '' }, eraTags(DATA.lineage, 'era_lac_long_quan')), [], 'allowed in Cói’s era');
});

test('creature display: Dế Cõng Đá replaces the crab name (id kept), Bương sees the river-bank variant', () => {
  const coi = creatureFor(DATA, 'en_cua_cang_bun', 'era_lac_long_quan');
  assert.equal(coi.name.vi, 'Dế Cõng Đá');
  assert.equal(creatureFor(DATA, 'en_cua_cang_bun', 'era_hung_vuong_6').name.vi, 'Dế Dũi Bãi Sông');
  assert.equal(creatureFor(DATA, 'boss_lon_loi_dam', 'era_lac_long_quan').name.vi, 'Lợn Lòi Đầm');
  assert.ok(DATA.enemies.enemies.some((e) => e.id === 'en_cua_cang_bun'), 'technical id unchanged');
  for (const c of DATA.creatures.creatures) assert.doesNotMatch(c.name.vi, /cua|Cua/);
  const tags = eraTags(DATA.lineage, 'era_hung_vuong_6');
  const v = creatureFor(DATA, 'en_cua_cang_bun', 'era_hung_vuong_6');
  assert.deepEqual(forbiddenHits([v.name, v.description], tags), []);
});
