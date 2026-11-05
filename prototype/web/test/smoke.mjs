// smoke.mjs - Playwright smoke test of dist/index.html (Track W acceptance: game starts without
// console errors, a bot drives off a normal enemy, the boss is brought to the pry and freed, the
// Codex opens, the language switches; then the hub, crafting, handoff to Bương and the demo end).
// FX (src/fx): High quality (shadows + bloom) is checked and photographed first, the menu switches to
// Low, and the long bot sections run at Low: headless Chromium renders with SwiftShader on the CPU,
// where High is several times slower than on a GPU (not representative either way, no FPS claims);
// every gameplay check is the same at either quality. FX hooks are checked on the real events.
// Run: npm run smoke   (builds first). Screenshots go OUTSIDE the repo (SHOTS_DIR or the default).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = process.env.SHOTS_DIR ?? '/tmp/claude-0/-home-user/c58ad2cd-0dde-5c55-b1e4-0cacdf2a6473/scratchpad/proto-shots';
mkdirSync(SHOTS, { recursive: true });
const url = `${pathToFileURL(join(here, '..', 'dist', 'index.html')).href}?debug=1`;

const errors = [];
const external = [];
const log = (...a) => console.log('[smoke]', ...a);
const checks = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok: !!ok, detail }); log(ok ? 'PASS' : 'FAIL', name, detail); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) external.push(r.url()); });
const S = () => page.evaluate(() => window.__demo.state());
const D = (fn, ...args) => page.evaluate(([f, a]) => window.__demo[f](...a), [fn, args]);
const shot = async (name) => { await page.screenshot({ path: join(SHOTS, name) }); log('shot', join(SHOTS, name)); };
async function waitFor(pred, timeoutMs, stepMs = 100) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) { const s = await S(); if (pred(s)) return s; await sleep(stepMs); }
  return null;
}
const press = (k) => page.keyboard.press(k);
const click = async () => { await page.mouse.move(640, 360); await page.mouse.down(); await page.mouse.up(); };

try {
  await page.goto(url);
  await page.waitForSelector('[data-screen=title]');
  await sleep(800);
  await shot('01_title.png');
  const titleText = await page.textContent('[data-screen=title]');
  check('title shows prototype/graybox notice', titleText.includes('graybox'), titleText.slice(0, 80));

  // Feedback screen (no network): build id visible for copying.
  await page.click('[data-act=feedback]');
  const fb = await page.inputValue('textarea.copy');
  check('feedback shows build id + browser info', fb.includes('build: demo0.2-web') && fb.includes('ua: '));
  await shot('02_feedback.png');
  await page.click('[data-act=back]');

  await page.click('[data-act=start]');
  let s = await waitFor((x) => x.mode === 'playing', 5000);
  check('game starts (mode playing)', !!s);
  await sleep(1500);
  await shot('03_play_start.png');

  // ---- FX at High quality (default): lighting/shadows/bloom on, effects spawn from fixed pools.
  let fx = await D('fx');
  check('fx: High quality by default (shadows + bloom)', fx.quality === 'high' && fx.shadows && fx.bloom, JSON.stringify(fx));
  await D('setGod', true);
  await D('teleport', 0, 12, Math.PI); await D('setCameraYaw', 0.35); await sleep(400);
  const spawned0 = fx.spawned;
  await D('fxDemo', 'perfect_parry', 'bronze', false, 2.2);
  await D('fxDemo', 'heavy', 'mud', false, 1.4);
  fx = await D('fxDemo', 'khoen_crack', 'bronze', true, 1.8);
  check('fx: impacts spawn particles and rings (bounded pools)', fx.spawned > spawned0 + 40 && fx.rings > 0 && fx.sparks <= fx.limits[0] && fx.dust <= fx.limits[1], JSON.stringify(fx));
  await shot('03b_fx_impacts_high.png');
  await D('freezeFx', false);
  await D('setAcc', 'acc_camera_shake', false); await sleep(200);
  fx = await D('fx');
  check('fx: camera shake follows the accessibility option', fx.shakeOn === false, JSON.stringify(fx.shakeOn));
  await D('setAcc', 'acc_camera_shake', true);

  // Quality switch from the pause menu (strings in vi + en): run the rest at Low (see header).
  await press('Escape');
  await waitFor((x) => x.screen === 'pause', 3000);
  await page.selectOption('select[data-set=gfx]', 'low');
  await sleep(300);
  fx = await D('fx');
  check('fx: quality menu switches to Low (no shadows, no bloom, smaller pools)', fx.quality === 'low' && !fx.shadows && !fx.bloom && fx.limits[0] < 700, JSON.stringify(fx));
  await page.click('[data-act=resume]');
  await waitFor((x) => x.mode === 'playing', 3000);

  // ---- HUD 0.3 (src/ui/hud, checked at Low quality like the other long sections): health colour tiers at 100 / 50 / 10 %, drum face full state.
  const setHud = (hp, drum) => page.evaluate(([hp, drum]) => { const p = window.__demo.game.player; p.hp = p.hpMax * hp; p.drum.points = drum; p.drum.sinceActivity = 0; }, [hp, drum]);
  const rgbOf = (c) => (c.match(/\d+/g) ?? []).map(Number);
  const hudAt = async (hp, drum, pred) => { await setHud(hp, drum); for (let k = 0; k < 40; k++) { await sleep(60); const h = await D('hud'); if (pred(h)) return h; } return D('hud'); };
  let hs = await hudAt(1, 0, (h) => h.hpTier === 'ok');
  let [cr, cg, cb] = rgbOf(hs.hpColor);
  check('hud: health 100 % is bright green', hs.hpTier === 'ok' && cg > 200 && cg > cr && cg > cb && hs.drumFull === false && hs.drumAttr === '0', JSON.stringify(hs));
  await shot('03f_hud_full_hp.png');
  hs = await hudAt(0.5, 250, (h) => h.hpTier === 'warn');
  [cr, cg, cb] = rgbOf(hs.hpColor);
  check('hud: health 50 % turns yellow', hs.hpTier === 'warn' && cr > 200 && cg > 180 && cb < 90, JSON.stringify(hs));
  hs = await hudAt(0.1, 400, (h) => h.hpTier === 'crit' && h.drumFull);
  [cr, cg, cb] = rgbOf(hs.hpColor);
  const beatShown = await page.evaluate(() => getComputedStyle(document.querySelector('.h-hprow .beat')).display !== 'none');
  check('hud: health 10 % turns red + heartbeat icon (not colour only)', hs.hpTier === 'crit' && cr > 200 && cg < 80 && beatShown, JSON.stringify({ ...hs, beatShown }));
  const drawsFull = hs.draws;
  check('hud: drum face full at 4 notches (red-orange state)', hs.drumFull && hs.drumAttr === '1', JSON.stringify(hs));
  await sleep(500);
  await shot('03g_hud_low_hp_drum_full.png');
  hs = await hudAt(0.1, 399, (h) => !h.drumFull);
  check('hud: drum face leaves the full state below 4 notches; canvas redraws while the fluid moves', !hs.drumFull && hs.drumAttr === '0' && hs.draws > drawsFull, JSON.stringify(hs));
  await setHud(1, 0);

  // ---- Demo 0.2 movement / animation / controls (keys from design/data/controls.json).
  const P = () => D('playerInfo');
  await D('teleport', -9, 21, Math.PI); await D('setCameraYaw', 0); await sleep(300);
  await page.keyboard.down('KeyW'); await sleep(1500);
  let pi = await P();
  const runSpeed = pi.speed, runGait = pi.gait;
  // Joint angles change while running (jointed rig, gait cycle).
  const thighs = [];
  for (let k = 0; k < 6; k++) { thighs.push((await P()).joints.thighL); await sleep(70); }
  const swing = Math.max(...thighs) - Math.min(...thighs);
  check('rig: thigh joint swings while running', swing > 0.3, `thighL samples ${thighs.join(',')}`);
  await page.keyboard.down('ShiftLeft'); await sleep(1500);
  pi = await P();
  const fxS = await D('fx');
  check('sprint (hold Shift) is faster than running; FOV widens', pi.sprinting && pi.speed > runSpeed + 1.5 && fxS.fov > 61, `run ${runSpeed.toFixed(2)} (${runGait}) sprint ${pi.speed.toFixed(2)} (${pi.gait}) fov ${fxS.fov}`);
  await shot('03c_sprint.png');
  await page.keyboard.up('ShiftLeft'); await page.keyboard.up('KeyW');
  await waitFor(() => true, 10); await sleep(600);
  // Demo 0.3 controls (controls.json scheme_0_3): Space jumps, C dodges.
  const G3 = () => D('gp03');
  // Keep the Bến Sậy crab out of the movement checks (slow headless frames give it time to walk over).
  await page.evaluate(() => { for (const e of window.__demo.game.enemies) if (!e.isBoss && Math.hypot(e.x, e.z - 14) < 16) e.reset(); });
  await D('teleport', 0, 14, Math.PI); await D('setCameraYaw', 0); await sleep(300);
  await page.keyboard.down('Space');
  let g3 = null, peak = 0;
  for (let k = 0; k < 40; k++) { g3 = await G3(); peak = Math.max(peak, g3.player.y); if (peak > 0.3 && k > 2) break; await sleep(40); }
  await page.keyboard.up('Space');
  s = await waitFor((x) => x.player.state === 'free', 8000, 60);
  g3 = await G3();
  check('Space jumps: the player leaves the ground and lands again', peak > 0.3 && g3.stats.jumps >= 1 && g3.stats.landings >= 1 && g3.player.y === 0, `peak ${peak.toFixed(2)} m ${JSON.stringify({ j: g3.stats.jumps, l: g3.stats.landings, y: g3.player.y })}`);
  // Directional dodge: hold A (camera-left) + C; the roll goes left, not forward.
  await D('teleport', 0, 14, 0); await D('setCameraYaw', 0); await sleep(300);
  pi = await P();
  const x0 = pi.x, z0 = pi.z;
  await page.keyboard.down('KeyA'); await page.keyboard.press('KeyC');
  await waitFor((x) => x.player.state === 'dodge', 2000, 20);
  await page.keyboard.up('KeyA');
  await waitFor((x) => x.player.state === 'free', 4000, 50);
  pi = await P();
  // Camera yaw 0 looks along -z: camera-left is -x.
  check('dodge follows the input direction (left roll)', pi.x < x0 - 1.5 && Math.abs(pi.z - z0) < 1.0 && pi.dodge?.kind === 'roll', `moved ${(pi.x - x0).toFixed(2)}, ${(pi.z - z0).toFixed(2)} ${JSON.stringify(pi.dodge)}`);
  await sleep(400);
  await page.keyboard.press('KeyC'); // neutral = backstep
  s = await waitFor((x) => x.player.state === 'dodge', 2000, 20);
  pi = await P();
  check('neutral dodge is a backstep', pi.dodge?.kind === 'backstep', JSON.stringify(pi.dodge));
  await waitFor((x) => x.player.state === 'free', 4000, 50);
  // Attack lunge: a light attack steps forward (weapons.json moves[].motion.lunge_m).
  await page.evaluate(() => { for (const e of window.__demo.game.enemies) if (!e.isBoss && Math.hypot(e.x, e.z - 14) < 16) e.reset(); });
  await D('teleport', 0, 18, Math.PI); await sleep(300);
  pi = await P();
  const ax0 = pi.x, az0 = pi.z;
  await click();
  s = await waitFor((x) => x.player.state === 'attack', 2000, 20);
  const atk = (await P()).attack;
  await waitFor((x) => x.player.state === 'free', 4000, 50);
  pi = await P();
  const lungeD = Math.hypot(pi.x - ax0, pi.z - az0);
  check('light attack lunges forward (sp_l1 motion)', !!atk && lungeD > 0.3, `${JSON.stringify(atk)} moved ${lungeD.toFixed(2)} m`);

  // ---- Remap: pause → Controls → Remap → dodge = V; V then dodges; reset to defaults.
  await press('Escape');
  await waitFor((x) => x.screen === 'pause', 3000);
  await page.click('[data-tab=controls]');
  await shot('03d_controls.png');
  await page.click('[data-screen=pause] [data-act=remap]');
  await page.waitForSelector('[data-screen=remap]');
  await page.click('[data-bind=dodge][data-dev=kbm][data-slot="0"]');
  await sleep(100); await page.keyboard.press('KeyV'); await sleep(200);
  let bnd = await D('bindings');
  const msgRemap = await page.textContent('[data-remap-msg]');
  // Conflict: give dodge the Q key → parry receives V (swap).
  await page.click('[data-bind=dodge][data-dev=kbm][data-slot="0"]');
  await sleep(100); await page.keyboard.press('KeyQ'); await sleep(200);
  const bnd2 = await D('bindings');
  const conflictMsg = await page.textContent('[data-remap-msg]');
  await shot('03e_remap.png');
  check('remap: key assigned and saved, conflicts swap', bnd.kbm.dodge[0] === 'KeyV' && bnd2.kbm.dodge[0] === 'KeyQ' && bnd2.kbm.parry[0] === 'KeyV' && conflictMsg.length > 5,
    `${msgRemap} | ${conflictMsg} | ${JSON.stringify({ d: bnd2.kbm.dodge, p: bnd2.kbm.parry })}`);
  const stored = await page.evaluate(() => { try { return localStorage.getItem('ngb_demo02_bindings_v1'); } catch { return null; } });
  await page.click('[data-screen=remap] [data-act=back]');
  await page.click('[data-act=resume]');
  await waitFor((x) => x.mode === 'playing', 3000);
  await sleep(300);
  await page.keyboard.press('KeyQ');
  s = await waitFor((x) => x.player.state === 'dodge', 1500, 20);
  check('remapped key works in game (Q now dodges)', !!s && !!stored && stored.includes('KeyQ'));
  await waitFor((x) => x.player.state === 'free', 4000, 50);
  await press('Escape'); await waitFor((x) => x.screen === 'pause', 3000);
  await page.click('[data-tab=controls]'); await page.click('[data-screen=pause] [data-act=remap]');
  await page.waitForSelector('[data-screen=remap]');
  await page.click('[data-screen=remap] [data-act=reset]'); await sleep(200);
  bnd = await D('bindings');
  check('remap: reset to defaults (0.3: dodge C, jump Space)', bnd.kbm.dodge[0] === 'KeyC' && bnd.kbm.jump[0] === 'Space' && bnd.kbm.parry[0] === 'KeyQ');
  await page.click('[data-screen=remap] [data-act=back]');
  await page.click('[data-act=resume]');
  await waitFor((x) => x.mode === 'playing', 3000);

  // ---- Gamepad (Gamepad API "standard" mapping, faked in the page): B dodges, glyphs switch to the pad.
  await page.evaluate(() => {
    const pad = { id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', connected: true, index: 0, mapping: 'standard',
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    window.__fakePad = pad; navigator.getGamepads = () => [window.__fakePad];
  });
  await sleep(200);
  await page.evaluate(() => { window.__fakePad.buttons[1] = { pressed: true, value: 1 }; });
  s = await waitFor((x) => x.player.state === 'dodge', 2000, 20);
  await page.evaluate(() => { window.__fakePad.buttons[1] = { pressed: false, value: 0 }; });
  const padGlyph = await page.evaluate(() => window.__demo.game.glyphText('interact'));
  const padDevice = (await P()).device;
  check('gamepad: B (button 1) dodges; prompts show pad glyphs (0.3: interact on RB)', !!s && padDevice === 'pad' && padGlyph === 'RB', `device=${padDevice} interact glyph=${padGlyph}`);
  await waitFor((x) => x.player.state === 'free', 4000, 50);
  await page.evaluate(() => { window.__fakePad.buttons[0] = { pressed: true, value: 1 }; });
  let padPeak = 0;
  for (let k = 0; k < 30 && padPeak < 0.2; k++) { padPeak = Math.max(padPeak, (await G3()).player.y); await sleep(40); }
  await page.evaluate(() => { window.__fakePad.buttons[0] = { pressed: false, value: 0 }; });
  check('gamepad: A (button 0) jumps', padPeak > 0.2, `peak ${padPeak.toFixed(2)}`);
  await waitFor((x) => x.player.state === 'free', 6000, 50);
  // Left stick half tilt walks (analog), full tilt runs.
  await page.evaluate(() => { window.__fakePad.axes = [0, -0.45, 0, 0]; });
  await sleep(900);
  const padWalk = (await P()).speed;
  await page.evaluate(() => { window.__fakePad.axes = [0, -1, 0, 0]; });
  await sleep(900);
  const padRun = (await P()).speed;
  await page.evaluate(() => { window.__fakePad.axes = [0, 0, 0, 0]; window.__fakePad = null; navigator.getGamepads = () => []; });
  check('gamepad: light stick tilt walks, full tilt runs', padWalk > 1 && padWalk < 3 && padRun > 4.5, `walk ${padWalk.toFixed(2)} run ${padRun.toFixed(2)}`);
  await page.keyboard.press('KeyW'); await sleep(200);

  // ---- Bot: drive off the nearest normal enemy with real light attacks (mouse) + finisher (E).
  await D('setGod', true);
  s = await S();
  const crab = s.enemies[0];
  await D('teleport', crab.x + 1.6, crab.z + 1.6);
  let shotCombat = false, shotFinisher = false, fled = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    s = await S();
    const e = s.enemies.find((x) => x.uid === crab.uid);
    if (e.state === 'fleeing' || e.state === 'gone') { fled = e; break; }
    if (e.state === 'finished') { if (!shotFinisher) { await shot('04b_finisher.png'); shotFinisher = true; } await sleep(100); continue; }
    if (e.staggered) { await D('faceEnemy', crab.uid); await press('e'); await sleep(150); continue; }
    const d = Math.hypot(e.x - s.player.x, e.z - s.player.z);
    if (d > 2.4) await D('teleport', e.x + 1.4, e.z + 1.4);
    await D('faceEnemy', crab.uid);
    await click();
    if (!shotCombat && e.hp < 200) { await shot('04_combat.png'); shotCombat = true; }
    await sleep(120);
  }
  check('bot drove off a normal enemy (flee, not killed)', !!fled, fled ? `${fled.uid} ${fled.state} hp=${fled.hp.toFixed(0)}` : 'timeout');
  const flog = await D('feedbackLog');
  const minLayers = Math.min(...flog.map((f) => f.layers.length));
  check('every landed hit has >= 6 feedback layers', flog.length > 0 && minLayers >= 6, `${flog.length} hits, min ${minLayers}: ${flog[0]?.layers.join(',')}`);
  check('finisher used (camera finisher, enemy flees after)', (await D('finisherCount')) >= 1 || (fled && fled.hp <= 0), `finishers=${await D('finisherCount')}`);
  const fxAfterFight = await D('fx');
  check('fx hooks fired on real hits (impacts)', fxAfterFight.impacts >= 3, JSON.stringify({ i: fxAfterFight.impacts, f: fxAfterFight.footsteps }));
  await sleep(600);
  await shot('05_enemy_fled.png');

  // ---- Drum Burst ("Hồi trống") when the 4 notches are full.
  await page.evaluate(() => { window.__demo.game.player.drum.points = 400; });
  await press('f');
  s = await waitFor((x) => x.player.state === 'burst', 2000, 20);
  check('Hồi trống with 4 full notches', !!s);
  await waitFor((x) => x.player.state === 'free', 40000); // game time runs slower at headless frame rates

  // ---- Hints (player-initiated, 3 tiers) from the old ferrywoman.
  await D('teleport', -4, 20.5, 0);
  for (let k = 0; k < 3 && !s?.screen; k++) { await sleep(300); await press('e'); s = await waitFor((x) => x.screen === 'hints', 3000); }
  await page.click('[data-tier="1"]'); await page.click('[data-tier="3"]');
  const hint = await page.textContent('[data-hint]');
  check('3-tier hint shown on request', !!s && hint.length > 10, hint.slice(0, 60));
  await shot('05b_hints.png');
  await page.click('[data-screen=hints] [data-act=back]');

  // ---- Secret chain: trap marks → bronze scrap → kiln lip (match) → hollow.
  for (const [x, z] of [[-17.5, -29.5], [6.5, -75.5], [-31, -114.6], [-31, -112.2]]) {
    await D('teleport', x, z, 0); await sleep(300); await press('e'); await sleep(400);
  }
  s = await S();
  check('secret chain finished (Sáp ong cũ + Codex extra)', s.secret.completed.includes('sn_end') && s.inventory.mat_sap_ong_cu === 1, JSON.stringify(s.secret.completed));

  // ---- Entranced villager: hold E "Gọi tên" (non-combat).
  await D('teleport', 10, -79, Math.PI);
  await sleep(300);
  await page.keyboard.down('e');
  s = await waitFor((x) => x.flags.includes('flag_nguoi_bi_me_saved'), 30000, 100);
  await page.keyboard.up('e');
  check('villager called back by holding E (no combat)', !!s);

  // ---- Boss: bring it to the pry (posture breaks crack the khoen) and complete the 3-beat pry.
  await D('teleport', 0, -127, Math.PI);
  await D('setCameraYaw', 0);
  await sleep(300);
  await press('Tab');
  s = await waitFor((x) => !!x.lock, 3000);
  check('lock-on (Tab) acquires the boss', s?.lock === s?.boss.uid, s?.lock);
  check('hud: boss bar shown with the boss engaged', (await D('hud')).bossVisible, JSON.stringify(await D('hud')));
  s = await waitFor((x) => x.boss.tele === 'unparryable', 25000, 40) ?? await waitFor((x) => !!x.boss.tele, 10000, 40);
  check('boss telegraph shown (shape + color + sound cue)', !!s, s ? `${s.boss.attack} ${s.boss.tele}` : 'none');
  await shot('06_boss_telegraph.png');
  const bossUid = (await S()).boss.uid;
  // Demo 0.3 boss: a chain (combos_0_3) and the Mud Wave (ring_wave) are played by the real attack code.
  await waitFor((x) => x.boss.state !== 'attack' && !x.boss.staggered, 20000, 60);
  await page.evaluate(() => window.__demo.game.gp.forceBoss('combo', 'cb_ba_nhip_nanh'));
  g3 = await G3();
  const comboSeen = g3.boss.combo === 'cb_ba_nhip_nanh';
  for (let k = 0; k < 200 && (await G3()).boss.combo; k++) await sleep(100);
  await waitFor((x) => x.boss.state !== 'attack', 20000, 60);
  await page.evaluate(() => window.__demo.game.gp.forceBoss('attack', 'll_song_bun'));
  let waveShot = false;
  for (let k = 0; k < 300; k++) { g3 = await G3(); if (!waveShot && g3.boss.stats.waves >= 1) { await shot('06b_boss_mud_wave.png'); waveShot = true; } if (g3.boss.attack !== 'll_song_bun' && g3.boss.stats.waves >= 1) break; await sleep(100); }
  check('boss 0.3 plays a chain and the Mud Wave', comboSeen && g3.boss.stats.combos.length >= 1 && g3.boss.stats.waves >= 1 && g3.boss03, JSON.stringify({ combo: comboSeen, stats: g3.boss.stats }));
  let sawTransition = false;
  for (let k = 1; k <= 3; k++) {
    await waitFor((x) => !x.boss.staggered && x.boss.state !== 'pried', 20000);
    if (k === 3) {
      // Phase 2 opens with the set piece "Húc cọc" (4 s, boss invulnerable): wait it out.
      s = await waitFor((x) => x.boss.state === 'transition', 4000, 40);
      if (s) { sawTransition = true; await sleep(900); await shot('07b_huc_coc.png'); }
      await waitFor((x) => x.boss.state !== 'transition' && !x.boss.staggered, 20000);
    }
    s = await S();
    await D('hitEnemy', bossUid, 0, s.boss.theMax + 1);
    s = await S();
    check(`boss posture break ${k} cracks khoen`, s.boss.cracks === k, `cracks=${s.boss.cracks} phase=${s.boss.phase}`);
    if (k === 2) { await sleep(400); await shot('07_boss_phase2.png'); }
  }
  g3 = await G3();
  check('boss phase 2: the water recedes and 3 old trap stakes emerge', (g3.stakes?.length ?? 0) === 3, JSON.stringify({ stakes: g3.stakes, pools: g3.pools }));
  check('boss phase 2 set piece "Húc cọc" played (stake rammed)', sawTransition, `transitionSeen=${(await D('enemyDetail', bossUid))?.transitionSeen}`);
  fx = await D('fx');
  check('fx: posture breaks trigger slow-mo hooks (game step only)', fx.slowMo >= 3, `slowMo calls=${fx.slowMo}`);
  s = await S();
  check('boss staggered with 3 cracks → pry available', s.boss.canFinish && s.boss.khoen === 'ready', JSON.stringify({ c: s.boss.canFinish, k: s.boss.khoen }));
  let pryOk = false;
  for (let attempt = 0; attempt < 3 && !pryOk; attempt++) {
    s = await S();
    if (!s.boss.canFinish) {
      await waitFor((x) => !x.boss.staggered && x.boss.state !== 'transition', 20000);
      await D('hitEnemy', bossUid, 0, (await S()).boss.theMax + 1);
    }
    s = await S();
    await D('teleport', s.boss.x, s.boss.z + 3.2);
    await D('faceEnemy', bossUid);
    await sleep(200);
    const promptText = await page.textContent('#prompt');
    if (attempt === 0) check('pry prompt shown', /Cạy/.test(promptText), promptText);
    await press('e');
    s = await waitFor((x) => !!x.pry, 3000, 30);
    if (!s) { log('pry did not start', JSON.stringify((await S()).boss)); continue; }
    let shotPry = false;
    // Presses are timed on the page clock (slot centre in performance.now() ms); the game judges each
    // press by its event timestamp, so low headless frame rates do not shift the judgement.
    for (let guard = 0; guard < 60; guard++) {
      s = await S();
      if (!s.pry) break;
      if (!shotPry && s.pry.beat >= 1) { await D('freezePry', true); await shot('08_pry.png'); await D('freezePry', false); shotPry = true; continue; }
      const wait = s.pry.slotAtMs - s.pageNow;
      if (wait > 120) { await sleep(wait - 100); continue; }
      if (wait < -s.pry.window * 1000) { await sleep(30); continue; }
      await sleep(Math.max(0, wait - 5));
      await press('e');
      await sleep(250);
    }
    s = await S();
    pryOk = s.boss.outcome === 'freed';
    log('pry attempt', attempt + 1, s.boss.outcome, JSON.stringify({ khoen: s.boss.khoen, fps: s.fps, log: s.pryLog }));
  }
  check('pry completed → boss freed (not killed)', pryOk);
  await sleep(4500);
  await shot('09_after_pry_ve.png');
  s = await waitFor((x) => x.flags.includes('flag_boss_lon_loi_freed'), 8000);
  check('freed flag set, shed tusk received, no khoen item', !!s && s.inventory.mat_nanh_rung === 1 && !Object.keys(s.inventory).some((k) => /khoen/.test(k)), JSON.stringify(s?.inventory));
  check('house move learned + 2 craft points', !!s && s.skills.points >= 4, `points=${s?.skills.points}`);

  // ---- Demo 0.3 UI (ui/inventory, ui/map): minimap top-left, Pack (B) with equipment / skills / map / codex tabs.
  const SHOTS03 = process.env.SHOTS03_DIR ?? join(SHOTS, '..', 'ui03-shots');
  mkdirSync(SHOTS03, { recursive: true });
  const shot03 = async (name) => { await page.screenshot({ path: join(SHOTS03, name) }); log('shot', join(SHOTS03, name)); };
  const U = () => D('ui03');
  await D('teleport', 15, -24); await sleep(600);
  let u = await U();
  check('minimap shown in the top-left corner (~180 px)', !u.minimapHidden && u.minimapRect.x < 40 && u.minimapRect.y < 40 && Math.abs(u.minimapRect.w - 180) < 4, JSON.stringify(u.minimapRect));
  await shot03('smoke_minimap.png');
  await D('teleport', 22, -27); await sleep(300); await press('e'); await sleep(400);
  u = await U();
  check('rattan chest opens and gives its gear (head wrap)', u.opened.includes('chest_dam_nong'), JSON.stringify(u.opened));
  await press('b');
  s = await waitFor((x) => x.screen === 'pack', 3000);
  check('B opens the Pack (game paused)', !!s && s.mode === 'paused');
  await page.click('[data-slot=head]'); await sleep(200);
  if (await page.$('[data-unequip]')) { await page.click('[data-unequip]'); await sleep(200); }
  const armor0 = (await U()).pack.stats.armor;
  await page.click('[data-cand=ar_khan_gai]'); await sleep(300);
  const armor1 = (await U()).pack.stats.armor;
  check('equipping the head wrap raises armor (stats change)', armor1 === armor0 + 6, `${armor0} -> ${armor1}`);
  await shot03('smoke_pack_equipment.png');
  await D('addXp', 200);
  await page.click('[data-tab=skills]'); await sleep(200);
  await page.click('[data-art=sk_giao_quet_song]'); await sleep(200);
  const lv0 = (await U()).skills.sk_giao_quet_song;
  await page.click('[data-act=rankup]'); await sleep(200);
  await page.click('[data-act=rankup]'); await sleep(200);
  const lv1 = (await U()).skills.sk_giao_quet_song;
  check('Weapon Art unlocked and ranked up with XP', lv1 === lv0 + 2, `${lv0} -> ${lv1}`);
  await shot03('smoke_pack_skills.png');
  await page.click('[data-tab=map]'); await sleep(600);
  u = await U();
  check('map shows fog (part explored) and landmarks', u.pack.map && u.pack.map.fogRatio > 0.02 && u.pack.map.fogRatio < 0.9 && u.pack.map.symbols.includes('lm_fire_ben_say') && u.pack.map.symbols.includes('chest_dam_nong'), JSON.stringify(u.pack.map));
  await shot03('smoke_map.png');
  await page.click('[data-tab=codex]'); await sleep(300);
  const codexText = await page.textContent('[data-screen=pack]');
  check('codex tab shows level-B notice + labels', codexText.includes('mức B') && codexText.includes('Sáng tạo của game'));
  await page.click('[data-cx=cx_khoen]');
  await shot('10_codex.png');
  await press('b');
  s = await waitFor((x) => x.screen === null && x.mode === 'playing', 3000);
  check('B closes the Pack', !!s);

  // ---- Language switch from the pause menu
  await press('Escape');
  await waitFor((x) => x.screen === 'pause', 3000);
  await page.selectOption('select[data-set=lang]', 'en');
  s = await waitFor((x) => x.lang === 'en', 3000);
  check('language switched to en', !!s);
  await shot('11_pause_en.png');
  await page.click('[data-act=resume]');
  await sleep(500);
  const hudText = await page.textContent('#hud .bl');
  check('HUD re-labelled in en', hudText.includes('Health') && hudText.includes('Stance'), hudText.slice(0, 60));
  await shot('12_hud_en.png');
  await page.evaluate(() => window.__demo.game.setLang('vi'));

  // ---- Hub: ferry, craft Nanh Đầm, handoff to Bương, practice, end.
  await D('gather');
  await D('teleport', 0, 31);
  await sleep(300); await press('e');
  s = await waitFor((x) => x.zone === 'hub', 5000);
  check('ferry to hub (Lau Landing)', !!s);
  await D('teleport', 292, -5.5);
  await sleep(300); await press('e');
  await waitFor((x) => x.screen === 'craft', 3000);
  await page.click('[data-rcp=rcp_nanh_dam]');
  await sleep(300);
  await shot('13_craft.png');
  s = await S();
  check('crafted Nanh Đầm', !!s.owned.bk_nanh_dam, JSON.stringify(s.owned));
  await page.click('[data-screen=craft] [data-act=back]');
  await D('teleport', 300, -8.6);
  await sleep(300); await press('e');
  await waitFor((x) => x.screen === 'confirm', 3000);
  await shot('14_handoff_confirm.png');
  await page.click('[data-act=yes]');
  s = await waitFor((x) => x.player.state === 'handover', 2000, 30);
  const handoverSeen = !!s;
  if (s) { await sleep(500); await shot('14b_handover.png'); }
  await waitFor((x) => (x.screen ?? '').startsWith('handoff'), 6000, 50);
  check('in-world handover beat (Cói offers the Mũi Sào) before the cards', handoverSeen);
  const forbidden = /khoen|mảnh|chốt|collar|shard/i;
  let leak = [];
  for (let k = 0; k < 6; k++) {
    await sleep(250);
    const sc = await S();
    const txt = await page.evaluate(() => document.querySelector('.screen')?.innerText ?? '');
    if (forbidden.test(txt)) leak.push(sc.screen);
    if (sc.screen === 'handoff_ho_03_thap') await shot('15_handoff_thap.png');
    await page.click('[data-act=next]');
  }
  s = await waitFor((x) => x.character === 'chr_buong' && x.mode === 'playing', 5000);
  check('handoff to Bương (era Hùng 6), practice on the river bank', !!s && s.era === 'era_hung_vuong_6');
  await press('1');
  await sleep(600);
  for (const e of (await S()).practice) await D('hitEnemy', e.uid, 9999, 0);
  s = await waitFor((x) => x.practiceState?.done, 8000);
  check('practice goal: swap weapon once + crabs driven off', !!s);
  // Minimal HUD option: the player cluster hides out of combat and comes back at low health.
  await D('setAcc', 'acc_hud_minimal', true);
  let hm = null;
  for (let k = 0; k < 80 && (hm = await D('hud')).playerVisible; k++) await sleep(100);
  const hiddenOk = !hm.playerVisible;
  await page.evaluate(() => { const p = window.__demo.game.player; p.hp = p.hpMax * 0.4; });
  for (let k = 0; k < 20 && !(hm = await D('hud')).playerVisible; k++) await sleep(60);
  check('hud: minimal HUD hides out of combat, shows again at low health', hiddenOk && hm.playerVisible, JSON.stringify(hm));
  await D('setAcc', 'acc_hud_minimal', false);
  await page.evaluate(() => { const p = window.__demo.game.player; p.hp = p.hpMax; });
  await shot('16_buong_practice.png');
  const hudBuong = await page.evaluate(() => document.getElementById('hud').innerText);
  if (forbidden.test(hudBuong)) leak.push('hud');
  await D('teleport', 300, -8.6);
  await sleep(300); await press('e');
  for (let k = 0; k < 3; k++) {
    await sleep(300);
    const txt = await page.evaluate(() => document.querySelector('.screen')?.innerText ?? '');
    if (forbidden.test(txt)) leak.push(`end-${k}`);
    const sc = await S();
    if (sc.screen === 'end') break;
    await page.click('[data-act=next]');
  }
  s = await waitFor((x) => x.screen === 'end', 4000);
  check('demo end screen', !!s);
  check("no khoen/mảnh/chốt words shown in Bương's era", leak.length === 0, leak.join(','));
  await shot('17_end.png');
  s = await S();
  check('no missing UI strings', s.missingStrings.length === 0, s.missingStrings.join(','));
  log(`headless FPS reading (SwiftShader software GL, NOT representative): ${s.fps}`);
} catch (e) {
  errors.push(`smoke exception: ${e.stack ?? e}`);
} finally {
  check('no console errors / page errors', errors.length === 0, errors.join('\n'));
  check('no network requests outside the single file', external.length === 0, external.slice(0, 3).join(', '));
  await browser.close();
  const failed = checks.filter((c) => !c.ok);
  log(`${checks.length - failed.length}/${checks.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}
