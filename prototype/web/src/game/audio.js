// audio.js - every sound is synthesized with WebAudio at runtime (no audio files, no licenses).
// Telegraph cues: each enemy attack has a sound family (from enemies.json telegraph.audio) and every
// unparryable attack adds the same low "rumble" so it is never signalled by color alone.
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
  whoosh() { if (this.ok()) this._noise(this.now(), 0.16, 0.12, 'bandpass', 2400, 1.2, this.master); }
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
