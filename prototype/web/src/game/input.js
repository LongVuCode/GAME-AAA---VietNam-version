// input.js - keyboard + mouse (pointer lock) + Gamepad API ("standard" mapping), driven by the
// data-driven bindings of design/data/controls.json (logic/controls.js). Exposes per-action state
// (down / pressed / released + the event timestamp of each press) for the game, the UI actions for
// menus, the device in use (glyphs), a capture mode for the remap screen, and controller rumble.
// Action ids are the controls.json ids (move_up..., attack_light, drum_burst, interact, ...); aliases
// (guard, call_name, pry_beat) read their parent's state.
import { Bindings, padStyleFromId } from '../logic/controls.js';

const BINDINGS_KEY = 'ngb_demo02_bindings_v1';
const PREVENT = new Set(['Tab', 'Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backquote', 'CapsLock', 'Quote', 'Slash']);

export class Input {
  constructor(canvas, controls, getSettings = () => ({})) {
    this.canvas = canvas; this.controls = controls; this.getSettings = getSettings;
    this.bindings = new Bindings(controls);
    this.storageOk = this.loadBindings();
    this.keys = new Set(); this.pads = new Set();
    this.down = new Set(); this.pressedSet = new Set(); this.releasedSet = new Set();
    this.uiPressed = new Set();
    this.pressTime = {};   // action -> event timeStamp (ms) of the last press
    this.mouseDX = 0; this.mouseDY = 0; this.locked = false; this.enabled = true;
    this.padAxes = [0, 0, 0, 0]; this.padPrev = new Set(); this.padConnected = false; this.padId = '';
    this.device = 'kbm'; this.padStyle = 'xbox';
    this.capture = null; // { device, cb }
    this.lockFlick = false; this._flick = 0;
    this.onAction = null;
    addEventListener('keydown', (e) => {
      if (this.capture) { this._captureKey(e); return; }
      const acts = this.bindings.actionsForKbm(e.code), ui = this.bindings.uiForKbm(e.code);
      if (acts.length || ui.length || PREVENT.has(e.code)) { if (PREVENT.has(e.code) || e.code.startsWith('Arrow')) e.preventDefault(); }
      if (e.repeat) return;
      this.device = 'kbm';
      this.keys.add(e.code);
      for (const a of acts) this._press(a, e.timeStamp);
      for (const a of ui) this.uiPressed.add(a);
    });
    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      for (const a of this.bindings.actionsForKbm(e.code)) this._refresh(a);
    });
    const mouseCode = (b) => (b === 0 ? 'Mouse0' : b === 1 ? 'Mouse1' : b === 2 ? 'Mouse2' : null);
    addEventListener('mousedown', (e) => {
      const code = mouseCode(e.button);
      if (this.capture) { if (this.capture.device === 'kbm' && code && e.target === this.capture.target) return; if (this.capture.device === 'kbm' && code) { e.preventDefault(); this._finishCapture(code); } return; }
      if (e.target !== canvas) return; // clicks on menus are not gameplay input
      if (e.button === 1) e.preventDefault();
      this.device = 'kbm';
      if (!code) return;
      this.keys.add(code);
      for (const a of this.bindings.actionsForKbm(code)) this._press(a, e.timeStamp);
    });
    addEventListener('mouseup', (e) => {
      const code = mouseCode(e.button); if (!code) return;
      this.keys.delete(code);
      for (const a of this.bindings.actionsForKbm(code)) this._refresh(a);
    });
    addEventListener('wheel', (e) => {
      const code = e.deltaY < 0 ? 'WheelUp' : 'WheelDown';
      if (this.capture) { if (this.capture.device === 'kbm') this._finishCapture(code); return; }
      if (e.target !== canvas) return;
      for (const a of this.bindings.actionsForKbm(code)) { this._press(a, e.timeStamp); this._wheelRelease = this._wheelRelease ?? new Set(); this._wheelRelease.add(a); }
    }, { passive: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => { if (this.locked) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) this.device = 'kbm'; } });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
    addEventListener('blur', () => this.clearAll());
    addEventListener('gamepadconnected', (e) => { this.padId = e.gamepad.id; this.padStyle = padStyleFromId(e.gamepad.id); });
  }

  // ---------------------------------------------------------------- bindings persistence
  loadBindings() {
    try { const s = JSON.parse(localStorage.getItem(BINDINGS_KEY) ?? 'null'); if (s) this.bindings.load(s); return true; } catch { return false; }
  }
  saveBindings() {
    try { localStorage.setItem(BINDINGS_KEY, JSON.stringify(this.bindings.toJSON())); this.storageOk = true; return true; } catch { this.storageOk = false; return false; }
  }
  resetBindings() { this.bindings.reset(); this.clearAll(); return this.saveBindings(); }

  // ---------------------------------------------------------------- action state
  _press(a, ts) {
    if (!this.down.has(a)) { this.pressedSet.add(a); this.pressTime[a] = ts; }
    this.down.add(a);
    if (this.onAction) this.onAction(a);
  }
  _isHeld(a) {
    for (const k of this.bindings.kbmFor(a)) if (this.keys.has(k)) return true;
    for (const p of this.bindings.padFor(a)) if (this.pads.has(p)) return true;
    return false;
  }
  _refresh(a) { if (!this._isHeld(a) && this.down.delete(a)) this.releasedSet.add(a); }
  requestLock() { try { const p = this.canvas.requestPointerLock?.(); if (p && p.catch) p.catch(() => {}); } catch { /* headless */ } }
  exitLock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch { /* ignore */ } }
  isDown(a) { return this.down.has(this.bindings.resolve(a)); }
  pressed(a) { return this.pressedSet.has(this.bindings.resolve(a)); }
  released(a) { return this.releasedSet.has(this.bindings.resolve(a)); }
  pressedAt(a) { return this.pressTime[this.bindings.resolve(a)]; }
  ui(a) { return this.uiPressed.has(a); }

  // ---------------------------------------------------------------- gamepad
  _pad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (!pads) return null;
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }
  /** Call once per frame, before reading input. */
  pollGamepad() {
    if (this._wheelRelease) { for (const a of this._wheelRelease) this._refresh(a); this._wheelRelease.clear(); }
    const pad = this._pad();
    this.padConnected = !!pad;
    if (!pad) {
      this.padAxes[0] = this.padAxes[1] = this.padAxes[2] = this.padAxes[3] = 0;
      if (this.padPrev.size) { for (const i of this.padPrev) { this.pads.delete(i); for (const a of this.bindings.actionsForPad(i)) this._refresh(a); } this.padPrev.clear(); }
      return;
    }
    if (pad.id !== this.padId) { this.padId = pad.id; this.padStyle = padStyleFromId(pad.id); }
    const s = this.getSettings();
    const dz = s.acc_stick_deadzone ?? 0.18;
    const swap = !!s.acc_swap_sticks;
    for (let i = 0; i < 4; i++) {
      const src = swap ? (i + 2) % 4 : i;
      const v = pad.axes[src] ?? 0;
      this.padAxes[i] = Math.abs(v) < dz ? 0 : Math.sign(v) * (Math.abs(v) - dz) / (1 - dz);
    }
    if (Math.abs(this.padAxes[0]) + Math.abs(this.padAxes[1]) + Math.abs(this.padAxes[2]) + Math.abs(this.padAxes[3]) > 0.1) this.device = 'pad';
    const now = performance.now();
    const cur = this._padNow ?? (this._padNow = new Set()); cur.clear();
    pad.buttons.forEach((b, i) => { if (b.pressed || b.value > 0.5) cur.add(i); });
    for (const i of cur) {
      if (this.padPrev.has(i)) continue;
      this.device = 'pad';
      if (this.capture) { if (this.capture.device === 'pad') this._finishCapture(i === 9 ? null : i); continue; }
      this.pads.add(i);
      for (const a of this.bindings.actionsForPad(i)) this._press(a, now);
      for (const a of this.bindings.uiForPad(i)) this.uiPressed.add(a);
    }
    for (const i of this.padPrev) {
      if (cur.has(i)) continue;
      this.pads.delete(i);
      for (const a of this.bindings.actionsForPad(i)) this._refresh(a);
    }
    const prev = this.padPrev; this.padPrev = cur; this._padNow = prev;
    // Right stick flick switches the locked target (lock_on.switch_stick_threshold).
    if (this.lockFlick) {
      const x = this.padAxes[2], th = this.flickThreshold ?? 0.6;
      if (this._flick === 0 && Math.abs(x) >= th) { this._flick = Math.sign(x); this._press(x > 0 ? 'lock_next' : 'lock_prev', now); }
      else if (this._flick !== 0 && Math.abs(x) < th * 0.5) { const a = this._flick > 0 ? 'lock_next' : 'lock_prev'; if (this.down.delete(a)) this.releasedSet.add(a); this._flick = 0; }
    }
  }

  /** Move input { x, z, mag } in camera space (x right, z back), keyboard digital + left stick analog. */
  moveVector() {
    const o = this._mv ?? (this._mv = { x: 0, z: 0, mag: 0 });
    let x = (this.isDown('move_right') ? 1 : 0) - (this.isDown('move_left') ? 1 : 0) + this.padAxes[0];
    let z = (this.isDown('move_down') ? 1 : 0) - (this.isDown('move_up') ? 1 : 0) + this.padAxes[1];
    const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
    o.x = x; o.z = z; o.mag = Math.min(1, l);
    return o;
  }
  /** Camera delta in "mouse pixels" for this frame (mouse + arrow keys + right stick, with sensitivity / invert). */
  cameraDelta(dt) {
    const s = this.getSettings(), inv = s.acc_invert_camera ?? [];
    const o = this._cd ?? (this._cd = { dx: 0, dy: 0 });
    const ms = s.acc_mouse_sensitivity ?? 1, ps = s.acc_pad_sensitivity ?? 1;
    const k = 600 * dt;
    const keysX = ((this.isDown('camera_right') ? 1 : 0) - (this.isDown('camera_left') ? 1 : 0)) * k;
    const keysY = ((this.isDown('camera_down') ? 1 : 0) - (this.isDown('camera_up') ? 1 : 0)) * k * 0.5;
    const padX = this.lockFlick ? 0 : this.padAxes[2] * k * ps, padY = this.padAxes[3] * k * 0.5 * ps;
    o.dx = this.mouseDX * ms * (inv.includes('mouse_x') ? -1 : 1) + keysX + padX * (inv.includes('pad_x') ? -1 : 1);
    o.dy = this.mouseDY * ms * (inv.includes('mouse_y') ? -1 : 1) + keysY + padY * (inv.includes('pad_y') ? -1 : 1);
    return o;
  }

  // ---------------------------------------------------------------- remap capture
  /** Waits for the next input on `device` ('kbm' | 'pad'); cb(input | null when cancelled). */
  startCapture(device, cb, target = null) { this.capture = { device, cb, target }; this.clearAll(); }
  cancelCapture() { if (this.capture) { const c = this.capture; this.capture = null; c.cb(null); } }
  _captureKey(e) {
    e.preventDefault();
    if (this.capture.device !== 'kbm') { if (e.code === 'Escape') this._finishCapture(null); return; }
    this._finishCapture(e.code === 'Escape' ? null : e.code);
  }
  _finishCapture(input) { const c = this.capture; this.capture = null; c?.cb(input); }

  // ---------------------------------------------------------------- rumble
  /** Controller rumble (strength 0..1, seconds), scaled by acc_vibration; no-op without a pad. */
  rumble(strength, seconds) {
    const s = this.getSettings(), k = (s.acc_vibration ?? 1) * strength;
    if (!(k > 0)) return false;
    try {
      const pad = this._pad(); const act = pad?.vibrationActuator;
      if (!act?.playEffect) return false;
      act.playEffect('dual-rumble', { duration: Math.round(seconds * 1000), strongMagnitude: Math.min(1, k), weakMagnitude: Math.min(1, k * 0.6) }).catch?.(() => {});
      return true;
    } catch { return false; }
  }

  endFrame() { this.pressedSet.clear(); this.releasedSet.clear(); this.uiPressed.clear(); this.mouseDX = 0; this.mouseDY = 0; }
  clearAll() { this.down.clear(); this.keys.clear(); this.pads.clear(); this.endFrame(); }
}
