// env/mist.js - fake volumetric mist: large soft camera-facing cards drifting low over the water and
// the marsh, recycled around the camera. Procedural noise (no texture), height-faded at the bottom so
// the ground intersection does not show a hard line, faded near the camera so it never fills the screen.
import * as THREE from 'three';

const VERT = /* glsl */`
attribute vec4 aCard; // x, z, width, phase
attribute float aY;
uniform float uTime;
varying vec2 vUv; varying float vPhase; varying float vFogDepth; varying vec3 vWorld; varying float vNear;
void main() {
  vUv = uv; vPhase = aCard.w;
  vec3 c = vec3(aCard.x + sin(uTime * 0.05 + aCard.w * 6.0) * 3.0, aY, aCard.y + cos(uTime * 0.04 + aCard.w * 4.0) * 3.0);
  vec3 toCam = cameraPosition - c; toCam.y = 0.0; toCam = normalize(toCam);
  vec3 right = vec3(toCam.z, 0.0, -toCam.x);
  vec3 wp = c + right * position.x * aCard.z + vec3(0.0, position.y * aCard.z * 0.22, 0.0);
  vWorld = wp;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vFogDepth = -mv.z;
  vNear = smoothstep(4.0, 14.0, length(cameraPosition - c));
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */`
uniform float uTime; uniform vec3 uColor; uniform float uAmount; uniform vec3 fogColor;
varying vec2 vUv; varying float vPhase; varying float vFogDepth; varying vec3 vWorld; varying float vNear;
float mHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float mNoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mHash(i), mHash(i + vec2(1, 0)), u.x), mix(mHash(i + vec2(0, 1)), mHash(i + vec2(1, 1)), u.x), u.y); }
void main() {
  vec2 q = vUv * vec2(3.0, 1.2) + vec2(uTime * 0.02 + vPhase * 9.0, vPhase * 3.0);
  float n = mNoise(q) * 0.55 + mNoise(q * 2.3 + 1.7) * 0.3 + mNoise(q * 5.1 - uTime * 0.03) * 0.15;
  float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
  float a = smoothstep(0.35, 0.85, n) * edge * uAmount * vNear;
  vec3 col = mix(uColor, fogColor, 0.4);
  gl_FragColor = vec4(col, a * 0.55);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Mist {
  constructor(count = 40, waterY = -0.25) {
    this.max = count; this.waterY = waterY;
    const g = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.uv = base.attributes.uv;
    this.card = new Float32Array(count * 4); this.y = new Float32Array(count);
    g.setAttribute('aCard', new THREE.InstancedBufferAttribute(this.card, 4));
    g.setAttribute('aY', new THREE.InstancedBufferAttribute(this.y, 1));
    g.instanceCount = count;
    this.u = { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xd8dacb) }, uAmount: { value: 0.6 }, fogColor: { value: new THREE.Color() } };
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.u, transparent: true, depthWrite: false }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 950; this.mesh.userData.fxOwned = true; this.mesh.userData.fxShadowTagged = true;
    this.seeded = false; this.rnd = 1234567;
  }
  _r() { this.rnd = (this.rnd * 16807) % 2147483647; return this.rnd / 2147483647; }
  _spawn(i, cx, cz, near) {
    const a = this._r() * Math.PI * 2, d = near ? 8 + this._r() * 62 : 55 + this._r() * 20;
    this.card[i * 4] = cx + Math.cos(a) * d; this.card[i * 4 + 1] = cz + Math.sin(a) * d;
    this.card[i * 4 + 2] = 14 + this._r() * 18; this.card[i * 4 + 3] = this._r();
    this.y[i] = this.waterY - 0.3 + this._r() * 0.6;
  }
  setCount(n) { this.mesh.geometry.instanceCount = Math.min(this.max, n); }
  update(dt, camera, heightAt) {
    this.u.uTime.value += dt;
    const cx = camera.position.x, cz = camera.position.z, n = this.mesh.geometry.instanceCount;
    let dirty = false;
    for (let i = 0; i < n; i++) {
      if (!this.seeded || Math.hypot(this.card[i * 4] - cx, this.card[i * 4 + 1] - cz) > 80) {
        this._spawn(i, cx, cz, !this.seeded);
        if (heightAt) this.y[i] = Math.max(this.y[i], heightAt(this.card[i * 4], this.card[i * 4 + 1]) - 0.4);
        dirty = true;
      }
    }
    this.seeded = true;
    if (dirty) { this.mesh.geometry.attributes.aCard.needsUpdate = true; this.mesh.geometry.attributes.aY.needsUpdate = true; }
  }
}
