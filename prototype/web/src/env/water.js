// env/water.js - murky delta water. Depth comes from the terrain height texture (no depth pre-pass):
// shallow water is clear-ish and shows the mud, deep water is opaque olive-brown; a thin wet band at
// the shore; reflections of the sky (mood gradient + HDRI clouds) with a Fresnel term; procedural
// ripples (fewer octaves on Low); sun glint; height fog. Planar reflections of objects are not done
// (cost); see README limitations.
import * as THREE from 'three';
import { SKY_GLSL, skyUniforms, HEIGHT_FOG_FN } from './shading.js';

const VERT = /* glsl */`
varying vec3 vWorld;
varying float vFogDepth;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */`
uniform float uTime; uniform float uWaterY; uniform sampler2D tHeight; uniform vec4 uPatch;
uniform vec3 uDeep; uniform vec3 uShallow; uniform float uSunI; uniform float uReflect; uniform float uWind; uniform float uRipple;
uniform float uClarity; uniform float uOpacityMax;
uniform vec3 fogColor; uniform float fogDensity;
varying vec3 vWorld; varying float vFogDepth;
${SKY_GLSL}
${HEIGHT_FOG_FN}
float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1, 0)), u.x), mix(wHash(i + vec2(0, 1)), wHash(i + vec2(1, 1)), u.x), u.y); }
void main() {
  vec2 p = vWorld.xz;
  vec2 tuv = (p - uPatch.xy) / uPatch.zw;
  float ground = texture2D(tHeight, tuv).r;
  float depth = uWaterY - ground;
  if (depth < -0.005) discard;
  vec3 V = normalize(cameraPosition - vWorld);
  float t = uTime, w = 0.35 + 0.65 * uWind;
  float calm = smoothstep(0.0, 0.35, depth);
  vec2 g = vec2(cos(p.x * 0.9 + t * 1.1) + 0.6 * cos(p.y * 1.3 - t * 0.8), cos(p.y * 0.7 - t * 0.9) + 0.6 * cos(p.x * 1.1 + t * 1.3)) * 0.022 * w;
  #ifndef FX_LOW
  g += vec2(cos((p.x + p.y) * 2.6 + t * 2.1), cos((p.x - p.y) * 2.3 - t * 1.7)) * 0.012 * w;
  g += (vec2(wNoise(p * 1.7 + t * 0.3), wNoise(p.yx * 1.9 - t * 0.25)) - 0.5) * 0.06 * uRipple;
  g += (vec2(wNoise(p * 6.1 - t * 0.9), wNoise(p.yx * 5.3 + t * 0.8)) - 0.5) * 0.025 * uRipple;
  #endif
  g *= 0.4 + 0.6 * calm;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float cosV = max(dot(N, V), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - cosV, 5.0);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 refl = envSky(R, false) * 0.9;
  float spec = pow(max(dot(R, uSunDir), 0.0), 260.0) * 2.2 * uSunI;
  // Body colour: light passes through murky water; the bed shows through in the shallows.
  float path = depth / max(0.15, cosV);
  float absorb = 1.0 - exp(-path * uClarity);
  vec3 body = mix(uShallow, uDeep, smoothstep(0.0, 1.2, depth)) * (0.3 + 0.2 * uSunI);
  float alpha = clamp(absorb, 0.0, uOpacityMax);
  vec3 col = body;
  float k = clamp(fres * uReflect, 0.0, 1.0);
  col = mix(col, refl, k);
  alpha = max(alpha, k);
  col += uSunColor * spec * uReflect; alpha = max(alpha, min(1.0, spec));
  // Wet shore line: a soft brighter film where the water thins out.
  float shore = 1.0 - smoothstep(0.0, 0.05, depth);
  col = mix(col, refl * 0.75 + body * 0.25, shore * 0.5);
  alpha *= smoothstep(-0.005, 0.03, depth);
  float fogFactor = fxHeightFog(vFogDepth, vWorld);
  col = mix(col, fogColor, fogFactor);
  alpha = mix(alpha, 1.0, fogFactor * smoothstep(0.0, 0.2, depth));
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** A water surface at height y over a terrain patch grid G (heightTexture of that patch). */
export function waterMaterial(heightTex, G, y, { deep = 0x55573f, shallow = 0x6a694d, reflect = 0.75, ripple = 1, clarity = 3.2, opacityMax = 0.97 } = {}) {
  const u = {
    ...skyUniforms(),
    uTime: { value: 0 }, uWaterY: { value: y }, tHeight: { value: heightTex },
    uPatch: { value: new THREE.Vector4(G.patch.x0 - 0.5, G.patch.z0 - 0.5, G.nx, G.nz) },
    uDeep: { value: new THREE.Color(deep) }, uShallow: { value: new THREE.Color(shallow) }, uSunI: { value: 2 },
    uReflect: { value: reflect }, uWind: { value: 1 }, uRipple: { value: ripple }, uClarity: { value: clarity }, uOpacityMax: { value: opacityMax },
    fogColor: { value: new THREE.Color() }, fogDensity: { value: 0.01 },
  };
  const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, transparent: true, depthWrite: false });
  m.userData.fxQualityDefines = true;
  m.userData.envWater = true;
  return m;
}

export function waterPlane(x0, x1, z0, z1, y, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, 1), mat);
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  m.renderOrder = 900; m.userData.fxOwned = true; m.userData.fxShadowTagged = true; m.frustumCulled = true;
  return m;
}
