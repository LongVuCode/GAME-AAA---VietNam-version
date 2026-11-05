// Data-driven controls (design/data/controls.json): defaults, aliases, remap with conflict swap,
// persistence round-trip, pad presets, glyphs, hold/toggle latches and sprint modes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA } from '../src/data.js';
import { Bindings, keyLabel, padLabel, padStyleFromId, ModeLatch, SprintControl, sprintModeFor, glyphDevice, applyScheme03, ModifierLatch } from '../src/logic/controls.js';
import { DATA_02 } from '../src/data.js';

const C = DATA.controls;

test('defaults follow controls.json + scheme_0_3 (Shift sprint, Caps walk, C dodge, Space jump, Q parry, RMB heavy, F burst, E interact, R heal, 1/2 swap)', () => {
  const b = new Bindings(C);
  assert.deepEqual(b.kbmFor('sprint'), ['ShiftLeft']);
  assert.deepEqual(b.kbmFor('walk'), ['CapsLock']);
  assert.deepEqual(b.kbmFor('dodge'), ['KeyC']);
  assert.deepEqual(b.kbmFor('jump'), ['Space']);
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
  assert.deepEqual(b.padFor('jump'), [0]); assert.deepEqual(b.padFor('interact'), [5]);
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
  assert.deepEqual(b.kbmFor('parry'), ['KeyC'], 'parry received the old dodge key');
  assert.deepEqual(b.actionsForKbm('KeyQ'), ['dodge']);
  assert.equal(b.conflicts('kbm').length, 0);
  assert.equal(b.assign('kbm', 'dodge', 0, 'Escape').ok, false);
  assert.equal(b.assign('kbm', 'menu', 0, 'KeyP').ok, false, 'Esc / menu is not remappable');
  const p = b.assign('pad', 'attack_light', 0, 1); // B belonged to dodge
  assert.ok(p.ok); assert.equal(p.conflict.action, 'dodge'); assert.deepEqual(b.padFor('dodge'), [2]);
  assert.equal(b.assign('pad', 'move_up', 0, 3).ok, false, 'stick axes are fixed');
  b.reset();
  assert.deepEqual(b.kbmFor('dodge'), ['KeyC']); assert.deepEqual(b.padFor('dodge'), [1]);
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
  assert.deepEqual(bad.kbmFor('dodge'), ['KeyC']);
  const old02 = new Bindings(C);
  assert.equal(old02.load({ v: 1, kbm: { dodge: ['Space', null] }, pad: {} }), false, 'a 0.2 save (Space = dodge) is dropped once');
  assert.deepEqual(old02.kbmFor('jump'), ['Space']);
});

test('pad preset "shoulder" (0.3) moves attacks to RB/RT, burst to Y, interact to X; Weapon Arts follow the attack buttons', () => {
  const b = new Bindings(C);
  assert.ok(b.applyPadPreset('preset_shoulder'));
  assert.deepEqual(b.padFor('attack_light'), [5]); assert.deepEqual(b.padFor('attack_heavy'), [7]);
  assert.deepEqual(b.padFor('drum_burst'), [3]); assert.deepEqual(b.padFor('interact'), [2]); assert.deepEqual(b.padFor('heal'), [12]);
  assert.deepEqual(b.padComboFor('skill_1'), { modifier: 6, button: 5 }); assert.deepEqual(b.padComboFor('skill_2'), { modifier: 6, button: 7 });
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

test('scheme_0_3 merge: jump on Space / A, dodge on C / B, interact on RB, Pack B, Map M, Arts 3/4 + LT, no conflicts', () => {
  const m = applyScheme03(C);
  assert.equal(applyScheme03(m), m, 'idempotent');
  assert.ok(DATA_02.controls._scheme03, 'the prototype data runs on the merged scheme');
  const b = new Bindings(C);
  assert.deepEqual(b.kbmFor('inventory'), ['KeyB']); assert.deepEqual(b.kbmFor('map'), ['KeyM']);
  assert.deepEqual(b.kbmFor('skill_1'), ['Digit3']); assert.deepEqual(b.kbmFor('skill_2'), ['Digit4']);
  assert.deepEqual(b.kbmFor('codex'), [], 'Codex is a tab of the Pack; C belongs to Dodge');
  assert.deepEqual(b.padFor('inventory'), [8]); assert.deepEqual(b.padFor('map'), [], 'map = hold View (shares_input_with_hold)');
  assert.deepEqual(b.padHoldOf('inventory'), [{ action: 'map', holdS: 0.4 }]);
  assert.deepEqual(b.padComboFor('skill_1'), { modifier: 6, button: 2 }, 'LT + X (follows attack_light)');
  assert.deepEqual(b.padComboFor('skill_2'), { modifier: 6, button: 3 });
  assert.deepEqual(b.conflicts('kbm'), []); assert.deepEqual(b.conflicts('pad'), []);
  const unsafe = new Set(m.browser_unsafe_kbm);
  for (const [a, l] of Object.entries(b.kbm)) for (const k of l) assert.ok(!k || !unsafe.has(k), `${a} on browser-unsafe ${k}`);
  for (const id of ['acc_jump_full_height_on_tap', 'acc_slowmo', 'acc_burst_camera_simple', 'acc_skill_modifier_mode']) assert.ok(m.accessibility_options.some((o) => o.id === id), id);
});

test('kbm presets: Souls-Shift (dodge on Shift, sprint freed, sets sprint-on-dodge-hold), V, mouse side; still conflict-free', () => {
  const b = new Bindings(C);
  const p = b.applyKbmPreset('kbm_souls_shift');
  assert.ok(p && p.set_options.acc_sprint_on_dodge_hold);
  assert.deepEqual(b.kbmFor('dodge'), ['ShiftLeft']); assert.deepEqual(b.kbmFor('sprint'), []);
  assert.deepEqual(b.conflicts('kbm'), []);
  b.applyKbmPreset('kbm_v'); assert.deepEqual(b.kbmFor('dodge'), ['KeyV']); assert.deepEqual(b.kbmFor('sprint'), ['ShiftLeft']);
  b.applyKbmPreset('kbm_mouse_side'); assert.deepEqual(b.kbmFor('dodge'), ['Mouse3', 'KeyC']); assert.deepEqual(b.conflicts('kbm'), []);
  const saved = JSON.parse(JSON.stringify(b.toJSON())); const b2 = new Bindings(C);
  assert.ok(b2.load(saved)); assert.equal(b2.kbmPreset, 'kbm_mouse_side'); assert.deepEqual(b2.kbmFor('dodge'), ['Mouse3', 'KeyC']);
  assert.equal(keyLabel('Mouse3', 'en', applyScheme03(C).key_names), 'Mouse back button');
  b.reset(); assert.deepEqual(b.kbmFor('dodge'), ['KeyC']);
});

test('Weapon Art modifier latch: hold, or a tap opens it for 2 s / until an Art is used', () => {
  const l = new ModifierLatch();
  assert.equal(l.update(0.016, 'hold', true, true), true); assert.equal(l.update(0.016, 'hold', false, false), false);
  assert.equal(l.update(0.016, 'toggle', true, true), true); assert.equal(l.update(1.0, 'toggle', false, false), true);
  assert.equal(l.update(1.1, 'toggle', false, false), false, 'closes after 2 s');
  l.update(0.016, 'toggle', true, true); l.used(); assert.equal(l.update(0.016, 'toggle', false, false), false, 'closes when used');
});
