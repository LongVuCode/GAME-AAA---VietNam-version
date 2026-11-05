// HUD 0.3 pure logic (src/ui/hud/logic.js): health colour tiers at exactly 50 % / 10 %, damage chip,
// Drum Burst gauge full state and transitions, cooldown readiness, minimal-HUD visibility.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hpTier, hpColor, HP_COLORS, ChipBar, drumGauge, DrumFaceState, SkillCooldowns, HudVisibility, hudTextScale, hudTuningFrom, cooldownText, HUD_TUNING } from '../src/ui/hud/logic.js';
import { DrumMeter } from '../src/logic/drum.js';
import { DATA } from '../src/data.js';

test('health tier thresholds are exact: > 50 % ok, <= 50 % warn, <= 10 % crit', () => {
  assert.equal(hpTier(1), 'ok');
  assert.equal(hpTier(0.5001), 'ok');
  assert.equal(hpTier(0.5), 'warn');
  assert.equal(hpTier(60 / 120), 'warn');
  assert.equal(hpTier(0.1001), 'warn');
  assert.equal(hpTier(0.1), 'crit');
  assert.equal(hpTier(12 / 120), 'crit');
  assert.equal(hpTier(0), 'crit');
  assert.equal(hpTier(NaN), 'crit');
});

test('health colour: bright green at 100 %, yellow at 50 %, red at <= 10 %', () => {
  assert.deepEqual(hpColor(1), HP_COLORS.green);
  assert.deepEqual(hpColor(0.5), HP_COLORS.yellow);
  assert.deepEqual(hpColor(0.1), HP_COLORS.red);
  assert.deepEqual(hpColor(0.08), HP_COLORS.red);
  const [r, g, b] = hpColor(1); assert.ok(g > 200 && g > r && g > b, 'green dominant');
  const [yr, yg, yb] = hpColor(0.5); assert.ok(yr > 200 && yg > 180 && yb < 90, 'yellow');
  const [rr, rg] = hpColor(0.05); assert.ok(rr > 200 && rg < 80, 'red');
  // just above 50 % is still green-family (lime), not yellow
  const above = hpColor(0.51); assert.ok(above[1] > 230 && above[0] < 200, `lime ${above}`);
  // monotone hue drift: green channel decreases from 50 % down to 10 %
  assert.ok(hpColor(0.45)[1] > hpColor(0.15)[1]);
});

test('damage chip holds, then drains to the value; heals move it up at once', () => {
  const c = new ChipBar(1);
  c.set(0.6);
  assert.equal(c.chip, 1);
  c.tick(0.3); assert.equal(c.chip, 1, 'holds during the delay');
  for (let i = 0; i < 60; i++) c.tick(0.05);
  assert.equal(c.chip, 0.6);
  c.set(0.9); assert.equal(c.chip, 0.9); assert.ok(c.healT > 0);
  assert.equal(c.tick(1), false, 'settled');
});

test('drum gauge: full only with all 4 notches (matches DrumMeter.canBurst)', () => {
  const t = DATA.combat.drum_rhythm;
  const seg = t.points_per_segment;
  assert.equal(drumGauge(0, seg).full, false);
  assert.equal(drumGauge(4 * seg - 1, seg).full, false);
  assert.equal(drumGauge(4 * seg, seg).full, true);
  assert.deepEqual(drumGauge(2.5 * seg, seg).segs, [1, 1, 0.5, 0]);
  assert.equal(drumGauge(2 * seg, seg).level, 0.5);
  const m = new DrumMeter(t);
  for (let k = 0; k < 40; k++) {
    m.gain('perfect_parry');
    assert.equal(drumGauge(m.points, seg, t.segments, t.drum_burst_cost_segments).full, m.canBurst(), `points ${m.points}`);
  }
});

test('drum face state: filled / spent events, fluid eases to the level', () => {
  const d = new DrumFaceState();
  assert.equal(d.set(drumGauge(200, 100)), null);
  assert.equal(d.full, false);
  assert.equal(d.set(drumGauge(400, 100)), 'filled');
  assert.equal(d.full, true);
  assert.equal(d.set(drumGauge(400, 100)), null, 'event fires once');
  for (let i = 0; i < 120; i++) d.tick(1 / 60);
  assert.ok(Math.abs(d.shown - 1) < 0.01, `shown ${d.shown}`);
  assert.equal(d.set(drumGauge(0, 100)), 'spent');
  assert.equal(d.full, false);
  for (let i = 0; i < 300; i++) d.tick(1 / 60);
  assert.equal(d.shown, 0);
  assert.equal(d.tick(1 / 60), false, 'no redraw needed when settled');
});

test('skill cooldowns report when a skill becomes ready', () => {
  const c = new SkillCooldowns();
  assert.equal(c.set('a', 1), false);
  assert.equal(c.set('a', 0.4), false);
  assert.equal(c.set('a', 0), true);
  assert.equal(c.set('a', 0), false);
  assert.ok(c.ready('a') && c.ready('unknown'));
});

test('minimal HUD: hidden out of combat after the linger time, shown at low health / full drum', () => {
  const v = new HudVisibility();
  const base = { minimal: true, combat: false, boss: false, hpRatio: 1, drumFull: false };
  assert.equal(v.tick(0.1, { ...base, minimal: false }), true);
  assert.equal(v.tick(0.1, base), false);
  assert.equal(v.tick(0.1, { ...base, combat: true }), true);
  assert.equal(v.tick(2, base), true, 'lingers');
  assert.equal(v.tick(2, base), false);
  assert.equal(v.tick(0.1, { ...base, hpRatio: 0.5 }), true);
  assert.equal(v.tick(0.1, { ...base, drumFull: true }), true);
  v.poke(); assert.equal(v.tick(0.1, base), true);
});

test('HUD text scale follows the subtitle size option', () => {
  assert.equal(hudTextScale('m'), 1);
  assert.ok(hudTextScale('xl') > hudTextScale('l') && hudTextScale('s') < 1);
  assert.equal(hudTextScale(undefined), 1);
});

test('HUD tuning reads combat_tuning.hud_0_3 (thresholds stay exact at 50 % / 10 %)', () => {
  const T = hudTuningFrom(DATA);
  const h = DATA.combat.hud_0_3;
  assert.ok(h, 'hud_0_3 data lock present');
  assert.equal(T.hpWarnRatio, h.health_bar.warn_at_most_ratio);
  assert.equal(T.hpCritRatio, h.health_bar.critical_at_most_ratio);
  assert.equal(T.chipDelayS, h.health_bar.damage_trail_s);
  assert.equal(T.minimalLingerS, h.fade_out_of_combat_after_s);
  assert.equal(hpTier(0.5, T), 'warn');
  assert.equal(hpTier(0.1, T), 'crit');
  assert.equal(hpTier(0.51, T), 'ok');
  assert.ok(DATA.strings.ui[T.drumLabelKey] && DATA.strings.ui[T.drumReadyKey]);
  assert.equal(hudTuningFrom({}), HUD_TUNING);
});

test('skill cooldown seconds only below the threshold', () => {
  assert.equal(cooldownText(4.2, 5), '5');
  assert.equal(cooldownText(0.3, 5), '1');
  assert.equal(cooldownText(6, 5), '');
  assert.equal(cooldownText(0, 5), '');
});
