// anim/pose.js - humanoid pose layout (a flat Float32Array of joint parameters) and pose math.
// Pure (no three.js). Conventions (applied by anim/rig.js):
//   pitch +  = bend forward (spine/chest/head), leg swings forward (thigh), arm raised forward (FK arm)
//   yaw   +  = turn to the character's left (counter-clockwise seen from above)
//   roll  +  = lean to the character's right
//   knee  +  = bend (shin back), elbow + = bend (forearm up), foot + = toes up
//   wp*      = weapon pivot (the rear / right-hand grip) in CHEST space: x + = character's left,
//              y + = up, z + = forward; wpPitch + = tip down, wpYaw + = tip to the left.
//   ikR/ikL  = 0..1 weight of the two-hand grip IK (1 = hand on the weapon grip, 0 = FK arm angles).
//   hipsY    = hips height offset (m); hipsZ / hipsX = hips forward / left offset (m).
//   roll*    = whole-body tumble (dodge roll), applied at the hips after the other rotations.
export const P = {
  hipsY: 0, hipsZ: 1, hipsX: 2, hipsPitch: 3, hipsYaw: 4, hipsRoll: 5,
  spinePitch: 6, spineYaw: 7, spineRoll: 8, chestPitch: 9, chestYaw: 10, chestRoll: 11, headPitch: 12, headYaw: 13,
  thighLP: 14, thighLR: 15, kneeL: 16, footL: 17, thighRP: 18, thighRR: 19, kneeR: 20, footR: 21,
  wpX: 22, wpY: 23, wpZ: 24, wpPitch: 25, wpYaw: 26, wpRoll: 27, ikR: 28, ikL: 29,
  armLP: 30, armLR: 31, armLY: 32, elbowL: 33, armRP: 34, armRR: 35, armRY: 36, elbowR: 37,
  tumblePitch: 38, tumbleRoll: 39,
  N: 40,
};
export const POSE_KEYS = Object.keys(P).filter((k) => k !== 'N');

export const newPose = () => new Float32Array(P.N);
export function copyPose(out, a) { out.set(a); return out; }
export function lerpPose(out, a, b, t) { for (let i = 0; i < P.N; i++) out[i] = a[i] + (b[i] - a[i]) * t; return out; }
/** out = base + add * w (additive layer). */
export function addPose(out, base, add, w = 1) { for (let i = 0; i < P.N; i++) out[i] = base[i] + add[i] * w; return out; }
/** Blend toward b by t, in place. */
export function blendInto(out, b, t) { if (t <= 0) return out; if (t >= 1) return copyPose(out, b); for (let i = 0; i < P.N; i++) out[i] += (b[i] - out[i]) * t; return out; }

/** Init-time helper: base pose with named overrides ({ chestYaw: -0.5, ... }). */
export function makePose(base, overrides = {}) {
  const p = base ? Float32Array.from(base) : newPose();
  for (const [k, v] of Object.entries(overrides)) { if (!(k in P)) throw new Error(`unknown pose key ${k}`); p[P[k]] = v; }
  return p;
}
/** Init-time helper: overrides relative to a base ({ chestYaw: +0.2 } adds 0.2). */
export function offsetPose(base, deltas = {}) {
  const p = Float32Array.from(base);
  for (const [k, v] of Object.entries(deltas)) { if (!(k in P)) throw new Error(`unknown pose key ${k}`); p[P[k]] += v; }
  return p;
}
