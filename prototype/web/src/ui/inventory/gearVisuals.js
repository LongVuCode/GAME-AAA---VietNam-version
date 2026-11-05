// ui/inventory/gearVisuals.js - worn gear shown on a humanoid rig (anim/rig.js) as graybox shapes:
// ramie head wrap, indigo tunic (torso tint), bronze forearm tubes, bark-cloth shin wraps, a small
// bronze bell at the waist and a fired-clay bead string at the neck. Used by the Pack preview and the
// player in the world. [SÁNG TẠO], colours from ART_DIRECTION §2 (ramie, bark cloth, indigo, bronze).
import * as THREE from 'three';

const lam = (color) => new THREE.MeshLambertMaterial({ color });
const UNDYED = 0x9a8d70;

function add(parent, geo, color, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, lam(color)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true;
  m.userData.gear03 = true; parent.add(m); return m;
}

/** Meshes of the torso / sleeves that carry the body colour (found once per rig). */
function bodyMeshes(rig) {
  if (rig.userData?.gearBody) return rig.userData.gearBody;
  const list = [];
  const want = rig._bodyHex;
  for (const j of [rig.spine, rig.chest, rig.shoulderL, rig.shoulderR]) {
    for (const m of j.children) if (m.isMesh && m.material?.color && (want == null || m.material.color.getHex() === want)) list.push({ m, base: m.material.color.getHex() });
  }
  rig.userData = rig.userData ?? {}; rig.userData.gearBody = list;
  return list;
}

/** Removes previous gear meshes and adds the ones for `worn` (gear piece ids). */
export function attachGear(rig, worn) {
  if (!rig) return;
  rig.userData = rig.userData ?? {};
  for (const m of rig.userData.gearMeshes ?? []) { m.parent?.remove(m); m.geometry.dispose(); m.material.dispose(); }
  const out = [];
  const set = new Set(worn);
  // Torso colour: the starting indigo tunic; without it the undyed shirt shows.
  if (rig._bodyHex == null) { const t = rig.chest.children.find((c) => c.isMesh); rig._bodyHex = t?.material.color.getHex(); }
  for (const b of bodyMeshes(rig)) b.m.material.color.setHex(set.has('ar_ao_gai_cham') ? b.base : UNDYED);
  if (set.has('ar_khan_gai')) {
    out.push(add(rig.neck, new THREE.TorusGeometry(0.112, 0.03, 6, 18), 0xcdbb8c, 0, 0.15, 0.01, Math.PI / 2 - 0.12));
    out.push(add(rig.neck, new THREE.BoxGeometry(0.05, 0.12, 0.02), 0xcdbb8c, 0.03, 0.08, -0.12, 0.3, 0, 0.2));
  }
  if (set.has('ar_vong_tay_ong')) for (const el of [rig.elbowL, rig.elbowR]) {
    out.push(add(el, new THREE.CylinderGeometry(0.056, 0.05, 0.13, 10, 1, true), 0xb5864a, 0, -0.16, 0));
  }
  if (set.has('ar_quan_chan_vo_cay')) for (const kn of [rig.kneeL, rig.kneeR]) {
    out.push(add(kn, new THREE.CylinderGeometry(0.072, 0.064, 0.24, 10, 1, true), 0x7a6a4e, 0, -0.17, 0));
  }
  if (set.has('tr_chuong_dong_nho')) {
    out.push(add(rig.hips, new THREE.ConeGeometry(0.045, 0.08, 10), 0xb5864a, 0.17, -0.06, 0.05));
  }
  if (set.has('tr_chuoi_hat_dat')) {
    out.push(add(rig.neck, new THREE.TorusGeometry(0.085, 0.016, 5, 14), 0x9a5a3a, 0, -0.03, 0.02, Math.PI / 2 + 0.35));
  }
  for (const m of out) m.material.side = THREE.DoubleSide;
  rig.userData.gearMeshes = out;
  rig.userData.gearKey = [...set].sort().join('|');
}

/** Key of what a rig currently shows (to skip re-attaching every frame). */
export function gearKey(worn) { return [...worn].sort().join('|'); }
