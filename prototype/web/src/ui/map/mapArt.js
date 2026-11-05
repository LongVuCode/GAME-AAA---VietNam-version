// ui/map/mapArt.js - draws a level of the graybox world as a map image from the same geometry the
// game walks on (world.js AREAS, mud pools, shallow sheets, vault obstacles, props) and map.json.
// Two palettes: 'cloth' (world map, "charcoal and plant sap on ramie cloth", map.json world_map.style)
// and 'dark' (minimap, on the HUD charcoal). Unexplored cells are covered by blank cloth with faint
// reed hatching (fog.unexplored_style). Canvas 2D only; built once per level, fog composed on change.
import { AREAS, MUD_POOLS_BASE, VAULTS, SHALLOW_SHEETS, mulberry32 } from '../../game/world.js';

const ZONE_TINT = {
  cloth: {
    z_ben_say: 'rgba(176,146,98,0.50)', z_dam_nong: 'rgba(120,138,112,0.45)', z_bai_lau: 'rgba(181,160,104,0.50)',
    z_lo_bo_hoang: 'rgba(150,104,76,0.45)', z_dau_truong: 'rgba(98,76,54,0.55)', hub: 'rgba(170,140,96,0.5)', hub_bank: 'rgba(166,150,110,0.5)',
    path: 'rgba(168,140,96,0.55)',
  },
  dark: {
    z_ben_say: 'rgba(140,116,80,0.85)', z_dam_nong: 'rgba(86,102,82,0.85)', z_bai_lau: 'rgba(124,128,78,0.85)',
    z_lo_bo_hoang: 'rgba(118,88,66,0.85)', z_dau_truong: 'rgba(92,72,52,0.9)', hub: 'rgba(134,121,90,0.85)', hub_bank: 'rgba(138,132,98,0.85)',
    path: 'rgba(170,150,110,0.85)',
  },
};
const INK = { cloth: '#2b241c', dark: '#d8c9a4' };

function blankCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/** Wobbly hand-drawn stroke along a polyline (world coordinates mapped by P). */
function sketch(ctx, pts, rnd, amp, closed = false) {
  const seq = closed ? [...pts, pts[0]] : pts, jit = () => (rnd() - 0.5) * amp;
  ctx.beginPath();
  ctx.moveTo(seq[0][0] + jit(), seq[0][1] + jit());
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i];
    const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14));
    for (let k = 1; k <= steps; k++) { const t = k / steps; ctx.lineTo(a[0] + (b[0] - a[0]) * t + jit(), a[1] + (b[1] - a[1]) * t + jit()); }
  }
  ctx.stroke();
}
function circlePts(cx, cy, r, n = 48) { return Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * Math.PI * 2) * r, cy + Math.sin(i / n * Math.PI * 2) * r]); }

function weave(ctx, w, h, rnd, base, alpha) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#6b5a3c'; ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 3) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5 + (rnd() - 0.5)); ctx.stroke(); }
  ctx.strokeStyle = '#f6ecd2';
  for (let x = 0; x < w; x += 4) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5 + (rnd() - 0.5), h); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // Slubs of the ramie yarn.
  for (let i = 0; i < (w * h) / 900; i++) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(90,70,40,0.10)' : 'rgba(255,245,220,0.12)';
    ctx.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 9, 1);
  }
}

/**
 * Builds the static art of a level. level: map.json levels[] entry. Returns
 * { canvas, blank, s (px per m), x0, z0, w, h, P(x, z) -> [px, py] }.
 */
export function buildLevelArt(level, mapData, palette = 'cloth', s = 8) {
  const b = level.bounds, w = Math.round((b.x1 - b.x0) * s), h = Math.round((b.z1 - b.z0) * s);
  const P = (x, z) => [(x - b.x0) * s, (z - b.z0) * s];
  const rnd = mulberry32(palette === 'cloth' ? 11 : 12);
  const c = blankCanvas(w, h), ctx = c.getContext('2d');
  const ink = INK[palette], tint = ZONE_TINT[palette];
  const inLevel = (a) => (a.rect ? a.rect.x1 >= b.x0 && a.rect.x0 <= b.x1 && a.rect.z1 >= b.z0 && a.rect.z0 <= b.z1
    : a.circle.cx >= b.x0 && a.circle.cx <= b.x1 && a.circle.cz >= b.z0 && a.circle.cz <= b.z1);
  const areas = AREAS.filter((a) => inLevel(a) && a.id !== 'shortcut');
  const walkable = (x, z) => AREAS.some((a) => (a.rect ? x >= a.rect.x0 && x <= a.rect.x1 && z >= a.rect.z0 && z <= a.rect.z1 : Math.hypot(x - a.circle.cx, z - a.circle.cz) <= a.circle.r));

  if (palette === 'cloth') {
    weave(ctx, w, h, rnd, '#cfbf98', 0.07);
    // Open water / marsh beyond the walkable ground: grey-green wash + ripple strokes.
    ctx.fillStyle = 'rgba(78,98,92,0.30)'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(43,46,40,0.30)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < (w * h) / 2600; i++) {
      const x = b.x0 + rnd() * (b.x1 - b.x0), z = b.z0 + rnd() * (b.z1 - b.z0);
      if (walkable(x, z)) continue;
      const [px, py] = P(x, z);
      ctx.beginPath(); ctx.moveTo(px - 7, py); ctx.quadraticCurveTo(px - 3.5, py - 3, px, py); ctx.quadraticCurveTo(px + 3.5, py + 3, px + 7, py); ctx.stroke();
    }
  }
  // Ground: zone tints, then the charcoal outline drawn twice with a wobble.
  for (const a of areas) {
    const key = a.id.startsWith('c') && a.id.length <= 3 ? 'path' : a.id;
    ctx.fillStyle = tint[key] ?? tint.path;
    if (a.rect) { const [x0, y0] = P(a.rect.x0, a.rect.z0); const [x1, y1] = P(a.rect.x1, a.rect.z1); ctx.fillRect(x0, y0, x1 - x0, y1 - y0); }
    else { const [cx, cy] = P(a.circle.cx, a.circle.cz); ctx.beginPath(); ctx.arc(cx, cy, a.circle.r * s, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.strokeStyle = ink; ctx.globalAlpha = palette === 'cloth' ? 0.55 : 0.35; ctx.lineWidth = palette === 'cloth' ? 1.6 : 1.2;
  for (let pass = 0; pass < (palette === 'cloth' ? 2 : 1); pass++) {
    for (const a of areas) {
      if (a.rect) {
        const [x0, y0] = P(a.rect.x0, a.rect.z0); const [x1, y1] = P(a.rect.x1, a.rect.z1);
        sketch(ctx, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], rnd, palette === 'cloth' ? 3 : 1, true);
      } else { const [cx, cy] = P(a.circle.cx, a.circle.cz); sketch(ctx, circlePts(cx, cy, a.circle.r * s), rnd, palette === 'cloth' ? 3 : 1, true); }
    }
  }
  ctx.globalAlpha = 1;
  // Shallow water sheets: wave hatching.
  for (const [cx, cz, sw, sd] of SHALLOW_SHEETS) {
    if (!(cx >= b.x0 && cx <= b.x1 && cz >= b.z0 && cz <= b.z1)) continue;
    const [x0, y0] = P(cx - sw / 2, cz - sd / 2); const [x1, y1] = P(cx + sw / 2, cz + sd / 2);
    ctx.save(); ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette === 'cloth' ? 'rgba(74,104,104,0.35)' : 'rgba(70,110,112,0.7)'; ctx.fill(); ctx.clip();
    ctx.strokeStyle = palette === 'cloth' ? 'rgba(40,58,60,0.55)' : 'rgba(170,200,196,0.35)'; ctx.lineWidth = 1;
    for (let y = y0 + 4; y < y1; y += 7) { ctx.beginPath(); for (let x = x0; x <= x1; x += 6) { const yy = y + Math.sin(x * 0.25 + y) * 1.6; if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke(); }
    ctx.restore();
  }
  // Reeds: small three-stroke tufts in the reed beds, around the mire and along the marsh edge.
  const tuft = (x, z, k) => {
    const [px, py] = P(x, z);
    if (palette === 'dark') { ctx.fillStyle = 'rgba(214,200,140,0.45)'; ctx.fillRect(px, py, 1.6, 1.6); return; }
    ctx.strokeStyle = 'rgba(60,56,30,0.55)'; ctx.lineWidth = 1;
    for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + j * 2.2 * k, py - 6 * k); ctx.stroke(); }
  };
  if (b.x0 < 0) {
    for (let i = 0; i < 520; i++) { const x = -24 + rnd() * 48, z = -101 + rnd() * 48; tuft(x, z, 0.9 + rnd() * 0.4); }
    for (let i = 0; i < 160; i++) { const a = rnd() * Math.PI * 2, r = 18.5 + rnd() * 5; tuft(Math.cos(a) * r, -136 + Math.sin(a) * r, 0.9); }
    for (let i = 0; i < 140; i++) { const x = -30 + rnd() * 60, z = -46 + rnd() * 40; if (Math.abs(x) > 24 || z < -42 || z > -9) tuft(x, z, 0.8); }
  }
  // Mud pools of the mire: dark wash + spiral strokes.
  for (const m of MUD_POOLS_BASE) {
    const [cx, cy] = P(m.cx, m.cz);
    ctx.fillStyle = palette === 'cloth' ? 'rgba(52,40,28,0.55)' : 'rgba(40,32,24,0.95)';
    ctx.beginPath(); ctx.arc(cx, cy, m.r * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = palette === 'cloth' ? 'rgba(30,24,16,0.6)' : 'rgba(150,120,90,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let a = 0; a < 9; a += 0.25) { const rr = a / 9 * m.r * s * 0.8; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.stroke();
  }
  // Fallen log and ditch (vault obstacles).
  for (const v of VAULTS) {
    const [ax, ay] = P(v.ax, v.az); const [bx, by] = P(v.bx, v.bz);
    ctx.strokeStyle = v.kind === 'log' ? (palette === 'cloth' ? 'rgba(70,50,30,0.85)' : 'rgba(150,120,80,0.95)') : (palette === 'cloth' ? 'rgba(50,80,84,0.8)' : 'rgba(90,140,140,0.9)');
    ctx.lineWidth = v.hw * 2 * s * 0.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.lineCap = 'butt';
  }
  // Built things: hut at Bến Sậy, kiln dome, hub houses and furnace (as plain plans).
  const block = (x, z, ww, dd) => { const [px, py] = P(x - ww / 2, z - dd / 2); ctx.fillStyle = palette === 'cloth' ? 'rgba(80,60,40,0.45)' : 'rgba(200,180,140,0.55)'; ctx.fillRect(px, py, ww * s, dd * s); ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.strokeRect(px, py, ww * s, dd * s); };
  const dome = (x, z, r) => { const [px, py] = P(x, z); ctx.fillStyle = palette === 'cloth' ? 'rgba(120,80,56,0.55)' : 'rgba(170,120,90,0.7)'; ctx.beginPath(); ctx.arc(px, py, r * s, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke(); };
  if (b.x0 < 0) { block(-10, 4, 4, 3.4); dome(-31, -111, 3); }
  else { block(308, 6, 6, 5); dome(292, -8, 1.8); }
  // Paths (map.json paths, not the hidden shortcut): dashed centre line.
  ctx.setLineDash([6, 5]); ctx.strokeStyle = palette === 'cloth' ? 'rgba(43,36,28,0.6)' : 'rgba(230,214,170,0.5)'; ctx.lineWidth = 1.4;
  for (const p of mapData.paths ?? []) {
    if (p.hidden_until) continue;
    const r = p.rect, horiz = r.x1 - r.x0 > r.z1 - r.z0;
    const a = horiz ? P(r.x0, (r.z0 + r.z1) / 2) : P((r.x0 + r.x1) / 2, r.z0);
    const e = horiz ? P(r.x1, (r.z0 + r.z1) / 2) : P((r.x0 + r.x1) / 2, r.z1);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Unexplored cover: blank cloth with faint reed hatching (or empty for the dark palette).
  let blank = null;
  if (palette === 'cloth') {
    blank = blankCanvas(w, h); const bc = blank.getContext('2d');
    weave(bc, w, h, mulberry32(5), '#d5c6a2', 0.06);
    bc.strokeStyle = 'rgba(90,76,50,0.13)'; bc.lineWidth = 1;
    for (let i = 0; i < (w * h) / 1400; i++) { const x = rnd() * w, y = rnd() * h; bc.beginPath(); bc.moveTo(x, y); bc.lineTo(x + 3, y - 9); bc.stroke(); }
  }
  return { canvas: c, blank, s, x0: b.x0, z0: b.z0, w, h, P, level };
}

/**
 * Composes art + fog into `out` (a canvas of the art's size). grid: FogGrid of the level.
 * cloth: unexplored cells show the blank cloth; dark: unexplored cells are transparent.
 */
export function composeFog(art, grid, out) {
  if (out.width !== art.w || out.height !== art.h) { out.width = art.w; out.height = art.h; }
  const mask = art._mask ?? (art._mask = blankCanvas(grid.cols, grid.rows));
  const mctx = mask.getContext('2d');
  const img = mctx.createImageData(grid.cols, grid.rows);
  for (let i = 0; i < grid.cells.length; i++) { img.data[i * 4 + 3] = grid.cells[i] ? 0 : 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255; }
  mctx.putImageData(img, 0, 0);
  const mw = grid.cols * grid.cell * art.s, mh = grid.rows * grid.cell * art.s;
  const ctx = out.getContext('2d');
  ctx.clearRect(0, 0, out.width, out.height);
  ctx.drawImage(art.canvas, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if (art.blank) {
    const tmp = art._tmp ?? (art._tmp = blankCanvas(art.w, art.h));
    const t = tmp.getContext('2d');
    t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, art.w, art.h); t.drawImage(art.blank, 0, 0);
    t.globalCompositeOperation = 'destination-in'; t.imageSmoothingEnabled = true; t.drawImage(mask, 0, 0, mw, mh);
    t.globalCompositeOperation = 'source-over';
    ctx.drawImage(tmp, 0, 0);
  } else {
    ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(mask, 0, 0, mw, mh); ctx.globalCompositeOperation = 'source-over';
  }
  return out;
}
