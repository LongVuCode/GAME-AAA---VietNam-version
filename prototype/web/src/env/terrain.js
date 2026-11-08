// env/terrain.js - heightmap terrain from the env field: 64 m chunks with two LOD meshes (1 m / 4 m
// cells, skirts hide LOD cracks) and a PBR splat material (MeshStandardMaterial patched): 5 CC0 layers
// in texture arrays (albedo / normal+roughness / height+cavity), height-based blending, slope and
// wetness (wet mud darkens and turns glossy near the water line), macro variation against tiling.
// Low quality (FX_LOW): no normal maps, no height blending, shorter LOD distance.
import * as THREE from 'three';
import { LAYERS } from './field.js';

export const TERRAIN_LAYERS = LAYERS; // order = layer index in the texture arrays (tools/assets/prepare_textures.py)
// Tiling in metres per texture repeat, per layer; fallback colours before the textures arrive.
const TILE_M = [3.2, 2.6, 3.0, 3.6, 2.8];
const FALLBACK = [0x4b3d2d, 0x5f5f37, 0x776046, 0x7a684f, 0x59513a]; // mean albedo of each layer (terrain_albedo.jpg): Low preset + before load
const CHUNK = 64;
const LAYER_LIN = FALLBACK.map((h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; }); // linear RGB

export function buildPatchGrid(field, patch) {
  const nx = patch.x1 - patch.x0 + 1, nz = patch.z1 - patch.z0 + 1;
  const h = new Float32Array(nx * nz), surf = new Float32Array(nx * nz * 6), dist = new Float32Array(nx * nz), reg = new Array(nx * nz), tmp = new Float32Array(6);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = patch.x0 + i, z = patch.z0 + j, k = j * nx + i;
    const r = field.sample(x, z, tmp);
    h[k] = r.h; dist[k] = r.d; reg[k] = r.reg; surf.set(tmp, k * 6);
  }
  return { patch, nx, nz, h, surf, dist, reg, ...gridLookups(patch, nx, nz, h, dist, reg) };
}

/** Fast lookups on a patch grid (bilinear height, nearest distance/region); null outside the patch. */
export function gridLookups(patch, nx, nz, h, dist, reg) {
  const inside = (x, z) => x >= patch.x0 && x <= patch.x1 && z >= patch.z0 && z <= patch.z1;
  return {
    contains: inside,
    heightAt(x, z) {
      const fx = Math.min(nx - 1.001, Math.max(0, x - patch.x0)), fz = Math.min(nz - 1.001, Math.max(0, z - patch.z0));
      const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * nx + i;
      return (h[k] * (1 - u) + h[k + 1] * u) * (1 - v) + (h[k + nx] * (1 - u) + h[k + nx + 1] * u) * v;
    },
    distAt(x, z) { const k = Math.round(Math.min(nz - 1, Math.max(0, z - patch.z0))) * nx + Math.round(Math.min(nx - 1, Math.max(0, x - patch.x0))); return dist[k]; },
    regAt(x, z) { const k = Math.round(Math.min(nz - 1, Math.max(0, z - patch.z0))) * nx + Math.round(Math.min(nx - 1, Math.max(0, x - patch.x0))); return reg[k]; },
  };
}

function chunkGeometry(G, ci, cj, step) {
  const { nx, nz, h, surf, patch } = G;
  const i0 = ci * CHUNK, j0 = cj * CHUNK;
  const i1 = Math.min(nx - 1, i0 + CHUNK), j1 = Math.min(nz - 1, j0 + CHUNK);
  const cols = Math.floor((i1 - i0) / step) + 1, rows = Math.floor((j1 - j0) / step) + 1;
  const ring = 2 * (cols + rows) - 4; // skirt vertices
  const nv = cols * rows + ring;
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), spl = new Float32Array(nv * 4), wet = new Float32Array(nv), col = new Float32Array(nv * 3);
  const H = (i, j) => h[Math.min(nz - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))];
  const put = (v, i, j, dy) => {
    const k = j * nx + i;
    pos[v * 3] = patch.x0 + i; pos[v * 3 + 1] = h[k] + dy; pos[v * 3 + 2] = patch.z0 + j;
    const dx = H(i + 1, j) - H(i - 1, j), dz = H(i, j + 1) - H(i, j - 1);
    const l = Math.hypot(dx, 2, dz); nor[v * 3] = -dx / l; nor[v * 3 + 1] = 2 / l; nor[v * 3 + 2] = -dz / l;
    spl[v * 4] = surf[k * 6 + 1]; spl[v * 4 + 1] = surf[k * 6 + 2]; spl[v * 4 + 2] = surf[k * 6 + 3]; spl[v * 4 + 3] = surf[k * 6 + 4];
    wet[v] = surf[k * 6 + 5];
    // Low preset colour (Lambert, no textures): splat-weighted layer means, darker when wet / steep.
    const sl = 1 - 2 / l, dark = (1 - 0.48 * wet[v]) * (1 - 0.2 * Math.min(1, sl * 4)) * (0.9 + 0.2 * ((i * 7 + j * 13) % 5) / 5);
    for (let c = 0; c < 3; c++) col[v * 3 + c] = (LAYER_LIN[0][c] * surf[k * 6] + LAYER_LIN[1][c] * surf[k * 6 + 1] + LAYER_LIN[2][c] * surf[k * 6 + 2] + LAYER_LIN[3][c] * surf[k * 6 + 3] + LAYER_LIN[4][c] * surf[k * 6 + 4]) * dark;
  };
  const I = (c) => Math.min(i1, i0 + c * step), J = (r) => Math.min(j1, j0 + r * step);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) put(r * cols + c, I(c), J(r), 0);
  const idx = [];
  for (let r = 0; r + 1 < rows; r++) for (let c = 0; c + 1 < cols; c++) {
    const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  // Skirt: border loop duplicated 0.6 m lower, stitched to the border.
  const border = [];
  for (let c = 0; c < cols; c++) border.push([c, 0]);
  for (let r = 1; r < rows; r++) border.push([cols - 1, r]);
  for (let c = cols - 2; c >= 0; c--) border.push([c, rows - 1]);
  for (let r = rows - 2; r >= 1; r--) border.push([0, r]);
  let v = cols * rows;
  const first = v;
  for (const [c, r] of border) put(v++, I(c), J(r), -0.6);
  for (let k = 0; k < border.length; k++) {
    const [c0, r0] = border[k], [c1, r1] = border[(k + 1) % border.length];
    const a = r0 * cols + c0, b = r1 * cols + c1, a2 = first + k, b2 = first + ((k + 1) % border.length);
    idx.push(a, b, a2, b, b2, a2, a, a2, b, b, a2, b2); // both windings (skirt seen from either side)
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('aSplat', new THREE.BufferAttribute(spl, 4));
  g.setAttribute('aWet', new THREE.BufferAttribute(wet, 1));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

/** Low preset terrain material: per-vertex colour (chunkGeometry 'color'), Lambert, no textures. */
export function terrainMaterialLow() { return new THREE.MeshLambertMaterial({ vertexColors: true }); }

/** One patch -> Group of THREE.LOD chunks. */
export function buildTerrainMeshes(G, material) {
  const group = new THREE.Group(); group.name = `terrain_${G.patch.id}`;
  const lods = [];
  const ncx = Math.ceil((G.nx - 1) / CHUNK), ncz = Math.ceil((G.nz - 1) / CHUNK);
  for (let cj = 0; cj < ncz; cj++) for (let ci = 0; ci < ncx; ci++) {
    const lod = new THREE.LOD();
    // LOD distance is measured to the LOD object's position: put it at the chunk centre (geometry is
    // shifted to local space), otherwise every chunk switches by its distance to the world origin.
    const cx = G.patch.x0 + Math.min(G.nx - 1, ci * CHUNK + CHUNK / 2), cz = G.patch.z0 + Math.min(G.nz - 1, cj * CHUNK + CHUNK / 2);
    const gHi = chunkGeometry(G, ci, cj, 1), gLo = chunkGeometry(G, ci, cj, 4);
    for (const g of [gHi, gLo]) { g.translate(-cx, 0, -cz); g.computeBoundingSphere(); }
    lod.position.set(cx, 0, cz);
    const hi = new THREE.Mesh(gHi, material);
    const lo = new THREE.Mesh(gLo, material);
    for (const m of [hi, lo]) { m.receiveShadow = true; m.castShadow = false; m.userData.fxShadowTagged = true; m.userData.fxOwned = true; }
    lod.addLevel(hi, 0); lod.addLevel(lo, 80); lod.addLevel(new THREE.Object3D(), 320); // beyond the fog: nothing
    lod.userData.fxOwned = true;
    group.add(lod); lods.push(lod);
  }
  return { group, lods };
}

/** Heights as a half-float texture (water depth). u = (x - x0 + 0.5) / nx. */
export function heightTexture(G) {
  const d = new Uint16Array(G.h.length);
  for (let i = 0; i < d.length; i++) d[i] = THREE.DataUtils.toHalfFloat(G.h[i]);
  const t = new THREE.DataTexture(d, G.nx, G.nz, THREE.RedFormat, THREE.HalfFloatType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

const TERRAIN_VERT_PARS = /* glsl */`
attribute vec4 aSplat; attribute float aWet;
varying vec4 vSplat; varying float vWet; varying vec3 vTW; varying vec3 vTN;`;
const TERRAIN_FRAG_PARS = /* glsl */`
uniform sampler2DArray tAlb; uniform sampler2DArray tNrm; uniform sampler2DArray tHgt;
uniform float uTexReady; uniform float uTile[5]; uniform vec3 uFallback[5]; uniform float uWaterY;
varying vec4 vSplat; varying float vWet; varying vec3 vTW; varying vec3 vTN;
float tHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float tNoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(tHash(i), tHash(i + vec2(1, 0)), u.x), mix(tHash(i + vec2(0, 1)), tHash(i + vec2(1, 1)), u.x), u.y); }
vec3 tN = vec3(0.0, 0.0, 1.0); float tRough = 0.9; float tCav = 1.0;`;
const TERRAIN_MAP = /* glsl */`
{
  float w[5];
  w[1] = vSplat.x; w[2] = vSplat.y; w[3] = vSplat.z; w[4] = vSplat.w;
  w[0] = max(0.0, 1.0 - (vSplat.x + vSplat.y + vSplat.z + vSplat.w));
  // Slope: grass and worn path give way to bare earth / leaf-strewn bank on steep faces (knolls, banks, kiln floor).
  float slope = 1.0 - clamp(normalize(vTN).y, 0.0, 1.0);
  float sk = smoothstep(0.06, 0.26, slope);
  w[1] *= 1.0 - 0.85 * sk; w[2] *= 1.0 - 0.7 * sk; w[3] += 0.55 * sk; w[4] += 0.35 * sk; w[0] *= 1.0 - 0.5 * sk;
  vec2 p = vec2(vTW.x, -vTW.z);
  vec2 gx = dFdx(p), gy = dFdy(p); // explicit gradients: sampling happens in per-pixel branches
  vec3 alb = vec3(0.0); vec4 nr = vec4(0.0); float cav = 0.0; float sumw = 0.0;
#ifdef FX_LOW
  // Low: palette colour of each layer blended by the splat weights (no texture fetch, no loop, one noise
  // octave). The textured 5-layer blend is fill-bound on weak GPUs / software GL (~1.7 s per frame on
  // SwiftShader; this path costs about as much as a plain MeshStandardMaterial).
  float macro = tNoise(p * 0.06);
  float ws = w[0] + w[1] + w[2] + w[3] + w[4];
  alb = (uFallback[0] * w[0] + uFallback[1] * w[1] + uFallback[2] * w[2] + uFallback[3] * w[3] + uFallback[4] * w[4]) / max(ws, 1e-4);
  nr = vec4(0.5, 0.5, 0.9, 1.0); cav = 0.5; sumw = 1.0;
#else
  float macro = tNoise(p * 0.045) * 0.6 + tNoise(p * 0.17) * 0.4;
  if (uTexReady > 0.5) {
    float hw[5]; float hmax = -10.0;
    for (int i = 0; i < 5; i++) {
      hw[i] = 0.0;
      if (w[i] > 0.004) {
        #ifdef FX_LOW
          hw[i] = w[i];
        #else
          float hh = textureGrad(tHgt, vec3(p / uTile[i], float(i)), gx / uTile[i], gy / uTile[i]).r;
          hw[i] = w[i] + hh * 0.55 * w[i] + hh * 0.18;
        #endif
        hmax = max(hmax, hw[i]);
      }
    }
    for (int i = 0; i < 5; i++) {
      if (hw[i] <= 0.0) continue;
      #ifdef FX_LOW
        float b = hw[i];
      #else
        float b = max(hw[i] - (hmax - 0.22), 0.0) * step(0.004, w[i]);
      #endif
      if (b <= 0.0) continue;
      vec3 uvw = vec3(p / uTile[i], float(i));
      alb += textureGrad(tAlb, uvw, gx / uTile[i], gy / uTile[i]).rgb * b;
      #ifndef FX_LOW
        nr += textureGrad(tNrm, uvw, gx / uTile[i], gy / uTile[i]) * b;
        cav += textureGrad(tHgt, uvw, gx / uTile[i], gy / uTile[i]).g * b;
      #else
        nr += vec4(0.5, 0.5, textureGrad(tNrm, uvw, gx / uTile[i], gy / uTile[i]).b, 1.0) * b;
        cav += 0.5 * b;
      #endif
      sumw += b;
    }
    alb /= max(sumw, 1e-4); nr /= max(sumw, 1e-4); cav /= max(sumw, 1e-4);
  } else {
    for (int i = 0; i < 5; i++) alb += uFallback[i] * w[i];
    nr = vec4(0.5, 0.5, 0.85, 1.0); cav = 0.5; sumw = 1.0;
  }
#endif
  alb *= 0.82 + 0.32 * macro;
  float wet = clamp(vWet, 0.0, 1.0);
  float under = smoothstep(uWaterY + 0.02, uWaterY - 0.25, vTW.y);
  alb *= mix(1.0, 0.52, wet) * mix(1.0, 0.7, under);
  diffuseColor.rgb *= alb;
  tRough = mix(nr.b, 0.36, wet * 0.75); // wet mud: satin, not a mirror (grazing views turned it sky-white)
  tN = vec3((nr.xy * 2.0 - 1.0) * (1.0 - 0.6 * wet), 1.0); tN.z = sqrt(max(0.05, 1.0 - dot(tN.xy, tN.xy)));
  tCav = mix(1.0, 0.45 + 1.1 * cav, 0.7);
}`;

export function terrainMaterial(waterY) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  const u = {
    tAlb: { value: null }, tNrm: { value: null }, tHgt: { value: null }, uTexReady: { value: 0 },
    uTile: { value: TILE_M.slice() }, uFallback: { value: FALLBACK.map((c) => new THREE.Color(c)) }, uWaterY: { value: waterY },
  };
  mat.userData.terrainUniforms = u;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${TERRAIN_VERT_PARS}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = aSplat; vWet = aWet; vTW = (modelMatrix * vec4(position, 1.0)).xyz; vTN = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${TERRAIN_FRAG_PARS}`)
      .replace('#include <map_fragment>', TERRAIN_MAP)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tRough;')
      .replace('#include <normal_fragment_maps>', `
        #ifndef FX_LOW
        { vec3 Nw = normalize(vTN); vec3 T = normalize(vec3(1.0, 0.0, 0.0) - Nw * Nw.x); vec3 B = normalize(cross(Nw, T));
          vec3 nW = normalize(T * tN.x + B * tN.y + Nw * tN.z);
          normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz); }
        #endif`)
      .replace('#include <aomap_fragment>', `{ float ambientOcclusion = clamp(tCav, 0.25, 1.15);
          reflectedLight.indirectDiffuse *= ambientOcclusion; reflectedLight.indirectSpecular *= ambientOcclusion * ambientOcclusion;
          reflectedLight.directDiffuse *= mix(1.0, ambientOcclusion, 0.5); }`);
  };
  mat.customProgramCacheKey = () => 'env_terrain_v1';
  mat.userData.fxQualityDefines = true;
  return mat;
}

/** Plugs the texture arrays into the material (after they load). */
export function setTerrainTextures(mat, { alb, nrm, hgt }) {
  const u = mat.userData.terrainUniforms;
  u.tAlb.value = alb; u.tNrm.value = nrm; u.tHgt.value = hgt; u.uTexReady.value = 1;
}
