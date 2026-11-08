// shackle.js - "Khoen" state machine and the 3-beat pry rhythm judge.
// Mirrors ArpgCore FShackle (Shackle.h): every posture break cracks one stage; with enough cracks and
// the boss staggered the pry opens; beats on a drum grid (lead-in = one beat), a missed beat is
// retried miss_retries_per_beat times before the pry fails; Timed / Hold / Auto input modes.
// Prototype addition: presses are judged at their input timestamp (see press(offsetS), INPUT_GRACE_S).
// The khoen never yields an item or power (V9): nothing here touches inventory.

/** Max input-processing delay (s) tolerated when judging a press by its timestamp. */
export const INPUT_GRACE_S = 0.25;

export const KhoenState = Object.freeze({
  DISABLED: 'disabled', INTACT: 'intact', CRACKING: 'cracking', READY: 'ready', PRYING: 'prying', FREED: 'freed',
});

export class Khoen {
  constructor({ enabled = true, crackStages = 3, cracksToOpen = crackStages }) {
    this.crackStages = crackStages;
    this.cracksToOpen = cracksToOpen;
    this.cracks = 0;
    this.state = enabled ? (cracksToOpen <= 0 ? KhoenState.READY : KhoenState.INTACT) : KhoenState.DISABLED;
  }
  get enabled() { return this.state !== KhoenState.DISABLED; }
  /** One posture break = one crack (capped). Returns true if a crack was added. */
  onTheBreak() {
    if (this.state !== KhoenState.INTACT && this.state !== KhoenState.CRACKING) return false;
    this.cracks = Math.min(this.crackStages, this.cracks + 1);
    this.state = this.cracks >= this.cracksToOpen ? KhoenState.READY : KhoenState.CRACKING;
    return true;
  }
  /** Health floor reached: the fight must still end with the pry, so the khoen opens. */
  forceReady() {
    if (this.state === KhoenState.INTACT || this.state === KhoenState.CRACKING) {
      this.cracks = this.crackStages;
      this.state = KhoenState.READY;
    }
  }
  canBeginPry(targetStaggered) { return this.state === KhoenState.READY && !!targetStaggered; }
  beginPry(targetStaggered) {
    if (!this.canBeginPry(targetStaggered)) return false;
    this.state = KhoenState.PRYING; return true;
  }
  /** Pry failed: cracks are kept (the next stagger reopens the pry). */
  abortPry() { if (this.state === KhoenState.PRYING) this.state = KhoenState.READY; }
  free() { if (this.state === KhoenState.PRYING) this.state = KhoenState.FREED; }
}

/**
 * Rhythm judge for the pry. Beat slots at leadIn + n * 60/bpm (real time, unaffected by hit-stop).
 * Each slot can be consumed once: by a press inside +/- window (hit), by an off-window press (miss),
 * or by passing without input (miss). A beat may be missed miss_retries_per_beat times; one more miss
 * fails the pry. Hold mode: holding the button for hold_duration_per_beat_s completes a beat (no misses).
 * Auto mode: every slot is a hit.
 */
export class PryJudge {
  constructor(pry, { windowAddS = 0, holdMode = false, auto = false, leadInS = null } = {}) {
    this.beats = pry.beats;
    this.interval = 60 / pry.bpm;
    this.window = Math.min(pry.beat_window_s + windowAddS, this.interval / 2);
    this.retries = pry.miss_retries_per_beat;
    this.holdDuration = pry.hold_duration_per_beat_s;
    this.holdMode = holdMode && pry.hold_option;
    this.auto = auto;
    this.leadIn = leadInS ?? this.interval; // one count-in beat
    // How late an input event may be handled and still be judged by its timestamp. The game raises it to
    // one frame when frames are longer than INPUT_GRACE_S (a press is only seen on the next frame), so a
    // slow frame rate never turns an on-time press into a miss.
    this.grace = INPUT_GRACE_S;
    this.t = 0;
    this.slot = 0;             // index of the next unconsumed slot
    this.beat = 0;             // beats completed
    this.missesOnBeat = 0;
    this.holdProgress = 0;
    this.held = false;
    this.result = null;        // null | 'freed' | 'failed'
    this.lastTickedSlot = -1;
  }
  slotTime(n) { return this.leadIn + n * this.interval; }
  get done() { return this.result !== null; }
  /** Seconds until the next slot's centre (negative while inside its late window). */
  get timeToSlot() { return this.slotTime(this.slot) - this.t; }

  _hit(events) {
    this.beat += 1; this.missesOnBeat = 0; this.holdProgress = 0;
    events.push({ type: 'hit', beat: this.beat });
    if (this.beat >= this.beats) { this.result = 'freed'; events.push({ type: 'freed' }); }
  }
  _miss(events) {
    this.missesOnBeat += 1;
    if (this.missesOnBeat > this.retries) {
      this.result = 'failed';
      events.push({ type: 'miss', beat: this.beat + 1, retriesLeft: 0 }, { type: 'failed' });
    } else {
      events.push({ type: 'miss', beat: this.beat + 1, retriesLeft: this.retries - this.missesOnBeat + 1 });
    }
  }

  /** Advance by real dt. Returns events: drum (slot centre reached), hit, miss, freed, failed. */
  tick(dt) {
    const events = [];
    if (this.done || !(dt > 0)) return events;
    this.t += dt;
    // Drum sound on each slot centre.
    while (this.lastTickedSlot + 1 <= this.slot && this.t >= this.slotTime(this.lastTickedSlot + 1)) {
      this.lastTickedSlot += 1;
      events.push({ type: 'drum', slot: this.lastTickedSlot });
      if (this.auto && !this.done && this.lastTickedSlot === this.slot) { this.slot += 1; this._hit(events); }
    }
    if (this.done) return events;
    if (this.holdMode) {
      if (this.held) {
        this.holdProgress += dt;
        if (this.holdProgress >= this.holdDuration) { this._hit(events); this.slot = Math.max(this.slot, this.lastTickedSlot + 1); }
      }
      return events;
    }
    // A slot counts as missed only after window + INPUT_GRACE_S, so a press whose event was handled a
    // frame late is still judged by its own timestamp in press(offset).
    while (!this.auto && !this.done && this.t > this.slotTime(this.slot) + this.window + this.grace) {
      this.slot += 1;
      this._miss(events);
    }
    return events;
  }

  /** A press of the pry button. offsetS: press time relative to the judge clock (negative = the press
   *  happened before the last tick; lets the game judge by input timestamp, not frame time). */
  press(offsetS = 0) {
    const events = [];
    if (this.done || this.holdMode || this.auto) return events;
    const at = this.t + Math.max(-this.grace, offsetS);
    // A press nearer to a later slot than to the current one was aimed at that later slot: the slots it
    // skipped were missed (their auto-miss may still be waiting for the grace), so count them first.
    while (!this.done && at > this.slotTime(this.slot) + this.interval / 2) { this.slot += 1; this._miss(events); }
    if (this.done) return events;
    const centre = this.slotTime(this.slot);
    this.slot += 1;
    if (Math.abs(at - centre) <= this.window) this._hit(events);
    else this._miss(events);
    return events;
  }

  setHeld(held) { this.held = !!held; if (!held && this.holdMode) this.holdProgress = 0; }
}
