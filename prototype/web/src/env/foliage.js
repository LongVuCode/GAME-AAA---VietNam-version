// env/foliage.js - reed and grass alpha cards (atlases rendered in Blender, tools/blender) drawn as
// instanced 3-plane clumps, chunked on a 24 m grid. Per chunk: frustum culling (instance bounds),
// distance culling and density LOD (instances are pre-shuffled, so drawing the first N of a chunk is
// an even thinning), shadows only from chunks near the player (High). Vertex shader: gusts of wind
// (same rolling-gust model as the old graybox reeds), reeds part around the player, bent normals so
// cards light softly; darker at the base (cheap AO).
import * as THREE from 'three';

const CELL = 24;
export const FOLIAGE_QUALITY = {
  high: { reedDist: 120, grassDist: 55, reedFull: 45, grassFull: 22, density: 1, shadowDist: 26, a2c: true },
  low: { reedDist: 60, grassDist: 18, reedFull: 18, grassFull: 8, density: 0.4, shadowDist: 0, a2c: false },
};

function clumpGeometry(width, height, planes = 3) {
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [], nor = [], idx = [];
  for (let k = 0; k < planes; k++) {
    const a = (k / planes) * Math.PI, c = Math.cos(a), s = Math.sin(a);
    const base = pos.length / 3;
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      const x = (u - 0.5) * width;
      pos.push(x * c, v * height, x * s); uv.push(u, v); nor.push(-s, 0, c);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

const VERT_PARS = /* glsl */`
uniform float uTime; uniform float uWind; uniform vec2 uWindDir; uniform vec3 uPlayer; uniform float uCols; uniform float uStiff;
attribute float aVar;
varying float vFH;`;
const VERT_BEGIN = /* glsl */`
#include <begin_vertex>
float fh = uv.y; vFH = fh;
#ifdef USE_INSTANCING
  vec2 base = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
#else
  vec2 base = vec2(0.0);
#endif
float ph = dot(base, vec2(0.37, 0.21));
float gust = sin(dot(base, uWindDir) * 0.16 - uTime * 1.5) * 0.5 + 0.5;
float sway = uWind * (0.05 + 0.2 * gust * gust) + sin(uTime * 2.2 + ph) * 0.03 * (0.3 + uWind);
float kh = pow(fh, 1.6) * uStiff;
// Wind is applied in world units after the instance transform: convert through the instance scale.
#ifdef USE_INSTANCING
  mat2 toLocal = inverse(mat2(instanceMatrix[0].xz, instanceMatrix[2].xz)); // world xz metres -> card space
  transformed.xz += toLocal * uWindDir * sway * kh * 1.2;
  // Part around the player, strongest at the top.
  vec2 dp = base - uPlayer.xz; float dl = length(dp);
  float push = (1.0 - smoothstep(0.4, 1.5, dl)) * kh * 0.6;
  vec2 lp = toLocal * (dl > 0.001 ? dp / dl : vec2(0.0));
  transformed.xz += lp * push;
  transformed.y -= push * 0.25 / max(0.001, length(instanceMatrix[1].xyz));
#endif`;
const UV_VERT = /* glsl */`
#include <uv_vertex>
#ifdef USE_MAP
  vMapUv.x = (aVar + clamp(uv.x, 0.004, 0.996)) / uCols;
#endif`;

export function foliageMaterial(tex, cols, { stiff = 1, tint = 0xffffff } = {}) {
  const u = { uTime: { value: 0 }, uWind: { value: 1 }, uWindDir: { value: new THREE.Vector2(0.8, 0.6).normalize() }, uPlayer: { value: new THREE.Vector3(1e5, 0, 1e5) }, uCols: { value: cols }, uStiff: { value: stiff } };
  const patch = (sh, depth) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_PARS}`)
      .replace('#include <uv_vertex>', UV_VERT)
      .replace('#include <begin_vertex>', VERT_BEGIN);
    if (!depth) {
      sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), 0.65));');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vFH;')
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);') // no back-face flip: bent normals stay up
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.42, 1.08, smoothstep(0.0, 0.75, vFH));');
    } else {
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFH;');
    }
  };
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.85, metalness: 0, color: tint });
  mat.onBeforeCompile = (sh) => patch(sh, false);
  mat.customProgramCacheKey = () => `env_foliage_${cols}`;
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.42, side: THREE.DoubleSide });
  depth.onBeforeCompile = (sh) => patch(sh, true);
  depth.customProgramCacheKey = () => `env_foliage_depth_${cols}`;
  mat.userData.foliageUniforms = u;
  return { mat, depth, u };
}

/**
 * items: [{x, y, z, rot, w, h, var, tint (0..1 scale)}]. kind: 'reed' | 'grass'.
 * Returns { group, chunks, setQuality(q), update(camera, player) }.
 */
export function buildFoliage(kind, items, tex, cols, { width = 1, height = 1 } = {}) {
  const geo = clumpGeometry(width, height, kind === 'reed' ? 3 : 2);
  const { mat, depth, u } = foliageMaterial(tex, cols, { stiff: kind === 'reed' ? 1 : 0.5 });
  const cells = new Map();
  for (const it of items) {
    const key = `${Math.floor(it.x / CELL)},${Math.floor(it.z / CELL)}`;
    (cells.get(key) ?? cells.set(key, []).get(key)).push(it);
  }
  const group = new THREE.Group(); group.name = `foliage_${kind}`;
  const chunks = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  for (const [key, list] of cells) {
    // Deterministic shuffle so any prefix is an even subset (density LOD).
    let seed = list.length * 7919 + key.length;
    for (let i = list.length - 1; i > 0; i--) { seed = (seed * 16807) % 2147483647; const j = seed % (i + 1); [list[i], list[j]] = [list[j], list[i]]; }
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    const vars = new Float32Array(list.length);
    list.forEach((it, i) => {
      e.set(it.tiltX ?? 0, it.rot, it.tiltZ ?? 0); q.setFromEuler(e);
      s.set(it.w, it.h, it.w); p.set(it.x, it.y, it.z);
      mesh.setMatrixAt(i, m4.compose(p, q, s));
      c.setRGB(it.tint[0], it.tint[1], it.tint[2]); mesh.setColorAt(i, c);
      vars[i] = it.var;
    });
    mesh.geometry = geo.clone();
    mesh.geometry.setAttribute('aVar', new THREE.InstancedBufferAttribute(vars, 1));
    mesh.customDepthMaterial = depth;
    mesh.computeBoundingSphere();
    mesh.receiveShadow = true; mesh.castShadow = false;
    mesh.userData.fxOwned = true; mesh.userData.fxShadowTagged = true;
    const [cx, cz] = key.split(',').map(Number);
    chunks.push({ mesh, n: list.length, cx: (cx + 0.5) * CELL, cz: (cz + 0.5) * CELL });
    group.add(mesh);
  }
  let Q = FOLIAGE_QUALITY.high;
  const far = kind === 'reed' ? 'reedDist' : 'grassDist', full = kind === 'reed' ? 'reedFull' : 'grassFull';
  return {
    group, chunks, uniforms: u, material: mat,
    count() { return chunks.reduce((a, ch) => a + ch.n, 0); },
    drawn() { return chunks.reduce((a, ch) => a + (ch.mesh.visible ? ch.mesh.count : 0), 0); },
    setQuality(qq) { Q = FOLIAGE_QUALITY[qq] ?? FOLIAGE_QUALITY.high; mat.alphaToCoverage = !!Q.a2c; mat.needsUpdate = true; },
    update(camera) {
      const cx = camera.position.x, cz = camera.position.z;
      for (const ch of chunks) {
        const d = Math.max(0, Math.hypot(ch.cx - cx, ch.cz - cz) - CELL * 0.7);
        if (d > Q[far]) { ch.mesh.visible = false; continue; }
        ch.mesh.visible = true;
        const k = d <= Q[full] ? 1 : Math.max(0.12, 1 - (d - Q[full]) / (Q[far] - Q[full]));
        ch.mesh.count = Math.max(1, Math.round(ch.n * k * Q.density));
        ch.mesh.castShadow = d < Q.shadowDist;
      }
    },
  };
}
