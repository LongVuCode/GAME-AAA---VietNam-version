// fx/rings.js - pooled shockwave rings (ground decals or camera-facing) drawn with a tiny shader on
// a quad: a soft gradient that thickens toward the leading edge. Fixed pool, recycled oldest-first.
import * as THREE from 'three';

const VERT = /* glsl */`
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uAlpha;
uniform float uThick;
varying vec2 vUv;
#include <fog_pars_fragment>
void main() {
  float d = length(vUv - 0.5) * 2.0;
  if (d > 1.0) discard;
  float a = smoothstep(1.0 - uThick, 0.985, d) * (1.0 - smoothstep(0.985, 1.0, d));
  gl_FragColor = vec4(uColor, a * uAlpha);
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogFactor = 1.0 - exp(- fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    gl_FragColor.a *= 1.0 - fogFactor;
  #endif
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class RingPool {
  constructor(scene, size = 16) {
    this.items = [];
    this.cursor = 0;
    const geo = new THREE.PlaneGeometry(2, 2);
    for (let i = 0; i < size; i++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, fog: true,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uColor: { value: new THREE.Color() }, uAlpha: { value: 0 }, uThick: { value: 0.3 } }]),
      });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false; m.frustumCulled = false; m.renderOrder = 10; m.userData.fxOwned = true;
      scene.add(m);
      this.items.push({ mesh: m, t: 0, life: 0, r0: 0, r1: 0, a0: 0, billboard: false });
    }
  }
  /** color: THREE.Color (linear, may exceed 1 for bloom). */
  spawn(x, y, z, { r0 = 0.2, r1 = 2, life = 0.45, color, alpha = 0.8, thick = 0.35, billboard = false, delay = 0 } = {}) {
    const it = this.items[this.cursor]; this.cursor = (this.cursor + 1) % this.items.length;
    it.mesh.position.set(x, y, z);
    it.t = -delay; it.life = life; it.r0 = r0; it.r1 = r1; it.a0 = alpha; it.billboard = billboard;
    const u = it.mesh.material.uniforms;
    if (color) u.uColor.value.copy(color); u.uThick.value = thick; u.uAlpha.value = 0;
    if (!billboard) it.mesh.rotation.set(-Math.PI / 2, 0, 0);
    it.mesh.scale.setScalar(Math.max(0.01, r0));
    it.mesh.visible = delay <= 0;
    return it;
  }
  update(dt, camera) {
    for (const it of this.items) {
      if (it.life <= 0) continue;
      it.t += dt;
      if (it.t < 0) continue;
      it.mesh.visible = true;
      const k = Math.min(1, it.t / it.life);
      if (k >= 1) { it.life = 0; it.mesh.visible = false; continue; }
      const e = 1 - (1 - k) * (1 - k) * (1 - k); // ease-out cubic
      it.mesh.scale.setScalar(it.r0 + (it.r1 - it.r0) * e);
      it.mesh.material.uniforms.uAlpha.value = it.a0 * (1 - k) * (1 - k);
      if (it.billboard) it.mesh.quaternion.copy(camera.quaternion);
    }
  }
  get active() { let n = 0; for (const it of this.items) if (it.life > 0) n++; return n; }
}
