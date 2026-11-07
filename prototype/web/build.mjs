// build.mjs - bundles src/main.js (three.js + logic + design data JSON) into dist/index.html and copies
// the environment assets (prototype/web/assets/: .glb, .jpg, .webp, .hdr) to dist/assets/, loaded at run
// time by relative URL (no external network). Sizes are checked against the artifact limits
// (page <= 16 MB, each extra file <= 15 MB) and the 40 MB total target.
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, statSync, readdirSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const git = (cmd) => { try { return execSync(cmd, { cwd: here, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };
const hash = git('git rev-parse --short HEAD') || 'nogit';
const dirty = git('git status --porcelain -- .') || git('git status --porcelain -- ../../design/data') ? '-dirty' : '';
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const buildId = `demo0.3-web-${hash}${dirty}-${stamp}`;

const result = await build({
  entryPoints: [join(here, 'src/main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: ['es2022'],
  legalComments: 'none',
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  logLevel: 'warning',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
// src/style.css first, then every *.css under src/ui (module styles: ui/inventory, ui/map, ...), sorted.
const cssUnder = (d) => readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  .flatMap((e) => (e.isDirectory() ? cssUnder(join(d, e.name)) : e.name.endsWith('.css') ? [join(d, e.name)] : []));
const css = [join(here, 'src/style.css'), ...cssUnder(join(here, 'src/ui'))].map((f) => readFileSync(f, 'utf8')).join('\n');
const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Người Giữ Bến Demo 0.3</title>
<meta name="description" content="Graybox gameplay prototype (three.js). Not final art. Build ${buildId}">
<style>${css}</style>
</head>
<body>
<div id="app"></div>
<!-- three.js r169 (MIT License, Copyright (c) 2010-2024 three.js authors) is bundled below. -->
<script>${js}</script>
</body>
</html>
`;
mkdirSync(join(here, 'dist'), { recursive: true });
const out = join(here, 'dist/index.html');
writeFileSync(out, html);
// Environment assets -> dist/assets (same relative paths as src/env/assets.js ASSETS).
const srcAssets = join(here, 'assets'), dstAssets = join(here, 'dist/assets');
rmSync(dstAssets, { recursive: true, force: true });
const MB = 1024 * 1024, LIMIT_PAGE = 16 * MB, LIMIT_FILE = 15 * MB, TARGET_TOTAL = 40 * MB;
let total = statSync(out).size; const files = [];
const copyDir = (s, d) => {
  if (!existsSync(s)) return;
  mkdirSync(d, { recursive: true });
  for (const e of readdirSync(s, { withFileTypes: true })) {
    const a = join(s, e.name), b = join(d, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else if (/\.(glb|jpg|jpeg|webp|png|hdr|ktx2|bin)$/i.test(e.name)) { copyFileSync(a, b); const n = statSync(b).size; total += n; files.push([b.slice(here.length + 1), n]); }
  }
};
copyDir(srcAssets, dstAssets);
const fmt = (n) => `${(n / MB).toFixed(2)} MB`;
console.log(`built ${out} (${statSync(out).size} bytes) id=${buildId}`);
for (const [f, n] of files) console.log(`  ${f}  ${fmt(n)}`);
console.log(`total dist: ${fmt(total)} (${files.length + 1} files; target <= 40 MB)`);
const over = [statSync(out).size > LIMIT_PAGE && 'index.html > 16 MB', ...files.filter(([, n]) => n > LIMIT_FILE).map(([f]) => `${f} > 15 MB`), total > TARGET_TOTAL && 'total > 40 MB'].filter(Boolean);
if (over.length) { console.error(`size limits exceeded: ${over.join(', ')}`); process.exit(1); }
