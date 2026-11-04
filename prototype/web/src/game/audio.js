// audio.js - every sound is synthesized with WebAudio at runtime (no audio files, no licenses).
// Telegraph cues: each enemy attack has a sound family (from enemies.json telegraph.audio) and every
// unparryable attack adds the same low "rumble" so it is never signalled by color alone.
// Layered impact / swing / footstep sounds used by the FX module (src/fx) are added below; the
// original methods (hit, parry, dodge, crackSnap...) keep their behaviour.
import { impactSoundSpec, vary } from '../fx/logic.js';

export class Sfx {
  constructor() {
    this.ctx = null; this.master = null; this.volume = 0.7; this.silencedUntil = 0; this.directional = true;
    this.ambience = null;
  }
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch { this.ctx = null; }
  }
  setVolume(v) { this.volume = v; if (this.master && this.now() >= this.silencedUntil) this.master.gain.value = v; }
  now() { return this.ctx ? this.ctx.currentTime : 0; }
  /** Full silence for s seconds (the pause after the pry). */
  silence(s) {
    if (!this.ctx) return;
    const t = this.now();
    this.silencedUntil = t + s;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 0.08);
    this.master.gain.setValueAtTime(0, t + s);
    this.master.gain.linearRampToValueAtTime(this.volume, t + s + 0.6);
  }
  _out(pan = 0) {
    if (!this.directional || !pan || !this.ctx.createStereoPanner) return this.master;
    const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(this.master); return p;
  }
  _env(node, t, a, peak, dur, dest) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g); g.connect(dest);
    return g;
  }
  _osc(type, f0, f1, t, dur, peak, dest) {
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this._env(o, t, 0.005, peak, dur, dest); o.start(t); o.stop(t + dur + 0.05);
  }
  _noise(t, dur, peak, filterType, freq, q, dest) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    s.connect(f); this._env(f, t, 0.004, peak, dur, dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  ok() { return !!this.ctx && this.now() >= this.silencedUntil; }

  drum(strong = false, when = 0) {
    if (!this.ok()) return;
    const t = this.now() + when;
    this._osc('sine', strong ? 120 : 95, 48, t, strong ? 0.5 : 0.35, strong ? 0.9 : 0.6, this.master);
    this._noise(t, 0.06, 0.25, 'lowpass', 900, 0.7, this.master);
  }
  hit(weight) {
    if (!this.ok()) return;
    const t = this.now();
    const k = weight === 'light' ? 0.35 : weight === 'medium' ? 0.5 : 0.75;
    this._noise(t, 0.08 + k * 0.1, k, 'bandpass', 1400 - k * 700, 0.9, this.master);
    this._osc('sine', 160, 60, t, 0.12 + k * 0.1, k * 0.6, this.master);
  }
  /** Weapon swing wind. speed: 1 = normal light swing (higher = faster, brighter, shorter); weight
   *  scales the body. Small random pitch/level variation so repeated swings do not sound identical. */
  whoosh(speed = 1, weight = 'light') {
    if (!this.ok()) return;
    const t = this.now(), s = Math.max(0.5, Math.min(2.5, speed));
    const k = weight === 'heavy' || weight === 'finisher' ? 1.5 : weight === 'medium' ? 1.2 : 1;
    const dur = Math.max(0.12, Math.min(0.42, (0.24 / s) * k)), f = vary(1, 0.08);
    this._sweep(t, dur, vary(0.13, 0.15) * k, 'bandpass', [500 * s * f, 2600 * s * f, 900 * f], 1.4, this.master, 0.45);
    this._sweep(t, dur * 0.8, 0.05 * k, 'highpass', [3000 * f, 6000 * f, 3500 * f], 0.7, this.master, 0.5);
  }

  // ---------------------------------------------------------------- layered FX sounds (src/fx)
  /** Noise through a filter whose cutoff follows freqs [f0, peak, f1]; attackFrac of dur to peak. */
  _sweep(t, dur, peak, type, freqs, q, dest, attackFrac = 0.3) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    const ta = t + dur * attackFrac;
    f.frequency.setValueAtTime(freqs[0], t); f.frequency.exponentialRampToValueAtTime(freqs[1], ta);
    f.frequency.exponentialRampToValueAtTime(freqs[2] ?? freqs[0], t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, ta); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  /** Shared tail bus: short filtered feedback delay (a cheap "space" for impacts). */
  _tailBus() {
    if (this.tail) return this.tail;
    const c = this.ctx, inp = c.createGain(), d = c.createDelay(0.5), fb = c.createGain(), lp = c.createBiquadFilter(), wet = c.createGain();
    d.delayTime.value = 0.11; fb.gain.value = 0.38; lp.type = 'lowpass'; lp.frequency.value = 1700; wet.gain.value = 0.55;
    inp.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(this.master);
    this.tail = inp; return inp;
  }
  /** Bronze-like inharmonic partials (struck metal). */
  _bronze(t, base, dur, peak, dest) {
    const nyq = this.ctx.sampleRate * 0.45;
    for (const [m, g] of [[1, 1], [2.76, 0.55], [5.4, 0.3], [8.93, 0.16]]) if (base * m < nyq) this._osc('sine', base * m, base * m * 0.997, t, dur / Math.sqrt(m), peak * g * 0.5, dest);
  }
  /**
   * Layered impact: transient (click) + body by material (wood / bronze / flesh / mud / water) +
   * tail (send to the delay bus). weight: light | medium | heavy | finisher | parry | perfect_parry |
   * guard | posture_break | khoen_crack | pry_beat | freed | hurt. surface: mud | water | flesh |
   * bronze | wood | dirt. opts: { pan (-1..1), gain }.
   */
  impact(weight = 'light', surface = 'flesh', { pan = 0, gain = 1 } = {}) {
    if (!this.ok()) return;
    const sp = impactSoundSpec(weight, surface);
    const t = this.now(), p = vary(sp.pitch, 0.06), k = vary(sp.gain, 0.12) * gain;
    const out = this._out(pan), bus = this.ctx.createGain(); bus.connect(out);
    const send = this.ctx.createGain(); send.gain.value = sp.tail; bus.connect(send); send.connect(this._tailBus());
    // transient
    this._noise(t, 0.025, 0.5 * k, 'highpass', 3800 * p, 0.7, bus);
    this._osc('square', 1900 * p, 500, t, 0.018, 0.08 * k, bus);
    // body
    switch (sp.body) {
      case 'bronze': this._bronze(t, (weight === 'perfect_parry' ? 1180 : weight === 'freed' ? 330 : 760) * p, weight === 'perfect_parry' ? 1.3 : 0.75, 0.45 * k, bus);
        if (weight === 'perfect_parry') this._bronze(t + 0.06, 1770 * p, 0.9, 0.22 * k, bus);
        break;
      case 'wood': this._noise(t, 0.09, 0.55 * k, 'bandpass', 950 * p, 3.5, bus); this._osc('triangle', 330 * p, 250 * p, t, 0.1, 0.3 * k, bus); this._osc('sine', 170 * p, 120 * p, t, 0.12, 0.3 * k, bus); break;
      case 'mud': this._noise(t, 0.2, 0.6 * k, 'lowpass', 420 * p, 0.9, bus); this._sweep(t, 0.18, 0.3 * k, 'bandpass', [1300 * p, 900 * p, 260 * p], 4, bus, 0.15); this._osc('sine', 100 * p, 42, t, 0.22, 0.5 * k, bus); break;
      case 'water': this._sweep(t, 0.28, 0.45 * k, 'bandpass', [2600 * p, 1800 * p, 600 * p], 1.4, bus, 0.1); for (let i = 1; i < 4; i++) this._noise(t + 0.05 * i + Math.random() * 0.03, 0.02, 0.12 * k, 'highpass', 4500, 1, bus); break;
      default: this._noise(t, 0.12 + 0.08 * k, 0.75 * k, 'lowpass', 650 * p, 1.1, bus); this._osc('sine', 150 * p, 52, t, 0.16 + 0.1 * k, 0.7 * k, bus);
    }
    if (sp.splash) this._sweep(t + 0.02, 0.22, 0.25 * k, 'bandpass', [2400, 1500, 600], 1.3, bus, 0.15);
    if (sp.squelch) this._sweep(t + 0.02, 0.16, 0.22 * k, 'bandpass', [1100, 700, 240], 4, bus, 0.15);
    if (sp.boom) this._osc('sine', 72 * p, 30, t, 0.8, 0.85 * k, bus);
    if (sp.crack) { this._noise(t, 0.14, 0.55 * k, 'bandpass', 3200, 5, bus); this._osc('square', 300, 90, t, 0.14, 0.1 * k, bus); }
    if (sp.creak) this._sweep(t, 0.3, 0.12 * k, 'bandpass', [180, 260, 140], 8, bus, 0.6);
  }
  /** Footstep by surface (mud | water | dirt | wood); speed in m/s. Quiet, varied. */
  footstep(surface = 'dirt', speed = 5) {
    if (!this.ok()) return;
    const t = this.now(), k = Math.max(0.4, Math.min(1.6, speed / 5)) * vary(1, 0.2), p = vary(1, 0.1);
    switch (surface) {
      case 'mud': this._noise(t, 0.12, 0.08 * k, 'lowpass', 330 * p, 0.8, this.master); this._sweep(t, 0.12, 0.05 * k, 'bandpass', [900 * p, 600 * p, 250 * p], 4, this.master, 0.2); break;
      case 'water': this._sweep(t, 0.16, 0.07 * k, 'bandpass', [2200 * p, 1500 * p, 700 * p], 1.3, this.master, 0.12); this._noise(t + 0.04, 0.02, 0.03 * k, 'highpass', 5000, 1, this.master); break;
      case 'wood': this._noise(t, 0.05, 0.07 * k, 'bandpass', 700 * p, 3, this.master); this._osc('triangle', 210 * p, 170 * p, t, 0.06, 0.05 * k, this.master); break;
      default: this._noise(t, 0.07, 0.07 * k, 'lowpass', 520 * p, 0.8, this.master); this._osc('sine', 95 * p, 60, t, 0.06, 0.04 * k, this.master);
    }
  }
  /** Low-health heartbeat (two soft thumps). */
  heartbeat(strength = 1) {
    if (!this.ok()) return;
    const t = this.now(), k = 0.25 * Math.max(0.2, Math.min(1, strength));
    this._osc('sine', 62, 40, t, 0.12, k, this.master); this._osc('sine', 58, 38, t + 0.2, 0.14, k * 0.75, this.master);
  }
  parry(perfect) {
    if (!this.ok()) return;
    const t = this.now();
    const base = perfect ? 1180 : 820;
    for (const m of [1, 2.76, 5.4]) this._osc('sine', base * m, base * m * 0.995, t, perfect ? 0.9 : 0.5, 0.18 / m, this.master);
  }
  dodge(perfect) {
    if (!this.ok()) return;
    this._noise(this.now(), 0.2, 0.15, 'highpass', 1800, 0.5, this.master);
    if (perfect) this._osc('triangle', 660, 990, this.now(), 0.25, 0.15, this.master);
  }
  hurt() { if (this.ok()) { this._osc('sawtooth', 140, 70, this.now(), 0.25, 0.25, this.master); } }
  ui() { if (this.ok()) this._osc('triangle', 520, 520, this.now(), 0.08, 0.08, this.master); }
  pickup() { if (this.ok()) { const t = this.now(); this._osc('triangle', 660, 660, t, 0.12, 0.12, this.master); this._osc('triangle', 880, 880, t + 0.1, 0.15, 0.12, this.master); } }
  crackSnap() { if (this.ok()) { const t = this.now(); this._noise(t, 0.12, 0.6, 'highpass', 2500, 1, this.master); this._osc('square', 300, 90, t, 0.15, 0.15, this.master); } }
  miss() { if (this.ok()) this._osc('square', 200, 120, this.now(), 0.18, 0.12, this.master); }

  /** Telegraph cue. family: crab | mantis | mud | boar_snort | boar_roar | boar_pain. kind from enemyAi.telegraphKind. */
  telegraph(family, kind, pan = 0) {
    if (!this.ok()) return;
    const t = this.now(); const out = this._out(pan);
    switch (family) {
      case 'crab': for (let i = 0; i < 3; i++) this._noise(t + i * 0.07, 0.03, 0.4, 'highpass', 3500, 2, out); break;
      case 'mantis': this._osc('sine', 1800, 3200, t, 0.18, 0.18, out); break;
      case 'mud': for (let i = 0; i < 3; i++) this._osc('sine', 90 + i * 20, 50, t + i * 0.12, 0.12, 0.35, out); break;
      case 'boar_snort': this._noise(t, 0.22, 0.6, 'bandpass', 700, 1.5, out); break;
      case 'boar_roar': this._osc('sawtooth', 110, 70, t, 1.0, 0.35, out); break;
      case 'boar_pain': this._osc('sawtooth', 300, 160, t, 0.6, 0.2, out); break;
      default: this._osc('sine', 600, 600, t, 0.1, 0.15, out);
    }
    if (kind === 'unparryable') {
      // Shared unparryable cue: low pulsing rumble (3 throbs) + bronze ping.
      for (let i = 0; i < 3; i++) this._osc('sine', 52, 44, t + i * 0.16, 0.15, 0.55, out);
      this._osc('triangle', 1560, 1500, t, 0.35, 0.08, out);
    } else if (kind === 'delayed') {
      this._osc('sine', 700, 700, t, 0.05, 0.12, out);
    }
  }
  startAmbience() {
    if (!this.ctx || this.ambience) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g = this.ctx.createGain(); g.gain.value = 0.05;
    s.connect(f); f.connect(g); g.connect(this.master); s.start();
    this.ambience = { s, g };
  }
}
