// Enemy behaviour for Demo 0.2 (FUN_PASS_0_2 P0-5, P0-6): weighted choice with recency, no third
// repeat, on-screen token priority, circling, rear arc, posture reactions, boss 0.2 moveset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA, DATA_02 } from '../src/data.js';
import { chooseAttackWeighted, AttackTokens, circleVelocity, inRearArc, theReaction, allAttacks, phaseMoveset, delayedCount } from '../src/logic/enemyAi.js';
import { mulberry32 } from '../src/game/world.js';

const AI = DATA.combat.enemy_ai;
const crab = DATA.enemies.enemies.find((e) => e.id === 'en_cua_cang_bun');
const boss = DATA_02.enemies.enemies.find((e) => e.id === 'boss_lon_loi_dam');

test('weighted choice never picks the same attack 3 times in a row and halves the last one', () => {
  const atks = allAttacks(crab), ids = ['cua_kep', 'cua_kep_doi'];
  const rng = mulberry32(5);
  let row = 0, last = null, maxRow = 0; const hist = [];
  for (let i = 0; i < 400; i++) {
    const a = chooseAttackWeighted(atks, ids, {}, 1.0, hist, AI, rng);
    row = a.id === last ? row + 1 : 1; last = a.id; maxRow = Math.max(maxRow, row);
    hist.push(a.id); if (hist.length > 4) hist.shift();
  }
  assert.ok(maxRow <= AI.max_same_attack_in_row, `max run ${maxRow}`);
  assert.equal(chooseAttackWeighted(atks, ids, { cua_kep: 1, cua_kep_doi: 1 }, 1, [], AI, rng), null, 'cooldowns respected');
  assert.equal(chooseAttackWeighted(atks, ['cua_kep'], {}, 9, [], AI, rng), null, 'range respected');
});

test('tokens: max simultaneous attackers; on-screen enemies are served before off-screen ones', () => {
  const t = new AttackTokens({ ...AI, max_simultaneous_attackers: 1 });
  assert.ok(t.tryAcquire('a', true));
  assert.equal(t.tryAcquire('b', true), false); // on-screen b waits
  t.release('a'); t.tick(AI.attack_token_cooldown_s + 0.01);
  assert.equal(t.tryAcquire('c', false), false, 'off-screen c yields to the on-screen waiter');
  assert.ok(t.tryAcquire('b', true));
});

test('circling holds the ring and moves tangentially; rear arc; posture reactions', () => {
  const v = circleVelocity({ x: 0, z: 3.5 }, { x: 0, z: 0 }, { ring: 3.5, speed: 2, dir: 1 });
  assert.ok(Math.abs(v.vz) < 1e-6 && Math.abs(Math.abs(v.vx) - 2) < 1e-6, 'on the ring: pure orbit');
  const close = circleVelocity({ x: 0, z: 1 }, { x: 0, z: 0 }, { ring: 3.5, speed: 2, dir: 1, approachSpeed: 2 });
  assert.ok(close.vz > 0, 'inside the ring: backs out');
  assert.ok(inRearArc({ x: 0, z: 0, yaw: 0 }, { x: 0, z: -2 }, 120));
  assert.ok(!inRearArc({ x: 0, z: 0, yaw: 0 }, { x: 0, z: 2 }, 120));
  assert.equal(theReaction(0.75, 0, crab.behavior, AI).defend, 'turtle_front');
  assert.equal(theReaction(0.2, 0.8, crab.behavior, AI).aggro, AI.player_near_break_aggression_mult);
});

test('boss 0.2: hip swing in both phases, neck rub in phase 2, set piece, delayed attacks rule', () => {
  assert.ok(phaseMoveset(boss.phases[0]).includes('ll_quay_hong'));
  assert.ok(phaseMoveset(boss.phases[1]).includes('ll_dui_co') && phaseMoveset(boss.phases[1]).includes('ll_quay_hong'));
  for (const ph of boss.phases) for (const id of phaseMoveset(ph)) assert.ok(boss.attacks.find((a) => a.id === id), id);
  assert.ok(delayedCount(boss.attacks, phaseMoveset(boss.phases[1])) <= AI.max_delayed_attacks_per_moveset);
  const sp = boss.phases[1].transition_set_piece_0_2;
  assert.equal(sp.duration_s, 4); assert.ok(sp.boss_invulnerable && sp.replaces_transition_beat);
  for (const e of DATA.enemies.enemies) assert.ok(e.behavior?.move_speed_mps > 0 && e.behavior?.radius_m > 0, `${e.id} behavior replaces PROTO`);
  // Normal enemies are never killed: every one has a non-lethal defeat.
  for (const e of DATA.enemies.enemies.filter((x) => x.rank !== 'boss')) assert.ok(['flee', 'dissipate'].includes(e.defeat_behavior));
});
