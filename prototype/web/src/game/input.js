// input.js - keyboard + mouse (pointer lock) + Gamepad API mapped to game actions.
// Default keys follow the brief: WASD, LMB light, RMB heavy, Space dodge, Q parry, Tab/MMB lock-on,
// R drum burst, F interact/pry, E hold "call by name", C codex, Esc menu.
export const KEYMAP = {
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  ShiftLeft: 'walk', ShiftRight: 'walk',
  Space: 'dodge', KeyQ: 'parry', Tab: 'lock', KeyR: 'burst', KeyF: 'interact', KeyE: 'call',
  KeyH: 'heal', Digit1: 'slot1', Digit2: 'slot2', KeyC: 'codex', KeyJ: 'journal', Escape: 'menu',
  Backquote: 'fps', ArrowLeft: 'camLeft', ArrowRight: 'camRight', ArrowUp: 'camUp', ArrowDown: 'camDown',
  KeyK: 'skills',
};
// Rows for the controls screen: [action keys shown, ui string key]
export const CONTROL_ROWS = [
  ['W A S D', 'ctl_move'], ['Shift', 'ctl_walk'], ['@key_mouse / ← → ↑ ↓', 'ctl_camera'],
  ['@key_lmb', 'ctl_light'], ['@key_rmb', 'ctl_heavy'], ['@key_space', 'ctl_dodge'], ['Q', 'ctl_parry'],
  ['Tab / @key_mmb', 'prompt_lock_on'], ['R', 'ctl_burst'], ['F', 'ctl_interact'], ['E', 'prompt_call_name'],
  ['H', 'ctl_heal'], ['1 / 2', 'prompt_swap_weapon'], ['C', 'menu_codex'], ['J', 'journal_title'],
  ['K', 'skills_title'], ['Esc', 'ctl_menu'], ['`', 'ctl_fps'],
];
const PAD = { 0: 'dodge', 1: 'interact', 2: 'light', 3: 'heavy', 4: 'parry', 5: 'call', 6: 'heal', 7: 'burst',
  8: 'codex', 9: 'menu', 11: 'lock', 14: 'slot1', 15: 'slot2' };

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set(); this.pressedSet = new Set(); this.releasedSet = new Set();
    this.pressTime = {}; // action -> event.timeStamp (ms) of the last press
    this.mouseDX = 0; this.mouseDY = 0; this.locked = false; this.enabled = true;
    this.padPrev = new Set(); this.padAxes = [0, 0, 0, 0];
    this.onAction = null; // callback(action) for UI-level actions (menu, codex...)
    addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.repeat) return;
      this._press(a, e.timeStamp);
    });
    addEventListener('keyup', (e) => { const a = KEYMAP[e.code]; if (a) this._release(a); });
    canvas.addEventListener('mousedown', (e) => {
      const a = e.button === 0 ? 'light' : e.button === 2 ? 'heavy' : e.button === 1 ? 'lock' : null;
      if (e.button === 1) e.preventDefault();
      if (a) this._press(a, e.timeStamp);
    });
    addEventListener('mouseup', (e) => {
      const a = e.button === 0 ? 'light' : e.button === 2 ? 'heavy' : e.button === 1 ? 'lock' : null;
      if (a) this._release(a);
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => { if (this.locked) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; } });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
    addEventListener('blur', () => { for (const a of [...this.down]) this._release(a); });
  }
  _press(a, ts) {
    if (!this.down.has(a)) { this.pressedSet.add(a); this.pressTime[a] = ts; }
    this.down.add(a);
    if (this.onAction) this.onAction(a);
  }
  _release(a) { if (this.down.delete(a)) this.releasedSet.add(a); }
  requestLock() { try { const p = this.canvas.requestPointerLock?.(); if (p && p.catch) p.catch(() => {}); } catch { /* headless */ } }
  exitLock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch { /* ignore */ } }
  isDown(a) { return this.down.has(a); }
  pressed(a) { return this.pressedSet.has(a); }
  released(a) { return this.releasedSet.has(a); }
  /** Call once per frame, before reading input. */
  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && [...pads].find((p) => p && p.connected);
    if (!pad) { this.padAxes = [0, 0, 0, 0]; return; }
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    this.padAxes = [0, 1, 2, 3].map((i) => dz(pad.axes[i] ?? 0));
    const now = new Set();
    pad.buttons.forEach((b, i) => { if (b.pressed && PAD[i]) now.add(PAD[i]); });
    for (const a of now) if (!this.padPrev.has(a)) this._press(a, performance.now());
    for (const a of this.padPrev) if (!now.has(a)) this._release(a);
    this.padPrev = now;
  }
  moveVector() {
    let x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0) + this.padAxes[0];
    let z = (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0) + this.padAxes[1];
    const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
    return { x, z };
  }
  /** Camera delta in "mouse pixels" for this frame. */
  cameraDelta(dt) {
    const k = 600 * dt;
    const dx = this.mouseDX + ((this.isDown('camRight') ? 1 : 0) - (this.isDown('camLeft') ? 1 : 0)) * k + this.padAxes[2] * k;
    const dy = this.mouseDY + ((this.isDown('camDown') ? 1 : 0) - (this.isDown('camUp') ? 1 : 0)) * k * 0.5 + this.padAxes[3] * k * 0.5;
    return { dx, dy };
  }
  endFrame() { this.pressedSet.clear(); this.releasedSet.clear(); this.mouseDX = 0; this.mouseDY = 0; }
  clearAll() { this.down.clear(); this.endFrame(); }
}
