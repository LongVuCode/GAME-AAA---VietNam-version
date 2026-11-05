// ui/map/mapIcons.js - vector map symbols (canvas 2D) for map.json icons[].shape and the custom
// marker kinds. Drawn as simple geometric strokes in the spirit of the brief (ART_DIRECTION P1):
// plain shapes, readable at 10-16 px, never a sun-star or a Lạc bird. [SÁNG TẠO]

const TAU = Math.PI * 2;

/** Draws `shape` centred at (x, y), size s (px, ~ diameter). style: { fill, stroke, lw }. */
export function drawIcon(ctx, shape, x, y, s, style = {}) {
  const fill = style.fill ?? '#2a221a', stroke = style.stroke ?? '#f1e6cc', lw = style.lw ?? Math.max(1.2, s * 0.11);
  const r = s / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.fillStyle = fill;
  const both = () => { ctx.fill(); ctx.stroke(); };
  const plate = () => { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); both(); ctx.fillStyle = stroke; ctx.strokeStyle = stroke; };
  switch (shape) {
    case 'flame': plate(); ctx.beginPath(); ctx.moveTo(0, -r * 0.62); ctx.bezierCurveTo(r * 0.5, -r * 0.1, r * 0.42, r * 0.5, 0, r * 0.55); ctx.bezierCurveTo(-r * 0.42, r * 0.5, -r * 0.5, -r * 0.1, 0, -r * 0.62); ctx.fill(); break;
    case 'boat': plate(); ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.05); ctx.lineTo(r * 0.7, -r * 0.05); ctx.quadraticCurveTo(r * 0.45, r * 0.5, 0, r * 0.45); ctx.quadraticCurveTo(-r * 0.45, r * 0.5, -r * 0.7, -r * 0.05); ctx.fill(); ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.05); ctx.lineTo(r * 0.45, -r * 0.65); ctx.stroke(); break;
    case 'head': plate(); ctx.beginPath(); ctx.arc(0, -r * 0.18, r * 0.3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, r * 0.62, r * 0.48, Math.PI, TAU); ctx.fill(); break;
    case 'diamond_ring': ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = fill; both(); ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.55, 0); ctx.lineTo(0, r * 0.55); ctx.lineTo(-r * 0.55, 0); ctx.closePath(); ctx.fillStyle = style.accent ?? '#e3c48a'; ctx.fill(); break;
    case 'tusk': plate(); ctx.beginPath(); ctx.moveTo(-r * 0.55, r * 0.45); ctx.quadraticCurveTo(-r * 0.4, -r * 0.55, r * 0.55, -r * 0.55); ctx.quadraticCurveTo(-r * 0.05, -r * 0.2, -r * 0.2, r * 0.5); ctx.closePath(); ctx.fill(); break;
    case 'dot': ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, TAU); ctx.fillStyle = style.fill ?? '#e8d3a8'; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = style.stroke ?? '#1d1b19'; ctx.stroke(); break;
    case 'diamond': ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.8, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.8, 0); ctx.closePath(); ctx.fillStyle = style.fill ?? '#e8d3a8'; both(); break;
    case 'spiral': plate(); ctx.beginPath(); for (let a = 0; a < TAU * 1.7; a += 0.2) { const rr = r * 0.08 + a * r * 0.055; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.lineWidth = lw * 0.9; ctx.stroke(); break;
    case 'eye': plate(); ctx.beginPath(); ctx.moveTo(-r * 0.65, 0); ctx.quadraticCurveTo(0, -r * 0.6, r * 0.65, 0); ctx.quadraticCurveTo(0, r * 0.6, -r * 0.65, 0); ctx.lineWidth = lw * 0.9; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.17, 0, TAU); ctx.fill(); break;
    case 'box': plate(); ctx.fillRect(-r * 0.5, -r * 0.18, r, r * 0.6); ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.28); ctx.lineTo(r * 0.55, -r * 0.28); ctx.lineWidth = lw; ctx.stroke(); break;
    case 'triangle': ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.92, r * 0.72); ctx.lineTo(-r * 0.92, r * 0.72); ctx.closePath(); both(); ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.18, 0, TAU); ctx.fillStyle = stroke; ctx.fill(); break;
    case 'leaf': plate(); ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.5); ctx.quadraticCurveTo(-r * 0.5, -r * 0.5, r * 0.55, -r * 0.55); ctx.quadraticCurveTo(r * 0.5, r * 0.5, -r * 0.5, r * 0.5); ctx.fill(); break;
    case 'gate': plate(); ctx.lineWidth = lw * 0.9; for (const gx of [-0.4, 0, 0.4]) { ctx.beginPath(); ctx.moveTo(gx * r, -r * 0.5); ctx.lineTo(gx * r, r * 0.5); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.2); ctx.lineTo(r * 0.55, -r * 0.2); ctx.stroke(); break;
    case 'anvil_round': plate(); ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.45, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.fillRect(-r * 0.5, r * 0.15, r, r * 0.22); break;
    case 'jar': plate(); ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.5); ctx.lineTo(r * 0.32, -r * 0.5); ctx.quadraticCurveTo(r * 0.62, 0, r * 0.3, r * 0.55); ctx.lineTo(-r * 0.3, r * 0.55); ctx.quadraticCurveTo(-r * 0.62, 0, -r * 0.32, -r * 0.5); ctx.fill(); break;
    case 'drum': plate(); ctx.beginPath(); ctx.ellipse(0, -r * 0.25, r * 0.5, r * 0.18, 0, 0, TAU); ctx.fill(); ctx.fillRect(-r * 0.5, -r * 0.25, r, r * 0.6); ctx.beginPath(); ctx.ellipse(0, -r * 0.25, r * 0.36, r * 0.1, 0, 0, TAU); ctx.fillStyle = fill; ctx.fill(); break;
    case 'pin_cloth': ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(0, -r * 0.9); ctx.lineWidth = lw; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(r * 0.85, -r * 0.6); ctx.lineTo(0, -r * 0.25); ctx.closePath(); ctx.fillStyle = style.accent ?? '#c9a24f'; ctx.fill(); ctx.stroke(); break;
    case 'circle': ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, TAU); ctx.lineWidth = lw * 1.4; ctx.strokeStyle = style.accent ?? '#c9a24f'; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, TAU); ctx.fillStyle = style.accent ?? '#c9a24f'; ctx.fill(); break;
    case 'cross': ctx.lineWidth = lw * 1.5; ctx.strokeStyle = style.accent ?? '#c9a24f'; ctx.beginPath(); ctx.moveTo(-r * 0.65, -r * 0.65); ctx.lineTo(r * 0.65, r * 0.65); ctx.moveTo(r * 0.65, -r * 0.65); ctx.lineTo(-r * 0.65, r * 0.65); ctx.stroke(); break;
    case 'star_reed': ctx.lineWidth = lw * 1.2; ctx.strokeStyle = style.accent ?? '#c9a24f'; for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.42; ctx.beginPath(); ctx.moveTo(0, r * 0.8); ctx.quadraticCurveTo(Math.cos(a) * r * 0.2, 0, Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.85); ctx.stroke(); } break;
    default: plate(); break;
  }
  ctx.restore();
}

/** Player arrow with a view cone (world_map.player_icon). angle: radians, 0 = up (screen). */
export function drawPlayer(ctx, x, y, s, angle, { cone = true, color = '#f4e7c4', edge = '#1d1b19' } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  if (cone) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.6);
    g.addColorStop(0, 'rgba(244,231,196,0.42)'); g.addColorStop(1, 'rgba(244,231,196,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, s * 2.6, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); ctx.closePath(); ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(0, -s * 0.75); ctx.lineTo(s * 0.5, s * 0.55); ctx.lineTo(0, s * 0.28); ctx.lineTo(-s * 0.5, s * 0.55); ctx.closePath();
  ctx.fillStyle = color; ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1.5, s * 0.14); ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill();
  ctx.restore();
}

/** Small canvas with one icon (legend rows, buttons). */
export function iconCanvas(shape, px = 22, style = {}) {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  c.width = c.height = Math.round(px * dpr); c.style.width = c.style.height = `${px}px`;
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  drawIcon(ctx, shape, px / 2, px / 2, px * 0.82, style);
  return c;
}
