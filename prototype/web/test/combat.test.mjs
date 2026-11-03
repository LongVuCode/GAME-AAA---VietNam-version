import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA } from '../src/data.js';
import { Posture } from '../src/logic/posture.js';
import { DefenseController, Outcome } from '../src/logic/defense.js';
import { DrumMeter } from '../src/logic/drum.js';
import { selectMove, chargeLevel, chargeMult, InputBuffer } from '../src/logic/combo.js';
import { playerHitDamage, enemyHitDamage, parryTheDamage, burstHitDamage } from '../src/logic/damage.js';
import { hitStopFor, HitStopClock, shakeFor } from '../src/logic/hitstop.js';
import { resolveDifficulty } from '../src/logic/difficulty.js';

const T = DATA.combat;
const spear = DATA.weapons.weapons.find((w) => w.id === 'wp_giao_dong');
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('posture breaks at max, staggers, regenerates after delay', () => {
  const p = new Posture({ max: 80, regenPerS: 12, regenDelayS: 1.5, staggerS: 2.5 });
  assert.equal(p.applyDamage(50), false);
  p.tick(1.0); close(p.accumulated, 50);           // within delay: no regen
  p.tick(1.0); close(p.accumulated, 50 - 12 * 0.5); // 0.5 s of regen
  assert.equal(p.applyDamage(100), true);
  assert.ok(p.staggered); assert.equal(p.breakCount, 1);
  assert.equal(p.applyDamage(10), false, 'ignored while staggered');
  p.tick(2.4); assert.ok(p.staggered);
  assert.equal(p.tick(0.2), true); assert.ok(!p.staggered); close(p.accumulated, 0);
});

test('posture recovery fraction (boss pry miss: recovers half)', () => {
  const p = new Posture({ max: 320, regenPerS: 10, regenDelayS: 2, staggerS: 3.5 });
  p.applyDamage(400); p.endStaggerWithRecovery(0.5);
  close(p.accumulated, 160); assert.ok(!p.staggered);
  p.setMax(260); close(p.ratio, 0.5);
});

test('dodge i-frames and perfect dodge window follow combat_tuning.dodge', () => {
  const d = new DefenseController(T.dodge, T.guard);
  d.startDodge();
  d.tick(0.03); assert.equal(d.resolve({ parryable: true }), Outcome.HIT, 'before i-frames');
  d.tick(0.05); assert.equal(d.resolve({ parryable: false }), Outcome.PERFECT_DODGE, 'within first 0.10 s of i-frames');
  d.tick(0.10); assert.equal(d.resolve({ parryable: false }), Outcome.DODGED);
  d.tick(0.10); assert.equal(d.resolve({ parryable: true }), Outcome.HIT, 'after i-frames (0.28 s)');
});

test('parry: perfect, normal, unparryable, guard', () => {
  const d = new DefenseController(T.dodge, T.guard);
  d.startParry(); d.tick(0.05);
  assert.equal(d.resolve({ parryable: true, guardable: true }), Outcome.PERFECT_PARRY);
  d.tick(0.05); assert.equal(d.resolve({ parryable: true, guardable: true }), Outcome.PARRIED);
  assert.equal(d.resolve({ parryable: false, guardable: false }), Outcome.HIT, 'unparryable cannot be parried');
  d.tick(0.1); d.setGuardHeld(true);
  assert.equal(d.resolve({ parryable: true, guardable: true }), Outcome.GUARDED);
  assert.equal(d.resolve({ parryable: false, guardable: true }), Outcome.GUARDED, 'Ủi bùn: guardable, not parryable');
  assert.equal(d.resolve({ parryable: false, guardable: false }), Outcome.HIT);
});

test('parry window scales with difficulty / custom window', () => {
  const easy = resolveDifficulty(T, 'diff_nghe_chuyen');
  close(easy.parryWindowS, 0.3);
  const d = new DefenseController(T.dodge, T.guard, easy.parryWindowS);
  close(d.perfectParryWindow, 0.12);
  const c = resolveDifficulty(T, 'diff_cheo_do', { parry_window_s: 0.9, damage_taken_mult: 0.1 });
  close(c.parryWindowS, 0.3); close(c.damageTaken, 0.25); // clamped to custom_ranges
  const hard = resolveDifficulty(T, 'diff_thac_du');
  close(hard.telegraphMult, 1.0); // telegraphs not shortened
});

test('drum rhythm: 4 segments, gains, hit loss keeps full segments, partial decay, burst', () => {
  const m = new DrumMeter(T.drum_rhythm);
  m.gain('perfect_parry'); m.gain('perfect_parry'); m.gain('perfect_parry'); // 120
  assert.equal(m.fullSegments, 1);
  m.hitTaken(); close(m.points, 100, 1e-9); // 120-30 floors at the full segment
  m.gain('light_hit'); m.tick(T.drum_rhythm.decay_delay_s + 0.5); close(m.points, 108 - 5);
  m.tick(10); close(m.points, 100);
  assert.equal(m.canBurst(), false);
  for (let i = 0; i < 8; i++) m.gain('the_break');
  assert.equal(m.fullSegments, 4); assert.ok(m.tryBurst()); close(m.points, 0);
  const bonus = new DrumMeter(T.drum_rhythm, { perfectParryBonus: 15 });
  assert.equal(bonus.gain('perfect_parry'), 55);
  assert.throws(() => m.gain('nope'));
});

test('combo: chain, wrap, 4th hit needs skill, branch after pause, dodge attack, counter, house move', () => {
  const it = T.input; const l1 = spear.moves.find((m) => m.id === 'sp_l1');
  const l2 = spear.moves.find((m) => m.id === 'sp_l2'); const l3 = spear.moves.find((m) => m.id === 'sp_l3');
  const base = { inputTuning: it, maxChain: 3 };
  assert.equal(selectMove(spear, 'L', { ...base, now: 0 }).move.id, 'sp_l1');
  assert.equal(selectMove(spear, 'L', { ...base, now: 1.1, lastMove: l1, lastMoveEnd: 1.0, chainIndex: 1 }).move.id, 'sp_l2');
  assert.equal(selectMove(spear, 'L', { ...base, now: 2.0, lastMove: l1, lastMoveEnd: 1.0, chainIndex: 1 }).move.id, 'sp_l1', 'window expired');
  assert.equal(selectMove(spear, 'L', { ...base, now: 1.1, lastMove: l3, lastMoveEnd: 1.0, chainIndex: 3 }).move.id, 'sp_l1', 'wraps without skill');
  assert.equal(selectMove(spear, 'L', { ...base, maxChain: 4, now: 1.1, lastMove: l3, lastMoveEnd: 1.0, chainIndex: 3 }).move.id, 'sp_l4');
  assert.equal(selectMove(spear, 'H', { ...base, now: 1.4, lastMove: l2, lastMoveEnd: 1.0, chainIndex: 2 }).kind, 'branch');
  assert.equal(selectMove(spear, 'H', { ...base, now: 1.1, lastMove: l2, lastMoveEnd: 1.0, chainIndex: 2 }).kind, 'heavy', 'no pause');
  assert.equal(selectMove(spear, 'H', { ...base, now: 1.4, lastMove: l1, lastMoveEnd: 1.0, chainIndex: 1 }).kind, 'heavy', 'needs L,L');
  assert.equal(selectMove(spear, 'L', { ...base, now: 1.0, afterDodgeUntil: 1.2 }).move.id, 'sp_d1');
  assert.equal(selectMove(spear, 'L', { ...base, now: 1.0, perfectParryUntil: 1.5 }).move.id, 'sp_c1');
  const hm = DATA.lineage.house_moves[0];
  assert.equal(selectMove(spear, 'H', { ...base, now: 1.0, perfectParryUntil: 1.5, houseMove: hm }).kind, 'house');
  assert.equal(selectMove(spear, 'H', { ...base, now: 1.0, perfectParryUntil: 1.5 }).kind, 'heavy', 'house move not learned');
});

test('heavy charge levels and multiplier', () => {
  const h = spear.moves.find((m) => m.id === 'sp_h1');
  assert.equal(chargeLevel(h, 0.2, T.input, false), 0);
  assert.equal(chargeLevel(h, 0.7, T.input, false), 1);
  assert.equal(chargeLevel(h, 1.3, T.input, false), 1, 'level 2 needs Gồng sức');
  assert.equal(chargeLevel(h, 1.3, T.input, true), 2);
  close(chargeMult(h, 2), 2.0);
});

test('input buffer expires after buffer_s', () => {
  const b = new InputBuffer(T.input.buffer_s);
  b.push('L', 1.0); assert.equal(b.consume(1.1).type, 'L');
  b.push('L', 1.0); assert.equal(b.consume(1.2), null);
});

test('damage: front shell, Bảo khí on heavy/branch only, skill mods, difficulty', () => {
  const h = spear.moves.find((m) => m.id === 'sp_h1'); const l1 = spear.moves.find((m) => m.id === 'sp_l1');
  const diff = resolveDifficulty(T, 'diff_cheo_do');
  const bk = { applies_to: 'heavy_and_branch', value: 0.15 };
  const a = playerHitDamage({ move: h, chargeLevel: 0, kind: 'heavy', difficulty: diff, mods: { theMult: 0 }, baoKhi: bk });
  close(a.the, 28 * 1.15); close(a.hp, 40);
  const b = playerHitDamage({ move: l1, kind: 'chain', difficulty: diff, mods: { theMult: 0.1 }, baoKhi: bk, frontal: true, frontMult: 0.6 });
  close(b.hp, 20 * 0.6); close(b.the, 8 * 1.1 * 0.6);
  const c = playerHitDamage({ move: l1, kind: 'chain', difficulty: diff, mods: { theMult: 0, postPerfectDodgeTheMult: 2 }, postPerfectDodge: true });
  close(c.the, 16);
  const atk = DATA.enemies.enemies[0].attacks[0];
  close(enemyHitDamage(atk, Outcome.HIT, T.guard, diff).hp, atk.damage);
  const g = enemyHitDamage(atk, Outcome.GUARDED, T.guard, diff);
  close(g.hp, atk.damage * 0.3); close(g.the, atk.player_the_damage);
  assert.equal(enemyHitDamage(atk, Outcome.PERFECT_PARRY, T.guard, diff).hp, 0);
  assert.equal(parryTheDamage(Outcome.PERFECT_PARRY, T.guard), 40);
  assert.equal(parryTheDamage(Outcome.PARRIED, T.guard), 20);
  close(burstHitDamage(spear.drum_burst, diff, {}).the, 30);
});

test('hit-stop by weight and clock', () => {
  assert.equal(hitStopFor(T.hit_stop, 'light'), 0.04);
  assert.equal(hitStopFor(T.hit_stop, 'pry_release'), 0.12);
  assert.throws(() => hitStopFor(T.hit_stop, 'huge'));
  const c = new HitStopClock(0);
  c.trigger(0.1); c.trigger(0.05);
  close(c.advance(0.06), 0); close(c.advance(0.06), 0.02);
  assert.ok(shakeFor(T.camera_shake, 'heavy') <= T.camera_shake.max_amplitude);
});
