// ui/inventory/preview.js - the character on the Pack's Equipment tab: the player's jointed rig
// (anim/rig.js, same build as player.js) with its weapon and worn gear, idling (anim/animator.js),
// rendered by a small second WebGL renderer into a canvas of the Pack. Drag to rotate; selecting the
// Head slot moves the camera in. One renderer is created lazily and reused (no context leak).
import * as THREE from 'three';
import { HumanoidRig } from '../../anim/rig.js';
import { HumanoidAnimator } from '../../anim/animator.js';
import { GRIPS } from '../../anim/humanoidPoses.js';
import { makeSpear, makeAxe } from '../../game/meshes.js';
import { attachGear, gearKey } from './gearVisuals.js';

// Same look as Player.setCharacter (player.js): Cói in indigo with a hat, Bương in brown, taller.
const CHARACTER_LOOK = { chr_coi: { body: 0x41657a, hatColor: 0xd8c48a }, chr_buong: { body: 0x7a5a3a, hat: false, height: 1.05 } };

function idleCtx(weaponId) {
  return { state: 'free', stateT: 0, speed: 0, stride: 1, gait: 'idle', lean: 0, pitchLean: 0, localX: 0, localZ: 1, skid: 0, pivot: false,
    attack: { id: '', key: 0, t: 0, tl: null, level: 0, fromCharge: false }, charge: { id: '', t: 0, level: 0 },
    dodge: { n: 0, t: 0, moveT: 0.3, kind: 'roll', local: 'fwd' }, burst: { t: 0, every: 0.6, hits: 4 }, pryBeats: 0,
    knock: { t: 0, downS: 0.5, upS: 0.8 }, weaponId, finisher: { t: 0, dur: 0.9 }, vaultS: 0.55, swapS: 0.15 };
}

export class CharacterPreview {
  constructor() {
    this.canvas = document.createElement('canvas'); this.canvas.className = 'pk-3d';
    this.ok = true;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
      this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
      this.renderer.setClearColor(0x000000, 0);
      if ('outputColorSpace' in this.renderer) this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    } catch { this.ok = false; return; }
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xe8e2d0, 0x3a3026, 1.5));
    const key = new THREE.DirectionalLight(0xfff0d8, 1.7); key.position.set(-2, 4, 3); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xe0a860, 1.4); rim.position.set(2.5, 2.5, -3); this.scene.add(rim);
    // Plinth: a dark disc with a bronze rim.
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.05, 48), new THREE.MeshLambertMaterial({ color: 0x2a241d }));
    disc.position.y = -0.025; this.scene.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.012, 6, 64), new THREE.MeshBasicMaterial({ color: 0x9b7a4e }));
    ring.rotation.x = Math.PI / 2; this.scene.add(ring);
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.05, 30);
    this.yaw = 0.35; this.spin = 0; this.focus = 'body'; this.cam = { y: 0.95, d: 4.4, ty: 0.92 };
    this.anim = new HumanoidAnimator();
    this.rig = null; this.characterId = null; this.weaponId = null; this.key = null;
    let drag = null;
    this.canvas.addEventListener('pointerdown', (e) => { drag = e.clientX; this.canvas.setPointerCapture?.(e.pointerId); });
    this.canvas.addEventListener('pointermove', (e) => { if (drag == null) return; this.yaw += (e.clientX - drag) * 0.012; drag = e.clientX; });
    this.canvas.addEventListener('pointerup', () => { drag = null; });
    this.canvas.addEventListener('pointercancel', () => { drag = null; });
  }

  /** Builds or refreshes the model: character id, weapon in hand, worn gear ids. */
  setModel(characterId, weaponId, worn) {
    if (!this.ok) return;
    if (characterId !== this.characterId) {
      if (this.rig) this.scene.remove(this.rig.root);
      this.rig = new HumanoidRig(CHARACTER_LOOK[characterId] ?? CHARACTER_LOOK.chr_coi);
      this.rig.root.traverse((o) => { if (o.userData?.blobShadow) o.visible = false; });
      this.weapons = { wp_giao_dong: makeSpear(), wp_riu_xeo: makeAxe() };
      for (const m of Object.values(this.weapons)) { m.visible = false; this.rig.weaponPivot.add(m); }
      this.scene.add(this.rig.root);
      this.characterId = characterId; this.key = null;
    }
    this.weaponId = weaponId;
    for (const [id, m] of Object.entries(this.weapons)) m.visible = id === weaponId;
    this.rig.gripLeft = (GRIPS[weaponId] ?? GRIPS.wp_giao_dong).left;
    this.anim.setWeapon(weaponId);
    const k = gearKey(worn);
    if (k !== this.key) { attachGear(this.rig, worn); this.key = k; }
  }
  setFocus(f) { this.focus = f; }
  rotate(d) { this.yaw += d; }

  /** dt: real seconds. Resizes to the canvas box, animates the idle and renders. */
  render(dt) {
    if (!this.ok || !this.rig) return;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (w < 2 || h < 2) return;
    const r = this.renderer;
    const sz = r.getSize(new THREE.Vector2());
    if (sz.x !== w || sz.y !== h) { r.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    const pose = this.anim.update(Math.min(0.05, dt), idleCtx(this.weaponId));
    this.rig.apply(pose);
    this.rig.root.rotation.y = this.yaw;
    const want = this.focus === 'head' ? { y: 1.62, d: 2.4, ty: 1.48 } : { y: 1.0, d: 4.6, ty: 0.92 };
    const k = Math.min(1, dt * 6);
    for (const key of ['y', 'd', 'ty']) this.cam[key] += (want[key] - this.cam[key]) * k;
    this.camera.position.set(0, this.cam.y, this.cam.d);
    this.camera.lookAt(0, this.cam.ty, 0);
    r.render(this.scene, this.camera);
  }
}
