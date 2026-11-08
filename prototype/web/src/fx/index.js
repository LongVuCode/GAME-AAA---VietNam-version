// fx/index.js - VFX & game-feel module (graybox web prototype). Public API: see src/fx/README.md.
//
//   const fx = createFx(scene, camera, renderer, sfx, { overlayParent, shakeEnabled, reduceFlash, feel, shake });
//   fx.attachWorld(buildWorld())   // lighting, sky, fog, water, reeds, shadows (once)
//   per frame:  game step uses fx.timeScale; after the camera is placed: fx.applyCamera();
//               fx.update(realDt, focus); fx.render();
//
// Everything here runs on REAL time (never hit-stop or slow-mo scaled). Particles/rings/trails come
// from fixed pools (no per-frame allocation). Accessibility: cameraShake and transient fovKick obey
// "Camera shake" (acc_camera_shake); screen flashes and light flashes obey "Reduce flashing".
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ParticleSystem } from './particles.js';
import { RingPool } from './rings.js';
import { WeaponTrail } from './trail.js';
import { Atmosphere, MOODS } from './atmosphere.js';
import { TimeScale, CameraShake, FovKick, impactSpec, footstepSpec } from './logic.js';

export * from './logic.js';
export { MOODS };

// Linear colours (values > 1 feed the bloom on High). Red-bronze is reserved for unparryable
// telegraphs (art direction P4) and is never used by these effects.
const C = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const PAL = {
  gold: C(0xf1c78a, 1.9), white: C(0xf4f1e6, 2.0), ivory: C(0xe7dec7, 1.7), bronze: C(0xb5864a, 2.2),
  drum: C(0x7fb3a6, 1.4), dirt: C(0x8a7658), mud: C(0x47392a), mist: C(0xd8dacb), water: C(0xc9d3cc),
  splinter: C(0xb59b6a), ember: C(0xffb35a, 2.2), dust: C(0x9c8a68), glow: C(0xf1c78a, 0.9),
};
const QUALITY = {
  high: { add: 700, alpha: 1000, bloom: true, pixelRatio: 1.5, msaa: 4 },
  low: { add: 220, alpha: 320, bloom: false, pixelRatio: 0.6, msaa: 0 }, // Demo 0.4: Low renders at 60% (big-map fill cost)
};

const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3();
const EMBER_DIR = new THREE.Vector3(0.15, 1, 0.1).normalize(), _back = new THREE.Vector3();
const rand = (a, b) => a + Math.random() * (b - a);

export function createFx(scene, camera, renderer, audio = null, opts = {}) { return new Fx(scene, camera, renderer, audio, opts); }

export class Fx {
  constructor(scene, camera, renderer, audio, opts) {
    this.scene = scene; this.camera = camera; this.renderer = renderer; this.audio = audio;
    this.opts = { shakeEnabled: () => true, reduceFlash: () => false, overlayParent: null, ...opts };
    this.feel = opts.feel ?? {};
    const sh = opts.shake ?? {};
    this.shake = new CameraShake({ maxAmplitude: sh.max_amplitude ?? 0.6, frequencyHz: sh.frequency_hz ?? 22 });
    this.fov = new FovKick();
    this.time = new TimeScale();
    this.baseFov = camera.fov;
    this.add = new ParticleSystem(scene, QUALITY.high.add, { additive: true, name: 'fx_sparks' });
    this.alpha = new ParticleSystem(scene, QUALITY.high.alpha, { additive: false, name: 'fx_dust' });
    this.rings = new RingPool(scene, 18);
    this.trails = new Set();
    this.flashes = new Map();   // mesh -> { t, dur, color, hex, intensity }
    this.glows = new Map();     // object -> { level, shown, meshes }
    this.queue = [];            // delayed fx calls { t, fn }
    this.clock = 0; this.quality = 'high'; this.atmo = null; this.composer = null;
    this.counters = { impacts: 0, footsteps: 0, rings: 0, slowMo: 0, shakes: 0, flashes: 0 };
    this._camOffset = { x: 0, y: 0, roll: 0 };
    this._buildOverlays();
    this.setQuality('high');
  }

  // ------------------------------------------------------------------ setup / quality / render
  /** Restyles the world from buildWorld() (sky, fog, lights, shadows, water, reeds). */
  attachWorld(world) { this.atmo = new Atmosphere(world, this.renderer); this.atmo.setQuality(this.quality); return this.atmo; }
  setMood(id, instant = false) { this.atmo?.setMood(id, instant); }

  setQuality(q) {
    const want = q === 'low' ? 'low' : 'high';
    if (want === this.quality && this._qualityApplied) return; // settings changes (volume...) must not recompile
    this._qualityApplied = true;
    this.quality = want;
    const Q = QUALITY[this.quality];
    this.add.setLimit(Q.add); this.alpha.setLimit(Q.alpha);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pixelRatio));
    this.atmo?.setQuality(this.quality);
    if (Q.bloom && !this.composer) this._buildComposer();
    if (this._size) this.setSize(this._size.w, this._size.h);
  }
  _buildComposer() {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: QUALITY.high.msaa });
    const c = new EffectComposer(this.renderer, rt);
    c.addPass(new RenderPass(this.scene, this.camera));
    // Light bloom: only very bright pixels (sparks, sun glint, fire, trail cores) pass the threshold.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(Math.max(1, size.x / 2), Math.max(1, size.y / 2)), 0.32, 0.45, 0.92);
    c.addPass(this.bloom);
    c.addPass(new OutputPass());
    this.composer = c;
  }
  setSize(w, h) {
    this._size = { w, h };
    if (this.composer) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(w, h); }
    const s = this.renderer.getDrawingBufferSize(_tmpV2);
    if (this.bloom) this.bloom.resolution.set(Math.max(1, s.x / 2), Math.max(1, s.y / 2));
    this._updatePointScale();
  }
  _updatePointScale() {
    const s = this.renderer.getDrawingBufferSize(_tmpV2);
    const k = s.y / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
    this.add.setScale(k); this.alpha.setScale(k);
  }
  render() {
    if (this.quality === 'high' && this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  // ------------------------------------------------------------------ per frame
  /** Slow-mo scale for the game step (see TimeScale contract in logic.js). */
  get timeScale() { return this.time.value; }

  /** realDt: REAL seconds (pass 0 while paused: everything freezes). focus: {x,z} for shadows. */
  update(realDt, focus = null) {
    const dt = realDt > 0 ? realDt : 0;
    this.clock += dt;
    this.time.advance(dt);
    this.shake.enabled = !!this.opts.shakeEnabled();
    this.fov.enabled = this.shake.enabled;
    this.shake.update(dt);
    this.fov.update(dt);
    if (this.queue.length && dt > 0) {
      for (const q of this.queue) q.t -= dt;
      const due = this.queue.filter((q) => q.t <= 0);
      if (due.length) { this.queue = this.queue.filter((q) => q.t > 0); for (const q of due) q.fn(); }
    }
    this.add.update(dt); this.alpha.update(dt);
    this.rings.update(dt, this.camera);
    for (const tr of this.trails) tr.update(dt);
    this._updateGlows();
    this._updateFlashes(dt);
    this._updateOverlays(dt);
    this.atmo?.update(dt, focus, this.camera);
    const fov = this.baseFov + this.fov.value;
    if (Math.abs(this.camera.fov - fov) > 1e-3) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); this._updatePointScale(); }
  }

  /** Call right after the game placed the camera this frame: adds the shake offset (camera-local). */
  applyCamera() {
    const cam = this.camera, s = this.shake;
    if (!s.x && !s.y && !s.roll) return;
    cam.updateMatrixWorld();
    _t1.setFromMatrixColumn(cam.matrixWorld, 0); _t2.setFromMatrixColumn(cam.matrixWorld, 1);
    cam.position.addScaledVector(_t1, s.x).addScaledVector(_t2, s.y);
    cam.rotateZ(s.roll);
  }

  // ------------------------------------------------------------------ camera feel
  /** intensity: metres of camera offset (clamped by camera_shake.max_amplitude); real seconds. */
  cameraShake(intensity, durationS = 0.25) { if (this.shake.add(intensity, durationS)) this.counters.shakes++; }
  /** Transient FOV punch (deg, + = wider). Obeys the camera-shake option. */
  fovKick(deltaDeg, durationS = 0.2) { this.fov.kick(deltaDeg, durationS); }
  /** Sustained FOV offset by name (e.g. 'sprint'), smoothed; 0 removes it. Not tied to the shake option. */
  setFovOffset(name, deg) { this.fov.setOffset(name, deg); }
  /** Slow motion of the GAME step only; returns the current scale. See TimeScale (logic.js). */
  slowMo(scale, durationS) { this.counters.slowMo++; return this.time.slowMo(scale, durationS); }

  // ------------------------------------------------------------------ particles helpers
  _burst(sys, x, y, z, n, o) {
    // o: { dir (Vector3 unit or null), spread (0..1: 0 = along dir, 1 = sphere), speed:[a,b], up, life:[a,b],
    //      size:[s0,s1], alpha, color (Color), jitter, drag, gravity, floor }
    for (let i = 0; i < n; i++) {
      _n.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
      if (o.dir) _n.lerp(o.dir, 1 - (o.spread ?? 0.5)).normalize();
      const sp = rand(o.speed[0], o.speed[1]);
      const j = o.jitter ?? 0.1, c = o.color;
      const r = c.r * (1 + rand(-j, j)), g = c.g * (1 + rand(-j, j)), b = c.b * (1 + rand(-j, j));
      const life = rand(o.life[0], o.life[1]);
      const p = o.offset ?? 0;
      sys.spawn(x + rand(-p, p), y + rand(-p * 0.5, p * 0.5), z + rand(-p, p),
        _n.x * sp, _n.y * sp + (o.up ?? 0), _n.z * sp, life,
        o.size[0] * rand(0.7, 1.3), o.size[1] * rand(0.7, 1.3), o.alpha ?? 1, r, g, b,
        o.drag ?? 0, o.gravity ?? 0, o.floor ?? NaN);
    }
  }
  /** Light flash at a contact: a large, short, soft additive glow (no real light: real point lights
   *  would cost every lit pixel every frame and recompile shaders when toggled). */
  _flashLight(x, y, z, strength) {
    if (!(strength > 0)) return;
    const k = this.opts.reduceFlash() ? 0.4 : 1;
    this.add.spawn(x, y, z, 0, 0, 0, 0.14, 0.7 * strength, 1.4 * strength, 0.22 * k, PAL.glow.r, PAL.glow.g, PAL.glow.b);
  }

  // ------------------------------------------------------------------ effects (public API)
  /**
   * Hit / contact effect. position: Vector3-like; normal: direction the debris flies (toward the
   * attacker), Vector3-like or null. opts: { weight, surface, ground (surface under the target:
   * 'mud' | 'water' | null), sound (default true), pan, scale }.
   */
  impact(position, normal = null, { weight = 'light', surface = 'flesh', ground = null, sound = true, pan = 0, scale = 1 } = {}) {
    const sp = impactSpec(weight, surface);
    // Heights from the game hooks are above the local ground (world_0_4 heightmap): lift by the terrain.
    const x = position.x, y = (position.y ?? 1) + (this.atmo?.env?.heightAt && !position.absolute ? Math.max(0, this.atmo.env.heightAt(x, position.z)) : 0), z = position.z;
    const dir = normal ? _v.set(normal.x, normal.y ?? 0, normal.z).normalize() : null;
    const q = this.quality === 'high' ? 1 : 0.6;
    this.counters.impacts++;
    // Bright core point.
    this._burst(this.add, x, y, z, 1, { dir: null, speed: [0, 0], life: [0.07, 0.1], size: [sp.flare * 0.32 * scale, sp.flare * 0.5 * scale], color: PAL[sp.sparkColor] ?? PAL.gold, alpha: 0.85, jitter: 0 });
    if (sp.sparks) this._burst(this.add, x, y, z, Math.round(sp.sparks * q * scale), { dir, spread: 0.55, speed: [sp.speed * 0.4, sp.speed], up: 1.2, life: [0.16, 0.38],
      size: [0.16, 0.04], color: PAL[sp.sparkColor] ?? PAL.gold, jitter: 0.15, drag: 3.0, gravity: 9 });
    if (sp.dust) this._burst(this.alpha, x, Math.max(0.3, y * 0.5), z, Math.round(sp.dust * q * scale), { dir, spread: 0.85, speed: [0.4, 1.8], up: 0.5, life: [0.5, 1.1],
      size: [0.35, 1.3], color: PAL[sp.dustKind] ?? PAL.dust, alpha: 0.42, jitter: 0.12, drag: 2.5, gravity: -0.15, offset: 0.25 });
    if (sp.debris) this._debris(sp.debrisKind, x, y, z, Math.round(sp.debris * q * scale), dir);
    const gk = ground && ground !== surface ? ground : null;
    if (gk === 'mud' || gk === 'water') this._debris(gk, x, 0.1, z, Math.round(8 * q * scale), null);
    if (sp.ringV) { this.rings.spawn(x, y, z, { r0: 0.25, r1: sp.ringV * scale, life: 0.26, color: PAL[sp.sparkColor] ?? PAL.gold, alpha: 0.7, thick: 0.14, billboard: true }); this.counters.rings++; }
    if (sp.ringG) { this.rings.spawn(x, 0.06, z, { r0: 0.3, r1: sp.ringG * scale, life: 0.55, color: PAL.ivory, alpha: 0.4, thick: 0.12 }); this.counters.rings++; }
    if (sp.ripple || gk === 'water') this.rings.spawn(x, 0.06, z, { r0: 0.2, r1: 1.4, life: 0.8, color: PAL.water, alpha: 0.35, thick: 0.12 });
    this._flashLight(x, y + 0.3, z, sp.light);
    if (sp.flash) this.screenFlash(sp.flash);
    if (sound && this.audio?.impact) this.audio.impact(sp.weight, sp.surface, { pan });
  }
  _debris(kind, x, y, z, n, dir) {
    if (!n) return;
    const o = kind === 'water'
      ? { color: PAL.water, size: [0.09, 0.05], speed: [1.5, 4], up: 2.5, life: [0.4, 0.7], gravity: 11, drag: 0.6, alpha: 0.75, floor: 0.02, spread: 0.8 }
      : kind === 'mud'
        ? { color: PAL.mud, size: [0.13, 0.1], speed: [1.2, 3.6], up: 2.2, life: [0.5, 0.9], gravity: 12, drag: 0.5, alpha: 0.95, floor: 0.04, spread: 0.75 }
        : kind === 'splinter'
          ? { color: PAL.splinter, size: [0.07, 0.05], speed: [2, 5], up: 2.0, life: [0.4, 0.7], gravity: 12, drag: 0.8, alpha: 0.95, floor: 0.03, spread: 0.6 }
          : { color: PAL.dirt, size: [0.08, 0.06], speed: [1, 3], up: 2.0, life: [0.35, 0.6], gravity: 12, drag: 0.8, alpha: 0.9, floor: 0.03, spread: 0.8 };
    this._burst(this.alpha, x, y, z, n, { ...o, dir, jitter: 0.15 });
  }

  /** Small step puff (dust / mud / water + ripple). surface: dirt | mud | water | wood. */
  footstep(position, surface = 'dirt', speed = 5, { sound = true } = {}) {
    const f = footstepSpec(surface, speed);
    const x = position.x, z = position.z;
    this.counters.footsteps++;
    if (f.count) {
      if (f.kind === 'water') this._debris('water', x, 0.05, z, f.count, null);
      else if (f.kind === 'mud') { this._debris('mud', x, 0.05, z, f.count, null); this._burst(this.alpha, x, 0.15, z, 1, { speed: [0.1, 0.3], life: [0.5, 0.8], size: [0.3 * f.k, 0.8 * f.k], color: PAL.mud, alpha: 0.25 }); }
      else this._burst(this.alpha, x, 0.12, z, f.count, { speed: [0.2, 0.7], up: 0.25, life: [0.45, 0.8], size: [f.size * 0.6, f.size * 1.6], color: PAL.dust, alpha: 0.28, drag: 2, gravity: -0.1, offset: 0.1 });
    }
    if (f.ripple) this.rings.spawn(x, 0.05, z, { r0: 0.1, r1: 0.5 + 0.35 * f.k, life: 0.7, color: PAL.water, alpha: 0.28, thick: 0.12 });
    if (sound && this.audio?.footstep) this.audio.footstep(f.kind, speed);
  }

  /** Dodge: low dust burst opposite the dodge direction + a faint ground streak ring. */
  dodgeBurst(position, dir = null, { surface = 'dirt', perfect = false } = {}) {
    const x = position.x, z = position.z;
    const back = dir ? _back.set(-dir.x, 0.15, -dir.z).normalize() : null;
    const col = surface === 'water' ? PAL.water : surface === 'mud' ? PAL.mud : PAL.dust;
    this._burst(this.alpha, x, 0.2, z, this.quality === 'high' ? 12 : 6, { dir: back, spread: 0.6, speed: [1, 3], up: 0.4, life: [0.4, 0.8], size: [0.4, 1.2], color: col, alpha: 0.35, drag: 3, gravity: -0.1 });
    if (surface === 'water' || surface === 'mud') this._debris(surface, x, 0.08, z, 8, back);
    if (perfect) {
      this.rings.spawn(x, 1.0, z, { r0: 0.2, r1: 1.6, life: 0.35, color: PAL.ivory, alpha: 0.6, thick: 0.2, billboard: true });
      this._burst(this.add, x, 1.0, z, 10, { dir: null, spread: 1, speed: [1, 2.5], life: [0.25, 0.45], size: [0.06, 0.01], color: PAL.ivory, drag: 2 });
    }
  }

  /** Drum beat ring on the ground (Hồi trống, pry beats, drum-ready). strength 0..1+. */
  drumPulse(position, { strength = 1, color = null } = {}) {
    const x = position.x, z = position.z, y = (position.y ?? 0) + 0.06;
    const col = color ? C(color, 1.4) : PAL.drum;
    this.rings.spawn(x, y, z, { r0: 0.4, r1: 2.2 + 2.2 * strength, life: 0.55, color: col, alpha: 0.5 + 0.3 * Math.min(1, strength), thick: 0.16 });
    if (strength >= 0.8) this.rings.spawn(x, y, z, { r0: 0.3, r1: 1.4 + 1.4 * strength, life: 0.5, color: col, alpha: 0.35, thick: 0.25, delay: 0.08 });
    this._burst(this.alpha, x, 0.2, z, Math.round(6 * strength), { speed: [0.8, 1.8], up: 0.2, life: [0.4, 0.7], size: [0.3, 0.9], color: PAL.dust, alpha: 0.22, drag: 3, offset: 0.8 });
    this.counters.rings++;
  }

  /**
   * Khoen cracks catch light (art direction: specular glint, NOT an emissive glow; no flicker).
   * object: the khoen Object3D; crackLevel 0..3. The rough ring gets a dull bronze sheen that grows
   * a step per crack and drifts slowly with time (a reflection moving, not a blink).
   */
  khoenGlow(object, crackLevel) {
    if (!object) return;
    let g = this.glows.get(object);
    if (!g) {
      const meshes = [];
      object.traverse((m) => { if (m.isMesh && m.material?.emissive) meshes.push({ m, hex: m.material.emissive.getHex(), i: m.material.emissiveIntensity }); });
      g = { level: 0, meshes };
      this.glows.set(object, g);
    }
    g.level = Math.max(0, crackLevel | 0);
    if (g.level === 0) { for (const s of g.meshes) { s.m.material.emissive.setHex(s.hex); s.m.material.emissiveIntensity = s.i; } this.glows.delete(object); }
  }
  _updateGlows() {
    for (const [obj, g] of this.glows) {
      if (!obj.parent) { this.glows.delete(obj); continue; }
      const sheen = 0.06 * g.level * (0.8 + 0.2 * Math.sin(this.clock * 0.9));
      for (const s of g.meshes) { s.m.material.emissive.setHex(0xb07e46); s.m.material.emissiveIntensity = sheen; }
    }
  }

  /** Short emissive flash on every mesh of an object (hit confirm). color hex; real seconds. */
  hitFlash(object, { color = 0xf4efe2, durationS = 0.1, strength = 0.9 } = {}) {
    if (!object) return;
    const k = this.opts.reduceFlash() ? 0.5 : 1;
    object.traverse((m) => {
      if (!m.isMesh || !m.material?.emissive || m.userData.fxOwned) return;
      let f = this.flashes.get(m);
      if (!f) { f = { hex: m.material.emissive.getHex(), intensity: m.material.emissiveIntensity, color: new THREE.Color() }; this.flashes.set(m, f); }
      f.t = 0; f.dur = durationS; f.color.set(color); f.strength = strength * k;
    });
    this.counters.flashes++;
  }
  _updateFlashes(dt) {
    for (const [m, f] of this.flashes) {
      f.t += dt;
      if (f.t >= f.dur || !m.parent) { m.material.emissive.setHex(f.hex); m.material.emissiveIntensity = f.intensity; this.flashes.delete(m); continue; }
      const a = 1 - f.t / f.dur;
      m.material.emissive.copy(f.color); m.material.emissiveIntensity = f.strength * a * a;
    }
  }

  /** Weapon trail on an Object3D. Returns { start(), stop(), dispose(), trail }. */
  weaponTrail(attachObject3D, opts = {}) {
    const tr = new WeaponTrail(this.scene, attachObject3D, opts);
    this.trails.add(tr);
    return { trail: tr, start: () => { tr.start(); return tr; }, stop: () => { tr.stop(); return tr; }, dispose: () => { tr.dispose(); this.trails.delete(tr); } };
  }

  /** Ambient embers above a fire (call at a low rate). */
  embers(position, n = 1) {
    this._burst(this.add, position.x, (position.y ?? 0) + 0.8, position.z, n, { dir: EMBER_DIR, spread: 0.35, speed: [0.6, 1.4], life: [1.0, 1.8],
      size: [0.06, 0.02], color: PAL.ember, jitter: 0.25, drag: 0.6, gravity: -0.25, offset: 0.25 });
  }

  /** Run fn after s REAL seconds (used to stagger multi-part effects). */
  after(s, fn) { this.queue.push({ t: s, fn }); }

  // ------------------------------------------------------------------ screen overlays
  _buildOverlays() {
    const parent = this.opts.overlayParent;
    if (!parent || typeof document === 'undefined') { this.ov = null; return; }
    const mk = (css) => { const d = document.createElement('div'); d.className = 'fx-overlay'; d.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:0;display:none;${css}`; return d; };
    const vignette = mk('background:radial-gradient(ellipse at center, rgba(29,27,25,0) 50%, rgba(29,27,25,0.92) 100%);');
    const flash = mk('background:#f4efe2;mix-blend-mode:screen;');
    const canvas = this.renderer.domElement;
    if (canvas.parentNode === parent) { canvas.after(flash); canvas.after(vignette); } else { parent.prepend(flash); parent.prepend(vignette); }
    this.ov = { vignette, flash, vA: 0, vBase: 0, fA: 0 };
  }
  /** One vignette pulse (low health / heavy hurt). Charcoal, not red (red-bronze = warnings only). */
  vignettePulse(strength = 1) { if (this.ov) this.ov.vA = Math.max(this.ov.vA, Math.min(1, strength) * (this.opts.reduceFlash() ? 0.5 : 0.85)); }
  /** Steady vignette level 0..1 (e.g. scaled by missing health); pulses add on top. */
  setVignette(level) { if (this.ov) this.ov.vBase = Math.max(0, Math.min(1, level)); }
  /** Brief full-screen flash; suppressed when "Reduce flashing" is on. */
  screenFlash(strength = 0.15) { if (this.ov && !this.opts.reduceFlash()) this.ov.fA = Math.max(this.ov.fA, Math.min(0.35, strength)); }
  _updateOverlays(dt) {
    const o = this.ov; if (!o) return;
    o.vA = Math.max(0, o.vA - dt * 1.6); o.fA = Math.max(0, o.fA - dt * 3.5);
    const v = Math.min(1, o.vBase * 0.6 + o.vA);
    // display:none at rest so idle overlays cost nothing in the compositor.
    if (o._v !== v) { o.vignette.style.opacity = v.toFixed(3); o.vignette.style.display = v > 0 ? '' : 'none'; o._v = v; }
    if (o._f !== o.fA) { o.flash.style.opacity = o.fA.toFixed(3); o.flash.style.display = o.fA > 0 ? '' : 'none'; o._f = o.fA; }
  }

  // ------------------------------------------------------------------ diagnostics
  stats() {
    return { quality: this.quality, timeScale: +this.time.value.toFixed(3), sparks: this.add.pool.active, dust: this.alpha.pool.active,
      spawned: this.add.pool.spawnedTotal + this.alpha.pool.spawnedTotal, limits: [this.add.pool.limit, this.alpha.pool.limit],
      rings: this.rings.active, trails: this.trails.size, fov: +this.camera.fov.toFixed(2), shakeOn: this.shake.enabled,
      bloom: this.quality === 'high' && !!this.composer, shadows: !!this.atmo?.sun.castShadow, mood: this.atmo?.moodId ?? null, ...this.counters };
  }
}
const _tmpV2 = new THREE.Vector2();
