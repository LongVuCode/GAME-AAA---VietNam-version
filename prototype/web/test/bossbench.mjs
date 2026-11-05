// bossbench.mjs - objective "is the 0.3 boss harder?" measurement (DEMO_0_3_DESIGN §5, PO feedback "boss
// quá dễ"). Runs the REAL game classes (Player, Enemy, BossEncounter, Gameplay03, Game combat resolution)
// headless in node at a fixed 60 Hz step (no renderer: fx / audio / UI are no-op stubs), against the
// Lợn Lòi Đầm with the Demo 0.2 behaviour (?boss03=0 path) and with the Demo 0.3 behaviour, with the
// same bots and the same seeds.
//
// Bots (same reaction model for both bosses: reaction jitter ~N(0, 0.05 s), 12 % missed reactions):
//   bot02  the "0.2 bot": stays in melee spamming light attacks, Đỡ nhịp (parry) parryable hits on their
//          timing, dodges unparryable attacks when they go active (generic 0.2 rule), eats at < 35 % HP.
//          It does not know about jumping or the counter-beat.
//   bot03  the same plus 0.3 knowledge: jumps the Mud Wave when its edge arrives, presses Interact on
//          the counter-beat prompt (Phản nhịp). (No Ghì nanh: it does not lure the beast into stakes.)
// A run ends when the pry opens (win: the fight is decided), the player falls (loss) or at the time cap.
// Usage: node test/bossbench.mjs [runs=12] [capS=300] [difficulty=diff_cheo_do]
import { DATA_02 } from '../src/data.js';
import { Game } from '../src/game/game.js';
import { Player } from '../src/game/player.js';
import { Enemy } from '../src/game/enemy.js';
import { Gameplay03 } from '../src/game/gameplay03.js';
import { GameFxHooks } from '../src/fx/hooks.js';
import { buildWorld, Walkable, SPAWNS, mulberry32 } from '../src/game/world.js';
import { HitStopClock } from '../src/logic/hitstop.js';
import { AttackTokens } from '../src/logic/enemyAi.js';
import { TimeScale, gameStep } from '../src/fx/logic.js';
import { pathToFileURL } from 'node:url';
export { BotInput };

const RUNS = +(process.argv[2] ?? 12), CAP = +(process.argv[3] ?? 300), DIFF = process.argv[4] ?? 'diff_cheo_do';
const DT = 1 / 60;
const noop = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : noop), apply: () => noop });

class BotInput {
  constructor() { this.down = new Set(); this.pr = new Set(); this.mv = { x: 0, z: 0, mag: 0 }; this.device = 'kbm'; this.padStyle = 'xbox'; }
  isDown(a) { return this.down.has(a); }
  pressed(a) { return this.pr.has(a); }
  released() { return false; }
  pressedAt() { return 0; }
  ui() { return false; }
  moveVector() { return this.mv; }
  cameraDelta() { return { dx: 0, dy: 0 }; }
  rumble() { return false; }
  press(a) { this.pr.add(a); }
  endFrame() { this.pr.clear(); }
}

export function makeGame(seed, boss03) {
  try { globalThis.localStorage?.clear?.(); } catch { /* none */ }
  const g = new Game(null, DATA_02, { debug: false, khoenEnabled: true, buildId: 'bench' });
  g.settings.difficulty = DIFF;
  g.rng = mulberry32(seed);
  const w = buildWorld(); g.scene = w.scene; g.props = w.props; g.walk = new Walkable();
  g.camera = noop; g.sfx = noop; g.ui = noop; g.input = new BotInput();
  g.fx = new Proxy({ time: new TimeScale(), rings: noop }, { get: (t, k) => (k in t ? t[k] : noop) });
  g.hitstop = new HitStopClock(0);
  g.cam = { yaw: 0, pitch: 0.38, dist: 6.5, fx: 0, fy: 1.6, fz: 0, init: false, punchX: 0, punchY: 0, punchZ: 0, pvx: 0, pvy: 0, pvz: 0, orbit: 0, lookBias: 0 };
  g.feedbackLog = []; g.tokens = new AttackTokens(DATA_02.combat.enemy_ai);
  g.applySettings(); g.newGameState();
  g.player = new Player(g); g.fxh = new GameFxHooks(g, g.fx);
  g.gp = new Gameplay03(g); g.gp.boss03Enabled = boss03;
  g.applySettings();
  g.boss = new Enemy(g, DATA_02.enemies.enemies.find((d) => d.id === SPAWNS.boss.def), SPAWNS.boss);
  g.enemies = [g.boss]; g._rebuildAll();
  g.mode = 'playing'; g.gameNow = 0; g.frameStart = 0; g.lastNow = 0;
  g.after = () => {}; // no flow timers in the bench
  g.onPlayerDeath = () => { g.dead = true; };
  g.player.x = 0; g.player.z = -127; g.player.yaw = Math.PI;
  return g;
}

/** Seconds until the next damaging contact of the boss's current attack on the player (null if none). */
function timeToContact(e, p) {
  const a = e.attack; if (!a || e.state !== 'attack') return null;
  const tl = e.tl, windEnd = tl.windup + tl.hold, t = e.atkT, d = Math.hypot(p.x - e.x, p.z - e.z);
  if (a.shape === 'ring_wave') { const rw = a.ring_wave, v = (rw.end_radius_m - rw.start_radius_m) / tl.active; return windEnd - t + Math.max(0, d - rw.start_radius_m - 0.4) / v; }
  if (a.shape === 'charge') { const spd = Math.min(22, a.range_m / Math.max(0.3, tl.active)); return Math.max(0, windEnd - t) + Math.max(0, d - e.radius - 0.9) / spd; }
  if (e.hitIdx < tl.hitTimes.length) return tl.hitTimes[e.hitIdx] - t;
  return null;
}

function bot(g, kind, st) {
  const p = g.player, e = g.boss, i = g.input, rng = st.rng;
  i.down.clear();
  const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
  g.cam.yaw = Math.atan2(-dx, -dz); g.lockTarget = e.alive ? e : null;
  i.mv.x = 0; i.mv.z = 0; i.mv.mag = 0;
  // React once per attack instance (and per hit for multi-hit / second pass).
  const key = e.attack ? `${e.history.length}:${e.attack.id}:${e.hitIdx}:${e.chargeRun?.pass ?? 0}` : null;
  if (key && key !== st.key) { st.key = key; st.reacted = false; st.miss = rng() < 0.12; st.jit = (rng() + rng() + rng() - 1.5) * 0.1; }
  const ttc = key ? timeToContact(e, p) : null;
  const a = e.attack;
  if (kind === 'bot03' && g.gp.riposte && rng() < 0.9) { i.press('interact'); return; }
  if (a && ttc != null && !st.reacted && !st.miss && a.damage > 0) {
    const t = ttc + st.jit;
    if (a.parryable && d <= a.range_m + e.radius + 1.0 && t <= 0.05 && t >= -0.03) { i.press('parry'); i.down.add('parry'); st.reacted = true; return; }
    if (!a.parryable) {
      if (a.shape === 'ring_wave' && kind === 'bot03') { if (t <= 0.25) { i.press('jump'); i.down.add('jump'); st.reacted = true; return; } }
      else {
        // Generic 0.2 rule: dodge an unparryable attack when it goes active (charges: when it arrives).
        const go = a.shape === 'charge' ? t <= 0.12 : (e.atkT >= e.tl.windup + e.tl.hold - 0.05 + st.jit);
        if (go) { i.mv.x = 1; i.mv.z = 0; i.mv.mag = 1; i.press('dodge'); st.reacted = true; return; }
      }
    }
  }
  if (p.state === 'air') { i.down.add('jump'); return; }
  // Eat when low and not in immediate danger.
  if (p.hp < p.hpMax * 0.35 && p.heals > 0 && (!a || (ttc ?? 9) > 1.6 || d > 9)) { i.press('heal'); return; }
  if (e.staggered && e.enc.canFinish()) return;
  if (a && a.damage > 0 && ttc != null && ttc < 0.8 && ttc > -0.1) return; // both bots hold their attacks right before a hit lands
  if (d > e.radius + 1.6) { i.mv.z = -1; i.mv.mag = 1; return; }
  if (g.gameNow - st.lastL > 0.16) { i.press('attack_light'); st.lastL = g.gameNow; }
}

function run(seed, boss03, kind) {
  const g = makeGame(seed, boss03), p = g.player, e = g.boss;
  const st = { rng: mulberry32(seed * 7 + 1), key: null, lastL: -9 };
  let hpLost = 0, hits = 0, lastHp = p.hp, busy = 0, total = 0, t = 0;
  while (t < CAP && !g.dead) {
    bot(g, kind, st);
    const dt = gameStep(DT, g.hitstop, g.fx.time);
    g.gameNow += dt; t += DT;
    g.noAttack = e.state === 'transition';
    p.update(dt, g.gameNow, g.input);
    g.tokens.tick(dt);
    e.update(dt);
    g.gp.update(dt, DT, g.input);
    if (!g.locked) g.updateInteractions(DT, g.input);
    g.input.endFrame();
    if (p.hp < lastHp) { hpLost += lastHp - p.hp; hits += 1; }
    lastHp = p.hp;
    if (e.engaged) { total += DT; if (e.state === 'attack' || e.state === 'transition') busy += DT; }
    if (e.enc.canFinish()) return { win: true, t, hpLost, hits, busy: busy / Math.max(1e-6, total), heals: g.data.combat.healing.charges - p.heals, dead: false, s3: e.stats03, gp: g.gp.stats };
  }
  return { win: false, t, hpLost, hits, busy: busy / Math.max(1e-6, total), heals: g.data.combat.healing.charges - p.heals, dead: !!g.dead, s3: e.stats03, gp: g.gp.stats };
}

const MAIN = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (MAIN) {
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const rows = [];
for (const [label, boss03, kind] of [['boss 0.2 / bot02', false, 'bot02'], ['boss 0.3 / bot02', true, 'bot02'], ['boss 0.3 / bot03', true, 'bot03']]) {
  const res = [];
  for (let s = 1; s <= RUNS; s++) res.push(run(s, boss03, kind));
  const r = {
    config: label, runs: RUNS,
    win_rate: mean(res.map((x) => (x.win ? 1 : 0))),
    deaths: res.filter((x) => x.dead).length,
    mean_time_s: mean(res.map((x) => x.t)),
    dmg_taken_per_min: mean(res.map((x) => (x.hpLost / x.t) * 60)),
    hits_per_min: mean(res.map((x) => (x.hits / x.t) * 60)),
    boss_busy_ratio: mean(res.map((x) => x.busy)),
    heals_used: mean(res.map((x) => x.heals)),
    combos_per_run: mean(res.map((x) => x.s3.combos.length)), waves_per_run: mean(res.map((x) => x.s3.waves)),
    wave_jumps: mean(res.map((x) => x.gp.waveJumps)), ripostes: mean(res.map((x) => x.gp.ripostes)), punishes: mean(res.map((x) => x.s3.punishes.length)),
  };
  rows.push(r);
  console.log(JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? +v.toFixed(3) : v]))));
}
console.log(`difficulty=${DIFF} cap=${CAP}s step=1/60 s seeds=1..${RUNS}`);
if (process.env.BENCH_DEBUG) { const r = run(1, true, 'bot02'); console.log(JSON.stringify({ t: r.t, s3: r.s3, gp: r.gp })); }
}
