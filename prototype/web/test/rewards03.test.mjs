// Demo 0.3 rewards: when the gameplay module (game.gp) exists it alone awards the XP and drops of a
// driven-off enemy (skills.xp_sources, enemies[].drops) and the boss-freed XP, through game.progress,
// exactly ONCE per event; ui/inventory (ui03) stands down (no double award).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeGame } from './bossbench.mjs';
import { Enemy } from '../src/game/enemy.js';
import { DATA_02 } from '../src/data.js';
import { createGameProgress, Ui03 } from '../src/ui/inventory/index.js';

function setup(seed) {
  const g = makeGame(seed, true);
  g.progress = createGameProgress(g);
  // The real ui03 handler with its own grant / xp helpers (no DOM needed for this path).
  const ui03 = { g, xp: (k, r) => g.progress.awardXp(k, r), grant: (id, n) => g.progress.addItem(id, n) };
  g.ui03 = { onEnemyDefeated: (e) => Ui03.prototype.onEnemyDefeated.call(ui03, e), grant: ui03.grant };
  return g;
}
const counts = (g) => JSON.parse(JSON.stringify(g.inv.toJSON()));

test('a driven-off enemy gives its XP and drops once (gp awards, ui03 stands down, repeats ignored)', () => {
  for (const id of ['en_cua_cang_bun', 'en_bo_ngua_lau', 'en_u_bun']) {
    const g = setup(7), p = g.player;
    const def = DATA_02.enemies.enemies.find((d) => d.id === id);
    const e = new Enemy(g, def, { x: -6, z: 6 }); g.enemies.push(e); g._rebuildAll();
    const xp0 = g.progress.xp, inv0 = counts(g);
    e.defeat();                       // game.onEnemyDefeated -> ui03 (skips) + gp (awards)
    g.onEnemyDefeated(e); g.gp.onEnemyDefeated(e); e.defeat(); // duplicates must not award again
    const xp = DATA_02.skills.xp_sources.find((s) => s.enemy === id).xp;
    assert.equal(g.progress.xp - xp0, xp, `${id}: XP exactly once`);
    const spawned = g.gp.drops.map((d) => ({ ...d }));
    assert.equal(spawned.length, g.gp.stats.dropsSpawned);
    // Walk over the drops: each is granted once, then gone.
    p.x = e.x; p.z = e.z;
    for (let k = 0; k < 3; k++) { for (const d of [...g.gp.drops]) { p.x = d.x; p.z = d.z; g.gp.update(1 / 60, 1 / 60, g.input); } }
    assert.equal(g.gp.drops.length, 0);
    const inv1 = counts(g);
    for (const d of spawned) assert.equal((inv1[d.item] ?? 0) - (inv0[d.item] ?? 0), spawned.filter((x) => x.item === d.item).reduce((a, x) => a + x.count, 0), `${id}: ${d.item} granted once`);
    assert.equal(g.gp.stats.dropsPicked, spawned.length);
  }
});

test('drops follow enemies[].drops odds over many defeats; a respawned enemy is a new defeat', () => {
  const g = setup(11);
  const def = DATA_02.enemies.enemies.find((d) => d.id === 'en_u_bun');
  const e = new Enemy(g, def, { x: -6, z: 6 }); g.enemies.push(e); g._rebuildAll();
  const xp0 = g.progress.xp;
  for (let k = 0; k < 5; k++) { e.reset(); e.defeat(); }
  assert.equal(g.progress.xp - xp0, 5 * 40, 'one award per defeat');
  assert.equal(g.gp.drops.filter((d) => d.item === 'mat_thiec_song').length, 5, 'Ụ Bùn: tin at chance 1.0, every time');
});

test('boss freed: boss_freed XP once (gp), never through ui03 as well', () => {
  const g = setup(3);
  const xp0 = g.progress.xp;
  assert.equal(g.gp.onBossFreed(g.boss), 200);
  assert.equal(g.gp.onBossFreed(g.boss), 0);
  assert.equal(g.progress.xp - xp0, 200);
});
