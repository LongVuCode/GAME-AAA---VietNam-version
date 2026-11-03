// secrets.js - secret chain runtime (secrets.json). Mirrors ArpgCore FSecretGraph (SecretGraph.h):
// a node is available when all `requires.all` clues are known and (if non-empty) at least one of
// `requires.any`; clues are never consumed; hints in 3 tiers, player-initiated.
export class SecretChain {
  constructor(chain) {
    this.chain = chain;
    this.completed = new Set();
    this.clues = new Set();
    this.hintsEnabled = true;
  }
  node(id) { return this.chain.nodes.find((n) => n.id === id); }
  isAvailable(id) {
    const n = this.node(id);
    if (!n || this.completed.has(id)) return false;
    const r = n.requires ?? { all: [], any: [] };
    return (r.all ?? []).every((c) => this.clues.has(c))
      && (!(r.any ?? []).length || r.any.some((c) => this.clues.has(c)));
  }
  available() { return this.chain.nodes.filter((n) => this.isAvailable(n.id)).map((n) => n.id); }
  /** Completes a node; returns { ok, granted[], reward } */
  complete(id) {
    if (!this.isAvailable(id)) return { ok: false, granted: [] };
    const n = this.node(id);
    this.completed.add(id);
    const granted = (n.grants ?? []).filter((c) => !this.clues.has(c));
    for (const c of n.grants ?? []) this.clues.add(c);
    return { ok: true, granted, reward: n.reward ?? null };
  }
  get finished() { return this.chain.nodes.some((n) => n.is_end && this.completed.has(n.id)); }
  start() { const s = this.chain.nodes.find((n) => n.is_start); if (s) this.complete(s.id); }

  /** Next useful node: available and either the end or granting an unknown clue. */
  nextUseful() {
    return this.chain.nodes.find((n) => this.isAvailable(n.id)
      && (n.is_end || (n.grants ?? []).some((c) => !this.clues.has(c))) && (n.hints ?? []).length) ?? null;
  }
  /** Hint text object ({vi,en}) for tier 1..3, or null (disabled / finished / nothing to do). */
  hint(tier) {
    if (!this.hintsEnabled || this.finished) return null;
    const n = this.nextUseful();
    if (!n) return null;
    const t = Math.min(3, Math.max(1, tier));
    return n.hints.find((h) => h.tier === t)?.text ?? null;
  }
  clueList() { return this.chain.clues.filter((c) => this.clues.has(c.id)); }
  toJSON() { return { completed: [...this.completed], clues: [...this.clues] }; }
  load(s) { this.completed = new Set(s.completed); this.clues = new Set(s.clues); }
}

/** Exhaustive check: every node reachable from start and the end reachable from every state. */
export function checkNoSoftlock(chain) {
  const nodes = chain.nodes;
  const key = (set) => [...set].sort().join('|');
  const cluesOf = (done) => {
    const c = new Set();
    for (const id of done) for (const g of nodes.find((n) => n.id === id).grants ?? []) c.add(g);
    return c;
  };
  const can = (n, done, clues) => !done.has(n.id) && (n.requires?.all ?? []).every((x) => clues.has(x))
    && (!(n.requires?.any ?? []).length || n.requires.any.some((x) => clues.has(x)));
  const start = new Set(nodes.filter((n) => n.is_start).map((n) => n.id));
  const seen = new Map([[key(start), start]]);
  const queue = [start];
  const reachedNodes = new Set(start);
  while (queue.length) {
    const done = queue.shift();
    const clues = cluesOf(done);
    for (const n of nodes) if (can(n, done, clues)) {
      const nx = new Set(done); nx.add(n.id); reachedNodes.add(n.id);
      const k = key(nx);
      if (!seen.has(k)) { seen.set(k, nx); queue.push(nx); }
    }
  }
  const endIds = nodes.filter((n) => n.is_end).map((n) => n.id);
  const canFinish = new Map();
  const finishable = (done) => {
    const k = key(done);
    if (canFinish.has(k)) return canFinish.get(k);
    canFinish.set(k, false);
    if (endIds.some((e) => done.has(e))) { canFinish.set(k, true); return true; }
    const clues = cluesOf(done);
    const r = nodes.some((n) => can(n, done, clues) && finishable(new Set([...done, n.id])));
    canFinish.set(k, r); return r;
  };
  const unreachable = nodes.filter((n) => !reachedNodes.has(n.id)).map((n) => n.id);
  const softlocks = [...seen.values()].filter((s) => !finishable(s)).map((s) => [...s]);
  return { ok: !unreachable.length && !softlocks.length, unreachable, softlocks, states: seen.size };
}
