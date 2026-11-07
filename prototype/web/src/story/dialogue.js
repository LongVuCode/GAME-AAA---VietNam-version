// story/dialogue.js - pure dialogue + bark logic for design/data/dialogue.json (no three.js, no DOM).
//
//   const run = new DialogueRun(conv, data, ctx);  // ctx: { hasFlag(f), stepDone(id), readyOrDone(questId) }
//   run.node            -> { kind: 'line', line } | { kind: 'choice', choices } | null (finished)
//   run.next()          -> advance past a line;   run.choose(i) -> effects of choice i (flags to set)
//
// A conversation is: lines, then (choices -> the chosen response), then after_choice, then the variants whose
// if_flag / if_quest_done hold. Choices only set flag_choice_* flags and change a detail line; every branch
// continues into the same after_choice and the same quest step (converges_to), so no choice changes events.

/** Resolve a dialogue.json line (text inline, or line_ref into strings.dialogue). */
export function resolveLine(line, stringsDialogue) {
  if (line.line_ref) {
    const d = stringsDialogue.find((x) => x.id === line.line_ref);
    if (!d) return null;
    return { id: line.id, ref: d.id, speaker: d.speaker, text: d.text, form: d.form, era: d.era, allowedEras: d.allowed_eras };
  }
  return { id: line.id, speaker: line.speaker, text: line.text, form: line.form };
}

/** Every line id of a dialogue.json file (conversations, choice responses, after_choice, variants, barks). */
export function lineIndex(dialogue) {
  const idx = new Map();
  const add = (l, owner) => { if (l?.id) idx.set(l.id, { line: l, owner }); };
  for (const c of dialogue.conversations) {
    for (const l of c.lines ?? []) add(l, c.id);
    for (const ch of c.choices ?? []) for (const l of ch.response ?? []) add(l, c.id);
    for (const l of c.after_choice ?? []) add(l, c.id);
    for (const v of c.variants ?? []) for (const l of v.lines ?? []) add(l, c.id);
  }
  for (const b of dialogue.barks) for (const l of b.lines) add(l, b.id);
  return idx;
}

/** Conversation availability (available.before_flag / after_flag / after_quest_step). */
export function conversationAvailable(conv, ctx) {
  const a = conv.available ?? {};
  if (a.before_flag && ctx.hasFlag(a.before_flag)) return false;
  if (a.after_flag && !ctx.hasFlag(a.after_flag)) return false;
  if (a.after_quest_step && !ctx.stepDone(a.after_quest_step)) return false;
  return true;
}

/** Conversations an NPC point (trigger.type talk, trigger.ref = point id or speaker id) can start now. */
export function conversationsFor(dialogue, ref, ctx) {
  return dialogue.conversations.filter((c) => c.trigger?.type === 'talk' && c.trigger.ref === ref && conversationAvailable(c, ctx));
}

export class DialogueRun {
  constructor(conv, stringsDialogue, ctx) {
    this.conv = conv; this.sd = stringsDialogue; this.ctx = ctx;
    this.queue = []; this.chosen = null; this.flagsSet = []; this.history = [];
    for (const l of conv.lines ?? []) this._push(l);
    this.choicesPending = !!conv.choices?.length;
    if (!this.choicesPending) this._tail();
    this._settle();
  }
  _push(l) { const r = resolveLine(l, this.sd); if (r) this.queue.push(r); }
  _tail() {
    for (const l of this.conv.after_choice ?? []) this._push(l);
    for (const v of this.conv.variants ?? []) {
      if (v.if_flag && !this.ctx.hasFlag(v.if_flag)) continue;
      if (v.if_quest_done && !this.ctx.readyOrDone(v.if_quest_done)) continue;
      for (const l of v.lines ?? []) this._push(l);
    }
  }
  _settle() {
    if (this.queue.length) this.node = { kind: 'line', line: this.queue[0] };
    else if (this.choicesPending) this.node = { kind: 'choice', choices: this.conv.choices };
    else this.node = null;
  }
  get done() { return this.node === null; }
  next() {
    if (this.node?.kind !== 'line') return;
    this.history.push(this.queue.shift());
    this._settle();
  }
  /** Choose choice i: returns the flags it sets. */
  choose(i) {
    if (this.node?.kind !== 'choice') return [];
    const ch = this.conv.choices[i];
    if (!ch) return [];
    this.chosen = ch; this.choicesPending = false;
    const flags = (ch.effects ?? []).filter((e) => e.flag).map((e) => e.flag); // effects are set-flag effects only (validator)
    this.flagsSet.push(...flags);
    for (const f of flags) this.ctx.setFlag?.(f);
    for (const l of ch.response ?? []) this._push(l);
    this._tail();
    this._settle();
    return flags;
  }
  /** Run to the end choosing index `pick` at every choice (tests, auto-play). Returns the line ids spoken. */
  autoplay(pick = 0) {
    const ids = [];
    for (let guard = 0; guard < 200 && this.node; guard++) {
      if (this.node.kind === 'line') { ids.push(this.node.line.id); this.next(); } else this.choose(pick);
    }
    return ids;
  }
}

/** Barks (dialogue.json barks): trigger -> line, per-line cooldown_s, era of the bark group, optional if_flag. */
export class BarkBook {
  constructor(dialogue, { minGapS = 1.2 } = {}) {
    this.byTrigger = new Map();
    for (const b of dialogue.barks) for (const l of b.lines) {
      const list = this.byTrigger.get(l.trigger) ?? [];
      list.push({ ...l, speaker: l.speaker ?? b.speaker, era: b.era });
      this.byTrigger.set(l.trigger, list);
    }
    this.last = new Map(); this.minGapS = minGapS; this.lastAny = -Infinity;
  }
  /** Line for a trigger now, or null (wrong era, flag missing, on cooldown). Marks it used. ctx: { era, hasFlag, now }. */
  pick(trigger, ctx) {
    const list = this.byTrigger.get(trigger);
    if (!list) return null;
    const now = ctx.now ?? 0;
    for (const l of list) {
      if (l.era && ctx.era && l.era !== ctx.era) continue;
      if (l.if_flag && !ctx.hasFlag(l.if_flag)) continue;
      const cd = l.cooldown_s ?? 0, last = this.last.get(l.id) ?? -Infinity;
      if (now - last < cd) continue;
      if (!ctx.force && now - this.lastAny < this.minGapS) return null;
      this.last.set(l.id, now); this.lastAny = now;
      return l;
    }
    return null;
  }
  reset() { this.last.clear(); this.lastAny = -Infinity; }
}
