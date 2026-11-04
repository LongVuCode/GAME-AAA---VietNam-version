// meshes.js - stylized graybox figures from primitives (no external models).
import * as THREE from 'three';

const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
function part(parent, geo, color, x, y, z) {
  const m = new THREE.Mesh(geo, lam(color)); m.position.set(x, y, z); parent.add(m); return m;
}
function blobShadow(parent, r) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.userData.blobShadow = true; parent.add(m); return m; // fx: dimmed when real shadows are on
}

/** Stylized person (Cói, Bương, NPCs). Returns { root, body, rightArm, weaponMount, parts }. */
export function makeHumanoid({ body = 0x4d6a7a, skin = 0xc9a27e, hat = true, hatColor = 0xd8c48a, height = 1.0 } = {}) {
  const root = new THREE.Group();
  const rig = new THREE.Group(); rig.scale.setScalar(height); root.add(rig);
  blobShadow(root, 0.5);
  const torso = part(rig, new THREE.CapsuleGeometry(0.28, 0.6, 4, 10), body, 0, 1.0, 0);
  part(rig, new THREE.SphereGeometry(0.2, 12, 10), skin, 0, 1.62, 0);
  if (hat) { const h = part(rig, new THREE.ConeGeometry(0.42, 0.26, 16), hatColor, 0, 1.86, 0); h.userData.hat = true; }
  const legL = part(rig, new THREE.BoxGeometry(0.16, 0.6, 0.18), 0x3c3a34, -0.13, 0.32, 0);
  const legR = part(rig, new THREE.BoxGeometry(0.16, 0.6, 0.18), 0x3c3a34, 0.13, 0.32, 0);
  const armL = new THREE.Group(); armL.position.set(-0.36, 1.32, 0); rig.add(armL);
  part(armL, new THREE.BoxGeometry(0.12, 0.55, 0.12), body, 0, -0.26, 0);
  const rightArm = new THREE.Group(); rightArm.position.set(0.36, 1.32, 0); rig.add(rightArm);
  part(rightArm, new THREE.BoxGeometry(0.12, 0.55, 0.12), body, 0, -0.26, 0);
  const weaponMount = new THREE.Group(); weaponMount.position.set(0, -0.5, 0.05); rightArm.add(weaponMount);
  return { root, rig, torso, legL, legR, armL, rightArm, weaponMount };
}

export function makeSpear() {
  const g = new THREE.Group();
  const shaft = part(g, new THREE.CylinderGeometry(0.025, 0.03, 2.3, 6), 0xb8a46a, 0, 0, 0);
  shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.6;
  const tip = part(g, new THREE.ConeGeometry(0.06, 0.32, 6), 0xa86a2c, 0, 0, 1.9);
  tip.rotation.x = Math.PI / 2;
  return g;
}
export function makeAxe() {
  const g = new THREE.Group();
  const haft = part(g, new THREE.CylinderGeometry(0.03, 0.035, 1.2, 6), 0x6b4a2e, 0, 0, 0.3);
  haft.rotation.x = Math.PI / 2;
  // Asymmetric crescent blade: a squashed half-cylinder offset to one side.
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 12, 1, false, 0, Math.PI), lam(0xa86a2c));
  blade.rotation.z = Math.PI / 2; blade.position.set(0.0, 0.05, 0.85); blade.scale.set(1, 1, 1.3);
  g.add(blade);
  return g;
}
/** Mũi Sào: bamboo pole with a plain bronze cap (tool, not a weapon). */
export function makePole() {
  const g = new THREE.Group();
  const shaft = part(g, new THREE.CylinderGeometry(0.035, 0.04, 2.8, 6), 0x9fae62, 0, 0, 0);
  shaft.rotation.x = Math.PI / 2; shaft.position.z = 1.0;
  const cap = part(g, new THREE.CylinderGeometry(0.05, 0.045, 0.2, 6), 0xa86a2c, 0, 0, 2.45);
  cap.rotation.x = Math.PI / 2;
  return g;
}

export function makeCrab() {
  const root = new THREE.Group(); const rig = new THREE.Group(); root.add(rig); blobShadow(root, 0.9);
  const shell = part(rig, new THREE.SphereGeometry(0.75, 14, 8), 0x7a4a36, 0, 0.45, 0); shell.scale.set(1.2, 0.5, 1);
  part(rig, new THREE.BoxGeometry(1.5, 0.2, 0.25), 0x5e3a2a, 0, 0.42, 0.55); // thick front rim
  const clawL = new THREE.Group(); clawL.position.set(-0.6, 0.5, 0.75); rig.add(clawL);
  part(clawL, new THREE.BoxGeometry(0.3, 0.25, 0.55), 0x8a5038, 0, 0, 0.2);
  const clawR = new THREE.Group(); clawR.position.set(0.6, 0.5, 0.75); rig.add(clawR);
  part(clawR, new THREE.BoxGeometry(0.34, 0.28, 0.6), 0x8a5038, 0, 0, 0.2);
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
    const l = part(rig, new THREE.BoxGeometry(0.6, 0.06, 0.06), 0x5e3a2a, s * 0.85, 0.25, -0.2 + i * 0.3); l.rotation.z = s * 0.5;
  }
  return { root, rig, arms: [clawL, clawR], tintParts: [shell] };
}
export function makeMantis() {
  const root = new THREE.Group(); const rig = new THREE.Group(); root.add(rig); blobShadow(root, 0.5);
  const abd = part(rig, new THREE.CapsuleGeometry(0.16, 0.7, 4, 8), 0x6f8f3e, 0, 0.75, -0.35); abd.rotation.x = 1.2;
  const thorax = part(rig, new THREE.CapsuleGeometry(0.09, 0.7, 4, 8), 0x7fa046, 0, 1.25, 0.05); thorax.rotation.x = -0.25;
  part(rig, new THREE.ConeGeometry(0.14, 0.22, 3), 0x8fb056, 0, 1.68, 0.18).rotation.x = Math.PI / 2;
  const armL = new THREE.Group(); armL.position.set(-0.14, 1.45, 0.2); rig.add(armL);
  part(armL, new THREE.BoxGeometry(0.05, 0.05, 0.6), 0x8fb056, 0, -0.1, 0.3);
  const armR = new THREE.Group(); armR.position.set(0.14, 1.45, 0.2); rig.add(armR);
  part(armR, new THREE.BoxGeometry(0.05, 0.05, 0.6), 0x8fb056, 0, -0.1, 0.3);
  for (let i = 0; i < 2; i++) for (const s of [-1, 1]) { const l = part(rig, new THREE.BoxGeometry(0.03, 0.9, 0.03), 0x5f7f36, s * 0.3, 0.42, -0.2 - i * 0.3); l.rotation.z = s * 0.35; }
  return { root, rig, arms: [armL, armR], tintParts: [thorax, abd] };
}
export function makeMound() {
  const root = new THREE.Group(); const rig = new THREE.Group(); root.add(rig); blobShadow(root, 1.2);
  const parts = [];
  for (const [x, y, z, r] of [[0, 0.7, 0, 0.95], [0.35, 1.4, 0.1, 0.6], [-0.4, 1.2, -0.1, 0.55], [0, 1.9, 0, 0.45]]) {
    const m = part(rig, new THREE.IcosahedronGeometry(r, 1), 0x5a4532, x, y, z); parts.push(m);
  }
  for (let i = 0; i < 6; i++) { const rt = part(rig, new THREE.CylinderGeometry(0.03, 0.05, 0.9, 4), 0x9a8f58, Math.cos(i) * 0.6, 1.6, Math.sin(i) * 0.5); rt.rotation.z = Math.cos(i * 2) * 0.6; }
  const armL = new THREE.Group(); armL.position.set(-0.9, 1.4, 0); rig.add(armL); part(armL, new THREE.IcosahedronGeometry(0.4, 0), 0x5a4532, 0, -0.2, 0.2);
  const armR = new THREE.Group(); armR.position.set(0.9, 1.4, 0); rig.add(armR); part(armR, new THREE.IcosahedronGeometry(0.4, 0), 0x5a4532, 0, -0.2, 0.2);
  return { root, rig, arms: [armL, armR], tintParts: parts };
}
/** Lợn Lòi Đầm with a rough, plain khoen at the neck socket (no pattern, crude cast). */
export function makeBoar() {
  const root = new THREE.Group(); const rig = new THREE.Group(); root.add(rig); blobShadow(root, 2.0);
  const body = part(rig, new THREE.BoxGeometry(1.7, 1.5, 3.0), 0x4a3a30, 0, 1.35, -0.2);
  const mane = part(rig, new THREE.BoxGeometry(0.4, 0.5, 2.6), 0x2e241e, 0, 2.2, -0.1);
  const head = new THREE.Group(); head.position.set(0, 1.4, 1.4); rig.add(head);
  part(head, new THREE.BoxGeometry(1.1, 1.0, 1.2), 0x4f3e33, 0, 0, 0.4);
  part(head, new THREE.BoxGeometry(0.7, 0.55, 0.6), 0x5a463a, 0, -0.2, 1.2);
  for (const s of [-1, 1]) { const tusk = part(head, new THREE.ConeGeometry(0.07, 0.6, 6), 0xe6dcc0, s * 0.35, -0.1, 1.35); tusk.rotation.x = -1.0; }
  const legs = [];
  for (const [x, z] of [[-0.6, 0.9], [0.6, 0.9], [-0.6, -1.3], [0.6, -1.3]]) legs.push(part(rig, new THREE.BoxGeometry(0.35, 0.9, 0.35), 0x3a2e26, x, 0.45, z));
  // Khoen: crude ring segment around the neck; cracks appear as bright slits.
  const khoen = new THREE.Group(); khoen.position.set(0, 1.45, 1.0); rig.add(khoen);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.09, 6, 14), lam(0x6d665c));
  ring.rotation.y = 0; khoen.add(ring);
  const cracks = [0, 1, 2].map((i) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.05), new THREE.MeshBasicMaterial({ color: 0xffc070 }));
    const a = -0.9 + i * 0.9; c.position.set(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.05); c.visible = false; khoen.add(c); return c;
  });
  return { root, rig, head, legs, khoen, ring, cracks, arms: [], tintParts: [body, mane] };
}

/** Ground telegraph decal: ring (AoE / melee) or lane (charge). */
export function makeDecal(kind) {
  const color = kind === 'unparryable' ? 0xd0442a : 0xf4f0d0;
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 40), mat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  lane.rotation.x = -Math.PI / 2; lane.position.y = 0.05;
  return { ring, lane, mat };
}

export function makeTusk() {
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7, 6), lam(0xe6dcc0));
  m.rotation.z = Math.PI / 2; return m;
}
