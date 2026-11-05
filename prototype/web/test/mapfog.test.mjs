// Demo 0.3 map: exploration fog (4 m grid, 14 m reveal), markers limit, zone progress, minimap rotation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA } from '../src/data.js';
import { MapFog, FogGrid, MarkerSet, zoneProgress, zoneOf, levelOf, cameraUpRotation, clampToCircle } from '../src/ui/map/mapModel.js';
import { POINTS } from '../src/game/world.js';

const M = DATA.map;

test('fog: everything hidden at start, a walk reveals a 14 m disc on the 4 m grid, nothing outside', () => {
  const fog = new MapFog(M);
  assert.equal(fog.isRevealed(0, 18), false);
  const n = fog.reveal(0, 18);
  // Disc of radius 14 m on 4 m cells: about pi*14^2/16 ≈ 38 cell centres.
  assert.ok(n >= 30 && n <= 46, `revealed ${n}`);
  assert.equal(fog.isRevealed(0, 18), true);
  assert.equal(fog.isRevealed(10, 18), true);
  assert.equal(fog.isRevealed(0, 18 - 20), false, '20 m away stays hidden');
  const v = fog.version;
  assert.equal(fog.reveal(0, 18), 0, 'revealing the same place again changes nothing');
  assert.equal(fog.version, v);
  assert.equal(fog.reveal(500, 500), 0, 'outside every level');
});

test('fog: lookouts reveal a wider radius; hub level has its own grid; save/load round trip', () => {
  const fog = new MapFog(M);
  const dp = M.discovery_points[0];
  fog.reveal(dp.x, dp.z, dp.reveal_radius_m);
  assert.equal(fog.isRevealed(dp.x + 24, dp.z), true);
  fog.reveal(300, 0);
  assert.equal(fog.grid('lvl_hub_ben_lau').revealedCount > 0, true);
  const j = JSON.parse(JSON.stringify(fog.toJSON()));
  const f2 = new MapFog(M); f2.load(j);
  assert.equal(f2.isRevealed(dp.x + 24, dp.z), true);
  assert.equal(f2.isRevealed(300, 0), true);
  const g = new FogGrid({ x0: 0, x1: 8, z0: 0, z1: 8 }, 4);
  assert.equal(g.load('0101'), true); assert.equal(g.revealedCount, 2);
  assert.equal(g.load('01'), false);
});

test('markers: at most world_map.custom_markers.max, removable, nearest pick', () => {
  const cm = M.world_map.custom_markers;
  const ms = new MarkerSet(cm.max, cm.kinds);
  for (let i = 0; i < cm.max; i++) assert.equal(ms.add(i * 10, 0, 'cross').ok, true);
  assert.deepEqual(ms.add(0, 5), { ok: false, reason: 'limit' });
  const m = ms.near(21, 1, 3);
  assert.equal(m.x, 20);
  assert.equal(ms.remove(m.id), true);
  assert.equal(ms.add(0, 5, 'not_a_kind').marker.kind, cm.kinds[0]);
});

test('zone progress counts chests, environment secrets, lookouts and secret nodes of the zone', () => {
  const st = { chests: new Set(), envSecrets: new Set(), discovered: new Set(), secretNodes: [{ zone: 'z_dam_nong', done: true }] };
  assert.deepEqual(zoneProgress(M, 'z_dam_nong', st), { done: 1, total: 4 });
  st.chests.add('chest_dam_nong'); st.discovered.add('dp_cay_go_do'); st.envSecrets.add('es_to_chim');
  assert.deepEqual(zoneProgress(M, 'z_dam_nong', st), { done: 4, total: 4 });
  assert.equal(zoneOf(M, 0, -26).id, 'z_dam_nong');
  assert.equal(levelOf(M, 300, 0).id, 'lvl_hub_ben_lau');
});

test('every map.json chest / environment secret / lookout is a world.js POINT at the same coordinates', () => {
  for (const key of ['chests', 'environment_secrets', 'discovery_points']) {
    for (const o of M[key]) {
      const p = POINTS.find((x) => x.id === o.id);
      assert.ok(p, `${o.id} in POINTS`);
      assert.equal(p.x, o.x); assert.equal(p.z, o.z);
    }
  }
});

test('minimap camera-up rotation puts the camera forward at the top', () => {
  for (const yaw of [0, 0.7, -2, Math.PI]) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);     // forward in world x/z (map: x right, z down)
    const a = cameraUpRotation(yaw);
    const rx = fx * Math.cos(a) - fz * Math.sin(a), ry = fx * Math.sin(a) + fz * Math.cos(a);
    assert.ok(Math.abs(rx) < 1e-9 && Math.abs(ry + 1) < 1e-9, `yaw ${yaw}`);
  }
  assert.deepEqual(clampToCircle(30, 40, 10), { x: 6, y: 8, clamped: true });
});
