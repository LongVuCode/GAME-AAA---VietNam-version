// lineage.js - skill tree ("Nghề nhà"), skill-point sources, handoff between generations and the
// era content rule (lineage.json). Mirrors ArpgCore Handover (Lineage.h): skills carry over by
// skill_tree_carryover_ratio, house moves + weapons + Thạp + tools carry over.

/** Words that betray a forbidden content tag. Mirror of tools/design_validate.py TAG_WORDS.
 *  "lưỡi bẫy", "đồng cũ", "mắc ở cổ": talk of the trap blade is talk of the khoen (REVIEW SI-10). */
export const TAG_WORDS = {
  khoen: [['khoen', 'lưỡi bẫy', 'đồng cũ', 'mắc ở cổ'], ['khoen', 'collar', 'binding ring', 'trap blade']],
  'mảnh': [['mảnh'], ['shard', 'shards']],
  'chốt': [['chốt'], ['pin', 'linchpin']],
  bear: [['gấu'], ['bear', 'bears']],
  melting: [['nấu chảy', 'nấu mảnh'], ['melt', 'melted', 'melting']],
};

const wordRe = (w) => new RegExp(`(?<![\\p{L}\\p{N}_])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'u');

/** Forbidden words found in a {vi,en} object (or array of them) for the given tags. */
export function forbiddenHits(locs, tags) {
  const list = Array.isArray(locs) ? locs : [locs];
  const hits = new Set();
  for (const o of list) {
    if (!o) continue;
    for (const tag of tags) {
      const [vi, en] = TAG_WORDS[tag] ?? [[tag], []];
      for (const w of vi) if (o.vi && wordRe(w).test(o.vi.toLowerCase())) hits.add(w);
      for (const w of en) if (o.en && wordRe(w).test(o.en.toLowerCase())) hits.add(w);
    }
  }
  return [...hits].sort();
}

export function eraTags(lineage, eraId) {
  return lineage.eras.find((e) => e.id === eraId)?.forbidden_content_tags ?? [];
}

// ---------------------------------------------------------------- skill tree
export class SkillTree {
  constructor(tree, points = 0) { this.tree = tree; this.owned = new Set(); this.points = points; }
  node(id) { return this.tree.nodes.find((n) => n.id === id); }
  branchAvailable(branchId) { return !!this.tree.branches.find((b) => b.id === branchId)?.available_in_demo; }
  canBuy(id) {
    const n = this.node(id);
    if (!n || this.owned.has(id)) return false;
    if (!this.branchAvailable(n.branch)) return false;
    return this.points >= n.cost && n.prereqs.every((p) => this.owned.has(p));
  }
  buy(id) {
    if (!this.canBuy(id)) return false;
    this.points -= this.node(id).cost; this.owned.add(id); return true;
  }
  has(id) { return this.owned.has(id); }
  /** Aggregated gameplay modifiers from owned nodes' effects. */
  modifiers() {
    const m = { maxChain: 3, heavyMaxLevel: 1, theMult: 0, postPerfectDodgeTheMult: 1, postPerfectDodgeWindowS: 0,
      perfectParryBonus: 0, decayDelayAddS: 0, burstTheMult: 0, pryWindowAddS: 0 };
    for (const id of this.owned) {
      const e = this.node(id).effect;
      switch (e.type) {
        case 'unlock_move_chain_index': m.maxChain = Math.max(m.maxChain, e.value); break;
        case 'heavy_charge_max_level': m.heavyMaxLevel = Math.max(m.heavyMaxLevel, e.value); break;
        case 'the_damage_mult': m.theMult += e.value; break;
        case 'post_perfect_dodge_the_mult': m.postPerfectDodgeTheMult = e.value; m.postPerfectDodgeWindowS = e.window_s; break;
        case 'drum_gain_bonus': if (e.action === 'perfect_parry') m.perfectParryBonus += e.value; break;
        case 'drum_decay_delay_add_s': m.decayDelayAddS += e.value; break;
        case 'drum_burst_the_mult': m.burstTheMult += e.value; break;
        case 'pry_beat_window_add_s': m.pryWindowAddS += e.value; break;
        default: throw new Error(`unknown skill effect ${e.type}`);
      }
    }
    return m;
  }
  toJSON() { return { owned: [...this.owned], points: this.points }; }
}

/** Points granted by a source id (skill_point_sources: encounter id or flag). */
export function skillPointsFor(lineage, sourceId) {
  return lineage.skill_point_sources.filter((s) => s.source === sourceId).reduce((a, s) => a + s.points, 0);
}

/**
 * Generation state: { character, era, skills: SkillTree, weapons[], slots, houseMoves[], thap[], tools[],
 *   owned: {itemId:{level, generation}}, flags:Set, generation }
 */
export function newGeneration(lineage, characterId) {
  const ch = lineage.characters.find((c) => c.id === characterId);
  return {
    character: ch.id, era: ch.era, generation: ch.generation,
    skills: new SkillTree(lineage.skill_tree, ch.start_skill_points ?? 0),
    weapons: [...ch.start_weapons], slots: ch.weapon_slots,
    houseMoves: [], thap: [], tools: [], owned: {}, flags: new Set(),
  };
}

/** Incomplete items to warn about before the handoff (handoff.trigger.warn_if_incomplete). */
export function handoffWarnings(lineage, { secretFinished, crafted }) {
  const out = [];
  for (const id of lineage.handoff.trigger.warn_if_incomplete) {
    if (id.startsWith('sec_') && !secretFinished(id)) out.push(id);
    if (id.startsWith('rcp_') && !crafted(id)) out.push(id);
  }
  return out;
}

export function canHandoff(lineage, prev) {
  return lineage.handoff.trigger.requires_flags.every((f) => prev.flags.has(f));
}

/** Pure handoff: returns the next generation; prev is not mutated. */
export function handoff(lineage, prev) {
  const ho = lineage.handoff;
  if (prev.character !== ho.from) throw new Error(`handoff from ${prev.character}, expected ${ho.from}`);
  if (!canHandoff(lineage, prev)) throw new Error('handoff requirements not met');
  const to = lineage.characters.find((c) => c.id === ho.to);
  const inh = lineage.inheritance;
  const next = newGeneration(lineage, to.id);
  // Skills: keep floor(ratio) of each owned node (binary nodes: kept if ratio >= 1).
  if (inh.skill_tree_carryover_ratio >= 1) for (const id of prev.skills.owned) next.skills.owned.add(id);
  next.skills.points = prev.skills.points + (to.bonus_skill_points_on_handoff ?? 0);
  if (inh.weapons_carryover) next.weapons = [...new Set([...prev.weapons, ...to.start_weapons])];
  if (inh.house_moves_carryover) next.houseMoves = [...prev.houseMoves];
  next.tools = [...new Set([...prev.tools, ...inh.tool_carryover])];
  // Thạp: previous Thạp plus every Bảo khí owned by prev, ordered by generation.
  const thap = [...prev.thap];
  if (inh.thap_carryover) {
    for (const [item, o] of Object.entries(prev.owned)) thap.push({ item, level: o.level, generation: o.generation ?? prev.generation });
  }
  next.thap = thap.sort((a, b) => a.generation - b.generation);
  if (inh.bao_khi_equippable_by_later_generations) for (const t of next.thap) next.owned[t.item] = { level: t.level, generation: t.generation };
  // Lineage-scoped flags (secret state scope = lineage) carry over.
  next.flags = new Set(prev.flags);
  return next;
}
