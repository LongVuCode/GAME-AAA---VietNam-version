// enemy.js - enemy actor: data-driven attacks (enemies.json), posture, telegraphs, non-lethal defeat
// (flee / dissipate). The boss wraps logic/boss.js (BossEncounter) for health floor, khoen and pry.
import { Posture } from '../logic/posture.js';
import { BossEncounter } from '../logic/boss.js';
import { attackTimeline, chooseAttack, telegraphKind } from '../logic/enemyAi.js';
import { PROTO } from '../logic/proto.js';
import { makeBoar, makeCrab, makeMantis, makeMound, makeDecal } from './meshes.js';

// Presentation shape of each attack (graybox reading of telegraph.visual in enemies.json).
const CHARGE = new Set(['ll_can_lay', 'll_can_khuyu', 'll_ui_bun', 'bn_vo_phuc', 'cua_ui_ngang']);
const AOE = new Set(['ll_dam_lay', 'ub_lan', 'll_giay_dau', 'll_rong_dau']);
const FAMILY = { en_cua_cang_bun: 'crab', en_bo_ngua_lau: 'mantis', en_u_bun: 'mud' };
const BOAR_AUDIO = { ll_can_lay: 'boar_roar', ll_can_khuyu: 'boar_roar', ll_giay_dau: 'boar_pain', ll_rong_dau: 'boar_pain' };

let uidSeq = 0;

export class Enemy {
  constructor(game, def, spawn, { practice = false } = {}) {
    this.game = game; this.def = def; this.spawn = { ...spawn }; this.practice = practice;
    this.uid = `${def.id}#${++uidSeq}`;
    this.isBoss = def.rank === 'boss';
    this.radius = PROTO.enemyRadiusM[def.id] ?? 0.8;
    this.moveSpeed = PROTO.enemyMoveSpeedMps[def.id] ?? 2;
    const m = def.id === 'en_cua_cang_bun' ? makeCrab() : def.id === 'en_bo_ngua_lau' ? makeMantis()
      : def.id === 'en_u_bun' ? makeMound() : makeBoar();
    this.mesh = m; game.scene.add(m.root);
    this.decal = makeDecal('parryable'); this.decalU = makeDecal('unparryable');
    for (const d of [this.decal, this.decalU]) { game.scene.add(d.ring); game.scene.add(d.lane); d.ring.visible = d.lane.visible = false; }
    this.reset();
  }

  reset() {
    const d = this.def, tun = this.game.data.combat;
    this.x = this.spawn.x; this.z = this.spawn.z; this.yaw = Math.PI; // face south (toward the landing)
    this.state = 'idle'; this.attack = null; this.cooldowns = {}; this.engaged = false;
    this.fleeT = 0; this.flash = 0; this.slowT = 0; this.transitionT = 0; this.walkAway = null;
    if (this.isBoss) {
      this.enc = new BossEncounter(d, tun, { khoenEnabled: this.game.opts.khoenEnabled });
      this.posture = this.enc.posture;
      this.mesh.cracks.forEach((c) => { c.visible = false; });
      this.mesh.khoen.visible = this.enc.khoen.enabled;
    } else {
      this.hp = d.hp;
      this.posture = new Posture({ max: d.the_max, regenPerS: d.the_regen_per_s ?? tun.enemy_the_defaults.regen_per_s,
        regenDelayS: d.the_regen_delay_s ?? tun.enemy_the_defaults.regen_delay_s,
        staggerS: d.stagger_duration_s ?? tun.enemy_the_defaults.stagger_duration_s,
        afterStaggerRatio: tun.enemy_the_defaults.post_stagger_the_ratio });
    }
    this.mesh.root.visible = true; this.mesh.root.position.set(this.x, 0, this.z); this.mesh.root.scale.setScalar(1);
    this.mesh.rig.position.y = 0;
    this._hideDecals();
  }

  get hpNow() { return this.isBoss ? this.enc.hp : this.hp; }
  get hpMax() { return this.def.hp; }
  get alive() { return this.state !== 'gone' && this.state !== 'fleeing' && this.state !== 'freed'; }
  get lockable() { return this.alive && this.state !== 'pried'; }
  get staggered() { return this.posture.staggered; }
  get moveset() { return this.isBoss ? this.enc.phase.moveset : this.def.attacks.map((a) => a.id); }
  get speedMult() { return this.game.diff.enemySpeed * (this.isBoss ? this.enc.phase.speed_mult : 1); }
  get telegraphMult() { return this.game.diff.telegraphMult * (this.isBoss ? this.enc.phase.telegraph_time_mult : 1); }
  get telegraphKind() { return this.attack && this.state === 'attack' && this.atkT < this.tl.windup + this.tl.hold ? telegraphKind(this.attack) : null; }

  _hideDecals() { for (const d of [this.decal, this.decalU]) { d.ring.visible = false; d.lane.visible = false; } }

  /** A player hit. Returns info for feedback. */
  receiveHit({ hp, the }) {
    if (!this.alive || this.state === 'pried') return null;
    this.engaged = true; this.flash = 0.12;
    let broke = false, cracked = false, phaseChanged = false, floorReached = false;
    if (this.isBoss) {
      const r = this.enc.receiveHit({ hp, the });
      ({ broke, cracked, phaseChanged, floorReached } = r);
      if (phaseChanged) this.transitionT = this.enc.phase.transition_beat_s ?? 0;
    } else {
      this.hp = Math.max(0, this.hp - hp);
      broke = this.posture.applyDamage(the);
    }
    if (broke) this._cancelAttack();
    else if (this.state === 'attack' && this.atkT < this.tl.windup && the >= (this.def.interrupt_threshold ?? Infinity)) this._cancelAttack();
    if (!this.isBoss && this.hp <= 0) this.defeat();
    return { broke, cracked, phaseChanged, floorReached };
  }

  receiveTheDamage(the) {
    if (!this.alive) return false;
    this.engaged = true;
    if (this.isBoss) {
      const r = this.enc.receiveHit({ hp: 0, the });
      if (r.phaseChanged) this.transitionT = this.enc.phase.transition_beat_s ?? 0;
      if (r.broke) this._cancelAttack();
      return r;
    }
    const broke = this.posture.applyDamage(the);
    if (broke) this._cancelAttack();
    return { broke, cracked: false };
  }

  _cancelAttack() {
    if (this.attack) { this.cooldowns[this.attack.id] = this.attack.cooldown_s; this.game.tokens.release(this.uid); }
    this.attack = null; this.state = this.posture.staggered ? 'stagger' : 'chase'; this._hideDecals();
  }

  /** Normal enemies: out of strength → flee / dissipate (never killed). */
  defeat() {
    if (this.isBoss || !this.alive) return;
    this._cancelAttack();
    this.state = 'fleeing'; this.fleeT = 1.6;
    this.game.onEnemyDefeated(this);
  }

  /** Boss freed: walks off into the reeds. */
  walkOff() {
    this.state = 'freed'; this._hideDecals(); this.game.tokens.release(this.uid);
    this.walkAway = { t: 0, dirX: 0.35, dirZ: -1 };
  }

  update(dt) {
    const g = this.game, root = this.mesh.root;
    this.flash = Math.max(0, this.flash - dt);
    for (const k of Object.keys(this.cooldowns)) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    if (this.state === 'gone') { root.visible = false; return; }
    if (this.state === 'fleeing') {
      this.fleeT -= dt;
      const dx = this.x - g.player.x, dz = this.z - g.player.z, l = Math.hypot(dx, dz) || 1;
      if (this.def.defeat_behavior === 'dissipate') { this.mesh.rig.position.y -= dt * 1.4; root.scale.y = Math.max(0.05, this.fleeT / 1.6); }
      else if (this.def.species_family === 'crab') { this.mesh.rig.position.y -= dt * 0.8; this._step(dx / l, dz / l, this.moveSpeed * 1.5 * dt); }
      else { this.mesh.rig.position.y += dt * 1.2; this._step(dx / l, dz / l, this.moveSpeed * 2.2 * dt); }
      if (this.fleeT <= 0) { this.state = 'gone'; root.visible = false; }
      this._sync(); return;
    }
    if (this.state === 'freed') {
      const w = this.walkAway; w.t += dt;
      this.yaw = Math.atan2(w.dirX, w.dirZ);
      this.x += w.dirX * 1.6 * dt; this.z += w.dirZ * 1.6 * dt;
      if (w.t > 9) root.visible = false;
      this._sync(); return;
    }
    if (this.isBoss) {
      if (this.enc.prying) { this.state = 'pried'; this._sync(); return; }
      if (this.enc.outcome !== 'in_progress') { this.state = 'stagger'; this._hideDecals(); this._sync(); return; }
      if (this.state === 'pried') this.state = 'stagger';
      this.enc.tick(dt);
      this.transitionT = Math.max(0, this.transitionT - (this.posture.staggered ? 0 : dt));
    } else this.posture.tick(dt);

    if (this.posture.staggered) { this.state = 'stagger'; this._sync(); return; }
    if (this.state === 'stagger') this.state = 'chase';

    const px = g.player.x, pz = g.player.z;
    const dx = px - this.x, dz = pz - this.z, dist = Math.hypot(dx, dz);
    const sameWorld = g.player.alive && Math.abs(px - this.x) < 120;
    if (!this.engaged && sameWorld && dist < (this.isBoss ? 16 : PROTO.aggroRadiusM)) this.engaged = true;
    if (this.isBoss && dist > 26) this.engaged = false;
    if (this.slowT > 0) this.slowT -= dt;

    if (this.state === 'attack') { this._updateAttack(dt, dx, dz, dist); this._sync(); return; }
    if (!this.engaged || !sameWorld || g.player.state === 'pry') {
      // Drift back home.
      const hx = this.spawn.x - this.x, hz = this.spawn.z - this.z, hl = Math.hypot(hx, hz);
      if (hl > 0.5) { this._face(hx, hz, dt); this._step(hx / hl, hz / hl, this.moveSpeed * 0.6 * dt); }
      if (!this.engaged) { this.game.tokens.release(this.uid); }
      this._sync(); return;
    }
    if (this.transitionT > 0) { this._face(dx, dz, dt); this._sync(); return; }
    this._face(dx, dz, dt);
    const surface = Math.max(0, dist - this.radius - 0.4);
    const ready = this.moveset.map((id) => this.def.attacks.find((a) => a.id === id))
      .filter((a) => (this.cooldowns[a.id] ?? 0) <= 0);
    const inRange = ready.filter((a) => surface <= a.range_m * (CHARGE.has(a.id) ? 0.9 : 0.85));
    const hasToken = inRange.length ? g.tokens.tryAcquire(this.uid) : false;
    if (hasToken) {
      const atk = chooseAttack(this.def.attacks, inRange.map((a) => a.id), this.cooldowns, 0, g.rng);
      if (atk) { this._startAttack(atk); this._sync(); return; }
    }
    // Approach to the shortest melee range, or hold a little distance when no token is available.
    const melee = Math.min(...this.def.attacks.filter((a) => !CHARGE.has(a.id)).map((a) => a.range_m));
    const want = hasToken || g.tokens.count < g.tokens.max ? melee * 0.7 : melee + 2.2;
    if (surface > want) this._step(dx / dist, dz / dist, this.moveSpeed * this.speedMult * dt);
    else if (surface < want - 1.5) this._step(-dx / dist, -dz / dist, this.moveSpeed * 0.5 * dt);
    this._sync();
  }

  _startAttack(atk) {
    this.attack = atk; this.state = 'attack'; this.atkT = 0; this.hitIdx = 0; this.chargeHit = false;
    this.tl = attackTimeline(atk, { speedMult: this.speedMult, telegraphMult: this.telegraphMult });
    const kind = telegraphKind(atk);
    const fam = this.isBoss ? (BOAR_AUDIO[atk.id] ?? 'boar_snort') : FAMILY[this.def.id];
    this.game.onTelegraph(this, atk, kind, fam);
    // Decal
    const d = kind === 'unparryable' ? this.decalU : this.decal;
    this._hideDecals();
    if (CHARGE.has(atk.id)) { d.lane.visible = true; d.lane.scale.set(this.radius * 2, atk.range_m, 1); }
    else { d.ring.visible = true; const r = AOE.has(atk.id) ? atk.range_m : atk.range_m + this.radius; d.ring.scale.setScalar(r); }
    this.activeDecal = d;
  }

  _updateAttack(dt, dx, dz) {
    const a = this.attack, tl = this.tl, g = this.game;
    this.atkT += dt;
    const t = this.atkT;
    const windEnd = tl.windup + tl.hold;
    if (t < tl.windup) this._face(dx, dz, dt * 1.5); // tracks during the telegraph, locks after
    // Decal placement/progress.
    const d = this.activeDecal;
    if (d) {
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      if (d.lane.visible) { d.lane.position.set(this.x + fx * a.range_m / 2, 0.05, this.z + fz * a.range_m / 2); d.lane.rotation.z = -this.yaw; }
      if (d.ring.visible) d.ring.position.set(this.x, 0.05, this.z);
      d.mat.opacity = t < windEnd ? 0.2 + 0.4 * Math.min(1, t / Math.max(0.01, windEnd)) : 0.55;
    }
    // Charge movement during active.
    if (CHARGE.has(a.id) && t >= windEnd && t < windEnd + tl.active) {
      const spd = a.range_m / Math.max(0.05, tl.active);
      this._step(Math.sin(this.yaw), Math.cos(this.yaw), spd * dt);
      if (!this.chargeHit && g.player.distanceTo(this.x, this.z) <= this.radius + 0.9) {
        this.chargeHit = true; g.enemyHitsPlayer(this, a);
      }
    } else if (!CHARGE.has(a.id)) {
      while (this.hitIdx < tl.hitTimes.length && t >= tl.hitTimes[this.hitIdx]) {
        this.hitIdx += 1;
        if (this._inReach(a)) g.enemyHitsPlayer(this, a);
      }
    }
    if (t >= windEnd + tl.active) this._hideDecals();
    if (t >= tl.total) {
      this.cooldowns[a.id] = a.cooldown_s; this.attack = null; this.state = 'chase';
      g.tokens.release(this.uid);
    }
  }

  _inReach(a) {
    const p = this.game.player;
    const dx = p.x - this.x, dz = p.z - this.z, dist = Math.hypot(dx, dz);
    if (AOE.has(a.id)) return dist <= a.range_m + 0.3;
    if (dist > a.range_m + this.radius + 0.3) return false;
    const ang = Math.abs(normAngle(Math.atan2(dx, dz) - this.yaw)) * 180 / Math.PI;
    return ang <= PROTO.enemyHitArcDeg / 2 || dist < this.radius + 0.5;
  }

  _face(dx, dz, dt) {
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
    const target = Math.atan2(dx, dz);
    const diff = normAngle(target - this.yaw);
    const rate = (this.isBoss ? 3.2 : 6) * dt;
    this.yaw += Math.max(-rate, Math.min(rate, diff));
  }

  _step(nx, nz, len) {
    const slow = this.slowT > 0 ? 0.6 : 1;
    const r = this.game.walk.move(this.x, this.z, nx * len * slow, nz * len * slow, this.radius * 0.6);
    this.x = r.x; this.z = r.z;
    // Simple separation from the player.
    const p = this.game.player;
    const dx = this.x - p.x, dz = this.z - p.z, dd = Math.hypot(dx, dz), min = this.radius + 0.45;
    if (dd < min && dd > 1e-3 && this.state !== 'freed') { const r2 = this.game.walk.move(this.x, this.z, (dx / dd) * (min - dd), (dz / dd) * (min - dd), this.radius * 0.6); this.x = r2.x; this.z = r2.z; }
  }

  _sync() {
    const root = this.mesh.root;
    root.position.set(this.x, 0, this.z); root.rotation.y = this.yaw;
    const t = performance.now() / 1000;
    const rig = this.mesh.rig;
    // Procedural poses: windup raise, stagger slump, telegraph tint.
    const kind = this.telegraphKind;
    const raise = this.state === 'attack' ? Math.min(1, this.atkT / Math.max(0.05, this.tl.windup)) : 0;
    for (const arm of this.mesh.arms) arm.rotation.x = -raise * 1.2 + (this.state === 'attack' && this.atkT > this.tl.windup + this.tl.hold ? 1.4 : 0);
    if (this.isBoss) {
      const hd = this.mesh.head;
      hd.rotation.x = this.state === 'stagger' || this.state === 'pried' ? 0.5 : (kind ? -0.25 * raise : Math.sin(t * 2) * 0.05);
      rig.position.y = this.state === 'stagger' || this.state === 'pried' ? -0.35 : 0;
      rig.rotation.z = this.state === 'stagger' ? 0.12 : 0;
      this.mesh.cracks.forEach((c, i) => { c.visible = this.enc.khoen.enabled && i < this.enc.khoen.cracks; });
    } else if (this.state !== 'fleeing') {
      rig.rotation.z = this.state === 'stagger' ? 0.25 : 0;
    }
    const tint = kind === 'unparryable' ? 0xd0442a : this.flash > 0 ? 0xffffff : this.state === 'stagger' ? 0x806a20 : 0x000000;
    for (const p of this.mesh.tintParts) {
      p.material.emissive?.setHex(tint);
      if (p.material.emissive) p.material.emissiveIntensity = kind === 'unparryable' ? 0.35 + 0.25 * Math.sin(t * (this.game.settings.reduceFlash ? 4 : 18)) : 0.5;
    }
  }

  dispose() {
    this.game.scene.remove(this.mesh.root);
    for (const d of [this.decal, this.decalU]) { this.game.scene.remove(d.ring); this.game.scene.remove(d.lane); }
  }
}

export function normAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
export const ENEMY_SHAPES = { CHARGE, AOE };
