import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA } from '../src/data.js';
import { BossEncounter } from '../src/logic/boss.js';
import { Khoen, KhoenState, PryJudge, INPUT_GRACE_S } from '../src/logic/shackle.js';
import { attackTimeline, telegraphKind, chooseAttack, delayedCount, AttackTokens } from '../src/logic/enemyAi.js';

const T = DATA.combat;
const boss = DATA.enemies.enemies.find((e) => e.id === 'boss_lon_loi_dam');
const breakOnce = (b) => b.receiveHit({ the: b.posture.max });
const endStagger = (b) => { b.tick(b.def.stagger_duration_s + 0.01); };

test('khoen cracks one stage per posture break and opens the pry when staggered', () => {
  const b = new BossEncounter(boss, T);
  assert.equal(b.khoen.state, KhoenState.INTACT);
  let r = breakOnce(b); assert.ok(r.broke && r.cracked); assert.equal(b.khoen.cracks, 1);
  assert.equal(b.canFinish(), false);
  endStagger(b); r = breakOnce(b); assert.equal(b.khoen.cracks, 2);
  assert.ok(r.phaseChanged, 'phase 2 at 2 cracks'); assert.equal(b.phase.id, 'ph2_noi_dau');
  assert.equal(b.posture.max, 260);
  endStagger(b); breakOnce(b); assert.equal(b.khoen.cracks, 3);
  assert.equal(b.khoen.state, KhoenState.READY); assert.ok(b.canFinish());
});

test('boss never dies while the khoen is on: health floor forces the final stagger and opens the pry', () => {
  const b = new BossEncounter(boss, T);
  const r = b.receiveHit({ hp: 99999 });
  assert.equal(b.hp, boss.hp_floor); assert.ok(r.floorReached); assert.ok(b.staggered);
  assert.equal(b.phase.id, 'ph2_noi_dau', 'HP <= 50 % enters phase 2');
  assert.ok(b.canFinish()); assert.equal(b.outcome, 'in_progress');
});

test('pry: 3 beats on the 84 bpm drum, success frees the beast and drops only the shed tusk', () => {
  const b = new BossEncounter(boss, T);
  b.receiveHit({ hp: 99999 });
  const j = b.beginPry();
  assert.ok(j); assert.ok(b.prying);
  close(j.interval, 60 / 84);
  b.tick(10); assert.ok(b.staggered, 'stagger paused during the pry');
  for (let k = 0; k < 3; k++) { j.tick(j.timeToSlot); const ev = j.press(); assert.equal(ev[0].type, 'hit'); }
  assert.equal(j.result, 'freed');
  assert.equal(b.resolvePry(), 'freed'); assert.equal(b.outcome, 'freed');
  assert.deepEqual(b.finishDrops().map((d) => d.item), ['mat_nanh_rung']);
  for (const d of b.finishDrops()) {
    const it = DATA.items.items.find((x) => x.id === d.item);
    assert.equal(it.source.kind, 'shed_after_pry', 'never a khoen item (V9)');
  }
});

test('pry: a beat may be retried miss_retries_per_beat times; then the boss recovers half its posture', () => {
  const b = new BossEncounter(boss, T);
  b.receiveHit({ hp: 99999 });
  const j = b.beginPry();
  j.tick(j.timeToSlot); j.press();                // beat 1 hit
  j.tick(j.timeToSlot - 0.4); let ev = j.press();   // early: miss 1
  assert.equal(ev[0].type, 'miss');
  ev = j.tick(j.timeToSlot + j.window + INPUT_GRACE_S + 0.01); // next slot passes without input: miss 2
  assert.deepEqual(ev.filter((e) => e.type === 'miss').map((e) => e.retriesLeft), [1]);
  assert.equal(j.done, false, 'still retrying beat 2');
  ev = j.tick(j.timeToSlot + j.window + INPUT_GRACE_S + 0.01); // miss 3 > miss_retries_per_beat (2): fail
  assert.ok(ev.some((e) => e.type === 'failed'));
  assert.equal(j.result, 'failed');
  assert.equal(b.resolvePry(), 'failed');
  assert.equal(b.khoen.state, KhoenState.READY, 'khoen keeps its 3 cracks');
  assert.ok(!b.staggered); close(b.posture.ratio, 0.5);
  assert.equal(b.outcome, 'in_progress');
});

test('pry judge window, input lag precision, hold mode, auto mode', () => {
  const late = new PryJudge(T.pry);
  late.tick(late.timeToSlot + 0.2);                 // frame arrives 0.2 s after the slot centre...
  assert.equal(late.press(-0.15)[0].type, 'hit', '...but the press happened at +0.05 s: judged by timestamp');
  const j = new PryJudge(T.pry);
  j.tick(j.timeToSlot + T.pry.beat_window_s - 0.01); assert.equal(j.press()[0].type, 'hit', 'late but inside window');
  const j2 = new PryJudge(T.pry, { windowAddS: 0.05 });
  close(j2.window, 0.2);
  const h = new PryJudge(T.pry, { holdMode: true });
  h.setHeld(true); h.tick(0.3); h.setHeld(false); h.tick(0.3); assert.equal(h.beat, 0, 'release resets the beat');
  h.setHeld(true); for (let k = 0; k < 3; k++) h.tick(T.pry.hold_duration_per_beat_s + 0.01);
  assert.equal(h.result, 'freed');
  const a = new PryJudge(T.pry, { auto: true });
  for (let k = 0; k < 10 && !a.done; k++) a.tick(0.5);
  assert.equal(a.result, 'freed');
});

test('khoen disabled (feature_khoen off, K0): fight ends with a shove, still sheds the tusk', () => {
  const b = new BossEncounter(boss, T, { khoenEnabled: false });
  assert.equal(b.khoen.state, KhoenState.DISABLED);
  breakOnce(b); assert.equal(b.khoen.cracks, 0); assert.equal(b.canFinish(), false);
  endStagger(b);
  b.receiveHit({ hp: 99999 }); assert.ok(b.canFinish());
  assert.equal(b.beginPry(), null);
  assert.ok(b.shove()); assert.equal(b.outcome, 'shoved');
  assert.deepEqual(b.finishDrops().map((d) => d.item), ['mat_nanh_rung']);
});

test('khoen unit: cap and states', () => {
  const k = new Khoen({ crackStages: 3 });
  for (let i = 0; i < 5; i++) k.onTheBreak();
  assert.equal(k.cracks, 3); assert.equal(k.beginPry(false), false); assert.ok(k.beginPry(true));
  k.abortPry(); assert.equal(k.state, KhoenState.READY);
});

test('enemy attack timelines: telegraph scales, never shortened by speed; hits spread over active', () => {
  const a = boss.attacks.find((x) => x.id === 'll_dam_lay');
  const t = attackTimeline(a, { speedMult: 1.05, telegraphMult: 1.0 });
  close(t.windup, a.windup_s); close(t.hold, a.hold_s);
  const q = boss.attacks.find((x) => x.id === 'll_quat_doi');
  const t2 = attackTimeline(q, { telegraphMult: 1.25 });
  assert.equal(t2.hitTimes.length, 2); close(t2.hitTimes[0], q.windup_s * 1.25);
});

test('every damaging unparryable attack gets the unparryable telegraph (color + audio + shape)', () => {
  for (const e of DATA.enemies.enemies) for (const a of e.attacks) {
    if (!a.parryable && a.damage > 0) {
      assert.equal(telegraphKind(a), 'unparryable', a.id);
      assert.notEqual(a.telegraph.color_cue, 'none'); assert.ok(a.telegraph.audio);
    }
  }
  assert.ok(T.enemy_ai.unparryable_telegraph.includes('audio_cue'));
});

test('movesets respect max delayed attacks per moveset; choice respects cooldown and range', () => {
  for (const p of boss.phases) assert.ok(delayedCount(boss.attacks, p.moveset) <= T.enemy_ai.max_delayed_attacks_per_moveset);
  const ids = boss.phases[0].moveset;
  assert.equal(chooseAttack(boss.attacks, ids, Object.fromEntries(ids.map((i) => [i, 1])), 1), null);
  assert.equal(chooseAttack(boss.attacks, ids, {}, 10, () => 0).id, 'll_can_lay', 'only the charge reaches 10 m');
});

test('attack tokens cap simultaneous attackers', () => {
  const t = new AttackTokens(T.enemy_ai);
  assert.ok(t.tryAcquire('a')); assert.ok(t.tryAcquire('b')); assert.equal(t.tryAcquire('c'), false);
  t.release('a'); assert.equal(t.tryAcquire('a'), false, 'cooldown'); assert.ok(t.tryAcquire('c'));
  t.tick(T.enemy_ai.attack_token_cooldown_s + 0.01); t.release('c'); assert.ok(t.tryAcquire('a'));
});

function close(a, b, eps = 1e-6) { assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`); }
