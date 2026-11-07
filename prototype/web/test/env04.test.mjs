// env04.test.mjs - Demo 0.4 environment / big-map data (pure parts: src/game/world04.js, src/env/layout.js,
// src/env/field.js, src/env/scatter.js). The terrain the game walks on is the one that is rendered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, POINTS, SPAWNS, SHALLOW_SHEETS, MUD_POOLS_BASE, VAULTS, HUB_X, groundAt, Walkable, MAX_SLOPE_DEG } from '../src/game/world.js';
import { WORLD_04, POINTS_04, terrainModel, treeSpots, canopySpots, mergeMap04 } from '../src/game/world04.js';
import { scatter } from '../src/env/scatter.js';
import { DATA } from '../src/data.js';

const W = { AREAS, SHALLOW_SHEETS, MUD_POOLS_BASE, POINTS, VAULTS, HUB_X, SPAWNS };

test('every world_0_4 point is in world.js POINTS with the data coordinates (legacy ids unchanged)', () => {
  for (const p of WORLD_04.points) {
    const q = POINTS.find((x) => x.id === p.id);
    assert.ok(q, p.id);
    assert.ok(Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.z - p.z) < 1e-9, `${p.id} moved`);
  }
  assert.equal(new Set(POINTS.map((p) => p.id)).size, POINTS.length, 'no duplicate POINTS ids');
  assert.ok(POINTS_04.length >= 40);
});

test('0.3 ground stays within a few cm of y = 0; the knoll top is ~9 m (heightmap features)', () => {
  for (const p of POINTS.filter((x) => !x.w04 && !x.offmap)) assert.ok(Math.abs(groundAt(p.x, p.z)) < 0.2, `${p.id} ${groundAt(p.x, p.z)}`);
  const top = groundAt(88, -64);
  assert.ok(top > 8.5 && top < 11, `knoll top ${top}`);
  assert.ok(groundAt(-53, -137) > 2.5, 'raised kiln floor (hm_lo_nen)');
  assert.ok(groundAt(60, -186) < groundAt(60, -170), 'fig hollow basin is lower');
});

test('ground is continuous along every 0.4 path (no step taller than the walk slope over 0.5 m)', () => {
  const rise = Math.tan(MAX_SLOPE_DEG * Math.PI / 180) * 0.5;
  for (const path of WORLD_04.paths) {
    if (path.one_way || path.id === 'path_side_lo_noc') continue; // one-way knoll ledge; the kiln-roof climb (climb_lo traversal)
    const pts = path.points;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
      let prev = groundAt(ax, az);
      for (let k = 1; k <= n; k++) {
        const h = groundAt(ax + (bx - ax) * k / n, az + (bz - az) * k / n);
        assert.ok(Math.abs(h - prev) <= rise + 0.02, `${path.id} step ${(h - prev).toFixed(2)} m near (${(ax + (bx - ax) * k / n).toFixed(0)}, ${(az + (bz - az) * k / n).toFixed(0)})`);
        prev = h;
      }
    }
  }
});

test('trees: deterministic, off the paths and points; solid trunks only on walkable ground; canopy far out', () => {
  const T = treeSpots(W), M = terrainModel(W);
  assert.ok(T.length > 60 && T.filter((t) => t.solid).length > 20, `${T.length} trees`);
  for (const t of T.filter((x) => x.solid && !x.landmark)) {
    for (const p of WORLD_04.paths) {
      let d = Infinity; for (let i = 0; i + 1 < p.points.length; i++) { const [ax, az] = p.points[i], [bx, bz] = p.points[i + 1], ex = bx - ax, ez = bz - az; const u = Math.max(0, Math.min(1, ((t.x - ax) * ex + (t.z - az) * ez) / (ex * ex + ez * ez || 1))); d = Math.min(d, Math.hypot(t.x - ax - ex * u, t.z - az - ez * u)); }
      assert.ok(d > p.width_m * 0.5 + 1.5, `tree on ${p.id}`);
    }
    for (const p of POINTS) assert.ok(Math.hypot(p.x - t.x, p.z - t.z) > 1.6, `tree on point ${p.id}`);
  }
  const C = canopySpots(W);
  assert.ok(C.length > 100 && C.every((c) => M.field.walkDist(c.x, c.z) > 40), 'canopy silhouettes stay off the play space');
  const w = new Walkable(); const t = T.find((x) => x.solid && !x.landmark);
  assert.ok(!w.inside(t.x, t.z, 0.3), 'trunk is solid');
});

test('scatter: dense reeds in the reed beds, none on worn paths; grass and undergrowth in 0.4 regions', () => {
  const M = terrainModel(W);
  const grids = [M.grids[0]].map((g) => ({ ...g, distAt: (x, z) => M.field.walkDist(x, z), regAt: (x, z) => M.field.regionAt(x, z) }));
  const S = scatter(M.layout, M.field, grids, { density: 0.25 });
  assert.ok(S.reeds.length > 1000 && S.grass.length > 1000, `${S.reeds.length} reeds, ${S.grass.length} grass`);
  const main = WORLD_04.paths.find((p) => p.id === 'path_main_center');
  const onMain = S.reeds.filter((r) => Math.abs(r.x - 0) < 1.2 && r.z < 16 && r.z > -116 && M.field.walkDist(r.x, r.z) < 0).length;
  assert.equal(onMain, 0, `reeds on ${main.id}`);
  assert.ok(S.shrubs.some((s) => M.field.regionAt(s.x, s.z)?.id === 'z_rung_sung'), 'undergrowth in the fig grove');
});

test('map.json + map_0_4: 0.4 level bounds, zones with region polygons, lookouts/chests/secrets merged', () => {
  const m = mergeMap04(DATA.map);
  const lv = m.levels.find((l) => l.id === 'lvl_dam_lau');
  assert.deepEqual(lv.bounds, WORLD_04.bounds);
  for (const id of ['z_bai_boi', 'z_doi_go', 'z_rung_sung', 'z_dong_lay_bac', 'z_rach_nuoc', 'z_lau_sau', 'z_san_lo']) assert.ok(m.zones.find((z) => z.id === id)?.shapes?.length, id);
  for (const key of ['discovery_points', 'chests', 'environment_secrets']) for (const o of m[key]) assert.ok(POINTS.find((p) => p.id === o.id), `${key}.${o.id} is a POINT`);
  assert.equal(DATA.map.levels.find((l) => l.id === 'lvl_dam_lau').bounds.x0, -45, 'design data untouched');
});
