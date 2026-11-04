// anim/rig.js - hierarchical graybox humanoid (three.js): hips, spine, chest, head, two arms with
// elbows, two legs with knees and feet, a weapon pivot in chest space. apply(pose) maps the pose
// array (anim/pose.js) onto the joints; both hands follow the weapon grips with two-bone IK.
// Still primitive shapes (graybox), but jointed. No allocation per frame.
import * as THREE from 'three';
import { P } from './pose.js';
import { SKEL } from './humanoidPoses.js';
import { solveTwoBone, createIkResult } from './ik.js';

const lam = (color) => new THREE.MeshLambertMaterial({ color });
function mesh(parent, geo, color, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, lam(color)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
function joint(parent, [x, y, z], name) { const g = new THREE.Group(); g.position.set(x, y, z); g.name = name; parent.add(g); return g; }
function blobShadow(parent, r) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.userData.blobShadow = true; parent.add(m); return m;
}

const _m = new THREE.Matrix4(), _qIk = new THREE.Quaternion(), _qFk = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _v = new THREE.Vector3(), _xA = new THREE.Vector3(), _yA = new THREE.Vector3(), _zA = new THREE.Vector3();
const _sh = [0, 0, 0], _tg = [0, 0, 0];
const POLE_L = [0.9, -0.7, -0.5], POLE_R = [-0.9, -0.6, -0.6];

export class HumanoidRig {
  constructor({ body = 0x4d6a7a, skin = 0xc9a27e, legs = 0x3c3a34, hat = true, hatColor = 0xd8c48a, height = 1.0 } = {}) {
    const S = SKEL;
    this.root = new THREE.Group();
    this.scaleG = new THREE.Group(); this.scaleG.scale.setScalar(height); this.root.add(this.scaleG);
    blobShadow(this.root, 0.5);
    this.hipsPos = joint(this.scaleG, [0, S.hipsH, 0], 'hipsPos');
    this.tumble = joint(this.hipsPos, [0, 0, 0], 'tumble');
    this.hips = joint(this.tumble, [0, 0, 0], 'hips');
    mesh(this.hips, new THREE.BoxGeometry(0.32, 0.16, 0.2), legs, 0, 0.01, 0);
    this.spine = joint(this.hips, S.spine, 'spine');
    mesh(this.spine, new THREE.CapsuleGeometry(0.135, 0.1, 3, 8), body, 0, 0.11, 0).scale.z = 0.8;
    this.chest = joint(this.spine, S.chest, 'chest');
    const torso = mesh(this.chest, new THREE.CapsuleGeometry(0.17, 0.16, 4, 10), body, 0, 0.1, 0); torso.scale.set(1.05, 1, 0.72);
    this.neck = joint(this.chest, S.neck, 'neck');
    mesh(this.neck, new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8), skin, 0, 0.0, 0);
    this.head = mesh(this.neck, new THREE.SphereGeometry(0.115, 14, 10), skin, 0, 0.12, 0.01);
    mesh(this.neck, new THREE.BoxGeometry(0.06, 0.03, 0.05), skin, 0, 0.1, 0.12); // nose: shows where the head faces
    if (hat) { const h = mesh(this.neck, new THREE.ConeGeometry(0.4, 0.2, 16), hatColor, 0, 0.29, 0.01); h.userData.hat = true; }
    // Arms: shoulder -> elbow -> hand (rest direction -Y).
    const arm = (side) => {
      const sh = joint(this.chest, side > 0 ? S.shoulderL : S.shoulderR, side > 0 ? 'shoulderL' : 'shoulderR');
      mesh(sh, new THREE.SphereGeometry(0.065, 8, 6), body);
      mesh(sh, new THREE.CapsuleGeometry(0.05, S.upper - 0.08, 3, 8), body, 0, -S.upper / 2, 0);
      const el = joint(sh, [0, -S.upper, 0], 'elbow');
      mesh(el, new THREE.CapsuleGeometry(0.043, S.lower - 0.07, 3, 8), skin, 0, -S.lower / 2, 0);
      const hand = joint(el, [0, -S.lower, 0], 'hand');
      mesh(hand, new THREE.BoxGeometry(0.075, 0.09, 0.07), skin, 0, -0.02, 0);
      return { sh, el, hand };
    };
    const L = arm(1), R = arm(-1);
    this.shoulderL = L.sh; this.elbowL = L.el; this.handL = L.hand;
    this.shoulderR = R.sh; this.elbowR = R.el; this.handR = R.hand;
    // Legs: hip -> knee -> ankle.
    const leg = (side) => {
      const hp = joint(this.hips, side > 0 ? S.hipL : S.hipR, side > 0 ? 'hipL' : 'hipR');
      mesh(hp, new THREE.CapsuleGeometry(0.075, S.thigh - 0.12, 3, 8), legs, 0, -S.thigh / 2, 0);
      const kn = joint(hp, [0, -S.thigh, 0], 'knee');
      mesh(kn, new THREE.CapsuleGeometry(0.06, S.shin - 0.1, 3, 8), legs, 0, -S.shin / 2, 0);
      const an = joint(kn, [0, -S.shin, 0], 'ankle');
      mesh(an, new THREE.BoxGeometry(0.1, 0.06, 0.22), 0x2e2a24, 0, -0.01, 0.05);
      return { hp, kn, an };
    };
    const LL = leg(1), RL = leg(-1);
    this.thighL = LL.hp; this.kneeL = LL.kn; this.ankleL = LL.an;
    this.thighR = RL.hp; this.kneeR = RL.kn; this.ankleR = RL.an;
    // Weapon pivot (right-hand grip) in chest space.
    this.weaponPivot = joint(this.chest, [0, 0, 0], 'weaponPivot');
    this.gripLeft = 0.42;
    this.ik = createIkResult();
    this.joints = { hips: this.hips, spine: this.spine, chest: this.chest, neck: this.neck, shoulderL: this.shoulderL, shoulderR: this.shoulderR,
      elbowL: this.elbowL, elbowR: this.elbowR, thighL: this.thighL, thighR: this.thighR, kneeL: this.kneeL, kneeR: this.kneeR };
  }

  /** Hand-on-grip IK for one arm (chest space); w blends from the FK rotation already set. */
  _armIk(shoulder, elbow, target, pole, w) {
    if (w <= 0) return;
    _sh[0] = shoulder.position.x; _sh[1] = shoulder.position.y; _sh[2] = shoulder.position.z;
    _tg[0] = target.x; _tg[1] = target.y; _tg[2] = target.z;
    const r = solveTwoBone(_sh, _tg, pole, SKEL.upper, SKEL.lower, this.ik);
    _xA.fromArray(r.xAxis); _yA.fromArray(r.yAxis); _zA.fromArray(r.zAxis);
    _m.makeBasis(_xA, _yA, _zA); _qIk.setFromRotationMatrix(_m);
    if (w >= 1) shoulder.quaternion.copy(_qIk); else { _qFk.copy(shoulder.quaternion); shoulder.quaternion.copy(_qFk).slerp(_qIk, w); }
    elbow.rotation.x = elbow.rotation.x * (1 - w) + (-r.bend) * w;
  }

  apply(p) {
    this.hipsPos.position.set(p[P.hipsX], SKEL.hipsH + p[P.hipsY], p[P.hipsZ]);
    this.tumble.rotation.set(p[P.tumblePitch], 0, p[P.tumbleRoll]);
    this.hips.rotation.set(p[P.hipsPitch], p[P.hipsYaw], p[P.hipsRoll], 'YXZ');
    this.spine.rotation.set(p[P.spinePitch], p[P.spineYaw], p[P.spineRoll], 'YXZ');
    this.chest.rotation.set(p[P.chestPitch], p[P.chestYaw], p[P.chestRoll], 'YXZ');
    this.neck.rotation.set(p[P.headPitch], p[P.headYaw], 0, 'YXZ');
    this.thighL.rotation.set(-p[P.thighLP], 0, p[P.thighLR], 'XZY');
    this.thighR.rotation.set(-p[P.thighRP], 0, -p[P.thighRR], 'XZY');
    this.kneeL.rotation.x = p[P.kneeL]; this.kneeR.rotation.x = p[P.kneeR];
    this.ankleL.rotation.x = -p[P.footL] - p[P.kneeL] * 0.35; this.ankleR.rotation.x = -p[P.footR] - p[P.kneeR] * 0.35;
    const wp = this.weaponPivot;
    wp.position.set(p[P.wpX], p[P.wpY], p[P.wpZ]);
    wp.rotation.set(p[P.wpPitch], p[P.wpYaw], p[P.wpRoll], 'YXZ');
    // FK arms first (also the IK blend source).
    this.shoulderL.rotation.set(-p[P.armLP], -p[P.armLY], p[P.armLR], 'YXZ');
    this.shoulderR.rotation.set(-p[P.armRP], p[P.armRY], -p[P.armRR], 'YXZ');
    this.elbowL.rotation.x = -p[P.elbowL]; this.elbowR.rotation.x = -p[P.elbowR];
    const ikR = p[P.ikR], ikL = p[P.ikL];
    if (ikR > 0 || ikL > 0) {
      wp.updateMatrix();
      if (ikR > 0) { _v.set(0, 0, 0).applyMatrix4(wp.matrix); this._armIk(this.shoulderR, this.elbowR, _v, POLE_R, ikR); }
      if (ikL > 0) { _v.set(0, 0, this.gripLeft).applyMatrix4(wp.matrix); this._armIk(this.shoulderL, this.elbowL, _v, POLE_L, ikL); }
    }
  }

  /** Current local rotation angles of the main joints (debug / smoke: "joints move"). */
  jointAngles() {
    const j = this.joints;
    return { thighL: +j.thighL.rotation.x.toFixed(3), thighR: +j.thighR.rotation.x.toFixed(3), kneeL: +j.kneeL.rotation.x.toFixed(3), kneeR: +j.kneeR.rotation.x.toFixed(3),
      elbowL: +j.elbowL.rotation.x.toFixed(3), elbowR: +j.elbowR.rotation.x.toFixed(3), chestYaw: +j.chest.rotation.y.toFixed(3), spinePitch: +j.spine.rotation.x.toFixed(3),
      hipsY: +this.hipsPos.position.y.toFixed(3), weaponZ: +this.weaponPivot.position.z.toFixed(3), weaponPitch: +this.weaponPivot.rotation.x.toFixed(3) };
  }
}

/** Non-combat person (NPC): jointed rig in a relaxed unarmed pose. */
export function makePersonRig(opts) {
  const rig = new HumanoidRig(opts);
  const p = new Float32Array(P.N);
  p[P.armLR] = 0.12; p[P.armRR] = 0.12; p[P.elbowL] = 0.2; p[P.elbowR] = 0.2; p[P.wpY] = -5; // weapon pivot unused
  rig.apply(p);
  rig.idlePose = p;
  return rig;
}
