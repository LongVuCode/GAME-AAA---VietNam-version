// player.js - player actor (Cói / Bương): three-gait movement with inertia (logic/locomotion.js),
// combo / charge / dodge / parry / guard / burst / heal (logic/*), attacks that step and connect over
// their active frames (logic/attackMotion.js), weapon swap mid-combo, knockback / knockdown, and the
// procedural animation of a jointed rig (src/anim). Rules come from combat_tuning / weapons data.
import { DefenseController } from '../logic/defense.js';
import { DrumMeter } from '../logic/drum.js';
import { Posture } from '../logic/posture.js';
import { InputBuffer, chargeLevel, moveTimeline, selectMove } from '../logic/combo.js';
import { PROTO } from '../logic/proto.js';
import { Locomotion, planDodge, dodgeProgress, DodgeChain, turnToward, normAngle, DEG } from '../logic/locomotion.js';
import { motionFor, planLunge, lungeAt, afterMoveAt, canSwapNow, isSprintAttack } from '../logic/attackMotion.js';
import { ModeLatch, SprintControl, sprintModeFor } from '../logic/controls.js';
import { HumanoidRig } from '../anim/rig.js';
import { HumanoidAnimator } from '../anim/animator.js';
import { LIB, GRIPS } from '../anim/humanoidPoses.js';
import { makeAxe, makePole, makeSpear } from './meshes.js';
import { JumpController, landingLag } from '../logic/jump.js';
import { skillsForWeapon, levelEntry, effectiveCooldown, SkillCooldowns } from '../logic/skills.js';

const DODGE_FROM = new Set(['free', 'guard', 'charge', 'parry', 'heal', 'swap']);
const BUFFER_IN = new Set(['attack', 'dodge', 'parry', 'swap', 'land', 'plunge_land', 'skill']);
// Demo 0.3: airborne states (jump, light air attack, plunge). No dodge / guard / heal / Arts in the air.
const AIR_STATES = new Set(['air', 'air_attack', 'plunge']);
const CANCEL_SOURCES = new Set(['attack', 'skill', 'land', 'plunge_land', 'charge']);

export class Player {
  constructor(game) {
    this.game = game;
    const tun = game.data.combat;
    this.tun = tun;
    this.defense = new DefenseController(tun.dodge, tun.guard, game.diff.parryWindowS);
    this.drum = new DrumMeter(tun.drum_rhythm);
    this.buffer = new InputBuffer(tun.input.buffer_s);
    this.loco = new Locomotion(tun.movement);
    this.dodgeChain = new DodgeChain(tun.dodge);
    this.guardLatch = new ModeLatch(); this.heavyLatch = new ModeLatch(); this.walkLatch = new ModeLatch();
    this.sprintCtl = new SprintControl();
    this.jc = new JumpController(tun.movement.jump); // Demo 0.3 jump (movement.jump)
    this.skillCd = new SkillCooldowns();             // Demo 0.3 Weapon Arts (skills.json)
    this.anim = new HumanoidAnimator();
    this.animCtx = { state: 'free', stateT: 0, speed: 0, stride: 1, gait: 'idle', lean: 0, pitchLean: 0, localX: 0, localZ: 1, skid: 0, pivot: false,
      attack: { id: '', key: 0, t: 0, tl: null, level: 0, fromCharge: false }, charge: { id: '', t: 0, level: 0 },
      dodge: { n: 0, t: 0, moveT: 0.3, kind: 'roll', local: 'fwd' }, burst: { t: 0, every: 0.6, hits: 4 }, pryBeats: 0,
      knock: { t: 0, downS: 0.5, upS: 0.8 }, weaponId: 'wp_giao_dong', finisher: { t: 0, dur: 0.9 }, vaultS: 0.55, swapS: 0.15,
      air: { phase: 'ground', vy: 0, y: 0, t: 0 }, skill: { id: '', t: 0, run: null }, landLag: 0.1, y: 0 };
    this.anim.onFootPlant = (side, speed) => this.game.fxh?.playerFootPlant(this, side, speed);
    this.moveKey = 0;
    this.setCharacter('chr_coi');
    this.respawn(game.checkpointPos());
  }

  setCharacter(id) {
    if (this.rig) this.game.scene.remove(this.rig.root);
    const coi = id === 'chr_coi';
    this.rig = new HumanoidRig(coi ? { body: 0x41657a, hatColor: 0xd8c48a } : { body: 0x7a5a3a, hat: false, height: 1.05 });
    this.figure = { root: this.rig.root };
    this.weaponMeshes = { wp_giao_dong: makeSpear(), wp_riu_xeo: makeAxe() };
    for (const m of Object.values(this.weaponMeshes)) { m.visible = false; this.rig.weaponPivot.add(m); }
    this.pole = makePole(); this.pole.visible = false; this.rig.weaponPivot.add(this.pole);
    this.game.scene.add(this.rig.root);
    this.character = id;
  }

  respawn(pos) {
    const tun = this.tun;
    this.x = pos.x; this.z = pos.z; this.yaw = Math.PI;
    this.hpMax = tun.player.hp_max; this.hp = this.hpMax;
    this.the = new Posture({ max: tun.player.the_max, regenPerS: tun.player.the_regen_per_s, regenDelayS: tun.player.the_regen_delay_s, staggerS: tun.player.guard_break_stun_s });
    this.state = 'free'; this.stateT = 0; this.cur = null; this.pending = null;
    this.lastMove = null; this.lastMoveEnd = -Infinity; this.chainIndex = 0;
    this.afterDodgeUntil = -Infinity; this.perfectParryUntil = -Infinity; this.postPerfectDodgeUntil = -Infinity; this.swapAttackUntil = -Infinity;
    this.iframesUntil = -Infinity; this.knock = null; this.lastSprintS = 0; this.lastSprintAt = -Infinity;
    this.slowT = 0; this.heals = tun.healing.charges; this.invulnDebug = this.invulnDebug ?? false;
    this.buffer.clear(); this.defense.action = 'none';
    this.loco.reset(); this.sprintCtl.cancel(); this.guardLatch.cancel(); this.heavyLatch.cancel();
    this.alive = true; this.animOverride = null; this.moving = false;
    this.now = 0;
    // Demo 0.3
    this.y = 0; this.jc.reset(); this.airV = { x: 0, z: 0 }; this.airLightUsed = false; this.airSprint = false; this.pendingPlunge = false;
    this.skill = null; this.skillCd.clear(); this.riposteRun = null; this.landLag = 0; this.plungeRec = 0;
    this.keptChain = null; this.dodgeCancel = false; this.nextL4Until = -Infinity; this.sweepAgain = null;
  }

  get weaponId() { return this.game.gen.weapons[this.slot ?? 0] ?? this.game.gen.weapons[0]; }
  get weapon() { return this.game.data.weapons.weapons.find((w) => w.id === this.weaponId); }
  distanceTo(x, z) { return Math.hypot(this.x - x, this.z - z); }
  get acting() { return this.state !== 'free' && this.state !== 'guard'; }
  get sprinting() { return this.loco.sprinting; }
  get speed() { return this.loco.speed; }
  /** Extra invulnerability (knockdown get-up, finisher) on top of the dodge i-frames. */
  get invulnerable() {
    return this.now < this.iframesUntil || (this.state === 'finisher' && this.tun.finisher?.player_invulnerable !== false)
      || this.state === 'riposte' || this.state === 'tusk_lock' || (this.state === 'burst' && !!this.game.gp?.burstInvulnerable);
  }
  get airborne() { return this.y > 0.001 || AIR_STATES.has(this.state); }

  update(dt, now, input) {
    const g = this.game;
    this.now = now;
    if (!this.alive) { this._anim(dt); return; }
    const acc = g.settings.acc;
    const guardHeld = this.guardLatch.update(acc.acc_guard_mode ?? 'hold', input.isDown('parry'), input.pressed('parry'));
    this.defense.setGuardHeld(guardHeld);
    this.defense.tick(dt);
    // Sprinting pauses Thế regeneration (movement.sprint_the_regen_mult = 0): the cost of sprinting.
    const regen = this.loco.sprinting && !this.the.staggered ? (this.tun.movement.sprint_the_regen_mult ?? 0) : 1;
    if (this.the.tick(dt * regen) && this.state === 'guardbreak') this.state = 'free';
    this.drum.tick(dt);
    this.slowT = Math.max(0, this.slowT - dt);
    this.stateT += dt;
    this._applyKnock(dt);
    if (g.locked) { this.loco.speed = 0; this.sprintCtl.cancel(); if (this.y > 0 && this.state !== 'skill') { this.jc.reset(); this.y = 0; } this._sprintFx(); this._anim(dt); return; } // cutscene / pry / menus handle the player

    // ---- walk / sprint requests
    const mv = this._camRelative(input);
    this.walkOn = this.walkLatch.update(acc.acc_walk_mode ?? 'toggle', input.isDown('walk'), input.pressed('walk'));
    this.sprintCtl.update(dt, { mode: sprintModeFor(acc.acc_sprint_mode, input.device, g.data.controls), down: input.isDown('sprint'), pressed: input.pressed('sprint'),
      moveMag: mv.len, minRatio: this.tun.movement.sprint_requires_move_input_ratio, autoDelayS: acc.acc_sprint_auto_delay_s ?? 0.6,
      dodgeHeld: !!acc.acc_sprint_on_dodge_hold && input.isDown('dodge') && this.stateT > 0.3 && this.state === 'free' });

    // ---- jump (movement.jump, DEMO_0_3 §2): buffered press, coyote time, no i-frames
    if (input.pressed('jump') && this.tun.movement.jump_enabled !== false) this.jc.request(now);
    this.jc.setGrounded(this.state !== 'vault', now);
    if (this._jumpAllowed() && this.jc.tryStart(now, true, { fullOnTap: !!acc.acc_jump_full_height_on_tap })) this._startJump(now);

    // ---- defensive inputs (highest priority)
    if (input.pressed('dodge') && this._canDodge()) this._startDodge(mv);
    else if (input.pressed('parry') && (this.state === 'free' || this.state === 'guard')) {
      if (this.defense.startParry()) { this.state = 'parry'; this.stateT = 0; this.chainIndex = 0; } // any other action breaks the 'pause' branch
    }
    if (input.pressed('drum_burst') && this.state === 'free' && this.drum.canBurst() && !g.noAttack) this._startBurst();
    if (input.pressed('heal') && this.state === 'free') {
      if (this.heals > 0) { this.state = 'heal'; this.stateT = 0; } else g.ui.toast(g.i18n.t('msg_heal_none'));
    }
    // ---- attack inputs
    if (!g.noAttack) {
      if (input.pressed('attack_light')) this._attackInput('L', now, mv);
      const toggleHeavy = (acc.acc_heavy_charge_mode ?? 'hold') === 'toggle';
      if (input.pressed('attack_heavy')) {
        if (toggleHeavy && this.state === 'charge') this._releaseCharge(now);
        else this._attackInput('H', now, mv);
      }
      if (this.state === 'charge') {
        const held = toggleHeavy ? true : input.isDown('attack_heavy');
        this._chargeTick();
        if (!held || this.stateT >= this._maxChargeTime()) this._releaseCharge(now);
      }
    }
    if (input.pressed('weapon_slot_1') || input.pressed('weapon_slot_2')) g.swapWeapon(input.pressed('weapon_slot_1') ? 0 : 1);
    // ---- Weapon Arts (skills.json): 3 / 4, pad LT + attack
    if (!g.noAttack && (input.pressed('skill_1') || input.pressed('skill_2'))) this.useSkill(input.pressed('skill_1') ? 0 : 1, now);

    // ---- state machines
    this.moving = false;
    switch (this.state) {
      case 'free': case 'guard': this._move(dt, mv, guardHeld && this.state === 'guard'); break;
      case 'parry':
        this._brake(dt);
        if (this.defense.action !== 'parry') this.state = guardHeld ? 'guard' : 'free';
        break;
      case 'attack': this._updateAttack(dt, now); break;
      case 'dodge': this._updateDodge(dt, now); break;
      case 'burst': this._updateBurst(dt); break;
      case 'heal':
        this._move(dt, mv, true, 0.45);
        if (this.stateT >= this.tun.healing.use_time_s) {
          this.heals -= 1; this.hp = Math.min(this.hpMax, this.hp + this.hpMax * this.tun.healing.heal_ratio);
          this.state = 'free'; g.sfx.pickup();
        }
        break;
      case 'hitstun': this._brake(dt); if (this.stateT >= this.stunS) this.state = 'free'; break;
      case 'knockdown': this._brake(dt); if (this.stateT >= this.knockDownS + this.knockUpS) this.state = 'free'; break;
      case 'guardbreak': this._brake(dt); if (!this.the.staggered) this.state = 'free'; break;
      case 'charge': this._brake(dt); this._reaim(dt); break;
      case 'swap': this._updateSwap(dt, now); break;
      case 'vault': this._updateVault(dt); break;
      case 'finisher': this._brake(dt); break;
      case 'air': case 'air_attack': case 'plunge': this._updateAir(dt, now, mv, input); break;
      case 'land': this._brake(dt); if (this.stateT >= this.landLag) this.state = 'free'; break;
      case 'plunge_land': this._brake(dt); if (this.stateT >= this.plungeRec) this.state = 'free'; break;
      case 'skill': this._updateSkill(dt, now, mv); break;
      case 'riposte': this._updateRiposte(dt); break;
      case 'tusk_lock': this._brake(dt); break;
      default: break;
    }
    // Knocked out of the air (hit, guard break): keep falling.
    if (this.jc.airborne && !AIR_STATES.has(this.state)) { const r = this.jc.step(dt, { held: false }); this.y = this.jc.y; if (r.landed) this.y = 0; }
    if (this.state === 'guard' && !guardHeld) this.state = 'free';
    if (this.state === 'free' && guardHeld && this.defense.action === 'none') this.state = 'guard';
    if (this.state === 'free') this._tryBuffered(now, input);
    if (this.loco.sprinting) { this.lastSprintS = this.loco.sprintT; this.lastSprintAt = now; }
    this._sprintFx();
    this._anim(dt);
  }

  // ---------------------------------------------------------------- movement
  _camRelative(input) {
    const mv = input.moveVector();
    const yaw = this.game.cam.yaw;
    // Camera looks along -z at yaw 0; forward = (−sin yaw, −cos yaw).
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const o = this._mvOut ?? (this._mvOut = { x: 0, z: 0, len: 0, dx: 0, dz: 0 });
    o.x = rx * mv.x - fx * mv.z; o.z = rz * mv.x - fz * mv.z; o.len = mv.mag;
    const l = Math.hypot(o.x, o.z); o.dx = l > 1e-6 ? o.x / l : 0; o.dz = l > 1e-6 ? o.z / l : 0;
    return o;
  }

  _surfMult() {
    const surf = this.game.walk.speedMult(this.x, this.z), m = this.tun.movement;
    let k = surf === 'mud' ? m.mud_speed_mult : surf === 'shallow' ? m.shallow_water_speed_mult : 1;
    if (this.slowT > 0) k *= this.slowMult ?? 1;
    const tr = this.game.gp?.trailAt(this.x, this.z); // Demo 0.3 mud trails of the crossing charges
    if (tr) k *= tr.mult;
    return k;
  }

  _move(dt, mv, guard, speedCap = 1) {
    const g = this.game, target = g.lockTarget;
    const lockYaw = target ? Math.atan2(target.x - this.x, target.z - this.z) : null;
    const trail = g.gp?.trailAt(this.x, this.z);
    const r = this.loco.update(dt, this.yaw, { dirX: mv.dx, dirZ: mv.dz, mag: mv.len, walk: this.walkOn, sprint: this.sprintCtl.active && !guard && speedCap >= 1 && !trail?.blocksSprint,
      guard, lockYaw, surfMult: this._surfMult() * speedCap });
    this.yaw = r.yaw;
    if (r.dx || r.dz) {
      const m = g.walk.move(this.x, this.z, r.dx, r.dz, PROTO.playerRadiusM);
      if (Math.abs(m.x - this.x - r.dx) + Math.abs(m.z - this.z - r.dz) > 1e-4) this._blocked(r.dx, r.dz);
      this.x = m.x; this.z = m.z;
    }
    this.moving = this.loco.speed > 0.15;
  }
  /** Decelerate in place (actions that root the player) while keeping the inertia readable. */
  _brake(dt) {
    const l = this.loco, m = this.tun.movement;
    l.speed = Math.max(0, l.speed - (m.decel_mps2 ?? 40) * dt);
    l.sprinting = false; l.sprintT = 0;
    if (l.speed > 0) { const s = this.game.walk.move(this.x, this.z, Math.sin(this.yaw) * l.speed * dt, Math.cos(this.yaw) * l.speed * dt, PROTO.playerRadiusM); this.x = s.x; this.z = s.z; }
  }
  /** Ran into something: a vault obstacle at sprint speed is crossed automatically (contextual vault). */
  _blocked(dx, dz) {
    const cv = this.tun.movement.contextual_vault;
    if (!cv?.enabled || !cv.auto_from_sprint || !this.loco.sprinting) return;
    const v = this.game.walk.vaultAhead?.(this.x, this.z, this.yaw, cv.max_gap_m);
    if (v) this.startVault(v);
  }
  startVault(v) {
    const cv = this.tun.movement.contextual_vault;
    this.state = 'vault'; this.stateT = 0;
    this.vault = { x0: this.x, z0: this.z, x1: v.x, z1: v.z, dur: cv.duration_s ?? 0.55 };
    this.yaw = Math.atan2(v.x - this.x, v.z - this.z);
    this.game.sfx.dodge(false);
    this.game.fxh?.dodgeStart(this, { x: Math.sin(this.yaw), z: Math.cos(this.yaw) });
  }
  _updateVault() {
    const v = this.vault, u = Math.min(1, this.stateT / v.dur);
    this.x = v.x0 + (v.x1 - v.x0) * u; this.z = v.z0 + (v.z1 - v.z0) * u;
    if (u >= 1) { this.state = 'free'; this.game.fxh?.playerFootPlant(this, 1, 6); }
  }

  _sprintFx() {
    const g = this.game, feel = this.tun.feel ?? {};
    const k = Math.max(0, Math.min(1, (this.loco.speed - this.tun.movement.run_speed_mps) / (this.tun.movement.sprint_speed_mps - this.tun.movement.run_speed_mps)));
    const want = Math.round(k * (feel.fov_sprint_add_deg ?? 6) * 4) / 4;
    if (want !== this._sprintFov) { this._sprintFov = want; g.fx?.setFovOffset('sprint', want); }
  }

  _turnTo(yaw, rate) { this.yaw = turnToward(this.yaw, yaw, rate); }

  // ---------------------------------------------------------------- attacks
  _canDodge() {
    if (!this.dodgeChain.canStart(this.now)) return false;
    if (DODGE_FROM.has(this.state)) return true;
    // Demo 0.3 dodge cancel (dodge_cancel_0_3): landing lag, plunge recovery after 0.25 s, Arts after the hit.
    const dc = this.tun.dodge_cancel_0_3 ?? {}, J = this.tun.movement.jump;
    if (AIR_STATES.has(this.state)) return !!dc.from_air;
    if (this.state === 'land') return dc.from_landing_lag !== false && J.landing?.lag_dodge_cancelable !== false;
    if (this.state === 'plunge_land') return this.stateT >= (dc.from_plunge_recovery_after_s ?? J.air_attacks?.plunge_dodge_cancel_after_s ?? 0.25);
    if (this.state === 'skill' && this.skill) return dc.from_skill_after_active !== false && this.skill.t >= this.skill.activeEnd;
    if (this.state === 'attack' && this.cur) {
      const intoRecovery = this.cur.t - (this.cur.tl.startup + this.cur.tl.active);
      return intoRecovery >= this.tun.dodge.cancel_attack_recovery_after_s;
    }
    return this.state === 'dodge' && this.stateT >= this.tun.dodge.duration_s - this.tun.dodge.recovery_s;
  }

  _attackInput(type, now, mv) {
    if (AIR_STATES.has(this.state)) { this._airAttack(type, now); return; }
    if (this.state === 'free' || this.state === 'guard') this._beginAttack(type, now, false, mv);
    else if (BUFFER_IN.has(this.state)) this.buffer.push(type, now);
  }

  _tryBuffered(now, input) {
    const b = this.buffer.consume(now);
    if (!b) return;
    if (b.type === 'H' && !input.isDown('attack_heavy')) this._beginAttack('H', now, true);
    else this._beginAttack(b.type, now);
  }

  _ctx(now) {
    const mods = this.game.mods;
    const house = this.game.gen.houseMoves.length ? this.game.data.lineage.house_moves.find((h) => h.id === this.game.gen.houseMoves[0]) : null;
    return { now, lastMove: this.lastMove, lastMoveEnd: this.lastMoveEnd, chainIndex: this.chainIndex,
      afterDodgeUntil: this.afterDodgeUntil, perfectParryUntil: this.perfectParryUntil, maxChain: mods.maxChain,
      houseMove: house, inputTuning: this.tun.input };
  }

  _beginAttack(type, now, instantHeavy = false, mv = null) {
    let sel = selectMove(this.weapon, type, this._ctx(now));
    // Sprint attack (weapons[].sprint_attack) and swap attack (swap_attack): light only, override the chain opener.
    const w = this.weapon, am = this.tun.attack_motion;
    const sprintS = this.loco.sprinting ? this.loco.sprintT : now - this.lastSprintAt < 0.15 ? this.lastSprintS : 0;
    if (type === 'L' && sel.kind === 'chain' && now <= this.swapAttackUntil && w.swap_attack) {
      sel = { move: w.moves.find((m) => m.id === w.swap_attack.base_move) ?? sel.move, kind: 'swap' };
    } else if (type === 'L' && sel.kind === 'chain' && sel.move.chain_index === 1 && w.sprint_attack && isSprintAttack(sprintS, am)) {
      sel = { move: w.moves.find((m) => m.id === w.sprint_attack.base_move) ?? sel.move, kind: 'sprint' };
    }
    // Cắm sào vọt rank 3: the first light after landing is Đâm xoáy (next_light_is_chain_index).
    if (type === 'L' && sel.kind === 'chain' && now <= this.nextL4Until) {
      const m4 = w.moves.find((m) => m.input === 'L' && m.chain_index === 4); if (m4) sel = { move: m4, kind: 'chain' };
      this.nextL4Until = -Infinity;
    }
    this.perfectParryUntil = -Infinity; this.afterDodgeUntil = -Infinity; this.swapAttackUntil = -Infinity;
    // Attack toward the stick when nothing is targeted.
    if (mv && mv.len > 0.3 && !this.game.lockTarget && !this._aimTarget()) this.yaw = Math.atan2(mv.dx, mv.dz);
    if (sel.kind === 'heavy' && !instantHeavy) {
      this.state = 'charge'; this.stateT = 0; this.pending = sel; this.chargeShown = 0; this._faceTargetForAttack(true);
      return;
    }
    this._startMove(sel, 0, false);
  }

  _maxChargeTime() {
    const h = this.pending?.move; if (!h?.charge) return 0;
    const lv = this.game.mods.heavyMaxLevel >= 2 ? h.charge.max_level : 1;
    return h.charge.time_per_level_s * lv + 0.05;
  }
  _chargeLevelNow() { return this.pending ? chargeLevel(this.pending.move, this.stateT, this.tun.input, this.game.mods.heavyMaxLevel >= 2) : 0; }
  _chargeTick() {
    const lv = this._chargeLevelNow();
    if (lv > (this.chargeShown ?? 0)) { this.chargeShown = lv; this.game.onChargeLevel?.(this, lv); }
  }

  _releaseCharge(now) {
    if (this.state !== 'charge' || !this.pending) return;
    const sel = this.pending; this.pending = null;
    const lv = this._chargeLevelNow();
    this._startMove(sel, lv, true);
  }

  /** Lock target, else soft aim (difficulty), else the nearest enemy in front within magnetism reach. */
  _aimTarget(range = 3) {
    const g = this.game;
    if (g.lockTarget) return g.lockTarget;
    const s = g.softAim?.(); if (s) return s;
    let best = null, bestD = Infinity;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    for (const e of g.allEnemies()) {
      if (!e.lockable) continue;
      const dx = e.x - this.x, dz = e.z - this.z, d = Math.hypot(dx, dz) - e.radius;
      if (d > range + (this.tun.attack_motion?.magnetism_max_m ?? 1.5)) continue;
      if ((dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1) < 0.5) continue; // within ±60°
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }
  _faceTargetForAttack(snap = false) {
    const t = this._aimTarget();
    if (t && snap) this.yaw = Math.atan2(t.x - this.x, t.z - this.z);
    return t;
  }
  _reaim(dt) {
    const t = this.cur?.target ?? this._aimTarget();
    if (t) this._turnTo(Math.atan2(t.x - this.x, t.z - this.z), (this.tun.attack_motion?.reaim_turn_rate_deg_s ?? 540) * DEG * dt);
  }

  _startMove(sel, level, fromCharge) {
    const range = sel.move.range_m ?? 2;
    const mo = motionFor(sel.move, this.weapon, { kind: sel.kind, chargeLevel: level });
    const target = this._aimTarget(range + mo.lungeM);
    // Big turns snap (the stick / lock decided), small ones re-aim at reaim_turn_rate until the active frames.
    if (target) {
      const want = Math.atan2(target.x - this.x, target.z - this.z);
      if (Math.abs(normAngle(want - this.yaw)) > 1.2) this.yaw = want;
    }
    const surf = target ? Math.max(0, Math.hypot(target.x - this.x, target.z - this.z) - target.radius) : null;
    const lunge = planLunge(mo.lungeM, range, surf, this.tun.attack_motion);
    const key = ++this.moveKey;
    const keys = (LIB[this.weaponId] ?? LIB.wp_giao_dong).moves;
    const animId = sel.kind === 'house' ? 'house' : sel.move.id;
    this.cur = { ...sel, t: 0, tl: moveTimeline(sel.move), level, fromCharge, motion: mo, lunge, lungeDone: 0, afterDone: 0, driftDone: 0,
      target, hit: new Set(), u: 0, key, animId, sweepDir: keys[animId]?.sweepDir ?? 1, hitAny: false };
    this.state = 'attack'; this.stateT = 0;
    if (sel.kind === 'chain' || sel.kind === 'sprint' || sel.kind === 'swap') this.chainIndex = sel.move.chain_index;
    if (this.game.fxh) this.game.fxh.swingStart(this, this.cur); else this.game.sfx.whoosh(); // fx: trail + whoosh timed to the swing
    this.game.onAttackStart?.(this, this.cur);
  }

  _step(dist) {
    if (!dist) return;
    const m = this.game.walk.move(this.x, this.z, Math.sin(this.yaw) * dist, Math.cos(this.yaw) * dist, PROTO.playerRadiusM);
    this.x = m.x; this.z = m.z;
  }

  _updateAttack(dt, now) {
    const c = this.cur, tl = c.tl, mo = c.motion;
    const t0 = c.t; c.t += dt; const t = c.t;
    this.loco.speed = Math.max(0, this.loco.speed - 40 * dt); this.loco.sprinting = false; this.loco.sprintT = 0;
    // Re-aim toward the target until the active frames start, then the direction is locked.
    if (t < tl.startup) this._reaim(dt);
    // Lunge over the startup (lands on the contact), recovery step, spin drift.
    const lunge = lungeAt(t, c.lunge, mo.lungeStartS, mo.lungeEndS) - c.lungeDone;
    // Do not walk through the target: stop at the magnetism gap.
    let step = lunge;
    if (c.target && step > 0) {
      const d = Math.hypot(c.target.x - this.x, c.target.z - this.z) - c.target.radius - (this.tun.attack_motion?.magnetism_stop_gap_m ?? 0.3);
      step = Math.min(step, Math.max(0, d));
    }
    this._step(step); c.lungeDone += lunge;
    const recStart = tl.startup + tl.active;
    const after = afterMoveAt(t, mo.afterM, recStart, tl.recovery) - c.afterDone; this._step(after); c.afterDone += after;
    if (mo.driftM) { const dr = mo.driftM * Math.max(0, Math.min(1, (t - tl.startup) / (tl.active + tl.recovery * 0.4))) - c.driftDone; this._step(dr); c.driftDone += dr; }
    // Swept hit over the whole active window.
    if (t > tl.startup && t0 < recStart + 1e-6) {
      const u0 = Math.max(0, (t0 - tl.startup) / tl.active), u1 = Math.min(1, (t - tl.startup) / tl.active);
      this.game.sweepStrike(c, u0, u1, now <= this.postPerfectDodgeUntil);
    }
    if (t >= tl.total) {
      this.lastMove = c.move; this.lastMoveEnd = now;
      if (c.kind !== 'chain' && c.kind !== 'sprint' && c.kind !== 'swap') this.chainIndex = 0;
      this.cur = null; this.state = 'free';
    }
  }
  get inRecovery() { return this.state === 'attack' && !!this.cur && this.cur.t >= this.cur.tl.startup + this.cur.tl.active; }

  // ---------------------------------------------------------------- weapon swap (weapon_swap)
  requestSwap(slot) {
    const ws = this.tun.weapon_swap;
    if (!canSwapNow(ws, this.state, this.inRecovery)) return false;
    if ((this.slot ?? 0) === slot) return false;
    if (this.state === 'attack') { this.lastMove = this.cur.move; this.lastMoveEnd = this.now; this.cur = null; }
    this.state = 'swap'; this.stateT = 0; this.swapTo = slot; this.swapDone = false;
    if (!ws?.keeps_chain) this.chainIndex = 0;
    return true;
  }
  _updateSwap(dt, now) {
    const ws = this.tun.weapon_swap, dur = ws?.swap_time_s ?? 0.15;
    this._brake(dt);
    if (!this.swapDone && this.stateT >= dur * 0.5) { this.swapDone = true; this.slot = this.swapTo; this.game.onSwapped(this); }
    if (this.stateT >= dur) { this.state = 'free'; this.swapAttackUntil = now + (ws?.swap_attack_window_s ?? 0.35); }
  }

  // ---------------------------------------------------------------- dodge
  _startDodge(mv) {
    if (!this.defense.startDodge()) return;
    const from = this.state;
    this.dodgeCancel = CANCEL_SOURCES.has(from);
    this.keptChain = from === 'attack' && this.cur && this.cur.move.input === 'L' ? { move: this.cur.move, index: this.chainIndex } : null;
    if (from === 'skill') this._endSkill(this.now);
    if (this.state === 'charge') this.pending = null;
    const g = this.game;
    const plan = planDodge(this.tun.dodge, { dirX: mv.dx, dirZ: mv.dz, mag: mv.len, camYaw: g.cam.yaw, yaw: this.yaw,
      sprinting: this.loco.sprinting || this.loco.speed > this.tun.movement.run_speed_mps + 0.5, locked: !!g.lockTarget });
    this.dodge = { ...plan, done: 0, moveT: this.tun.dodge.duration_s - this.tun.dodge.recovery_s };
    this.dodgeDir = { x: plan.dirX, z: plan.dirZ };
    this.yaw = plan.faceYaw;
    this.dodgeChain.start(this.now);
    this.state = 'dodge'; this.stateT = 0; this.cur = null; this.chainIndex = 0;
    this.loco.speed = 0; this.loco.sprinting = false; this.loco.sprintT = 0; this.sprintCtl.cancel();
    this.animCtx.dodge.n++;
    g.sfx.dodge(false);
    g.fxh?.dodgeStart(this, this.dodgeDir); // fx: dust/water burst
    g.gp?.onPlayerDodge(this, this.dodge); // 0.3: dodge-spam tracking, slide fx
  }

  _updateDodge(dt, now) {
    const d = this.tun.dodge, dg = this.dodge;
    const prog = dodgeProgress(Math.min(this.stateT, dg.moveT), dg.moveT, d.ease_out_exponent ?? 2) * dg.distance;
    const step = prog - dg.done; dg.done = prog;
    if (step > 0) { const r = this.game.walk.move(this.x, this.z, dg.dirX * step, dg.dirZ * step, PROTO.playerRadiusM); this.x = r.x; this.z = r.z; }
    if (this.stateT >= d.duration_s) {
      this.state = 'free'; this.dodgeChain.end(now);
      const kc = this.keptChain, keep = this.tun.dodge_cancel_0_3?.keeps_combo_chain_s;
      if (kc && keep) {
        // Dodge-cancelled a light chain: the chain survives keeps_combo_chain_s after the dodge.
        this.lastMove = kc.move; this.chainIndex = kc.index; this.lastMoveEnd = now - Math.max(0, (kc.move.combo_window_s ?? keep) - keep);
      } else this.afterDodgeUntil = now + this.tun.input.combo_pause_threshold_s;
      this.keptChain = null;
    }
  }

  // ---------------------------------------------------------------- burst
  _startBurst() {
    if (!this.drum.tryBurst()) return;
    const b = this.weapon.drum_burst;
    this.state = 'burst'; this.stateT = 0; this.burstHits = 0; this.cur = null;
    this.game.onBurst(b);
  }

  _updateBurst(dt) {
    const b = this.weapon.drum_burst, bm = this.weapon.drum_burst_motion;
    const every = b.duration_s / b.hits;
    this._brake(dt);
    while (this.burstHits < b.hits && this.stateT >= every * (this.burstHits + 0.5)) {
      this.burstHits += 1;
      this._faceTargetForAttack(true);
      this._step(bm?.step_per_hit_m ?? 0.4);
      this.game.playerBurstHit(b, this.burstHits === b.hits);
    }
    if (this.stateT >= b.duration_s) this.state = 'free';
  }

  get superArmor() { return this.state === 'burst' && this.weapon.drum_burst.super_armor; }
  /** Heavy charge armor (motion.charge_armor_from_level): light hits do not interrupt the charge. */
  chargeArmor(attack) {
    if (this.state !== 'charge' || !this.pending) return false;
    const mo = this.pending.move.motion ?? {};
    if (mo.charge_armor_from_level == null) return false;
    return this._chargeLevelNow() >= mo.charge_armor_from_level && attack.parryable;
  }

  /**
   * Applies a hit to the player (damage already resolved). heavy: hitstun class.
   * info: { fromX, fromZ, knockM, knockdown } (combat_tuning.hit_react, attack.player_knockback_m).
   */
  takeHit({ hp, the }, heavy, outcome, info = {}) {
    const g = this.game;
    if (this.invulnDebug) return;
    if (hp > 0) {
      this.hp = Math.max(this.game.practiceMode ? 1 : 0, this.hp - hp);
      this.drum.hitTaken();
      g.sfx.hurt();
    }
    const hr = this.tun.hit_react ?? {};
    const dx = this.x - (info.fromX ?? this.x), dz = this.z - (info.fromZ ?? this.z), l = Math.hypot(dx, dz) || 1;
    const side = Math.sign((dx / l) * Math.cos(this.yaw) - (dz / l) * Math.sin(this.yaw));
    if (the > 0 && this.the.applyDamage(the)) {
      this.state = 'guardbreak'; this.stateT = 0; g.ui.toast(g.i18n.t('msg_guard_break'));
      this.anim.hitReact(0.8, side);
    } else if (outcome === 'hit' && hp > 0 && !this.superArmor && !this.chargeArmor(info.attack ?? {}) && !this._skillArmor(info.attack ?? {})) {
      if (this.state === 'skill') this._endSkill(this.now);
      if (this.state === 'riposte') this.riposteRun = null;
      this.cur = null; this.pending = null; this.chainIndex = 0;
      if (info.knockdown) {
        this.state = 'knockdown'; this.stateT = 0;
        this.knockDownS = 0.55; this.knockUpS = hr.player_knockdown_get_up_s ?? 0.8;
        if (hr.player_knockdown_iframes !== false) this.iframesUntil = this.now + this.knockDownS + this.knockUpS;
      } else {
        this.state = 'hitstun'; this.stateT = 0;
        this.stunS = heavy ? this.tun.player.hitstun_heavy_s : this.tun.player.hitstun_light_s;
      }
      this.anim.hitReact(heavy ? 1 : 0.6, side);
    } else if (hp > 0) this.anim.hitReact(0.35, side);
    const km = info.knockM ?? 0;
    if (km > 0 && outcome !== 'perfect_parry' && outcome !== 'parried') this.knock = { vx: (dx / l) * km / 0.15, vz: (dz / l) * km / 0.15, t: 0.15 };
    if (this.hp <= 0) { this.alive = false; this.state = 'dead'; g.onPlayerDeath(); }
  }
  _applyKnock(dt) {
    const k = this.knock; if (!k) return;
    const s = Math.min(dt, k.t); k.t -= dt;
    const m = this.game.walk.move(this.x, this.z, k.vx * s, k.vz * s, PROTO.playerRadiusM); this.x = m.x; this.z = m.z;
    if (k.t <= 0) this.knock = null;
  }
  /** Pushes the player (e.g. guard pushback) over 0.15 s. */
  push(fromX, fromZ, dist) {
    const dx = this.x - fromX, dz = this.z - fromZ, l = Math.hypot(dx, dz) || 1;
    this.knock = { vx: (dx / l) * dist / 0.15, vz: (dz / l) * dist / 0.15, t: 0.15 };
  }

  startFinisher(target) {
    const f = this.tun.finisher ?? {};
    this.state = 'finisher'; this.stateT = 0; this.cur = null; this.pending = null;
    this.finisher = { target, dur: f.normal_duration_s ?? 0.9 };
    this.yaw = Math.atan2(target.x - this.x, target.z - this.z);
  }
  endFinisher() { if (this.state === 'finisher') this.state = 'free'; }

  showPole(on) {
    this.pole.visible = on;
    for (const [id, m] of Object.entries(this.weaponMeshes)) m.visible = !on && id === this.weaponId;
  }

  // ---------------------------------------------------------------- Demo 0.3: jump (movement.jump)
  /** movement.jump.allowed_from: free / run / sprint / guard, attack recovery (after 0.1 s), dodge recovery, landing. */
  _jumpAllowed() {
    const J = this.tun.movement.jump;
    if (this.tun.movement.jump_enabled === false || this.game.locked || this.jc.busy || this.y > 0.001) return false;
    switch (this.state) {
      case 'free': case 'guard': case 'land': return true;
      case 'attack': return this.inRecovery && this.cur.t - (this.cur.tl.startup + this.cur.tl.active) >= (J.cancel_attack_recovery_after_s ?? 0.1);
      case 'dodge': return J.cancel_dodge_recovery !== false && this.stateT >= this.tun.dodge.duration_s - this.tun.dodge.recovery_s;
      default: return false;
    }
  }
  _startJump(now) {
    if (this.state === 'attack' && this.cur) { this.lastMove = this.cur.move; this.lastMoveEnd = now; this.cur = null; }
    if (this.state === 'dodge') this.dodgeChain.end(now);
    const l = this.loco, J = this.tun.movement.jump;
    this.airSprint = l.sprinting || l.speed > this.tun.movement.run_speed_mps + 0.5;
    // keeps_ground_speed: the run / sprint momentum carries into the air.
    this.airV.x = J.keeps_ground_speed !== false ? l.vx : 0; this.airV.z = J.keeps_ground_speed !== false ? l.vz : 0;
    this.state = 'air'; this.stateT = 0; this.airLightUsed = false; this.pendingPlunge = false; this.cur = null;
    this.game.sfx.whoosh?.(0.7, 'light');
  }
  _updateAir(dt, now, mv, input) {
    const g = this.game, J = this.tun.movement.jump, m = this.tun.movement;
    const r = this.jc.step(dt, { held: input.isDown('jump') });
    if (r.tookOff) g.gp?.onTakeoff(this);
    this.y = this.jc.y;
    if (this.state !== 'plunge') {
      // Air control: 35 % of the ground acceleration toward the stick, momentum kept without input.
      const top = (this.airSprint ? m.sprint_speed_mps : m.run_speed_mps) * Math.min(1, mv.len / 0.55);
      if (mv.len > 0.05) {
        const a = (m.accel_mps2 ?? 30) * (J.air_control_ratio ?? 0.35) * dt;
        const ex = mv.dx * top - this.airV.x, ez = mv.dz * top - this.airV.z, el = Math.hypot(ex, ez);
        if (el > 1e-6) { const k = Math.min(1, a / el); this.airV.x += ex * k; this.airV.z += ez * k; }
        const lt = g.lockTarget;
        this._turnTo(lt ? Math.atan2(lt.x - this.x, lt.z - this.z) : Math.atan2(mv.dx, mv.dz), (J.air_turn_rate_deg_s ?? 240) * DEG * dt);
      }
      const sp = Math.hypot(this.airV.x, this.airV.z), max = J.max_air_speed_mps ?? 7.2;
      if (sp > max) { this.airV.x *= max / sp; this.airV.z *= max / sp; }
      this._airMove(this.airV.x * dt, this.airV.z * dt);
    }
    const l = this.loco; l.vx = this.airV.x; l.vz = this.airV.z; l.speed = Math.hypot(l.vx, l.vz); l.sprinting = false;
    if (this.pendingPlunge && this.y >= (J.air_attacks?.plunge_min_height_m ?? 0.6)) { this.pendingPlunge = false; this._airAttack('H', now); }
    if (this.state === 'air_attack') this._updateAirAttack(dt, now);
    else if (this.state === 'plunge' && this.cur) {
      this.cur.t += dt;
      if (!this.cur.falling && this.cur.t >= this.cur.tl.startup) { this.cur.falling = true; this.jc.startPlunge(); }
      if (!this.cur.falling) this.jc.vy = 0; // hangs while raising the weapon overhead
    }
    if (r.landed) this._land(r.fallHeight, now);
  }
  /** Horizontal move in the air: a jump of >= 0.6 m clears the vault obstacles (log, ditch). */
  _airMove(dx, dz) {
    const w = this.game.walk, R = PROTO.playerRadiusM;
    const m = w.move(this.x, this.z, dx, dz, R);
    const blocked = Math.abs(m.x - this.x - dx) + Math.abs(m.z - this.z - dz) > 1e-4;
    if (blocked && this.y >= 0.6 && w.nearVault?.(this.x, this.z, 1.2) && w.inside(this.x + dx, this.z + dz, 0)) { this.x += dx; this.z += dz; return; }
    this.x = m.x; this.z = m.z;
  }
  /** After landing on a vault obstacle or outside the margin: step forward (then back) until free. */
  _unstick() {
    const w = this.game.walk, R = PROTO.playerRadiusM;
    if (w.inside(this.x, this.z, R)) return;
    for (const sgn of [1, -1]) for (let d = 0.2; d <= 3; d += 0.2) {
      const x = this.x + Math.sin(this.yaw) * d * sgn, z = this.z + Math.cos(this.yaw) * d * sgn;
      if (w.inside(x, z, R)) { this.x = x; this.z = z; return; }
    }
  }
  _land(fallH, now) {
    const g = this.game, J = this.tun.movement.jump;
    this.y = 0;
    const wasPlunge = this.state === 'plunge' && this.cur?.falling;
    if (wasPlunge) {
      const mv = this.cur.move;
      g.gp?.plungeImpact(this, mv);
      this.state = 'plunge_land'; this.stateT = 0; this.plungeRec = mv.recovery_s ?? J.air_attacks?.plunge_landing_recovery_s ?? 0.45;
      this.airV.x = 0; this.airV.z = 0;
    } else {
      this.landLag = landingLag(fallH, J.landing);
      this.state = this.landLag > 0 ? 'land' : 'free'; this.stateT = 0;
    }
    this.cur = null; this.airLightUsed = false; this.pendingPlunge = false;
    this.loco.speed = wasPlunge ? 0 : Math.hypot(this.airV.x, this.airV.z); this.loco.vx = this.airV.x; this.loco.vz = this.airV.z;
    this._unstick();
    this.anim.landKick(Math.min(1.4, 0.45 + fallH * 0.5) * (wasPlunge ? 1.5 : 1));
    g.gp?.onLand(this, fallH, wasPlunge);
  }
  /** Air moves (weapons[].air_moves_0_3): one light per jump (hangs 0.12 s), heavy = plunge from >= 0.6 m. */
  _airAttack(type, now) {
    const moves = this.weapon.air_moves_0_3, J = this.tun.movement.jump, aa = J.air_attacks ?? {};
    if (!moves || this.game.noAttack) return;
    if (type === 'L') {
      if (this.airLightUsed || this.state !== 'air' || this.jc.phase !== 'air') return;
      const m = moves.find((x) => x.input === 'air,L'); if (!m) return;
      this.airLightUsed = true;
      this.jc.hang(m.hang_s ?? aa.light_hang_s ?? 0.12, m.hang_gravity_scale ?? aa.light_hang_gravity_scale ?? 0.3);
      this._startAirMove(m, 'chain');
      this.state = 'air_attack'; this.stateT = 0;
      return;
    }
    if (this.state === 'plunge') return;
    const minH = aa.plunge_min_height_m ?? 0.6;
    if (this.y < minH) {
      // Pressed on the way up below 0.6 m: plunge as soon as the height is reached (if the jump gets there).
      const apex = this.y + Math.max(0, this.jc.vy) ** 2 / (2 * this.jc.gravity);
      if (this.jc.vy > 0 && apex >= minH) this.pendingPlunge = true;
      return;
    }
    const m = moves.find((x) => x.input === 'air,H'); if (!m) return;
    this._startAirMove(m, 'heavy'); this.cur.falling = false;
    this.jc.vy = 0; this.airV.x *= 0.2; this.airV.z *= 0.2;
    this.state = 'plunge'; this.stateT = 0;
  }
  _startAirMove(m, kind) {
    const keys = (LIB[this.weaponId] ?? LIB.wp_giao_dong).moves;
    const tl = { startup: m.startup_s, active: m.active_s, recovery: m.recovery_s, total: m.startup_s + m.active_s + m.recovery_s };
    const hitbox = m.arc_deg >= 300 ? 'circle' : m.arc_deg > 40 ? 'arc' : 'line';
    this.cur = { move: m, kind, air: true, t: 0, tl, level: 0, fromCharge: false, motion: { hitbox, theMult: 1, knockM: null, react: m.target_react ?? 'flinch', lungeM: 0 },
      target: this._aimTarget(m.range_m ?? 2), hit: new Set(), key: ++this.moveKey, animId: m.id, sweepDir: keys[m.id]?.sweepDir ?? 1, hitAny: false, falling: false };
    if (this.cur.target) this.yaw = Math.atan2(this.cur.target.x - this.x, this.cur.target.z - this.z);
    if (this.game.fxh) this.game.fxh.swingStart(this, this.cur); else this.game.sfx.whoosh();
  }
  _updateAirAttack(dt, now) {
    const c = this.cur; if (!c) { this.state = 'air'; return; }
    const tl = c.tl, t0 = c.t; c.t += dt; const t = c.t;
    if (t < tl.startup) this._reaim(dt);
    const recStart = tl.startup + tl.active;
    if (t > tl.startup && t0 < recStart + 1e-6) {
      const u0 = Math.max(0, (t0 - tl.startup) / tl.active), u1 = Math.min(1, (t - tl.startup) / tl.active);
      this.game.sweepStrike(c, u0, u1, false);
    }
    if (t >= tl.total) { this.cur = null; this.state = 'air'; }
  }

  // ---------------------------------------------------------------- Demo 0.3: Weapon Arts (skills.json)
  /** Arts of the weapon in hand with their rank (progression) and cooldown state, for the HUD. */
  skillSlots() {
    const S = this.game.data.skills; if (!S) return [];
    const prog = this.game.gp?.progress;
    return skillsForWeapon(S, this.weapon).map((def) => ({ def, level: prog ? prog.level(def.id) : 1 }));
  }
  useSkill(slot, now) {
    const g = this.game, S = g.data.skills; if (!S) return false;
    const def = skillsForWeapon(S, this.weapon)[slot]; if (!def) return false;
    // Quét sóng rank 3: pressing again during the Art queues the reverse sweep.
    if (this.state === 'skill' && this.skill?.def === def) { if (this.skill.entry.effect?.second_sweep) this.skill.secondReq = true; return true; }
    if (this.airborne || S.rules?.usable_in_air === true && false) return false; // rules.usable_in_air = false
    const okState = this.state === 'free' || this.state === 'guard' || (this.state === 'attack' && this.inRecovery);
    if (!okState) return false;
    const lvl = g.gp ? g.gp.progress.level(def.id) : 1, entry = levelEntry(def, lvl);
    if (!entry || !this.skillCd.ready(def.id)) {
      if (now - (this._notReadyToast ?? -9) > 1) { g.ui.toast(g.i18n.t('skill_not_ready'), 1.2); this._notReadyToast = now; }
      return false;
    }
    if (this.state === 'attack' && this.cur) { this.lastMove = this.cur.move; this.lastMoveEnd = now; this.cur = null; }
    this.skill = this._skillPlan(def, entry, lvl);
    this.state = 'skill'; this.stateT = 0; this.chainIndex = 0;
    this.animCtx.skill.n = (this.animCtx.skill.n ?? 0) + 1;
    g.gp?.onSkillStart(this, this.skill);
    return true;
  }
  _skillPlan(def, entry, lvl) {
    const b = def.base ?? {}, e = entry.effect ?? {}, id = def.id;
    const k = { def, entry, lvl, id, t: 0, hit: new Set(), kind: 'sweep', hitFrom: 0.18, hitTo: 0.4, activeEnd: 0.4, total: 0.8, moved: 0, cutCd: 0, struck: false };
    const face = (t) => { if (t) this.yaw = Math.atan2(t.x - this.x, t.z - this.z); };
    if (/cam_sao/.test(id)) {
      const reach = b.reach_m ?? 6, t = this._aimTarget(reach);
      face(t);
      const d = t ? Math.hypot(t.x - this.x, t.z - this.z) - t.radius - 0.9 : reach * 0.65;
      Object.assign(k, { kind: 'vault', target: t, dist: Math.max(1.2, Math.min(reach, d)), airFrom: b.airborne_from_s ?? 0.15, airTo: b.airborne_until_s ?? 0.55, H: b.leap_height_m ?? 1.8 });
      k.hitFrom = k.airTo; k.activeEnd = k.airTo + 0.08; k.total = k.airTo + 0.45;
    } else if (/quet_song/.test(id)) {
      Object.assign(k, { kind: 'sweep', radius: e.radius_m ?? 3, hitFrom: 0.18, hitTo: 0.42, activeEnd: 0.42, total: e.second_sweep ? 0.42 + (e.second_sweep_window_s ?? 0.5) : 0.8 });
    } else if (/bo_don_cay/.test(id)) {
      const t = this._aimTarget(b.range_m ?? 2.6); face(t);
      const c = b.charge_s ?? 0.5;
      Object.assign(k, { kind: 'cleave', target: t, chargeEnd: c, hitFrom: c, hitTo: c + 0.12, activeEnd: c + 0.12, total: c + 0.62, range: b.range_m ?? 2.6, arc: b.arc_deg ?? 60 });
    } else if (/moc_thuyen/.test(id)) {
      const reach = e.reach_m ?? 6, t = this._aimTarget(reach); face(t);
      const d = t ? Math.max(0, Math.hypot(t.x - this.x, t.z - this.z) - t.radius - 0.7) : Math.min(reach, b.dash_m ?? 5) * 0.6;
      Object.assign(k, { kind: 'hook', target: t, dist: Math.min(reach, d), dashEnd: 0.25, hitFrom: 0.25, hitTo: 0.36, activeEnd: 0.36, total: 0.75 });
    }
    return k;
  }
  _updateSkill(dt, now) {
    const k = this.skill, g = this.game; if (!k) { this.state = 'free'; return; }
    const t0 = k.t; k.t += dt; const t = k.t, e = k.entry.effect ?? {};
    const smooth = (u) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
    const stepTo = (want) => { const d = want - k.moved; if (d > 0) this._step(d); k.moved = want; };
    switch (k.kind) {
      case 'vault': {
        if (t < k.airFrom) this._brake(dt);
        if (e.iframes && !k.iframed && t >= (e.iframe_start_s ?? 0.05)) { k.iframed = true; this.iframesUntil = Math.max(this.iframesUntil, now + (e.iframe_duration_s ?? 0.3)); }
        if (t >= k.airFrom && !k.struck) {
          const u = Math.min(1, (t - k.airFrom) / (k.airTo - k.airFrom));
          stepTo(smooth(u) * k.dist);
          this.y = 4 * k.H * u * (1 - u);
          if (u >= 1) { k.struck = true; this.y = 0; g.gp?.skillStrike(this, k); }
        }
        break;
      }
      case 'sweep': {
        this._brake(dt);
        if (t >= k.hitFrom && t0 < k.hitTo) g.gp?.skillStrike(this, k, Math.min(1, (t - k.hitFrom) / (k.hitTo - k.hitFrom)));
        if (k.secondReq && !k.second && t >= k.activeEnd - 0.1) {
          k.second = true; k.hit.clear(); k.hitFrom = t; k.hitTo = t + 0.22; k.activeEnd = t + 0.22; k.total = t + 0.5; this.animCtx.skill.n += 1;
          g.gp?.onSkillStart(this, k);
        }
        break;
      }
      case 'cleave': {
        if (t < k.hitFrom) { this._brake(dt); this._reaim(dt); } else stepTo(0.6 * smooth((t - k.hitFrom) / 0.12));
        if (t >= k.hitFrom && t0 < k.hitTo) g.gp?.skillStrike(this, k, Math.min(1, (t - k.hitFrom) / (k.hitTo - k.hitFrom)));
        break;
      }
      case 'hook': {
        if (t < k.dashEnd) stepTo(smooth(t / k.dashEnd) * k.dist); else this._brake(dt);
        if (t >= k.hitFrom && !k.struck) { k.struck = true; g.gp?.skillStrike(this, k); }
        break;
      }
      default: break;
    }
    if (t >= k.total) this._endSkill(now);
  }
  _endSkill(now) {
    const k = this.skill; if (!k) return;
    const prog = this.game.gp?.progress;
    this.skillCd.start(k.id, effectiveCooldown(k.entry, prog ? prog.stats() : {}));
    if (k.cutCd) this.skillCd.cut(k.id, k.cutCd);
    if (k.kind === 'vault' && k.entry.effect?.next_light_is_chain_index) this.nextL4Until = now + 1.2;
    this.skill = null; this.y = 0;
    if (this.state === 'skill') this.state = 'free';
    this.game.gp?.onSkillEnd(this, k);
  }
  /** Bổ đốn cây brace (armor_vs medium: parryable blows; heavy: anything guardable, never unblockables). */
  _skillArmor(attack) {
    const k = this.skill;
    if (this.state !== 'skill' || !k || k.kind !== 'cleave' || k.t >= k.hitFrom) return false;
    const a = k.entry.effect?.armor_vs;
    return a === 'heavy' ? attack.guardable !== false : a === 'medium' ? !!attack.parryable : false;
  }

  // ---------------------------------------------------------------- Demo 0.3: Phản nhịp (riposte_0_3) / Ghì nanh
  startRiposte(enemy) {
    const rp = this.tun.riposte_0_3 ?? {};
    if (this.state === 'skill') this._endSkill(this.now);
    this.state = 'riposte'; this.stateT = 0; this.cur = null; this.pending = null;
    this.riposteRun = { e: enemy, t: 0, hit: false, dur: rp.duration_s ?? 0.8, key: ++this.moveKey };
    const dx = enemy.x - this.x, dz = enemy.z - this.z, d = Math.hypot(dx, dz) || 1, want = enemy.radius + 1.3;
    if (d > want) this._stepToward(dx / d, dz / d, d - want);
    this.yaw = Math.atan2(dx, dz);
  }
  _stepToward(nx, nz, dist) { const m = this.game.walk.move(this.x, this.z, nx * dist, nz * dist, PROTO.playerRadiusM); this.x = m.x; this.z = m.z; }
  _updateRiposte(dt) {
    const r = this.riposteRun; if (!r) { this.state = 'free'; return; }
    r.t += dt; this._brake(dt);
    if (!r.hit && r.t >= r.dur * 0.4) { r.hit = true; this.game.gp?.riposteHit(this, r.e); }
    if (r.t >= r.dur) { this.riposteRun = null; this.state = 'free'; }
  }

  // ---------------------------------------------------------------- animation
  _anim(dt) {
    const rig = this.rig, c = this.animCtx, l = this.loco;
    rig.root.position.set(this.x, this.y, this.z); rig.root.rotation.y = this.yaw;
    // The blob shadow stays on the ground and shrinks with height (jump readability).
    const sh = this._blob ?? (this._blob = rig.root.children.find((o) => o.userData.blobShadow));
    if (sh) { sh.position.y = 0.03 - this.y; sh.scale.setScalar(Math.max(0.45, 1 - this.y * 0.35)); }
    const poleOn = this.pole.visible;
    if (!poleOn) for (const id in this.weaponMeshes) this.weaponMeshes[id].visible = id === this.weaponId;
    const wid = poleOn ? 'pole' : this.weaponId;
    rig.gripLeft = (GRIPS[wid] ?? GRIPS.wp_giao_dong).left;
    this.anim.setWeapon(poleOn ? 'wp_giao_dong' : this.weaponId);
    c.weaponId = wid;
    c.state = this.animOverride ?? (this.state === 'free' && poleOn && this.game.pry ? 'pry' : this.state);
    c.stateT = this.stateT;
    c.speed = l.speed; c.stride = l.stride(); c.gait = l.gait; c.lean = l.lean; c.pitchLean = l.pitchLean;
    const vx = l.vx, vz = l.vz, sp = Math.hypot(vx, vz);
    if (sp > 0.1) { const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw); c.localZ = (vx * fx + vz * fz) / sp; c.localX = (vx * fz - vz * fx) / sp; } else { c.localZ = 1; c.localX = 0; }
    c.skid = l.skidT > 0 ? Math.min(1, l.skidT / 0.15) : 0;
    c.pivot = l.pivotT > 0;
    if (this.cur) { const a = c.attack; a.id = this.cur.animId; a.key = this.cur.key; a.t = this.cur.t; a.tl = this.cur.tl; a.level = this.cur.level; a.fromCharge = this.cur.fromCharge; }
    if (this.state === 'charge' && this.pending) { c.charge.id = this.pending.move.id; c.charge.t = this.stateT; c.charge.level = this._chargeLevelNow(); }
    if (this.state === 'dodge' && this.dodge) { const d = c.dodge; d.t = this.stateT; d.moveT = this.dodge.moveT; d.kind = this.dodge.kind; d.local = this.dodge.local; }
    if (this.state === 'burst') { const b = this.weapon.drum_burst; c.burst.t = this.stateT; c.burst.every = b.duration_s / b.hits; c.burst.hits = b.hits; }
    if (this.state === 'knockdown' || this.state === 'dead') { c.knock.t = this.stateT; c.knock.downS = this.knockDownS ?? 0.55; c.knock.upS = this.knockUpS ?? 0.8; }
    if (this.state === 'finisher' && this.finisher) { c.finisher.t = this.stateT; c.finisher.dur = this.finisher.dur; }
    if (this.state === 'vault' && this.vault) c.vaultS = this.vault.dur;
    c.swapS = this.tun.weapon_swap?.swap_time_s ?? 0.15;
    c.pryBeats = this.pryBeats ?? 0;
    // Demo 0.3
    c.y = this.y; c.air.phase = this.jc.phase; c.air.vy = this.jc.vy; c.air.y = this.y; c.air.t = this.stateT;
    c.air.falling = this.state === 'plunge' && !!this.cur?.falling;
    c.landLag = this.landLag || 0.1; c.plungeRec = this.plungeRec || 0.45;
    if (this.skill) { c.skill.id = this.skill.id; c.skill.t = this.skill.t; c.skill.run = this.skill; }
    if (this.riposteRun) { c.riposte = this.riposteRun; }
    if (this.state === 'dodge' && this.dodge) c.dodge.slide = this.dodge.kind === 'sprint_roll' && this.dodge.local === 'fwd';
    const pose = this.anim.update(dt, c);
    rig.apply(pose);
  }

  /** Debug / smoke: current joint angles of the rig. */
  jointAngles() { return this.rig.jointAngles(); }
}
