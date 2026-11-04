// meshes.js - graybox props from primitives (no external models): weapons, the Mũi Sào pole, telegraph
// decals, the shed tusk. Jointed characters live in src/anim (rig.js, creatures.js).
import * as THREE from 'three';
import { makePersonRig } from '../anim/rig.js';

const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
function part(parent, geo, color, x, y, z) {
  const m = new THREE.Mesh(geo, lam(color)); m.position.set(x, y, z); parent.add(m); return m;
}

/** Stylized person (NPCs): jointed rig (anim/rig.js) in a relaxed pose. Returns { root, rig }. */
export function makeHumanoid(opts = {}) {
  const rig = makePersonRig(opts);
  return { root: rig.root, rig };
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
