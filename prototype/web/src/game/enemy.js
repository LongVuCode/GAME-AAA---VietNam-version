// enemy.js - enemy actor: data-driven attacks (enemies.json attacks + attacks_0_2), behaviour from
// enemies[].behavior (speed, radius, aggro / leash, circling while waiting for an attack token,
// retreat after attacking, posture reactions, rear punish, chase punish, keep-away, burrow),
// weighted attack choice (combat_tuning.enemy_ai), hit reactions (flinch + knockback by weight),
// telegraphs, non-lethal defeat (finisher -> flee / dissipate). The boss wraps logic/boss.js and plays
// the phase-2 set piece "Húc cọc" (transition_set_piece_0_2). Animation: src/anim/creatures.js.
import { Posture } from '../logic/posture.js';
import { BossEncounter } from '../logic/boss.js';
import { attackTimeline, telegraphKind, chooseAttackWeighted, inRearArc, circleVelocity, theReaction, allAttacks, phaseMoveset } from '../logic/enemyAi.js';
import { hitReactFor } from '../logic/attackMotion.js';
import { normAngle, turnToward, DEG } from '../logic/locomotion.js';
import { PROTO } from '../logic/proto.js';
import { makeCreatureRig } from '../anim/creatures.js';
import { makeDecal } from './meshes.js';
import * as THREE from 'three';

const FAMILY = { en_cua_cang_bun: 'crab', en_bo_ngua_lau: 'mantis', en_u_bun: 'mud' };
const BOAR_AUDIO = { ll_can_lay: 'boar_roar', ll_can_khuyu: 'boar_roar', ll_giay_dau: 'boar_pain', ll_rong_dau: 'boar_pain', ll_dui_co: 'boar_pain' };
const WEIGHT_STRENGTH = { light: 0.45, medium: 0.7, heavy: 1, finisher: 1.2 };

let uidSeq = 0;

export class Enemy {
  constructor(game, def, spawn, { practice = false } = {}) {
    this.game = game; this.def = def; this.spawn = { ...spawn }; this.practice = practice;
    this.uid = `${def.id}#${++uidSeq}`;
    this.isBoss = def.rank === 'boss';
    this.beh = def.behavior ?? {};
    this.attacks = allAttacks(def);
    this.radius = this.beh.radius_m ?? 0.8;
    this.moveSpeed = this.beh.move_speed_mps ?? 2;
    this.mesh = makeCreatureRig(def.id); game.scene.add(this.mesh.root);
    this.decal = makeDecal('parryable'); this.decalU = makeDecal('unparryable');
    for (const d of [this.decal, this.decalU]) { game.scene.add(d.ring); game.scene.add(d.lane); d.ring.visible = d.lane.visible = false; }
    this.ctx = { state: 'idle', stateT: 0, speed: 0, attack: null, burrowS: 2 };
    this.atkCtx = { id: '', t: 0, tl: null, side: 1 };
    this.onScreen = true;
    this.reset();
  }

  reset() {
    const d = this.def, tun = this.game.data.combat;
    this.x = this.spawn.x; this.z = this.spawn.z; this.yaw = this.spawn.yaw ?? 0; // face +z (south, toward the landing)
    this.state = 'idle'; this.stateT = 0; this.attack = null; this.cooldowns = {}; this.engaged = false;
    this.fleeT = 0; this.flash = 0; this.slowT = 0; this.walkAway = null; this.history = [];
    this.vx = 0; this.vz = 0; this.speed = 0; this.knock = null; this.flinchT = 0; this.rearT = 0;
    this.circleDir = this.game.rng() < 0.5 ? -1 : 1; this.circleT = 1; this.defendCd = 0; this.burrowCd = (this.beh.reposition_burrow?.cooldown_s ?? 12) * 0.5;
    this.preferNext = null; this.pendingTransition = false; this.neckExposed = false; this.projectile = null;
    if (this.isBoss) {
      this.enc = new BossEncounter(d, tun, { khoenEnabled: this.game.opts.khoenEnabled });
      this.posture = this.enc.posture;
      this.mesh.setCracks(0, false);
      this.mesh.khoen.visible = this.enc.khoen.enabled;
    } else {
      this.hp = d.hp;
      this.posture = new Posture({ max: d.the_max, regenPerS: d.the_regen_per_s ?? tun.enemy_the_defaults.regen_per_s,
        regenDelayS: d.the_regen_delay_s ?? tun.enemy_the_defaults.regen_delay_s,
        staggerS: d.stagger_duration_s ?? tun.enemy_the_defaults.stagger_duration_s,
        afterStaggerRatio: tun.enemy_the_defaults.post_stagger_the_ratio });
    }
    this.mesh.root.visible = true; this.mesh.root.position.set(this.x, 0, this.z); this.mesh.root.scale.setScalar(1);
    this.mesh.rig.position.set(0, 0, 0); this.mesh.rig.rotation.set(0, 0, 0);
    if (this.projectileMesh) this.projectileMesh.visible = false;
    this._hideDecals();
  }

  get hpNow() { return this.isBoss ? this.enc.hp : this.hp; }
  get hpMax() { return this.isBoss ? this.enc.def.hp : this.def.hp; }
  get alive() { return this.state !== 'gone' && this.state !== 'fleeing' && this.state !== 'freed'; }
  get lockable() { return this.alive && this.state !== 'pried' && this.state !== 'finished' && this.state !== 'burrow'; }
  get staggered() { return this.posture.staggered; }
  get moveset() { return this.isBoss ? phaseMoveset(this.enc.phase) : this.attacks.map((a) => a.id); }
  get speedMult() { return this.game.diff.enemySpeed * (this.isBoss ? this.enc.phase.speed_mult : 1); }
  get telegraphMult() { return this.game.diff.telegraphMult * (this.isBoss ? this.enc.phase.telegraph_time_mult : 1); }
  get telegraphKind() { return this.attack && this.state === 'attack' && this.atkT < this.tl.windup + this.tl.hold ? telegraphKind(this.attack) : null; }
  /** Front-shell damage multiplier (crab turtling raises it: behavior.on_own_the_high.front_damage_mult). */
  get frontMult() { return this.state === 'turtle' ? this.beh.on_own_the_high?.front_damage_mult ?? this.def.front_damage_mult ?? 1 : this.def.front_damage_mult ?? 1; }
  get invulnerable() { return this.state === 'transition' || this.state === 'burrow'; }

  _setState(s) { if (this.state !== s) { this.state = s; this.stateT = 0; } }
  _hideDecals() { for (const d of [this.decal, this.decalU]) { d.ring.visible = false; d.lane.visible = false; } }

  /**
   * A player hit. info: { weight, motion, fromX, fromZ } for the reaction. Returns info for feedback
   * ({ broke, cracked, phaseChanged, floorReached, flinchS, knockM }) or null if ignored.
   */
  receiveHit({ hp, the }, info = {}) {
    if (!this.alive || this.state === 'pried' || this.state === 'finished' || this.invulnerable) return null;
    this.engaged = true; this.flash = 0.12;
    let broke = false, cracked = false, phaseChanged = false, floorReached = false;
    if (this.isBoss) {
      const r = this.enc.receiveHit({ hp, the });
      ({ broke, cracked, phaseChanged, floorReached } = r);
      if (phaseChanged) this._queueTransition();
    } else {
      this.hp = Math.max(0, this.hp - hp);
      broke = this.posture.applyDamage(the);
    }
    if (broke) this._cancelAttack();
    else if (this.state === 'attack' && this.atkT < this.tl.windup && the >= (this.def.interrupt_threshold ?? Infinity)) this._cancelAttack();
    const react = this._react(info);
    if (!this.isBoss && this.hp <= 0) this.defeat();
    return { broke, cracked, phaseChanged, floorReached, ...react };
  }

  /** Flinch + knockback (combat_tuning.hit_react, behavior.hit_react). Flinch never cancels a windup. */
  _react(info) {
    const hr = this.game.data.combat.hit_react;
    if (!hr || !info.weight) return { flinchS: 0, knockM: 0 };
    const r = hitReactFor(info.weight, info.motion, this.beh.hit_react, hr);
    const p = this.game.player;
    const fx = info.fromX ?? p.x, fz = info.fromZ ?? p.z;
    const dx = this.x - fx, dz = this.z - fz, l = Math.hypot(dx, dz) || 1;
    const side = Math.sign((dx / l) * Math.cos(this.yaw) - (dz / l) * Math.sin(this.yaw)) || 1;
    this.mesh.hitReact(Math.min(1.2, (WEIGHT_STRENGTH[info.weight] ?? 0.5) * (r.flinchS > 0 ? 1 : 0.4)), -side);
    if (r.flinchS > 0 && this.state !== 'attack') this.flinchT = Math.max(this.flinchT, r.flinchS);
    if (Math.abs(r.knockM) > 1e-3) this.knock = { vx: (dx / l) * r.knockM / r.durS, vz: (dz / l) * r.knockM / r.durS, t: r.durS };
    return r;
  }

  receiveTheDamage(the) {
    if (!this.alive || this.invulnerable) return false;
    this.engaged = true;
    if (this.isBoss) {
      const r = this.enc.receiveHit({ hp: 0, the });
      if (r.phaseChanged) this._queueTransition();
      if (r.broke) this._cancelAttack();
      return r;
    }
    const broke = this.posture.applyDamage(the);
    if (broke) this._cancelAttack();
    return { broke, cracked: false };
  }

  _queueTransition() {
    const sp = this.enc.phase.transition_set_piece_0_2;
    if (sp?.replaces_transition_beat) this.pendingTransition = true;
    else this.transitionT = this.enc.phase.transition_beat_s ?? 0;
  }

  _cancelAttack() {
    if (this.attack) { this.cooldowns[this.attack.id] = this.attack.cooldown_s; this.game.tokens.release(this.uid); }
    this.attack = null; this.neckExposed = false; this._setState(this.posture.staggered ? 'stagger' : 'chase'); this._hideDecals();
  }

  /** Normal enemies: out of strength (or finished) → flee / dissipate (never killed). */
  defeat() {
    if (this.isBoss || !this.alive) return;
    this._cancelAttack();
    this._setState('fleeing'); this.fleeT = 1.6;
    this.game.onEnemyDefeated(this);
  }

  /** Finisher on a broken normal enemy (combat_tuning.finisher): flipped / swept / pierced, then flees. */
  startFinished(dur) { this._cancelAttack(); this._setState('finished'); this.finishDur = dur; this.game.tokens.release(this.uid); }

  /** Boss freed: walks off into the reeds. */
  walkOff() {
    this._setState('freed'); this._hideDecals(); this.game.tokens.release(this.uid);
    this.walkAway = { t: 0, dirX: 0.35, dirZ: -1 };
  }

  // ---------------------------------------------------------------- update
  update(dt) {
    const g = this.game, root = this.mesh.root;
    this.flash = Math.max(0, this.flash - dt);
    this.stateT += dt;
    const aggro = this._aggro ?? 1;
    for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt * aggro);
    this._applyKnock(dt);
    this._updateProjectile(dt);
    if (this.state === 'gone') { root.visible = false; return; }
    if (this.state === 'finished') {
      if (this.stateT >= this.finishDur) this.defeat();
      this._sync(dt); return;
    }
    if (this.state === 'fleeing') {
      this.fleeT -= dt;
      const dx = this.x - g.player.x, dz = this.z - g.player.z, l = Math.hypot(dx, dz) || 1;
      if (this.def.defeat_behavior !== 'dissipate') {
        const k = this.def.species_family === 'crab' ? 1.5 : 2.2;
        if (this.stateT > 0.4) { this._face(dx, dz, dt * 2); this._move(dx / l, dz / l, this.moveSpeed * k * dt); }
      }
      if (this.fleeT <= 0) { this._setState('gone'); root.visible = false; }
      this._sync(dt); return;
    }
    if (this.state === 'freed') {
      const w = this.walkAway; w.t += dt;
      this.yaw = Math.atan2(w.dirX, w.dirZ);
      this.x += w.dirX * 1.6 * dt; this.z += w.dirZ * 1.6 * dt;
      if (w.t > 9) root.visible = false;
      this.speed = 1.6; this._sync(dt); return;
    }
    if (this.isBoss) {
      if (this.enc.prying) { this._setState('pried'); this._sync(dt); return; }
      if (this.enc.outcome !== 'in_progress') { this._setState('stagger'); this._hideDecals(); this._sync(dt); return; }
      if (this.state === 'pried') this._setState('stagger');
      this.enc.tick(dt);
      this.transitionT = Math.max(0, (this.transitionT ?? 0) - (this.posture.staggered ? 0 : dt));
    } else this.posture.tick(dt);

    if (this.posture.staggered) { this._setState('stagger'); this.speed = 0; this._sync(dt); return; }
    if (this.state === 'stagger') this._setState('chase');
    if (this.state === 'transition') { this._updateTransition(dt); this._sync(dt); return; }
    if (this.pendingTransition) { this.pendingTransition = false; this._startTransition(); this._sync(dt); return; }

    const p = g.player, px = p.x, pz = p.z;
    const dx = px - this.x, dz = pz - this.z, dist = Math.hypot(dx, dz);
    const sameWorld = p.alive && Math.abs(px - this.x) < 120;
    const beh = this.beh, aggroR = beh.aggro_radius_m ?? 12;
    if (!this.engaged && sameWorld && dist < aggroR) this.engaged = true;
    if (this.isBoss && dist > aggroR + 8) this.engaged = false;
    if (!this.isBoss && this.engaged && Math.hypot(this.x - this.spawn.x, this.z - this.spawn.z) > (beh.leash_radius_m ?? 20) && this.state !== 'attack') this.engaged = false;
    if (this.slowT > 0) this.slowT -= dt;
    this.flinchT = Math.max(0, this.flinchT - dt);

    if (this.state === 'attack') { this._updateAttack(dt, dx, dz, dist); this._sync(dt); return; }
    if (!this.engaged || !sameWorld || p.state === 'pry') {
      // Drift back home.
      const hx = this.spawn.x - this.x, hz = this.spawn.z - this.z, hl = Math.hypot(hx, hz);
      if (hl > 0.5) { this._face(hx, hz, dt); this._steer(hx / hl * this.moveSpeed * 0.6, hz / hl * this.moveSpeed * 0.6, dt); } else this._steer(0, 0, dt);
      if (!this.engaged) { this.game.tokens.release(this.uid); if (this.state !== 'idle') this._setState('idle'); }
      this._sync(dt); return;
    }
    if (this.state === 'idle') this._setState('chase');
    if (this.transitionT > 0) { this._face(dx, dz, dt); this._steer(0, 0, dt); this._sync(dt); return; }
    if (this.flinchT > 0) { this._steer(0, 0, dt); this._sync(dt); return; }

    // Reactions to posture (P0-5).
    const react = theReaction(this.posture.ratio, p.the.ratio, beh, g.data.combat.enemy_ai);
    this._aggro = react.aggro;
    this.defendCd = Math.max(0, this.defendCd - dt);
    if (this.state === 'turtle') {
      this._face(dx, dz, dt); this._steer(-dx / dist * 0.5, -dz / dist * 0.5, dt);
      if (this.stateT >= (beh.on_own_the_high?.duration_s ?? 2)) { this._setState('chase'); this.defendCd = 3; }
      this._sync(dt); return;
    }
    if (this.state === 'hop') {
      const k = Math.max(0, 1 - this.stateT / 0.6);
      this._face(dx, dz, dt); this._move(-dx / dist, -dz / dist, 6 * k * dt);
      if (this.stateT >= 0.6) { this._setState('chase'); this.defendCd = 3; }
      this._sync(dt); return;
    }
    if (this.state === 'burrow') { this._updateBurrow(dt); this._sync(dt); return; }
    if (this.state === 'retreat') {
      this._face(dx, dz, dt);
      this._steer(-dx / dist * this.moveSpeed * 0.8, -dz / dist * this.moveSpeed * 0.8, dt);
      if (this.stateT >= (beh.retreat_distance_m ?? 1.5) / (this.moveSpeed * 0.8) || dist > 9) this._setState('chase');
      this._sync(dt); return;
    }
    if (react.defend && this.defendCd <= 0 && this.state === 'chase') {
      this._setState(react.defend === 'hop_away' ? 'hop' : 'turtle');
      this.game.tokens.release(this.uid);
      this._sync(dt); return;
    }

    // Rear punish timer (player standing behind).
    const rp = beh.rear_punish;
    if (rp && dist < 4.5 && inRearArc(this, p, rp.rear_arc_deg ?? 120)) this.rearT += dt; else this.rearT = 0;

    const surface = Math.max(0, dist - this.radius - 0.4);
    const special = this._specialAttack(dist, surface, p);
    if (special) { this._startAttack(special); this._sync(dt); return; }

    const ready = this._readyInRange(surface);
    const hasToken = ready.length ? g.tokens.tryAcquire(this.uid, this.onScreen) : false;
    if (hasToken) {
      const atk = chooseAttackWeighted(this.attacks, ready, this.cooldowns, surface + 0.01, this.history, g.data.combat.enemy_ai, g.rng, this.preferNext);
      if (atk) { this.preferNext = null; this._startAttack(atk); this._sync(dt); return; }
    }
    this._locomote(dt, dx, dz, dist, surface, hasToken);
    this._sync(dt);
  }

  _readyInRange(surface) {
    const out = this._ready ?? (this._ready = []); out.length = 0;
    for (const id of this.moveset) {
      const a = this.attacks.find((x) => x.id === id);
      if (!a || (this.cooldowns[a.id] ?? 0) > 0) continue;
      if (this.beh.rear_punish?.attack === id) continue; // only through the rear punish rule
      if (this.beh.punish_chase?.attack === id || this.beh.keep_away_attack?.attack === id) continue;
      if (a.damage <= 0 && a.id === 'll_dui_co') { if (surface <= a.range_m) out.push(id); continue; }
      if (surface <= a.range_m * (a.shape === 'charge' ? 0.9 : 0.85)) out.push(id);
    }
    return out;
  }

  /** Behaviour-specific attacks (rear punish, chase punish, keep-away) that bypass the weighted pick. */
  _specialAttack(dist, surface, p) {
    const beh = this.beh, set = this.moveset;
    const ok = (id) => id && set.includes(id) && (this.cooldowns[id] ?? 0) <= 0 && this.game.tokens.tryAcquire(this.uid, this.onScreen);
    const rp = beh.rear_punish;
    if (rp && this.rearT >= rp.player_in_rear_s && ok(rp.attack)) { this.rearT = 0; return this.attacks.find((a) => a.id === rp.attack); }
    const pc = beh.punish_chase;
    if (pc) {
      const a = this.attacks.find((x) => x.id === pc.attack);
      const closing = -((p.loco.vx * (this.x - p.x) + p.loco.vz * (this.z - p.z)) / (dist || 1));
      if (a && surface <= a.range_m && closing >= pc.player_closing_speed_mps_at_least && ok(a.id)) return a;
    }
    const ka = beh.keep_away_attack;
    if (ka && dist > ka.player_farther_than_m) {
      const a = this.attacks.find((x) => x.id === ka.attack);
      if (a && surface <= a.range_m && ok(a.id)) return a;
    }
    return null;
  }

  /** Approach / circle / hold the ring / burrow while not attacking. */
  _locomote(dt, dx, dz, dist, surface, hasToken) {
    const g = this.game, beh = this.beh, ai = g.data.combat.enemy_ai;
    const melee = Math.max(0.8, Math.min(...this.attacks.filter((a) => a.shape !== 'charge' && a.shape !== 'projectile' && a.damage > 0).map((a) => a.range_m)));
    const speed = this.moveSpeed * this.speedMult * (this._aggro ?? 1);
    // Mound: repositions by sinking into the mud and rising elsewhere (behavior.reposition_burrow).
    const rb = beh.reposition_burrow;
    if (rb?.enabled) {
      this.burrowCd -= dt;
      if (this.burrowCd <= 0 && dist > 4.5) { this._startBurrow(); return; }
    }
    const waiting = !hasToken && g.tokens.count >= g.tokens.max;
    if (waiting && beh.circle?.enabled && ai?.circle_when_waiting !== false) {
      this.circleT -= dt;
      if (this.circleT <= 0) { const r = beh.circle.dir_change_s ?? { min: 1.5, max: 3 }; this.circleT = r.min + g.rng() * (r.max - r.min); this.circleDir = -this.circleDir; }
      const flank = beh.group_role === 'flanker' ? g.player.yaw + this.circleDir * (ai?.flank_angle_deg ?? 70) * DEG : null;
      const v = circleVelocity(this, g.player, { ring: (ai?.token_wait_ring_m ?? 3.5) + this.radius, speed: beh.circle.speed_mps ?? 2, dir: this.circleDir, flankYaw: flank, approachSpeed: speed });
      this._face(dx, dz, dt);
      this._steer(v.vx, v.vz, dt);
      return;
    }
    const want = hasToken || !waiting ? Math.min(melee * 0.7, beh.preferred_range_m ?? melee) : (ai?.token_wait_ring_m ?? 3.5);
    if (surface > want) {
      if (beh.sidestep_locomotion && dist < 6) {
        // Crab: body faces the player, closes in with a sideways scuttle.
        this._face(dx, dz, dt);
        const tx = -dz / dist * this.circleDir, tz = dx / dist * this.circleDir;
        this._steer((dx / dist * 0.8 + tx * 0.6) * speed, (dz / dist * 0.8 + tz * 0.6) * speed, dt);
      } else { this._face(dx, dz, dt); this._steer(dx / dist * speed, dz / dist * speed, dt); }
    } else if (surface < want - 1.2) { this._face(dx, dz, dt); this._steer(-dx / dist * speed * 0.5, -dz / dist * speed * 0.5, dt); }
    else {
      // In range without an attack ready: keep moving a little (never stand still > 1 s).
      this._face(dx, dz, dt);
      const tx = -dz / dist * this.circleDir, tz = dx / dist * this.circleDir, s = (beh.circle?.speed_mps ?? 1) * 0.6;
      this.circleT -= dt; if (this.circleT <= 0) { this.circleT = 1.5; this.circleDir = -this.circleDir; }
      this._steer(tx * s, tz * s, dt);
    }
  }

  // ---------------------------------------------------------------- attacks
  _startAttack(atk) {
    const g = this.game, ai = g.data.combat.enemy_ai;
    this.attack = atk; this._setState('attack'); this.atkT = 0; this.hitIdx = 0; this.chargeHit = false; this.selfMoved = 0;
    this.tl = { ...attackTimeline(atk, { speedMult: this.speedMult, telegraphMult: this.telegraphMult }) };
    // Attacks from outside the camera frame: longer telegraph and always an audio cue (enemy_ai).
    const off = !this.onScreen;
    if (off) { const add = ai?.offscreen_attack_extra_windup_s ?? 0.25; this.tl.windup += add; this.tl.total += add; this.tl.hitTimes = this.tl.hitTimes.map((h) => h + add); }
    this.history.push(atk.id); if (this.history.length > 4) this.history.shift();
    const p = g.player;
    this.atkCtx.side = Math.sign((p.x - this.x) * Math.cos(this.yaw) - (p.z - this.z) * Math.sin(this.yaw)) || 1;
    const kind = telegraphKind(atk);
    const fam = this.isBoss ? (BOAR_AUDIO[atk.id] ?? 'boar_snort') : FAMILY[this.def.id];
    g.onTelegraph(this, atk, kind, fam, off);
    // Decal
    const d = kind === 'unparryable' ? this.decalU : this.decal;
    this._hideDecals();
    if (atk.shape === 'charge' || atk.shape === 'projectile') { d.lane.visible = true; d.lane.scale.set(this.radius * (atk.shape === 'projectile' ? 1.0 : 2), atk.range_m, 1); }
    else { d.ring.visible = true; const r = atk.shape === 'aoe' || atk.shape === 'rear_arc' ? atk.range_m + (atk.shape === 'rear_arc' ? this.radius : 0) : atk.range_m + this.radius; d.ring.scale.setScalar(r); }
    this.activeDecal = d;
  }

  _updateAttack(dt, dx, dz) {
    const a = this.attack, tl = this.tl, g = this.game;
    this.atkT += dt;
    const t = this.atkT;
    const windEnd = tl.windup + tl.hold;
    this.speed = 0;
    if (t < tl.windup && a.shape !== 'rear_arc') this._face(dx, dz, dt * 1.5); // tracks during the telegraph, locks after
    // Decal placement/progress.
    const d = this.activeDecal;
    if (d) {
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      if (d.lane.visible) { d.lane.position.set(this.x + fx * a.range_m / 2, 0.05, this.z + fz * a.range_m / 2); d.lane.rotation.z = -this.yaw; }
      if (d.ring.visible) d.ring.position.set(this.x, 0.05, this.z);
      d.mat.opacity = t < windEnd ? 0.2 + 0.4 * Math.min(1, t / Math.max(0.01, windEnd)) : 0.55;
    }
    const active = t >= windEnd && t < windEnd + tl.active;
    this.neckExposed = a.id === 'll_dui_co' && active;
    if (a.shape === 'charge' && active) {
      const spd = a.range_m / Math.max(0.05, tl.active);
      this._move(Math.sin(this.yaw), Math.cos(this.yaw), spd * dt);
      this.speed = spd;
      if (!this.chargeHit && g.player.distanceTo(this.x, this.z) <= this.radius + 0.9) { this.chargeHit = true; g.enemyHitsPlayer(this, a); }
    } else if (a.shape === 'projectile') {
      if (active && !this.projectile) this._launchProjectile(a);
    } else {
      if (a.self_move_m && active) {
        // e.g. Nhảy lùi chém: leap back while slashing.
        const want = a.self_move_m * Math.min(1, (t - windEnd) / tl.active) - this.selfMoved;
        this._move(Math.sin(this.yaw), Math.cos(this.yaw), want); this.selfMoved += want;
      }
      while (this.hitIdx < tl.hitTimes.length && t >= tl.hitTimes[this.hitIdx]) {
        this.hitIdx += 1;
        if (this._inReach(a)) g.enemyHitsPlayer(this, a);
      }
    }
    if (t >= windEnd + tl.active) { this._hideDecals(); this.neckExposed = false; }
    if (t >= tl.total) {
      this.cooldowns[a.id] = a.cooldown_s; this.attack = null;
      g.tokens.release(this.uid);
      const beh = this.beh;
      if (g.rng() < (beh.retreat_after_attack_chance ?? 0)) { this._setState('retreat'); if (beh.retreat_then_prefers) this.preferNext = beh.retreat_then_prefers; }
      else this._setState('chase');
    }
  }

  _inReach(a) {
    const p = this.game.player;
    const dx = p.x - this.x, dz = p.z - this.z, dist = Math.hypot(dx, dz);
    if (a.shape === 'aoe') return dist <= a.range_m + 0.3;
    if (a.shape === 'rear_arc') return dist <= a.range_m + this.radius + 0.3; // whips all around
    if (dist > a.range_m + this.radius + 0.3) return false;
    const ang = Math.abs(normAngle(Math.atan2(dx, dz) - this.yaw)) * 180 / Math.PI;
    return ang <= PROTO.enemyHitArcDeg / 2 || dist < this.radius + 0.5;
  }

  // ---------------------------------------------------------------- projectile (Ụ Bùn "Lăn ụ")
  _launchProjectile(a) {
    const g = this.game, p = g.player;
    if (!this.projectileMesh) {
      this.projectileMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), new THREE.MeshLambertMaterial({ color: 0x4f3c2a }));
      this.projectileMesh.castShadow = true; g.scene.add(this.projectileMesh);
    }
    const dx = p.x - this.x, dz = p.z - this.z, l = Math.hypot(dx, dz) || 1;
    this.projectile = { x: this.x + dx / l * (this.radius + 0.4), z: this.z + dz / l * (this.radius + 0.4), vx: dx / l * (a.projectile_speed_mps ?? 6), vz: dz / l * (a.projectile_speed_mps ?? 6), t: 0, life: this.tl.active, atk: a, hit: false };
    this.projectileMesh.visible = true;
  }
  _updateProjectile(dt) {
    const pr = this.projectile; if (!pr) return;
    const g = this.game, m = this.projectileMesh;
    pr.t += dt; pr.x += pr.vx * dt; pr.z += pr.vz * dt;
    m.position.set(pr.x, 0.45, pr.z); m.rotation.x += dt * 8;
    if (!pr.hit && Math.hypot(g.player.x - pr.x, g.player.z - pr.z) < 0.9) { pr.hit = true; g.enemyHitsPlayer(this, pr.atk); }
    if (pr.t >= pr.life || pr.hit || !g.walk.inside(pr.x, pr.z, 0)) { this.projectile = null; m.visible = false; g.fxh?.projectileBurst?.(pr.x, pr.z); }
  }

  // ---------------------------------------------------------------- burrow (Ụ Bùn)
  _startBurrow() {
    const rb = this.beh.reposition_burrow, g = this.game, p = g.player;
    this._setState('burrow'); this.game.tokens.release(this.uid);
    this.burrowCd = rb.cooldown_s ?? 12; this.ctx.burrowS = rb.duration_s ?? 2;
    // Rise closer to the player, at distance_m from the current spot, toward the player.
    const dx = p.x - this.x, dz = p.z - this.z, l = Math.hypot(dx, dz) || 1, dd = Math.min(rb.distance_m ?? 5, Math.max(0, l - 2.5));
    const tx = this.x + dx / l * dd, tz = this.z + dz / l * dd;
    this.burrowTo = g.walk.inside(tx, tz, this.radius) ? { x: tx, z: tz } : { x: this.x, z: this.z };
    g.fxh?.burrowMark?.(this.burrowTo.x, this.burrowTo.z);
  }
  _updateBurrow(dt) {
    const dur = this.ctx.burrowS;
    if (this.stateT >= dur * 0.45 && this.stateT - dt < dur * 0.55 && this.burrowTo) { this.x = this.burrowTo.x; this.z = this.burrowTo.z; }
    this.speed = 0;
    if (this.stateT >= dur) { this._setState('chase'); this.burrowTo = null; }
  }

  // ---------------------------------------------------------------- boss phase-2 set piece "Húc cọc"
  _startTransition() {
    const g = this.game;
    this._setState('transition'); this.game.tokens.release(this.uid); this._hideDecals();
    const stake = g.props.trapStake?.position ?? { x: this.x, z: this.z + 6 };
    this.stakeAt = { x: stake.x, z: stake.z };
    this.transitionEvents = { hit: false, kneel: false, line: false, stand: false };
    g.onBossTransition?.(this, 'start');
  }
  _updateTransition(dt) {
    const g = this.game, sp = this.enc.phase.transition_set_piece_0_2, t = this.stateT, ev = this.transitionEvents;
    const s = this.stakeAt, dx = s.x - this.x, dz = s.z - this.z, dist = Math.hypot(dx, dz);
    this.speed = 0;
    if (t < 0.8) {
      // Ignores Cói: turns to the broken trap stake and charges it.
      this._face(dx, dz, dt * 3);
      const stop = this.radius + 0.4;
      if (dist > stop) { const v = Math.min((dist - stop) / Math.max(0.05, 0.8 - t), 14); this._move(dx / dist, dz / dist, v * dt); this.speed = v; }
    } else if (!ev.hit) { ev.hit = true; g.onBossTransition?.(this, 'stake_hit'); }
    if (t >= 2.0 && !ev.kneel) { ev.kneel = true; g.onBossTransition?.(this, 'kneel'); }
    if (t >= 2.6 && !ev.line) { ev.line = true; g.onBossTransition?.(this, 'line'); }
    if (t >= 3.4 && !ev.stand) { ev.stand = true; g.onBossTransition?.(this, 'stand'); }
    if (t >= (sp?.duration_s ?? 4)) { this._setState('chase'); g.onBossTransition?.(this, 'end'); }
  }

  // ---------------------------------------------------------------- movement helpers
  _face(dx, dz, dt) {
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
    const rate = (this.beh.turn_rate_deg_s ?? (this.isBoss ? 185 : 340)) * DEG * dt;
    this.yaw = turnToward(this.yaw, Math.atan2(dx, dz), rate);
  }
  /** Smoothly steer toward a desired velocity (m/s), then move. */
  _steer(vx, vz, dt) {
    const k = Math.min(1, dt * 8);
    this.vx += (vx - this.vx) * k; this.vz += (vz - this.vz) * k;
    const s = Math.hypot(this.vx, this.vz);
    this.speed = s;
    if (s > 1e-3) this._move(this.vx / s, this.vz / s, s * dt);
  }
  _move(nx, nz, len) {
    const slow = this.slowT > 0 ? 0.6 : 1;
    const r = this.game.walk.move(this.x, this.z, nx * len * slow, nz * len * slow, this.radius * 0.6);
    this.x = r.x; this.z = r.z;
    this._separate();
  }
  _separate() {
    // Keep clear of the player and of other enemies (no stacking).
    const g = this.game, p = g.player;
    const push = (ox, oz, min) => {
      const dx = this.x - ox, dz = this.z - oz, dd = Math.hypot(dx, dz);
      if (dd < min && dd > 1e-3) { const r2 = g.walk.move(this.x, this.z, (dx / dd) * (min - dd), (dz / dd) * (min - dd), this.radius * 0.6); this.x = r2.x; this.z = r2.z; }
    };
    if (this.state !== 'freed' && this.state !== 'transition') push(p.x, p.z, this.radius + 0.45);
    for (const e of g.allEnemies()) if (e !== this && e.alive && e.state !== 'pried') push(e.x, e.z, (this.radius + e.radius) * 0.9);
  }
  _applyKnock(dt) {
    const k = this.knock; if (!k) return;
    const s = Math.min(dt, k.t); k.t -= dt;
    const r = this.game.walk.move(this.x, this.z, k.vx * s, k.vz * s, this.radius * 0.6); this.x = r.x; this.z = r.z;
    if (k.t <= 0) this.knock = null;
  }

  _sync(dt) {
    const root = this.mesh.root;
    root.position.set(this.x, 0, this.z); root.rotation.y = this.yaw;
    const c = this.ctx;
    c.state = this.state; c.stateT = this.stateT; c.speed = this.speed;
    if (this.attack && this.state === 'attack') { const a = this.atkCtx; a.id = this.attack.id; a.t = this.atkT; a.tl = this.tl; c.attack = a; } else c.attack = null;
    if (this.state === 'transition') c.state = this.stateT < 0.8 ? 'transition_run' : 'transition';
    if (this.state === 'transition' && this.stateT >= 0.8) c.state = 'transition';
    this.mesh.update(dt, c);
    if (this.isBoss) this.mesh.setCracks(this.enc.khoen.cracks, this.enc.khoen.enabled);
    const kind = this.telegraphKind;
    const t = performance.now() / 1000;
    const tint = kind === 'unparryable' ? 0xd0442a : this.flash > 0 ? 0xffffff : this.state === 'stagger' ? 0x806a20 : 0x000000;
    for (const p of this.mesh.tintParts) {
      p.material.emissive?.setHex(tint);
      if (p.material.emissive) p.material.emissiveIntensity = kind === 'unparryable' ? 0.35 + 0.25 * Math.sin(t * (this.game.settings.acc.acc_reduce_flash ? 4 : 18)) : 0.5;
    }
  }

  dispose() {
    this.game.scene.remove(this.mesh.root);
    if (this.projectileMesh) this.game.scene.remove(this.projectileMesh);
    for (const d of [this.decal, this.decalU]) { this.game.scene.remove(d.ring); this.game.scene.remove(d.lane); }
  }
}

export { normAngle };
