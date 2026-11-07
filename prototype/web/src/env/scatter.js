// env/scatter.js - deterministic set dressing from the layout + field (pure, unit tested): reed and
// grass clumps, CC0 rocks / ferns / shrubs / weeds / branches / stumps. Gameplay readability rules
// (ART_DIRECTION §3.2, §7): open play space stays readable (sparse reeds inside walkable areas, none on
// worn tracks, none near interactables or spawns), dense reed walls along banks and around the arena.
import { rng32, fbm, vnoise, distPolyline, smoothstep } from './layout.js';

const REED_TINTS = [[1.0, 1.0, 1.0], [0.92, 0.95, 0.86], [1.05, 1.0, 0.9], [0.85, 0.86, 0.78]];

/** grids: patch grids from terrain.buildPatchGrid (heightAt / distAt / regAt lookups); F: field (inDock). */
export function scatter(L, F, grids, { density = 1 } = {}) {
  const R = rng32((L.noise?.seed ?? 7) * 31 + 5);
  const W = L.waterY;
  const out = { reeds: [], grass: [], rocks: [], ferns: [], shrubs: [], weeds: [], branches: [], stumps: [] };
  const keep = L.keepOut;
  const mainPaths = L.paths;
  const free = (x, z, pad = 0) => {
    for (const k of keep) if (Math.abs(k.x - x) < k.r + pad && Math.abs(k.z - z) < k.r + pad && Math.hypot(k.x - x, k.z - z) < k.r + pad) return false;
    return true;
  };
  const onPath = (x, z, pad = 0) => {
    for (const p of mainPaths) if (distPolyline(x, z, p.points) < p.width * 0.5 + pad) return true;
    return false;
  };
  const arena = L.regions.find((r) => r.id === 'z_dau_truong')?.shapes[0]?.circle;
  const blockers = L.blockers ?? [];

  for (const G of grids) {
    const P = G.patch;
    const step = 1.15;
    for (let z = P.z0 + 1; z < P.z1 - 1; z += step) {
      for (let x = P.x0 + 1; x < P.x1 - 1; x += step) {
        const jx = x + (R() - 0.5) * step * 0.9, jz = z + (R() - 0.5) * step * 0.9;
        const r1 = R();
        const d = G.distAt(jx, jz);
        if (d > 34 && r1 > 0.25) continue; // far water: only islands get looked at (thinned)
        const h = G.heightAt(jx, jz);
        if (h < W - 0.5 || (d < 12 && F.inDock(jx, jz))) continue;
        const reg = d <= 0 ? G.regAt(jx, jz) : null;
        const n = fbm(jx * 0.06, jz * 0.06, 91), n2 = vnoise(jx * 0.2, jz * 0.2, 93);
        // ---------------- reeds
        let pr = 0;
        if (reg) {
          const s = reg.surface;
          pr = s === 'reed' ? 0.12 * smoothstep(0.45, 0.6, n) + 0.03 : s === 'reed_dense' ? 0.55 : s === 'shallow' ? (d > -4 ? 0.35 : 0.02) : s === 'ground' || s === 'grass' || s === 'silt' ? (d > -1.6 ? 0.25 : 0.0) : 0;
          if (s === 'mud' || s === 'path' || s === 'dock' || s === 'ash_ground') pr = d > -1.0 ? 0.15 : 0;
        } else {
          pr = d < 12 ? 0.8 * smoothstep(0.25, 0.45, n + 0.25 * n2) + 0.1 : h > W + 0.05 ? 0.55 * smoothstep(0.3, 0.5, n) : 0.04;
          if (arena) { const da = Math.hypot(jx - arena.cx, jz - arena.cz) - arena.r; if (da > 0.3 && da < 7) pr = Math.max(pr, 0.95); }
          if (h < W - 0.3) pr *= 0.35; // standing in deeper water: sparse
        }
        for (const b of blockers) if (distPolyline(jx, jz, b.points) < b.hw + 0.6) pr = 0.95;
        if (pr > 0 && R() < pr * density && free(jx, jz) && !onPath(jx, jz, reg ? 0.8 : -0.5)) {
          const dry = n2 > 0.55 || (reg && reg.surface === 'reed' && n2 > 0.35);
          const var_ = dry ? 2 + (R() < 0.5 ? 0 : 1) : R() < 0.5 ? 0 : 1;
          const hh = (reg ? 2.2 : 2.6) + R() * 0.9;
          out.reeds.push({ x: jx, y: h - 0.05, z: jz, rot: R() * Math.PI, w: hh * 0.25 * (0.9 + R() * 0.35), h: hh, var: var_, tint: REED_TINTS[Math.floor(R() * 4)].map((c) => c * (0.88 + R() * 0.2)), tiltX: (R() - 0.5) * 0.12, tiltZ: (R() - 0.5) * 0.12 });
        }
        // ---------------- grass tufts (land only)
        if (h > W + 0.04 && d < 8) {
          let pg = reg ? ({ ground: 0.5, grass: 0.8, reed: 0.45, silt: 0.2, leaf_litter: 0.3, shallow: 0.15, mud: 0.05, ash_ground: 0.08 }[reg.surface] ?? 0.1) : 0.55;
          pg *= smoothstep(0.3, 0.55, n * 0.6 + n2 * 0.6);
          if (R() < pg * density && free(jx, jz, -0.8) && !onPath(jx, jz, -0.3)) {
            const s = 0.55 + R() * 0.55;
            out.grass.push({ x: jx, y: h - 0.02, z: jz, rot: R() * Math.PI, w: s, h: s, var: Math.floor(R() * 4), tint: [0.9 + R() * 0.2, 0.9 + R() * 0.2, 0.85 + R() * 0.15] });
          }
        }
        // ---------------- small CC0 props
        const r2 = R();
        if (h > W + 0.02 && d > -3 && d < 7 && r2 < 0.012 * density && free(jx, jz, 0.5)) out.ferns.push({ x: jx, y: h, z: jz, rot: R() * 6.28, s: 1.2 + R() * 0.9, var: Math.floor(R() * 4) });
        else if (h > W + 0.05 && d > -2 && d < 9 && r2 < 0.02 * density && free(jx, jz, 0.5)) out.shrubs.push({ x: jx, y: h - 0.02, z: jz, rot: R() * 6.28, s: 2.4 + R() * 1.6, var: Math.floor(R() * 4) });
        else if (h > W + 0.02 && d < 1 && r2 < 0.034 * density && free(jx, jz, -0.5) && !onPath(jx, jz)) out.weeds.push({ x: jx, y: h, z: jz, rot: R() * 6.28, s: 2.0 + R() * 1.6, var: Math.floor(R() * 5) });
        else if (h > W && d > -6 && d < 6 && r2 < 0.04 && r2 > 0.0385 && free(jx, jz, 1)) out.branches.push({ x: jx, y: h, z: jz, rot: R() * 6.28, s: 1 + R() * 0.6, var: Math.floor(R() * 3) });
        else if (h > W + 0.1 && d > 2 && d < 14 && r2 > 0.9975 && free(jx, jz, 2)) out.rocks.push({ x: jx, y: h, z: jz, rot: R() * 6.28, s: 0.35 + R() * 0.45, var: Math.floor(R() * 6) });
        else if (h > W + 0.1 && d > 1 && d < 10 && r2 > 0.9965 && r2 <= 0.9975 && free(jx, jz, 2)) out.stumps.push({ x: jx, y: h - 0.05, z: jz, rot: R() * 6.28, s: 0.7 + R() * 0.5, var: 0 });
      }
    }
  }
  return out;
}
