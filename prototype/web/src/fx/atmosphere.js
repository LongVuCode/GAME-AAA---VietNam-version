// fx/atmosphere.js - lighting and atmosphere for the graybox (still primitives, better light):
// gradient sky dome with a low sun, exponential depth fog matched to the horizon, low warm sun +
// hemisphere fill, soft shadow map that follows the player (texel-snapped), shallow water with a
// cheap fake reflection (sky gradient + fresnel + sun glint + ripples), ground colour breakup,
// reeds that sway in rolling gusts (vertex shader on the instanced mesh) with pale plumes, and zone
// "moods" from docs/ART_DIRECTION.md §3 (marsh overcast, boss phase 1 slanted afternoon sun,
// phase 2 clouded/still/misty/desaturated, the pry with no wind, the release warming one step).
import * as THREE from 'three';

// Palette notes (sRGB hex): mist #D8DACB, marsh water #6A694D, mud #47392A, reeds #7C884E,
// marsh sky #A6ACA5, sun #F1C78A, boss sky #C7A27A, dry mud #6E5A42, mire #2F2820.
export const MOODS = {
  ben_say:  { zenith: 0x8ea3ad, horizon: 0xd8dacb, fog: 0xc6c8b8, density: 0.0105, sun: 0xf1c78a, sunI: 3.2, sky: 0xc9d4d2, ground: 0x5c4a35, hemiI: 1.15, wind: 1.0, glow: 0.45, exposure: 1.0 },
  dam_nong: { zenith: 0x8d9a9a, horizon: 0xa6aca5, fog: 0xa0a59c, density: 0.0135, sun: 0xe9d6b0, sunI: 1.9, sky: 0xbac6c4, ground: 0x4f4634, hemiI: 1.45, wind: 0.9, glow: 0.12, exposure: 1.05 },
  bai_lau:  { zenith: 0x93a19c, horizon: 0xc2bea4, fog: 0xb3b29c, density: 0.012, sun: 0xf0c88c, sunI: 2.7, sky: 0xc3cdc6, ground: 0x5a4c34, hemiI: 1.2, wind: 1.25, glow: 0.35, exposure: 1.0 },
  boss_p1:  { zenith: 0x8a959c, horizon: 0xc7a27a, fog: 0xb39b7e, density: 0.0095, sun: 0xffc27e, sunI: 3.6, sky: 0xbdc3c0, ground: 0x5a4632, hemiI: 0.95, wind: 0.8, glow: 0.65, exposure: 1.0 },
  boss_p2:  { zenith: 0x7f8788, horizon: 0x9c9c94, fog: 0x9a9b94, density: 0.02, sun: 0xcfc8b6, sunI: 1.1, sky: 0xb0b6b4, ground: 0x4a453c, hemiI: 1.35, wind: 0.08, glow: 0.04, exposure: 1.0 },
  pry:      { zenith: 0x7f8788, horizon: 0x9c9c94, fog: 0x9a9b94, density: 0.019, sun: 0xd8c8a8, sunI: 1.5, sky: 0xb0b6b4, ground: 0x4a453c, hemiI: 1.3, wind: 0.0, glow: 0.1, exposure: 1.0 },
  freed:    { zenith: 0x8ea0a8, horizon: 0xd2b48c, fog: 0xc0ab8c, density: 0.011, sun: 0xffcf8f, sunI: 3.2, sky: 0xc9d0cc, ground: 0x5e4a33, hemiI: 1.1, wind: 1.0, glow: 0.55, exposure: 1.04 },
  hub:      { zenith: 0x9aabb3, horizon: 0xd8dacb, fog: 0xd0d2c4, density: 0.0085, sun: 0xf1c78a, sunI: 3.2, sky: 0xcdd6d4, ground: 0x5c4a35, hemiI: 1.1, wind: 0.9, glow: 0.5, exposure: 1.0 },
};
const COLOR_KEYS = ['zenith', 'horizon', 'fog', 'sun', 'sky', 'ground'];
const NUM_KEYS = ['density', 'sunI', 'hemiI', 'wind', 'glow', 'exposure'];

const SUN_DIR = new THREE.Vector3(-0.72, 0.4, -0.57).normalize(); // low sun, west-north-west
const SHADOW_HALF = 24; // m, half size of the shadow frustum around the player

const NOISE = /* glsl */`
float fxHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float fxNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(fxHash(i), fxHash(i + vec2(1.0, 0.0)), u.x), mix(fxHash(i + vec2(0.0, 1.0)), fxHash(i + vec2(1.0, 1.0)), u.x), u.y);
}`;

const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // at the far plane
}`;
const SKY_FRAG = /* glsl */`
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uFog; uniform vec3 uSunColor; uniform vec3 uSunDir; uniform float uGlow;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.65, h), 0.8));
  col = mix(col, uFog, 1.0 - smoothstep(-0.02, 0.12, h)); // the horizon melts into the fog
  float s = max(dot(d, uSunDir), 0.0);
  col += uSunColor * (pow(s, 6.0) * 0.25 * uGlow + pow(s, 48.0) * 0.5 * uGlow + smoothstep(0.9993, 0.9997, s) * 3.0 * uGlow);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const WATER_VERT = /* glsl */`
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const WATER_FRAG = /* glsl */`
uniform float uTime; uniform vec3 uDeep; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunColor; uniform vec3 uSunDir;
uniform float uSunI; uniform float uReflect; uniform float uOpacity; uniform float uRipple; uniform float uWind;
varying vec3 vWorld;
#include <fog_pars_fragment>
${NOISE}
void main() {
  vec3 V = normalize(cameraPosition - vWorld);
  vec2 p = vWorld.xz; float t = uTime;
  float w = 0.4 + 0.6 * uWind;
  vec2 g = vec2(cos(p.x * 0.9 + t * 1.1) + 0.6 * cos(p.y * 1.3 - t * 0.8), cos(p.y * 0.7 - t * 0.9) + 0.6 * cos(p.x * 1.1 + t * 1.3)) * 0.035 * w;
  g += vec2(cos((p.x + p.y) * 2.6 + t * 2.1), cos((p.x - p.y) * 2.3 - t * 1.7)) * 0.018 * w;
  g += (vec2(fxNoise(p * 1.7 + t * 0.3), fxNoise(p.yx * 1.9 - t * 0.25)) - 0.5) * 0.05 * uRipple;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N);
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(R.y, 0.0, 1.0), 0.6));
  float spec = pow(max(dot(R, uSunDir), 0.0), 220.0) * 2.5 * uSunI;
  vec3 base = uDeep * (0.25 + 0.22 * uSunI);
  vec3 col = mix(base, sky, clamp(fres * uReflect + 0.12 * uReflect, 0.0, 1.0)) + uSunColor * spec * uReflect;
  gl_FragColor = vec4(col, uOpacity);
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogFactor = 1.0 - exp(- fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
  #endif
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function patchGround(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFxWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFxWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vFxWorld;\n${NOISE}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        { vec2 q = vFxWorld.xz; float n = fxNoise(q * 0.16) * 0.55 + fxNoise(q * 0.85) * 0.3 + fxNoise(q * 3.7) * 0.15;
          diffuseColor.rgb *= 0.8 + 0.4 * n; }`);
  };
  mat.customProgramCacheKey = () => 'fx_ground_v1';
  mat.needsUpdate = true;
}

function patchReeds(mat, u) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = u.uTime; sh.uniforms.uWind = u.uWind; sh.uniforms.uWindDir = u.uWindDir; sh.uniforms.uPlume = u.uPlume;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind; uniform vec2 uWindDir; varying float vFxH;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float fxH = position.y + 0.5;
        #ifdef USE_INSTANCING
          vec2 fxBase = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        #else
          vec2 fxBase = vec2(0.0);
        #endif
        float fxPh = dot(fxBase, vec2(0.37, 0.21));
        float fxGust = sin(dot(fxBase, uWindDir) * 0.16 - uTime * 1.5) * 0.5 + 0.5;
        float fxSway = uWind * (0.06 + 0.2 * fxGust * fxGust) + sin(uTime * 2.2 + fxPh) * 0.035 * (0.3 + uWind);
        float fxK = fxH * fxH;
        transformed.x += uWindDir.x * fxSway * fxK;
        transformed.z += uWindDir.y * fxSway * fxK;
        vFxH = fxH;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uPlume; varying float vFxH;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb *= mix(0.5, 1.12, vFxH);
        diffuseColor.rgb = mix(diffuseColor.rgb, uPlume, smoothstep(0.84, 0.97, vFxH));`);
  };
  mat.customProgramCacheKey = () => 'fx_reeds_v1';
  mat.needsUpdate = true;
}

export class Atmosphere {
  /** world: return value of buildWorld() ({ scene, props, sun, hemi, layers }). */
  constructor(world, renderer) {
    this.world = world; this.renderer = renderer; this.scene = world.scene;
    this.sun = world.sun; this.hemi = world.hemi; this.time = 0; this.quality = 'high';
    this.cur = this._resolve(MOODS.ben_say); this.target = this._resolve(MOODS.ben_say); this.moodId = 'ben_say';
    this.blendRate = 0.45; // per second
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Fog (exponential, depth) + sky dome.
    this.scene.fog = new THREE.FogExp2(this.cur.fog.clone(), this.cur.density);
    this.scene.background = this.cur.fog.clone();
    this.skyU = { uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uFog: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() }, uSunDir: { value: SUN_DIR.clone() }, uGlow: { value: 0.4 } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false }));
    this.sky.frustumCulled = false; this.sky.renderOrder = -10; this.sky.userData.fxOwned = true;
    this.scene.add(this.sky);

    // Sun + fill; the sun follows the player for a tight shadow frustum.
    const sun = this.sun;
    sun.shadow.camera.left = -SHADOW_HALF; sun.shadow.camera.right = SHADOW_HALF;
    sun.shadow.camera.top = SHADOW_HALF; sun.shadow.camera.bottom = -SHADOW_HALF;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 160;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    this.scene.add(sun.target);

    // Shared uniforms (water + reeds).
    this.u = { uTime: { value: 0 }, uWind: { value: 1 }, uWindDir: { value: new THREE.Vector2(0.8, 0.6).normalize() },
      uPlume: { value: new THREE.Color(0xd9cfb0) } };
    const L = world.layers ?? {};
    this.waterMats = [];
    const water = (mesh, { deep, opacity = 1, reflect = 0.9, ripple = 1 }) => {
      if (!mesh) return;
      const m = new THREE.ShaderMaterial({
        vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, fog: true, transparent: opacity < 1, depthWrite: opacity >= 1,
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
          uDeep: { value: new THREE.Color(deep) }, uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
          uSunColor: { value: new THREE.Color() }, uSunDir: { value: SUN_DIR.clone() }, uSunI: { value: 2 }, uReflect: { value: reflect },
          uOpacity: { value: opacity }, uRipple: { value: ripple }, uWind: { value: 1 }, uTime: { value: 0 } }]),
      });
      mesh.material = m; mesh.receiveShadow = false; mesh.userData.fxShadowTagged = true;
      this.waterMats.push(m);
    };
    water(L.water, { deep: 0x55573f, reflect: 0.85 });
    for (const s of L.shallow ?? []) water(s, { deep: 0x6a694d, opacity: 0.72, reflect: 0.75 });
    for (const s of L.mud ?? []) water(s, { deep: 0x2f2820, reflect: 0.3, ripple: 0.2 });
    for (const g of L.ground ?? []) { g.receiveShadow = true; g.userData.fxShadowTagged = true; patchGround(g.material); }
    if (L.reeds) {
      const r = L.reeds; r.receiveShadow = true; r.castShadow = false; r.userData.fxShadowTagged = true;
      patchReeds(r.material, this.u);
      r.material.color.set(0xffffff); // colours come per instance
      const pal = [0x7c884e, 0x8f9a55, 0xa59a5a, 0xb3a463, 0xc6ae78, 0x8c7b4e].map((c) => new THREE.Color(c));
      const c = new THREE.Color(); let seed = 99;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < r.count; i++) { c.copy(pal[Math.floor(rnd() * pal.length)]).multiplyScalar(0.85 + rnd() * 0.25); r.setColorAt(i, c); }
      r.instanceColor.needsUpdate = true;
    }
    this.flames = Object.values(world.props?.fires ?? {}).map((f) => ({ mesh: f, base: f.material.color.clone() }));
    this._shadowTagT = 0;
    this.apply(1);
  }

  _resolve(m) {
    const o = {};
    for (const k of COLOR_KEYS) o[k] = new THREE.Color(m[k]);
    for (const k of NUM_KEYS) o[k] = m[k];
    return o;
  }
  /** Zone mood id (see MOODS). Blends over ~2 s; `instant` snaps (teleports, respawn). */
  setMood(id, instant = false) {
    const m = MOODS[id]; if (!m) return;
    if (id !== this.moodId) { this.moodId = id; this.target = this._resolve(m); }
    if (instant) this.apply(1);
  }

  setQuality(q) {
    this.quality = q === 'low' ? 'low' : 'high';
    const high = this.quality === 'high';
    this.sun.castShadow = high;
    this.sun.shadow.mapSize.set(2048, 2048);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    for (const f of this.flames) f.mesh.material.color.copy(f.base).multiplyScalar(high ? 2.4 : 1.2);
    this.scene.traverse((o) => { if (o.userData?.blobShadow) o.material.opacity = high ? 0.12 : 0.28; });
  }

  apply(k) {
    const c = this.cur, t = this.target;
    for (const key of COLOR_KEYS) c[key].lerp(t[key], k);
    for (const key of NUM_KEYS) c[key] += (t[key] - c[key]) * k;
    this.scene.fog.color.copy(c.fog); this.scene.fog.density = c.density; this.scene.background.copy(c.fog);
    this.skyU.uZenith.value.copy(c.zenith); this.skyU.uHorizon.value.copy(c.horizon); this.skyU.uFog.value.copy(c.fog);
    this.skyU.uSunColor.value.copy(c.sun); this.skyU.uGlow.value = c.glow;
    this.sun.color.copy(c.sun); this.sun.intensity = c.sunI;
    this.hemi.color.copy(c.sky); this.hemi.groundColor.copy(c.ground); this.hemi.intensity = c.hemiI;
    this.renderer.toneMappingExposure = c.exposure;
    this.u.uWind.value = c.wind;
    for (const m of this.waterMats) {
      const u = m.uniforms;
      u.uZenith.value.copy(c.zenith); u.uHorizon.value.copy(c.horizon); u.uSunColor.value.copy(c.sun); u.uSunI.value = c.sunI;
      u.uWind.value = c.wind;
    }
  }

  /** dt: real seconds (0 while paused). focus: {x, z} (player). camera: for the sky dome. */
  update(dt, focus, camera) {
    this.time += dt;
    this.u.uTime.value = this.time;
    for (const m of this.waterMats) m.uniforms.uTime.value = this.time;
    if (dt > 0) this.apply(Math.min(1, dt * this.blendRate));
    this.sky.position.copy(camera.position);
    if (focus) {
      // Texel-snapped follow (reduces shadow shimmer while moving).
      const texel = (SHADOW_HALF * 2) / this.sun.shadow.mapSize.x;
      const ux = -SUN_DIR.z, uz = SUN_DIR.x; const ul = Math.hypot(ux, uz) || 1;
      const a = (focus.x * ux + focus.z * uz) / ul;
      const sa = Math.round(a / texel) * texel;
      const fx = focus.x + (sa - a) * ux / ul, fz = focus.z + (sa - a) * uz / ul;
      this.sun.target.position.set(fx, 0, fz);
      this.sun.position.set(fx + SUN_DIR.x * 70, SUN_DIR.y * 70, fz + SUN_DIR.z * 70);
      this.sun.target.updateMatrixWorld();
    }
    this._shadowTagT -= dt;
    if (this._shadowTagT <= 0) { this._shadowTagT = 0.5; this.tagShadows(); }
  }

  /** Marks new solid meshes (characters, props) as shadow casters; FX, decals, blobs are skipped. */
  tagShadows() {
    const high = this.quality === 'high';
    this.scene.traverse((o) => {
      if (!o.isMesh || o.userData.fxShadowTagged) return;
      o.userData.fxShadowTagged = true;
      if (o.userData.blobShadow) { o.material.opacity = high ? 0.12 : 0.28; return; }
      if (o.userData.fxOwned || o.isInstancedMesh) return;
      const m = o.material;
      if (!m || Array.isArray(m) || m.transparent || m.isShaderMaterial || m.isMeshBasicMaterial) return;
      o.castShadow = true; o.receiveShadow = true;
    });
  }
}
