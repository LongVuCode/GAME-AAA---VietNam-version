// fx.test.mjs - pure logic of the FX module (src/fx/logic.js): particle pool (fixed, recycled, no
// growth), slow-mo time scale contract (game step only, real-time duration, pry clock untouched),
// camera shake decay/bounds/opt-out, FOV kick decay, impact/footstep/sound profiles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA } from '../src/data.js';
import { ParticlePool, TimeScale, gameStep, CameraShake, FovKick, impactSpec, footstepSpec, impactSoundSpec, vary, WEIGHTS, SURFACES, strideFor } from '../src/fx/logic.js';
import { HitStopClock, hitStopFor, shakeFor } from '../src/logic/hitstop.js';
import { PryJudge } from '../src/logic/shackle.js';

const T = DATA.combat;
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const spawnN = (p, n, life = 1) => { for (let i = 0; i < n; i++) p.spawn(0, 1, 0, 1, 0, 0, life, 0.1, 0.2, 1, 1, 1, 1); };

test('particle pool: fixed capacity, recycles the oldest, never reallocates', () => {
  const p = new ParticlePool(8);
  const arrays = [p.pos, p.vel, p.color, p.size, p.alpha, p.life];
  spawnN(p, 8); assert.equal(p.active, 8); assert.equal(p.recycled, 0);
  spawnN(p, 5);                                   // full: overwrite 5 oldest
  assert.equal(p.active, 8); assert.equal(p.recycled, 5); assert.equal(p.spawnedTotal, 13);
  for (let k = 0; k < 100; k++) { spawnN(p, 3); p.step(1 / 60); }
  assert.ok(p.active <= 8);
  [p.pos, p.vel, p.color, p.size, p.alpha, p.life].forEach((a, i) => assert.equal(a, arrays[i], 'same typed array (no allocation)'));
});

test('particle pool: step integrates, expires and zeroes dead slots', () => {
  const p = new ParticlePool(4);
  const i = p.spawn(0, 2, 0, 2, 0, 0, 0.5, 0.1, 0.3, 1, 1, 1, 1, 0, 10);
  p.step(0.1);
  assert.ok(p.pos[i * 3] > 0.19 && p.pos[i * 3] < 0.21, 'moved along x');
  assert.ok(p.vel[i * 3 + 1] < 0, 'gravity pulls down');
  assert.ok(p.alpha[i] > 0 && p.size[i] > 0.1);
  p.step(0.5);
  assert.equal(p.active, 0); assert.equal(p.alpha[i], 0); assert.equal(p.size[i], 0);
  assert.equal(p.step(0), 0, 'dt 0 (paused) is a no-op');
});

test('particle pool: ground contact sticks and shortens life; limit kills extra slots', () => {
  const p = new ParticlePool(16);
  const i = p.spawn(0, 0.5, 0, 0, -10, 0, 3, 0.1, 0.1, 1, 1, 1, 1, 0, 0, 0.02);
  p.step(0.1);
  close(p.pos[i * 3 + 1], 0.02); assert.ok(p.life[i] <= 0.25);
  spawnN(p, 15);
  p.setLimit(4);
  assert.ok(p.active <= 4); assert.equal(p.limit, 4);
  for (let k = 4; k < 16; k++) assert.equal(p.life[k], 0);
  spawnN(p, 10); assert.ok(p.cursor < 4);
});

test('time scale: slow-mo lasts its duration in REAL time, then eases back to 1', () => {
  const s = new TimeScale({ releaseS: 0.1 });
  s.slowMo(0.25, 0.2);
  assert.equal(s.value, 0.25);
  let real = 0;
  while (real < 0.19) { s.advance(1 / 60); real += 1 / 60; }
  assert.equal(s.value, 0.25, 'held for the duration (real seconds)');
  s.advance(0.05); assert.ok(s.value > 0.25 && s.value < 1, 'easing back');
  s.advance(0.2); assert.equal(s.value, 1);
});

test('time scale: overlapping requests keep the slowest scale and the longest end', () => {
  const s = new TimeScale({ releaseS: 0 });
  s.slowMo(0.4, 0.5); s.advance(0.1);
  s.slowMo(0.25, 0.1);
  assert.equal(s.value, 0.25);
  s.advance(0.2); assert.equal(s.value, 0.25, 'longest end (0.4 s left of the first) kept');
  s.advance(0.25); assert.equal(s.value, 1);
  s.slowMo(2, 1); assert.equal(s.value, 1, 'scale is clamped to <= 1');
  s.enabled = false; s.reset(); s.slowMo(0.1, 1); assert.equal(s.value, 1, 'disabled: no slow-mo');
});

test('QA S2 contract: slow-mo scales only the game step; the pry judge on real time still hits every beat', () => {
  // 60 Hz loop: real time drives the pry judge; game time = hit-stop then slow-mo. Each pry hit
  // triggers hit-stop AND a strong slow-mo (worst case). The judge must still free on all 3 beats.
  const j = new PryJudge(T.pry); const hs = new HitStopClock(0); const ts = new TimeScale();
  const presses = [0, 1, 2].map((n) => j.slotTime(n));
  let real = 0, game = 0; const step = 1 / 60;
  while (!j.done && real < 5) {
    game += gameStep(step, hs, ts);
    ts.advance(step);
    const before = j.t; real += step;
    const p = presses.find((x) => x > real - step && x <= real);
    if (p !== undefined) {
      j.tick(p - before);
      for (const e of j.press()) if (e.type === 'hit') { hs.trigger(hitStopFor(T.hit_stop, 'pry_beat')); ts.slowMo(0.2, 0.3); }
      j.tick(real - p);
    } else j.tick(step);
  }
  assert.equal(j.result, 'freed');
  assert.ok(game < real - 0.5, `game time (${game.toFixed(2)}) ran slower than real (${real.toFixed(2)})`);
});

test('gameStep composes hit-stop then time scale', () => {
  const hs = new HitStopClock(0); const ts = new TimeScale();
  close(gameStep(0.1, hs, ts), 0.1);
  ts.slowMo(0.5, 1); close(gameStep(0.1, hs, ts), 0.05);
  hs.trigger(0.04); close(gameStep(0.1, hs, ts), 0.03);
  close(gameStep(0.1, hs, null), 0.1);
});

test('camera shake: bounded by amplitude and max, decays to zero, honours the opt-out', () => {
  const amp = shakeFor(T.camera_shake, 'heavy');
  const s = new CameraShake({ maxAmplitude: T.camera_shake.max_amplitude });
  assert.ok(s.add(amp, 0.25));
  let peak = 0;
  for (let t = 0; t < 0.25; t += 1 / 120) { s.update(1 / 120); peak = Math.max(peak, Math.hypot(s.x, s.y)); assert.ok(Math.abs(s.x) <= amp + 1e-9 && Math.abs(s.y) <= amp + 1e-9); }
  assert.ok(peak > 0);
  s.update(0.05); assert.equal(s.x, 0); assert.equal(s.y, 0); assert.equal(s.roll, 0);
  s.add(99, 1); s.update(0.001); assert.ok(Math.abs(s.x) <= T.camera_shake.max_amplitude + 1e-9, 'clamped to max_amplitude');
  // A weaker shake does not cut a stronger one short.
  const s2 = new CameraShake(); s2.add(0.3, 0.5); s2.update(0.05); assert.equal(s2.add(0.05, 0.2), false);
  // Opt-out: no offset at all.
  const off = new CameraShake(); off.enabled = false; assert.equal(off.add(0.3, 0.3), false); off.update(0.016);
  assert.equal(off.x, 0); assert.equal(off.y, 0);
  const on = new CameraShake(); on.add(0.3, 0.3); on.enabled = false; on.update(0.016); assert.equal(on.x, 0, 'turning the option off stops a running shake');
});

test('fov kick: transient kicks return to 0; sustained offsets are smoothed and removable', () => {
  const f = new FovKick({ smoothS: 0.1 });
  f.kick(4, 0.2); f.update(0.03); assert.ok(f.value > 0);
  for (let i = 0; i < 20; i++) f.update(0.02);
  close(f.value, 0);
  f.setOffset('sprint', 6); for (let i = 0; i < 60; i++) f.update(0.02);
  close(f.value, 6, 0.01);
  f.setOffset('sprint', 0); for (let i = 0; i < 60; i++) f.update(0.02);
  close(f.value, 0, 0.01);
  f.kick(100, 0.5); f.update(0.06); assert.ok(f.value <= 15);
  const off = new FovKick(); off.enabled = false; off.kick(5, 1); off.update(0.05); assert.equal(off.value, 0);
});

test('impact / footstep / sound profiles cover every weight and surface; unknown values fall back', () => {
  for (const w of WEIGHTS) for (const s of SURFACES) {
    const v = impactSpec(w, s); assert.equal(v.weight, w); assert.equal(v.surface, s);
    assert.ok(v.sparks >= 0 && v.dust >= 0 && v.flare > 0);
    const a = impactSoundSpec(w, s); assert.ok(a.gain > 0 && a.pitch > 0 && ['bronze', 'wood', 'mud', 'water', 'flesh'].includes(a.body));
  }
  assert.ok(impactSpec('perfect_parry', 'bronze').sparks > impactSpec('parry', 'bronze').sparks);
  assert.ok(impactSpec('heavy', 'flesh').dust > impactSpec('light', 'flesh').dust);
  assert.equal(impactSpec('pry_beat', 'bronze').flash, 0, 'the pry has no screen flash (art direction 3.4)');
  assert.equal(impactSpec('freed', 'bronze').flash, 0, 'the release is calm (no flash)');
  assert.equal(impactSpec('???', '???').weight, 'light');
  assert.equal(impactSpec('heavy', 'water').ripple, true);
  assert.ok(footstepSpec('water', 7).count > footstepSpec('water', 2).count, 'sprint splashes more');
  assert.equal(footstepSpec('lava', 5).kind, 'dirt');
  assert.ok(strideFor(7) > strideFor(5) && strideFor(5) > strideFor(2));
});

test('sound variation stays within +/- pct', () => {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 2000; i++) { const v = vary(100, 0.06); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  assert.ok(lo >= 94 && hi <= 106 && hi - lo > 6);
  close(vary(10, 0.1, () => 0.5), 10);
});
