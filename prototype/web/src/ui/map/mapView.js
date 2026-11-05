// ui/map/mapView.js - the world map (M / Pack "Map" tab, map.json world_map): the level drawn on
// ramie cloth from the game geometry (mapArt.js) under the exploration fog, a woven geometric border
// (tangent circles + saw-tooth band, no sun-star, no Lạc bird), landmark symbols with a legend, the
// tracked objective, custom markers (place / remove, max from data), zone completion, fast travel
// between found resting fires, zoom (wheel, +/-, LT/RT) and pan (drag, WASD / arrows / left stick).
import { buildLevelArt, composeFog } from './mapArt.js';
import { drawIcon, drawPlayer, iconCanvas } from './mapIcons.js';
import { levelOf } from './mapModel.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BRONZE = '#9B7A4E', INK = '#2b241c';

export class MapView {
  constructor(game, explore, host) {
    this.g = game; this.ex = explore; this.map = game.data.map; this.wm = this.map.world_map;
    this.t = (k, v) => game.i18n.t(k, v); this.loc = (o) => game.i18n.loc(o);
    this.arts = new Map();
    this.markerKind = this.wm.custom_markers.kinds[0];
    this.legendOn = true; this.hover = null; this.drag = null; this.crosshair = false;
    this.el = document.createElement('div'); this.el.className = 'mv';
    this.el.innerHTML = `<div class="mv-stage"><canvas></canvas><div class="mv-tip hidden"></div><div class="mv-legend"></div>
      <div class="mv-zoom"><button data-z="-1" data-nav aria-label="-">−</button><button data-z="1" data-nav aria-label="+">+</button><button data-act="center" data-nav></button></div></div>
      <aside class="mv-side"></aside>`;
    host.appendChild(this.el);
    this.canvas = this.el.querySelector('canvas'); this.side = this.el.querySelector('.mv-side');
    this.tip = this.el.querySelector('.mv-tip'); this.legend = this.el.querySelector('.mv-legend');
    this._bindPointer();
    this.el.querySelector('[data-act=center]').addEventListener('click', () => this.center());
    for (const b of this.el.querySelectorAll('[data-z]')) b.addEventListener('click', () => this.zoomBy(+b.dataset.z > 0 ? 0.8 : 1.25));
    const p = game.player;
    this.levelId = levelOf(this.map, p.x, p.z)?.id ?? this.map.levels[0].id;
    this.zm = this.wm.zoom_m_per_screen.default;
    this.cx = p.x; this.cz = p.z;
    this.renderSide(); this.renderLegend();
  }

  _art(levelId) {
    let a = this.arts.get(levelId);
    if (!a) {
      const lv = this.map.levels.find((l) => l.id === levelId);
      a = { art: buildLevelArt(lv, this.map, 'cloth', 8), out: document.createElement('canvas'), version: -1 };
      this.arts.set(levelId, a);
    }
    if (a.version !== this.ex.fog.version) { composeFog(a.art, this.ex.fog.grid(levelId), a.out); a.version = this.ex.fog.version; }
    return a;
  }
  get level() { return this.map.levels.find((l) => l.id === this.levelId); }
  center() { const p = this.g.player; const lv = levelOf(this.map, p.x, p.z); if (lv) { this.levelId = lv.id; this.cx = p.x; this.cz = p.z; this.renderSide(); } }
  zoomBy(k) { const z = this.wm.zoom_m_per_screen; this.zm = Math.max(z.min, Math.min(z.max, this.zm * k)); }
  _clampCenter() { const b = this.level.bounds; this.cx = Math.max(b.x0, Math.min(b.x1, this.cx)); this.cz = Math.max(b.z0, Math.min(b.z1, this.cz)); }

  // ---------------------------------------------------------------- coordinates
  _size() {
    const r = this.canvas.getBoundingClientRect();
    const d = Math.min(2, globalThis.devicePixelRatio || 1);
    const w = Math.max(10, Math.round(r.width)), h = Math.max(10, Math.round(r.height));
    if (this.canvas.width !== Math.round(w * d) || this.canvas.height !== Math.round(h * d)) { this.canvas.width = Math.round(w * d); this.canvas.height = Math.round(h * d); }
    return { w, h, d };
  }
  _scale(h) { return h / this.zm; }
  toScreen(x, z, w, h) { const s = this._scale(h); return [w / 2 + (x - this.cx) * s, h / 2 + (z - this.cz) * s]; }
  toWorld(px, py) { const r = this.canvas.getBoundingClientRect(); const s = this._scale(r.height); return [this.cx + (px - r.width / 2) / s, this.cz + (py - r.height / 2) / s]; }

  // ---------------------------------------------------------------- pointer
  _bindPointer() {
    const cv = this.canvas;
    cv.addEventListener('pointerdown', (e) => { this.drag = { x: e.clientX, y: e.clientY, cx: this.cx, cz: this.cz, moved: false }; cv.setPointerCapture?.(e.pointerId); this.crosshair = false; });
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (!this.drag) return;
      const s = this._scale(r.height), dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
      if (Math.hypot(dx, dy) > 4) this.drag.moved = true;
      if (this.drag.moved) { this.cx = this.drag.cx - dx / s; this.cz = this.drag.cz - dy / s; this._clampCenter(); }
    });
    cv.addEventListener('pointerup', (e) => {
      const d = this.drag; this.drag = null;
      if (d && !d.moved) { const r = cv.getBoundingClientRect(); this.clickAt(e.clientX - r.left, e.clientY - r.top); }
    });
    cv.addEventListener('pointerleave', () => { this.mouse = null; });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      const [wx, wz] = this.toWorld(mx, my);
      this.zoomBy(e.deltaY < 0 ? 0.85 : 1 / 0.85);
      const s = this._scale(r.height);
      this.cx = wx - (mx - r.width / 2) / s; this.cz = wz - (my - r.height / 2) / s; this._clampCenter();
    }, { passive: false });
  }
  /** Click on the cloth: remove the marker under the cursor, else place one (max from data). */
  clickAt(px, py) {
    const r = this.canvas.getBoundingClientRect(), s = this._scale(r.height);
    const [x, z] = this.toWorld(px, py);
    const m = this.ex.markers.near(x, z, 12 / s);
    if (m) { this.ex.markers.remove(m.id); this.g.sfx?.ui?.(); this.renderSide(); return 'removed'; }
    if (!levelOf(this.map, x, z)) return null;
    const res = this.ex.markers.add(x, z, this.markerKind);
    if (!res.ok) { this.flash(this.t('map_marker_limit', { n: this.ex.markers.max })); return 'limit'; }
    this.g.sfx?.ui?.(); this.renderSide();
    return 'added';
  }
  flash(text) { this.flashText = text; this.flashT = 2.2; }

  // ---------------------------------------------------------------- keyboard / pad (called each frame while the tab is open)
  /** Returns true when it used directional input (the pack must not move focus then). */
  nav(input, dt) {
    const ax = input.padAxes ?? [0, 0, 0, 0];
    let x = (input.isDown('move_right') || input.isDown('camera_right') ? 1 : 0) - (input.isDown('move_left') || input.isDown('camera_left') ? 1 : 0) + ax[0];
    let z = (input.isDown('move_down') || input.isDown('camera_down') ? 1 : 0) - (input.isDown('move_up') || input.isDown('camera_up') ? 1 : 0) + ax[1];
    const pads = input.pads ?? new Set();
    if (pads.has(14)) x -= 1; if (pads.has(15)) x += 1; if (pads.has(12)) z -= 1; if (pads.has(13)) z += 1;
    const used = Math.abs(x) + Math.abs(z) > 0.05;
    if (used) { this.cx += x * this.zm * 0.6 * dt; this.cz += z * this.zm * 0.6 * dt; this._clampCenter(); this.crosshair = true; }
    if (pads.has(6) || this._keyZoom === -1) this.zoomBy(1 + dt * 1.5);
    if (pads.has(7) || this._keyZoom === 1) this.zoomBy(1 / (1 + dt * 1.5));
    if (Math.abs(ax[3]) > 0.3) this.zoomBy(1 + ax[3] * dt * 1.5);
    if (input.ui?.('ui_confirm') && this.crosshair) { const r = this.canvas.getBoundingClientRect(); this.clickAt(r.width / 2, r.height / 2); }
    return used;
  }
  keyZoom(dir) { this._keyZoom = dir; }

  // ---------------------------------------------------------------- side panel and legend (DOM)
  renderSide() {
    const t = this.t, ex = this.ex, g = this.g;
    const levels = this.map.levels.map((l) => `<button data-lv="${l.id}" data-nav class="${l.id === this.levelId ? 'on' : ''}">${esc(this.loc(l.name))}</button>`).join('');
    const obj = (() => { const tr = ex.tracking; ex.tracking = true; const o = ex.objectiveTarget(); ex.tracking = tr; return o; })();
    const zones = this.map.zones.filter((zn) => zn.level === this.levelId).map((zn) => {
      const seen = ex.seenZones.has(zn.id);
      const pr = ex.zoneProgress(zn.id);
      const prog = !seen ? `<span class="dim">${esc(t('map_unexplored'))}</span>` : pr.total ? `<span class="${pr.done === pr.total ? 'done' : ''}">${esc(t('map_zone_progress', { done: pr.done, total: pr.total }))}</span>` : '';
      return `<li data-zone="${zn.id}"><b>${esc(seen ? this.loc(zn.name) : '· · ·')}</b>${prog}</li>`;
    }).join('');
    const ft = ex.fastTravelTargets();
    const reasons = { engaged: 'map_travel_engaged', zone: 'map_travel_zone', level: 'map_travel_level', era: 'map_travel_era' };
    const travel = ft.length ? ft.map((f) => `<li><span>${esc(this.loc(f.landmark.name))}</span>${f.ok ? `<button data-travel="${f.landmark.id}" data-nav>${esc(t('map_fast_travel'))}</button>` : `<span class="dim">${esc(t(reasons[f.reason] ?? 'map_travel_engaged'))}</span>`}</li>`).join('') : `<li class="dim">${esc(t('map_travel_none'))}</li>`;
    const kinds = this.wm.custom_markers.kinds.map((k) => `<button data-mk="${k}" data-nav class="mv-mk ${k === this.markerKind ? 'on' : ''}" title="${esc(t(`map_marker_${k}`))}"></button>`).join('');
    const rotOpt = this.g.settings.acc.acc_minimap_rotation ?? this.map.minimap.rotation_default;
    const zoomNow = this.g.ui03?.minimap?.zoomM ?? this.map.minimap.world_radius_m;
    this.side.innerHTML = `
      <div class="mv-sec mv-levels">${levels}</div>
      <div class="mv-sec"><h4>${esc(t('map_objective'))}</h4>
        ${obj ? `<p class="mv-obj">${esc(obj.text)}</p><button data-act="track" data-nav class="${ex.tracking ? 'on' : ''}">${esc(t(ex.tracking ? 'map_untrack' : 'map_track'))}</button>` : `<p class="dim">${esc(t('map_no_objective'))}</p>`}</div>
      <div class="mv-sec"><h4>${esc(t('map_zones'))}</h4><ul class="mv-zones">${zones}</ul></div>
      <div class="mv-sec"><h4>${esc(t('map_fast_travel_title'))}</h4><ul class="mv-travel">${travel}</ul></div>
      <div class="mv-sec"><h4>${esc(t('map_markers', { n: ex.markers.list.length, max: ex.markers.max }))}</h4><div class="mv-kinds">${kinds}</div><p class="dim small">${esc(t('map_marker_hint'))}</p></div>
      <div class="mv-sec"><h4>${esc(t('map_minimap'))}</h4>
        <label><span>${esc(t('map_minimap_rotation'))}</span><select data-set="rot" data-nav>${this.map.minimap.rotation_options.map((o) => `<option value="${o}" ${o === rotOpt ? 'selected' : ''}>${esc(t(`opt_val_${o}`))}</option>`).join('')}</select></label>
        <label><span>${esc(t('map_minimap_zoom'))}</span><select data-set="zoom" data-nav>${this.map.minimap.zoom_steps_m.map((m) => `<option value="${m}" ${m === zoomNow ? 'selected' : ''}>${m} m</option>`).join('')}</select></label>
        <label><span>${esc(t('map_legend'))}</span><input type="checkbox" data-set="legend" data-nav ${this.legendOn ? 'checked' : ''}></label>
      </div>`;
    for (const b of this.side.querySelectorAll('[data-mk]')) { b.appendChild(iconCanvas(b.dataset.mk, 20, { accent: '#e3c48a', stroke: '#1d1b19' })); b.addEventListener('click', () => { this.markerKind = b.dataset.mk; this.renderSide(); }); }
    for (const b of this.side.querySelectorAll('[data-lv]')) b.addEventListener('click', () => { this.levelId = b.dataset.lv; const bb = this.level.bounds; this.cx = (bb.x0 + bb.x1) / 2; this.cz = (bb.z0 + bb.z1) / 2; this.renderSide(); });
    this.side.querySelector('[data-act=track]')?.addEventListener('click', () => { ex.tracking = !ex.tracking; this.renderSide(); });
    for (const b of this.side.querySelectorAll('[data-travel]')) b.addEventListener('click', () => ex.travelTo(b.dataset.travel));
    this.side.querySelector('[data-set=rot]').addEventListener('change', (e) => g.updateSettings({ acc: { acc_minimap_rotation: e.target.value } }));
    this.side.querySelector('[data-set=zoom]').addEventListener('change', (e) => g.ui03?.minimap?.setZoom(+e.target.value));
    this.side.querySelector('[data-set=legend]').addEventListener('change', (e) => { this.legendOn = e.target.checked; this.renderLegend(); });
    this.el.querySelector('[data-act=center]').textContent = t('map_center_player');
  }
  renderLegend() {
    this.legend.classList.toggle('hidden', !this.legendOn);
    if (!this.legendOn) return;
    this.legend.innerHTML = `<h4>${esc(this.t('map_legend'))}</h4><ul></ul>`;
    const ul = this.legend.querySelector('ul');
    for (const ic of this.map.icons) {
      const li = document.createElement('li');
      li.appendChild(iconCanvas(ic.shape, 18, ic.id === 'ic_marker' ? { accent: '#c9a24f', stroke: INK } : { fill: '#2a221a', stroke: '#efe2c2', accent: '#e3c48a' }));
      const sp = document.createElement('span'); sp.textContent = this.loc(ic.name); li.appendChild(sp);
      ul.appendChild(li);
    }
  }

  // ---------------------------------------------------------------- drawing
  /** Everything to draw this frame: [{ shape, x, z, name, style, size }]. */
  symbols() {
    const ex = this.ex, out = [], map = this.map;
    const shape = (id) => map.icons.find((i) => i.id === id)?.shape ?? 'dot';
    for (const l of map.landmarks) if (ex.landmarkVisible(l)) out.push({ shape: shape(l.icon), x: l.x, z: l.z, name: this.loc(l.name), id: l.id });
    for (const dp of map.discovery_points) if (ex.discovered.has(dp.id) || ex.fog.isRevealed(dp.x, dp.z)) out.push({ shape: 'triangle', x: dp.x, z: dp.z, name: this.loc(dp.name), dim: !ex.discovered.has(dp.id), id: dp.id });
    for (const c of map.chests) if (ex.fog.isRevealed(c.x, c.z)) out.push({ shape: 'box', x: c.x, z: c.z, name: this.loc(c.name), dim: ex.opened.has(c.id), id: c.id });
    for (const s of map.environment_secrets) if (ex.envDone.has(s.id)) out.push({ shape: 'eye', x: s.x, z: s.z, name: this.loc(s.name), dim: true, id: s.id });
    return out;
  }

  tick(dt) {
    if (this.flashT > 0) this.flashT -= dt;
    this.draw();
  }

  draw() {
    const { w, h, d } = this._size(), c = this.canvas.getContext('2d'), s = this._scale(h);
    const g = this.g, ex = this.ex, lv = this.level, a = this._art(lv.id);
    c.setTransform(d, 0, 0, d, 0, 0);
    c.fillStyle = '#16130f'; c.fillRect(0, 0, w, h);
    // Cloth with a drop shadow.
    const [x0, y0] = this.toScreen(lv.bounds.x0, lv.bounds.z0, w, h), [x1, y1] = this.toScreen(lv.bounds.x1, lv.bounds.z1, w, h);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 24; c.fillStyle = '#cfbf98'; c.fillRect(x0 - 18, y0 - 18, x1 - x0 + 36, y1 - y0 + 36); c.restore();
    c.imageSmoothingEnabled = true;
    c.drawImage(a.out, x0, y0, x1 - x0, y1 - y0);
    this._border(c, x0 - 18, y0 - 18, x1 + 18, y1 + 18, w, h);
    // Tracked objective: highlight its zone.
    const obj = ex.objectiveTarget();
    if (obj && this.wm.quest_tracking.highlight_zone && obj.zone) {
      const zn = this.map.zones.find((z) => z.id === obj.zone);
      c.save(); c.fillStyle = 'rgba(227,196,138,0.16)'; c.strokeStyle = 'rgba(160,110,40,0.8)'; c.setLineDash([7, 5]); c.lineWidth = 2;
      for (const sh of zn?.shapes ?? []) {
        c.beginPath();
        if (sh.rect) { const [ax, ay] = this.toScreen(sh.rect.x0, sh.rect.z0, w, h), [bx, by] = this.toScreen(sh.rect.x1, sh.rect.z1, w, h); c.rect(ax, ay, bx - ax, by - ay); }
        else { const [cx, cy] = this.toScreen(sh.circle.cx, sh.circle.cz, w, h); c.arc(cx, cy, sh.circle.r * s, 0, Math.PI * 2); }
        c.fill(); c.stroke();
      }
      c.restore();
    }
    // Zone names (only where the player has been), handwritten on the cloth.
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const zn of this.map.zones) {
      if (zn.level !== lv.id || !ex.seenZones.has(zn.id)) continue;
      const [lx, ly] = this.toScreen(zn.map_label_at.x, zn.map_label_at.z, w, h);
      c.font = `italic 600 ${Math.round(Math.max(13, Math.min(22, s * 3.2)))}px Georgia, 'Times New Roman', serif`;
      c.lineWidth = 4; c.strokeStyle = 'rgba(214,198,160,0.85)'; c.strokeText(this.loc(zn.name), lx, ly);
      c.fillStyle = INK; c.fillText(this.loc(zn.name), lx, ly);
    }
    c.restore();
    // Symbols.
    const syms = this.symbols();
    const isz = Math.max(16, Math.min(26, s * 2.4));
    let hov = null, hd = 16;
    for (const sy of syms) {
      if (levelOf(this.map, sy.x, sy.z)?.id !== lv.id) continue;
      const [sx, sy2] = this.toScreen(sy.x, sy.z, w, h);
      c.globalAlpha = sy.dim ? 0.55 : 1;
      drawIcon(c, sy.shape, sx, sy2, isz, { fill: '#2a221a', stroke: '#efe2c2', accent: '#e3c48a' });
      c.globalAlpha = 1;
      if (this.mouse) { const dd = Math.hypot(this.mouse.x - sx, this.mouse.y - sy2); if (dd < hd) { hd = dd; hov = { ...sy, sx, sy: sy2 }; } }
    }
    for (const m of ex.markers.list) {
      if (levelOf(this.map, m.x, m.z)?.id !== lv.id) continue;
      const [sx, sy] = this.toScreen(m.x, m.z, w, h);
      drawIcon(c, m.kind, sx, sy, isz, { accent: '#a8742a', stroke: INK });
    }
    if (obj && levelOf(this.map, obj.x, obj.z)?.id === lv.id) {
      const [ox, oy] = this.toScreen(obj.x, obj.z, w, h);
      const pulse = 1 + 0.12 * Math.sin(performance.now() / 260);
      drawIcon(c, 'diamond_ring', ox, oy, isz * 1.25 * pulse, { fill: '#1d1b19', stroke: '#e3c48a', accent: '#e3c48a' });
      if (this.mouse && Math.hypot(this.mouse.x - ox, this.mouse.y - oy) < hd) hov = { name: obj.text, sx: ox, sy: oy };
    }
    // Player.
    const p = g.player;
    if (levelOf(this.map, p.x, p.z)?.id === lv.id) {
      const [px, py] = this.toScreen(p.x, p.z, w, h);
      drawPlayer(c, px, py, Math.max(14, isz * 0.9), Math.atan2(Math.sin(p.yaw), -Math.cos(p.yaw)), { color: '#fff4d6', edge: '#2b241c' });
    }
    if (this.crosshair) {
      c.strokeStyle = 'rgba(43,36,28,0.85)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(w / 2 - 12, h / 2); c.lineTo(w / 2 - 4, h / 2); c.moveTo(w / 2 + 4, h / 2); c.lineTo(w / 2 + 12, h / 2);
      c.moveTo(w / 2, h / 2 - 12); c.lineTo(w / 2, h / 2 - 4); c.moveTo(w / 2, h / 2 + 4); c.lineTo(w / 2, h / 2 + 12); c.stroke();
    }
    // Tooltip / flash message.
    const tip = this.flashT > 0 ? { name: this.flashText, sx: w / 2, sy: 40 } : hov;
    this.tip.classList.toggle('hidden', !tip);
    if (tip) { this.tip.textContent = tip.name; this.tip.style.transform = `translate(${Math.round(tip.sx)}px, ${Math.round(tip.sy - 22)}px) translate(-50%, -100%)`; }
    this._hoverId = hov?.id ?? null;
  }

  /** Woven border of the cloth: saw-tooth line + a band of tangent circles (screen space). */
  _border(c, x0, y0, x1, y1, w, h) {
    c.save();
    c.strokeStyle = BRONZE; c.fillStyle = BRONZE; c.globalAlpha = 0.9;
    c.lineWidth = 2; c.strokeRect(x0 + 3, y0 + 3, x1 - x0 - 6, y1 - y0 - 6);
    c.lineWidth = 1; c.strokeRect(x0 + 15, y0 + 15, x1 - x0 - 30, y1 - y0 - 30);
    const step = 12, r = 4.6;
    const edge = (ax, ay, bx, by) => {
      const len = Math.hypot(bx - ax, by - ay), n = Math.floor(len / step), ux = (bx - ax) / len, uy = (by - ay) / len;
      for (let i = 0; i <= n; i++) {
        const px = ax + ux * i * step, py = ay + uy * i * step;
        if (px < -10 || py < -10 || px > w + 10 || py > h + 10) continue;
        c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.arc(px, py, 1.1, 0, Math.PI * 2); c.fill();
      }
    };
    edge(x0 + 9, y0 + 9, x1 - 9, y0 + 9); edge(x0 + 9, y1 - 9, x1 - 9, y1 - 9);
    edge(x0 + 9, y0 + 9, x0 + 9, y1 - 9); edge(x1 - 9, y0 + 9, x1 - 9, y1 - 9);
    // Saw-tooth (răng cưa) inside the band.
    c.beginPath();
    for (let x = x0 + 20, k = 0; x < x1 - 20; x += 6, k++) { const yy = y0 + 20 + (k % 2 ? 4 : 0); if (k === 0) c.moveTo(x, yy); else c.lineTo(x, yy); }
    c.stroke();
    c.beginPath();
    for (let x = x0 + 20, k = 0; x < x1 - 20; x += 6, k++) { const yy = y1 - 20 - (k % 2 ? 4 : 0); if (k === 0) c.moveTo(x, yy); else c.lineTo(x, yy); }
    c.stroke();
    c.restore();
  }

  /** Debug / smoke read-out. */
  debugState() {
    const lv = this.level, grid = this.ex.fog.grid(lv.id);
    return { level: lv.id, zoom: this.zm, fogRatio: grid.ratio(), symbols: this.symbols().map((s) => s.id), markers: this.ex.markers.list.length, legend: this.legendOn };
  }
  destroy() { this.el.remove(); }
}

