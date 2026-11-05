// drumFace.js - the Drum Burst ("Hồi trống") gauge drawn on ONE small canvas: a bronze drum face
// with a fluid that rises inside it, and 4 rim arcs for the 4 Nhịp trống notches.
//
// [SÁNG TẠO] The face is a STYLISED motif inspired by the general layout of Đông Sơn bronze drum
// tympana (many-pointed star in the centre, concentric bands of geometric patterns: tangent circles
// with dots, ladder hatching, zigzags). It reproduces no specific drum (ray count, bands and order
// are our own); birds/boats are deliberately left out. ART_DIRECTION §3.5 asks to check the central
// sun/star motif with `historian-verifier` before it is used as an icon: pending review.
//
// Perf: the static face (rim + bands) and the engraved-line overlay are rendered once to offscreen
// canvases; each redraw composites them with the fluid (two sine-wave layers). The owner only calls
// draw() when the state changed or the fluid is moving, throttled to ~30 fps.

const TAU = Math.PI * 2;
const FLUID = {
  fill: { top: '#a8ffe9', mid: '#26c2a4', deep: '#0b4f4a', back: '#127a6c', arc: '#74f5d6', glow: 'rgba(80, 240, 200, 0.9)' },
  full: { top: '#fff0a0', mid: '#ff6a1c', deep: '#a8180a', back: '#d8380e', arc: '#ff8a2e', glow: 'rgba(255, 120, 30, 1)' },
};

function circle(ctx, cx, cy, r) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); }

/** Concentric bands of the face as strokes (drawn twice for an embossed look). */
function motifs(ctx, cx, cy, F, ink) {
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = Math.max(0.7, F * 0.012);
  const ring = (k) => { circle(ctx, cx, cy, F * k); ctx.stroke(); };
  const tangentCircles = (k, rr) => {
    const n = Math.floor((TAU * F * k) / (2 * F * rr));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, x = cx + Math.cos(a) * F * k, y = cy + Math.sin(a) * F * k;
      circle(ctx, x, y, F * rr * 0.9); ctx.stroke();
      circle(ctx, x, y, F * rr * 0.25); ctx.fill();
    }
  };
  const ladder = (k0, k1, stepDeg) => {
    ctx.beginPath();
    for (let d = 0; d < 360; d += stepDeg) {
      const a = (d * Math.PI) / 180;
      ctx.moveTo(cx + Math.cos(a) * F * k0, cy + Math.sin(a) * F * k0);
      ctx.lineTo(cx + Math.cos(a) * F * k1, cy + Math.sin(a) * F * k1);
    }
    ctx.stroke();
  };
  // star valleys: small hatched triangles between the rays
  const rays = 12;
  ctx.beginPath();
  for (let i = 0; i < rays; i++) {
    const a = ((i + 0.5) / rays) * TAU - Math.PI / 2;
    const ax = cx + Math.cos(a) * F * 0.2, ay = cy + Math.sin(a) * F * 0.2;
    const l = a - 0.16, r = a + 0.16;
    ctx.moveTo(cx + Math.cos(l) * F * 0.29, cy + Math.sin(l) * F * 0.29); ctx.lineTo(ax, ay);
    ctx.lineTo(cx + Math.cos(r) * F * 0.29, cy + Math.sin(r) * F * 0.29);
  }
  ctx.stroke();
  ring(0.33); tangentCircles(0.365, 0.027); ring(0.40);
  ring(0.43); ladder(0.43, 0.5, 4); ring(0.5);
  // zigzag band
  ctx.beginPath();
  const zn = 36;
  for (let i = 0; i <= zn * 2; i++) {
    const a = (i / (zn * 2)) * TAU, k = i % 2 ? 0.665 : 0.535;
    const x = cx + Math.cos(a) * F * k, y = cy + Math.sin(a) * F * k;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.stroke();
  for (let i = 0; i < zn; i++) { // dots inside the outward triangles
    const a = ((i + 0.5) / zn) * TAU;
    circle(ctx, cx + Math.cos(a) * F * 0.625, cy + Math.sin(a) * F * 0.625, F * 0.011); ctx.fill();
  }
  ring(0.52); ring(0.68);
  ring(0.71); tangentCircles(0.75, 0.031); ring(0.79);
  ring(0.82); ladder(0.82, 0.91, 3.2); ring(0.91); ring(0.95);
}

function star(ctx, cx, cy, F) {
  const rays = 12, ro = F * 0.31, ri = F * 0.1;
  ctx.beginPath();
  for (let i = 0; i < rays * 2; i++) {
    const a = (i / (rays * 2)) * TAU - Math.PI / 2, r = i % 2 ? ri : ro;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

export class DrumFace {
  constructor(canvas, sizeCss) {
    this.canvas = canvas;
    this.dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    this.S = sizeCss;
    canvas.width = canvas.height = Math.round(sizeCss * this.dpr);
    canvas.style.width = canvas.style.height = `${sizeCss}px`;
    this.ctx = canvas.getContext('2d');
    this.base = this._layer((c, g) => this._drawBase(c, g));
    this.lines = this._layer((c, g) => { motifs(c, g.cx, g.cy, g.F, 'rgba(255, 236, 190, 0.85)'); star(c, g.cx, g.cy, g.F); c.lineWidth = 1; c.stroke(); });
    this.gloss = this._layer((c, g) => {
      const gr = c.createRadialGradient(g.cx - g.F * 0.35, g.cy - g.F * 0.45, 0, g.cx - g.F * 0.35, g.cy - g.F * 0.45, g.F * 0.9);
      gr.addColorStop(0, 'rgba(255,255,255,0.28)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; circle(c, g.cx, g.cy, g.F); c.fill();
    });
  }

  get geom() { const S = this.S, R = S / 2 - 2; return { S, cx: S / 2, cy: S / 2, R, F: R * 0.8, A: R * 0.9, W: R * 0.1 }; }

  _layer(fn) {
    const c = document.createElement('canvas');
    c.width = c.height = this.canvas.width;
    const x = c.getContext('2d'); x.scale(this.dpr, this.dpr);
    fn(x, this.geom);
    return c;
  }

  _drawBase(c, g) {
    const { cx, cy, R, F } = g;
    // outer rim: bevelled bronze
    let gr = c.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    gr.addColorStop(0, '#f2cf8a'); gr.addColorStop(0.35, '#b07e46'); gr.addColorStop(0.7, '#5c3c1c'); gr.addColorStop(1, '#2e1d0e');
    c.fillStyle = gr; circle(c, cx, cy, R); c.fill();
    // groove for the notch arcs
    c.fillStyle = '#17110b'; circle(c, cx, cy, R * 0.97); c.fill();
    gr = c.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    gr.addColorStop(0, '#d6a868'); gr.addColorStop(1, '#3b2814');
    c.fillStyle = gr; circle(c, cx, cy, R * 0.84); c.fill();
    // face
    gr = c.createRadialGradient(cx - F * 0.2, cy - F * 0.25, F * 0.1, cx, cy, F);
    gr.addColorStop(0, '#8e6c3c'); gr.addColorStop(0.6, '#5e4524'); gr.addColorStop(1, '#3a2913');
    c.fillStyle = gr; circle(c, cx, cy, F); c.fill();
    // embossed bands: dark shadow offset, then light edge
    c.save(); c.translate(0.5, 0.6); motifs(c, cx, cy, F, 'rgba(20, 12, 4, 0.75)'); c.restore();
    motifs(c, cx, cy, F, 'rgba(233, 196, 128, 0.55)');
    // star
    c.save(); c.translate(0.6, 0.8); star(c, cx, cy, F); c.fillStyle = 'rgba(20,12,4,0.7)'; c.fill(); c.restore();
    star(c, cx, cy, F);
    gr = c.createRadialGradient(cx, cy, 0, cx, cy, F * 0.31);
    gr.addColorStop(0, '#fff0c8'); gr.addColorStop(0.5, '#e2b062'); gr.addColorStop(1, '#a8743a');
    c.fillStyle = gr; c.fill();
    c.fillStyle = '#5a3d1c'; circle(c, cx, cy, F * 0.055); c.fill();
  }

  /** s: { level (0..1 shown), segs [4 x 0..1], full, t (s), slosh (0..1), pulse (0..1) } */
  draw(s) {
    const c = this.ctx, g = this.geom, { cx, cy, F } = g, col = s.full ? FLUID.full : FLUID.fill;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, g.S, g.S);
    c.drawImage(this.base, 0, 0, g.S, g.S);
    // Full: the surface stays just under the rim so the molten fluid still visibly churns.
    const level = Math.max(0, Math.min(s.full ? 0.9 : 1, s.level));
    if (level > 0.002) {
      c.save(); circle(c, cx, cy, F - 0.5); c.clip();
      const yL = cy + F - 2 * F * level;
      const amp = F * (s.full ? 0.03 : 0.035 + 0.06 * s.slosh);
      const wave = (x, ph, k1, k2) => yL + Math.sin(x * k1 + ph) * amp + Math.sin(x * k2 - ph * 1.7) * amp * 0.5;
      const path = (ph, k1, k2, dy = 0) => {
        c.beginPath(); c.moveTo(cx - F, cy + F + 2);
        for (let x = cx - F; x <= cx + F + 0.1; x += 2) c.lineTo(x, wave(x, ph, k1, k2) + dy);
        c.lineTo(cx + F, cy + F + 2); c.closePath();
      };
      const t = s.t;
      // back wave
      path(t * 1.9 + 1.3, 0.11, 0.23, -F * 0.03);
      c.globalAlpha = s.full ? 0.75 : 0.55; c.fillStyle = col.back; c.fill();
      // front wave with depth gradient
      path(t * 2.6, 0.085, 0.19);
      const gr = c.createLinearGradient(0, Math.max(cy - F, yL - amp), 0, cy + F);
      gr.addColorStop(0, col.top); gr.addColorStop(0.18, col.mid); gr.addColorStop(1, col.deep);
      c.globalAlpha = s.full ? 0.92 : 0.82; c.fillStyle = gr; c.fill();
      c.globalAlpha = 1;
      // engraved bands show through the fluid
      c.globalCompositeOperation = 'soft-light'; c.globalAlpha = 0.55; c.drawImage(this.lines, 0, 0, g.S, g.S);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = s.full ? 0.3 + 0.25 * s.pulse : 0.14; c.drawImage(this.lines, 0, 0, g.S, g.S);
      // bright surface line
      c.globalAlpha = 0.9; c.strokeStyle = col.top; c.lineWidth = 1.6;
      c.beginPath();
      for (let x = cx - F; x <= cx + F + 0.1; x += 2) { const y = wave(x, t * 2.6, 0.085, 0.19); if (x === cx - F) c.moveTo(x, y); else c.lineTo(x, y); }
      c.stroke();
      // rising bubbles
      c.globalAlpha = 0.6; c.fillStyle = col.top;
      for (let i = 0; i < (s.full ? 10 : 6); i++) {
        const u = (t * ((s.full ? 0.35 : 0.18) + i * 0.03) + i * 0.37) % 1;
        const y = cy + F - u * (cy + F - yL), x = cx + Math.sin(i * 2.1 + t * 0.9) * F * 0.55;
        if (y > yL + amp) { circle(c, x, y, 0.8 + (i % 3) * 0.5); c.fill(); }
      }
      // inner heat when full
      if (s.full) {
        const hg = c.createRadialGradient(cx, cy, 0, cx, cy, F);
        hg.addColorStop(0, `rgba(255, 220, 120, ${0.16 + 0.2 * s.pulse})`); hg.addColorStop(1, 'rgba(255, 80, 20, 0)');
        c.globalAlpha = 1; c.fillStyle = hg; circle(c, cx, cy, F); c.fill();
      }
      c.restore();
    }
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1; c.drawImage(this.gloss, 0, 0, g.S, g.S);
    c.globalCompositeOperation = 'source-over';
    // 4 notch arcs on the rim (clockwise from the top)
    const gap = 0.16, rA = g.R * 0.905, w = g.R * 0.1;
    c.lineCap = 'butt';
    for (let k = 0; k < 4; k++) {
      const a0 = -Math.PI / 2 + (k * Math.PI) / 2 + gap / 2, a1 = a0 + Math.PI / 2 - gap;
      c.strokeStyle = 'rgba(0,0,0,0.65)'; c.lineWidth = w; c.shadowBlur = 0;
      c.beginPath(); c.arc(cx, cy, rA, a0, a1); c.stroke();
      const f = Math.max(0, Math.min(1, s.segs?.[k] ?? 0));
      if (f > 0) {
        c.strokeStyle = col.arc; c.lineWidth = w * 0.72;
        c.shadowColor = col.glow; c.shadowBlur = f >= 1 ? 7 : 3;
        c.beginPath(); c.arc(cx, cy, rA, a0, a0 + (a1 - a0) * f); c.stroke();
      }
    }
    c.shadowBlur = 0;
  }
}
