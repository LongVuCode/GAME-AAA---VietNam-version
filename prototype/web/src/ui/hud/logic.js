// logic.js - pure HUD logic (no DOM, no three.js; unit tested in test/hud.test.mjs).
// Health colour tiers, the trailing "damage chip", the Drum Burst gauge (fluid level + full state),
// skill cooldowns and the minimal-HUD visibility rule.
//
// Defaults below; hudTuningFrom(data) reads the data lock combat_tuning.hud_0_3 (DEMO_0_3_DESIGN §7):
// thresholds, pulse rates, damage trail, out-of-combat fade, skill seconds, boss phase marker.
// COLOURS stay the PO palette (bright green -> yellow <= 50 % -> red <= 10 %, D-024; the red is not
// the telegraph red-bronze #C64E29). hud_0_3 currently lists muted hex values (#8FC79A / #D9A441 /
// #E8C27A) that contradict the PO request: flagged to the designer, not read here.
export const HUD_TUNING = Object.freeze({
  hpWarnRatio: 0.5,        // <= 50 %: yellow tier
  hpCritRatio: 0.1,        // <= 10 %: red tier (pulse + heartbeat icon + text, not colour only)
  critPulseHz: 1.5,
  readyPulseHz: 1.4,       // drum face when full
  chipDelayS: 0.6,         // damage trail (hud_0_3.health_bar.damage_trail_s), then drains
  chipRatePerS: 0.9,       // drain speed (fraction of the bar per second)
  minimalLingerS: 4.0,     // minimal HUD fade after combat (hud_0_3.fade_out_of_combat_after_s)
  fluidStiffness: 7,       // drum fluid level easing (1/s)
  skillSecondsBelowS: 5,   // skill cooldown shows seconds below this
  skillReadyFlashS: 0.25,
  bossPhaseMarker: 0.5,    // boss HP ratio of the phase marker (null = none)
  theOnlyWhenActive: true, // hud_0_3.the_bar.show_only_when_not_full: hide Thế at rest
  drumLabelKey: 'hud_drum', drumReadyKey: 'hud_drum_ready',
});

/** HUD tuning from design data (combat_tuning.hud_0_3), falling back to HUD_TUNING per field. */
export function hudTuningFrom(data) {
  const h = data?.combat?.hud_0_3;
  if (!h) return HUD_TUNING;
  const hb = h.health_bar ?? {}, ub = h.ultimate_bar ?? {}, sk = h.skills ?? {}, bb = h.boss_bar ?? {};
  const pick = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  return Object.freeze({
    ...HUD_TUNING,
    hpWarnRatio: pick(hb.warn_at_most_ratio, HUD_TUNING.hpWarnRatio),
    hpCritRatio: pick(hb.critical_at_most_ratio, HUD_TUNING.hpCritRatio),
    critPulseHz: pick(hb.critical_pulse_hz, HUD_TUNING.critPulseHz),
    chipDelayS: pick(hb.damage_trail_s, HUD_TUNING.chipDelayS),
    readyPulseHz: pick(ub.ready_pulse_hz, HUD_TUNING.readyPulseHz),
    minimalLingerS: pick(h.fade_out_of_combat_after_s, HUD_TUNING.minimalLingerS),
    skillSecondsBelowS: pick(sk.show_seconds_below_s, HUD_TUNING.skillSecondsBelowS),
    skillReadyFlashS: pick(sk.ready_flash_s, HUD_TUNING.skillReadyFlashS),
    bossPhaseMarker: bb.phase_marker_at_hp_ratio ?? HUD_TUNING.bossPhaseMarker,
    theOnlyWhenActive: h.the_bar?.show_only_when_not_full ?? HUD_TUNING.theOnlyWhenActive,
    drumLabelKey: ub.label_key ?? HUD_TUNING.drumLabelKey, drumReadyKey: ub.ready_key ?? HUD_TUNING.drumReadyKey,
  });
}

/** Skill cooldown text: whole seconds (rounded up) while 0 < left < below, else ''. */
export function cooldownText(secondsLeft, below = HUD_TUNING.skillSecondsBelowS) {
  return secondsLeft > 0 && secondsLeft < below ? String(Math.ceil(secondsLeft - 1e-6)) : '';
}

const EPS = 1e-9;
export const clamp01 = (x) => (x > 1 ? 1 : x < 0 || !(x === x) ? 0 : x); // NaN -> 0

/** 'ok' (> 50 %), 'warn' (<= 50 %), 'crit' (<= 10 %). Exact at the thresholds. */
export function hpTier(ratio, t = HUD_TUNING) {
  const r = clamp01(ratio);
  if (r <= t.hpCritRatio + EPS) return 'crit';
  if (r <= t.hpWarnRatio + EPS) return 'warn';
  return 'ok';
}

// Bright "glowing" stops. Within a tier the colour drifts a little so the bar feels alive; the tier
// itself changes exactly at the threshold.
export const HP_COLORS = Object.freeze({
  green: [70, 255, 120],   // 100 %
  lime: [176, 245, 64],    // just above 50 %
  yellow: [255, 214, 51],  // 50 %
  amber: [255, 150, 40],   // just above 10 %
  red: [255, 54, 44],      // <= 10 %
});
const mix = (a, b, u) => a.map((v, i) => Math.round(v + (b[i] - v) * u));

/** Health colour [r, g, b] for a health ratio: green -> yellow at <= 50 % -> red at <= 10 %. */
export function hpColor(ratio, t = HUD_TUNING) {
  const r = clamp01(ratio), tier = hpTier(r, t);
  if (tier === 'crit') return HP_COLORS.red.slice();
  if (tier === 'warn') return mix(HP_COLORS.amber, HP_COLORS.yellow, (r - t.hpCritRatio) / (t.hpWarnRatio - t.hpCritRatio));
  return mix(HP_COLORS.lime, HP_COLORS.green, (r - t.hpWarnRatio) / (1 - t.hpWarnRatio));
}
export const rgb = (c, a = 1) => (a >= 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`);

/** Trailing damage chip: after a hit the chip holds, then drains down to the value. Heals move the
 *  chip up at once (no white trail above the fill). */
export class ChipBar {
  constructor(value = 1, t = HUD_TUNING) { this.value = value; this.chip = value; this.hold = 0; this.t = t; this.healT = 0; }
  set(v) {
    v = clamp01(v);
    if (v < this.value - EPS) { this.chip = Math.max(this.chip, this.value); this.hold = this.t.chipDelayS; }
    else if (v > this.value + EPS) { this.chip = Math.max(this.chip, v); this.healT = 0.6; }
    this.value = v;
    if (this.chip < v) this.chip = v;
  }
  /** Advances; returns true while anything is still moving. */
  tick(dt) {
    if (this.healT > 0) this.healT = Math.max(0, this.healT - dt);
    if (this.chip <= this.value + EPS) { this.chip = this.value; return this.healT > 0; }
    if (this.hold > 0) { this.hold -= dt; return true; }
    this.chip = Math.max(this.value, this.chip - this.t.chipRatePerS * dt);
    return true;
  }
}

/** Drum Burst gauge from DrumMeter-like numbers (combat_tuning.drum_rhythm). */
export function drumGauge(points, perSegment, segments = 4, costSegments = segments) {
  const max = perSegment * segments;
  const p = Math.max(0, Math.min(max, points || 0));
  const segs = Array.from({ length: segments }, (_, k) => clamp01((p - k * perSegment) / perSegment));
  const fullSegs = Math.min(segments, Math.floor(p / perSegment + EPS));
  return { level: max > 0 ? p / max : 0, segs, fullSegs, full: fullSegs >= costSegments };
}

/** Drum face state: eased fluid level, full / empty transitions (for the one-shot "filled" and
 *  "burst spent" effects) and whether the canvas needs a redraw. */
export class DrumFaceState {
  constructor(t = HUD_TUNING) { this.t = t; this.level = 0; this.shown = 0; this.full = false; this.slosh = 0; this.event = null; }
  /** gauge: drumGauge(...). Returns the event of this step: 'filled' | 'spent' | null. */
  set(gauge) {
    let ev = null;
    if (gauge.full && !this.full) ev = 'filled';
    else if (!gauge.full && this.full) ev = 'spent';
    if (Math.abs(gauge.level - this.level) > 0.004) this.slosh = Math.min(1, this.slosh + Math.abs(gauge.level - this.level) * 4 + 0.25);
    this.full = gauge.full; this.level = gauge.level; this.event = ev;
    return ev;
  }
  /** Eases the shown level; returns true when the shown level or the slosh still moves. */
  tick(dt) {
    const k = 1 - Math.exp(-this.t.fluidStiffness * Math.max(0, dt));
    const before = this.shown;
    this.shown += (this.level - this.shown) * k;
    if (Math.abs(this.level - this.shown) < 0.001) this.shown = this.level;
    this.slosh = Math.max(0, this.slosh - dt * 0.8);
    return this.shown !== before || this.slosh > 0;
  }
  /** The fluid surface is visible (waves animate) when it is neither empty nor brimming. */
  get animating() { return this.shown > 0.002 || this.full; }
}

/** Skill slots: setSkills([...]) + setCooldown(id, t01) where t01 = remaining fraction (1 = just
 *  used, 0 = ready). Returns ids that became ready since the last call (for the "ready" glint). */
export class SkillCooldowns {
  constructor() { this.cd = new Map(); }
  set(id, t01) {
    const prev = this.cd.get(id) ?? 0, v = clamp01(t01);
    this.cd.set(id, v);
    return prev > 0 && v === 0; // became ready
  }
  get(id) { return this.cd.get(id) ?? 0; }
  ready(id) { return this.get(id) === 0; }
}

/** Minimal HUD ("HUD tối giản"): hidden out of combat; shown in combat, with a boss, at low health,
 *  with a full drum, and for minimalLingerS after a change (hit, heal, swap). */
export class HudVisibility {
  constructor(t = HUD_TUNING) { this.t = t; this.linger = 0; }
  poke() { this.linger = this.t.minimalLingerS; }
  /** Returns true when the player cluster should be visible. */
  tick(dt, { minimal, combat, boss, hpRatio, drumFull }) {
    if (combat || boss) this.linger = this.t.minimalLingerS;
    else this.linger = Math.max(0, this.linger - dt);
    if (!minimal) return true;
    return combat || boss || this.linger > 0 || hpTier(hpRatio, this.t) !== 'ok' || !!drumFull;
  }
}

/** HUD text scale from the existing subtitle-size option (acc_subtitle_size s/m/l/xl). */
export function hudTextScale(size) { return { s: 0.9, m: 1, l: 1.15, xl: 1.3 }[size] ?? 1; }
