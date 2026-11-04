// lockon.js - lock-on target choice (combat_tuning.lock_on). Vectors are {x, z} on the ground plane.
const deg = (r) => (r * 180) / Math.PI;

export function angleBetween(fx, fz, dx, dz) {
  const lf = Math.hypot(fx, fz) || 1, ld = Math.hypot(dx, dz) || 1;
  const c = Math.max(-1, Math.min(1, (fx * dx + fz * dz) / (lf * ld)));
  return deg(Math.acos(c));
}

/**
 * candidates: [{ id, x, z, lockable }]. Returns best id inside max distance and acquire cone
 * (full cone angle), scored by angle then distance; falls back to the nearest in range when nothing
 * is in the cone (so a press never silently fails while an enemy is close).
 */
export function pickLockTarget(from, forward, candidates, tuning) {
  let best = null, bestScore = Infinity, nearest = null, nearestD = Infinity;
  for (const c of candidates) {
    if (c.lockable === false) continue;
    const dx = c.x - from.x, dz = c.z - from.z, d = Math.hypot(dx, dz);
    if (d > tuning.max_distance_m) continue;
    if (d < nearestD) { nearestD = d; nearest = c; }
    const a = angleBetween(forward.x, forward.z, dx, dz);
    if (a <= tuning.acquire_cone_deg / 2) {
      const score = a / 90 + d / tuning.max_distance_m;
      if (score < bestScore) { bestScore = score; best = c; }
    }
  }
  return (best ?? nearest)?.id ?? null;
}

export function shouldBreakLock(from, target, tuning, losLostS = 0) {
  const d = Math.hypot(target.x - from.x, target.z - from.z);
  return d > tuning.break_distance_m || losLostS > tuning.break_after_los_lost_s;
}

/** Soft aim assist: nearest enemy inside soft_lock_cone_deg of the facing, within max distance. */
export function softAimTarget(from, facing, candidates, tuning, maxDist) {
  let best = null, bestA = Infinity;
  for (const c of candidates) {
    if (c.lockable === false) continue;
    const dx = c.x - from.x, dz = c.z - from.z, d = Math.hypot(dx, dz);
    if (d > maxDist) continue;
    const a = angleBetween(facing.x, facing.z, dx, dz);
    if (a <= tuning.soft_lock_cone_deg / 2 && a < bestA) { bestA = a; best = c; }
  }
  return best?.id ?? null;
}

/**
 * Switch target left/right of the current one (lock_on.switch_cone_deg around the camera forward).
 * dir: -1 left / +1 right as seen from `from` looking along `forward`. Returns id or null.
 */
export function pickSwitchTarget(from, forward, current, candidates, tuning, dir) {
  const fwdA = Math.atan2(forward.x, forward.z);
  const rel = (c) => { let a = Math.atan2(c.x - from.x, c.z - from.z) - fwdA; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const curA = current ? rel(current) : 0;
  let best = null, bestD = Infinity;
  for (const c of candidates) {
    if (c.lockable === false || (current && c.id === current.id)) continue;
    if (Math.hypot(c.x - from.x, c.z - from.z) > tuning.max_distance_m) continue;
    const a = rel(c);
    if (Math.abs(a) > (tuning.switch_cone_deg ?? 90) * Math.PI / 180) continue;
    // Positive angle = to the left (yaw convention); dir +1 = right => want a < curA.
    const delta = (curA - a) * dir;
    if (delta > 1e-3 && delta < bestD) { bestD = delta; best = c; }
  }
  return best?.id ?? null;
}
