// ui/map/mapModel.js - pure state of the world map and minimap (map.json, DEMO_0_3_DESIGN §4):
// exploration fog on a grid per level (fog.cell_m, reveal_radius_m), custom markers (max from
// world_map.custom_markers.max), per-zone completion counts and small geometry helpers.
// No DOM, no three.js (node --test).

export function inShape(x, z, s) {
  if (s.rect) return x >= s.rect.x0 && x <= s.rect.x1 && z >= s.rect.z0 && z <= s.rect.z1;
  if (s.circle) return Math.hypot(x - s.circle.cx, z - s.circle.cz) <= s.circle.r;
  return false;
}
/** map.json zone containing (x, z), or null. */
export function zoneOf(mapData, x, z) {
  return mapData.zones.find((zn) => zn.shapes.some((s) => inShape(x, z, s))) ?? null;
}
/** map.json level whose bounds contain (x, z), or null. */
export function levelOf(mapData, x, z) {
  return mapData.levels.find((l) => x >= l.bounds.x0 && x <= l.bounds.x1 && z >= l.bounds.z0 && z <= l.bounds.z1) ?? null;
}

/** Exploration grid for one level: 1 byte per cell, 1 = seen. */
export class FogGrid {
  constructor(bounds, cellM) {
    this.b = bounds; this.cell = cellM;
    this.cols = Math.ceil((bounds.x1 - bounds.x0) / cellM);
    this.rows = Math.ceil((bounds.z1 - bounds.z0) / cellM);
    this.cells = new Uint8Array(this.cols * this.rows);
    this.revealedCount = 0;
  }
  index(x, z) {
    const c = Math.floor((x - this.b.x0) / this.cell), r = Math.floor((z - this.b.z0) / this.cell);
    return c < 0 || r < 0 || c >= this.cols || r >= this.rows ? -1 : r * this.cols + c;
  }
  isRevealed(x, z) { const i = this.index(x, z); return i >= 0 && this.cells[i] === 1; }
  /** Reveals every cell whose centre lies within r of (x, z). Returns the number of new cells. */
  reveal(x, z, r) {
    const cs = this.cell, c0 = Math.max(0, Math.floor((x - r - this.b.x0) / cs)), c1 = Math.min(this.cols - 1, Math.floor((x + r - this.b.x0) / cs));
    const r0 = Math.max(0, Math.floor((z - r - this.b.z0) / cs)), r1 = Math.min(this.rows - 1, Math.floor((z + r - this.b.z0) / cs));
    let n = 0;
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      const cx = this.b.x0 + (cc + 0.5) * cs, cz = this.b.z0 + (rr + 0.5) * cs;
      const i = rr * this.cols + cc;
      if (this.cells[i] === 0 && (cx - x) * (cx - x) + (cz - z) * (cz - z) <= r * r) { this.cells[i] = 1; n++; }
    }
    this.revealedCount += n;
    return n;
  }
  ratio() { return this.revealedCount / this.cells.length; }
  toJSON() { let s = ''; for (let i = 0; i < this.cells.length; i++) s += this.cells[i] ? '1' : '0'; return s; }
  load(s) {
    if (typeof s !== 'string' || s.length !== this.cells.length) return false;
    this.revealedCount = 0;
    for (let i = 0; i < s.length; i++) { this.cells[i] = s[i] === '1' ? 1 : 0; this.revealedCount += this.cells[i]; }
    return true;
  }
}

/** Fog of every level in map.json; `version` changes whenever a cell is revealed (redraw trigger). */
export class MapFog {
  constructor(mapData) {
    this.mapData = mapData; this.cell = mapData.fog.cell_m; this.radius = mapData.fog.reveal_radius_m;
    this.grids = new Map(mapData.levels.map((l) => [l.id, new FogGrid(l.bounds, this.cell)]));
    this.version = 0;
  }
  grid(levelId) { return this.grids.get(levelId) ?? null; }
  /** Reveal around a point (default radius = fog.reveal_radius_m). Returns new cells. */
  reveal(x, z, r = this.radius) {
    const lv = levelOf(this.mapData, x, z); if (!lv) return 0;
    const n = this.grids.get(lv.id).reveal(x, z, r);
    if (n) this.version++;
    return n;
  }
  isRevealed(x, z) { const lv = levelOf(this.mapData, x, z); return !!lv && this.grids.get(lv.id).isRevealed(x, z); }
  reset() { for (const g of this.grids.values()) { g.cells.fill(0); g.revealedCount = 0; } this.version++; }
  toJSON() { return Object.fromEntries([...this.grids].map(([k, g]) => [k, g.toJSON()])); }
  load(s) { for (const [k, v] of Object.entries(s ?? {})) this.grids.get(k)?.load(v); this.version++; }
}

/** Player-placed markers (world_map.custom_markers): at most `max`, each { id, x, z, kind }. */
export class MarkerSet {
  constructor(max = 8, kinds = ['pin_cloth']) { this.max = max; this.kinds = kinds; this.list = []; this.seq = 0; }
  get full() { return this.list.length >= this.max; }
  add(x, z, kind = this.kinds[0]) {
    if (this.full) return { ok: false, reason: 'limit' };
    const m = { id: `mk${++this.seq}`, x, z, kind: this.kinds.includes(kind) ? kind : this.kinds[0] };
    this.list.push(m);
    return { ok: true, marker: m };
  }
  remove(id) { const n = this.list.length; this.list = this.list.filter((m) => m.id !== id); return this.list.length < n; }
  /** Nearest marker within r metres of (x, z), or null. */
  near(x, z, r) {
    let best = null, bd = r;
    for (const m of this.list) { const d = Math.hypot(m.x - x, m.z - z); if (d <= bd) { best = m; bd = d; } }
    return best;
  }
  clear() { this.list = []; }
}

/**
 * Zone completion (world_map.zone_completion.counts): chests, environment_secrets, discovery_points,
 * secret_nodes. state: { chests: Set, envSecrets: Set, discovered: Set, secretNodes: [{ zone, done }] }.
 * Returns { done, total } for the zone (total 0 = nothing to find there).
 */
export function zoneProgress(mapData, zoneId, state) {
  let done = 0, total = 0;
  const count = (list, set) => { for (const o of list ?? []) if (o.zone === zoneId) { total++; if (set.has(o.id)) done++; } };
  count(mapData.chests, state.chests ?? new Set());
  count(mapData.environment_secrets, state.envSecrets ?? new Set());
  count(mapData.discovery_points, state.discovered ?? new Set());
  for (const n of state.secretNodes ?? []) if (n.zone === zoneId) { total++; if (n.done) done++; }
  return { done, total };
}

/** Rotation (radians, for a canvas rotate) that puts the camera's forward direction at the top of
 *  the minimap. Camera yaw convention of game.js: camera sits at focus + (sin yaw, cos yaw) * dist,
 *  so it looks along (-sin yaw, -cos yaw) in world x/z; world -z is north = up on the map. */
export function cameraUpRotation(camYaw) {
  return -Math.PI / 2 - Math.atan2(-Math.cos(camYaw), -Math.sin(camYaw));
}

/** Clamp a point (dx, dy from the centre, px) to a circle of radius r; returns { x, y, clamped }. */
export function clampToCircle(dx, dy, r) {
  const d = Math.hypot(dx, dy);
  if (d <= r) return { x: dx, y: dy, clamped: false };
  return { x: (dx / d) * r, y: (dy / d) * r, clamped: true };
}
