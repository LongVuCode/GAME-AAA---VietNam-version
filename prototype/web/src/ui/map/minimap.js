// ui/map/minimap.js - round minimap in the HUD's top-left slot (map.json minimap): rotates with the
// camera by default (acc_minimap_rotation = north_up keeps north at the top), shares the exploration
// fog with the world map, shows the player, nearby / engaged enemies (dot, diamond for strong ones,
// tusk for the great beast), the tracked objective (clamped to the rim), landmarks and custom markers.
// Border: two rings with a band of tangent circles and four notches in dull bronze [SÁNG TẠO]
// (map.json minimap.border; no sun-star centre, no Lạc bird).
import { buildLevelArt, composeFog } from './mapArt.js';
import { drawIcon, drawPlayer } from './mapIcons.js';
import { levelOf, cameraUpRotation, clampToCircle } from './mapModel.js';

const TAU = Math.PI * 2;
const SIZE = 180;          // CSS px of the HUD slot (src/ui/hud .h-minimap-slot)

export class Minimap {
  constructor(game, explore, slot) {
    this.g = game; this.ex = explore; this.mm = game.data.map.minimap;
    this.el = document.createElement('div'); this.el.className = 'mm3'; this.el.setAttribute('aria-hidden', 'true');
    this.canvas = document.createElement('canvas'); this.el.appendChild(this.canvas);
    this.ring = document.createElement('canvas'); this.ring.className = 'ring'; this.el.appendChild(this.ring);
    this.north = document.createElement('div'); this.north.className = 'mm3-n'; this.el.appendChild(this.north);
    (slot ?? game.container).appendChild(this.el);
    this.dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.canvas.width = this.canvas.height = Math.round(SIZE * this.dpr);
    this.ring.width = this.ring.height = Math.round(SIZE * this.dpr);
    this.zoomM = this.mm.world_radius_m;
    this.levels = new Map(); // levelId -> { art, out, version }
    this.t = 0; this.drawn = 0;
    this._drawRing();
  }
  _level(levelId) {
    let L = this.levels.get(levelId);
    if (!L) {
      const lv = this.g.data.map.levels.find((l) => l.id === levelId);
      L = { art: buildLevelArt(lv, this.g.data.map, 'dark', 6), out: document.createElement('canvas'), version: -1, t: 0 };
      this.levels.set(levelId, L);
    }
    return L;
  }
  setZoom(m) { if (this.mm.zoom_steps_m.includes(m)) this.zoomM = m; }

  _drawRing() {
    const c = this.ring.getContext('2d'), d = this.dpr, R = SIZE / 2;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, SIZE, SIZE);
    const col = this.mm.border.color_hex;
    c.translate(R, R);
    c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R - 2, 0, TAU); c.stroke();
    c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, R - 13, 0, TAU); c.stroke();
    // Band of tangent circles, each with a centre dot (a plain geometric band, ART_DIRECTION P1).
    const n = 30, rr = R - 7.5, cr = Math.sin(Math.PI / n) * rr;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      c.beginPath(); c.arc(x, y, cr * 0.92, 0, TAU); c.lineWidth = 1; c.strokeStyle = col; c.stroke();
      c.beginPath(); c.arc(x, y, 1, 0, TAU); c.fillStyle = col; c.fill();
    }
    // Four cardinal notches (inward ticks).
    for (let k = 0; k < this.mm.border.cardinal_notches; k++) {
      const a = k / this.mm.border.cardinal_notches * TAU - Math.PI / 2;
      c.save(); c.rotate(a + Math.PI / 2);
      c.beginPath(); c.moveTo(-5, -(R - 13)); c.lineTo(5, -(R - 13)); c.lineTo(0, -(R - 21)); c.closePath(); c.fillStyle = col; c.fill();
      c.restore();
    }
    // Soft inner shadow.
    const g = c.createRadialGradient(0, 0, R * 0.55, 0, 0, R - 13);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R - 13, 0, TAU); c.fill();
  }

  hiddenNow() {
    const g = this.g, p = g.player;
    if (!(g.mode === 'playing' || g.mode === 'paused')) return true;
    return !!(g.pry || g.handoverPose || g.finishing || p?.state === 'burst' || p?.state === 'tusk_lock' || g.cinematic);
  }

  /** dt: real seconds. Redraws at ~30 Hz. */
  update(dt) {
    const hide = this.hiddenNow();
    this.el.classList.toggle('off', hide);
    if (hide) return;
    this.t += dt;
    if (this.t < 1 / 30 && this.drawn > 0) return;
    this.t = 0; this.drawn++;
    this.draw();
  }

  draw() {
    const g = this.g, p = g.player, ex = this.ex, d = this.dpr, R = SIZE / 2, inner = R - 14;
    const c = this.canvas.getContext('2d');
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, SIZE, SIZE);
    c.save(); c.translate(R, R);
    c.beginPath(); c.arc(0, 0, inner, 0, TAU); c.clip();
    const bg = this.mm.background;
    c.fillStyle = bg.color_hex; c.globalAlpha = bg.alpha; c.fillRect(-R, -R, SIZE, SIZE); c.globalAlpha = 1;
    // Faint reed hatching on the blank (unexplored) ground.
    c.strokeStyle = 'rgba(214,196,150,0.07)'; c.lineWidth = 1;
    for (let i = -R; i < R; i += 7) { c.beginPath(); c.moveTo(i, R); c.lineTo(i + 30, -R); c.stroke(); }
    const north = (g.settings.acc.acc_minimap_rotation ?? this.mm.rotation_default) === 'north_up';
    const rot = north ? 0 : cameraUpRotation(g.cam?.yaw ?? 0);
    const s = inner / this.zoomM; // px per metre
    const lv = levelOf(g.data.map, p.x, p.z);
    if (lv) {
      const L = this._level(lv.id);
      const grid = ex.fog.grid(lv.id);
      if (L.version !== ex.fog.version) { composeFog(L.art, grid, L.out); L.version = ex.fog.version; }
      c.save(); c.rotate(rot); c.scale(s / L.art.s, s / L.art.s);
      c.drawImage(L.out, (L.art.x0 - p.x) * L.art.s, (L.art.z0 - p.z) * L.art.s);
      c.restore();
    }
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const toS = (x, z) => { const dx = (x - p.x) * s, dy = (z - p.z) * s; return [dx * cos - dy * sin, dx * sin + dy * cos]; };
    const icon = (shape, x, z, size, style, clamp = false) => {
      let [sx, sy] = toS(x, z);
      if (clamp) { const q = clampToCircle(sx, sy, inner - 9); sx = q.x; sy = q.y; } else if (Math.hypot(sx, sy) > inner - 4) return;
      drawIcon(c, shape, sx, sy, size, style);
    };
    const shows = new Set(this.mm.shows);
    const iconShape = (id) => g.data.map.icons.find((i) => i.id === id)?.shape ?? 'dot';
    for (const l of g.data.map.landmarks) {
      if (!shows.has(l.icon) || l.kind === 'boss' || !ex.landmarkVisible(l)) continue;
      icon(iconShape(l.icon), l.x, l.z, 13, { fill: '#2a221a', stroke: '#e9dcbc' });
    }
    if (shows.has('ic_chest')) for (const ch of g.data.map.chests) if (!ex.opened.has(ch.id) && ex.fog.isRevealed(ch.x, ch.z)) icon('box', ch.x, ch.z, 12, { fill: '#2a221a', stroke: '#e3c48a' });
    for (const m of ex.markers.list) icon(m.kind, m.x, m.z, 14, { accent: '#e3c48a', stroke: '#1d1b19' });
    // Enemies: engaged or within minimap.enemy_dots.within_m.
    const ed = this.mm.enemy_dots;
    for (const e of g.allEnemies()) {
      if (!e.alive || e.state === 'gone' || e.state === 'freed') continue;
      const dist = Math.hypot(e.x - p.x, e.z - p.z);
      if (!(e.engaged || dist <= ed.within_m)) continue;
      const rank = e.def.rank;
      if (rank === 'boss') icon('tusk', e.x, e.z, 16, { fill: '#3a1f14', stroke: '#f0d7a2' }, e.engaged && ed.offscreen_attacker_edge_pip);
      else if (rank === 'elite') icon('diamond', e.x, e.z, 11, { fill: '#e2b46a', stroke: '#1d1b19' }, e.engaged && ed.offscreen_attacker_edge_pip);
      else icon('dot', e.x, e.z, 8, { fill: e.engaged ? '#f0c27a' : '#e8d3a8', stroke: '#1d1b19' }, e.engaged && ed.offscreen_attacker_edge_pip);
    }
    const obj = ex.objectiveTarget();
    if (obj && this.mm.objective_clamp_to_edge) icon('diamond_ring', obj.x, obj.z, 15, { fill: '#1d1b19', stroke: '#e3c48a', accent: '#e3c48a' }, true);
    c.restore();
    // Player arrow (centre): faces its own heading on the rotated map.
    c.save(); c.translate(R, R);
    const heading = (p.yaw ?? 0);
    // Player yaw: facing (sin yaw, cos yaw) in world x/z.
    const fx = Math.sin(heading), fz = Math.cos(heading);
    const ax = fx * cos - fz * sin, ay = fx * sin + fz * cos;
    drawPlayer(c, 0, 0, 13, Math.atan2(ax, -ay));
    c.restore();
    // North letter rides on the rim.
    const nAng = rot - Math.PI / 2;
    const nr = R - 24;
    this.north.style.transform = `translate(${(R + Math.cos(nAng) * nr).toFixed(1)}px, ${(R + Math.sin(nAng) * nr).toFixed(1)}px) translate(-50%, -50%)`;
    const nt = g.i18n.t('minimap_north');
    if (this.north.textContent !== nt) this.north.textContent = nt;
  }
}
