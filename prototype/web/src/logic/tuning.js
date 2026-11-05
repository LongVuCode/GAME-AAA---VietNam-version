// tuning.js - prototype-only override layer for Demo 0.2. combat_tuning.tuning_changes_0_2 lists value
// changes proposed by FUN_PASS_0_2 §3.7 that are NOT applied in the JSON (the boss HP is pinned by
// game/Source/ArpgCore/Tests/ConfigTests.cpp). The web prototype applies them on a deep copy at boot,
// so design/data stays untouched and ArpgCore / its tests read the original values.
// Demo 0.3: the same copy also gets controls.json scheme_0_3 merged (logic/controls.js applyScheme03).
import { applyScheme03 } from './controls.js';

/** Sets obj[path] where path is like "drum_rhythm.gain.light_hit" or "boss_lon_loi_dam.phases[1].speed_mult". */
function setPath(root, path, value) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let o = root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (o == null) return false;
    o = Array.isArray(o) && !/^\d+$/.test(parts[i]) ? o.find((x) => x.id === parts[i]) : o[parts[i]];
  }
  if (o == null || !(parts[parts.length - 1] in o)) return false;
  o[parts[parts.length - 1]] = value;
  return true;
}

/**
 * Returns { data, applied: [{file, path, from, to}], skipped } with the 0.2 changes applied on a deep copy.
 * data: the DATA bundle ({ combat, weapons, enemies, ... }). The original is not modified.
 */
export function applyTuningChanges(data) {
  const copy = JSON.parse(JSON.stringify(data));
  const changes = copy.combat?.tuning_changes_0_2?.changes ?? [];
  const fileKey = { combat_tuning: 'combat', enemies: 'enemies', weapons: 'weapons' };
  const applied = [], skipped = [];
  for (const c of changes) {
    const key = fileKey[c.file];
    let root = copy[key];
    if (key === 'enemies') root = root?.enemies; // paths start with the enemy id
    const ok = root && setPath(root, c.path, c.to);
    (ok ? applied : skipped).push({ file: c.file, path: c.path, from: c.from, to: c.to });
  }
  if (copy.controls?.scheme_0_3) copy.controls = applyScheme03(copy.controls);
  return { data: Object.freeze(copy), applied, skipped };
}
