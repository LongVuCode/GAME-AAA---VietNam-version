// env/layout.js - data-driven environment layout (pure, no three.js; unit tested in test/env.test.mjs).
//
// The environment (terrain, water, foliage, props) is built from ONE normalized layout object, so the
// same builder renders the 0.3 graybox map (world.js AREAS/POINTS/...) or the Demo 0.4 world data
// (design/data/world_0_4.json: regions, water channels, heightmap features, paths, blockers, points,
// landmarks_visual). Gameplay walkability is NOT decided here (world.js Walkable stays the authority);
// legacy walkable shapes are kept flat at y <= 0 because characters stand on y = 0.
//
// Layout:
//   { source, waterY, patches: [{id, x0, x1, z0, z1}], regions: [{id, surface, height, shapes, legacy, dock}],
//     shallow: [{x0,x1,z0,z1}], mudPools: [{cx,cz,r}], ditches: [{ax,az,bx,bz,hw}], logs: [...],
//     channels: [{points, width, depth}], paths: [{points, width, kind}], blockers: [{points, hw}],
//     features: [...heightmap features], noise: {amp, scale, seed}, points: [{id, kind, x, z, r}],
//     keepOut: [{x, z, r}], landmarks: [{id, kind, x, z, height}] }
// Shapes: { rect: {x0,x1,z0,z1} } | { circle: {cx,cz,r} } | { polygon: [[x,z], ...] }.

/** Surface -> terrain layer weights [wet_mud, grass, path, dry_mud, bank] (TERRAIN_LAYERS order). */
export const SURFACE_SPLAT = {
  ground: [0.05, 0.55, 0.25, 0.0, 0.15],
  grass: [0.0, 0.8, 0.15, 0.0, 0.05],
  shallow: [0.55, 0.05, 0.0, 0.0, 0.4],
  reed: [0.1, 0.45, 0.05, 0.15, 0.25],
  reed_dense: [0.3, 0.2, 0.0, 0.0, 0.5],
  mud: [0.3, 0.0, 0.0, 0.7, 0.0],
  ash_ground: [0.0, 0.05, 0.5, 0.45, 0.0],
  path: [0.0, 0.15, 0.85, 0.0, 0.0],
  silt: [0.35, 0.05, 0.25, 0.35, 0.0],
  leaf_litter: [0.0, 0.3, 0.1, 0.0, 0.6],
  dock: [1, 0, 0, 0, 0],
  bank: [0.25, 0.1, 0.0, 0.0, 0.65],
};

// Legacy (0.3) surfaces per area id; corridors are worn paths.
const LEGACY_SURFACE = { z_ben_say: 'ground', z_dam_nong: 'shallow', z_bai_lau: 'reed', z_lo_bo_hoang: 'ash_ground', z_dau_truong: 'mud', hub: 'ground', hub_bank: 'silt' };
// Worn tracks over the 0.3 map (same line as world_0_4 path_main_center; side tracks to the fire, kiln and shortcut).
const LEGACY_PATHS = [
  { kind: 'main', width: 3.2, points: [[0, 23], [0, 18], [0.5, 8], [0, -3], [0.5, -26], [-0.5, -49], [0, -77], [0.5, -104], [0, -117], [0, -122]] },
  { kind: 'side', width: 1.8, points: [[0.3, 12], [3.5, 10], [6, 9]] },
  { kind: 'side', width: 2.0, points: [[0, -110], [-11, -111], [-24, -111], [-31, -109]] },
  { kind: 'side', width: 2.2, points: [[14, 7], [25, 6.5], [34, 6], [34, -30], [34, -55], [28, -57]] },
  { kind: 'side', width: 2.4, points: [[290, 0], [296, -3], [300, -8], [292, -7]] },
  { kind: 'side', width: 2.4, points: [[300, -8], [306, -8], [300, 6], [300, 18], [296, 26]] },
];

const rectOf = (a) => ({ rect: { ...a } });

/** Layout from the 0.3 graybox constants (world.js). W = { AREAS, SHALLOW_SHEETS, MUD_POOLS_BASE, POINTS, VAULTS, HUB_X, SPAWNS }. */
export function legacyLayout(W) {
  const regions = W.AREAS.map((a) => ({
    id: a.id, legacy: true, dock: !!a.dock, height: 0,
    surface: a.dock ? 'dock' : LEGACY_SURFACE[a.id] ?? 'path',
    shapes: [a.rect ? rectOf(a.rect) : { circle: { ...a.circle } }],
  }));
  return finish({
    source: 'world_0_3', regions, paths: LEGACY_PATHS.map((p) => ({ ...p })), features: [], noise: { amp: 0, scale: 14, seed: 7 },
    channels: [], blockers: [], landmarks: [],
  }, W);
}

/** Layout from design/data/world_0_4.json (+ the 0.3 constants for sheets, pools, vaults and the dock). */
export function world04Layout(json, W) {
  const dockRect = W.AREAS.find((a) => a.dock)?.rect;
  const regions = [];
  for (const r of [...(json.regions ?? []), ...(json.hub_regions ?? [])]) {
    const shapes = r.shapes.map((s) => (s.rect ? rectOf(s.rect) : s.circle ? { circle: { ...s.circle } } : { polygon: s.polygon.map((p) => [...p]) }));
    // The jetty rect inside z_ben_say is water under a deck: split it out as its own dock region.
    const dockIdx = dockRect ? shapes.findIndex((s) => s.rect && sameRect(s.rect, dockRect)) : -1;
    if (dockIdx >= 0) regions.push({ id: r.id + '_dock', legacy: true, dock: true, height: 0, surface: 'dock', shapes: shapes.splice(dockIdx, 1) });
    regions.push({ id: r.id, legacy: !!r.legacy, dock: false, height: r.height_m ?? 0, surface: r.surface ?? 'ground', shapes });
  }
  const hm = json.heightmap ?? {};
  return finish({
    source: 'world_0_4', regions,
    paths: (json.paths ?? []).map((p) => ({ kind: p.kind, width: p.width_m ?? 2, points: p.points.map((q) => [...q]) })),
    features: (hm.features ?? []).map((f) => ({ ...f })),
    noise: { amp: hm.noise?.amplitude_m ?? 0.2, scale: hm.noise?.scale_m ?? 14, seed: hm.noise?.seed ?? 404 },
    channels: (json.water ?? []).map((w) => ({ id: w.id, points: w.points.map((q) => [...q]), width: w.width_m ?? 4, depth: w.depth_m ?? 0.45, deep: w.kind === 'deep_water' })),
    blockers: (json.blockers ?? []).map((b) => ({ id: b.id, kind: b.kind, points: b.points.map((q) => [...q]), hw: b.half_width_m ?? 1 })),
    landmarks: (json.landmarks_visual ?? []).filter((l) => !l.dynamic).map((l) => ({ id: l.id, kind: l.kind, x: l.x, z: l.z, height: l.height_m ?? 5 })),
    extraPoints: (json.points ?? []).filter((p) => !p.legacy).map((p) => ({ id: p.id, kind: p.kind, x: p.x, z: p.z, r: 2.5 })),
    bounds: json.bounds ?? null,
  }, W);
}

function sameRect(a, b) { return a.x0 === b.x0 && a.x1 === b.x1 && a.z0 === b.z0 && a.z1 === b.z1; }

function finish(L, W) {
  const H = W.HUB_X ?? 300;
  const b = L.bounds ?? { x0: -45, x1: 45, z0: -160, z1: 36 };
  // Terrain patches: the marsh level and the hub (a separate "level" far downriver in the same scene),
  // each with a margin of water/bank so the horizon is not a cliff edge.
  L.patches = [
    { id: 'level', x0: Math.floor(b.x0 - 70), x1: Math.ceil(b.x1 + 70), z0: Math.floor(b.z0 - 60), z1: Math.ceil(b.z1 + 70) },
    { id: 'hub', x0: H - 80, x1: H + 80, z0: -70, z1: 100 },
  ];
  L.waterY = -0.25;
  L.shallow = (W.SHALLOW_SHEETS ?? []).map(([cx, cz, w, d]) => ({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 }));
  L.mudPools = (W.MUD_POOLS_BASE ?? []).map((m) => ({ ...m }));
  L.ditches = (W.VAULTS ?? []).filter((v) => v.kind === 'ditch').map((v) => ({ ...v }));
  L.logs = (W.VAULTS ?? []).filter((v) => v.kind === 'log').map((v) => ({ ...v }));
  L.points = (W.POINTS ?? []).map((p) => ({ id: p.id, kind: p.kind, x: p.x, z: p.z, r: p.r ?? 2 })).concat(L.extraPoints ?? []);
  const enemies = W.SPAWNS?.enemies ?? [];
  L.keepOut = [
    ...L.points.map((p) => ({ x: p.x, z: p.z, r: Math.max(2.6, p.r + 1.2) })),
    ...enemies.map((e) => ({ x: e.x, z: e.z, r: 2.6 })),
    ...(W.SPAWNS?.player_start ? [{ x: W.SPAWNS.player_start.x, z: W.SPAWNS.player_start.z, r: 3 }] : []),
    { x: 10, z: -81, r: 6 }, // entranced villager clearing (mist sphere)
  ];
  delete L.extraPoints; delete L.bounds;
  return L;
}

// ------------------------------------------------------------------ geometry helpers (shared)
export function sdRect(x, z, r) {
  const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, hx = (r.x1 - r.x0) / 2, hz = (r.z1 - r.z0) / 2;
  const dx = Math.abs(x - cx) - hx, dz = Math.abs(z - cz) - hz;
  return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0);
}
export function sdPolygon(x, z, poly) {
  let d = Infinity, s = 1;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i];
    const ex = bx - ax, ez = bz - az, wx = x - ax, wz = z - az;
    const t = Math.max(0, Math.min(1, (wx * ex + wz * ez) / (ex * ex + ez * ez || 1)));
    d = Math.min(d, Math.hypot(wx - ex * t, wz - ez * t));
    const c1 = z >= az, c2 = z < bz, c3 = ex * wz > ez * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * d;
}
export function sdShape(x, z, s) {
  if (s.rect) return sdRect(x, z, s.rect);
  if (s.circle) return Math.hypot(x - s.circle.cx, z - s.circle.cz) - s.circle.r;
  return sdPolygon(x, z, s.polygon);
}
/** Distance from (x, z) to a polyline [[x, z], ...]; also returns the segment parameter. */
export function distPolyline(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const ex = bx - ax, ez = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1)));
    best = Math.min(best, Math.hypot(x - ax - ex * t, z - az - ez * t));
  }
  return best;
}
export function shapeBounds(s) {
  if (s.rect) return { ...s.rect };
  if (s.circle) return { x0: s.circle.cx - s.circle.r, x1: s.circle.cx + s.circle.r, z0: s.circle.cz - s.circle.r, z1: s.circle.cz + s.circle.r };
  const xs = s.polygon.map((p) => p[0]), zs = s.polygon.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

/** Deterministic PRNG (same as world.js mulberry32). */
export function rng32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Smooth value noise in [0, 1] (2D, deterministic, no allocation). */
export function vnoise(x, z, seed = 0) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const h = (a, b) => { let n = (a * 374761393 + b * 668265263 + seed * 2246822519) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (h(ix, iz) * (1 - u) + h(ix + 1, iz) * u) * (1 - v) + (h(ix, iz + 1) * (1 - u) + h(ix + 1, iz + 1) * u) * v;
}
export function fbm(x, z, seed = 0, oct = 4) {
  let a = 0, w = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { a += vnoise(x * f, z * f, seed + i * 17) * w; n += w; w *= 0.5; f *= 2.03; }
  return a / n;
}
export const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
