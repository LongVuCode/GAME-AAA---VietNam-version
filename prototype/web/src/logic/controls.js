// controls.js - data-driven control scheme (design/data/controls.json): default keyboard/mouse and
// gamepad bindings, remapping with conflict swap, persistence (plain JSON), glyph labels, and the
// hold/toggle latches used by the accessibility modes. Pure: no DOM, no three.js (node --test).
//
// Action ids used by the game are the controls.json ids, except the axis actions that are split so
// each key can be remapped on its own: move -> move_up/left/down/right, camera (arrow keys) ->
// camera_left/right/up/down, lock_switch_target (wheel) -> lock_prev/lock_next. Actions that
// share an input in the data (guard -> parry, pry_beat / call_name -> interact) are ALIASES: they
// read the state of their parent and are remapped with it.

export const KBM_SLOTS = 2;
/** Keys the browser or the menu owns (controls.json: "Esc is not remappable"). */
export const RESERVED_KBM = new Set(['Escape', 'MouseMove', 'MetaLeft', 'MetaRight', 'ContextMenu']);
/** Pad buttons never bound: Menu/Start (pause, fixed) and the system button. */
export const RESERVED_PAD = new Set([9, 16]);

const SPLIT = {
  move: ['move_up', 'move_left', 'move_down', 'move_right'],          // kbm.inputs order W, A, S, D
  camera: [null, 'camera_left', 'camera_right', 'camera_up', 'camera_down'], // [MouseMove, arrows]
  lock_switch_target: ['lock_prev', 'lock_next'],                     // [WheelUp, WheelDown]
};
const FIXED = new Set(['menu']); // gameplay actions shown but not remappable

/** Builds the static description of every action from controls.json. */
export function describeControls(controls) {
  const byId = new Map(controls.actions.map((a) => [a.id, a]));
  const aliases = {};
  const rebindable = [];   // ordered ids shown in the remap screen
  const defaults = { kbm: {}, pad: {} };
  const ui = { kbm: {}, pad: {} };
  const info = {};         // id -> { source (controls action), name, part, padAxis }
  for (const a of controls.actions) {
    if (a.reserved) continue;
    if (a.shares_input_with) { aliases[a.id] = a.shares_input_with; continue; }
    if (a.context === 'ui') {
      ui.kbm[a.id] = a.kbm.inputs.slice();
      ui.pad[a.id] = a.pad.inputs.filter((p) => !p.axis).map((p) => p.index);
      continue;
    }
    if (SPLIT[a.id]) {
      SPLIT[a.id].forEach((id, i) => {
        if (!id) return;
        info[id] = { source: a.id, part: id, padAxis: a.pad.type === 'axis' };
        defaults.kbm[id] = [a.kbm.inputs[i] ?? null, null];
        defaults.pad[id] = null;
        rebindable.push(id);
      });
      continue;
    }
    info[a.id] = { source: a.id, part: null, padAxis: a.pad.type === 'axis', fixed: FIXED.has(a.id) };
    const k = a.kbm.inputs.slice(0, KBM_SLOTS);
    while (k.length < KBM_SLOTS) k.push(null);
    defaults.kbm[a.id] = k;
    const p = a.pad.inputs.find((x) => !x.axis);
    defaults.pad[a.id] = p ? p.index : null;
    if (!FIXED.has(a.id)) rebindable.push(a.id);
  }
  return { byId, aliases, rebindable, defaults, ui, info };
}

const clone = (o) => JSON.parse(JSON.stringify(o));

export class Bindings {
  constructor(controls) {
    this.controls = controls;
    this.desc = describeControls(controls);
    this.padPreset = (controls.pad_presets ?? []).find((p) => p.default)?.id ?? null;
    this.reset();
  }

  reset() {
    this.kbm = clone(this.desc.defaults.kbm);
    this.pad = clone(this.desc.defaults.pad);
    this.applyPadPreset(this.padPreset, false);
    this._rebuild();
  }

  /** controls.json pad_presets[].overrides: { action: [{ index }] } on top of the default pad map. */
  applyPadPreset(id, rebuild = true) {
    const preset = (this.controls.pad_presets ?? []).find((p) => p.id === id);
    if (!preset) return false;
    this.padPreset = id;
    this.pad = clone(this.desc.defaults.pad);
    for (const [action, inputs] of Object.entries(preset.overrides ?? {})) {
      if (!(action in this.pad)) continue;
      const idx = inputs[0]?.index ?? null;
      // A preset moves a button: whoever had it before loses it (presets are conflict-free in data).
      for (const k of Object.keys(this.pad)) if (this.pad[k] === idx && k !== action) this.pad[k] = null;
      this.pad[action] = idx;
    }
    if (rebuild) this._rebuild();
    return true;
  }

  /** Resolves aliases (guard -> parry, call_name / pry_beat -> interact). */
  resolve(action) { return this.desc.aliases[action] ?? action; }
  isRebindable(action) { return this.desc.rebindable.includes(action); }

  kbmFor(action) { return (this.kbm[this.resolve(action)] ?? []).filter(Boolean); }
  padFor(action) { const v = this.pad[this.resolve(action)]; return v == null ? [] : [v]; }

  /**
   * Assigns an input. device 'kbm' (KeyboardEvent.code / Mouse0..2 / WheelUp/Down) or 'pad' (button
   * index). slot: 0..KBM_SLOTS-1 for kbm (ignored for pad). If another action already uses the input,
   * the two swap (the other action gets this slot's previous input, possibly none).
   * Returns { ok, reason?, conflict?: { action, slot }, previous }.
   */
  assign(device, action, slot, input) {
    action = this.resolve(action);
    if (!this.isRebindable(action)) return { ok: false, reason: 'fixed' };
    if (device === 'kbm') {
      if (input == null || RESERVED_KBM.has(input) || this._uiOnly(input)) return { ok: false, reason: 'reserved' };
      const s = Math.max(0, Math.min(KBM_SLOTS - 1, slot | 0));
      const list = this.kbm[action];
      const previous = list[s];
      if (previous === input) return { ok: true, previous };
      let conflict = null;
      const other = list.indexOf(input);
      if (other >= 0) list[other] = null; // same action, other slot: just move it
      else {
        for (const [a, l] of Object.entries(this.kbm)) {
          const j = l.indexOf(input);
          if (j >= 0 && a !== action) { conflict = { action: a, slot: j }; l[j] = previous ?? null; break; }
        }
      }
      list[s] = input;
      this._rebuild();
      return { ok: true, conflict, previous };
    }
    if (device === 'pad') {
      if (this.desc.info[action]?.padAxis) return { ok: false, reason: 'axis' };
      if (input == null || RESERVED_PAD.has(input)) return { ok: false, reason: 'reserved' };
      const previous = this.pad[action];
      if (previous === input) return { ok: true, previous };
      let conflict = null;
      for (const [a, v] of Object.entries(this.pad)) {
        if (v === input && a !== action) { conflict = { action: a, slot: 0 }; this.pad[a] = previous ?? null; break; }
      }
      this.pad[action] = input;
      this.padPreset = null; // custom
      this._rebuild();
      return { ok: true, conflict, previous };
    }
    return { ok: false, reason: 'device' };
  }

  clear(device, action, slot = 0) {
    action = this.resolve(action);
    if (!this.isRebindable(action)) return false;
    if (device === 'kbm') this.kbm[action][slot] = null; else this.pad[action] = null;
    this._rebuild();
    return true;
  }

  /** Gameplay actions that have no input at all on a device (shown as a warning). */
  unbound(device) {
    return this.desc.rebindable.filter((a) => (device === 'kbm' ? !this.kbm[a].some(Boolean)
      : !this.desc.info[a].padAxis && this.pad[a] == null && (this.desc.defaults.pad[a] != null)));
  }

  /** Two gameplay actions sharing one input (never true after assign(); used to validate loads). */
  conflicts(device) {
    const seen = new Map(), out = [];
    const entries = device === 'kbm' ? Object.entries(this.kbm).flatMap(([a, l]) => l.filter(Boolean).map((i) => [a, i]))
      : Object.entries(this.pad).filter(([, v]) => v != null);
    for (const [a, i] of entries) { if (seen.has(i) && seen.get(i) !== a) out.push([seen.get(i), a, i]); else seen.set(i, a); }
    return out;
  }

  _uiOnly() { return false; } // UI keys (Enter, Backspace...) may also be gameplay keys: menus are a separate context.

  _rebuild() {
    this.kbmMap = new Map(); this.padMap = new Map();
    for (const [a, l] of Object.entries(this.kbm)) for (const i of l) if (i) { if (!this.kbmMap.has(i)) this.kbmMap.set(i, []); this.kbmMap.get(i).push(a); }
    for (const [a, v] of Object.entries(this.pad)) if (v != null) { if (!this.padMap.has(v)) this.padMap.set(v, []); this.padMap.get(v).push(a); }
    this.uiKbmMap = new Map(); this.uiPadMap = new Map();
    for (const [a, l] of Object.entries(this.desc.ui.kbm)) for (const i of l) { if (!this.uiKbmMap.has(i)) this.uiKbmMap.set(i, []); this.uiKbmMap.get(i).push(a); }
    for (const [a, l] of Object.entries(this.desc.ui.pad)) for (const i of l) { if (!this.uiPadMap.has(i)) this.uiPadMap.set(i, []); this.uiPadMap.get(i).push(a); }
  }
  actionsForKbm(input) { return this.kbmMap.get(input) ?? EMPTY; }
  actionsForPad(index) { return this.padMap.get(index) ?? EMPTY; }
  uiForKbm(input) { return this.uiKbmMap.get(input) ?? EMPTY; }
  uiForPad(index) { return this.uiPadMap.get(index) ?? EMPTY; }
  /** All game action ids that read from one stored binding (the parent itself + its aliases). */
  aliasesOf(action) { return Object.entries(this.desc.aliases).filter(([, p]) => p === action).map(([a]) => a); }

  toJSON() { return { v: 1, kbm: clone(this.kbm), pad: clone(this.pad), padPreset: this.padPreset }; }

  /** Loads saved bindings; unknown actions / bad values are ignored, conflicts fall back to default. */
  load(obj) {
    if (!obj || obj.v !== 1) return false;
    this.reset();
    if (obj.padPreset) this.applyPadPreset(obj.padPreset, false);
    for (const [a, l] of Object.entries(obj.kbm ?? {})) {
      if (!this.isRebindable(a) || !Array.isArray(l)) continue;
      this.kbm[a] = Array.from({ length: KBM_SLOTS }, (_, i) => (typeof l[i] === 'string' && !RESERVED_KBM.has(l[i]) ? l[i] : null));
    }
    for (const [a, v] of Object.entries(obj.pad ?? {})) {
      if (!this.isRebindable(a) || this.desc.info[a].padAxis) continue;
      this.pad[a] = Number.isInteger(v) && !RESERVED_PAD.has(v) ? v : null;
    }
    this.padPreset = obj.padPreset ?? null;
    if (this.conflicts('kbm').length || this.conflicts('pad').length) { this.reset(); return false; }
    this._rebuild();
    return true;
  }
}
const EMPTY = Object.freeze([]);

// ------------------------------------------------------------------ glyphs
const ARROWS = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
/** Display label of a KeyboardEvent.code / mouse input. keyNames: controls.json key_names. */
export function keyLabel(code, lang, keyNames = {}) {
  if (!code) return '';
  if (keyNames[code]) return keyNames[code][lang] ?? keyNames[code].en;
  if (ARROWS[code]) return ARROWS[code];
  let m = /^Key([A-Z])$/.exec(code); if (m) return m[1];
  m = /^Digit(\d)$/.exec(code); if (m) return m[1];
  m = /^Numpad(\d)$/.exec(code); if (m) return `Num ${m[1]}`;
  m = /^F(\d+)$/.exec(code); if (m) return code;
  const short = { ShiftRight: 'Shift R', ControlLeft: 'Ctrl', ControlRight: 'Ctrl R', AltLeft: 'Alt', AltRight: 'Alt R', Minus: '-', Equal: '=',
    BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Delete: 'Del',
    Insert: 'Ins', Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn' };
  return short[code] ?? code;
}

/** Pad style from Gamepad.id (vendor 054c = Sony). */
export function padStyleFromId(id = '') { return /054c|sony|playstation|dualshock|dualsense/i.test(id) ? 'playstation' : 'xbox'; }

/** Glyph of a pad button index in a style (controls.json pad_buttons[].glyph). */
export function padLabel(index, style, padButtons) {
  const b = padButtons.find((x) => x.index === index);
  return b ? (b.glyph[style] ?? b.glyph.xbox) : `#${index}`;
}

/** Which device's glyphs to show: acc_glyph_style (auto|xbox|playstation|keyboard) + last device. */
export function glyphDevice(style, lastDevice, padStyle) {
  if (style === 'keyboard') return { device: 'kbm', padStyle };
  if (style === 'xbox' || style === 'playstation') return lastDevice === 'pad' ? { device: 'pad', padStyle: style } : { device: 'kbm', padStyle: style };
  return { device: lastDevice === 'pad' ? 'pad' : 'kbm', padStyle };
}

// ------------------------------------------------------------------ hold / toggle latches
/**
 * Hold-or-toggle latch for one action (acc_*_mode). mode 'hold': active while down.
 * mode 'toggle': each press flips it; cancel() clears it (e.g. guard dropped by a dodge).
 */
export class ModeLatch {
  constructor() { this.on = false; }
  update(mode, down, pressed) {
    if (mode === 'toggle') { if (pressed) this.on = !this.on; } else this.on = !!down;
    return this.on;
  }
  cancel() { this.on = false; }
}

/**
 * Sprint request (acc_sprint_mode). hold: while held; toggle: a press latches it until the move
 * input is released (controls.json note: "stops when the stick is released"); auto: after a full
 * move input held for autoDelayS. Always needs move magnitude >= minRatio
 * (movement.sprint_requires_move_input_ratio).
 */
export class SprintControl {
  constructor() { this.latched = false; this.fullT = 0; this.active = false; }
  update(dt, { mode = 'hold', down = false, pressed = false, moveMag = 0, minRatio = 0.6, autoDelayS = 0.6, dodgeHeld = false }) {
    const moving = moveMag >= minRatio;
    if (moveMag < 0.2) { this.latched = false; this.fullT = 0; }
    let want = false;
    if (mode === 'toggle') { if (pressed && moveMag >= 0.2) this.latched = !this.latched; want = this.latched; }
    else if (mode === 'auto') { this.fullT = moveMag >= 0.95 ? this.fullT + dt : 0; want = this.fullT >= autoDelayS || down; }
    else want = down;
    this.active = (want || dodgeHeld) && moving;
    return this.active;
  }
  cancel() { this.latched = false; this.fullT = 0; this.active = false; }
}

/** Effective sprint mode for the device in use ('device' = data default per device). */
export function sprintModeFor(setting, device, controls) {
  if (setting && setting !== 'device') return setting;
  const o = controls.accessibility_options.find((x) => x.id === 'acc_sprint_mode');
  return device === 'pad' ? (o?.default_pad ?? 'toggle') : (o?.default_kbm ?? 'hold');
}
