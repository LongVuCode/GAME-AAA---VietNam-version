// fx/particles.js - GPU side of the particle pool: one THREE.Points per blend mode. The pool's typed
// arrays ARE the buffer attributes (no copy, no per-frame allocation). Point size is in world metres
// (attenuated by distance); soft round sprites; fog-aware (additive sprites fade out in fog instead
// of turning fog-coloured).
import * as THREE from 'three';
import { ParticlePool } from './logic.js';

const VERT = /* glsl */`
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
varying float vAlpha;
varying vec3 vColor;
#include <fog_pars_vertex>
void main() {
  vAlpha = aAlpha; vColor = aColor;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aAlpha > 0.0 ? aSize * uScale / max(0.2, -mvPosition.z) : 0.0;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */`
varying float vAlpha;
varying vec3 vColor;
#include <fog_pars_fragment>
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  if (d > 1.0) discard;
  float a = vAlpha * (1.0 - d * d);
  gl_FragColor = vec4(vColor, a);
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogFactor = 1.0 - exp(- fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    #ifdef FX_ADDITIVE
      gl_FragColor.a *= 1.0 - fogFactor;
    #else
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
    #endif
  #endif
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class ParticleSystem {
  constructor(scene, capacity, { additive = false, name = 'fx_particles' } = {}) {
    this.pool = new ParticlePool(capacity);
    const g = new THREE.BufferGeometry();
    const attr = (arr, n) => new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', attr(this.pool.pos, 3));
    g.setAttribute('aColor', attr(this.pool.color, 3));
    g.setAttribute('aSize', attr(this.pool.size, 1));
    g.setAttribute('aAlpha', attr(this.pool.alpha, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uScale: { value: 400 } }]),
      defines: additive ? { FX_ADDITIVE: 1 } : {},
      transparent: true, depthWrite: false, fog: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.name = name; this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 12 : 11;
    this.points.userData.fxOwned = true;
    scene.add(this.points);
    this.geometry = g; this._dirty = true;
  }
  setScale(s) { this.material.uniforms.uScale.value = s; }
  setLimit(n) { this.pool.setLimit(n); this._dirty = true; }
  spawn(...a) { this._dirty = true; return this.pool.spawn(...a); }
  update(dt) {
    if (this.pool.active === 0 && !this._dirty) return;
    this.pool.step(dt);
    const g = this.geometry;
    g.setDrawRange(0, this.pool.limit);
    for (const k of ['position', 'aColor', 'aSize', 'aAlpha']) g.attributes[k].needsUpdate = true;
    this._dirty = this.pool.active > 0;
  }
}
