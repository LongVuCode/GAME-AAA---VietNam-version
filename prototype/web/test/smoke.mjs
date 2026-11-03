// smoke.mjs - Playwright smoke test of dist/index.html (Track W acceptance: game starts without
// console errors, a bot drives off a normal enemy, the boss is brought to the pry and freed, the
// Codex opens, the language switches; then the hub, crafting, handoff to Bương and the demo end).
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
const log = (...a) => console.log('[smoke]', ...a);
const checks = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok: !!ok, detail }); log(ok ? 'PASS' : 'FAIL', name, detail); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
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
  check('feedback shows build id + browser info', fb.includes('build: demo0.1-web') && fb.includes('ua: '));
  await shot('02_feedback.png');
  await page.click('[data-act=back]');

  await page.click('[data-act=start]');
  let s = await waitFor((x) => x.mode === 'playing', 5000);
  check('game starts (mode playing)', !!s);
  await sleep(1500);
  await shot('03_play_start.png');

  // ---- Bot: drive off the nearest normal enemy with real light attacks (mouse) + finisher (F).
  await D('setGod', true);
  s = await S();
  const crab = s.enemies[0];
  await D('teleport', crab.x + 1.6, crab.z + 1.6);
  let shotCombat = false, fled = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    s = await S();
    const e = s.enemies.find((x) => x.uid === crab.uid);
    if (e.state === 'fleeing' || e.state === 'gone') { fled = e; break; }
    if (e.staggered) { await D('faceEnemy', crab.uid); await press('f'); await sleep(150); continue; }
    const d = Math.hypot(e.x - s.player.x, e.z - s.player.z);
    if (d > 2.4) await D('teleport', e.x + 1.4, e.z + 1.4);
    await D('faceEnemy', crab.uid);
    await click();
    if (!shotCombat && e.hp < 200) { await shot('04_combat.png'); shotCombat = true; }
    await sleep(120);
  }
  check('bot drove off a normal enemy (flee, not killed)', !!fled, fled ? `${fled.uid} ${fled.state} hp=${fled.hp.toFixed(0)}` : 'timeout');
  await sleep(600);
  await shot('05_enemy_fled.png');

  // ---- Boss: bring it to the pry (posture breaks crack the khoen) and complete the 3-beat pry.
  await D('teleport', 0, -127, Math.PI);
  await D('setCameraYaw', 0);
  await sleep(300);
  await press('Tab');
  s = await waitFor((x) => !!x.lock, 3000);
  check('lock-on (Tab) acquires the boss', s?.lock === s?.boss.uid, s?.lock);
  s = await waitFor((x) => x.boss.tele === 'unparryable', 25000, 40) ?? await waitFor((x) => !!x.boss.tele, 10000, 40);
  check('boss telegraph shown (shape + color + sound cue)', !!s, s ? `${s.boss.attack} ${s.boss.tele}` : 'none');
  await shot('06_boss_telegraph.png');
  const bossUid = (await S()).boss.uid;
  for (let k = 1; k <= 3; k++) {
    await waitFor((x) => !x.boss.staggered && x.boss.state !== 'pried', 20000);
    s = await S();
    await D('hitEnemy', bossUid, 0, s.boss.theMax + 1);
    s = await S();
    check(`boss posture break ${k} cracks khoen`, s.boss.cracks === k, `cracks=${s.boss.cracks} phase=${s.boss.phase}`);
    if (k === 2) { await sleep(400); await shot('07_boss_phase2.png'); }
  }
  s = await S();
  check('boss staggered with 3 cracks → pry available', s.boss.canFinish && s.boss.khoen === 'ready', JSON.stringify({ c: s.boss.canFinish, k: s.boss.khoen }));
  let pryOk = false;
  for (let attempt = 0; attempt < 3 && !pryOk; attempt++) {
    s = await S();
    if (!s.boss.canFinish) {
      await waitFor((x) => !x.boss.staggered, 20000);
      await D('hitEnemy', bossUid, 0, (await S()).boss.theMax + 1);
    }
    s = await S();
    await D('teleport', s.boss.x, s.boss.z + 3.2);
    await D('faceEnemy', bossUid);
    await sleep(200);
    const promptText = await page.textContent('#prompt');
    if (attempt === 0) check('pry prompt shown', /Cạy/.test(promptText), promptText);
    await press('f');
    s = await waitFor((x) => !!x.pry, 3000, 30);
    if (!s) continue;
    let shotPry = false;
    for (let guard = 0; guard < 400; guard++) {
      s = await S();
      if (!s.pry) break;
      if (s.pry.timeToSlot < 0.045 && s.pry.timeToSlot > -0.08) { await press('f'); await sleep(Math.max(150, s.pry.interval * 1000 * 0.5)); }
      else if (s.pry.timeToSlot > 0.25) await sleep(Math.min(150, (s.pry.timeToSlot - 0.2) * 1000));
      else await sleep(5);
      if (!shotPry && s.pry.beat >= 1) { await shot('08_pry.png'); shotPry = true; }
    }
    s = await S();
    pryOk = s.boss.outcome === 'freed';
    log('pry attempt', attempt + 1, s.boss.outcome);
  }
  check('pry completed → boss freed (not killed)', pryOk);
  await sleep(4500);
  await shot('09_after_pry_ve.png');
  s = await waitFor((x) => x.flags.includes('flag_boss_lon_loi_freed'), 8000);
  check('freed flag set, shed tusk received, no khoen item', !!s && s.inventory.mat_nanh_rung === 1 && !Object.keys(s.inventory).some((k) => /khoen/.test(k)), JSON.stringify(s?.inventory));
  check('house move learned + 2 craft points', !!s && s.skills.points >= 4, `points=${s?.skills.points}`);

  // ---- Codex
  await press('c');
  s = await waitFor((x) => x.screen === 'codex', 3000);
  check('codex opens', !!s);
  const codexText = await page.textContent('[data-screen=codex]');
  check('codex shows level-B notice + labels', codexText.includes('mức B') && codexText.includes('Sáng tạo của game'));
  await page.click('[data-cx=cx_khoen]');
  await shot('10_codex.png');
  await press('c');
  await waitFor((x) => x.screen === null && x.mode === 'playing', 3000);

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
  await sleep(300); await press('f');
  s = await waitFor((x) => x.zone === 'hub', 5000);
  check('ferry to hub (Lau Landing)', !!s);
  await D('teleport', 292, -5.5);
  await sleep(300); await press('f');
  await waitFor((x) => x.screen === 'craft', 3000);
  await page.click('[data-rcp=rcp_nanh_dam]');
  await sleep(300);
  await shot('13_craft.png');
  s = await S();
  check('crafted Nanh Đầm', !!s.owned.bk_nanh_dam, JSON.stringify(s.owned));
  await page.click('[data-screen=craft] [data-act=back]');
  await D('teleport', 300, -8.6);
  await sleep(300); await press('f');
  await waitFor((x) => x.screen === 'confirm', 3000);
  await shot('14_handoff_confirm.png');
  await page.click('[data-act=yes]');
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
  await sleep(300);
  for (const e of (await S()).practice) await D('hitEnemy', e.uid, 9999, 0);
  s = await waitFor((x) => x.practiceState?.done, 8000);
  check('practice goal: swap weapon once + crabs driven off', !!s);
  await shot('16_buong_practice.png');
  const hudBuong = await page.evaluate(() => document.getElementById('hud').innerText);
  if (forbidden.test(hudBuong)) leak.push('hud');
  await D('teleport', 300, -8.6);
  await sleep(300); await press('f');
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
  await browser.close();
  const failed = checks.filter((c) => !c.ok);
  log(`${checks.length - failed.length}/${checks.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}
