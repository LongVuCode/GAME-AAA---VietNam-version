// fx/hooks.js - glue between game events (src/game) and the FX module. Game code calls ONE short
// line per event (`this.fxh?.parry(enemy, perfect)` ...); everything visual/audio-feel lives here.
// The poller (update) covers things that have no event yet: weapon trails during the active frames,
// footsteps (player and enemies), fire embers, low-health vignette, khoen sheen, drum-ready pulse,
// zone moods. The Animation & Movement work can replace any poller with an explicit call.
// List of hooks: src/fx/README.md.
import { strideFor } from './logic.js';

// Graybox presentation constants (not balance): contact height and surface of each enemy body.
const BODY = {
  en_cua_cang_bun: { h: 0.55, surface: 'wood' },  // chitin shell: hard, dry "clack"
  en_bo_ngua_lau: { h: 1.2, surface: 'flesh' },
  en_u_bun: { h: 1.3, surface: 'mud' },
  boss_lon_loi_dam: { h: 1.5, surface: 'flesh' },
};
const ZONE_MOOD = {
  z_ben_say: 'ben_say', z_dam_nong: 'dam_nong', z_bai_lau: 'bai_lau', z_lo_bo_hoang: 'bai_lau', hub: 'hub', hub_bank: 'hub',
  // Demo 0.4 regions (fx/atmosphere.js MOODS).
  z_bai_boi: 'ben_say', z_doi_go: 'go_sim', z_rung_sung: 'rung_sung', z_dong_lay_bac: 'dong_lay', z_rach_nuoc: 'rach', z_lau_sau: 'lau_sau', z_san_lo: 'san_lo',
};
const TRAIL = {
  wp_giao_dong: { color: 0xf1c78a, width: 0.75, durationS: 0.14 },
  wp_riu_xeo: { color: 0xe7c48e, width: 0.55, durationS: 0.16 },
  pole: { color: 0xe7dec7, width: 0.6, durationS: 0.14 },
};

export class GameFxHooks {
  constructor(game, fx) {
    this.g = game; this.fx = fx;
    this.feel = game.data.combat.feel ?? {};
    this.fin = game.data.combat.finisher ?? {};
    this.trails = new WeakMap();
    this.swing = null; this.burstTrail = null;
    this.step = { x: null, z: null, acc: 0, side: 1, speed: 0 };
    this.enemySteps = new Map();
    this.fireT = 0; this.heartT = 0; this.lastCracks = -1; this.drumReady = false; this.freedAt = -Infinity; this.moodInit = false;
  }

  // ------------------------------------------------------------------ helpers
  _trailFor(obj, kind) {
    if (!obj) return null;
    let h = this.trails.get(obj);
    if (!h) { h = this.fx.weaponTrail(obj, TRAIL[kind] ?? TRAIL.wp_giao_dong); this.trails.set(obj, h); }
    return h;
  }
  _weaponObj(p) { return p.pole?.visible ? [p.pole, 'pole'] : [p.weaponMeshes?.[p.weaponId], p.weaponId]; }
  surfaceAt(x, z) {
    const s = this.g.walk.speedMult(x, z);
    if (s === 'mud') return 'mud';
    if (s === 'shallow') return 'water';
    if (x >= -2 && x <= 2 && z >= 24 && z <= 33) return 'wood'; // landing dock
    return 'dirt';
  }
  _ground(x, z) { const s = this.surfaceAt(x, z); return s === 'mud' || s === 'water' ? s : null; }
  /** Contact point on an enemy facing the player, and the normal toward the player. */
  _contact(e, frac = 0.75) {
    const p = this.g.player, dx = p.x - e.x, dz = p.z - e.z, l = Math.hypot(dx, dz) || 1;
    const b = BODY[e.def?.id] ?? { h: 1, surface: 'flesh' };
    return { pos: { x: e.x + (dx / l) * e.radius * frac, y: b.h, z: e.z + (dz / l) * e.radius * frac }, normal: { x: dx / l, y: 0.35, z: dz / l }, surface: b.surface };
  }
  _khoenPos(boss) {
    const k = boss.mesh?.khoen;
    if (!k) return { x: boss.x, y: 1.5, z: boss.z };
    k.updateWorldMatrix(true, false);
    return { x: k.matrixWorld.elements[12], y: k.matrixWorld.elements[13], z: k.matrixWorld.elements[14] };
  }

  // ------------------------------------------------------------------ explicit hooks (game events)
  /** Player weapon swing begins (player.js _startMove). Whoosh + trail are timed by the poller. */
  swingStart(player, cur) {
    const [obj, kind] = this._weaponObj(player);
    const active = Math.max(0.05, cur?.tl?.active ?? 0.12);
    this.swing = { cur, trail: this._trailFor(obj, kind), whooshed: false, speed: Math.max(0.6, Math.min(2.2, 0.18 / active)), weight: cur?.move?.hit_weight ?? 'light' };
  }
  /** Player dodge begins (player.js _startDodge). */
  dodgeStart(player, dir) { this.fx.dodgeBurst({ x: player.x, z: player.z }, dir, { surface: this.surfaceAt(player.x, player.z) }); }
  /** One player hit landed on an enemy (game.playerStrike). */
  playerHitEnemy(e, weight, result, kind) {
    if (!result) return;
    const c = this._contact(e);
    this.fx.impact(c.pos, c.normal, { weight, surface: c.surface, ground: this._ground(e.x, e.z) });
    this.fx.hitFlash(e.mesh?.root);
    if (weight === 'heavy' || kind === 'house') this.fx.fovKick(this.feel.fov_heavy_hit_kick_deg ?? 3, this.feel.fov_kick_return_s ?? 0.2);
  }
  /** Drum Burst hits (game.playerBurstHit). */
  burstHit(targets, last, weight) {
    const p = this.g.player;
    this.fx.drumPulse({ x: p.x, z: p.z }, { strength: last ? 1 : 0.45 });
    this.g.sfx.whoosh(1.6, last ? 'heavy' : 'medium');
    for (const e of targets) { const c = this._contact(e); this.fx.impact(c.pos, c.normal, { weight, surface: c.surface, ground: this._ground(e.x, e.z), sound: true }); this.fx.hitFlash(e.mesh?.root); }
  }
  /** Player foot plant from the animation cycle (anim/animator.js): dust / mud / water at the foot.
   *  Sprinting kicks up a second, bigger puff. Replaces the distance poller for the player. */
  playerFootPlant(p, side, speed) {
    this.playerStepsExternal = true;
    const yaw = p.yaw, ox = Math.cos(yaw) * 0.12 * side, oz = -Math.sin(yaw) * 0.12 * side;
    const pos = { x: p.x + ox, z: p.z + oz }, surf = this.surfaceAt(p.x, p.z);
    this.fx.footstep(pos, surf, speed);
    if (p.sprinting) this.fx.footstep({ x: pos.x - Math.sin(yaw) * 0.3, z: pos.z - Math.cos(yaw) * 0.3 }, surf, speed + 3, { sound: false });
  }
  /** Rolling mud clod (Ụ Bùn "Lăn ụ") breaks up. */
  projectileBurst(x, z) { this.fx.impact({ x, y: 0.4, z }, { x: 0, y: 1, z: 0 }, { weight: 'medium', surface: 'mud', scale: 0.8 }); }
  /** Bubbling mud where the Ụ Bùn will rise (reposition_burrow telegraph). */
  burrowMark(x, z) { this.fx.footstep({ x, z }, 'mud', 8, { sound: false }); this.fx.drumPulse({ x, z }, { strength: 0.3, color: 0x47392a }); }
  /** Charge level reached (heavy hold): a glint at the weapon tip, a small drum tap, lens pushes in. */
  chargeLevel(p, level) {
    const [obj] = this._weaponObj(p);
    if (obj) { obj.updateWorldMatrix(true, false); const e = obj.matrixWorld.elements; const k = p.weaponId === 'wp_riu_xeo' ? 0.85 : 1.9;
      this.fx.impact({ x: e[12] + e[8] * k, y: e[13] + e[9] * k, z: e[14] + e[10] * k }, null, { weight: 'parry', surface: 'bronze', sound: false, scale: 0.35 + 0.15 * level }); }
    this.g.sfx.drum(false);
    this.fx.fovKick(-1.5 * level, 0.3);
  }
  /** Boss rams the trap stake (set piece "Húc cọc"): bronze-on-wood sparks (physical, not magic). */
  stakeHit(boss, stake) {
    const pos = { x: stake.x, y: 1.2, z: stake.z };
    this.fx.impact(pos, { x: boss.x - stake.x, y: 0.5, z: boss.z - stake.z }, { weight: 'heavy', surface: 'bronze' });
    this.fx.impact(pos, null, { weight: 'medium', surface: 'wood', sound: false, scale: 1.2 });
    this.fx.cameraShake(0.3, 0.35);
  }

  /** Training dummy struck (game.hitDummies). */
  dummyHit(d) { this.fx.impact({ x: d.position.x, y: 1.3, z: d.position.z }, null, { weight: 'light', surface: 'wood' }); this.fx.hitFlash(d); }
  /** Parry / perfect parry of an enemy attack (game.enemyHitsPlayer). */
  parry(enemy, perfect) {
    const p = this.g.player, t = 0.35;
    const pos = { x: p.x + (enemy.x - p.x) * t * 0.6, y: 1.25, z: p.z + (enemy.z - p.z) * t * 0.6 };
    const dx = p.x - enemy.x, dz = p.z - enemy.z, l = Math.hypot(dx, dz) || 1;
    this.fx.impact(pos, { x: -dz / l, y: 0.6, z: dx / l }, { weight: perfect ? 'perfect_parry' : 'parry', surface: 'bronze' });
    if (perfect) {
      this.fx.slowMo(this.feel.perfect_parry_time_scale ?? 0.25, this.feel.perfect_parry_slowmo_s ?? 0.2);
      this.fx.fovKick(-4, 0.32);
      this.fx.cameraShake(0.12, 0.18);
    } else this.fx.cameraShake(0.06, 0.12);
  }
  /** Held guard absorbed a hit (game.enemyHitsPlayer, GUARDED). */
  guardBlock(enemy) {
    const p = this.g.player;
    this.fx.impact({ x: p.x + (enemy.x - p.x) * 0.15, y: 1.2, z: p.z + (enemy.z - p.z) * 0.15 }, { x: p.x - enemy.x, y: 0.4, z: p.z - enemy.z }, { weight: 'guard', surface: 'bronze' });
  }
  /** The player was hit (game.enemyHitsPlayer, HIT). heavy: unparryable class. */
  playerHurt(enemy, heavy) {
    const p = this.g.player;
    this.fx.impact({ x: p.x, y: 1.1, z: p.z }, { x: p.x - enemy.x, y: 0.3, z: p.z - enemy.z }, { weight: 'hurt', surface: 'flesh', ground: this._ground(p.x, p.z), scale: heavy ? 1.4 : 1 });
    this.fx.hitFlash(p.figure?.root, { color: 0xe7dec7, durationS: 0.14, strength: 0.7 });
    this.fx.vignettePulse(heavy ? 0.85 : 0.45);
  }
  /** Perfect dodge (game.enemyHitsPlayer, PERFECT_DODGE). */
  perfectDodge() {
    const p = this.g.player;
    this.fx.slowMo(this.feel.perfect_dodge_time_scale ?? 0.4, this.feel.perfect_dodge_slowmo_s ?? 0.25);
    this.fx.dodgeBurst({ x: p.x, z: p.z }, p.dodgeDir, { surface: this.surfaceAt(p.x, p.z), perfect: true });
  }
  /** Enemy (or boss) posture broke (game.onHitResult). */
  postureBreak(e) {
    this.fx.impact({ x: e.x, y: 0.6, z: e.z }, null, { weight: 'posture_break', surface: this._ground(e.x, e.z) ?? 'dirt' });
    this.fx.slowMo(this.feel.the_break_time_scale ?? 0.3, this.feel.the_break_slowmo_s ?? 0.3);
    this.fx.fovKick(-3, 0.4);
  }
  /** Boss khoen gained a crack (game.onHitResult). */
  khoenCrack(boss) {
    this.fx.impact(this._khoenPos(boss), null, { weight: 'khoen_crack', surface: 'bronze' });
    this.fx.khoenGlow(boss.mesh?.khoen, boss.enc?.khoen?.cracks ?? 1);
    this.lastCracks = boss.enc?.khoen?.cracks ?? this.lastCracks;
  }
  /** Pry drum slot (game.updatePry 'drum'): a calm ground ring, the visual twin of the drum beat. */
  pryDrum(boss) { this.fx.drumPulse({ x: boss.x, z: boss.z }, { strength: 0.55 }); }
  /** Pry beat hit (game.updatePry 'hit'): the crack catches more light, the lens narrows a step. */
  pryBeat(boss, beat) {
    this.fx.impact(this._khoenPos(boss), null, { weight: 'pry_beat', surface: 'bronze' });
    this.fx.khoenGlow(boss.mesh?.khoen, 3 + beat);
    this.fx.setFovOffset('pry', -2.5 * beat);
  }
  /** Pry beat missed (game.updatePry 'miss'). */
  pryMiss(boss) { const k = this._khoenPos(boss); this.fx.impact({ x: k.x, y: 0.4, z: k.z }, null, { weight: 'hurt', surface: 'mud', sound: false, scale: 0.6 }); }
  /** The khoen came off: heavy calm release (no flash; the game then holds 3 s of silence). */
  bossFreed(boss) {
    this.fx.impact(this._khoenPos(boss), null, { weight: 'freed', surface: 'bronze' });
    this.fx.slowMo(0.35, 0.5);
    this.fx.setFovOffset('pry', 0);
    this.fx.khoenGlow(boss.mesh?.khoen, 0);
    this.freedAt = this.fx.clock;
  }
  /** Drum Burst starts (game.onBurst). */
  drumBurst() {
    const p = this.g.player, [obj, kind] = this._weaponObj(p);
    this.fx.drumPulse({ x: p.x, z: p.z }, { strength: 1.3 });
    this.fx.fovKick(4, 0.45);
    this.fx.cameraShake(0.1, 0.2);
    this.burstTrail = this._trailFor(obj, kind); this.burstTrail?.start();
  }
  /** Finisher on a staggered enemy / boss shove (game.updateInteractions, shoveBoss). */
  finisher(e) {
    const c = this._contact(e);
    this.fx.impact(c.pos, c.normal, { weight: 'finisher', surface: c.surface, ground: this._ground(e.x, e.z) });
    this.fx.hitFlash(e.mesh?.root);
    this.fx.slowMo(this.fin.contact_time_scale ?? 0.3, this.fin.contact_slowmo_s ?? 0.15);
    this.fx.fovKick(-3, 0.35);
  }
  /** Normal enemy driven off (game.onEnemyDefeated): crab burrows, mantis flies, mound slumps. */
  enemyDefeated(e) {
    const fam = e.def?.species_family, x = e.x, z = e.z;
    if (e.def?.defeat_behavior === 'dissipate') this.fx.impact({ x, y: 1.2, z }, null, { weight: 'posture_break', surface: 'mud', scale: 1.2 });
    else if (fam === 'crab') this.fx.impact({ x, y: 0.3, z }, null, { weight: 'medium', surface: 'mud', scale: 0.9 });
    else this.fx.impact({ x, y: 1.4, z }, { x: 0, y: 1, z: 0 }, { weight: 'light', surface: 'wood', scale: 0.8 });
  }

  // ------------------------------------------------------------------ poller
  update(dt) {
    const g = this.g, p = g.player, fx = this.fx;
    if (!p) return;
    // Weapon trail + whoosh timed to the active frames of the current move.
    const s = this.swing;
    if (s) {
      const cur = p.cur;
      if (p.state !== 'attack' || cur !== s.cur) { s.trail?.stop(); this.swing = null; }
      else {
        const tl = cur.tl, t = cur.t;
        if (!s.whooshed && t >= tl.startup * 0.6) { s.whooshed = true; g.sfx.whoosh(s.speed, s.weight); }
        const on = t >= tl.startup * 0.55 && t <= tl.startup + tl.active + 0.04;
        if (on) s.trail?.start(); else s.trail?.stop();
      }
    }
    if (this.burstTrail && p.state !== 'burst') { this.burstTrail.stop(); this.burstTrail = null; }
    // Pry lens offset ends with the pry.
    if (!g.pry && this.freedAt < fx.clock - 0.01) fx.setFovOffset('pry', 0);
    this._footsteps(dt, p);
    this._enemySteps(dt);
    // Fire embers (only near the player).
    this.fireT -= dt;
    if (this.fireT <= 0) {
      this.fireT = 0.14;
      for (const f of Object.values(g.props?.fires ?? {})) {
        const wp = f.parent?.position; if (!wp) continue;
        if (Math.hypot(wp.x - p.x, wp.z - p.z) < 45) fx.embers(wp, 1);
      }
    }
    // Low health: steady charcoal vignette + heartbeat pulse.
    const ratio = p.alive ? p.hp / p.hpMax : 1;
    if (ratio < 0.3) {
      fx.setVignette(0.35 + (0.3 - ratio) / 0.3 * 0.6);
      this.heartT -= dt;
      if (this.heartT <= 0) { this.heartT = 0.6 + ratio * 2.5; fx.vignettePulse(0.35); g.sfx.heartbeat?.(1 - ratio / 0.3); }
    } else { fx.setVignette(0); this.heartT = 0; }
    // Drum gauge just filled: a soft ring at the feet.
    const ready = !!p.drum?.canBurst();
    if (ready && !this.drumReady) fx.drumPulse({ x: p.x, z: p.z }, { strength: 0.6 });
    this.drumReady = ready;
    // Khoen sheen follows the crack count (also after a reset / respawn).
    const b = g.boss;
    if (b?.enc?.khoen?.enabled && !g.pry && b.state !== 'freed' && b.state !== 'gone') {
      const c = b.enc.khoen.cracks;
      if (c !== this.lastCracks) { fx.khoenGlow(b.mesh.khoen, c); this.lastCracks = c; }
    }
    this._mood();
  }

  _mood() {
    const g = this.g, fx = this.fx;
    let id = ZONE_MOOD[g.zone] ?? 'ben_say';
    if (g.zone === 'z_dau_truong') {
      const b = g.boss, silenceS = g.data.combat.pry?.silence_after_s ?? 3;
      if (g.pry || fx.clock - this.freedAt < silenceS + 0.2) id = 'pry';
      else if (b?.state === 'freed' || b?.state === 'gone' || g.gen?.flags?.has('flag_boss_lon_loi_freed')) id = 'freed';
      else id = b?.enc?.phaseIndex > 0 ? 'boss_p2' : 'boss_p1';
    }
    fx.setMood(id, !this.moodInit);
    this.moodInit = true;
  }

  _footsteps(dt, p) {
    const st = this.step;
    if (this.playerStepsExternal) return; // the animator places foot plants (playerFootPlant)
    if (st.x === null || !(dt > 0)) { st.x = p.x; st.z = p.z; return; }
    const d = Math.hypot(p.x - st.x, p.z - st.z);
    st.x = p.x; st.z = p.z;
    if (d > 3) { st.acc = 0; return; } // teleport / respawn / ferry
    const grounded = p.alive && (p.state === 'free' || p.state === 'guard' || p.state === 'attack' || p.state === 'charge');
    st.speed += (d / dt - st.speed) * Math.min(1, dt * 10);
    if (!grounded || st.speed < 0.6) { st.acc = Math.min(st.acc, 0.5); return; }
    st.acc += d;
    const stride = strideFor(st.speed);
    if (st.acc >= stride) {
      st.acc -= stride; st.side = -st.side;
      const yaw = p.yaw, ox = Math.cos(yaw) * 0.14 * st.side, oz = -Math.sin(yaw) * 0.14 * st.side;
      this.fx.footstep({ x: p.x + ox, z: p.z + oz }, this.surfaceAt(p.x, p.z), st.speed);
    }
  }

  _enemySteps(dt) {
    if (!(dt > 0)) return;
    for (const e of this.g.enemies ?? []) this._enemyStep(e, dt);
    for (const e of this.g.practiceEnemies ?? []) this._enemyStep(e, dt);
  }
  _enemyStep(e, dt) {
    const g = this.g, p = g.player;
    if (!e.alive || e.state === 'pried') { this.enemySteps.delete(e.uid); return; }
    if (Math.abs(e.x - p.x) > 40 || Math.abs(e.z - p.z) > 40) return;
    let s = this.enemySteps.get(e.uid);
    if (!s) { s = { x: e.x, z: e.z, acc: 0 }; this.enemySteps.set(e.uid, s); return; }
    const d = Math.hypot(e.x - s.x, e.z - s.z); s.x = e.x; s.z = e.z;
    if (d > 3) return;
    s.acc += d;
    const stride = e.isBoss ? 1.7 : 1.0;
    if (s.acc < stride) return;
    s.acc -= stride;
    const surf = this.surfaceAt(e.x, e.z), speed = d / dt;
    if (e.isBoss) {
      this.fx.footstep({ x: e.x, z: e.z }, surf === 'dirt' ? 'mud' : surf, Math.max(7, speed), { sound: false });
      if (speed > 6) this.fx.impact({ x: e.x, y: 0.4, z: e.z }, null, { weight: 'light', surface: 'mud', sound: false, scale: 0.7 });
      if (Math.hypot(e.x - p.x, e.z - p.z) < 25) g.sfx.footstep?.('mud', Math.max(8, speed));
    } else if (e.def?.species_family === 'crab' || surf !== 'dirt') this.fx.footstep({ x: e.x, z: e.z }, surf, 3, { sound: false });
  }
}
