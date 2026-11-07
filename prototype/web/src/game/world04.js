// world04.js - Demo 0.4 big map (design/data/world_0_4.json, COMBAT_0_4 §6) for the game layer: walkable
// regions (polygons / rects) added around the 0.3 graybox areas, blockers (reed walls, deep water),
// wading channels, the 0.4 points and the ground height the characters stand on. Pure (no three.js):
// imported by world.js (Walkable, zoneAt, POINTS), the environment layer (same height field as the
// rendered terrain) and node tests.
//
// Rules kept from 0.3 (world_0_4.legacy_map): every 0.3 AREAS / POINTS id keeps its shapes and
// coordinates; new regions overlap their neighbours (no dead seam strip, test/walkable.test.mjs).
// Ground height: env/field.js from the world_0_4 heightmap (region.height_m + features + noise),
// sampled on a 1 m grid and read bilinearly, identical to the terrain mesh vertices.
import WORLD_04 from '../../../../design/data/world_0_4.json' with { type: 'json' };
import { world04Layout } from '../env/layout.js';
import { createField } from '../env/field.js';

export { WORLD_04 };

const shapeOf = (s) => (s.rect ? { rect: { ...s.rect } } : s.circle ? { circle: { ...s.circle } } : { poly: s.polygon.map((p) => [...p]) });

/** New (non-legacy) walkable regions as world.js AREAS entries ({id, rect} | {id, poly}). */
export const AREAS_04 = WORLD_04.regions.filter((r) => !r.legacy).flatMap((r) => r.shapes.map((s) => ({
  id: r.id, ...shapeOf(s), w04: true, corridor: r.kind === 'corridor', surface: r.surface, color: 0x6f6a4e,
})));

/** Segments the player cannot cross: reed walls and deep water (no swimming, Story Bible §2). */
export const BLOCKERS_04 = [
  ...WORLD_04.blockers.map((b) => ({ id: b.id, kind: b.kind, points: b.points, hw: b.half_width_m ?? 1 })),
  ...WORLD_04.water.filter((w) => w.walkable === false).map((w) => ({ id: w.id, kind: w.kind, points: w.points, hw: (w.width_m ?? 4) / 2 })),
];
/** Wading channels (speed_mult, no sprint): reported as 'shallow' by Walkable.speedMult. */
export const CHANNELS_04 = WORLD_04.water.filter((w) => w.walkable !== false).map((w) => ({ id: w.id, points: w.points, hw: (w.width_m ?? 4) / 2 }));

const POINT_R = { rest: 2.2, lookout: 3.5, chest: 2, env_secret: 2.2, gather: 1.8, track: 2.4, boss_gate: 2.4, traversal: 2 };
/** 0.4 points (world_0_4.points without legacy). Same ids and coordinates as the data (validator). */
export const POINTS_04 = WORLD_04.points.filter((p) => !p.legacy).map((p) => {
  const o = { id: p.id, kind: p.kind, x: p.x, z: p.z, r: POINT_R[p.kind] ?? 2, w04: true };
  if (p.checkpoint) o.checkpoint = p.checkpoint;
  if (p.traversal) o.traversal = p.traversal;
  if (p.to) o.to = p.to;
  return o;
});

// ------------------------------------------------------------------ geometry helpers
export function distPolyline(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], ex = bx - ax, ez = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1)));
    best = Math.min(best, Math.hypot(x - ax - ex * t, z - az - ez * t));
  }
  return best;
}
/** Signed distance to a polygon [[x, z], ...] (negative inside). */
export function sdPoly(x, z, poly) {
  let d = Infinity, s = 1;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i], ex = bx - ax, ez = bz - az, wx = x - ax, wz = z - az;
    const t = Math.max(0, Math.min(1, (wx * ex + wz * ez) / (ex * ex + ez * ez || 1)));
    d = Math.min(d, Math.hypot(wx - ex * t, wz - ez * t));
    const c1 = z >= az, c2 = z < bz, c3 = ex * wz > ez * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * d;
}
/** Signed distance to an AREAS entry (rect / circle / poly), negative inside. */
export function sdArea(x, z, a) {
  if (a.rect) {
    const r = a.rect, dx = Math.max(r.x0 - x, x - r.x1), dz = Math.max(r.z0 - z, z - r.z1);
    return dx > 0 || dz > 0 ? Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) : Math.max(dx, dz);
  }
  if (a.circle) return Math.hypot(x - a.circle.cx, z - a.circle.cz) - a.circle.r;
  return sdPoly(x, z, a.poly);
}
export function areaBounds(a) {
  if (a.rect) return a.rect;
  if (a.circle) return { x0: a.circle.cx - a.circle.r, x1: a.circle.cx + a.circle.r, z0: a.circle.cz - a.circle.r, z1: a.circle.cz + a.circle.r };
  const xs = a.poly.map((p) => p[0]), zs = a.poly.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

// ------------------------------------------------------------------ terrain model (shared with src/env)
let MODEL = null;
/** Layout + height field of the 0.4 world (built once). W: the 0.3 constants of world.js (sheets, pools, vaults, dock). */
export function terrainModel(W) {
  if (MODEL) return MODEL;
  const layout = world04Layout(WORLD_04, W);
  const field = createField(layout);
  MODEL = { layout, field, grids: layout.patches.map((p) => heightGrid(field, p)) };
  return MODEL;
}

/** Heights on the integer lattice of a terrain patch (same samples as env/terrain.js chunk vertices). */
function heightGrid(field, patch) {
  const nx = patch.x1 - patch.x0 + 1, nz = patch.z1 - patch.z0 + 1, h = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) h[j * nx + i] = field.height(patch.x0 + i, patch.z0 + j);
  return {
    patch, nx, nz, h,
    contains: (x, z) => x >= patch.x0 && x <= patch.x1 && z >= patch.z0 && z <= patch.z1,
    heightAt(x, z) {
      const fx = Math.min(nx - 1.001, Math.max(0, x - patch.x0)), fz = Math.min(nz - 1.001, Math.max(0, z - patch.z0));
      const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * nx + i;
      return (h[k] * (1 - u) + h[k + 1] * u) * (1 - v) + (h[k + nx] * (1 - u) + h[k + nx + 1] * u) * v;
    },
  };
}

/** map.json with its map_0_4 block applied (0.4 level bounds, zones, landmarks, lookouts, chests, secrets). */
export function mergeMap04(map) {
  const m4 = map?.map_0_4;
  if (!m4) return map;
  const out = { ...map };
  out.levels = map.levels.map((l) => (m4.level_bounds_0_4?.[l.id] ? { ...l, bounds: { ...m4.level_bounds_0_4[l.id] } } : l));
  const add = (key, list) => { if (list?.length) out[key] = [...(map[key] ?? []), ...list.filter((x) => !(map[key] ?? []).some((y) => y.id === x.id))]; };
  add('icons', m4.icons_add);
  const regionShapes = (id) => (WORLD_04.regions.find((r) => r.id === id)?.shapes ?? []).map((s) => (s.polygon ? { polygon: s.polygon } : { ...s }));
  add('zones', (m4.zones ?? []).map((z) => ({ ...z, shapes: z.shapes ?? regionShapes(z.region_ref ?? z.id) })));
  add('landmarks', m4.landmarks);
  add('discovery_points', m4.discovery_points);
  add('chests', m4.chests);
  add('environment_secrets', m4.environment_secrets);
  if (m4.minimap) out.minimap = { ...map.minimap, ...m4.minimap };
  if (m4.world_map) out.world_map = { ...map.world_map, ...m4.world_map };
  if (m4.fast_travel) out.fast_travel = { ...map.fast_travel, ...m4.fast_travel };
  return out;
}

// ------------------------------------------------------------------ trees (shared: collision + rendering)
let TREES = null;
const CANOPY = [];
/** Far-shore canopy spots (filled by treeSpots). */
export function canopySpots(W) { treeSpots(W); return CANOPY; }
/** Deterministic tree spots of the 0.4 world: the fig grove (leaf_litter), lone trees on the knolls and
 *  silt bank, a tree line on the banks around the level, and the landmark trees (fig, kapok, myrtle),
 *  set 2.5 m off their lookout point. Trees inside walkable ground are solid (Walkable.inside). */
export function treeSpots(W) {
  if (TREES) return TREES;
  const { layout: L, field: F } = terrainModel(W);
  const out = [];
  let a = 9001;
  const R = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const nearPath = (x, z, pad) => L.paths.some((p) => distPolyline(x, z, p.points) < p.width * 0.5 + pad);
  const nearKeep = (x, z, pad) => L.keepOut.some((k) => Math.abs(k.x - x) < k.r + pad && Math.abs(k.z - z) < k.r + pad && Math.hypot(k.x - x, k.z - z) < k.r + pad);
  const lmTrees = (L.landmarks ?? []).filter((l) => /sung|gao|sim/.test(l.id));
  const clear = (x, z, r) => out.every((t) => Math.hypot(t.x - x, t.z - z) > r) && lmTrees.every((l) => Math.hypot(l.x - x, l.z - z) > 9);
  const P = L.patches[0], step = 5.5;
  for (let z = P.z0 + 4; z < P.z1 - 4; z += step) for (let x = P.x0 + 4; x < P.x1 - 4; x += step) {
    const jx = x + (R() - 0.5) * step * 0.9, jz = z + (R() - 0.5) * step * 0.9, r = R();
    const d = F.walkDist(jx, jz), h = F.height(jx, jz);
    if (h < L.waterY + 0.12) continue;
    let p = 0, solid = false;
    if (d <= 0) {
      const reg = F.regionAt(jx, jz);
      const s = reg?.surface;
      p = s === 'leaf_litter' ? 0.42 : s === 'grass' ? 0.035 : s === 'silt' ? 0.02 : 0;
      if (d > -2.5) p *= 0.4;
      solid = true;
      if (p && (nearPath(jx, jz, 2.2) || nearKeep(jx, jz, 1.5))) p = 0;
    } else if (d < 44) p = d < 5 ? 0.03 : d < 30 ? 0.16 : 0.1; // tree line on the banks / islands
    else { // far shore: cheap canopy silhouettes (props.canopyBlobs), dense
      if (r < 0.34) CANOPY.push({ x: jx, y: h, z: jz, s: 2.2 + R() * 2.4, rot: R() * 6.283, k: R() });
      continue;
    }
    if (!p || r >= p || !clear(jx, jz, solid ? 4.2 : 5)) continue;
    const s = (solid ? 0.85 : 0.95) + R() * 0.55;
    out.push({ x: jx, y: h - 0.08, z: jz, rot: R() * 6.283, s, far: d > 22, solid, r: solid ? 0.38 * s : 0 });
  }
  for (const l of lmTrees) {
    const ang = l.x * 0.37 + l.z * 0.11, x = l.x + Math.cos(ang) * 2.6, z = l.z + Math.sin(ang) * 2.6;
    const s = Math.max(1.2, l.height / 8);
    out.push({ x, y: F.height(x, z) - 0.1, z, rot: ang, s, far: false, bare: l.id.includes('gao'), solid: F.walkDist(x, z) < 0, r: 0.4 * s, landmark: l.id });
  }
  TREES = out;
  return out;
}
