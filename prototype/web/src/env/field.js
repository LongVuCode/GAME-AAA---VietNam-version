// env/field.js - height and surface field of the environment from a layout (env/layout.js). Pure
// (no three.js), deterministic, unit tested. Used by the terrain mesh, the water depth texture, the
// foliage/prop scatter, and exposed as Environment.heightAt() for the game layer.
//
// Rules (all [SÁNG TẠO] look-dev, not gameplay):
//  - Legacy (0.3) walkable regions stay at y <= 0 (characters stand on y = 0): only a few cm of dips.
//  - 0.4 regions: region.height_m + heightmap features + noise (world_0_4.json heightmap._note).
//  - Outside every walkable region: a low muddy shelf (bank) of varying width, then a slope down
//    under the water plane (waterY), with low mounds/islands far from the play space.
//  - Shallow sheets, mud pools, the ditch and 0.4 water channels are carved below their water.
import { SURFACE_SPLAT, sdShape, shapeBounds, distPolyline, vnoise, fbm, smoothstep } from './layout.js';

export const LAYERS = ['wet_mud', 'grass', 'path', 'dry_mud', 'bank'];
const BANK = SURFACE_SPLAT.bank, PATH = SURFACE_SPLAT.path;

export function createField(L) {
  const walk = [], docks = [];
  for (const r of L.regions) {
    const entry = { r, shapes: r.shapes.map((s) => ({ s, b: pad(shapeBounds(s), 40) })) };
    (r.dock ? docks : walk).push(entry);
  }
  const W = L.waterY;
  const seed = L.noise?.seed ?? 7;
  const paths = L.paths.map((p) => ({ ...p, b: pad(boundsOf(p.points), p.width + 4) }));
  const channels = (L.channels ?? []).map((c) => ({ ...c, b: pad(boundsOf(c.points), c.width + 4) }));

  /** Signed distance to the walkable union and the region it belongs to (nearest when outside). */
  function nearest(x, z) {
    let d = Infinity, reg = null;
    for (const e of walk) {
      for (const { s, b } of e.shapes) {
        if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
        const v = sdShape(x, z, s);
        if (v < d) { d = v; reg = e.r; }
      }
    }
    return { d, reg };
  }
  function inDock(x, z) { return docks.some((e) => e.shapes.some(({ s }) => sdShape(x, z, s) <= 0.4)); }

  function features(x, z) {
    let h = 0;
    for (const f of L.features) {
      let v = 0;
      if (f.kind === 'hill' || f.kind === 'basin') {
        const t = 1 - Math.hypot(x - f.cx, z - f.cz) / f.radius_m;
        if (t > 0) v = f.height_m * (f.falloff === 'linear' ? t : t * t * (3 - 2 * t));
      } else if (f.kind === 'ridge') {
        const t = 1 - distPolyline(x, z, [[f.ax, f.az], [f.bx, f.bz]]) / (f.width_m / 2 + 4);
        if (t > 0) v = f.height_m * smoothstep(0, 1, t);
      } else if (f.kind === 'plateau') {
        const sd = sdShape(x, z, { polygon: f.polygon });
        v = f.height_m * (1 - smoothstep(-0.5, 3, sd));
      } else if (f.kind === 'slope') {
        const ex = f.bx - f.ax, ez = f.bz - f.az, l2 = ex * ex + ez * ez || 1;
        const t = ((x - f.ax) * ex + (z - f.az) * ez) / l2;
        if (t >= 0 && t <= 1 && distPolyline(x, z, [[f.ax, f.az], [f.bx, f.bz]]) < 18) v = f.from_height_m + (f.to_height_m - f.from_height_m) * t;
      }
      h = v < 0 ? h + v : Math.max(h, v);
    }
    return h;
  }
  const amp = L.noise?.amp ?? 0, nscale = L.noise?.scale ?? 14;
  function regionSurfaceHeight(reg, x, z) {
    if (!reg || reg.legacy) return 0;
    return reg.height + features(x, z) + amp * (fbm(x / nscale, z / nscale, seed) - 0.5) * 2;
  }

  /** Terrain height (m). */
  function height(x, z) {
    const { d, reg } = nearest(x, z);
    let h;
    if (d <= 0 && !inDock(x, z)) {
      h = reg.legacy ? -0.035 * fbm(x * 0.35, z * 0.35, seed + 3) - (reg.surface === 'shallow' ? 0.02 : 0) : regionSurfaceHeight(reg, x, z);
    } else {
      const dd = Math.max(0, d);
      const edgeH = regionSurfaceHeight(reg, x, z);
      const n = vnoise(x * 0.07, z * 0.07, seed + 11);
      const bankW = 1.2 + 5.5 * n;
      const bankH = 0.05 + 0.28 * vnoise(x * 0.13, z * 0.13, seed + 13);
      const shelf = edgeH + bankH * smoothstep(0, 0.9, dd);
      const bottom = W - 0.85 - 0.5 * vnoise(x * 0.05, z * 0.05, seed + 17);
      h = shelf + (bottom - shelf) * smoothstep(bankW, bankW + 5 + 5 * n, dd);
      if (inDock(x, z)) h = Math.min(h, W - 0.6);
      // Low mounds / reed islands well away from the play space.
      const m = fbm(x * 0.022, z * 0.022, seed + 23);
      const far = smoothstep(14, 30, dd);
      if (m > 0.53 && far > 0) h = Math.max(h, bottom + (Math.min(0.45, (m - 0.53) * 4) * 4.2 + (W + 0.35 - bottom)) * far * smoothstep(0.53, 0.6, m));
      if (!reg?.legacy) h = Math.max(h, edgeH > 0.6 ? features(x, z) + bottom * 0.2 : -Infinity);
    }
    // Carves.
    for (const s of L.shallow) {
      const sd = sdRect(x, z, s);
      if (sd < 1.2) h = Math.min(h, -0.07 * (1 - smoothstep(-1.5, 1.2, sd)) + (sd > 0 ? h : 0) * smoothstep(-1.5, 1.2, sd));
    }
    for (const p of L.mudPools) {
      const t = Math.hypot(x - p.cx, z - p.cz) / p.r;
      if (t < 1.25) h = Math.min(h, -0.08 * (1 - smoothstep(0.7, 1.25, t)));
    }
    for (const v of L.ditches) {
      const dl = distPolyline(x, z, [[v.ax, v.az], [v.bx, v.bz]]);
      if (dl < v.hw + 0.5) h = Math.min(h, -0.32 * (1 - smoothstep(v.hw * 0.4, v.hw + 0.5, dl)));
    }
    for (const c of channels) {
      if (x < c.b.x0 || x > c.b.x1 || z < c.b.z0 || z > c.b.z1) continue;
      const dl = distPolyline(x, z, c.points);
      if (dl < c.width / 2 + 2) h = Math.min(h, h + (W - c.depth * 0.8 - h) * (1 - smoothstep(c.width * 0.3, c.width / 2 + 2, dl)));
    }
    return h;
  }

  /** Layer weights [wet_mud, grass, path, dry_mud, bank] (sum 1) and wetness 0..1 at (x, z, h). */
  function surface(x, z, h = height(x, z), out = new Float32Array(6)) {
    const { d, reg } = nearest(x, z);
    const n = fbm(x * 0.09, z * 0.09, seed + 31), n2 = vnoise(x * 0.31, z * 0.31, seed + 37);
    let w;
    if (d <= 0 && !inDock(x, z)) {
      w = (SURFACE_SPLAT[reg.surface] ?? SURFACE_SPLAT.ground).slice();
      w[1] *= 0.35 + 1.3 * n; w[4] *= 1.5 - n; w[3] *= 0.6 + 0.8 * n2; w[0] *= 0.6 + 0.8 * (1 - n);
      const t = smoothstep(-3, 0, d) * 0.55;
      for (let i = 0; i < 5; i++) w[i] += (BANK[i] - w[i]) * t;
    } else {
      w = BANK.slice();
      if (h > W + 0.6) { w = [0.05, 0.6 + 0.3 * n, 0.0, 0.05, 0.3]; }
      if (h < W + 0.1) { w[0] += 0.6; w[1] *= 0.3; }
    }
    // Worn paths.
    if (d < 1.5) {
      let pd = Infinity, pw = 2;
      for (const p of paths) {
        if (x < p.b.x0 || x > p.b.x1 || z < p.b.z0 || z > p.b.z1) continue;
        const v = distPolyline(x, z, p.points) / p.width;
        if (v < pd) { pd = v; pw = p.width; }
      }
      if (pd < 1) {
        const k = (1 - smoothstep(0.22 + 0.12 * n2, 0.55 + 0.1 * n, pd)) * 0.92;
        for (let i = 0; i < 5; i++) w[i] += (PATH[i] - w[i]) * k;
        if (pw > 0) w[0] += 0.1 * k * (1 - n); // puddles on the main tracks
      }
    }
    let wet = 1 - smoothstep(W + 0.04, W + 0.5, h);
    for (const s of L.shallow) { const sd = sdRect(x, z, s); if (sd < 1.6) { const k = 1 - smoothstep(-0.8, 1.6, sd); w[0] += k * 1.2; wet = Math.max(wet, k); } }
    for (const p of L.mudPools) { const t = Math.hypot(x - p.cx, z - p.cz) / p.r; if (t < 1.6) { const k = 1 - smoothstep(0.8, 1.6, t); w[0] += k * 2; wet = Math.max(wet, k); } }
    if (reg?.surface === 'shallow' && d <= 0) wet = Math.max(wet, 0.35 + 0.4 * n);
    let s = 0;
    for (let i = 0; i < 5; i++) { w[i] = Math.max(0, w[i]); s += w[i]; }
    for (let i = 0; i < 5; i++) out[i] = w[i] / (s || 1);
    out[5] = Math.max(0, Math.min(1, wet));
    return out;
  }

  /** Signed distance to walkable ground (negative inside), docks excluded. */
  function walkDist(x, z) { return nearest(x, z).d; }
  function regionAt(x, z) { const n = nearest(x, z); return n.d <= 0 ? n.reg : null; }
  return { height, surface, walkDist, regionAt, inDock, waterY: W, layout: L };
}

function sdRect(x, z, r) {
  const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, hx = (r.x1 - r.x0) / 2, hz = (r.z1 - r.z0) / 2;
  const dx = Math.abs(x - cx) - hx, dz = Math.abs(z - cz) - hz;
  return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0);
}
function pad(b, m) { return { x0: b.x0 - m, x1: b.x1 + m, z0: b.z0 - m, z1: b.z1 + m }; }
function boundsOf(pts) {
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}
