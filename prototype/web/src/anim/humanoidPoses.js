// anim/humanoidPoses.js - pose library for Cói / Bương (procedural animation, [SÁNG TẠO]).
// Motion notes come from weapons.json moves[].motion (anticipation / active / follow_through) and
// FUN_PASS_0_2 §2.1: spear = low stance, the "pushing a ferry pole" shape; axe = hip-driven swing,
// curved chop because the blade is offset. No source on ancient martial arts exists (motion is
// creative). Pure data + init-time construction (no three.js).
import { makePose, offsetPose, P } from './pose.js';

/** Skeleton dimensions (m, before the per-character height scale). Shared by rig.js and the IK. */
export const SKEL = {
  hipsH: 0.92, spine: [0, 0.10, 0], chest: [0, 0.26, 0], neck: [0, 0.27, 0],
  shoulderL: [0.19, 0.2, 0], shoulderR: [-0.19, 0.2, 0], upper: 0.29, lower: 0.28,
  hipL: [0.1, -0.05, 0], hipR: [-0.1, -0.05, 0], thigh: 0.43, shin: 0.42,
};
/** Weapon grips along the weapon's local +z: right hand at the pivot (0), left hand at `left`. */
export const GRIPS = { wp_giao_dong: { left: 0.42 }, wp_riu_xeo: { left: -0.2 }, pole: { left: 0.5 } };

const NEUTRAL = makePose(null, { ikR: 1, ikL: 1, armLR: 0.12, armRR: 0.12, elbowL: 0.15, elbowR: 0.15 });

// ------------------------------------------------------------------ stances (ready, run carry, sprint carry)
const SPEAR = makePose(NEUTRAL, {
  hipsY: -0.07, hipsYaw: -0.38, spineYaw: -0.14, chestYaw: -0.08, headYaw: 0.55, spinePitch: 0.06,
  thighLP: 0.32, kneeL: 0.32, thighLR: 0.05, thighRP: -0.3, kneeR: 0.38, thighRR: 0.06, footR: -0.1,
  wpX: -0.04, wpY: -0.1, wpZ: 0.14, wpPitch: 0.06, wpYaw: 0.62, wpRoll: 0,
});
const SPEAR_RUN = makePose(SPEAR, {
  hipsY: -0.03, hipsYaw: -0.1, spineYaw: -0.08, chestYaw: -0.05, headYaw: 0.2, spinePitch: 0.1,
  thighLP: 0, kneeL: 0.15, thighRP: 0, kneeR: 0.15, footR: 0, thighLR: 0.03, thighRR: 0.03,
  wpX: -0.08, wpY: -0.16, wpZ: 0.12, wpPitch: 0.2, wpYaw: 0.75,
});
const SPEAR_SPRINT = makePose(SPEAR_RUN, {
  spinePitch: 0.3, chestPitch: 0.06, headPitch: -0.22, hipsY: -0.06,
  wpX: -0.14, wpY: -0.22, wpZ: 0.02, wpPitch: 0.42, wpYaw: 0.4,
});
const AXE = makePose(NEUTRAL, {
  hipsY: -0.06, hipsYaw: -0.16, spineYaw: -0.06, chestYaw: -0.04, headYaw: 0.25, spinePitch: 0.08,
  thighLP: 0.22, kneeL: 0.28, thighLR: 0.08, thighRP: -0.2, kneeR: 0.32, thighRR: 0.08,
  wpX: -0.1, wpY: -0.08, wpZ: 0.26, wpPitch: -0.9, wpYaw: -0.4, wpRoll: 0,
});
const AXE_RUN = makePose(AXE, {
  hipsY: -0.03, hipsYaw: 0, spineYaw: 0, chestYaw: 0, headYaw: 0, spinePitch: 0.1,
  thighLP: 0, kneeL: 0.15, thighRP: 0, kneeR: 0.15, wpX: -0.14, wpY: -0.12, wpZ: 0.22, wpPitch: -1.1, wpYaw: -0.35,
});
const AXE_SPRINT = makePose(AXE_RUN, { spinePitch: 0.32, chestPitch: 0.05, headPitch: -0.22, hipsY: -0.06, wpX: -0.2, wpY: -0.18, wpZ: 0.08, wpPitch: -0.6, wpYaw: -0.6 });
const POLE = makePose(SPEAR, { wpPitch: 0.15, wpYaw: 0.55 });
const UNARMED = makePose(NEUTRAL, { ikR: 0, ikL: 0, wpX: 0.0, wpY: 0.12, wpZ: -0.2, wpPitch: -1.35, wpYaw: 0.2 });

// ------------------------------------------------------------------ attack keyframes
// Each move: ant (end of startup: the wind-up), hit (end of active: full extension / contact),
// fol (end of follow-through), optional pre (40% of the startup) and sweepDir for the swept hitbox
// (+1 = the blade travels from the character's left to its right, -1 = right to left).
// Values are DELTAS from the weapon stance.
const SPEAR_MOVES = {
  sp_l1: { // Đâm thẳng: thu cán về hông, mũi lao thẳng như sào chống đò, rút nửa chừng
    ant: { wpZ: -0.2, wpX: -0.1, wpY: -0.05, chestYaw: -0.3, spineYaw: -0.1, hipsY: -0.05, thighRP: -0.1, kneeR: 0.15, headYaw: 0.25 },
    hit: { wpZ: 0.34, wpX: 0.24, chestYaw: 0.42, spineYaw: 0.15, spinePitch: 0.14, hipsZ: 0.1, thighLP: 0.3, kneeL: 0.3, thighRP: -0.25, kneeR: -0.2, headYaw: -0.35 },
    fol: { wpZ: 0.12, wpX: 0.1, chestYaw: 0.2, spinePitch: 0.08, thighLP: 0.2, kneeL: 0.2, headYaw: -0.15 },
  },
  sp_l2: { // Đâm rút: đâm thấp vào chân rồi giật rút
    ant: { chestYaw: -0.42, spineYaw: -0.12, wpX: -0.14, wpZ: -0.12, wpY: 0.04, hipsY: -0.04, headYaw: 0.3 },
    hit: { wpZ: 0.3, wpX: 0.2, wpY: -0.18, wpPitch: 0.32, chestYaw: 0.3, spinePitch: 0.25, hipsY: -0.08, thighLP: 0.25, kneeL: 0.45, headYaw: -0.25, headPitch: 0.15 },
    fol: { wpZ: -0.1, wpX: -0.05, wpPitch: 0.1, chestYaw: -0.1, spinePitch: 0.05, thighLP: -0.1, thighRP: -0.15 },
  },
  sp_l3: { // Quét cán: đổi tay, đuôi cán quét ngang gối
    sweepDir: 1,
    ant: { chestYaw: -0.65, spineYaw: -0.25, wpYaw: 2.3, wpX: 0.02, wpY: -0.08, wpZ: -0.05, wpPitch: -0.1, hipsY: -0.08, headYaw: 0.5 },
    hit: { chestYaw: 0.75, spineYaw: 0.25, wpYaw: 1.5, wpX: 0.16, wpY: -0.25, wpZ: 0.12, wpPitch: -0.25, hipsY: -0.14, hipsYaw: 0.25, thighLP: 0.1, kneeL: 0.5, kneeR: 0.5, headYaw: -0.5 },
    fol: { chestYaw: 0.95, spineYaw: 0.3, wpYaw: 1.25, wpX: 0.2, wpY: -0.2, wpPitch: -0.15, hipsYaw: 0.35, hipsY: -0.1, headYaw: -0.55 },
  },
  sp_l4: { // Đâm xoáy: gập gối, lao cả người, mũi xoáy
    ant: { hipsY: -0.2, kneeL: 0.65, kneeR: 0.7, thighLP: 0.2, thighRP: -0.2, wpZ: -0.18, wpX: -0.08, chestYaw: -0.3, wpRoll: -1.5, spinePitch: 0.15 },
    hit: { hipsY: -0.12, hipsZ: 0.25, spinePitch: 0.38, wpZ: 0.4, wpX: 0.24, wpRoll: 4.7, chestYaw: 0.45, thighLP: 0.6, kneeL: 0.6, thighRP: -0.6, kneeR: -0.2, headYaw: -0.4, headPitch: -0.2 },
    fol: { hipsY: -0.1, hipsZ: 0.15, spinePitch: 0.25, wpZ: 0.2, wpX: 0.12, wpRoll: 6.28, chestYaw: 0.3, thighLP: 0.45, kneeL: 0.5, thighRP: -0.45 },
  },
  sp_h1: { // Phóng mũi: ngả người, chân sau cào đất; phóng như thuyền rời bến; quỳ một gối
    ant: { spinePitch: -0.3, chestPitch: -0.05, hipsY: -0.06, wpY: 0.2, wpZ: -0.28, wpX: -0.1, wpPitch: -0.12, chestYaw: -0.35, thighRP: -0.55, kneeR: 0.35, thighLP: 0.15, kneeL: 0.2, headYaw: 0.3, headPitch: 0.2 },
    hit: { spinePitch: 0.5, hipsZ: 0.3, hipsY: -0.1, wpZ: 0.46, wpX: 0.26, wpY: 0.02, chestYaw: 0.5, thighLP: 0.85, kneeL: 0.85, thighRP: -0.85, kneeR: -0.2, headYaw: -0.45, headPitch: -0.25 },
    fol: { hipsY: -0.42, spinePitch: 0.3, wpZ: 0.1, wpY: -0.15, wpPitch: -0.55, chestYaw: 0.2, thighLP: 0.7, kneeL: 1.3, thighRP: 0.15, kneeR: 1.9, footR: -0.6, headYaw: -0.2 },
  },
  sp_b1: { // Chống giáo hất: cắm đuôi cán như chống sào, bẩy mũi hất lên, bật lùi
    sweepDir: 1,
    ant: { wpY: -0.18, wpZ: 0.02, wpPitch: -0.75, wpYaw: 0.25, spinePitch: 0.25, hipsY: -0.14, kneeL: 0.5, kneeR: 0.55, chestYaw: 0.1 },
    hit: { wpY: 0.1, wpZ: 0.12, wpPitch: -1.45, wpYaw: 0.35, spinePitch: -0.22, chestPitch: -0.1, hipsY: 0.03, thighLP: -0.1, kneeL: 0.1, kneeR: 0.1, headPitch: -0.25, chestYaw: 0.15 },
    fol: { wpY: 0.04, wpPitch: -1.1, spinePitch: -0.1, hipsZ: -0.12, thighLP: 0.25, kneeL: 0.3 },
  },
  sp_d1: { // Lướt đâm: đang lăn chống tay, bật dậy, đâm ngay
    pre: { hipsY: -0.32, kneeL: 1.0, kneeR: 1.0, thighLP: 0.5, thighRP: 0.2, spinePitch: 0.45, wpZ: -0.15 },
    ant: { hipsY: -0.18, kneeL: 0.6, kneeR: 0.6, spinePitch: 0.25, wpZ: -0.1, chestYaw: -0.2 },
    hit: { wpZ: 0.34, wpX: 0.22, chestYaw: 0.4, spinePitch: 0.18, hipsZ: 0.12, thighLP: 0.35, kneeL: 0.35, thighRP: -0.35 },
    fol: { wpZ: 0.12, chestYaw: 0.15 },
  },
  sp_c1: { // Phản mũi: cán gạt sang bên, cổ tay xoay mũi về khe hở, đâm
    ant: { wpYaw: 0.75, wpPitch: -0.5, wpX: -0.05, wpZ: 0.05, chestYaw: -0.15, spinePitch: -0.05 },
    hit: { wpZ: 0.34, wpX: 0.22, chestYaw: 0.42, spinePitch: 0.14, hipsZ: 0.08, thighLP: 0.3, kneeL: 0.3, thighRP: -0.25 },
    fol: { wpZ: 0.3, wpX: 0.2, chestYaw: 0.38, spinePitch: 0.12, thighLP: 0.28 },
  },
};
const AXE_MOVES = {
  ax_l1: { // Bổ xéo: rìu qua vai phải, bổ chéo xuống hông trái, đà kéo thân xoay theo
    sweepDir: -1,
    ant: { wpX: -0.16, wpY: 0.3, wpZ: -0.22, wpPitch: -1.35, wpYaw: -0.25, chestYaw: -0.6, spineYaw: -0.2, spinePitch: -0.08, headYaw: 0.5, thighRP: -0.1 },
    hit: { wpX: 0.26, wpY: -0.32, wpZ: 0.12, wpPitch: 2.0, wpYaw: 0.9, chestYaw: 0.55, spineYaw: 0.15, spinePitch: 0.3, hipsZ: 0.08, thighLP: 0.25, kneeL: 0.3, headYaw: -0.35 },
    fol: { wpX: 0.32, wpY: -0.38, wpZ: 0.02, wpPitch: 2.25, wpYaw: 1.3, chestYaw: 0.85, spineYaw: 0.25, spinePitch: 0.3, hipsYaw: 0.25, thighRP: 0.25, kneeR: 0.3, headYaw: -0.5 },
  },
  ax_l2: { // Bổ ngược: rìu vòng ra sau, bổ ngược từ hông lên vai bằng mặt lưỡi kia
    sweepDir: 1,
    ant: { wpX: 0.28, wpY: -0.34, wpZ: 0.0, wpPitch: 2.1, wpYaw: 1.2, wpRoll: 3.14, chestYaw: 0.8, spineYaw: 0.25, spinePitch: 0.25, hipsYaw: 0.2, headYaw: -0.45 },
    hit: { wpX: -0.18, wpY: 0.24, wpZ: 0.18, wpPitch: -1.1, wpYaw: -0.6, wpRoll: 3.14, chestYaw: -0.5, spineYaw: -0.15, spinePitch: -0.05, thighLP: 0.15, headYaw: 0.35 },
    fol: { wpX: -0.2, wpY: 0.3, wpZ: -0.02, wpPitch: -1.6, wpYaw: -0.5, wpRoll: 3.14, chestYaw: -0.55, spineYaw: -0.2, headYaw: 0.4 },
  },
  ax_l3: { // Chặt xuống: hai tay nâng rìu quá đầu, kiễng chân, chặt thẳng xuống, lưỡi cắm đất
    sweepDir: -1,
    ant: { wpX: 0.08, wpY: 0.48, wpZ: -0.12, wpPitch: -2.5, wpYaw: 0.0, chestYaw: 0.02, spinePitch: -0.22, chestPitch: -0.1, hipsY: 0.04, footL: -0.35, footR: -0.35, headPitch: -0.2 },
    hit: { wpX: 0.08, wpY: -0.25, wpZ: 0.36, wpPitch: 1.35, wpYaw: 0.15, spinePitch: 0.5, chestPitch: 0.1, hipsY: -0.2, hipsZ: 0.12, thighLP: 0.55, kneeL: 0.75, kneeR: 0.6, headPitch: 0.2 },
    fol: { wpX: 0.08, wpY: -0.27, wpZ: 0.36, wpPitch: 1.45, wpYaw: 0.15, spinePitch: 0.52, chestPitch: 0.1, hipsY: -0.21, hipsZ: 0.12, thighLP: 0.55, kneeL: 0.78, kneeR: 0.62 },
  },
  ax_l4: { // Xoay rìu: hạ thấp, rìu kéo sát đất, xoay một vòng, loạng choạng
    sweepDir: 1,
    ant: { hipsY: -0.2, kneeL: 0.6, kneeR: 0.6, wpX: -0.22, wpY: -0.3, wpZ: -0.2, wpPitch: 0.6, wpYaw: -2.0, chestYaw: -0.7, spineYaw: -0.3, spinePitch: 0.2, headYaw: 0.6 },
    hit: { hipsY: -0.14, hipsYaw: 3.3, kneeL: 0.45, kneeR: 0.45, wpX: -0.3, wpY: -0.1, wpZ: 0.2, wpPitch: 0.25, wpYaw: -1.45, chestYaw: 0.2, spinePitch: 0.1 },
    fol: { hipsY: -0.08, hipsYaw: 6.28, wpX: -0.24, wpY: -0.22, wpZ: 0.2, wpPitch: 0.6, wpYaw: -1.0, chestYaw: 0.35, spinePitch: 0.15, thighRP: 0.3, kneeR: 0.4 },
  },
  ax_h1: { // Bổ gồng: ngửa người, rìu sau gáy; bước dài, bổ cả thân; rìu cắm
    sweepDir: -1,
    ant: { wpX: 0.04, wpY: 0.38, wpZ: -0.32, wpPitch: -2.85, wpYaw: 0.05, spinePitch: -0.32, chestPitch: -0.12, hipsY: -0.04, thighRP: -0.45, kneeR: 0.4, headPitch: -0.1 },
    hit: { wpX: 0.06, wpY: -0.3, wpZ: 0.4, wpPitch: 1.45, wpYaw: 0.12, spinePitch: 0.62, chestPitch: 0.12, hipsY: -0.26, hipsZ: 0.22, thighLP: 0.8, kneeL: 0.95, thighRP: -0.7, kneeR: 0.1, headPitch: 0.2 },
    fol: { wpX: 0.06, wpY: -0.32, wpZ: 0.4, wpPitch: 1.5, wpYaw: 0.12, spinePitch: 0.6, chestPitch: 0.12, hipsY: -0.27, hipsZ: 0.22, thighLP: 0.8, kneeL: 0.98, thighRP: -0.7, kneeR: 0.12 },
  },
  ax_b1: { // Móc lưỡi: xoay mũi lưỡi vào trong, móc rồi kéo về
    sweepDir: 1,
    ant: { wpX: 0.12, wpY: 0.1, wpZ: 0.24, wpPitch: -0.1, wpYaw: 0.75, wpRoll: 1.57, chestYaw: 0.35, spinePitch: 0.15, thighLP: 0.2 },
    hit: { wpX: -0.12, wpY: -0.05, wpZ: 0.02, wpPitch: 0.15, wpYaw: -0.35, wpRoll: 1.57, chestYaw: -0.45, spinePitch: -0.08, hipsZ: -0.1, thighLP: 0.05, thighRP: -0.35 },
    fol: { wpX: -0.15, wpY: -0.08, wpZ: -0.02, wpPitch: 0.2, wpYaw: -0.4, wpRoll: 1.57, chestYaw: -0.5, hipsZ: -0.15, thighRP: -0.45, kneeR: 0.45 },
  },
  ax_d1: { // Lướt bổ: đang lăn xoay người, rìu ngang hông, bật dậy bổ ngang
    sweepDir: -1,
    pre: { hipsY: -0.3, kneeL: 0.95, kneeR: 0.95, spinePitch: 0.4 },
    ant: { wpX: -0.28, wpY: -0.12, wpZ: -0.08, wpPitch: 0.1, wpYaw: -1.5, chestYaw: -0.55, hipsY: -0.12, kneeL: 0.4, kneeR: 0.4 },
    hit: { wpX: 0.22, wpY: -0.1, wpZ: 0.3, wpPitch: 0.15, wpYaw: 1.1, chestYaw: 0.6, spinePitch: 0.15, thighLP: 0.25, kneeL: 0.3 },
    fol: { wpX: 0.24, wpY: -0.12, wpZ: 0.18, wpPitch: 0.2, wpYaw: 1.4, chestYaw: 0.8, spinePitch: 0.12 },
  },
  ax_c1: { // Phản rìu: cán gạt, lưỡi lật về phía đối thủ, bổ ngang
    sweepDir: -1,
    ant: { wpX: -0.2, wpY: 0.0, wpZ: 0.12, wpPitch: -0.4, wpYaw: -1.1, chestYaw: -0.45 },
    hit: { wpX: 0.22, wpY: -0.08, wpZ: 0.3, wpPitch: 0.15, wpYaw: 1.1, chestYaw: 0.6, spinePitch: 0.15, thighLP: 0.25, kneeL: 0.3 },
    fol: { wpX: 0.22, wpY: -0.1, wpZ: 0.24, wpPitch: 0.2, wpYaw: 1.2, chestYaw: 0.65, spinePitch: 0.12 },
  },
};
// Đòn nhà "Chống sào" (perfect parry, H) reuses the vaulting upswing shape with a bigger shove.
SPEAR_MOVES.house = { ...SPEAR_MOVES.sp_b1, hit: { ...SPEAR_MOVES.sp_b1.hit, hipsZ: 0.15, spinePitch: -0.3 } };
AXE_MOVES.house = AXE_MOVES.ax_b1;

/** Builds keyframe pose arrays (absolute) for every move of a weapon. */
function buildMoves(stance, table) {
  const out = {};
  for (const [id, m] of Object.entries(table)) {
    out[id] = {
      sweepDir: m.sweepDir ?? 1,
      pre: m.pre ? offsetPose(stance, m.pre) : null,
      ant: offsetPose(stance, m.ant), hit: offsetPose(stance, m.hit), fol: offsetPose(stance, m.fol),
    };
  }
  return out;
}

// ------------------------------------------------------------------ action poses (deltas from stance)
const SPEAR_ACTIONS = {
  parry: { wpX: 0.04, wpY: 0.12, wpZ: 0.12, wpPitch: -1.0, wpYaw: 0.35, chestYaw: 0.3, spinePitch: -0.06, hipsY: -0.04 },
  guard: { wpX: -0.18, wpY: 0.12, wpZ: 0.2, wpPitch: 0.0, wpYaw: 1.57, chestYaw: 0.4, spineYaw: 0.14, hipsYaw: 0.2, hipsY: -0.1, kneeL: 0.25, kneeR: 0.25, headYaw: -0.45 },
  burstRaise: { wpX: 0.1, wpY: 0.25, wpZ: 0.05, wpPitch: -1.25, wpYaw: 0.2, chestYaw: 0.3, spinePitch: -0.1 },
};
const AXE_ACTIONS = {
  parry: { wpX: 0.1, wpY: 0.0, wpZ: 0.1, wpPitch: -0.55, wpYaw: 0.7, chestYaw: 0.25, hipsY: -0.04 },
  guard: { wpX: 0.04, wpY: 0.0, wpZ: 0.06, wpPitch: -0.6, wpYaw: 0.4, chestYaw: 0.04, hipsY: -0.1, kneeL: 0.25, kneeR: 0.25 },
  burstRaise: { wpX: 0.04, wpY: 0.42, wpZ: -0.1, wpPitch: -2.4, chestYaw: 0.04, spinePitch: -0.15 },
};

function weaponLib(stance, run, sprint, moves, actions, lightIds) {
  return {
    stance, run, sprint, moves: buildMoves(stance, moves),
    parry: offsetPose(stance, actions.parry), guard: offsetPose(stance, actions.guard), burstRaise: offsetPose(stance, actions.burstRaise),
    lightIds,
  };
}

export const LIB = {
  wp_giao_dong: weaponLib(SPEAR, SPEAR_RUN, SPEAR_SPRINT, SPEAR_MOVES, SPEAR_ACTIONS, ['sp_l1', 'sp_l2', 'sp_l3', 'sp_l4']),
  wp_riu_xeo: weaponLib(AXE, AXE_RUN, AXE_SPRINT, AXE_MOVES, AXE_ACTIONS, ['ax_l1', 'ax_l2', 'ax_l3', 'ax_l4']),
  pole: { stance: POLE },
  unarmed: { stance: UNARMED },
};

// Whole-body poses (absolute), built on the spear stance or the unarmed base.
export const BODY = {
  // Dodge roll (tucked ball) and its exit; the tumble angle is animated by the animator.
  rollTuck: makePose(SPEAR_RUN, { hipsY: -0.48, spinePitch: 0.9, chestPitch: 0.35, headPitch: 0.6, thighLP: 1.75, kneeL: 2.3, thighRP: 1.6, kneeR: 2.3,
    wpX: -0.02, wpY: 0.05, wpZ: 0.12, wpPitch: -1.3, wpYaw: 0.2, hipsYaw: 0, spineYaw: 0, chestYaw: 0, headYaw: 0 }),
  backstep: makePose(SPEAR, { hipsY: -0.12, spinePitch: -0.12, thighLP: 0.45, kneeL: 0.5, thighRP: 0.05, kneeR: 0.7, hipsZ: -0.05 }),
  // Hit recoil (additive, scaled by a spring): snap back + lift the head.
  hitAdd: makePose(null, { chestPitch: -0.32, spinePitch: -0.18, headPitch: -0.32, hipsZ: -0.07, hipsY: -0.03, wpY: 0.06, wpPitch: -0.2 }),
  hitSideAdd: makePose(null, { chestRoll: 0.28, chestYaw: 0.18, headYaw: 0.2 }),
  knockdown: makePose(SPEAR_RUN, { hipsY: -0.78, tumblePitch: -1.45, spinePitch: 0.25, headPitch: 0.35, thighLP: 0.6, kneeL: 0.9, thighRP: 0.3, kneeR: 0.5, wpPitch: -0.5, ikL: 0, armLP: 0.4, armLR: 0.6, elbowL: 0.4 }),
  getUp: makePose(SPEAR, { hipsY: -0.4, spinePitch: 0.6, thighLP: 0.9, kneeL: 1.6, thighRP: 0.0, kneeR: 1.9, footR: -0.5 }),
  guardBreak: makePose(SPEAR_RUN, { hipsY: -0.2, spinePitch: 0.55, chestPitch: 0.2, headPitch: 0.25, kneeL: 0.5, kneeR: 0.5, wpY: -0.25, wpPitch: 0.7, ikL: 0.2, armLP: 0.1, armLR: 0.25, elbowL: 0.2 }),
  dead: makePose(SPEAR_RUN, { hipsY: -0.82, tumblePitch: -1.5, spinePitch: 0.05, headPitch: -0.1, thighLP: 0.15, kneeL: 0.2, thighRP: 0.05, ikL: 0, ikR: 0, armLR: 0.9, armRR: 0.9, wpPitch: 1.4 }),
  heal: makePose(SPEAR_RUN, { ikL: 0, armLP: 1.45, armLR: 0.0, armLY: 0.55, elbowL: 2.35, headPitch: 0.12, spinePitch: 0.08, wpX: -0.18, wpY: -0.32, wpZ: 0.12, wpPitch: 0.95, wpYaw: 0.3 }),
  call: makePose(SPEAR_RUN, { ikL: 0, armLP: 1.6, armLR: 0.05, armLY: 0.6, elbowL: 2.3, headPitch: -0.25, spinePitch: -0.08, chestPitch: -0.08, wpX: -0.18, wpY: -0.32, wpZ: 0.12, wpPitch: 0.95, wpYaw: 0.3 }),
  craft: makePose(UNARMED, { spinePitch: 0.4, chestPitch: 0.1, headPitch: 0.3, hipsY: -0.12, kneeL: 0.3, kneeR: 0.3, thighLP: 0.2, armLP: 0.7, armLR: 0.1, elbowL: 1.0, armRP: 1.2, armRR: 0.15, elbowR: 1.2 }),
  handover: makePose(POLE, { hipsY: -0.42, spinePitch: 0.12, thighLP: 1.05, kneeL: 1.35, thighRP: -0.05, kneeR: 1.95, footR: -0.6, hipsYaw: 0, spineYaw: 0, chestYaw: 0, headYaw: 0, headPitch: 0.2,
    wpX: -0.24, wpY: -0.02, wpZ: 0.38, wpPitch: 0.0, wpYaw: 1.57 }),
  pry: makePose(POLE, { spinePitch: 0.35, chestPitch: 0.08, hipsY: -0.12, kneeL: 0.45, kneeR: 0.5, thighLP: 0.4, thighRP: -0.35, chestYaw: 0.1, headYaw: 0.3,
    wpX: -0.12, wpY: 0.02, wpZ: 0.18, wpPitch: 0.35, wpYaw: 0.4 }),
  // One pry beat pushes the handle down: tip rises under the khoen (lever).
  pryLeverAdd: makePose(null, { wpY: -0.1, wpPitch: -0.16, hipsY: -0.06, spinePitch: 0.12 }),
  vault: makePose(SPEAR_RUN, { hipsY: 0.22, spinePitch: 0.35, thighLP: 1.3, kneeL: 1.8, thighRP: 0.7, kneeR: 1.5, wpY: 0.05, wpPitch: 0.1 }),
  skidAdd: makePose(null, { spinePitch: -0.3, thighLP: 0.45, kneeL: 0.15, thighRP: -0.1, kneeR: 0.6, hipsY: -0.08 }),
  pivotAdd: makePose(null, { hipsY: -0.1, spinePitch: 0.2, kneeL: 0.4, kneeR: 0.4 }),
  stompAdd: makePose(null, { thighLP: 0.95, kneeL: 1.25, spinePitch: -0.05, hipsY: 0.02 }),
  swapStow: makePose(null, { wpX: 0.1, wpY: 0.25, wpZ: -0.32, wpPitch: -1.0, chestYaw: -0.3 }),
};

export { P };
