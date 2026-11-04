// Movement and attack motion (FUN_PASS_0_2 P0-1..P0-3): gaits with inertia, sprint stop skid, pivot,
// lean; 8-way dodge and backstep; lunge with magnetism; swept hits over the active window; hit react;
// prototype-only override of tuning_changes_0_2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA, DATA_02, TUNED } from '../src/data.js';
import { Locomotion, planDodge, dodgeProgress, DodgeChain } from '../src/logic/locomotion.js';
import { motionFor, planLunge, lungeAt, sweepHits, hitReactFor, canSwapNow, isSprintAttack } from '../src/logic/attackMotion.js';

const M = DATA.combat.movement, Dg = DATA.combat.dodge, AM = DATA.combat.attack_motion, HR = DATA.combat.hit_react;
const spear = DATA.weapons.weapons.find((w) => w.id === 'wp_giao_dong');
const axe = DATA.weapons.weapons.find((w) => w.id === 'wp_riu_xeo');
const run = (loco, input, s, dt = 1 / 60) => { let yaw = 0, dist = 0; for (let t = 0; t < s; t += dt) { const r = loco.update(dt, yaw, input); yaw = r.yaw; dist += Math.hypot(r.dx, r.dz); } return { yaw, dist }; };

test('three gaits: walk < run < sprint (data speeds), reached quickly', () => {
  const fwd = { dirX: 0, dirZ: 1, mag: 1 };
  const w = new Locomotion(M); run(w, { ...fwd, walk: true }, 1); assert.ok(Math.abs(w.speed - M.walk_speed_mps) < 1e-6);
  const r = new Locomotion(M); run(r, fwd, 1); assert.ok(Math.abs(r.speed - M.run_speed_mps) < 1e-6);
  const s = new Locomotion(M); run(s, { ...fwd, sprint: true }, 2); assert.ok(Math.abs(s.speed - M.sprint_speed_mps) < 1e-6);
  assert.equal(s.gait, 'sprint'); assert.equal(r.gait, 'run'); assert.equal(w.gait, 'walk');
  const t0 = new Locomotion(M); let t = 0; while (t0.speed < M.run_speed_mps - 1e-6) { t0.update(1 / 120, 0, fwd); t += 1 / 120; }
  assert.ok(t <= 0.2 + 1e-6, `run speed reached in ${t.toFixed(3)} s (<= 0.2)`);
  t = 0; while (t0.speed > 0) { t0.update(1 / 120, 0, { dirX: 0, dirZ: 0, mag: 0 }); t += 1 / 120; }
  assert.ok(t <= 0.15 + 1e-6, `stops in ${t.toFixed(3)} s (<= 0.15)`);
});

test('sprint stop skids for sprint_stop_skid_s; light analog tilt walks; guard walks', () => {
  const s = new Locomotion(M); run(s, { dirX: 0, dirZ: 1, mag: 1, sprint: true }, 1.5);
  s.update(1 / 60, 0, { dirX: 0, dirZ: 0, mag: 0 });
  assert.ok(s.skidT > 0, 'skid started');
  let t = 1 / 60; while (s.speed > 0 && t < 1) { s.update(1 / 60, 0, { dirX: 0, dirZ: 0, mag: 0 }); t += 1 / 60; }
  assert.ok(Math.abs(t - M.sprint_stop_skid_s) < 0.05, `skid ${t.toFixed(3)} s`);
  const a = new Locomotion(M); run(a, { dirX: 0, dirZ: 1, mag: 0.4 }, 1); assert.ok(Math.abs(a.speed - M.walk_speed_mps) < 1e-6);
  const g = new Locomotion(M); run(g, { dirX: 0, dirZ: 1, mag: 1, guard: true, sprint: true }, 1); assert.ok(Math.abs(g.speed - M.guard_walk_speed_mps) < 1e-6);
});

test('turn rate per gait (sprint turns slower) and pivot on a hard reversal; lean into turns', () => {
  const r = new Locomotion(M); run(r, { dirX: 0, dirZ: 1, mag: 1 }, 0.5);
  const yR = r.update(0.05, 0, { dirX: 1, dirZ: 0, mag: 1 }).yaw;
  const s = new Locomotion(M); run(s, { dirX: 0, dirZ: 1, mag: 1, sprint: true }, 1.5);
  const yS = s.update(0.05, 0, { dirX: 1, dirZ: 0, mag: 1, sprint: true }).yaw;
  assert.ok(yR > yS, 'run turns faster than sprint');
  assert.ok(Math.abs(yS - M.sprint_turn_rate_deg_s * Math.PI / 180 * 0.05) < 1e-6);
  const p = new Locomotion(M); run(p, { dirX: 0, dirZ: 1, mag: 1 }, 0.5);
  p.update(1 / 60, 0, { dirX: 0, dirZ: -1, mag: 1 });
  assert.ok(p.pivotT > 0, 'pivot started');
  const l = new Locomotion(M); let yaw = 0, maxLean = 0;
  run(l, { dirX: 0, dirZ: 1, mag: 1 }, 0.5);
  for (let i = 0; i < 20; i++) { yaw = l.update(1 / 60, yaw, { dirX: 1, dirZ: 0.3, mag: 1 }).yaw; maxLean = Math.max(maxLean, Math.abs(l.lean)); }
  assert.ok(maxLean > 0.05, `leans into the turn (${maxLean.toFixed(3)} rad)`);
});

test('lock-on strafe keeps facing the target and uses the strafe speed', () => {
  const l = new Locomotion(M); let yaw = 0;
  for (let i = 0; i < 60; i++) yaw = l.update(1 / 60, yaw, { dirX: 1, dirZ: 0, mag: 1, lockYaw: 0 }).yaw;
  assert.ok(Math.abs(yaw) < 1e-6);
  assert.ok(Math.abs(l.speed - M.lock_on_strafe_speed_mps) < 1e-6);
  assert.ok(l.vx > 0 && Math.abs(l.vz) < 1e-6, 'moves sideways');
});

test('dodge: 8-way relative to the camera, backstep when neutral, longer from a sprint, chain limit', () => {
  const left = planDodge(Dg, { dirX: -1, dirZ: 0.1, mag: 1, camYaw: 0, yaw: 0 });
  assert.ok(Math.abs(left.dirX + 1) < 1e-9 && Math.abs(left.dirZ) < 1e-9, 'snapped to the 8-way grid');
  assert.equal(left.distance, Dg.distance_m); assert.equal(left.faceYaw, Math.atan2(-1, 0));
  const back = planDodge(Dg, { mag: 0, yaw: 0 });
  assert.equal(back.kind, 'backstep'); assert.equal(back.distance, Dg.backstep_distance_m); assert.ok(back.dirZ < 0);
  const spr = planDodge(Dg, { dirX: 0, dirZ: 1, mag: 1, yaw: 0, sprinting: true });
  assert.equal(spr.distance, Dg.sprint_dodge_distance_m);
  const lk = planDodge(Dg, { dirX: 1, dirZ: 0, mag: 1, yaw: 0, locked: true });
  assert.equal(lk.local, 'left'); assert.equal(lk.faceYaw, 0, 'facing kept while locked');
  assert.ok(dodgeProgress(0.1, 0.3, 2) > 0.1 / 0.3, 'ease-out front-loads the distance');
  assert.equal(dodgeProgress(0.3, 0.3, 2), 1);
  const ch = new DodgeChain(Dg);
  ch.start(0); ch.end(0.45); assert.ok(ch.canStart(0.5)); ch.start(0.5);
  assert.ok(!ch.canStart(0.96), 'third dodge in a row waits for the extra recovery');
  assert.ok(ch.canStart(0.5 + Dg.duration_s + Dg.chain_extra_recovery_s + 1e-6));
});

test('attack motion: data lunge, charge / sprint / swap extras, magnetism clamps to the target', () => {
  const l1 = spear.moves.find((m) => m.id === 'sp_l1'), h1 = spear.moves.find((m) => m.id === 'sp_h1');
  assert.equal(motionFor(l1, spear).lungeM, 0.5);
  assert.equal(motionFor(h1, spear, { kind: 'heavy', chargeLevel: 2 }).lungeM, 2.0 + 0.8 * 2);
  const sp = motionFor(l1, spear, { kind: 'sprint' });
  assert.equal(sp.lungeM, 0.5 + spear.sprint_attack.extra_lunge_m); assert.equal(sp.theMult, spear.sprint_attack.the_damage_mult);
  assert.equal(motionFor(axe.moves[0], axe, { kind: 'swap' }).theMult, axe.swap_attack.the_damage_mult);
  // Target 2.4 m away (surface): pulled forward but stops at ~45% of the reach.
  const d = planLunge(0.5, 2.6, 2.4, AM);
  assert.ok(d > 0.5 && d <= 0.5 + AM.magnetism_max_m && Math.abs(2.4 - d - 2.6 * 0.45) < 1e-9);
  assert.equal(planLunge(0.5, 2.6, 0.2, AM), 0, 'already in reach: no step into the target');
  assert.equal(planLunge(0.5, 2.6, 9, AM), 0.5, 'too far: data lunge only');
  assert.equal(planLunge(0.5, 2.6, null, AM), 0.5);
  assert.equal(lungeAt(0, 1, 0.1, 0.3), 0); assert.equal(lungeAt(0.3, 1, 0.1, 0.3), 1); assert.ok(lungeAt(0.2, 1, 0.1, 0.3) > 0.4);
});

test('swept hit: thrust reach grows over the active window; arcs only hit what the blade passed', () => {
  const att = { x: 0, z: 0, yaw: 0 };
  const far = { x: 0, z: 2.4, radius: 0.3 };
  const line = { hitbox: 'line', range: 2.6, arcDeg: 20 };
  assert.equal(sweepHits(att, far, line, 0, 0.05), false, 'not reached at the start of the thrust');
  assert.equal(sweepHits(att, far, line, 0.5, 1), true, 'reached at full extension');
  const arc = { hitbox: 'arc', range: 1.8, arcDeg: 90, sweepDir: -1 }; // right -> left
  const onLeft = { x: 1.0, z: 1.0, radius: 0.3 };   // +x is the attacker's left
  assert.equal(sweepHits(att, onLeft, arc, 0, 0.3), false, 'blade still on the right side');
  assert.equal(sweepHits(att, onLeft, arc, 0.6, 1), true);
  const circle = { hitbox: 'circle', range: 1.9, arcDeg: 360, sweepDir: 1 };
  const behind = { x: 0, z: -1.2, radius: 0.4 };
  let hit = false; for (let u = 0; u < 1; u += 0.1) hit ||= sweepHits(att, behind, circle, u, u + 0.1);
  assert.ok(hit, 'the spin reaches behind');
});

test('hit react: flinch / knockback by weight and species (boss not pushed, mound needs medium+)', () => {
  const crab = DATA.enemies.enemies.find((e) => e.id === 'en_cua_cang_bun').behavior.hit_react;
  const boss = DATA.enemies.enemies.find((e) => e.id === 'boss_lon_loi_dam').behavior.hit_react;
  const mound = DATA.enemies.enemies.find((e) => e.id === 'en_u_bun').behavior.hit_react;
  const l = hitReactFor('light', null, crab, HR), h = hitReactFor('heavy', null, crab, HR);
  assert.ok(h.knockM > l.knockM && h.flinchS > l.flinchS);
  assert.equal(hitReactFor('heavy', null, boss, HR).knockM, 0);
  assert.equal(hitReactFor('light', null, mound, HR).flinchS, 0);
  assert.ok(hitReactFor('medium', null, mound, HR).flinchS > 0);
  assert.ok(hitReactFor('heavy', { knockM: -0.8 }, null, HR).knockM < 0, 'Móc lưỡi pulls');
  assert.equal(hitReactFor('finisher', null, null, HR).knockM, HR.knockback_finisher_m);
});

test('weapon swap allowed when free or in attack recovery; sprint attack needs 0.4 s of sprint', () => {
  const ws = DATA.combat.weapon_swap;
  assert.ok(canSwapNow(ws, 'free', false)); assert.ok(canSwapNow(ws, 'attack', true)); assert.ok(!canSwapNow(ws, 'attack', false)); assert.ok(!canSwapNow(ws, 'dodge', false));
  assert.ok(!isSprintAttack(0.3, AM)); assert.ok(isSprintAttack(0.4, AM));
});

test('tuning_changes_0_2 applied only on the prototype copy (design data untouched)', () => {
  assert.equal(TUNED.skipped.length, 0, JSON.stringify(TUNED.skipped));
  assert.equal(DATA.enemies.enemies.find((e) => e.id === 'boss_lon_loi_dam').hp, 2000, 'ArpgCore-pinned value unchanged');
  assert.equal(DATA_02.enemies.enemies.find((e) => e.id === 'boss_lon_loi_dam').hp, 1600);
  assert.equal(DATA_02.enemies.enemies.find((e) => e.id === 'boss_lon_loi_dam').phases[1].speed_mult, 0.95);
  assert.equal(DATA_02.combat.drum_rhythm.gain.light_hit, 12); assert.equal(DATA.combat.drum_rhythm.gain.light_hit, 8);
  assert.equal(DATA_02.combat.hit_stop.light_s, 0.05);
});
