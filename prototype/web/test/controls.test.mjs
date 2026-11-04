// Data-driven controls (design/data/controls.json): defaults, aliases, remap with conflict swap,
// persistence round-trip, pad presets, glyphs, hold/toggle latches and sprint modes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA } from '../src/data.js';
import { Bindings, keyLabel, padLabel, padStyleFromId, ModeLatch, SprintControl, sprintModeFor, glyphDevice } from '../src/logic/controls.js';

const C = DATA.controls;

test('defaults follow controls.json (Shift sprint, Caps walk, Space dodge, Q parry, RMB heavy, F burst, E interact, R heal, 1/2 swap)', () => {
  const b = new Bindings(C);
  assert.deepEqual(b.kbmFor('sprint'), ['ShiftLeft']);
  assert.deepEqual(b.kbmFor('walk'), ['CapsLock']);
  assert.deepEqual(b.kbmFor('dodge'), ['Space']);
  assert.deepEqual(b.kbmFor('parry'), ['KeyQ']);
  assert.deepEqual(b.kbmFor('attack_light'), ['Mouse0']);
  assert.deepEqual(b.kbmFor('attack_heavy'), ['Mouse2']);
  assert.deepEqual(b.kbmFor('drum_burst'), ['KeyF']);
  assert.deepEqual(b.kbmFor('interact'), ['KeyE']);
  assert.deepEqual(b.kbmFor('heal'), ['KeyR']);
  assert.deepEqual(b.kbmFor('weapon_slot_1'), ['Digit1']);
  assert.deepEqual(b.kbmFor('lock_on'), ['Mouse1', 'Tab']);
  assert.deepEqual([b.kbmFor('move_up'), b.kbmFor('move_left'), b.kbmFor('move_down'), b.kbmFor('move_right')].flat(), ['KeyW', 'KeyA', 'KeyS', 'KeyD']);
  assert.deepEqual(b.padFor('dodge'), [1]); assert.deepEqual(b.padFor('sprint'), [10]); assert.deepEqual(b.padFor('heal'), [12]);
  assert.equal(b.conflicts('kbm').length, 0); assert.equal(b.conflicts('pad').length, 0);
});

test('shared inputs are aliases: guard -> parry, call_name / pry_beat -> interact', () => {
  const b = new Bindings(C);
  assert.equal(b.resolve('guard'), 'parry');
  assert.equal(b.resolve('call_name'), 'interact');
  assert.equal(b.resolve('pry_beat'), 'interact');
  assert.deepEqual(b.kbmFor('call_name'), ['KeyE']);
  b.assign('kbm', 'interact', 0, 'KeyG');
  assert.deepEqual(b.kbmFor('call_name'), ['KeyG'], 'alias follows its parent');
});

test('remap: conflict swaps the two actions; reserved keys refused; reset restores', () => {
  const b = new Bindings(C);
  const r = b.assign('kbm', 'dodge', 0, 'KeyQ'); // Q belonged to parry
  assert.ok(r.ok); assert.deepEqual(r.conflict, { action: 'parry', slot: 0 });
  assert.deepEqual(b.kbmFor('dodge'), ['KeyQ']);
  assert.deepEqual(b.kbmFor('parry'), ['Space'], 'parry received the old dodge key');
  assert.deepEqual(b.actionsForKbm('KeyQ'), ['dodge']);
  assert.equal(b.conflicts('kbm').length, 0);
  assert.equal(b.assign('kbm', 'dodge', 0, 'Escape').ok, false);
  assert.equal(b.assign('kbm', 'menu', 0, 'KeyP').ok, false, 'Esc / menu is not remappable');
  const p = b.assign('pad', 'attack_light', 0, 1); // B belonged to dodge
  assert.ok(p.ok); assert.equal(p.conflict.action, 'dodge'); assert.deepEqual(b.padFor('dodge'), [2]);
  assert.equal(b.assign('pad', 'move_up', 0, 3).ok, false, 'stick axes are fixed');
  b.reset();
  assert.deepEqual(b.kbmFor('dodge'), ['Space']); assert.deepEqual(b.padFor('dodge'), [1]);
});

test('second keyboard slot and moving a key between slots of one action', () => {
  const b = new Bindings(C);
  b.assign('kbm', 'sprint', 1, 'ShiftRight');
  assert.deepEqual(b.kbmFor('sprint'), ['ShiftLeft', 'ShiftRight']);
  b.assign('kbm', 'sprint', 0, 'ShiftRight');
  assert.deepEqual(b.kbm.sprint, ['ShiftRight', null]);
});

test('persistence: toJSON / load round-trip; garbage and conflicting saves fall back to defaults', () => {
  const b = new Bindings(C);
  b.assign('kbm', 'heal', 0, 'KeyH'); b.assign('pad', 'heal', 0, 13);
  const saved = JSON.parse(JSON.stringify(b.toJSON()));
  const b2 = new Bindings(C);
  assert.ok(b2.load(saved));
  assert.deepEqual(b2.kbmFor('heal'), ['KeyH']); assert.deepEqual(b2.padFor('heal'), [13]);
  assert.equal(new Bindings(C).load({ v: 99 }), false);
  const bad = new Bindings(C);
  assert.equal(bad.load({ v: 1, kbm: { dodge: ['KeyQ', null], parry: ['KeyQ', null] } }), false);
  assert.deepEqual(bad.kbmFor('dodge'), ['Space']);
});

test('pad preset "shoulder" moves attacks to RB/RT, burst to LT, heal to X', () => {
  const b = new Bindings(C);
  assert.ok(b.applyPadPreset('preset_shoulder'));
  assert.deepEqual(b.padFor('attack_light'), [5]); assert.deepEqual(b.padFor('attack_heavy'), [7]);
  assert.deepEqual(b.padFor('drum_burst'), [6]); assert.deepEqual(b.padFor('heal'), [2]);
  assert.equal(b.conflicts('pad').length, 0);
});

test('glyphs: key names from data, letters/digits/arrows derived, pad glyph per style', () => {
  assert.equal(keyLabel('Space', 'vi', C.key_names), 'Phím cách');
  assert.equal(keyLabel('Mouse2', 'en', C.key_names), 'Right mouse');
  assert.equal(keyLabel('KeyQ', 'vi', C.key_names), 'Q');
  assert.equal(keyLabel('Digit2', 'vi', C.key_names), '2');
  assert.equal(keyLabel('ArrowLeft', 'vi', C.key_names), '←');
  assert.equal(padLabel(1, 'xbox', C.pad_buttons), 'B');
  assert.equal(padLabel(1, 'playstation', C.pad_buttons), '○');
  assert.equal(padStyleFromId('Sony DualSense (Vendor: 054c Product: 0ce6)'), 'playstation');
  assert.equal(padStyleFromId('Xbox 360 Controller (XInput STANDARD GAMEPAD)'), 'xbox');
  assert.deepEqual(glyphDevice('auto', 'pad', 'playstation'), { device: 'pad', padStyle: 'playstation' });
  assert.equal(glyphDevice('keyboard', 'pad', 'xbox').device, 'kbm');
});

test('latches: hold vs toggle', () => {
  const l = new ModeLatch();
  assert.equal(l.update('hold', true, true), true); assert.equal(l.update('hold', false, false), false);
  assert.equal(l.update('toggle', true, true), true); assert.equal(l.update('toggle', false, false), true);
  assert.equal(l.update('toggle', true, true), false);
});

test('sprint modes: hold, toggle (ends when the stick is released), auto after a delay; needs move ratio', () => {
  const s = new SprintControl();
  assert.equal(s.update(0.016, { mode: 'hold', down: true, moveMag: 1 }), true);
  assert.equal(s.update(0.016, { mode: 'hold', down: true, moveMag: 0.3, minRatio: 0.6 }), false, 'light tilt cannot sprint');
  assert.equal(s.update(0.016, { mode: 'toggle', pressed: true, moveMag: 1 }), true);
  assert.equal(s.update(0.016, { mode: 'toggle', moveMag: 1 }), true, 'stays on without holding');
  s.update(0.016, { mode: 'toggle', moveMag: 0 });
  assert.equal(s.update(0.016, { mode: 'toggle', moveMag: 1 }), false, 'released stick ends the toggle');
  const a = new SprintControl();
  assert.equal(a.update(0.3, { mode: 'auto', moveMag: 1, autoDelayS: 0.6 }), false);
  assert.equal(a.update(0.4, { mode: 'auto', moveMag: 1, autoDelayS: 0.6 }), true);
  assert.equal(sprintModeFor('device', 'kbm', C), 'hold');
  assert.equal(sprintModeFor('device', 'pad', C), 'toggle');
  assert.equal(sprintModeFor('auto', 'kbm', C), 'auto');
});
