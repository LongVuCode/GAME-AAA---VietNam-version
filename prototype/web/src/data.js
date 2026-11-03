// data.js - design data bundled at build time (single source of truth: design/data/*.json, D-020).
import combat from '../../../design/data/combat_tuning.json' with { type: 'json' };
import weapons from '../../../design/data/weapons.json' with { type: 'json' };
import enemies from '../../../design/data/enemies.json' with { type: 'json' };
import items from '../../../design/data/items.json' with { type: 'json' };
import lineage from '../../../design/data/lineage.json' with { type: 'json' };
import secrets from '../../../design/data/secrets.json' with { type: 'json' };
import codex from '../../../design/data/codex.json' with { type: 'json' };
import strings from '../../../design/data/strings.json' with { type: 'json' };

export const DATA = Object.freeze({ combat, weapons, enemies, items, lineage, secrets, codex, strings });

export function findById(list, id) {
  const found = list.find((e) => e.id === id);
  if (!found) throw new Error(`data id not found: ${id}`);
  return found;
}
