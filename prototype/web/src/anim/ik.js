// anim/ik.js - analytic two-bone IK (shoulder -> elbow -> wrist) used to keep both hands on a
// two-handed weapon. Pure math on plain arrays, no allocation per call (results go in `out`).
// Bone rest direction is -Y (arm hanging down); the elbow hinge is the bone's local X axis and a
// positive bend folds the forearm toward the bone's local +Z (the side the pole points to).

const v3 = () => [0, 0, 0];
function sub(o, a, b) { o[0] = a[0] - b[0]; o[1] = a[1] - b[1]; o[2] = a[2] - b[2]; return o; }
function len(a) { return Math.hypot(a[0], a[1], a[2]); }
function scale(o, a, s) { o[0] = a[0] * s; o[1] = a[1] * s; o[2] = a[2] * s; return o; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(o, a, b) { const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; o[0] = x; o[1] = y; o[2] = z; return o; }
function norm(o, a) { const l = len(a) || 1; return scale(o, a, 1 / l); }

export function createIkResult() {
  return { elbow: v3(), hand: v3(), xAxis: v3(), yAxis: v3(), zAxis: v3(), bend: 0, reach: 0, clamped: false };
}
const _d = v3(), _p = v3(), _t = v3(), _u = v3(), _f = v3();

/**
 * shoulder, target, pole: [x,y,z] in the parent space of the shoulder joint. upper/lower: bone lengths.
 * out.xAxis/yAxis/zAxis: columns of the shoulder joint rotation (its local axes in parent space),
 * with yAxis = -upperArmDir; out.bend: elbow rotation (rad, >= 0) about the elbow's local X.
 */
export function solveTwoBone(shoulder, target, pole, upper, lower, out) {
  sub(_d, target, shoulder);
  let d = len(_d);
  const maxR = upper + lower - 1e-4, minR = Math.abs(upper - lower) + 1e-4;
  out.clamped = d > maxR || d < minR;
  const dist = Math.max(minR, Math.min(maxR, d || minR));
  if (d < 1e-6) { _d[0] = 0; _d[1] = -1; _d[2] = 0; d = 1; }
  norm(_d, _d);
  // Pole direction projected onto the plane orthogonal to the reach direction.
  scale(_p, _d, dot(pole, _d)); sub(_p, pole, _p);
  if (len(_p) < 1e-5) { _p[0] = 0; _p[1] = 0; _p[2] = 1; scale(_t, _d, dot(_p, _d)); sub(_p, _p, _t); }
  norm(_p, _p);
  const cosA = Math.max(-1, Math.min(1, (upper * upper + dist * dist - lower * lower) / (2 * upper * dist)));
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  // Upper arm direction and elbow position.
  _u[0] = _d[0] * cosA + _p[0] * sinA; _u[1] = _d[1] * cosA + _p[1] * sinA; _u[2] = _d[2] * cosA + _p[2] * sinA;
  out.elbow[0] = shoulder[0] + _u[0] * upper; out.elbow[1] = shoulder[1] + _u[1] * upper; out.elbow[2] = shoulder[2] + _u[2] * upper;
  out.hand[0] = shoulder[0] + _d[0] * dist; out.hand[1] = shoulder[1] + _d[1] * dist; out.hand[2] = shoulder[2] + _d[2] * dist;
  sub(_f, out.hand, out.elbow); norm(_f, _f);
  // Joint frame: Y = -upper, Z = forearm component orthogonal to the upper arm, X = Y x Z.
  scale(out.yAxis, _u, -1);
  scale(_t, _u, dot(_f, _u)); sub(out.zAxis, _f, _t);
  if (len(out.zAxis) < 1e-5) { scale(out.zAxis, _p, -1); }
  norm(out.zAxis, out.zAxis);
  cross(out.xAxis, out.yAxis, out.zAxis);
  const cosB = Math.max(-1, Math.min(1, dot(_u, _f)));
  out.bend = Math.acos(cosB);
  out.reach = dist;
  return out;
}
