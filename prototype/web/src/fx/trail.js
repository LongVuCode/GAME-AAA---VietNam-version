// fx/trail.js - weapon trail ribbon. Samples two points on the weapon (near the tip and `width`
// metres toward the grip) in world space every frame while started; the ribbon fades with sample age
// (real time) and along its width (bright at the tip). Fixed buffers; no per-frame allocation.
import * as THREE from 'three';

const VERT = /* glsl */`
attribute float aAlpha;
varying float vAlpha;
#include <fog_pars_vertex>
void main() {
  vAlpha = aAlpha;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
#include <fog_pars_fragment>
void main() {
  gl_FragColor = vec4(uColor, vAlpha * uOpacity);
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

const _inv = new THREE.Matrix4(), _box = new THREE.Box3(), _b = new THREE.Box3();

/** Local-space bounds of an object's meshes (relative to the object itself). */
export function localBounds(obj) {
  obj.updateMatrixWorld(true);
  _inv.copy(obj.matrixWorld).invert();
  _box.makeEmpty();
  obj.traverse((m) => {
    if (!m.isMesh || !m.geometry) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    _b.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld).applyMatrix4(_inv);
    _box.union(_b);
  });
  return _box.clone();
}

export class WeaponTrail {
  /**
   * obj: Object3D the trail follows (weapon). opts: { color (hex), width (m), durationS, samples,
   * tipLocal, baseLocal (THREE.Vector3 in obj space; default: far end along +z of the mesh bounds) }.
   */
  constructor(scene, obj, { color = 0xf1c78a, width = 0.6, durationS = 0.16, samples = 18, tipLocal = null, baseLocal = null, opacity = 0.55, intensity = 1.6 } = {}) {
    this.obj = obj; this.duration = durationS; this.n = samples; this.active = false;
    if (!tipLocal || !baseLocal) {
      const b = localBounds(obj);
      const cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2;
      tipLocal = tipLocal ?? new THREE.Vector3(cx, cy, b.max.z);
      baseLocal = baseLocal ?? new THREE.Vector3(cx, cy, b.max.z - width);
    }
    this.tipLocal = tipLocal.clone(); this.baseLocal = baseLocal.clone();
    this.tips = Array.from({ length: samples }, () => new THREE.Vector3());
    this.bases = Array.from({ length: samples }, () => new THREE.Vector3());
    this.times = new Float32Array(samples); this.count = 0; this.head = 0; this.clock = 0;
    const g = new THREE.BufferGeometry();
    this.posArr = new Float32Array(samples * 2 * 3); this.alphaArr = new Float32Array(samples * 2);
    g.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphaArr, 1).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < samples - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const c = new THREE.Color(color).multiplyScalar(intensity);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
      blending: THREE.AdditiveBlending,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uColor: { value: c }, uOpacity: { value: opacity } }]),
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 13; this.mesh.visible = false; this.mesh.userData.fxOwned = true;
    this.geometry = g; this.scene = scene;
    scene.add(this.mesh);
  }
  start() { if (!this.active) { this.active = true; this.count = 0; } return this; }
  stop() { this.active = false; return this; }
  get alive() { return this.active || this.count > 0; }
  _visibleInScene() {
    let o = this.obj; while (o) { if (!o.visible) return false; if (!o.parent) return o.isScene; o = o.parent; } return false;
  }
  update(dt) {
    this.clock += dt;
    if (this.active && dt > 0 && this._visibleInScene()) {
      this.obj.updateWorldMatrix(true, false);
      const i = this.head; this.head = (this.head + 1) % this.n;
      this.tips[i].copy(this.tipLocal).applyMatrix4(this.obj.matrixWorld);
      this.bases[i].copy(this.baseLocal).applyMatrix4(this.obj.matrixWorld);
      this.times[i] = this.clock; this.count = Math.min(this.n, this.count + 1);
    }
    // Drop samples older than the duration.
    while (this.count > 0) {
      const oldest = (this.head - this.count + this.n) % this.n;
      if (this.clock - this.times[oldest] > this.duration) this.count -= 1; else break;
    }
    if (this.count < 2) { this.mesh.visible = false; if (!this.active) this.count = 0; return; }
    this.mesh.visible = true;
    const P = this.posArr, A = this.alphaArr;
    let lastV = 0;
    for (let k = 0; k < this.count; k++) {
      const i = (this.head - 1 - k + this.n) % this.n;   // newest first
      const age = Math.min(1, (this.clock - this.times[i]) / this.duration);
      const v = k * 2;
      P[v * 3] = this.tips[i].x; P[v * 3 + 1] = this.tips[i].y; P[v * 3 + 2] = this.tips[i].z;
      P[v * 3 + 3] = this.bases[i].x; P[v * 3 + 4] = this.bases[i].y; P[v * 3 + 5] = this.bases[i].z;
      const fade = (1 - age) * (1 - age);
      A[v] = fade; A[v + 1] = 0;
      lastV = v;
    }
    // Collapse unused vertices onto the last used pair (degenerate triangles, invisible).
    for (let v = lastV + 2; v < this.n * 2; v += 2) {
      for (let j = 0; j < 6; j++) P[v * 3 + j] = P[lastV * 3 + j];
      A[v] = 0; A[v + 1] = 0;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
  }
  dispose() { this.scene.remove(this.mesh); this.geometry.dispose(); this.material.dispose(); }
}
