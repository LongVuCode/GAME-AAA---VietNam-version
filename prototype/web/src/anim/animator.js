// anim/animator.js - procedural animation state for a humanoid (pure, no three.js). Each frame the
// player passes its gameplay state; the animator builds a pose (anim/pose.js layout) from layers:
//   base   : locomotion cycle (walk / run / sprint, strafing, lean into turns, breathing idle)
//   action : attack keyframes (anticipation -> active -> follow-through -> recovery), dodge roll,
//            parry / guard, charge tremble, drum burst beats, heal, pry lever, knockdown...
//   additive: hit recoil springs, skid, pivot plant
// with a short crossfade whenever the clip changes. No allocation per frame.
import { P, newPose, copyPose, lerpPose, addPose, blendInto } from './pose.js';
import { LIB, BODY } from './humanoidPoses.js';
import { Ease, Spring, attackPhase, clamp01, wobble } from './curves.js';

const TAU = Math.PI * 2;

export class HumanoidAnimator {
  constructor() {
    this.pose = newPose(); this.cur = newPose(); this.from = newPose();
    this.tmpA = newPose(); this.tmpB = newPose(); this.base = newPose();
    this.weapon = 'wp_giao_dong';
    this.key = ''; this.fadeT = 1; this.fadeDur = 0.1;
    this.phase = 0; this.lastSin = 0; this.time = 0;
    this.hit = new Spring(7, 0.55); this.side = new Spring(6, 0.6);
    this.lever = new Spring(9, 0.7); this.stomp = new Spring(8, 0.8);
    this.land = new Spring(9, 0.6); // Demo 0.3 landing squash
    this.ph = { phase: 'anticipation', u: 0 };
    this.onFootPlant = null; // (side: -1|1, speed) => void
    copyPose(this.pose, LIB.wp_giao_dong.stance); copyPose(this.from, this.pose);
  }

  setWeapon(id) { this.weapon = LIB[id] ? id : 'wp_giao_dong'; }
  get lib() { return LIB[this.weapon]?.moves ? LIB[this.weapon] : LIB.wp_giao_dong; }

  /** Recoil: strength 0..1, side -1 (hit from the left) .. +1 (from the right). */
  hitReact(strength = 1, side = 0) { this.hit.kick(-50 * strength); this.side.kick(40 * side * strength); }
  /** Landing squash (Demo 0.3 jump): strength ~ fall height. */
  landKick(strength = 1) { this.land.kick(-9 * strength); }
  /** One pry beat landed (lever pushed down). */
  pryBeat() { this.lever.kick(-14); }

  _clip(key, fade) { if (key !== this.key) { copyPose(this.from, this.pose); this.key = key; this.fadeT = 0; this.fadeDur = fade; } }

  /**
   * ctx: { state, stateT, speed, stride, gait, lean, pitchLean, localX, localZ, skid, pivot,
   *        attack: { id, key, t, tl, level, fromCharge }, charge: { id, t, level, levelT },
   *        dodge: { t, moveT, dur, kind, local }, burst: { t, every, hits }, pryBeats,
   *        knock: { t, downS, upS }, weaponId, finisher: { t, dur } }
   */
  update(dt, ctx) {
    this.time += dt;
    const lib = this.lib, cur = this.cur, st = ctx.state;
    let key = st, fade = 0.12;
    switch (st) {
      case 'attack': key = `atk:${ctx.attack.key}`; fade = ctx.attack.fromCharge ? 0.02 : 0.06; this._attack(cur, lib, ctx.attack); break;
      case 'charge': key = `chg:${ctx.charge.id}`; fade = 0.08; this._charge(cur, lib, ctx.charge); break;
      case 'dodge': key = `dodge:${ctx.dodge.n}`; fade = 0.05; this._dodge(cur, lib, ctx.dodge); break;
      case 'parry': fade = 0.04; this._parry(cur, lib, ctx.stateT); break;
      case 'guard': this._loco(cur, lib, ctx, dt); blendInto(cur, lib.guard, 1); this._legsOnly(cur, lib, ctx, dt, 0.6); break;
      case 'burst': fade = 0.06; this._burst(cur, lib, ctx.burst); break;
      case 'heal': this._loco(cur, lib, ctx, dt); this._heal(cur, ctx.stateT); break;
      case 'call': this._loco(cur, lib, ctx, dt); copyPose(this.tmpA, BODY.call); this.tmpA[P.headYaw] = 0.12 * Math.sin(this.time * 3); blendInto(cur, this.tmpA, 1); break;
      case 'hitstun': this._loco(cur, lib, ctx, dt); break;
      case 'guardbreak': copyPose(cur, BODY.guardBreak); cur[P.spinePitch] += 0.05 * Math.sin(this.time * 9); break;
      case 'knockdown': this._knockdown(cur, lib, ctx.knock); break;
      case 'dead': copyPose(cur, BODY.dead); fade = 0.35; break;
      case 'pry': this._pry(cur, ctx, dt); break;
      case 'craft': this._craft(cur); break;
      case 'handover': copyPose(cur, BODY.handover); cur[P.headPitch] += 0.05 * Math.sin(this.time * 1.4); fade = 0.4; break;
      case 'vault': this._vault(cur, ctx.stateT, ctx.vaultS ?? 0.55); fade = 0.05; break;
      case 'swap': this._swap(cur, lib, ctx.stateT, ctx.swapS ?? 0.15); fade = 0.03; break;
      case 'finisher': this._finisher(cur, lib, ctx.finisher); fade = 0.05; break;
      // Demo 0.3
      case 'air': this._air(cur, lib, ctx.air); fade = ctx.air.phase === 'takeoff' ? 0.03 : 0.08; key = 'air'; break;
      case 'air_attack': key = `atk:${ctx.attack.key}`; fade = 0.04; this._attack(cur, lib, ctx.attack); addPose(cur, cur, BODY.airTuckAdd, 0.8); break;
      case 'plunge': key = `plg:${ctx.attack.key}`; fade = 0.04; this._plunge(cur, lib, ctx); break;
      case 'plunge_land': key = 'plg_land'; fade = 0.02; this._plungeLand(cur, lib, ctx); break;
      case 'land': fade = 0.03; lerpPose(cur, BODY.jumpCrouch, lib.stance, Ease.outQuad(clamp01(ctx.stateT / Math.max(0.05, ctx.landLag)))); break;
      case 'skill': key = `skill:${ctx.skill.n ?? 0}`; fade = 0.05; this._skill(cur, lib, ctx.skill); break;
      case 'riposte': key = `rip:${ctx.riposte?.key ?? 0}`; fade = 0.03; this._riposte(cur, lib, ctx); break;
      case 'tusk_lock': copyPose(cur, BODY.tuskLock); cur[P.spinePitch] += 0.03 * Math.sin(this.time * 2.4); addPose(cur, cur, BODY.pryLeverAdd, (ctx.pryBeats ?? 0) * 0.8 - this.lever.update(dt) * 0.06); fade = 0.12; break;
      default: this._loco(cur, lib, ctx, dt); key = ctx.weaponId === 'pole' ? 'pole' : 'free';
    }
    this._clip(key, fade);
    // Crossfade from the previous clip.
    if (this.fadeT < this.fadeDur) { this.fadeT += dt; lerpPose(this.pose, this.from, cur, Ease.outQuad(clamp01(this.fadeT / this.fadeDur))); }
    else copyPose(this.pose, cur);
    // Additive layers.
    const h = this.hit.update(dt), s = this.side.update(dt);
    if (Math.abs(h) > 1e-4) addPose(this.pose, this.pose, BODY.hitAdd, -h);
    if (Math.abs(s) > 1e-4) addPose(this.pose, this.pose, BODY.hitSideAdd, s);
    if (ctx.skid > 0) addPose(this.pose, this.pose, BODY.skidAdd, ctx.skid);
    if (ctx.pivot) addPose(this.pose, this.pose, BODY.pivotAdd, 1);
    const ld = this.land.update(dt);
    if (Math.abs(ld) > 1e-4) addPose(this.pose, this.pose, BODY.landAdd, Math.min(1.6, -ld));
    return this.pose;
  }

  // ---------------------------------------------------------------- locomotion
  _loco(out, lib, ctx, dt) {
    const speed = ctx.speed ?? 0, stride = Math.max(0.3, ctx.stride ?? 1);
    const run = clamp01((speed - 1.5) / 3.0), spr = clamp01((speed - 5.2) / 1.6);
    // Stance -> run carry -> sprint carry.
    lerpPose(out, lib.stance, lib.run ?? lib.stance, Math.min(1, speed / 2.2));
    if (lib.sprint && spr > 0) blendInto(out, lib.sprint, spr);
    if (ctx.weaponId === 'pole') copyPose(out, LIB.pole.stance);
    const prev = this.phase;
    if (speed > 0.1) this.phase = (this.phase + (speed * dt) / (2 * stride)) % 1;
    const moving = clamp01(speed / 1.2);
    const s = Math.sin(TAU * this.phase), c = Math.cos(TAU * this.phase);
    // Foot plants: sin crosses zero (two per cycle).
    if (speed > 0.6 && this.onFootPlant && Math.sign(s) !== Math.sign(this.lastSin) && this.lastSin !== 0 && prev !== this.phase) this.onFootPlant(s > 0 ? 1 : -1, speed);
    this.lastSin = s;
    const thighAmp = 0.34 + 0.32 * run + 0.38 * spr, kneeAmp = 0.5 + 0.55 * run + 0.6 * spr;
    // Direction of travel relative to the facing (strafing when locked on).
    const lz = ctx.localZ ?? 1, lx = ctx.localX ?? 0;
    const fwdAmp = thighAmp * moving * (Math.abs(lz) > 0.2 ? Math.sign(lz) * Math.max(0.5, Math.abs(lz)) : 0.35);
    const sideAmp = thighAmp * moving * lx * 0.7;
    out[P.thighLP] += fwdAmp * s; out[P.thighRP] -= fwdAmp * s;
    out[P.thighLR] += sideAmp * s * 0.6; out[P.thighRR] -= sideAmp * s * 0.6;
    // Knee folds during the swing (leg moving forward), foot rolls.
    out[P.kneeL] += moving * (0.12 + kneeAmp * Math.max(0, Math.sin(TAU * this.phase + 1.1)));
    out[P.kneeR] += moving * (0.12 + kneeAmp * Math.max(0, Math.sin(TAU * this.phase + 1.1 + Math.PI)));
    out[P.footL] += moving * 0.25 * c; out[P.footR] -= moving * 0.25 * c;
    // Hips bob twice per cycle, sway, counter-rotating chest; weapon bounces.
    const bobAmp = 0.022 + 0.03 * run + 0.025 * spr;
    out[P.hipsY] += moving * (-bobAmp * Math.abs(c) + bobAmp * 0.5);
    out[P.hipsRoll] += moving * 0.05 * s * (1 - spr * 0.5);
    out[P.hipsYaw] += moving * 0.1 * s * (0.6 + run);
    out[P.chestYaw] -= moving * 0.12 * s * (0.6 + run);
    out[P.wpY] += moving * 0.02 * Math.abs(c) * (1 + run);
    out[P.wpPitch] += moving * 0.03 * s;
    // Unarmed FK arms swing opposite to the legs.
    out[P.armLP] -= moving * 0.5 * s * (0.6 + run); out[P.armRP] += moving * 0.5 * s * (0.6 + run);
    out[P.elbowL] += moving * 0.3 * (0.5 + run); out[P.elbowR] += moving * 0.3 * (0.5 + run);
    // Lean into turns (roll toward the inside) and forward on acceleration.
    out[P.hipsRoll] -= ctx.lean ?? 0;
    out[P.spinePitch] += ctx.pitchLean ?? 0;
    // Idle breathing.
    const idle = 1 - moving;
    if (idle > 0) {
      const b = Math.sin(this.time * TAU * 0.28);
      out[P.chestPitch] -= idle * 0.03 * b; out[P.hipsY] += idle * 0.006 * b; out[P.wpY] += idle * 0.012 * b;
      out[P.headYaw] += idle * 0.05 * Math.sin(this.time * 0.37);
    }
  }
  /** Keeps only the legs / hips of the locomotion layer (guard walk). */
  _legsOnly(out, lib, ctx, dt, k) {
    if (!(ctx.speed > 0.1)) return;
    const s = Math.sin(TAU * this.phase);
    out[P.thighLP] += 0.3 * k * s; out[P.thighRP] -= 0.3 * k * s;
    out[P.kneeL] += 0.35 * k * Math.max(0, Math.sin(TAU * this.phase + 1.1));
    out[P.kneeR] += 0.35 * k * Math.max(0, Math.sin(TAU * this.phase + 1.1 + Math.PI));
  }

  // ---------------------------------------------------------------- attacks
  _keys(lib, id) { return lib.moves[id] ?? lib.moves[lib.lightIds[0]]; }
  /** Samples the 3-phase keyframes of a move at time t. */
  sampleAttack(out, lib, id, t, tl, fromCharge = false) {
    const k = this._keys(lib, id);
    const ph = attackPhase(t, tl, this.ph);
    if (ph.phase === 'anticipation') {
      if (fromCharge) lerpPose(out, k.ant, k.ant, 0);
      else if (k.pre) { if (ph.u < 0.4) lerpPose(out, lib.stance, k.pre, Ease.outQuad(ph.u / 0.4)); else lerpPose(out, k.pre, k.ant, Ease.inOutQuad((ph.u - 0.4) / 0.6)); }
      else lerpPose(out, lib.stance, k.ant, Ease.inOutCubic(ph.u));
    } else if (ph.phase === 'active') lerpPose(out, k.ant, k.hit, Ease.outCubic(ph.u));
    else if (ph.phase === 'follow') lerpPose(out, k.hit, k.fol, Ease.outQuad(ph.u));
    else lerpPose(out, k.fol, lib.stance, Ease.inOutQuad(ph.u));
    return ph;
  }
  _attack(out, lib, a) { this.sampleAttack(out, lib, a.id, a.t, a.tl, a.fromCharge); }
  _charge(out, lib, c) {
    const k = this._keys(lib, c.id);
    lerpPose(out, lib.stance, k.ant, Ease.outCubic(clamp01(c.t / 0.25)));
    // Tremble grows with the hold; a small jolt at each level.
    const amp = 0.012 + 0.02 * (c.level ?? 0) + 0.01 * Math.min(1, c.t);
    out[P.wpX] += amp * wobble(this.time, 1); out[P.wpY] += amp * wobble(this.time, 2);
    out[P.chestYaw] += amp * 1.5 * wobble(this.time, 3); out[P.hipsY] -= 0.03 * Math.min(1, c.t);
    out[P.spinePitch] += 0.04 * (c.level ?? 0);
  }

  // ---------------------------------------------------------------- dodge
  _dodge(out, lib, d) {
    const u = clamp01(d.t / Math.max(1e-3, d.moveT));
    if (d.slide) {
      // Sprint + forward dodge: low slide (enter fast, hold, rise in the recovery).
      const k = d.t <= d.moveT ? Math.min(1, u * 4) * (u > 0.8 ? 1 - (u - 0.8) * 2.5 : 1) : 0;
      lerpPose(out, lib.sprint ?? lib.stance, BODY.slide, Ease.outCubic(clamp01(k)));
      return;
    }
    if (d.kind === 'backstep') {
      lerpPose(out, lib.stance, BODY.backstep, Math.sin(Math.PI * Math.min(1, u * 1.15)));
      out[P.hipsY] += 0.07 * Math.sin(Math.PI * u); // small hop
      return;
    }
    // Roll: tuck in, tumble a full turn, open out; recovery blends to the stance.
    const tuck = d.t <= d.moveT ? Math.sin(Math.PI * Math.min(1, u * 1.05)) : 0;
    lerpPose(out, lib.stance, BODY.rollTuck, Math.min(1, tuck * 1.25));
    const spin = TAU * Ease.inOutQuad(u);
    if (d.local === 'left') out[P.tumbleRoll] = -spin;
    else if (d.local === 'right') out[P.tumbleRoll] = spin;
    else if (d.local === 'back') out[P.tumblePitch] = -spin;
    else out[P.tumblePitch] = spin;
  }

  // ---------------------------------------------------------------- defence, items, misc
  _parry(out, lib, t) {
    // Quick deflect: out to the parry pose in 0.07 s, hold through the window, settle back by 0.4 s.
    const u = t < 0.07 ? Ease.outCubic(t / 0.07) : t < 0.2 ? 1 : 1 - Ease.inOutQuad(clamp01((t - 0.2) / 0.2));
    lerpPose(out, lib.stance, lib.parry, u);
  }
  _heal(out, t) {
    const b = BODY.heal;
    const raise = Ease.outCubic(clamp01(t / 0.25));
    copyPose(this.tmpA, b);
    this.tmpA[P.headPitch] += 0.08 * Math.max(0, Math.sin(t * 16)) * (t > 0.3 ? 1 : 0); // chewing nods
    this.tmpA[P.elbowL] += 0.12 * Math.sin(t * 16) * (t > 0.3 ? 1 : 0);
    blendInto(out, this.tmpA, raise);
  }
  _burst(out, lib, b) {
    const every = b.every, t = b.t, beat = Math.min(b.hits - 1, Math.floor(t / every));
    const u = (t - beat * every) / every; // hit lands at u = 0.5
    const lights = lib.lightIds;
    const strike = this._keys(lib, lights[beat % (lights.length - 1)]);
    if (u < 0.32) lerpPose(out, beat === 0 ? lib.stance : strike.fol, lib.burstRaise, Ease.inOutQuad(u / 0.32));
    else if (u < 0.5) lerpPose(out, lib.burstRaise, strike.hit, Ease.inCubic((u - 0.32) / 0.18));
    else lerpPose(out, strike.hit, strike.fol, Ease.outQuad((u - 0.5) / 0.5));
    // Stamp on every beat (stylised drumming: the body is the drumstick); the first is a big stomp.
    const stomp = u < 0.4 ? Math.sin(Math.PI * u / 0.4) : 0;
    if (stomp > 0) addPose(out, out, BODY.stompAdd, stomp * (beat === 0 ? 1 : 0.45));
    if (beat === b.hits - 1 && u > 0.5) { out[P.spinePitch] += 0.12; out[P.hipsY] -= 0.06; }
  }
  _knockdown(out, lib, k) {
    if (k.t < k.downS) { lerpPose(out, lib.stance, BODY.knockdown, Ease.outCubic(clamp01(k.t / 0.35))); return; }
    const u = clamp01((k.t - k.downS) / Math.max(0.05, k.upS));
    if (u < 0.5) lerpPose(out, BODY.knockdown, BODY.getUp, Ease.inOutQuad(u / 0.5));
    else lerpPose(out, BODY.getUp, lib.stance, Ease.inOutQuad((u - 0.5) / 0.5));
  }
  _pry(out, ctx, dt) {
    copyPose(out, BODY.pry);
    // Each landed beat pushes the handle a step lower (lever) plus a spring pulse on the beat.
    const beats = ctx.pryBeats ?? 0;
    addPose(out, out, BODY.pryLeverAdd, beats * 0.9 - this.lever.update(dt) * 0.06);
    out[P.spinePitch] += 0.02 * Math.sin(this.time * 2.1);
  }
  _craft(out) {
    copyPose(out, BODY.craft);
    const hammer = Math.sin(this.time * 7);
    out[P.armRP] += 0.55 * hammer; out[P.elbowR] -= 0.35 * hammer; out[P.chestYaw] -= 0.05 * hammer;
    out[P.headPitch] += 0.03 * hammer;
  }
  _vault(out, t, dur) {
    const u = clamp01(t / dur);
    lerpPose(out, LIB.wp_giao_dong.run, BODY.vault, Math.sin(Math.PI * u));
  }
  _swap(out, lib, t, dur) {
    const u = clamp01(t / dur);
    copyPose(out, lib.stance);
    addPose(out, out, BODY.swapStow, Math.sin(Math.PI * u));
  }
  // ---------------------------------------------------------------- Demo 0.3: jump, air moves, Arts, riposte
  _air(out, lib, a) {
    if (a.phase === 'takeoff') { lerpPose(out, lib.stance, BODY.jumpCrouch, Ease.outCubic(clamp01(a.t / 0.05))); return; }
    // Rise (tucked) -> apex (stretched, brief) -> fall (legs reach for the ground) by vertical speed.
    const vy = a.vy ?? 0;
    if (vy > 2) lerpPose(out, BODY.airRise, BODY.airApex, clamp01(1 - (vy - 2) / 4.9));
    else if (vy > -2) lerpPose(out, BODY.airApex, BODY.airFall, clamp01((2 - vy) / 4));
    else copyPose(out, BODY.airFall);
    if (lib !== LIB.wp_giao_dong) { out[P.wpX] = lib.run[P.wpX]; out[P.wpY] = lib.run[P.wpY]; out[P.wpZ] = lib.run[P.wpZ]; out[P.wpPitch] = lib.run[P.wpPitch]; out[P.wpYaw] = lib.run[P.wpYaw]; }
  }
  _plunge(out, lib, ctx) {
    const k = this._keys(lib, ctx.attack.id), a = ctx.attack;
    if (!ctx.air.falling) lerpPose(out, BODY.airApex, k.ant, Ease.outCubic(clamp01(a.t / Math.max(0.05, a.tl.startup))));
    else { lerpPose(out, k.ant, k.hit, Ease.inCubic(clamp01((a.t - a.tl.startup) / 0.12))); addPose(out, out, BODY.airTuckAdd, 0.4); }
  }
  _plungeLand(out, lib, ctx) {
    const k = this._keys(lib, (ctx.attack.id || '').replace(/_l$/, '_h'));
    const u = clamp01(ctx.stateT / Math.max(0.1, ctx.plungeRec));
    if (u < 0.55) lerpPose(out, k.hit, k.fol, Ease.outCubic(u / 0.55)); else lerpPose(out, k.fol, lib.stance, Ease.inOutQuad((u - 0.55) / 0.45));
  }
  _skill(out, lib, s) {
    const k = s.run; if (!k) { copyPose(out, lib.stance); return; }
    const tl = this._skTl ?? (this._skTl = { startup: 0, active: 0, recovery: 0 });
    const t = s.t;
    if (k.kind === 'vault') {
      // Plant the butt, bend, spring up (pole-vault), drive the point down where you land.
      const keys = this._keys(lib, 'sp_air_h');
      if (t < k.airFrom) lerpPose(out, lib.stance, BODY.jumpCrouch, Ease.outCubic(t / k.airFrom));
      else if (t < k.airTo) { const u = (t - k.airFrom) / (k.airTo - k.airFrom); lerpPose(out, BODY.airRise, keys.ant, Ease.inOutQuad(u)); if (u > 0.6) lerpPose(out, out, keys.hit, Ease.inCubic((u - 0.6) / 0.4)); }
      else lerpPose(out, keys.fol, lib.stance, Ease.inOutQuad(clamp01((t - k.airTo) / (k.total - k.airTo))));
      return;
    }
    if (k.kind === 'sweep') {
      tl.startup = k.hitFrom; tl.active = k.hitTo - k.hitFrom; tl.recovery = Math.max(0.1, k.total - k.hitTo);
      const id = lib === LIB.wp_riu_xeo ? 'ax_l4' : 'sp_l3';
      this.sampleAttack(out, lib, id, t, tl);
      addPose(out, out, BODY.sweepLowAdd, 1);
      // Full turn of the body during the sweep (reverse on the second sweep).
      const u = clamp01((t - k.hitFrom) / Math.max(0.05, k.hitTo - k.hitFrom));
      out[P.hipsYaw] += (k.second ? -1 : 1) * TAU * Ease.inOutQuad(u) * (t < k.hitTo + 0.05 ? 1 : 0);
      return;
    }
    if (k.kind === 'cleave') {
      tl.startup = k.hitFrom; tl.active = k.hitTo - k.hitFrom; tl.recovery = k.total - k.hitTo;
      this.sampleAttack(out, lib, lib === LIB.wp_riu_xeo ? 'ax_h1' : 'sp_h1', t, tl);
      if (t < k.hitFrom) { const amp = 0.012 + 0.03 * (t / k.hitFrom); out[P.wpX] += amp * wobble(this.time, 1); out[P.chestYaw] += amp * wobble(this.time, 3); }
      return;
    }
    tl.startup = k.hitFrom; tl.active = k.hitTo - k.hitFrom; tl.recovery = k.total - k.hitTo;
    this.sampleAttack(out, lib, lib === LIB.wp_riu_xeo ? 'ax_b1' : 'sp_b1', t, tl);
    if (t < k.dashEnd) { out[P.spinePitch] += 0.3; out[P.hipsY] -= 0.1; }
  }
  _riposte(out, lib, ctx) {
    const r = ctx.riposte, dur = r?.dur ?? 0.8, tl = this._ripTl ?? (this._ripTl = { startup: 0, active: 0, recovery: 0 });
    tl.startup = dur * 0.38; tl.active = dur * 0.1; tl.recovery = dur * 0.52;
    this.sampleAttack(out, lib, lib === LIB.wp_riu_xeo ? 'ax_c1' : 'sp_h1', ctx.stateT, tl);
  }

  _finisher(out, lib, f) {
    // Finisher on a broken normal enemy: big upswing that flips it (sp_b1 / ax_b1 shape, slower).
    const id = lib === LIB.wp_riu_xeo ? 'ax_l3' : 'sp_b1';
    const dur = f.dur, tl = this._finTl ?? (this._finTl = { startup: 0, active: 0, recovery: 0 });
    tl.startup = dur * 0.42; tl.active = dur * 0.12; tl.recovery = dur * 0.46;
    this.sampleAttack(out, lib, id, f.t, tl);
  }
}
