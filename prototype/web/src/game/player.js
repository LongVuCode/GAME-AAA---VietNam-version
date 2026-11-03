// player.js - player actor (Cói / Bương): movement, combo, charge, dodge, parry/guard, burst, heal.
// Rules come from logic/* and combat_tuning / weapons data.
import { DefenseController } from '../logic/defense.js';
import { DrumMeter } from '../logic/drum.js';
import { Posture } from '../logic/posture.js';
import { InputBuffer, chargeLevel, moveTimeline, selectMove } from '../logic/combo.js';
import { PROTO } from '../logic/proto.js';
import { makeAxe, makeHumanoid, makePole, makeSpear } from './meshes.js';
import { normAngle } from './enemy.js';

export class Player {
  constructor(game) {
    this.game = game;
    const tun = game.data.combat;
    this.tun = tun;
    this.defense = new DefenseController(tun.dodge, tun.guard, game.diff.parryWindowS);
    this.drum = new DrumMeter(tun.drum_rhythm);
    this.buffer = new InputBuffer(tun.input.buffer_s);
    this.models = {};
    this.setCharacter('chr_coi');
    this.respawn(game.checkpointPos());
  }

  setCharacter(id) {
    if (this.figure) this.game.scene.remove(this.figure.root);
    const coi = id === 'chr_coi';
    this.figure = makeHumanoid(coi ? { body: 0x41657a, hatColor: 0xd8c48a } : { body: 0x7a5a3a, hat: false, height: 1.05 });
    this.weaponMeshes = { wp_giao_dong: makeSpear(), wp_riu_xeo: makeAxe() };
    for (const m of Object.values(this.weaponMeshes)) { m.visible = false; this.figure.weaponMount.add(m); }
    this.pole = makePole(); this.pole.visible = false; this.figure.weaponMount.add(this.pole);
    this.game.scene.add(this.figure.root);
    this.character = id;
  }

  respawn(pos) {
    const tun = this.tun;
    this.x = pos.x; this.z = pos.z; this.yaw = Math.PI;
    this.hpMax = tun.player.hp_max; this.hp = this.hpMax;
    this.the = new Posture({ max: tun.player.the_max, regenPerS: tun.player.the_regen_per_s, regenDelayS: tun.player.the_regen_delay_s, staggerS: tun.player.guard_break_stun_s });
    this.state = 'free'; this.stateT = 0; this.cur = null;
    this.lastMove = null; this.lastMoveEnd = -Infinity; this.chainIndex = 0;
    this.afterDodgeUntil = -Infinity; this.perfectParryUntil = -Infinity; this.postPerfectDodgeUntil = -Infinity;
    this.slowT = 0; this.heals = tun.healing.charges; this.invulnDebug = this.invulnDebug ?? false;
    this.buffer.clear(); this.defense.action = 'none';
    this.alive = true;
  }

  get weaponId() { return this.game.gen.weapons[this.slot ?? 0] ?? this.game.gen.weapons[0]; }
  get weapon() { return this.game.data.weapons.weapons.find((w) => w.id === this.weaponId); }
  distanceTo(x, z) { return Math.hypot(this.x - x, this.z - z); }
  get acting() { return this.state !== 'free' && this.state !== 'guard'; }

  update(dt, now, input) {
    const g = this.game;
    if (!this.alive) return;
    this.defense.setGuardHeld(input.isDown('parry'));
    this.defense.tick(dt);
    if (this.the.tick(dt) && this.state === 'guardbreak') this.state = 'free';
    this.drum.tick(dt);
    this.slowT = Math.max(0, this.slowT - dt);
    this.stateT += dt;
    if (g.locked) { this._anim(now); return; } // cutscene / pry / menus handle the player

    // ---- defensive inputs (highest priority)
    if (input.pressed('dodge') && this._canDodge()) this._startDodge(input);
    else if (input.pressed('parry') && (this.state === 'free' || this.state === 'guard')) {
      if (this.defense.startParry()) { this.state = 'parry'; this.stateT = 0; this.chainIndex = 0; } // any other action breaks the 'pause' branch
    }
    if (input.pressed('burst') && this.state === 'free' && this.drum.canBurst()) this._startBurst();
    if (input.pressed('heal') && this.state === 'free') {
      if (this.heals > 0) { this.state = 'heal'; this.stateT = 0; } else g.ui.toast(g.i18n.t('msg_heal_none'));
    }
    // ---- attack inputs
    if (input.pressed('light')) this._attackInput('L', now);
    if (input.pressed('heavy')) this._attackInput('H', now);
    if (this.state === 'charge' && (!input.isDown('heavy') || this.stateT >= this._maxChargeTime())) this._releaseCharge(now);

    // ---- state machines
    switch (this.state) {
      case 'free': case 'guard': this._move(dt, input); break;
      case 'parry':
        if (this.defense.action !== 'parry') this.state = input.isDown('parry') ? 'guard' : 'free';
        break;
      case 'attack': this._updateAttack(dt, now); break;
      case 'dodge': this._updateDodge(dt, now); break;
      case 'burst': this._updateBurst(dt); break;
      case 'heal':
        if (this.stateT >= this.tun.healing.use_time_s) {
          this.heals -= 1; this.hp = Math.min(this.hpMax, this.hp + this.hpMax * this.tun.healing.heal_ratio);
          this.state = 'free'; g.sfx.pickup();
        }
        break;
      case 'hitstun': if (this.stateT >= this.stunS) this.state = 'free'; break;
      case 'guardbreak': if (!this.the.staggered) this.state = 'free'; break;
      default: break;
    }
    if (this.state === 'guard' && !input.isDown('parry')) this.state = 'free';
    if (this.state === 'free' && input.isDown('parry') && this.defense.action === 'none') this.state = 'guard';
    if (this.state === 'free') this._tryBuffered(now, input);
    this._anim(now);
  }

  _canDodge() {
    if (this.state === 'free' || this.state === 'guard' || this.state === 'charge' || this.state === 'parry') return true;
    if (this.state === 'attack' && this.cur) {
      const intoRecovery = this.cur.t - (this.cur.tl.startup + this.cur.tl.active);
      return intoRecovery >= this.tun.dodge.cancel_attack_recovery_after_s;
    }
    return this.state === 'dodge' && this.stateT >= this.tun.dodge.duration_s - this.tun.dodge.recovery_s;
  }

  _camRelative(input) {
    const mv = input.moveVector();
    const yaw = this.game.cam.yaw;
    // Camera looks along -z at yaw 0; forward = (−sin yaw, −cos yaw).
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    return { x: rx * mv.x - fx * mv.z, z: rz * mv.x - fz * mv.z, len: Math.hypot(mv.x, mv.z) };
  }

  _move(dt, input) {
    const g = this.game, mv = this._camRelative(input);
    const target = g.lockTarget;
    if (mv.len > 0.05) {
      const walk = input.isDown('walk') || this.state === 'guard';
      let speed = walk ? this.tun.movement.walk_speed_mps : this.tun.movement.run_speed_mps;
      const surf = g.walk.speedMult(this.x, this.z);
      if (surf === 'mud') speed *= this.tun.movement.mud_speed_mult;
      if (surf === 'shallow') speed *= this.tun.movement.shallow_water_speed_mult;
      if (this.slowT > 0) speed *= this.slowMult ?? 1;
      const r = g.walk.move(this.x, this.z, mv.x / mv.len * speed * dt * Math.min(1, mv.len), mv.z / mv.len * speed * dt * Math.min(1, mv.len), PROTO.playerRadiusM);
      this.x = r.x; this.z = r.z;
      if (!target) this._turnTo(Math.atan2(mv.x, mv.z), dt * 12);
      this.moving = true;
    } else this.moving = false;
    if (target) this._turnTo(Math.atan2(target.x - this.x, target.z - this.z), dt * 12);
  }

  _turnTo(yaw, rate) { this.yaw += Math.max(-rate, Math.min(rate, normAngle(yaw - this.yaw))); }

  _faceTargetForAttack() {
    const g = this.game, t = g.lockTarget ?? g.softAim();
    if (t) this.yaw = Math.atan2(t.x - this.x, t.z - this.z);
  }

  _attackInput(type, now) {
    if (this.state === 'free' || this.state === 'guard') this._beginAttack(type, now);
    else if (this.state === 'attack' || this.state === 'dodge' || this.state === 'parry') this.buffer.push(type, now);
  }

  _tryBuffered(now, input) {
    const b = this.buffer.consume(now);
    if (!b) return;
    if (b.type === 'H' && !input.isDown('heavy')) this._beginAttack('H', now, true);
    else this._beginAttack(b.type, now);
  }

  _ctx(now) {
    const mods = this.game.mods;
    const house = this.game.gen.houseMoves.length ? this.game.data.lineage.house_moves.find((h) => h.id === this.game.gen.houseMoves[0]) : null;
    return { now, lastMove: this.lastMove, lastMoveEnd: this.lastMoveEnd, chainIndex: this.chainIndex,
      afterDodgeUntil: this.afterDodgeUntil, perfectParryUntil: this.perfectParryUntil, maxChain: mods.maxChain,
      houseMove: house, inputTuning: this.tun.input };
  }

  _beginAttack(type, now, instantHeavy = false) {
    const sel = selectMove(this.weapon, type, this._ctx(now));
    this.perfectParryUntil = -Infinity; this.afterDodgeUntil = -Infinity;
    if (sel.kind === 'heavy' && !instantHeavy) { this.state = 'charge'; this.stateT = 0; this.pending = sel; this._faceTargetForAttack(); return; }
    this._startMove(sel, 0);
  }

  _maxChargeTime() {
    const h = this.pending?.move; if (!h?.charge) return 0;
    const lv = this.game.mods.heavyMaxLevel >= 2 ? h.charge.max_level : 1;
    return h.charge.time_per_level_s * lv + 0.05;
  }

  _releaseCharge() {
    const sel = this.pending; this.pending = null;
    const lv = chargeLevel(sel.move, this.stateT, this.tun.input, this.game.mods.heavyMaxLevel >= 2);
    this._startMove(sel, lv);
  }

  _startMove(sel, level) {
    this._faceTargetForAttack();
    this.cur = { ...sel, t: 0, tl: moveTimeline(sel.move), hitDone: false, level };
    this.state = 'attack'; this.stateT = 0;
    if (sel.kind === 'chain') this.chainIndex = sel.move.chain_index;
    this.game.sfx.whoosh();
  }

  _updateAttack(dt, now) {
    const c = this.cur; c.t += dt;
    if (!c.hitDone && c.t >= c.tl.startup) {
      c.hitDone = true;
      this.game.playerStrike(c.move, c.kind, c.level, now <= this.postPerfectDodgeUntil);
    }
    if (c.t >= c.tl.total) {
      this.lastMove = c.move; this.lastMoveEnd = now;
      if (c.kind !== 'chain') this.chainIndex = 0;
      this.cur = null; this.state = 'free';
    }
  }

  _startDodge(input) {
    if (!this.defense.startDodge()) return;
    if (this.state === 'charge') this.pending = null;
    const mv = this._camRelative(input);
    this.dodgeDir = mv.len > 0.05 ? { x: mv.x / mv.len, z: mv.z / mv.len } : { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
    this.state = 'dodge'; this.stateT = 0; this.cur = null; this.chainIndex = 0;
    this.game.sfx.dodge(false);
  }

  _updateDodge(dt, now) {
    const d = this.tun.dodge, moveT = d.duration_s - d.recovery_s;
    if (this.stateT <= moveT) {
      const speed = (d.distance_m / moveT) * 2 * (1 - this.stateT / moveT); // linear ease-out, integrates to distance_m
      const r = this.game.walk.move(this.x, this.z, this.dodgeDir.x * speed * dt, this.dodgeDir.z * speed * dt, PROTO.playerRadiusM);
      this.x = r.x; this.z = r.z;
    }
    if (this.stateT >= d.duration_s) {
      this.state = 'free';
      this.afterDodgeUntil = now + this.tun.input.combo_pause_threshold_s;
    }
  }

  _startBurst() {
    if (!this.drum.tryBurst()) return;
    const b = this.weapon.drum_burst;
    this.state = 'burst'; this.stateT = 0; this.burstHits = 0; this.cur = null;
    this.game.onBurst(b);
  }

  _updateBurst() {
    const b = this.weapon.drum_burst;
    const every = b.duration_s / b.hits;
    while (this.burstHits < b.hits && this.stateT >= every * (this.burstHits + 0.5)) {
      this.burstHits += 1;
      this._faceTargetForAttack();
      this.game.playerBurstHit(b, this.burstHits === b.hits);
    }
    if (this.stateT >= b.duration_s) this.state = 'free';
  }

  get superArmor() { return this.state === 'burst' && this.weapon.drum_burst.super_armor; }

  /** Applies a hit to the player (damage already resolved). heavy: hitstun class. */
  takeHit({ hp, the }, heavy, outcome) {
    const g = this.game;
    if (this.invulnDebug) return;
    if (hp > 0) {
      this.hp = Math.max(this.game.practiceMode ? 1 : 0, this.hp - hp);
      this.drum.hitTaken();
      g.sfx.hurt();
    }
    if (the > 0 && this.the.applyDamage(the)) {
      this.state = 'guardbreak'; this.stateT = 0; g.ui.toast(g.i18n.t('msg_guard_break'));
    } else if (outcome === 'hit' && hp > 0 && !this.superArmor) {
      this.state = 'hitstun'; this.stateT = 0; this.cur = null; this.pending = null; this.chainIndex = 0;
      this.stunS = heavy ? this.tun.player.hitstun_heavy_s : this.tun.player.hitstun_light_s;
    }
    if (this.hp <= 0) { this.alive = false; this.state = 'dead'; g.onPlayerDeath(); }
  }

  showPole(on) {
    this.pole.visible = on;
    for (const [id, m] of Object.entries(this.weaponMeshes)) m.visible = !on && id === this.weaponId;
  }

  _anim(now) {
    const f = this.figure;
    f.root.position.set(this.x, 0, this.z); f.root.rotation.y = this.yaw;
    if (!this.pole.visible) for (const [id, m] of Object.entries(this.weaponMeshes)) m.visible = id === this.weaponId;
    const t = now;
    let arm = 0.2, lean = 0, armL = 0, bob = 0, crouch = 0;
    switch (this.state) {
      case 'attack': {
        const c = this.cur; const p = c ? c.t / c.tl.total : 0;
        const k = c && c.t < c.tl.startup ? -0.6 * (c.t / c.tl.startup) : 1.5 * Math.max(0, 1 - p * 1.4);
        arm = -1.2 + k; lean = 0.15; break;
      }
      case 'charge': arm = 0.8; lean = -0.15; crouch = Math.min(0.15, this.stateT * 0.2); break;
      case 'dodge': lean = 0.6; crouch = 0.3; break;
      case 'parry': case 'guard': arm = -1.0; armL = -1.0; break;
      case 'burst': arm = -1.2 + Math.sin(this.stateT * 14) * 0.8; lean = 0.2; break;
      case 'hitstun': lean = -0.3; break;
      case 'guardbreak': lean = -0.4; crouch = 0.25; break;
      case 'heal': armL = -1.6; break;
      case 'pry': arm = 0.35 + (this.pryLever ?? 0); armL = -0.6; lean = 0.3; break;
      case 'dead': lean = -1.3; crouch = 0.6; break;
      default: if (this.moving) { bob = Math.sin(t * 12) * 0.05; f.legL.rotation.x = Math.sin(t * 12) * 0.6; f.legR.rotation.x = -Math.sin(t * 12) * 0.6; }
    }
    if (!this.moving) { f.legL.rotation.x = 0; f.legR.rotation.x = 0; }
    f.rightArm.rotation.x = arm; f.armL.rotation.x = armL;
    f.rig.rotation.x = lean; f.rig.position.y = bob - crouch;
  }
}
