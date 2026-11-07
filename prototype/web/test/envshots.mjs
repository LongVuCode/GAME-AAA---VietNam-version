// envshots.mjs - fixed-angle environment screenshots (Bến Sậy, Đầm Nông, Bãi Lau, arena, hub) for
// before/after look-dev comparisons. Serves dist/ over local HTTP (test/serve.mjs), High quality by
// default. Headless Chromium renders with SwiftShader (CPU): images only, never FPS numbers.
//   node test/envshots.mjs [outDir] [prefix] [quality]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { serveDist } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const OUT = process.argv[2] || process.env.SHOTS_DIR || '/tmp/claude-0/-home-user/c58ad2cd-0dde-5c55-b1e4-0cacdf2a6473/scratchpad/env04-shots';
const PREFIX = process.argv[3] ?? 'after';
const QUALITY = process.argv[4] ?? 'high';
const ONLY = process.env.SHOTS_ONLY ? process.env.SHOTS_ONLY.split(',') : null;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// [name, player x, z, player yaw, camera yaw, camera pitch]. The first five are the 0.3 angles (before /
// after comparisons); go / lausau / rach / sung look at the Demo 0.4 regions of world_0_4.json.
export const VIEWS = [
  ['ben', -1, 14, Math.PI, Math.PI - 0.45, 0.22],
  ['dam', 2, -10, 0, 0.15, 0.2],
  ['lau', 0, -56, 0, -0.2, 0.2],
  ['arena', 2, -121, 0, 0.1, 0.24],
  ['hub', 300, 12, Math.PI, -0.35, 0.22],
  ['go', 62, -40, 2.3, -0.84, 0.2],
  ['lausau', -40, -66, -2.4, 0.75, 0.2],
  ['rach', -36, 2, -2.2, 0.95, 0.24],
  ['sung', 52, -126, 2.6, -0.55, 0.16],
];
const frames = (n) => page.evaluate((k) => new Promise((res) => { let i = 0; const f = () => (++i >= k ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

const srv = await serveDist();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [], external = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('request', (r) => { if (!r.url().startsWith(srv.url) && !/^(data|blob):/.test(r.url())) external.push(r.url()); });
try {
  await page.goto(`${srv.url}index.html?debug=1&intro=0${process.env.SHOTS_QUERY ? '&' + process.env.SHOTS_QUERY : ''}`);
  page.setDefaultTimeout(600000); // SwiftShader on a shared CPU: seconds per frame at High
  await page.waitForSelector('[data-screen=title]');
  await page.evaluate(() => setTimeout(() => document.querySelector('[data-act=start]').click(), 0));
  await page.waitForFunction(() => window.__demo?.state().mode === 'playing', null, { timeout: 600000, polling: 1000 });
  await page.evaluate((q) => { window.__demo.setGod(true); window.__demo.setQuality(q); }, QUALITY);
  const t0 = Date.now();
  await page.waitForFunction(() => { const e = window.__demo.game.fx.atmo?.env; return !e || e.state !== 'loading'; }, null, { timeout: 600000, polling: 1000 }).catch(() => {});
  const env = await page.evaluate(() => window.__demo.game.fx.atmo?.env?.stats?.() ?? null);
  console.log('[shots] env', JSON.stringify(env), `${Date.now() - t0} ms`);
  // Park every enemy so nothing walks into the frame while shooting.
  await page.evaluate(() => { for (const e of window.__demo.game.allEnemies()) { e.engaged = false; } });
  for (const [name, x, z, yaw, camYaw, pitch] of VIEWS) {
    if (ONLY && !ONLY.includes(name)) continue;
    await page.evaluate(([x, z, yaw, camYaw, pitch]) => {
      const d = window.__demo; d.teleport(x, z, yaw); d.setCameraYaw(camYaw); d.game.cam.pitch = pitch;
      for (const e of d.game.allEnemies()) if (Math.hypot(e.x - x, e.z - z) < 14) d.freezeEnemy(e.uid, true);
    }, [x, z, yaw, camYaw, pitch]);
    await frames(4); await sleep(500); // headless frames are slow (SwiftShader): wait for rendered frames, not time
    const file = join(OUT, `${PREFIX}_${name}_${QUALITY}.png`);
    await page.screenshot({ path: file });
    console.log('[shots]', file);
  }
} finally {
  console.log('[shots] console errors/warnings:', errors.length ? errors.slice(0, 10) : 'none');
  console.log('[shots] external requests:', external.length ? external : 'none');
  await browser.close(); await srv.close();
}
