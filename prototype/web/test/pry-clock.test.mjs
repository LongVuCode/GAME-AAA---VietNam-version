import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { PryJudge } from '../src/logic/shackle.js';
import { DATA } from '../src/data.js';

test('slow render frames preserve elapsed pry time while simulation and UI remain clamped', () => {
  let args;
  const g = {
    lastNow: performance.now() - 1200, fpsFrames: [], mode: 'playing',
    input: { pollGamepad() {}, endFrame() {} },
    update(...a) { args = a; }, ui: { tick() {} }, render() {},
  };
  Game.prototype.frame.call(g);
  assert.ok(args[0] < 0.5);
  assert.equal(args[2], 0.5);
  assert.ok(args[3] >= 1.2, 'pry receives actual elapsed time, matching keyboard timestamps');
});

test('on-time pry input survives delivery after a render frame longer than 0.5 seconds', () => {
  const judge = new PryJudge(DATA.combat.pry);
  const centre = judge.slotTime(0);
  const elapsed = centre + 0.6;
  const g = {
    pry: { judge, boss: {} }, _prevFrameS: elapsed, frameStart: 0,
    i18n: { t: x => x }, data: DATA,
    sfx: { drum() {} }, fxh: { pryDrum() {}, pryBeat() {} },
    hitstop: { trigger() {} }, shake() {}, input: { rumble() {} },
    player: { anim: { pryBeat() {} }, drum: { gain() {} } },
    story: { bark() {} }, ui: { pryWidget() {} },
  };
  g.pry.boss.mesh = { cracks: [] };
  // The key arrives on the next frame, but its timestamp is still the slot centre.
  Game.prototype.updatePry.call(g, elapsed, {
    pressed: () => true, pressedAt: () => centre * 1000,
  });
  assert.equal(judge.beat, 1);
  assert.equal(judge.t, elapsed);
  assert.equal(judge.window, DATA.combat.pry.beat_window_s, 'timing window unchanged');
});
