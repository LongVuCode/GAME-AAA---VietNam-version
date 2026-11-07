// data.js - design data bundled at build time (single source of truth: design/data/*.json, D-020).
import combat from '../../../design/data/combat_tuning.json' with { type: 'json' };
import weapons from '../../../design/data/weapons.json' with { type: 'json' };
import enemies from '../../../design/data/enemies.json' with { type: 'json' };
import items from '../../../design/data/items.json' with { type: 'json' };
import lineage from '../../../design/data/lineage.json' with { type: 'json' };
import secrets from '../../../design/data/secrets.json' with { type: 'json' };
import codex from '../../../design/data/codex.json' with { type: 'json' };
import strings from '../../../design/data/strings.json' with { type: 'json' };
import controls from '../../../design/data/controls.json' with { type: 'json' };
import skills from '../../../design/data/skills.json' with { type: 'json' };
import map from '../../../design/data/map.json' with { type: 'json' };
// Story Integration 0.4 (research/narrative/STORY_INTEGRATION_0_4.md): NPC / dialogue, quests, cut-scenes, creature display.
import dialogue from '../../../design/data/dialogue.json' with { type: 'json' };
import quests from '../../../design/data/quests.json' with { type: 'json' };
import cinematics from '../../../design/data/cinematics.json' with { type: 'json' };
import creatures from '../../../design/data/creatures_0_4.json' with { type: 'json' };
import { applyTuningChanges } from './logic/tuning.js';
import { mergeMap04 } from './game/world04.js';

/** The design data exactly as in design/data (unit tests that mirror ArpgCore use this). */
export const DATA = Object.freeze({ combat, weapons, enemies, items, lineage, secrets, codex, strings, controls, skills, map, dialogue, quests, cinematics, creatures });

/** What the Demo 0.2 prototype runs on: DATA + combat_tuning.tuning_changes_0_2 applied on a copy
 *  (prototype-only override; the JSON values stay as they are, see logic/tuning.js). */
export const TUNED = applyTuningChanges(DATA);
// Demo 0.4 big map: the game plays on world_0_4 (src/game/world04.js); map.json's map_0_4 block (0.4 level
// bounds, zones, landmarks, lookouts, chests, secrets) is merged into the prototype's copy of map.json.
export const DATA_02 = Object.freeze({ ...TUNED.data, map: mergeMap04(TUNED.data.map) });

export function findById(list, id) {
  const found = list.find((e) => e.id === id);
  if (!found) throw new Error(`data id not found: ${id}`);
  return found;
}
