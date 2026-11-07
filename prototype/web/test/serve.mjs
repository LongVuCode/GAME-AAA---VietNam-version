// serve.mjs - tiny static file server for dist/ (smoke test, screenshots, local play). The build loads
// its assets (dist/assets/*.glb, *.webp, *.hdr) by relative URL with fetch(), which browsers block on
// file://, so tests run against http://127.0.0.1:<port>/. No external network is used.
//   node test/serve.mjs [port]          -> serves prototype/web/dist until killed
//   import { serveDist } from './serve.mjs'; const srv = await serveDist(); srv.url; await srv.close();
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.hdr': 'image/vnd.radiance', '.ktx2': 'image/ktx2', '.wasm': 'application/wasm',
};

export function serveDist({ root = join(here, '..', 'dist'), port = 0 } = {}) {
  const base = normalize(root + sep);
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = normalize(join(root, path.endsWith('/') ? path + 'index.html' : path));
    if (!file.startsWith(base)) { res.writeHead(403).end(); return; }
    let st; try { st = statSync(file); } catch { res.writeHead(404).end(); return; }
    if (!st.isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-cache' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => {
    const p = server.address().port;
    resolve({ url: `http://127.0.0.1:${p}/`, port: p, close: () => new Promise((r) => server.close(r)) });
  }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const srv = await serveDist({ port: Number(process.argv[2] ?? 8173) });
  console.log(`serving dist at ${srv.url}`);
}
