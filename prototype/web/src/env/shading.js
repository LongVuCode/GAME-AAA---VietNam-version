// env/shading.js - shared GLSL: sky colour (mood gradient + CC0 HDRI clouds) and exponential height
// fog. installHeightFog() patches three's fog chunks once, so every built-in material (terrain, props,
// characters, foliage) gets fog that is denser near the water and thinner up high ("sương sát nước").
import * as THREE from 'three';

/** Uniform block used by sky + water: uZenith, uHorizon, uFog, uSunColor, uSunDir, uGlow, tSky, uSkyMix, uSkyTint. */
export const SKY_GLSL = /* glsl */`
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uFog; uniform vec3 uSunColor; uniform vec3 uSunDir; uniform float uGlow;
uniform sampler2D tSky; uniform float uSkyMix; uniform vec3 uSkyTint;
vec3 envSky(vec3 d, bool withSun) {
  float h = d.y;
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.65, h), 0.8));
  if (uSkyMix > 0.0) {
    vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
    vec3 hdr = texture2D(tSky, uv).rgb;
    float lum = dot(hdr, vec3(0.299, 0.587, 0.114));
    // Keep the mood's colour, take the cloud structure (luminance contrast) of the photo sky.
    vec3 cloudy = col * clamp(lum / max(0.001, uSkyTint.r), 0.55, 1.35);
    col = mix(col, cloudy, uSkyMix * smoothstep(0.0, 0.25, h));
  }
  col = mix(col, uFog, 1.0 - smoothstep(-0.02, 0.14, h));
  if (withSun) {
    float s = max(dot(d, uSunDir), 0.0);
    col += uSunColor * (pow(s, 6.0) * 0.25 * uGlow + pow(s, 48.0) * 0.5 * uGlow + smoothstep(0.9993, 0.9997, s) * 3.0 * uGlow);
  }
  return col;
}`;

export function skyUniforms() {
  return {
    uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uFog: { value: new THREE.Color() },
    uSunColor: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uGlow: { value: 0.4 },
    tSky: { value: null }, uSkyMix: { value: 0 }, uSkyTint: { value: new THREE.Color(1, 1, 1) },
  };
}

// Height fog constants (metres): base just under the water plane, density falls off with height.
export const FOG = { base: -0.4, falloff: 0.2, floor: 0.4, boost: 1.55 };

export const HEIGHT_FOG_FN = /* glsl */`
float fxHeightFog(float depth, vec3 wpos) {
  float base = fogDensity * depth; base *= base;
  float k = ${FOG.falloff.toFixed(3)};
  float h0 = max(cameraPosition.y - (${FOG.base.toFixed(3)}), 0.0), h1 = max(wpos.y - (${FOG.base.toFixed(3)}), 0.0);
  float dh = h1 - h0;
  float integ = abs(dh) > 0.01 ? (exp(-k * h0) - exp(-k * h1)) / (k * dh) : exp(-k * h0);
  return 1.0 - exp(-base * (${FOG.floor.toFixed(3)} + ${(1 - FOG.floor).toFixed(3)} * min(integ * ${FOG.boost.toFixed(3)}, 2.5)));
}`;

let installed = false;
export function installHeightFog() {
  if (installed) return; installed = true;
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = '#ifdef USE_FOG\n varying float vFogDepth;\n varying vec3 vFogWorld;\n#endif';
  C.fog_vertex = '#ifdef USE_FOG\n vFogDepth = - mvPosition.z;\n vFogWorld = cameraPosition + mvPosition.xyz * mat3(viewMatrix);\n#endif';
  C.fog_pars_fragment = `#ifdef USE_FOG
 uniform vec3 fogColor;
 varying float vFogDepth;
 varying vec3 vFogWorld;
 #ifdef FOG_EXP2
  uniform float fogDensity;
  ${HEIGHT_FOG_FN}
 #else
  uniform float fogNear;
  uniform float fogFar;
 #endif
#endif`;
  C.fog_fragment = `#ifdef USE_FOG
 #ifdef FOG_EXP2
  float fogFactor = fxHeightFog(vFogDepth, vFogWorld);
 #else
  float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
 #endif
 gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif`;
}
