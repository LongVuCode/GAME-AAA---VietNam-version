// build.mjs - bundles src/main.js (three.js + logic + design data JSON) into ONE self-contained
// HTML file: dist/index.html. No runtime network access.
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const git = (cmd) => { try { return execSync(cmd, { cwd: here, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };
const hash = git('git rev-parse --short HEAD') || 'nogit';
const dirty = git('git status --porcelain -- .') || git('git status --porcelain -- ../../design/data') ? '-dirty' : '';
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const buildId = `demo0.2-web-${hash}${dirty}-${stamp}`;

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
<title>Người Giữ Bến Demo 0.2</title>
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
console.log(`built ${out} (${statSync(out).size} bytes) id=${buildId}`);
