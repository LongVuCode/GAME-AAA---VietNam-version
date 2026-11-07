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
