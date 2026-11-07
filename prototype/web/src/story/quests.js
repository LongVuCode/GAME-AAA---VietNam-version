// story/quests.js - pure quest state machine for design/data/quests.json (no three.js, no DOM).
//
//   const log = new QuestLog(data.quests);
//   const events = log.record('talk', 'cv_dot_dam_nong');   // any game fact: type + ref
//
// Facts are remembered, so a step whose conditions were met earlier (sequence break: the player opened the
// basket before talking to Năn) completes as soon as its quest reaches it. A quest starts when a fact with
// ref === quest.starts_on is recorded (or one of STARTS_ALIASES), or when its requires_quest is done.
// Events: { type: 'quest_started', quest } | { type: 'step_done', quest, step } | { type: 'step_started', quest, step }
//         | { type: 'quest_done', quest }

/** starts_on values that stand for several facts (quests.json keeps one readable id). */
export const STARTS_ALIASES = {
  cv_nan_ben_say_or_chest: [['choice', 'ch_nan_stay'], ['open_chest', 'chest_bai_lau']],
};

export const factKey = (type, ref) => `${type}:${ref}`;

export class QuestLog {
  constructor(questsData) {
    this.data = questsData;
    this.quests = questsData.quests;
    this.reset();
  }
  reset() {
    this.facts = new Set();
    this.state = Object.fromEntries(this.quests.map((q) => [q.id, { status: 'inactive', step: 0 }]));
    this.order = []; // quest ids in the order they started (journal)
  }
  quest(id) { return this.quests.find((q) => q.id === id) ?? null; }
  status(id) { return this.state[id]?.status ?? 'inactive'; }
  isActive(id) { return this.status(id) === 'active'; }
  isDone(id) { return this.status(id) === 'done'; }
  /** Current step def of an active quest (null when inactive or done). */
  currentStep(id) { const s = this.state[id]; return s?.status === 'active' ? this.quest(id).steps[s.step] : null; }
  stepDone(stepId) {
    for (const q of this.quests) {
      const i = q.steps.findIndex((s) => s.id === stepId);
      if (i < 0) continue;
      const st = this.state[q.id];
      return st.status === 'done' || (st.status === 'active' && st.step > i);
    }
    return false;
  }
  /** Quest done, or active on its last step (everything before it done). */
  readyOrDone(id) { const q = this.quest(id), st = this.state[id]; return st?.status === 'done' || (st?.status === 'active' && st.step === q.steps.length - 1); }
  has(type, ref) { return this.facts.has(factKey(type, ref)); }
  /** Conditions of a step: [{ type, ref, met }]. */
  conditions(step) { return (step.complete_when?.all ?? []).map((c) => ({ ...c, met: this.facts.has(factKey(c.type, c.ref)) })); }
  progress(step) { const c = this.conditions(step); return { met: c.filter((x) => x.met).length, total: c.length }; }

  /** The quest the HUD tracks: the active main quest, else the active transition, else null. */
  tracked() {
    for (const kind of ['main', 'transition']) {
      const q = this.quests.find((x) => x.kind === kind && this.isActive(x.id));
      if (q) return q;
    }
    return null;
  }
  activeSide() { return this.order.map((id) => this.quest(id)).filter((q) => q.kind === 'side' && this.isActive(q.id)); }
  started() { return this.order.map((id) => this.quest(id)); }

  start(id) {
    const out = [];
    const st = this.state[id];
    if (!st || st.status !== 'inactive') return out;
    st.status = 'active'; st.step = 0; this.order.push(id);
    out.push({ type: 'quest_started', quest: this.quest(id) });
    out.push({ type: 'step_started', quest: this.quest(id), step: this.quest(id).steps[0] });
    this._advance(id, out);
    return out;
  }

  _startsOn(q, type, ref) {
    if (!q.starts_on) return false;
    if (q.starts_on === ref) return true;
    return (STARTS_ALIASES[q.starts_on] ?? []).some(([t, r]) => t === type && r === ref);
  }

  _advance(id, out) {
    const q = this.quest(id), st = this.state[id];
    while (st.status === 'active') {
      const step = q.steps[st.step];
      if (!this.conditions(step).every((c) => c.met)) break;
      out.push({ type: 'step_done', quest: q, step });
      st.step += 1;
      if (st.step >= q.steps.length) {
        st.status = 'done';
        out.push({ type: 'quest_done', quest: q });
        for (const other of this.quests) if (other.requires_quest === id) out.push(...this.start(other.id));
      } else out.push({ type: 'step_started', quest: q, step: q.steps[st.step] });
    }
  }

  /** Record one fact and return what changed. Idempotent for repeated facts. */
  record(type, ref) {
    const key = factKey(type, ref), out = [];
    const isNew = !this.facts.has(key);
    this.facts.add(key);
    if (!isNew) return out;
    for (const q of this.quests) if (this.status(q.id) === 'inactive' && this._startsOn(q, type, ref)) out.push(...this.start(q.id));
    for (const q of this.quests) if (this.isActive(q.id)) this._advance(q.id, out);
    return out;
  }

  toJSON() { return { facts: [...this.facts], state: JSON.parse(JSON.stringify(this.state)), order: [...this.order] }; }
}
