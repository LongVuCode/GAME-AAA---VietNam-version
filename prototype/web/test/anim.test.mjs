// Procedural animation (src/anim, pure parts): IK reaches the grip, curves/phases, the animator moves
// joints when running, the attack keyframes go anticipation -> extension, the dodge tumbles, foot plants.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveTwoBone, createIkResult } from '../src/anim/ik.js';
import { attackPhase, Spring, Ease } from '../src/anim/curves.js';
import { HumanoidAnimator } from '../src/anim/animator.js';
import { P } from '../src/anim/pose.js';
import { LIB, SKEL } from '../src/anim/humanoidPoses.js';
import { DATA } from '../src/data.js';

test('two-bone IK: the hand lands on a reachable target, elbow bends toward the pole', () => {
  const r = createIkResult();
  solveTwoBone([0, 0, 0], [0.1, -0.3, 0.3], [1, 0, 0], SKEL.upper, SKEL.lower, r);
  assert.ok(!r.clamped);
  assert.ok(Math.hypot(r.hand[0] - 0.1, r.hand[1] + 0.3, r.hand[2] - 0.3) < 1e-6);
  assert.ok(Math.abs(Math.hypot(...r.elbow) - SKEL.upper) < 1e-6);
  assert.ok(r.elbow[0] > 0, 'elbow toward the pole side');
  assert.ok(r.bend > 0 && r.bend < Math.PI);
  // Orthonormal joint frame.
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  assert.ok(Math.abs(dot(r.xAxis, r.yAxis)) < 1e-6 && Math.abs(dot(r.yAxis, r.zAxis)) < 1e-6);
  solveTwoBone([0, 0, 0], [0, 0, 2], [1, 0, 0], SKEL.upper, SKEL.lower, r);
  assert.ok(r.clamped && r.bend < 0.05, 'out of reach: straight arm toward the target');
});

test('attack phases: anticipation -> active -> follow-through -> recovery', () => {
  const tl = { startup: 0.2, active: 0.1, recovery: 0.5 };
  assert.equal(attackPhase(0.1, tl).phase, 'anticipation');
  assert.equal(attackPhase(0.25, tl).phase, 'active');
  assert.equal(attackPhase(0.35, tl).phase, 'follow');
  assert.equal(attackPhase(0.7, tl).phase, 'recovery');
  const s = new Spring(6, 1, 0); s.target = 1; for (let i = 0; i < 120; i++) s.update(1 / 60);
  assert.ok(Math.abs(s.x - 1) < 1e-3);
  assert.ok(Ease.outCubic(0.5) > 0.5 && Ease.inCubic(0.5) < 0.5);
});

const ctx = (o) => ({ state: 'free', stateT: 0, speed: 0, stride: 1.3, lean: 0, pitchLean: 0, localX: 0, localZ: 1, skid: 0, pivot: false,
  attack: { id: 'sp_l1', key: 1, t: 0, tl: null, level: 0, fromCharge: false }, charge: { id: 'sp_h1', t: 0, level: 0 },
  dodge: { n: 1, t: 0, moveT: 0.3, kind: 'roll', local: 'fwd' }, burst: { t: 0, every: 0.6, hits: 4 }, knock: { t: 0, downS: 0.5, upS: 0.8 },
  weaponId: 'wp_giao_dong', finisher: { t: 0, dur: 0.9 }, ...o });

test('running swings the legs (thigh angles change over time, faster gait = bigger swing) and plants feet', () => {
  const a = new HumanoidAnimator(); let plants = 0; a.onFootPlant = () => plants++;
  const samples = [];
  for (let i = 0; i < 60; i++) { const p = a.update(1 / 60, ctx({ speed: 5, stride: 1.3 })); samples.push(p[P.thighLP]); }
  const range = Math.max(...samples) - Math.min(...samples);
  assert.ok(range > 0.6, `thigh swing ${range.toFixed(2)} rad while running`);
  assert.ok(plants >= 3, `foot plants ${plants}`);
  const b = new HumanoidAnimator(); const s2 = [];
  for (let i = 0; i < 60; i++) s2.push(b.update(1 / 60, ctx({ speed: 7.2, stride: 1.9 }))[P.thighLP]);
  assert.ok(Math.max(...s2) - Math.min(...s2) > range, 'sprint swings wider');
  const idle = new HumanoidAnimator(); const s3 = [];
  for (let i = 0; i < 60; i++) s3.push(idle.update(1 / 60, ctx({ speed: 0 }))[P.chestPitch]);
  assert.ok(Math.max(...s3) - Math.min(...s3) > 0.005, 'idle breathing moves the chest');
});

test('every spear / axe move has keyframes; the thrust pulls back then extends past the stance', () => {
  for (const w of DATA.weapons.weapons) for (const m of w.moves) assert.ok(LIB[w.id].moves[m.id], `${w.id} ${m.id} has keyframes`);
  const a = new HumanoidAnimator();
  const l1 = DATA.weapons.weapons[0].moves.find((m) => m.id === 'sp_l1');
  const tl = { startup: l1.startup_s, active: l1.active_s, recovery: l1.recovery_s, total: l1.startup_s + l1.active_s + l1.recovery_s };
  const out = new Float32Array(P.N);
  a.sampleAttack(out, LIB.wp_giao_dong, 'sp_l1', tl.startup, tl); const ant = out[P.wpZ];
  a.sampleAttack(out, LIB.wp_giao_dong, 'sp_l1', tl.startup + tl.active, tl); const hit = out[P.wpZ];
  a.sampleAttack(out, LIB.wp_giao_dong, 'sp_l1', tl.total, tl); const end = out[P.wpZ];
  const stance = LIB.wp_giao_dong.stance[P.wpZ];
  assert.ok(ant < stance && hit > stance + 0.2, `anticipation ${ant.toFixed(2)} < stance ${stance.toFixed(2)} < hit ${hit.toFixed(2)}`);
  assert.ok(Math.abs(end - stance) < 1e-6, 'recovers to the stance');
  // Axe chop: the weapon pitch goes from raised (tip back) to down.
  const ax = DATA.weapons.weapons[1].moves.find((m) => m.id === 'ax_l1');
  const at = { startup: ax.startup_s, active: ax.active_s, recovery: ax.recovery_s };
  a.sampleAttack(out, LIB.wp_riu_xeo, 'ax_l1', at.startup, at); const up = out[P.wpPitch];
  a.sampleAttack(out, LIB.wp_riu_xeo, 'ax_l1', at.startup + at.active, at); const down = out[P.wpPitch];
  assert.ok(up < -1.5 && down > 0.5);
});

test('dodge roll tumbles a full turn in the local direction; backstep does not tumble', () => {
  const roll = (local, kind = 'roll') => { const an = new HumanoidAnimator(); let p; for (let t = 0; t <= 0.15 + 1e-9; t += 1 / 60) p = an.update(1 / 60, ctx({ state: 'dodge', dodge: { n: 2, t, moveT: 0.3, kind, local } })); return p; };
  const mid = roll('fwd');
  assert.ok(mid[P.tumblePitch] > 2.5 && mid[P.tumblePitch] < 3.8, `mid-roll ${mid[P.tumblePitch]}`);
  const side = roll('left');
  assert.ok(Math.abs(side[P.tumbleRoll]) > 2.5);
  const bs = roll('back', 'backstep');
  assert.equal(bs[P.tumblePitch], 0);
});

test('hit reaction is additive and decays back', () => {
  const a = new HumanoidAnimator();
  const base = a.update(1 / 60, ctx({}))[P.chestPitch];
  a.hitReact(1, 0);
  let min = 0; for (let i = 0; i < 6; i++) min = Math.min(min, a.update(1 / 60, ctx({}))[P.chestPitch] - base);
  assert.ok(min < -0.05, 'recoils back');
  for (let i = 0; i < 120; i++) a.update(1 / 60, ctx({}));
  assert.ok(Math.abs(a.update(1 / 60, ctx({}))[P.chestPitch] - base) < 0.04);
});
