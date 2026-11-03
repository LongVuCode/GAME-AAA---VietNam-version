// combo.js - player move selection from weapons.json move inputs:
//   "L" chain (chain_index 1..3, 4 with skill sk_vo_noi_don), "H" heavy (chargeable),
//   "L,L,pause,H" branch, "dodge,L" dodge attack, "perfect_parry,L" counter, house move "perfect_parry,H".
// Timing semantics (prototype reading of DEMO_0_1_DESIGN §3, documented in README):
//   - a light chain continues if L is pressed (or buffered) no later than combo_window_s after the
//     previous chain move ends;
//   - the branch fires when H is pressed after an idle of >= combo_pause_threshold_s following the
//     2nd+ chain light, and no later than threshold + that move's combo_window_s;
//   - after a dodge, L within combo_pause_threshold_s becomes the dodge attack;
//   - after a perfect parry, L/H within guard.perfect_parry_counter_window_s become counter/house move.

export function movesByInput(weapon) {
  const chain = weapon.moves.filter((m) => m.input === 'L').sort((a, b) => a.chain_index - b.chain_index);
  return {
    chain,
    heavy: weapon.moves.find((m) => m.input === 'H'),
    branch: weapon.moves.find((m) => m.input === 'L,L,pause,H'),
    dodgeAttack: weapon.moves.find((m) => m.input === 'dodge,L'),
    counter: weapon.moves.find((m) => m.input === 'perfect_parry,L'),
  };
}

/**
 * @param weapon weapons.json entry
 * @param input 'L' | 'H'
 * @param ctx { now, lastMove, lastMoveEnd, chainIndex, afterDodgeUntil, perfectParryUntil,
 *              maxChain, houseMove, inputTuning }
 * @returns { move, kind } kind: chain | heavy | branch | dodge_attack | counter | house
 */
export function selectMove(weapon, input, ctx) {
  const m = movesByInput(weapon);
  const now = ctx.now;
  if (now <= (ctx.perfectParryUntil ?? -Infinity)) {
    if (input === 'L' && m.counter) return { move: m.counter, kind: 'counter' };
    if (input === 'H' && ctx.houseMove) return { move: ctx.houseMove, kind: 'house' };
  }
  if (input === 'L' && now <= (ctx.afterDodgeUntil ?? -Infinity) && m.dodgeAttack) {
    return { move: m.dodgeAttack, kind: 'dodge_attack' };
  }
  const last = ctx.lastMove;
  const lastIsChainLight = !!last && last.input === 'L' && last.chain_index >= 1;
  const idle = now - (ctx.lastMoveEnd ?? -Infinity);
  if (input === 'L') {
    let next = 1;
    if (lastIsChainLight && idle <= last.combo_window_s) {
      next = (ctx.chainIndex ?? 0) + 1;
      if (next > (ctx.maxChain ?? 3)) next = 1;
    }
    const move = m.chain.find((x) => x.chain_index === next) ?? m.chain[0];
    return { move, kind: 'chain' };
  }
  if (input === 'H') {
    const pause = ctx.inputTuning.combo_pause_threshold_s;
    if (lastIsChainLight && (ctx.chainIndex ?? 0) >= 2 && m.branch
        && idle >= pause && idle <= pause + last.combo_window_s) {
      return { move: m.branch, kind: 'branch' };
    }
    return { move: m.heavy, kind: 'heavy' };
  }
  throw new Error(`unknown input ${input}`);
}

/** Charge level of a heavy held for heldS seconds (0 if released before hold_threshold_s). */
export function chargeLevel(move, heldS, inputTuning, hasFullBrace) {
  if (!move.charge || heldS < inputTuning.hold_threshold_s) return 0;
  const max = hasFullBrace ? move.charge.max_level : Math.min(1, move.charge.max_level);
  return Math.max(0, Math.min(max, Math.floor(heldS / move.charge.time_per_level_s + 1e-9)));
}

export function chargeMult(move, level) {
  return move.charge ? 1 + move.charge.damage_mult_per_level * level : 1;
}

export function moveTimeline(move) {
  const startup = move.startup_s, active = move.active_s, recovery = move.recovery_s;
  return { startup, active, recovery, total: startup + active + recovery };
}

/** Simple time-stamped input buffer (mirror of ArpgCore FInputBuffer, capacity 1). */
export class InputBuffer {
  constructor(windowS) { this.windowS = windowS; this.entry = null; }
  push(type, now) { this.entry = { type, time: now }; }
  consume(now) {
    if (!this.entry) return null;
    const e = this.entry; this.entry = null;
    return now - e.time <= this.windowS ? e : null;
  }
  peek(now) { return this.entry && now - this.entry.time <= this.windowS ? this.entry : null; }
  clear() { this.entry = null; }
}
