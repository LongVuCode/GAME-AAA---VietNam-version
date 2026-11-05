// gameplay03.js - Demo 0.3 gameplay glue owned by the Gameplay & Combat work (DEMO_0_3_DESIGN §2, §5, §6),
// kept out of game.js so game.js only carries one-line hooks. Covers:
//   - jump / landing / plunge feedback and the plunge shockwave (movement.jump, weapons[].air_moves_0_3)
//   - Weapon Arts hits, cooldown display (hud.setSkills / hud.setCooldown if the HUD has them)
//   - Phản nhịp (riposte_0_3) window + prompt, Ghì nanh QTE (tusk_lock_0_3, REAL-time rhythm like the pry)
//   - Hồi trống điện ảnh (drum_burst_cinematic_0_3 + weapons[].drum_burst_0_3): slow-mo, camera script,
//     beat shockwaves, enemies paused in radius, HUD hidden; honours acc_slowmo / acc_burst_camera_simple /
//     acc_camera_shake / acc_reduce_flash
//   - boss 0.3 arena: Sóng bùn ring, mud trails of the crossing charges, phase-2 water recedes and three
//     old trap stakes emerge (the beast rams them: physical, no magic)
//   - drops / XP when a normal enemy runs off (enemies[].drops, skills.xp_sources) via game.progress
//   - cinematic camera on the phase change, landing camera dip
// No display text is written here: every string goes through strings.json (i18n.t).
import * as THREE from 'three';
import { progressAdapter, skillsForWeapon, levelEntry, rollDrops } from '../logic/skills.js';
import { MudTrails, makeTuskLockJudge, canTuskLock } from '../logic/boss03.js';
import { hitStopFor } from '../logic/hitstop.js';
import { INPUT_GRACE_S } from '../logic/shackle.js';
import { PROTO } from '../logic/proto.js';

const RED_BRONZE = 0xc64e29; // reserved for unparryable telegraphs (the Mud Wave is one)
const SKILL_ICON = { sk_giao_cam_sao_vot: 'thrust', sk_giao_quet_song: 'spin', sk_riu_bo_don_cay: 'sweep', sk_riu_moc_thuyen: 'guard' };
const ARENA = { cx: 0, cz: -136, r: 18 };

export class Gameplay03 {
  constructor(game) {
    this.g = game;
    let flag = true;
    try { flag = new URLSearchParams(globalThis.location?.search ?? '').get('boss03') !== '0'; } catch { /* no location (tests) */ }
    this.boss03Enabled = flag;
    this.arenaCircle = ARENA;
    this.trails = new MudTrails(); this.trailMeshes = new Map();
    this.stakes = null; this.stakeMeshes = [];
    this.riposte = null; this.tusk = null; this.burst = null; this.drops = [];
    this.waveMeshes = new Map();
    this.stats = { jumps: 0, landings: 0, maxJumpY: 0, plunges: 0, plungeHits: 0, ripostes: 0, ripostesOpened: 0, tuskLocks: [], waveJumps: 0, waveDodges: 0, skills: {}, dropsSpawned: 0, dropsPicked: 0, bursts: 0, burstBeats: 0, burstShock: 0 };
    this._skillKey = '';
    this._recedeT = -1;
  }

  // ------------------------------------------------------------------ helpers
  get acc() { return this.g.settings.acc; }
  get progress() { const p = this.g.progress ?? null; if (this._progSrc !== p || !this._prog) { this._progSrc = p; this._prog = progressAdapter(p); } return this._prog; }
  get now() { return this.g.gameNow ?? 0; }
  get slowmoOn() { return this.acc.acc_slowmo !== false; }
  slowMo(scale, s) { if (this.slowmoOn) this.g.fx.slowMo(scale, s); }
  surface(x, z) { const s = this.g.fxh?.surfaceAt(x, z) ?? 'dirt'; return s === 'water' ? 'water' : s === 'mud' ? 'mud' : 'dirt'; }
  _dealt(hp, the) { const d = this.g.diff?.damageDealt ?? 1, m = this.g.mods ?? {}; return { hp: hp * d, the: the * (1 + (m.theMult ?? 0)) }; }
  _drumAdd(n) { const d = this.g.player.drum; d.points = Math.min(d.maxPoints, d.points + n); d.sinceActivity = 0; }
  /** One landed hit through the same feedback layers as a weapon swing. */
  _strike(e, dmg, weight, kind, fromX, fromZ, react = {}) {
    const g = this.g;
    const r = e.receiveHit(dmg, { weight, motion: { knockM: react.knockM ?? null }, fromX, fromZ });
    if (!r) return null;
    g._hitFeedback(e, weight, r, kind, dmg);
    g.onHitResult(e, r);
    return r;
  }
  _enemiesWithin(x, z, r) { return this.g.allEnemies().filter((e) => e.alive && e.state !== 'pried' && Math.hypot(e.x - x, e.z - z) - e.radius <= r); }

  // ------------------------------------------------------------------ per frame (game.update)
  update(dt, wallDt, input) {
    const g = this.g, p = g.player;
    if (this.tusk) this._updateTusk(wallDt, input);
    this.stats.maxJumpY = Math.max(this.stats.maxJumpY, p.y ?? 0);
    // Weapon Arts on the HUD (API from the HUD agent; checked before use).
    const hud = g.ui?.hudView;
    if (hud?.setSkills) {
      const slots = p.skillSlots();
      const key = `${p.weaponId}|${slots.map((s) => `${s.def.id}:${s.level}`).join(',')}`;
      if (key !== this._skillKey) {
        this._skillKey = key;
        hud.setSkills(slots.map((s, i) => ({ id: s.def.id, name: s.def.name, icon: SKILL_ICON[s.def.id], action: i === 0 ? 'skill_1' : 'skill_2', locked: s.level < 1 })));
      }
      if (hud.setCooldown) for (const s of slots) hud.setCooldown(s.def.id, s.level < 1 ? 1 : p.skillCd.ratio(s.def.id));
    }
    p.skillCd.tick(dt);
    // Mud trails expire (game time); meshes fade in their last 1.5 s.
    if (this.trails.tick(this.now)) for (const [t, m] of this.trailMeshes) if (!this.trails.list.includes(t)) { g.scene.remove(m); this.trailMeshes.delete(t); }
    for (const [t, m] of this.trailMeshes) m.material.opacity = 0.85 * Math.min(1, (t.until - this.now) / 1.5);
    this._updateStakes(wallDt);
    this._updateRecede(wallDt);
    this._updateDrops();
    if (this.burst) this._updateBurst();
    if (this.riposte && (this.now > this.riposte.until || this.riposte.e.state !== 'riposte_open')) this.riposte = null;
  }

  // ------------------------------------------------------------------ jump / landing / plunge
  onTakeoff(p) {
    const s = this.surface(p.x, p.z);
    this.stats.jumps += 1;
    // takeoff_vfx_by_surface: dust_puff / mud_spray / water_splash
    this.g.fx.dodgeBurst({ x: p.x, z: p.z }, { x: -Math.sin(p.yaw) * 0.2, z: -Math.cos(p.yaw) * 0.2 }, { surface: s === 'dirt' ? 'dirt' : s });
    this.g.fx.footstep({ x: p.x, z: p.z }, s, 7, { sound: true });
  }
  onLand(p, fallH, plunge) {
    const g = this.g, J = g.data.combat.movement.jump, L = J.landing ?? {}, s = this.surface(p.x, p.z);
    this.stats.landings += 1;
    // vfx_by_surface: dust_ring / mud_splat / water_crown + one sound per surface.
    g.fx.footstep({ x: p.x, z: p.z }, s, 9, { sound: true });
    if (fallH > 0.3 || plunge) g.fx.footstep({ x: p.x + 0.25, z: p.z }, s, 9, { sound: false });
    g.fx.rings.spawn(p.x, 0.06, p.z, { r0: 0.2, r1: 0.9 + fallH * 0.5, life: 0.4, color: new THREE.Color(s === 'water' ? 0x9fc2c0 : 0xd8c8a8), alpha: 0.35, thick: 0.2 });
    if (this.acc.acc_camera_shake) g.cam.pvy -= (L.camera_dip_m ?? 0.06) * 70 * Math.min(1.6, 0.5 + fallH * 0.5);
    g.input.rumble(L.rumble_strength ?? 0.15, 0.08);
  }
  plungeImpact(p, m) {
    const g = this.g, aa = g.data.combat.movement.jump.air_attacks ?? {};
    this.stats.plunges += 1;
    const shockR = m.shockwave_radius_m ?? 2.5, direct = m.range_m ?? 1.6;
    for (const e of this._enemiesWithin(p.x, p.z, shockR)) {
      const d = Math.hypot(e.x - p.x, e.z - p.z) - e.radius;
      const dmg = d <= direct ? this._dealt(m.damage, m.the_damage) : this._dealt(m.shockwave_damage ?? 0, m.shockwave_the_damage ?? 0);
      if (this._strike(e, dmg, 'heavy', 'air', p.x, p.z)) this.stats.plungeHits += 1;
    }
    this._drumAdd(aa.plunge_drum_gain ?? 15);
    const s = this.surface(p.x, p.z);
    g.fx.impact({ x: p.x, y: 0.2, z: p.z }, { x: 0, y: 1, z: 0 }, { weight: 'heavy', surface: s === 'water' ? 'water' : 'mud', ground: s === 'dirt' ? null : s, scale: 1.2 });
    g.fx.drumPulse({ x: p.x, z: p.z }, { strength: shockR / 2.2, color: 0x6b5a44 });
    g.fx.rings.spawn(p.x, 0.07, p.z, { r0: 0.4, r1: shockR, life: 0.35, color: new THREE.Color(0xe6d6b0), alpha: 0.7, thick: 0.3 });
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.fx.footstep({ x: p.x + Math.cos(a) * shockR * 0.7, z: p.z + Math.sin(a) * shockR * 0.7 }, s === 'dirt' ? 'mud' : s, 9, { sound: false }); }
    g.hitstop.trigger(hitStopFor(g.data.combat.hit_stop, 'heavy')); g.shake('heavy'); g.fx.fovKick(3, 0.2);
    g.input.rumble(0.7, 0.18);
  }

  // ------------------------------------------------------------------ Weapon Arts
  onSkillStart(p, k) {
    const g = this.g;
    this.stats.skills[k.id] = (this.stats.skills[k.id] ?? 0) + 1;
    g.sfx.whoosh?.(k.kind === 'cleave' ? 0.6 : 1.3, 'heavy');
    if (k.kind === 'vault' || k.kind === 'hook') g.fx.dodgeBurst({ x: p.x, z: p.z }, { x: Math.sin(p.yaw), z: Math.cos(p.yaw) }, { surface: this.surface(p.x, p.z) });
    if (k.kind === 'cleave') g.fxh?.chargeLevel(p, 1);
  }
  onSkillEnd() { /* cooldown already started by the player */ }
  /** Hit frame(s) of an Art. u: progress through the active window (sweeps). */
  skillStrike(p, k, u = 1) {
    const g = this.g, e0 = k.entry.effect ?? {}, drumMult = g.data.skills?.rules?.drum_gain_on_hit_mult ?? 0.5;
    let hits = 0;
    const hit = (e, hp, the, weight, extra) => {
      if (k.hit.has(e)) return null; k.hit.add(e);
      const r = this._strike(e, this._dealt(hp, the), weight, 'skill', p.x, p.z);
      if (r) { hits++; extra?.(e, r); }
      return r;
    };
    if (k.kind === 'vault') {
      const R = Math.max(1.8, e0.shockwave_radius_m ?? 0);
      for (const e of this._enemiesWithin(p.x, p.z, R)) hit(e, e0.damage ?? 32, e0.the_damage ?? 30, 'heavy');
      g.fx.impact({ x: p.x + Math.sin(p.yaw) * 0.8, y: 0.2, z: p.z + Math.cos(p.yaw) * 0.8 }, { x: 0, y: 1, z: 0 }, { weight: 'heavy', surface: 'mud', ground: 'mud' });
      if (e0.shockwave_radius_m) g.fx.rings.spawn(p.x, 0.07, p.z, { r0: 0.3, r1: e0.shockwave_radius_m, life: 0.35, color: new THREE.Color(0xd8c8a8), alpha: 0.6, thick: 0.3 });
      g.shake('heavy');
    } else if (k.kind === 'sweep') {
      const R = k.second ? (e0.radius_m ?? 3) : (e0.radius_m ?? 3);
      const the = k.second ? (e0.second_sweep_the_damage ?? 25) : (e0.the_damage ?? 20);
      for (const e of this._enemiesWithin(p.x, p.z, R)) {
        hit(e, e0.damage ?? 14, the, 'medium', (en) => {
          const dx = en.x - p.x, dz = en.z - p.z, l = Math.hypot(dx, dz) || 1, push = e0.push_m ?? 1.5;
          if (!en.isBoss) { en.knock = { vx: dx / l * push / 0.18, vz: dz / l * push / 0.18, t: 0.18 }; en.interruptWindup?.(); if (e0.stun_normal_s) en.flinchT = Math.max(en.flinchT, e0.stun_normal_s); }
        });
      }
      if (u <= 0.35 && !k._fx) { k._fx = true; g.fx.rings.spawn(p.x, 0.08, p.z, { r0: 0.5, r1: R, life: 0.35, color: new THREE.Color(0x9fc2c0), alpha: 0.6, thick: 0.25 });
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.fx.footstep({ x: p.x + Math.cos(a) * R * 0.8, z: p.z + Math.sin(a) * R * 0.8 }, 'water', 8, { sound: false }); } }
    } else if (k.kind === 'cleave') {
      for (const e of g._targetsInReach(k.range ?? 2.6, k.arc ?? 60)) {
        hit(e, e0.damage ?? 70, e0.the_damage ?? 80, 'heavy', (en, r) => {
          if (r.broke && e0.on_the_break_drum_refund) { this._drumAdd(e0.on_the_break_drum_refund); k.cutCd = e0.on_the_break_cooldown_cut_s ?? 0; }
        });
      }
      if (!k._fx) { k._fx = true; g.fx.impact({ x: p.x + Math.sin(p.yaw) * 1.8, y: 0.15, z: p.z + Math.cos(p.yaw) * 1.8 }, { x: 0, y: 1, z: 0 }, { weight: 'heavy', surface: 'dirt', ground: this.surface(p.x, p.z) === 'dirt' ? null : 'mud' }); }
    } else if (k.kind === 'hook') {
      const targets = g._targetsInReach(2.2, 120).slice(0, e0.targets ?? 1);
      for (const e of targets) {
        hit(e, e0.damage ?? 12, e0.the_damage ?? 15, 'medium', (en) => {
          if (en.isBoss || en.radius >= 1.2) {
            // vs_large: pull_self_to_flank — Cói swings around to the beast's side.
            const sx = Math.cos(en.yaw), sz = -Math.sin(en.yaw), side = ((p.x - en.x) * sx + (p.z - en.z) * sz) >= 0 ? 1 : -1;
            const tx = en.x + sx * side * (en.radius + 1.1), tz = en.z + sz * side * (en.radius + 1.1);
            const m = g.walk.move(p.x, p.z, tx - p.x, tz - p.z, PROTO.playerRadiusM); p.x = m.x; p.z = m.z; p.yaw = Math.atan2(en.x - p.x, en.z - p.z);
          } else {
            en.yaw += Math.PI; en.exposedUntil = this.now + (e0.exposed_s ?? 1); en.exposedMult = e0.exposed_side_the_mult ?? 1.3; // spun around, flank exposed
          }
        });
      }
    }
    if (hits) this._drumAdd((g.data.combat.drum_rhythm.gain.heavy_hit ?? 0) * drumMult);
  }

  // ------------------------------------------------------------------ Phản nhịp (riposte_0_3)
  onPerfectParry(enemy, atk) {
    const rp = this.g.data.combat.riposte_0_3; if (!rp || !enemy.v03) return;
    if (!(atk?._combo?.riposte || atk?.id === 'll_dam_cham')) return;
    const key = enemy.combo ?? atk; // max_per_combo
    if (this._ripKey === key) return;
    this._ripKey = key;
    enemy.openForRiposte(rp.enemy_open_s ?? 1.0);
    this.riposte = { e: enemy, until: this.now + (rp.window_s ?? 0.6) };
    this.stats.ripostesOpened += 1;
    this.g.fx.drumPulse({ x: enemy.x, z: enemy.z }, { strength: 0.6 });
  }
  riposteHit(p, e) {
    const g = this.g, rp = g.data.combat.riposte_0_3;
    this.stats.ripostes += 1;
    const r = this._strike(e, this._dealt(rp.damage ?? 30, rp.the_damage ?? 70), 'heavy', 'riposte', p.x, p.z);
    this._drumAdd(rp.drum_gain ?? 40);
    g.sfx.drum(true);
    this.slowMo(rp.time_scale ?? 0.3, rp.slowmo_s ?? 0.2);
    return r;
  }

  // ------------------------------------------------------------------ interactions (priority: Phản nhịp > finisher > pry > Ghì nanh)
  /** Called at the top of game.updateInteractions; returns true when it owns the prompt this frame. */
  interactions(dt, input) {
    const g = this.g, p = g.player, T = g.i18n.t;
    if (this.tusk) { g.ui.prompt(null); return true; }
    if (this.riposte) {
      g.ui.prompt(`${g.kbd('interact')} ${g.ui.esc(T('prompt_counter_beat'))}`);
      if (input.pressed('interact') && ['free', 'guard', 'parry', 'attack'].includes(p.state)) { const e = this.riposte.e; this.riposte = null; p.startRiposte(e); }
      return true;
    }
    const b = g.boss;
    const tl = b?.enc?.phase?.phase2_0_3?.tusk_lock_0_3 ?? b?.def?.phases?.[1]?.phase2_0_3?.tusk_lock_0_3;
    if (b?.v03 && tl && !b.staggered && !b.enc.canFinish()) {
      const dist = Math.hypot(b.x - p.x, b.z - p.z) - b.radius;
      if (canTuskLock(tl, { bossState: b.stakeStunT > 0 ? b.state : 'none', dist, used: b.tuskLockUsed })) {
        g.ui.prompt(`${g.kbd('interact')} ${g.ui.esc(T('prompt_pin_tusk'))}`);
        if (input.pressed('interact') && (p.state === 'free' || p.state === 'guard')) this.startTuskLock(b, tl);
        return true;
      }
    }
    return false;
  }

  // ------------------------------------------------------------------ Ghì nanh (tusk_lock_0_3)
  startTuskLock(boss, tl) {
    const g = this.g, p = g.player, acc = this.acc;
    const auto = (tl.accessibility?.auto_success_in ?? []).includes(g.diff.id) || !!g.diff.pryAuto;
    const judge = makeTuskLockJudge(g.data.combat.pry, tl, { windowAddS: g.mods?.pryWindowAddS ?? 0, holdMode: !!acc.acc_hold_instead_of_tap && tl.accessibility?.hold_option !== false, auto });
    boss.tuskLockUsed += 1; boss._setState('tusk_lock');
    g.locked = true; g.lockTarget = boss;
    const fx = Math.sin(boss.yaw), fz = Math.cos(boss.yaw);
    p.x = boss.x + fx * 2.4 + fz * 1.0; p.z = boss.z + fz * 2.4 - fx * 1.0;
    p.yaw = Math.atan2(boss.x + fx * 1.8 - p.x, boss.z + fz * 1.8 - p.z);
    p.state = 'tusk_lock'; p.stateT = 0; p.cur = null; p.pryBeats = 0;
    const T = g.i18n.t;
    this.tusk = { boss, judge, tl, msg: T(judge.auto ? 'pry_auto' : judge.holdMode ? 'pry_hint_hold' : 'pry_hint', { key: g.glyphText('interact') }), t: 0 };
    g.ui.center(T('prompt_pin_tusk'), 1.4);
    g.sfx.telegraph('boar_pain', 'nodamage', 0);
  }
  _updateTusk(realDt, i) {
    const g = this.g, tk = this.tusk, { judge, boss } = tk, p = g.player, T = g.i18n.t;
    const events = [];
    // Same contract as the pry: real time, judged at the key event timestamp (frame-rate independent).
    if (i.pressed('interact') && !judge.holdMode && !judge.auto) {
      const lag = Math.max(-INPUT_GRACE_S, Math.min(realDt, (i.pressedAt('interact') - g.frameStart) / 1000));
      if (lag <= 0) events.push(...judge.press(lag), ...judge.tick(realDt));
      else events.push(...judge.tick(lag), ...judge.press(0), ...judge.tick(realDt - lag));
    } else { judge.setHeld(i.isDown('interact')); events.push(...judge.tick(realDt)); }
    for (const ev of events) {
      if (ev.type === 'drum') { g.sfx.drum(true); g.fxh?.pryDrum(boss); }
      if (ev.type === 'hit') { g.hitstop.trigger(hitStopFor(g.data.combat.hit_stop, 'pry_beat')); p.pryBeats = ev.beat; p.anim.pryBeat(); g.shake('medium'); g.input.rumble(0.6, 0.1); tk.msg = T('pry_beat_hit'); g.fx.impact({ x: boss.x + Math.sin(boss.yaw) * 2.2, y: 0.2, z: boss.z + Math.cos(boss.yaw) * 2.2 }, { x: 0, y: 1, z: 0 }, { weight: 'medium', surface: 'mud', ground: 'mud', sound: false }); }
      if (ev.type === 'miss') { g.sfx.miss(); tk.msg = T('pry_beat_miss'); }
      if (ev.type !== 'drum') this.stats.tuskLocks.push({ ...ev, t: +judge.t.toFixed(3) });
    }
    const slotFrac = judge.holdMode ? 0 : Math.max(0, Math.min(1, judge.timeToSlot / judge.interval));
    g.ui.pryWidget({ beats: judge.beats, hit: judge.beat, slotFrac, hold: judge.holdMode, holdProgress: judge.holdProgress / judge.holdDuration, msg: tk.msg });
    if (!judge.done) return;
    g.ui.pryWidget(null);
    this.tusk = null; g.locked = false; p.state = 'free'; p.pryBeats = 0;
    boss._setState('chase'); boss.stakeStunT = 0;
    const tl = tk.tl;
    if (judge.result === 'freed') {
      // on_success: forces the Thế break (counts as a crack) + drum_gain.
      const r = boss.enc.receiveHit({ the: boss.posture.max * 3 });
      if (r.broke) boss._cancelAttack();
      g.onHitResult(boss, r);
      this._drumAdd(tl.on_success?.drum_gain ?? 50);
      this.stats.tuskLocks.push({ type: 'success' });
    } else {
      const f = tl.on_fail ?? {};
      p.takeHit({ hp: f.player_damage ?? 10, the: 0 }, false, 'hit', { fromX: boss.x, fromZ: boss.z, knockM: 0 });
      p.push(boss.x, boss.z, f.player_knockback_m ?? 2.5);
      this.stats.tuskLocks.push({ type: 'fail' });
    }
  }

  // ------------------------------------------------------------------ Hồi trống điện ảnh
  get burstInvulnerable() { return !!this.burst && this.g.data.combat.drum_burst_cinematic_0_3?.player_invulnerable !== false; }
  onBurstStart(p) {
    const g = this.g, cin = g.data.combat.drum_burst_cinematic_0_3 ?? {}, w = p.weapon;
    this.stats.bursts += 1;
    this.burst = { t0: this.now, weapon: w, beat: 0, cfg: w.drum_burst_0_3 ?? {}, cin };
    this.slowMo(cin.intro_world_time_scale ?? 0.2, cin.intro_s ?? 0.45);
    for (const e of this._enemiesWithin(p.x, p.z, cin.enemies_paused_in_radius_m ?? 8)) e.burstPaused = true;
    if (cin.hud_hidden !== false) g.ui.showHud(false);
    g.fx.setFovOffset('burst', 0);
  }
  onBurstBeat(p, beat, last, directTargets) {
    const g = this.g, b = this.burst; if (!b) return;
    this.stats.burstBeats += 1; b.beat = beat;
    const cfg = b.cfg, sw = cfg.shockwave_per_hit ?? {}, burst = b.weapon.drum_burst;
    const r1 = last ? (cfg.final_hit?.radius_m ?? 6) : (sw.end_radius_m ?? 4);
    const share = b.cin.shockwave_damage_share ?? 0.25;
    directTargets = directTargets ?? g._targetsInReach(Math.max(...b.weapon.moves.filter((m) => m.input === 'L').map((m) => m.range_m)), 90);
    const per = { hp: (burst.damage_total / burst.hits) * share, the: (burst.the_damage_total / burst.hits) * share };
    for (const e of this._enemiesWithin(p.x, p.z, r1)) {
      if (directTargets?.includes(e)) continue;
      if (this._strike(e, this._dealt(per.hp, per.the), last ? 'heavy' : 'medium', 'burst', p.x, p.z)) this.stats.burstShock += 1;
    }
    const col = new THREE.Color(last ? 0xf0d9a0 : 0xd8c39a).multiplyScalar(1.3);
    g.fx.rings.spawn(p.x, 0.08, p.z, { r0: sw.start_radius_m ?? 1, r1, life: (sw.expand_s ?? 0.3) * 1.6, color: col, alpha: 1, thick: 0.55 });
    g.fx.rings.spawn(p.x, 0.1, p.z, { r0: (sw.start_radius_m ?? 1) * 0.6, r1: r1 * 0.8, life: (sw.expand_s ?? 0.3) * 1.3, color: col, alpha: 0.7, thick: 0.3, delay: 0.05 });
    g.fx.rings.spawn(p.x, 1.0, p.z, { r0: 0.4, r1: r1 * 0.45, life: 0.25, color: col, alpha: 0.5, thick: 0.2, billboard: true });
    g.fx.drumPulse({ x: p.x, z: p.z }, { strength: last ? 2.2 : 1.1 });
    for (let k = 0; k < (last ? 14 : 6); k++) { const a = (k / (last ? 14 : 6)) * Math.PI * 2; g.fx.footstep({ x: p.x + Math.cos(a) * r1 * 0.75, z: p.z + Math.sin(a) * r1 * 0.75 }, this.surface(p.x, p.z) === 'water' ? 'water' : 'mud', 9, { sound: false }); }
    g.shake(last ? 'heavy' : 'medium');
    if (last) {
      const kb = cfg.final_hit?.knockback_normal_m ?? 2;
      for (const e of this._enemiesWithin(p.x, p.z, r1)) if (!e.isBoss) { const dx = e.x - p.x, dz = e.z - p.z, l = Math.hypot(dx, dz) || 1; e.knock = { vx: dx / l * kb / 0.25, vz: dz / l * kb / 0.25, t: 0.25 }; }
      this.slowMo(b.cin.final_hit_time_scale ?? 0.2, b.cin.final_hit_slowmo_s ?? 0.45);
      g.fx.fovKick(b.cin.final_hit_fov_kick_deg ?? 6, 0.45);
      g.fx.screenFlash(0.35); // muted by acc_reduce_flash inside fx
      g.input.rumble(0.9, 0.3);
    }
  }
  onBurstEnd() {
    if (!this.burst) return;
    this.burst = null;
    for (const e of this.g.allEnemies()) e.burstPaused = false;
    this.g.fx.setFovOffset('burst', 0);
    if (this.g.mode === 'playing' && !this.g.pry) this.g.ui.showHud(true);
  }
  _updateBurst() { if (this.g.player.state !== 'burst') this.onBurstEnd(); }

  // ------------------------------------------------------------------ camera (game.updateCamera)
  /** Adjusts the wanted distance / orbit (and pitch, FOV) for scripted shots. */
  cameraShot(want, orbit, dt) {
    const g = this.g, c = g.cam, p = g.player, simple = !!this.acc.acc_burst_camera_simple;
    const ease = (target, k) => { c.pitch += (target - c.pitch) * Math.min(1, dt * k); };
    if (this.burst && !simple) {
      const t = this.now - this.burst.t0, script = this.burst.cfg.camera_script ?? [];
      let shot = null; for (const s of script) if (t >= s.at_s) shot = s;
      const fov0 = g.data.combat.feel?.fov_base_deg ?? 60;
      const front = (s0) => (s0?.shot === 'low_front_orbit' ? Math.PI - (s0.orbit_deg * Math.PI) / 180 : ((90 + (s0?.orbit_deg ?? 40)) * Math.PI) / 180); // in front of / beside the face
      if (shot?.shot === 'low_front_orbit' || shot?.shot === 'low_side_orbit') { want = shot.distance_m; orbit = front(shot); ease(0.12, 4); g.fx.setFovOffset('burst', (shot.fov_deg ?? fov0) - fov0); }
      else if (shot?.shot === 'push_per_beat') { const first = script[0]; want = Math.max(2.2, (first?.distance_m ?? 3.2) - shot.push_m * this.burst.beat); orbit = front(first); ease(0.15, 4); }
      else if (shot?.shot === 'pull_back_high' || shot?.shot === 'top_down_ring') { want = shot.distance_m; orbit = 0.3; ease(shot.shot === 'top_down_ring' ? 0.95 : 0.7, 3); g.fx.setFovOffset('burst', (shot.fov_deg ?? fov0) - fov0); }
      else if (shot?.shot === 'return') g.fx.setFovOffset('burst', 0);
      return { want, orbit };
    }
    if (p.state === 'riposte') { const rp = g.data.combat.riposte_0_3 ?? {}; return { want: rp.camera_distance_m ?? 4.2, orbit: ((rp.camera_orbit_deg ?? 25) * Math.PI) / 180 }; }
    if (this.tusk) { ease(0.2, 3); return { want: 4.6, orbit: (70 * Math.PI) / 180 }; } // low_side_two_shot
    const b = g.boss;
    if (b?.v03 && b.state === 'transition' && !simple) {
      // Cinematic orbit on the phase change: low, from the side, slowly circling the set piece.
      const u = Math.min(1, b.stateT / 4);
      ease(0.22, 2.5);
      return { want: 9.5, orbit: (35 + 50 * u) * Math.PI / 180 };
    }
    return { want, orbit };
  }

  // ------------------------------------------------------------------ boss arena (0.3)
  trailAt(x, z) { return this.boss03Enabled && this.trails.list.length ? this.trails.at(x, z) : null; }
  addTrail(seg, spec) {
    const t = this.trails.add(seg, spec, this.now);
    const len = Math.hypot(seg.bx - seg.ax, seg.bz - seg.az); if (len < 0.5) return;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(t.w, len), new THREE.MeshLambertMaterial({ color: 0x2f2419, transparent: true, opacity: 0.85, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(seg.bx - seg.ax, seg.bz - seg.az) + Math.PI; m.position.set((seg.ax + seg.bx) / 2, 0.035, (seg.az + seg.bz) / 2);
    m.renderOrder = 2; this.g.scene.add(m); this.trailMeshes.set(t, m);
    for (const [tt, mm] of this.trailMeshes) if (!this.trails.list.includes(tt)) { this.g.scene.remove(mm); this.trailMeshes.delete(tt); }
  }
  stakeNear(x, z, r) { return this.stakes?.find((s) => !s.broken && s.risen && Math.hypot(s.x - x, s.z - z) <= r) ?? null; }
  onBossTransition(boss, ev) {
    if (!boss.v03) return;
    const ac = boss.def.phases[1]?.phase2_0_3?.arena_change_0_3;
    if (ev === 'start') this.g.fx.setMood?.('boss_p2');
    if (ev === 'stand' && ac) { this._emergeStakes(ac); this._startRecede(ac.water_recedes); }
  }
  _emergeStakes(ac) {
    if (this.stakes) return;
    const r = ac.stake_rules?.radius_m ?? 0.35;
    this.stakes = ac.stakes_emerge.map((s) => ({ id: s.id, x: s.x, z: s.z, radius: r, broken: false, risen: false }));
    this.stakeMeshes = this.stakes.map((s) => {
      const gr = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, 1.7, 7), new THREE.MeshLambertMaterial({ color: 0x6f5c40 }));
      post.position.y = 0.85; post.castShadow = true; gr.add(post);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 0.7, 0.4, 7), new THREE.MeshLambertMaterial({ color: 0x5c4a34 })); tip.position.y = 1.9; gr.add(tip);
      const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.95, 0.05, 5, 12), new THREE.MeshLambertMaterial({ color: 0x8a7a56 })); band.rotation.x = Math.PI / 2; band.position.y = 0.9; gr.add(band); // rotten rattan lashing
      gr.position.set(s.x, -1.9, s.z); this.g.scene.add(gr);
      return { s, gr, post, tip, t: 0 };
    });
    this.g.sfx.impact?.('heavy', 'mud');
  }
  _updateStakes(wallDt) {
    for (const m of this.stakeMeshes) {
      m.t += wallDt;
      if (!m.s.broken) { const u = Math.min(1, m.t / 1.5); m.gr.position.y = -1.9 * (1 - u * u * (3 - 2 * u)); if (u >= 1 && !m.s.risen) { m.s.risen = true; this.g.fx.footstep({ x: m.s.x, z: m.s.z }, 'mud', 9, { sound: false }); } }
      else if (m.fall < 1) { m.fall = Math.min(1, (m.fall ?? 0) + wallDt * 3); m.tip.position.set(0.6 * m.fall, 1.9 - 1.6 * m.fall, 0); m.tip.rotation.z = -1.3 * m.fall; m.post.scale.y = 1 - 0.5 * m.fall; m.post.position.y = 0.85 * m.post.scale.y; }
    }
  }
  onStakeHit(boss, stake) {
    const g = this.g, m = this.stakeMeshes.find((x) => x.s === stake); if (m) m.fall = 0;
    g.fxh?.stakeHit(boss, { x: stake.x, y: 1, z: stake.z });
    g.sfx.impact?.('heavy', 'wood'); g.hitstop.trigger(hitStopFor(g.data.combat.hit_stop, 'heavy')); g.shake('heavy'); g.input.rumble(0.8, 0.25);
    g.sfx.telegraph('boar_pain', 'nodamage', 0);
  }
  _startRecede(wr) {
    if (!wr || this._recedeT >= 0) return;
    this._recedeT = 0; this._recede = wr;
    const scene = this.g.scene, pools = this.g.walk.mudPools;
    this._pools = pools.map((pl) => ({ pl, r0: pl.r, mesh: scene.children.find((o) => o.isMesh && o.geometry?.type === 'CircleGeometry' && Math.abs(o.position.x - pl.cx) < 0.05 && Math.abs(o.position.z - pl.cz) < 0.05 && o.position.y < 0.05 && o.position.y > 0.01), s0: null }));
    for (const p of this._pools) if (p.mesh) p.s0 = p.mesh.scale.x;
  }
  _updateRecede(wallDt) {
    if (this._recedeT < 0 || !this._pools) return;
    this._recedeT += wallDt;
    const wr = this._recede, u = Math.min(1, this._recedeT / (wr.over_s ?? 6)), k = 1 - (1 - (wr.mud_pool_radius_mult ?? 0.6)) * u;
    for (const p of this._pools) { p.pl.r = p.r0 * k; if (p.mesh) p.mesh.scale.setScalar(p.s0 * k); }
    if (u >= 1) this._recedeT = -2;
  }
  /** Sóng bùn ring (game time): info { x, z, r, thick, u } or null to hide. */
  ringWave(e, info) {
    let m = this.waveMeshes.get(e);
    if (!info) { if (m) m.visible = false; return; }
    if (!m) {
      m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 72), new THREE.MeshBasicMaterial({ color: RED_BRONZE, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.renderOrder = 11; this.g.scene.add(m); this.waveMeshes.set(e, m);
    }
    m.visible = true; m.position.set(info.x, 0.09, info.z); m.scale.setScalar(Math.max(0.2, info.r + info.thick / 2));
    m.material.opacity = 0.85 * (1 - info.u * 0.5);
    if ((this._waveFx = (this._waveFx ?? 0) + 1) % 3 === 0) {
      for (let k = 0; k < 6; k++) { const a = Math.random() * Math.PI * 2; this.g.fx.footstep({ x: info.x + Math.cos(a) * info.r, z: info.z + Math.sin(a) * info.r }, 'mud', 9, { sound: false }); }
    }
  }
  onWaveStart(e) { const g = this.g; g.sfx.impact?.('heavy', 'mud'); g.fx.cameraShake(0.12, 0.5); g.fx.drumPulse({ x: e.x, z: e.z }, { strength: 0.8, color: 0x47392a }); g.input.rumble(0.5, 0.4); }
  onWaveAvoided(e, how) { if (how === 'jump') this.stats.waveJumps += 1; else this.stats.waveDodges += 1; }
  onSecondPass(e, atk) { this.g.onTelegraph(e, atk, 'unparryable', 'boar_roar'); this.g.fx.footstep({ x: e.x, z: e.z }, 'mud', 9, { sound: false }); }
  resetArena() {
    const g = this.g;
    for (const m of this.trailMeshes.values()) g.scene.remove(m);
    this.trailMeshes.clear(); this.trails.clear();
    for (const m of this.stakeMeshes) g.scene.remove(m.gr);
    this.stakeMeshes = []; this.stakes = null;
    if (this._pools) for (const p of this._pools) { p.pl.r = p.r0; if (p.mesh) p.mesh.scale.setScalar(p.s0); }
    this._pools = null; this._recedeT = -1;
    for (const m of this.waveMeshes.values()) m.visible = false;
    this.riposte = null; this._ripKey = null;
    if (this.tusk) { g.ui.pryWidget(null); this.tusk = null; g.locked = false; }
  }

  // ------------------------------------------------------------------ dodge tracking, perfect dodge bonus
  onPlayerDodge(p, dodge) {
    this.g.boss?.punish?.noteDodge(this.now);
    if (dodge?.kind === 'sprint_roll' && dodge.local === 'fwd') this.g.fx.footstep({ x: p.x, z: p.z }, this.surface(p.x, p.z), 9, { sound: true });
  }
  /** dodge_cancel_0_3.perfect_dodge_after_cancel_drum_bonus. */
  onPerfectDodge(p) {
    if (p.dodgeCancel) this._drumAdd(this.g.data.combat.dodge_cancel_0_3?.perfect_dodge_after_cancel_drum_bonus ?? 10);
  }

  // ------------------------------------------------------------------ drops (enemies[].drops) + XP
  /** XP + drops for a normal enemy driven off: exactly once per enemy and per defeat (ui03 skips when gp exists). */
  onEnemyDefeated(e) {
    if (e.isBoss || e.practice) return;
    if (e._rewarded) return; e._rewarded = true; // cleared by Enemy.reset (respawn = a new defeat)
    const g = this.g;
    const prog = this.progress;
    const xp = prog.awardEnemy(g.data.skills, e.def.id); // the XP notice comes from progress.onChange (ui03)
    this.stats.xpAwarded = (this.stats.xpAwarded ?? 0) + xp;
    for (const d of rollDrops(e.def.drops, g.rng)) {
      // Dropped where the creature ran off / sank: village goods or tin, never a body part (SB-05).
      const mesh = new THREE.Group();
      const bundle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.24), new THREE.MeshLambertMaterial({ color: d.item.startsWith('mat_thiec') ? 0x9a9a8e : 0xb59a62 }));
      bundle.position.y = 0.12; mesh.add(bundle);
      const ox = (this.drops.length % 3 - 1) * 0.5;
      mesh.position.set(e.x + ox, 0, e.z); g.scene.add(mesh);
      this.drops.push({ ...d, x: e.x + ox, z: e.z, mesh, t: 0 });
      this.stats.dropsSpawned += 1;
    }
  }
  /** Boss freed by the pry: skills.xp_sources boss_freed, once per fight. */
  onBossFreed(boss) {
    if (boss._rewarded) return 0; boss._rewarded = true;
    const g = this.g, xp = this.progress.awardEnemy(g.data.skills, boss.def.id);
    this.stats.xpAwarded = (this.stats.xpAwarded ?? 0) + xp;
    return xp;
  }
  _updateDrops() {
    const g = this.g, p = g.player;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.t += 0.016; d.mesh.rotation.y += 0.02; d.mesh.position.y = 0.05 * Math.sin(d.t * 3);
      if (Math.hypot(p.x - d.x, p.z - d.z) > 1.4 || g.locked) continue;
      g.scene.remove(d.mesh); this.drops.splice(i, 1); this.stats.dropsPicked += 1;
      const prog = this.progress;
      if (g.ui03?.grant) g.ui03.grant(d.item, d.count); // stack limits + pickup notice (ui/inventory)
      else if (prog.addItem) { prog.addItem(d.item, d.count); const it = g.data.items.items.find((x) => x.id === d.item); g.sfx.pickup(); if (it) g.ui.pickup(g.i18n.t('msg_got_item', { name: g.loc(it.name), n: d.count })); }
      else if (g.data.items.items.some((x) => x.id === d.item)) g.give(d.item, d.count);
    }
  }

  // ------------------------------------------------------------------ debug (?debug=1)
  /** Test-only: make the boss start a chain or an attack now (the AI choice itself is covered by the
   *  unit tests and test/bossbench.mjs). kind: 'combo' | 'attack'. */
  forceBoss(kind, id) {
    const b = this.g.boss; if (!b?.v03 || !b.alive || b.staggered) return false;
    b.idleT = 0; b._hideDecals(); b.attack = null;
    if (kind === 'combo') { const c = b.def.combos_0_3.find((x) => x.id === id); if (!c) return false; b.combo = { def: c, index: 0 }; b.stats03.combos.push(id); b._startStep03(); return true; }
    const a = b.attacks.find((x) => x.id === id); if (!a) return false;
    b._startSingle03(a); return true;
  }
  debug() {
    const g = this.g, b = g.boss, p = g.player;
    return {
      boss03: this.boss03Enabled, stats: { ...this.stats, tuskLocks: this.stats.tuskLocks.slice(-6) },
      player: { y: p.y, state: p.state, airLightUsed: p.airLightUsed, skill: p.skill?.id ?? null, cooldowns: Object.fromEntries([...p.skillCd.left]) },
      boss: b ? { state: b.state, attack: b.attack?.id ?? null, combo: b.combo?.def.id ?? null, comboStep: b.combo?.index ?? null, idleT: b.idleT, stats: b.stats03, stakeStunT: b.stakeStunT, tuskLockUsed: b.tuskLockUsed, phase: b.enc.phase.id } : null,
      stakes: this.stakes?.map((s) => ({ id: s.id, broken: s.broken, risen: s.risen })) ?? null, trails: this.trails.list.length,
      riposte: !!this.riposte, tusk: this.tusk ? { beat: this.tusk.judge.beat, timeToSlot: this.tusk.judge.timeToSlot, slotAtMs: g.lastNow + this.tusk.judge.timeToSlot * 1000, window: this.tusk.judge.window } : null,
      burst: !!this.burst, drops: this.drops.length, pools: g.walk.mudPools.map((m) => +m.r.toFixed(2)),
    };
  }
}

export { levelEntry, skillsForWeapon };
