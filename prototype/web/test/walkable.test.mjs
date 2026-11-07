// Regression: adjacent walkable areas must overlap, otherwise Walkable.inside() leaves a dead strip
// (2 x margin wide) on their shared edge and the player hits an invisible wall (PO bug, demo 0.3:
// river bank -> hub drum/ferry was blocked).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Walkable, SPAWNS, POINTS } from '../src/game/world.js';

function walk(w, from, to, step = 0.12) {
  let { x, z } = from;
  for (let i = 0; i < 5000; i++) {
    const dx = to.x - x, dz = to.z - z, d = Math.hypot(dx, dz);
    if (d < 0.5) return true;
    const n = w.move(x, z, (dx / d) * step, (dz / d) * step);
    if (n.x === x && n.z === z) return false;
    x = n.x; z = n.z;
  }
  return false;
}

test('river bank start can walk to the hub drum and the hub ferry, and back', () => {
  const w = new Walkable();
  const drum = POINTS.find((p) => p.id === 'drum');
  const ferry = POINTS.find((p) => p.id === 'ferry_hub');
  assert.ok(walk(w, SPAWNS.bank_start, drum), 'bank -> drum');
  assert.ok(walk(w, SPAWNS.bank_start, ferry), 'bank -> ferry');
  assert.ok(walk(w, drum, SPAWNS.bank_start), 'drum -> bank');
});

test('Bến Sậy start can walk to the Bến Sậy ferry', () => {
  const w = new Walkable();
  const ferry = POINTS.find((p) => p.id === 'ferry_ben_say');
  assert.ok(walk(w, SPAWNS.player_start, ferry));
});

test('shortcut path is walkable end to end once the gate is open', () => {
  const w = new Walkable();
  w.gateOpen = true;
  assert.ok(walk(w, { x: 27, z: -57 }, { x: 34, z: -40 }), 'lever bend -> east trail');
  assert.ok(walk(w, { x: 34, z: -40 }, { x: 20, z: 7 }), 'east trail -> Bến Sậy');
});

test('no two walkable rects touch with less than a margin of overlap (invisible wall guard)', async () => {
  const { AREAS } = await import('../src/game/world.js');
  const R = AREAS.filter((a) => a.rect);
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const a = R[i].rect, b = R[j].rect;
    const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
    if (ox >= 0 && oz >= 0) assert.ok(ox >= 0.6 && oz >= 0.6, `${R[i].id}/${R[j].id} seam ${ox}x${oz}`);
  }
});

// ---------------------------------------------------------------- Demo 0.4 big map (world_0_4.json)
// Flood fill over a 1.5 m lattice where an edge exists only if Walkable.move() really carries the
// player from one cell centre to the next (inside + slope rule): catches invisible walls on region
// seams, blockers that cut the map in two, and cliffs that leave a region unreachable.
const CELL = 1.5;
async function reach(w, start) {
  const B = { x0: -142, x1: 147, z0: -262, z1: 52 };
  const nx = Math.ceil((B.x1 - B.x0) / CELL), nz = Math.ceil((B.z1 - B.z0) / CELL);
  const cx = (i) => B.x0 + (i + 0.5) * CELL, cz = (j) => B.z0 + (j + 0.5) * CELL;
  const seen = new Uint8Array(nx * nz);
  const i0 = Math.floor((start.x - B.x0) / CELL), j0 = Math.floor((start.z - B.z0) / CELL);
  const stack = [[i0, j0]]; seen[j0 * nx + i0] = 1;
  const stepOk = (ax, az, bx, bz) => {
    let x = ax, z = az; const n = 6, dx = (bx - ax) / n, dz = (bz - az) / n;
    for (let k = 0; k < n; k++) { const m = w.move(x, z, dx, dz, 0.3); if (Math.abs(m.x - x - dx) > 1e-9 || Math.abs(m.z - z - dz) > 1e-9) return false; x = m.x; z = m.z; }
    return true;
  };
  // Snap the start onto its cell centre first.
  if (!w.inside(cx(i0), cz(j0), 0.3)) throw new Error('start cell not walkable');
  while (stack.length) {
    const [i, j] = stack.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= nx || b >= nz || seen[b * nx + a]) continue;
      if (!w.inside(cx(a), cz(b), 0.3) || !stepOk(cx(i), cz(j), cx(a), cz(b))) continue;
      seen[b * nx + a] = 1; stack.push([a, b]);
    }
  }
  return { has(x, z, r = 1.6) {
    for (let j = Math.floor((z - r - B.z0) / CELL); j <= Math.floor((z + r - B.z0) / CELL); j++)
      for (let i = Math.floor((x - r - B.x0) / CELL); i <= Math.floor((x + r - B.x0) / CELL); i++)
        if (i >= 0 && j >= 0 && i < nx && j < nz && seen[j * nx + i] && Math.hypot(cx(i) - x, cz(j) - z) <= r + CELL * 0.71) return true;
    return false;
  }, count: () => seen.reduce((a, v) => a + v, 0) };
}

test('0.4 map: every point and every region of the marsh level is reachable on foot from the start', async () => {
  const { AREAS, BOSS_GATES } = await import('../src/game/world.js');
  const w = new Walkable(); w.gateOpen = true;
  const R = await reach(w, SPAWNS.player_start);
  const missing = POINTS.filter((p) => p.x < 200 && !p.offmap && !R.has(p.x, p.z, Math.max(1.6, p.r))).map((p) => p.id);
  assert.deepEqual(missing, [], `unreachable points: ${missing.join(', ')}`);
  const regions = [...new Set(AREAS.filter((a) => (a.rect?.x0 ?? a.circle?.cx ?? a.poly?.[0][0]) < 200).map((a) => a.id))];
  for (const id of regions) {
    const shapes = AREAS.filter((a) => a.id === id);
    const any = shapes.some((a) => { const b = a.rect ?? (a.circle ? { x0: a.circle.cx - a.circle.r, x1: a.circle.cx + a.circle.r, z0: a.circle.cz - a.circle.r, z1: a.circle.cz + a.circle.r } : null) ?? { x0: Math.min(...a.poly.map((p) => p[0])), x1: Math.max(...a.poly.map((p) => p[0])), z0: Math.min(...a.poly.map((p) => p[1])), z1: Math.max(...a.poly.map((p) => p[1])) };
      for (let x = b.x0 + 1; x < b.x1; x += 2) for (let z = b.z0 + 1; z < b.z1; z += 2) if (R.has(x, z, 0.8)) return true; return false; });
    assert.ok(any, `region ${id} has no reachable ground`);
  }
  assert.ok(R.count() * CELL * CELL > 3.0 * 6000, `reachable area ${R.count() * CELL * CELL} m2`);
  assert.equal(BOSS_GATES.length, 2);
});

test('0.4 map: main regions connect both ways (start <-> each 0.4 fire, lookout and track)', async () => {
  const w = new Walkable(); w.gateOpen = true;
  const keys = POINTS.filter((p) => p.w04 && ['rest', 'lookout', 'track'].includes(p.kind));
  assert.ok(keys.length >= 10);
  for (const p of keys) {
    const back = await reach(w, nearestWalkable(w, p));
    assert.ok(back.has(SPAWNS.player_start.x, SPAWNS.player_start.z), `${p.id} -> start`);
  }
});
function nearestWalkable(w, p) {
  // Cell centre on the reach() lattice nearest to the point that is walkable.
  const B = { x0: -142, z0: -262 };
  let best = null, bd = Infinity;
  for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
    const i = Math.floor((p.x - B.x0) / CELL) + di, j = Math.floor((p.z - B.z0) / CELL) + dj;
    const x = B.x0 + (i + 0.5) * CELL, z = B.z0 + (j + 0.5) * CELL, d = Math.hypot(x - p.x, z - p.z);
    if (d < bd && w.inside(x, z, 0.3)) { bd = d; best = { x, z }; }
  }
  return best;
}

test('0.4 map: cliff ledge (ledge_go_lau) is a one-way drop, the ramp side climbs', async () => {
  const w = new Walkable();
  assert.ok(walk(w, { x: 41, z: -75 }, { x: 30, z: -75 }), 'drop off the knoll ledge into the reeds');
  assert.ok(!walk(w, { x: 30, z: -75 }, { x: 41, z: -75 }), 'cannot climb the 2.4 m bank');
  assert.ok(w.groundAt(41, -75) - w.groundAt(33, -75) > 2, 'bank height');
  assert.ok(walk(w, { x: 66, z: -48 }, { x: 86, z: -63 }), 'saddle fire -> knoll top');
});

test('0.4 map: reed walls and deep water block, wading creek slows', async () => {
  const w = new Walkable();
  assert.ok(!w.inside(-50, -80, 0.3), 'reed wall rw_1');
  assert.ok(!w.inside(-100, -30, 0.3), 'deep water wc_rach_sau');
  assert.equal(w.speedMult(-60, -20), 'shallow', 'creek wc_rach_1');
});

test('0.4 map: no dead seam strip where a region boundary runs inside another region', async () => {
  const { AREAS } = await import('../src/game/world.js');
  const { sdArea } = await import('../src/game/world04.js');
  const w = new Walkable(); w.gateOpen = true;
  const bad = [];
  for (const A of AREAS) {
    const ring = A.rect ? [[A.rect.x0, A.rect.z0], [A.rect.x1, A.rect.z0], [A.rect.x1, A.rect.z1], [A.rect.x0, A.rect.z1]]
      : A.circle ? Array.from({ length: 64 }, (_, k) => [A.circle.cx + Math.cos(k / 64 * 6.283) * A.circle.r, A.circle.cz + Math.sin(k / 64 * 6.283) * A.circle.r]) : A.poly;
    for (let k = 0; k < ring.length; k++) {
      const [ax, az] = ring[k], [bx, bz] = ring[(k + 1) % ring.length], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
      for (let s = 0; s <= n; s++) {
        const x = ax + (bx - ax) * s / n, z = az + (bz - az) * s / n;
        // A boundary point well inside some other area must be walkable (else: invisible wall).
        if (AREAS.some((B) => B !== A && sdArea(x, z, B) <= -0.6) && !w.inside(x, z, 0.3)) {
          const blockedByDesign = !w.inside(x, z, 0) || !!w.nearVault(x, z, 0.3); // blocker, gate or vault obstacle
          if (!blockedByDesign) bad.push(`${A.id} (${x.toFixed(1)}, ${z.toFixed(1)})`);
        }
      }
    }
  }
  assert.deepEqual(bad.slice(0, 10), []);
});
