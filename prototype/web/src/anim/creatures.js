// anim/creatures.js - jointed graybox enemies (three.js) with procedural animation [SÁNG TẠO]:
// Cua Càng Bùn (sidestep, raised claws, pinch), Bọ Ngựa Lau (rocking sway, folded scythe arms,
// slash, back-leap with wings), Ụ Bùn (looming heave, overhead slam, sink / rise), Lợn Lòi Đầm
// (trot / gallop, pawing before a charge, tusk toss, hip swing, neck rub, kneel). Each rig exposes
// update(dt, ctx) with ctx from game/enemy.js. Easing / springs come from anim/curves.js.
// No human enemies (Story Bible v1.2 §2); the khoen is a crude plain ring (no pattern, no glow).
import * as THREE from 'three';
import { Spring, Ease, clamp01, wobble } from './curves.js';

const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
function mesh(parent, geo, color, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, lam(color)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
function joint(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
function blobShadow(parent, r) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.userData.blobShadow = true; parent.add(m); return m;
}
const TAU = Math.PI * 2;

/** Attack-local timing helper: windup progress, active progress, recovery progress (0..1 each). */
function atkPhases(a) {
  if (!a) return null;
  const tl = a.tl, t = a.t, wEnd = tl.windup + tl.hold;
  return {
    w: clamp01(t / Math.max(1e-3, tl.windup)), hold: t >= tl.windup && t < wEnd,
    act: t < wEnd ? 0 : clamp01((t - wEnd) / Math.max(1e-3, tl.active)), inAct: t >= wEnd && t < wEnd + tl.active,
    rec: t < wEnd + tl.active ? 0 : clamp01((t - wEnd - tl.active) / Math.max(1e-3, tl.recovery + (tl.stumble ?? 0))),
    t, tl,
  };
}

class CreatureBase {
  constructor() {
    this.root = new THREE.Group(); this.rig = joint(this.root); this.tintParts = [];
    this.flinch = new Spring(8, 0.5); this.flinchSide = new Spring(7, 0.55);
    this.phase = 0; this.time = 0;
  }
  /** Hit reaction: strength 0..1 (weight), side -1..1 (hit from the left / right). */
  hitReact(strength, side = 0) { this.flinch.kick(-60 * strength); this.flinchSide.kick(45 * side * strength); }
  _gait(dt, speed, stride) { this.phase = (this.phase + speed * dt / Math.max(0.2, stride)) % 1; return this.phase; }
  _springs(dt) { return { f: this.flinch.update(dt), s: this.flinchSide.update(dt) }; }
}

// ------------------------------------------------------------------ Cua Càng Bùn
export class CrabRig extends CreatureBase {
  constructor() {
    super();
    blobShadow(this.root, 0.9);
    this.body = joint(this.rig, 0, 0.45, 0);
    const shell = mesh(this.body, new THREE.SphereGeometry(0.75, 16, 9), 0x7a4a36); shell.scale.set(1.2, 0.48, 1);
    mesh(this.body, new THREE.BoxGeometry(1.5, 0.2, 0.25), 0x5e3a2a, 0, -0.03, 0.55); // thick front rim
    for (const s of [-1, 1]) { const st = mesh(this.body, new THREE.CylinderGeometry(0.03, 0.03, 0.22, 5), 0x5e3a2a, s * 0.2, 0.28, 0.62); st.rotation.x = 0.3; mesh(st, new THREE.SphereGeometry(0.06, 8, 6), 0x1e1a16, 0, 0.12, 0); }
    this.tintParts.push(shell);
    this.claws = [-1, 1].map((s) => {
      const sh = joint(this.body, s * 0.62, 0.02, 0.62);
      mesh(sh, new THREE.BoxGeometry(0.18, 0.16, 0.38), 0x8a5038, 0, 0, 0.17);
      const el = joint(sh, 0, 0, 0.36);
      const big = s > 0 ? 1.15 : 1; // right claw slightly bigger (fiddler-like)
      mesh(el, new THREE.BoxGeometry(0.3 * big, 0.24 * big, 0.36 * big), 0x8a5038, 0, 0, 0.16);
      mesh(el, new THREE.BoxGeometry(0.1, 0.1, 0.3 * big), 0x9a6048, s * -0.08, -0.04, 0.42); // fixed finger
      const finger = joint(el, s * 0.08, 0.04, 0.3);
      mesh(finger, new THREE.BoxGeometry(0.1, 0.09, 0.32 * big), 0x9a6048, 0, 0, 0.15);
      return { sh, el, finger, s };
    });
    this.legs = [];
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
      const hip = joint(this.body, s * 0.72, -0.05, -0.25 + i * 0.3);
      const up = joint(hip); mesh(up, new THREE.BoxGeometry(0.45, 0.07, 0.07), 0x5e3a2a, s * 0.22, 0, 0);
      const knee = joint(up, s * 0.44, 0, 0); mesh(knee, new THREE.BoxGeometry(0.06, 0.45, 0.06), 0x5e3a2a, 0, -0.2, 0);
      this.legs.push({ hip, up, knee, s, i, ph: (i % 2) * 0.5 + (s > 0 ? 0.5 : 0) });
    }
  }
  update(dt, c) {
    this.time += dt;
    const { f, s: fs } = this._springs(dt);
    const a = c.attack ? atkPhases(c.attack) : null;
    const moving = clamp01(c.speed / 1.0);
    this._gait(dt, Math.max(c.speed, c.state === 'finished' ? 6 : 0), 0.6);
    let bodyY = 0.45, bodyRx = 0, bodyRz = 0, bodyRy = 0, lift = 0.0;
    const sway = Math.sin(this.time * 2.2) * 0.04;
    const clawPose = [{ p: -0.15, y: 0.25, e: 0.6, f: 0.25 }, { p: -0.15, y: -0.25, e: 0.6, f: 0.25 }];
    if (c.state === 'turtle') { bodyY = 0.28; bodyRx = 0.15; for (const k of clawPose) { k.p = -0.6; k.e = 1.8; k.y *= 2; k.f = 0; } }
    if (a) {
      const id = c.attack.id;
      if (id === 'cua_kep' || id === 'cua_kep_xoay') {
        const k = clawPose[1]; // right claw (s = +1 index 1)
        k.p = -1.2 * Ease.outCubic(a.w) + 1.5 * Ease.outCubic(a.act) - 0.3 * a.rec; k.e = 0.6 + 0.6 * a.w - 0.9 * a.act; k.f = 0.6 * a.w * (1 - a.act);
        bodyRx = -0.12 * a.w + 0.18 * a.act * (1 - a.rec);
        if (id === 'cua_kep_xoay') bodyRy = (a.w * 0.9 - a.act * 2.6) * (1 - a.rec);
      } else if (id === 'cua_kep_doi') {
        for (const k of clawPose) { k.p = -0.9 * a.w + 1.2 * Math.abs(Math.sin(a.act * Math.PI * 2)); k.f = 0.6 * (1 - Math.abs(Math.sin(a.act * Math.PI * 2))); k.y *= 1 + 1.5 * a.w * (1 - a.act); }
        bodyRx = -0.1 * a.w;
      } else if (id === 'cua_ui_ngang') {
        bodyY = 0.45 - 0.18 * a.w; bodyRx = 0.2 * a.w; lift = 0.06 * Math.sin(this.time * 30) * a.w * (1 - a.act);
        for (const k of clawPose) { k.p = -0.3; k.e = 1.4; k.y *= 0.4; }
      }
    }
    if (c.state === 'stagger') { bodyRz = 0.28; bodyY = 0.36; bodyRx = 0.1; }
    if (c.state === 'finished' || (c.state === 'fleeing' && c.stateT < 0.5)) {
      // Flipped on its back by the shaft, legs paddling; then rights itself.
      const u = c.state === 'finished' ? Ease.outBack(clamp01(c.stateT / 0.35)) : 1 - Ease.inOutQuad(clamp01(c.stateT / 0.5));
      bodyRz = Math.PI * u; bodyY = 0.45 + 0.35 * u;
    }
    if (c.state === 'fleeing') bodyY -= Math.max(0, c.stateT - 0.5) * 0.9; // burrows into the mud
    this.body.position.set(0, bodyY + lift + f * 0.08, f * 0.15);
    this.body.rotation.set(bodyRx + f * 0.35, bodyRy, bodyRz + sway * (1 - moving) + fs * 0.3, 'YXZ');
    this.claws.forEach((cl, i) => {
      const k = clawPose[i];
      cl.sh.rotation.set(k.p, k.y * cl.s, 0, 'YXZ');
      cl.el.rotation.set(-k.e * 0.6, -cl.s * k.e * 0.5, 0, 'YXZ');
      cl.finger.rotation.y = cl.s * k.f;
    });
    // Legs: sideways scuttle (tripod); paddle when flipped.
    const paddle = c.state === 'finished' ? 1 : 0;
    for (const L of this.legs) {
      const ph = TAU * (this.phase + L.ph);
      const step = moving + paddle;
      L.hip.rotation.y = L.s * (0.15 * Math.sin(ph) * step + (L.i - 1) * 0.35);
      L.up.rotation.z = L.s * (0.45 + 0.25 * Math.max(0, Math.sin(ph)) * step);
      L.knee.rotation.z = -L.s * (0.65 + 0.2 * Math.cos(ph) * step);
    }
  }
}

// ------------------------------------------------------------------ Bọ Ngựa Lau
export class MantisRig extends CreatureBase {
  constructor() {
    super();
    blobShadow(this.root, 0.5);
    this.body = joint(this.rig, 0, 0.62, -0.1);
    const abd = mesh(this.body, new THREE.CapsuleGeometry(0.15, 0.7, 4, 8), 0x6f8f3e, 0, 0.05, -0.38); abd.rotation.x = 1.25;
    this.thorax = joint(this.body, 0, 0.12, 0.08);
    const th = mesh(this.thorax, new THREE.CapsuleGeometry(0.08, 0.6, 4, 8), 0x7fa046, 0, 0.36, 0); th.rotation.x = -0.15;
    this.head = joint(this.thorax, 0, 0.74, 0.08);
    const hd = mesh(this.head, new THREE.ConeGeometry(0.15, 0.2, 3), 0x8fb056); hd.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) mesh(this.head, new THREE.SphereGeometry(0.05, 8, 6), 0x3a4a20, s * 0.1, 0.03, 0.02);
    this.wings = [-1, 1].map((s) => { const w = joint(this.body, s * 0.05, 0.18, -0.2); const pl = mesh(w, new THREE.BoxGeometry(0.02, 0.18, 0.75), 0x9fb26a, 0, 0, -0.32); pl.material.transparent = true; pl.material.opacity = 0.85; return { w, s }; });
    this.tintParts.push(th, abd);
    this.arms = [-1, 1].map((s) => {
      const sh = joint(this.thorax, s * 0.11, 0.55, 0.1);
      mesh(sh, new THREE.BoxGeometry(0.06, 0.06, 0.42), 0x8fb056, 0, 0, 0.2);
      const el = joint(sh, 0, 0, 0.4);
      mesh(el, new THREE.BoxGeometry(0.05, 0.05, 0.42), 0x9fc066, 0, 0, 0.2);
      for (let k = 0; k < 3; k++) mesh(el, new THREE.BoxGeometry(0.02, 0.06, 0.02), 0xd8e0a0, 0, -0.04, 0.08 + k * 0.12); // spines
      return { sh, el, s };
    });
    this.legs = [];
    for (let i = 0; i < 2; i++) for (const s of [-1, 1]) {
      const hip = joint(this.body, s * 0.08, 0, -0.05 - i * 0.28);
      const up = joint(hip); mesh(up, new THREE.BoxGeometry(0.35, 0.03, 0.03), 0x5f7f36, s * 0.17, 0, 0);
      const kn = joint(up, s * 0.34, 0, 0); mesh(kn, new THREE.BoxGeometry(0.03, 0.62, 0.03), 0x5f7f36, 0, -0.3, 0);
      this.legs.push({ hip, up, kn, s, ph: (i + (s > 0 ? 1 : 0)) % 2 * 0.5 });
    }
  }
  update(dt, c) {
    this.time += dt;
    const { f, s: fs } = this._springs(dt);
    const a = c.attack ? atkPhases(c.attack) : null;
    const moving = clamp01(c.speed / 1.2);
    this._gait(dt, c.speed, 0.7);
    // Rocking sway (mantis signature) when not moving fast.
    let rock = Math.sin(this.time * 2.6) * 0.1 * (1 - moving * 0.7);
    let thoraxP = -0.05, headP = 0.1, armP = -0.45, armE = 2.35, bodyY = 0.62, bodyP = 0, wing = 0, bodyZ = 0;
    if (a) {
      const id = c.attack.id;
      if (id === 'bn_chem_doi') {
        const strike = Math.abs(Math.sin(a.act * Math.PI * 2));
        armP = -0.45 - 0.9 * a.w + 1.8 * strike; armE = 2.35 - 1.6 * strike - 0.4 * a.w; thoraxP = -0.25 * a.w + 0.35 * strike;
      } else if (id === 'bn_rinh') {
        rock = a.hold ? 0 : Math.sin(this.time * 7) * 0.22 * a.w; // sway then freeze, then slash
        armP = -0.45 - 0.7 * a.w + 1.7 * Ease.outCubic(a.act) * (1 - a.rec); armE = 2.35 - 1.7 * a.act * (1 - a.rec); thoraxP = 0.35 * a.act * (1 - a.rec);
      } else if (id === 'bn_vo_phuc') {
        bodyY = 0.62 - 0.3 * a.w * (1 - a.act); thoraxP = 0.5 * a.w * (1 - a.act) + 0.2 * a.act;
        armP = -0.2 + 1.2 * a.act * (1 - a.rec); armE = 2.35 - 2.0 * a.act * (1 - a.rec); bodyZ = 0.2 * a.act;
      } else if (id === 'bn_nhay_lui') {
        wing = Math.max(a.w, 1 - a.rec) * (a.rec < 1 ? 1 : 0); thoraxP = -0.4 * a.w + 0.3 * a.act;
        armP = -0.3 + 1.3 * Math.sin(Math.PI * a.act); armE = 2.35 - 1.6 * Math.sin(Math.PI * a.act);
        bodyY = 0.62 + 0.45 * Math.sin(Math.PI * a.act);
      }
    }
    if (c.state === 'hop') { wing = 1; bodyY = 0.62 + 0.4 * Math.sin(Math.PI * clamp01(c.stateT / 0.6)); thoraxP = -0.3; }
    if (c.state === 'stagger') { thoraxP = 0.55; headP = 0.4; armP = 0.5; armE = 1.2; bodyY = 0.5; rock = 0; }
    if (c.state === 'finished') { const u = Ease.outCubic(clamp01(c.stateT / 0.4)); bodyP = -1.3 * u; bodyY = 0.62 - 0.35 * u; armP = 0.6; armE = 0.8; }
    if (c.state === 'fleeing') { wing = 1; bodyP = -1.3 * (1 - clamp01(c.stateT / 0.3)); bodyY = 0.62 + c.stateT * 1.6; }
    if (wing > 0) for (const w of this.wings) { w.w.rotation.set(-0.3 * wing, w.s * 1.0 * wing, w.s * 0.5 * wing * (1 + 0.3 * Math.sin(this.time * 60))); }
    else for (const w of this.wings) w.w.rotation.set(0, 0, 0);
    this.body.position.set(0, bodyY, -0.1 + bodyZ + f * 0.15);
    this.body.rotation.set(bodyP, 0, fs * 0.3, 'YXZ');
    this.thorax.rotation.set(thoraxP + rock + f * 0.5, fs * 0.4, 0, 'YXZ');
    this.head.rotation.set(headP - rock * 0.8, Math.sin(this.time * 1.3) * 0.25 * (a ? 0 : 1), 0, 'YXZ');
    for (const ar of this.arms) { ar.sh.rotation.set(armP, ar.s * 0.08, 0, 'YXZ'); ar.el.rotation.set(armE, 0, 0); }
    for (const L of this.legs) {
      const ph = TAU * (this.phase + L.ph);
      L.hip.rotation.y = L.s * 0.25 * Math.sin(ph) * moving;
      L.up.rotation.z = L.s * (0.5 + 0.2 * Math.max(0, Math.sin(ph)) * moving);
      L.kn.rotation.z = -L.s * 0.45;
    }
  }
}

// ------------------------------------------------------------------ Ụ Bùn
export class MoundRig extends CreatureBase {
  constructor() {
    super();
    blobShadow(this.root, 1.2);
    this.body = joint(this.rig, 0, 0, 0);
    this.blobs = [];
    for (const [x, y, z, r] of [[0, 0.7, 0, 0.95], [0.35, 1.4, 0.1, 0.6], [-0.4, 1.2, -0.1, 0.55], [0, 1.9, 0, 0.45]]) {
      const m = mesh(this.body, new THREE.IcosahedronGeometry(r, 1), 0x5a4532, x, y, z); this.blobs.push({ m, y }); this.tintParts.push(m);
    }
    for (let i = 0; i < 6; i++) { const rt = mesh(this.body, new THREE.CylinderGeometry(0.03, 0.05, 0.9, 4), 0x9a8f58, Math.cos(i) * 0.6, 1.6, Math.sin(i) * 0.5); rt.rotation.z = Math.cos(i * 2) * 0.6; }
    this.arms = [-1, 1].map((s) => {
      const sh = joint(this.body, s * 0.85, 1.45, 0.05);
      mesh(sh, new THREE.IcosahedronGeometry(0.3, 0), 0x5a4532, 0, -0.1, 0.05);
      const el = joint(sh, 0, -0.35, 0.15); mesh(el, new THREE.IcosahedronGeometry(0.38, 0), 0x4f3c2a, 0, -0.15, 0.1);
      return { sh, el, s };
    });
  }
  update(dt, c) {
    this.time += dt;
    const { f, s: fs } = this._springs(dt);
    const a = c.attack ? atkPhases(c.attack) : null;
    const heave = Math.sin(this.time * 1.6);
    let sy = 1 + 0.04 * heave, sxz = 1 - 0.02 * heave, lean = 0.06 * Math.sin(this.time * 1.1), armP = 0.15, armE = 0.2, roll = 0, sink = 0;
    roll = Math.sin(this.phase * TAU) * 0.08 * clamp01(c.speed);
    this._gait(dt, c.speed, 1.2);
    if (a) {
      const id = c.attack.id;
      if (id === 'ub_dap') { armP = -2.6 * Ease.outCubic(a.w) + 3.0 * Ease.inCubic(a.act) * (1 - a.rec) + 0.4 * a.rec; armE = -0.6 * a.w; lean = -0.25 * a.w + 0.5 * a.act * (1 - a.rec); sy = 1 + 0.12 * a.w - 0.2 * a.act * (1 - a.rec); }
      else if (id === 'ub_lan') { sy = 1 - 0.38 * a.w * (1 - a.rec); sxz = 1 + 0.35 * a.w * (1 - a.rec); armP = 0.6 * a.w; }
      else if (id === 'ub_lan_vien') { armP = 1.1 * a.w - 2.0 * a.act * (1 - a.rec); armE = 0.8 * a.w; lean = 0.2 * a.w - 0.25 * a.act; }
    }
    if (c.state === 'burrow') { const u = c.stateT / Math.max(0.1, c.burrowS); sink = u < 0.45 ? Ease.inQuad(u / 0.45) : u > 0.55 ? 1 - Ease.outQuad((u - 0.55) / 0.45) : 1; }
    if (c.state === 'stagger') { sy = 0.82; sxz = 1.12; lean = 0.25; armP = 0.9; armE = 0.6; }
    if (c.state === 'finished') { const u = clamp01(c.stateT / 0.6); sy = 1 - 0.25 * u + 0.05 * Math.sin(this.time * 40) * (1 - u); sxz = 1 + 0.1 * u; }
    if (c.state === 'fleeing') { const u = clamp01(c.stateT / 1.4); sy = 0.75 * (1 - u) + 0.08; sxz = 1.1 + 0.6 * u; }
    this.body.scale.set(sxz, sy * (1 - sink * 0.9), sxz);
    this.body.position.y = -sink * 0.6;
    this.body.rotation.set(lean + f * 0.3, 0, roll + fs * 0.2, 'YXZ');
    for (const ar of this.arms) { ar.sh.rotation.set(armP + Math.sin(this.time * 1.7 + ar.s) * 0.08, 0, ar.s * 0.25, 'YXZ'); ar.el.rotation.x = armE; }
  }
}

// ------------------------------------------------------------------ Lợn Lòi Đầm (boss)
export class BoarRig extends CreatureBase {
  constructor() {
    super();
    blobShadow(this.root, 2.0);
    this.body = joint(this.rig, 0, 1.35, -0.2);
    const torso = mesh(this.body, new THREE.BoxGeometry(1.7, 1.45, 3.0), 0x4a3a30);
    const mane = mesh(this.body, new THREE.BoxGeometry(0.4, 0.5, 2.6), 0x2e241e, 0, 0.85, 0.1);
    mesh(this.body, new THREE.BoxGeometry(1.5, 1.2, 0.5), 0x433429, 0, 0.05, 1.45); // shoulder hump
    this.tail = joint(this.body, 0, 0.45, -1.5); mesh(this.tail, new THREE.BoxGeometry(0.08, 0.5, 0.08), 0x2e241e, 0, -0.25, 0);
    this.neck = joint(this.body, 0, 0.05, 1.55);
    this.head = joint(this.neck, 0, 0, 0.25);
    mesh(this.head, new THREE.BoxGeometry(1.1, 1.0, 1.2), 0x4f3e33, 0, 0, 0.45);
    mesh(this.head, new THREE.BoxGeometry(0.7, 0.55, 0.6), 0x5a463a, 0, -0.2, 1.25);
    this.jaw = joint(this.head, 0, -0.42, 0.9); mesh(this.jaw, new THREE.BoxGeometry(0.6, 0.15, 0.6), 0x4a3a30, 0, 0, 0.2);
    for (const s of [-1, 1]) { const tusk = mesh(this.head, new THREE.ConeGeometry(0.07, 0.6, 6), 0xe6dcc0, s * 0.35, -0.12, 1.35); tusk.rotation.x = -1.0; }
    for (const s of [-1, 1]) mesh(this.head, new THREE.BoxGeometry(0.18, 0.3, 0.08), 0x2e241e, s * 0.45, 0.55, 0.15); // ears
    this.tintParts.push(torso, mane);
    // Khoen at the neck socket: crude ring (plain cast, no pattern); cracks are bright slits.
    this.khoen = joint(this.neck, 0, 0.05, 0.05);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.09, 6, 14), lam(0x6d665c)); this.khoen.add(this.ring);
    this.cracks = [0, 1, 2].map((i) => {
      const cm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.05), new THREE.MeshBasicMaterial({ color: 0xffc070 }));
      const ang = -0.9 + i * 0.9; cm.position.set(Math.cos(ang) * 0.72, Math.sin(ang) * 0.72, 0.05); cm.visible = false; this.khoen.add(cm); return cm;
    });
    this.legs = [[-0.6, 1.1, 0], [0.6, 1.1, 0.5], [-0.6, -1.4, 0.5], [0.6, -1.4, 0]].map(([x, z, ph], i) => {
      const hip = joint(this.body, x, -0.45, z);
      mesh(hip, new THREE.BoxGeometry(0.42, 0.55, 0.45), 0x3f322a, 0, -0.2, 0);
      const knee = joint(hip, 0, -0.45, 0);
      mesh(knee, new THREE.BoxGeometry(0.3, 0.5, 0.3), 0x3a2e26, 0, -0.22, 0);
      mesh(knee, new THREE.BoxGeometry(0.32, 0.1, 0.36), 0x241c16, 0, -0.47, 0.03); // hoof
      return { hip, knee, front: i < 2, ph, x };
    });
  }
  update(dt, c) {
    this.time += dt;
    const { f, s: fs } = this._springs(dt);
    const a = c.attack ? atkPhases(c.attack) : null;
    const id = c.attack?.id;
    const gallop = c.speed > 5 || (a && a.inAct && (id === 'll_can_lay' || id === 'll_can_khuyu' || id === 'll_ui_bun')) || c.state === 'transition_run';
    const speed = gallop ? Math.max(c.speed, 9) : c.speed;
    this._gait(dt, speed, gallop ? 3.4 : 1.9);
    const moving = clamp01(speed / 1.5);
    let bodyY = 1.35, bodyP = 0, bodyR = 0, bodyYaw = 0, neckP = 0.05 + 0.04 * Math.sin(this.time * 1.8), neckY = 0, jaw = 0.05, tailW = 0.2;
    let frontKneel = 0, rearUp = 0, paw = 0, trembleFront = 0;
    const ph = TAU * this.phase;
    if (gallop) { bodyP = 0.08 * Math.sin(ph * 2); bodyY += 0.12 * Math.abs(Math.sin(ph * 2)); neckP = 0.35; }
    if (a) {
      switch (id) {
        case 'll_hat_nanh': neckP = 0.55 * Ease.outCubic(a.w) - 1.2 * Ease.outCubic(a.act) * (1 - a.rec) + 0.2 * a.rec; bodyP = 0.06 * a.w - 0.15 * a.act * (1 - a.rec); neckY = 0.25 * a.act * (1 - a.rec); break;
        case 'll_quat_doi': neckP = 0.25 * a.w; neckY = (a.inAct ? Math.sin(a.act * Math.PI * 2) * 0.95 : 0) * (1 - a.rec); bodyR = -0.06 * neckY; break;
        case 'll_can_lay': case 'll_can_khuyu':
          if (!a.inAct && a.act === 0) { paw = a.w; neckP = 0.4 * a.w; bodyY -= 0.12 * a.w; trembleFront = id === 'll_can_khuyu' ? a.w : 0; }
          else if (a.inAct) neckP = 0.5;
          if (id === 'll_can_khuyu' && a.rec > 0) { frontKneel = Math.sin(Math.PI * Math.min(1, a.rec * 1.3)); }
          break;
        case 'll_dam_lay': rearUp = a.act > 0 ? 1 - Ease.inCubic(a.act) : Ease.outCubic(a.w); if (a.rec > 0) rearUp = 0; neckP = -0.3 * rearUp; break;
        case 'll_ui_bun': neckP = 0.8 * Ease.outCubic(a.w); bodyY -= 0.25 * a.w * (1 - a.rec); bodyP = 0.12 * a.w * (1 - a.rec); break;
        case 'll_giay_dau': neckP = 0.6 * a.w; bodyR = Math.sin(this.time * 9) * 0.18 * (a.inAct ? 1 : a.w * 0.4); neckY = Math.sin(this.time * 7) * 0.5 * (a.inAct ? 1 : 0); break;
        case 'll_rong_dau': neckP = -0.95 * Ease.outCubic(a.w) * (1 - a.rec); jaw = 0.55 * a.w * (1 - a.rec); bodyY += 0.08 * a.w * (1 - a.rec); break;
        case 'll_quay_hong': {
          // Hind feet stamp, haunches drop, head looks back, then the hindquarters whip around.
          const look = Ease.outCubic(a.w) * (1 - a.rec);
          neckY = 0.9 * look * (c.attack.side ?? 1); bodyY -= 0.15 * look; bodyP = -0.1 * look;
          bodyYaw = -(c.attack.side ?? 1) * 1.1 * Math.sin(Math.PI * a.act);
          tailW = 1.2; break;
        }
        case 'll_dui_co': neckP = 0.95 * Ease.outCubic(a.w); bodyY -= 0.3 * a.w; neckY = a.inAct ? Math.sin(this.time * 4.5) * 0.35 : 0; bodyR = neckY * 0.12; break;
        default: break;
      }
    }
    if (c.state === 'stagger' || c.state === 'pried') { frontKneel = 1; neckP = 0.6; }
    if (c.state === 'pried') { bodyY = 0.75; }
    if (c.state === 'transition') {
      const t = c.stateT; // see enemies.json transition_set_piece_0_2 beats
      if (t < 0.8) neckP = 0.5;
      else if (t < 2.0) { const u = clamp01((t - 0.8) / 0.4); neckP = 0.5 - 1.2 * Ease.outCubic(u) * (1 - clamp01((t - 1.2) / 0.8)); bodyP = -0.15 * (1 - clamp01((t - 1.0) / 1.0)); }
      else if (t < 3.4) { frontKneel = Ease.outCubic(clamp01((t - 2.0) / 0.4)); neckP = 0.9; neckY = Math.sin(t * 4.2) * 0.45; bodyR = neckY * 0.15; }
      else { frontKneel = 1 - Ease.inOutQuad(clamp01((t - 3.4) / 0.6)); neckP = 0.5; }
    }
    if (c.state === 'idle' && !a) tailW = 0.5;
    this.body.position.set(0, bodyY - 0.35 * frontKneel + f * 0.08, -0.2 + f * 0.06);
    this.body.rotation.set(bodyP + 0.22 * frontKneel - 0.55 * rearUp + f * 0.12, bodyYaw, bodyR + fs * 0.12, 'YXZ');
    this.neck.rotation.set(neckP + f * 0.25, neckY + fs * 0.3, 0, 'YXZ');
    this.head.rotation.x = f * 0.2;
    this.jaw.rotation.x = jaw;
    this.tail.rotation.z = Math.sin(this.time * (4 + tailW * 6)) * 0.35 * tailW;
    for (const L of this.legs) {
      let hip, knee;
      if (gallop) { const p2 = ph + (L.front ? 0 : Math.PI * 0.6) + (L.x > 0 ? 0.25 : 0); hip = 0.65 * Math.sin(p2); knee = 0.6 * Math.max(0, -Math.cos(p2)); }
      else { const p2 = ph + L.ph * TAU; hip = 0.35 * Math.sin(p2) * moving; knee = 0.45 * Math.max(0, Math.sin(p2 + 1.2)) * moving; }
      if (L.front && frontKneel > 0) { hip = hip * (1 - frontKneel) - 0.35 * frontKneel; knee = knee * (1 - frontKneel) + 1.9 * frontKneel; }
      if (L.front && rearUp > 0) { hip = -1.0 * rearUp; knee = 1.3 * rearUp; }
      if (!L.front && rearUp > 0) { hip = 0.45 * rearUp; }
      if (paw > 0 && L.front && L.x > 0) { const s = Math.sin(this.time * 14); hip = -0.15 + 0.55 * s * paw; knee = 0.5 + 0.4 * Math.max(0, s) * paw; }
      if (trembleFront > 0 && L.front) hip += 0.05 * wobble(this.time, L.x * 3) * trembleFront;
      L.hip.rotation.x = -hip; L.knee.rotation.x = knee;
    }
  }
  setCracks(n, enabled) { this.cracks.forEach((cm, i) => { cm.visible = enabled && i < n; }); }
}

/** Factory by enemy id. */
export function makeCreatureRig(defId) {
  if (defId === 'en_cua_cang_bun') return new CrabRig();
  if (defId === 'en_bo_ngua_lau') return new MantisRig();
  if (defId === 'en_u_bun') return new MoundRig();
  return new BoarRig();
}
