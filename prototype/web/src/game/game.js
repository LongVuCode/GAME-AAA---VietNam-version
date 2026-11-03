// game.js - orchestration: loop, camera, flow (title → Cói's lifetime → handoff → Bương → end),
// combat resolution between actors, interactions, secrets, crafting, codex, pry sequence.
import * as THREE from 'three';
import { createI18n } from '../logic/i18n.js';
import { resolveDifficulty } from '../logic/difficulty.js';
import { HitStopClock, hitStopFor, shakeFor } from '../logic/hitstop.js';
import { AttackTokens } from '../logic/enemyAi.js';
import { Outcome } from '../logic/defense.js';
import { enemyHitDamage, parryTheDamage, playerHitDamage, burstHitDamage } from '../logic/damage.js';
import { pickLockTarget, shouldBreakLock, softAimTarget, angleBetween } from '../logic/lockon.js';
import { SecretChain } from '../logic/secrets.js';
import { INPUT_GRACE_S } from '../logic/shackle.js';
import { Inventory, craft, missingFor, baoKhiEffect } from '../logic/crafting.js';
import { newGeneration, handoff, handoffWarnings, skillPointsFor, eraTags, forbiddenHits } from '../logic/lineage.js';
import { PROTO } from '../logic/proto.js';
import { buildWorld, Walkable, POINTS, SPAWNS, zoneAt, HUB_X, mulberry32 } from './world.js';
import { Enemy, normAngle } from './enemy.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { UI } from './ui.js';
import { makeHumanoid, makeTusk } from './meshes.js';

const SETTINGS_KEY = 'ngb_demo01_settings_v1';
const START_CODEX = ['cx_ben_lau', 'cx_mui_sao', 'cx_bronze_weapons', 'cx_ho_tinh'];
const FREED_FLAG = 'flag_boss_lon_loi_freed';
// Screen marker height above each enemy (m), graybox presentation only.
const MARKER_H = { en_cua_cang_bun: 1.5, en_bo_ngua_lau: 2.2, en_u_bun: 2.8, boss_lon_loi_dam: 3.4 };

export class Game {
  constructor(container, data, opts) {
    this.container = container; this.data = data; this.opts = opts; this.buildId = opts.buildId;
    this.settings = this.loadSettings();
    this.i18n = createI18n(data.strings, this.settings.lang);
    this.rng = mulberry32(1234);
    this.timers = []; this.mode = 'boot'; this.playTime = 0; this.fpsFrames = []; this.fpsAvg = null;
  }

  // ------------------------------------------------------------------ settings
  loadSettings() {
    const acc = Object.fromEntries(this.data.combat.accessibility.options.filter((o) => 'default' in o).map((o) => [o.id, o.default]));
    acc.acc_camera_shake = this.data.combat.camera_shake.enabled_default && acc.acc_camera_shake;
    const def = { lang: 'vi', difficulty: this.data.combat.difficulty.default, custom: {}, acc, showFps: false, hints: true, volume: 0.7, sens: 1 };
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
      if (s) return { ...def, ...s, acc: { ...acc, ...(s.acc ?? {}) }, custom: { ...(s.custom ?? {}) } };
    } catch { /* storage unavailable */ }
    return def;
  }
  saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* ignore */ } }
  updateSettings(patch) {
    const s = this.settings;
    if (patch.acc) { Object.assign(s.acc, patch.acc); delete patch.acc; }
    if (patch.custom) {
      if (s.difficulty !== 'custom') { s.custom = this._customFromDiff(); s.difficulty = 'custom'; }
      Object.assign(s.custom, patch.custom); delete patch.custom;
    }
    if (patch.difficulty === 'custom' && s.difficulty !== 'custom') s.custom = this._customFromDiff();
    Object.assign(s, patch);
    this.applySettings(); this.saveSettings();
  }
  _customFromDiff() {
    const d = this.diff;
    return { parry_window_s: d.parryWindowS, damage_taken_mult: d.damageTaken, enemy_speed_mult: d.enemySpeed, telegraph_time_mult: d.telegraphMult, pry_auto: d.pryAuto, aim_assist: d.aimAssist };
  }
  applySettings() {
    const s = this.settings;
    this.diff = resolveDifficulty(this.data.combat, s.difficulty === 'custom' ? this.data.combat.difficulty.default : s.difficulty, s.difficulty === 'custom' ? s.custom : null);
    if (s.difficulty === 'custom') this.diff.id = 'custom';
    this.player?.defense.setParryWindow(this.diff.parryWindowS);
    this.sfx?.setVolume(s.volume);
    if (this.sfx) this.sfx.directional = !!s.acc.acc_attack_audio_cue;
    if (this.secret) this.secret.hintsEnabled = !!s.hints;
    this.ui?.applySettings(s);
  }
  setLang(l) { this.settings.lang = l; this.i18n.setLang(l); this.saveSettings(); if (this.mode !== 'title' && this.player) this.updateHud(); }

  // ------------------------------------------------------------------ boot
  boot() {
    this.renderer = null;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      this.container.innerHTML = `<div class="screen solid"><div class="panel"><p>${this.i18n.t('webgl_error')}</p></div></div>`;
      return;
    }
    const r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.container.appendChild(r.domElement);
    try {
      const gl = r.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info');
      this.glInfo = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    } catch { this.glInfo = '?'; }
    const w = buildWorld();
    this.scene = w.scene; this.props = w.props;
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
    this.walk = new Walkable();
    this.input = new Input(r.domElement);
    this.sfx = new Sfx();
    this.hitstop = new HitStopClock(0);
    this.cam = { yaw: 0, pitch: 0.38, dist: 6.5, shake: 0, shakeT: 0 };
    this.ui = new UI(this.container, this);
    this.tokens = new AttackTokens(this.data.combat.enemy_ai);
    this.applySettings();
    this.newGameState();
    this.player = new Player(this);
    this.applySettings();
    this.spawnWorldEnemies();
    this.buildNpcs();
    addEventListener('resize', () => this.resize()); this.resize();
    r.domElement.addEventListener('click', () => { if (this.mode === 'playing' && !this.ui.open) this.input.requestLock(); });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.mode === 'playing' && !this.ui.open && this._wasLocked) this.pause('settings');
      this._wasLocked = !!document.pointerLockElement;
    });
    this.mode = 'title';
    this.ui.showTitle();
    this.lastNow = performance.now();
    const loop = () => { this.frame(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  newGameState(keepLineage = null) {
    const L = this.data.lineage;
    this.gen = newGeneration(L, 'chr_coi');
    this.inv = new Inventory();
    this.inv.add(this.data.combat.healing.item_id, 0);
    this.secret = new SecretChain(this.data.secrets.chains[0]);
    this.secret.hintsEnabled = !!this.settings.hints;
    this.codex = new Set();
    if (keepLineage) { this.secret.load(keepLineage.secret); this.codex = new Set(keepLineage.codex); }
    else this.secret.start();
    this.gathered = new Set(); this.tracesSeen = new Set();
    this.checkpoint = 'fire_ben_say';
    this.callProgress = 0; this.villagerSaved = false; this.practice = null; this.practiceMode = false;
    this.locked = false; this.pry = null; this.lockTarget = null; this.bossSeen = false; this.endReached = false;
    this.equipped = null; this.zone = 'z_ben_say';
    this.walk.gateOpen = false; if (this.props) this.props.gate.visible = true;
    this.mods = this.gen.skills.modifiers();
  }

  get era() { return this.gen.era; }
  get mods() { return this._mods; }
  set mods(m) { this._mods = m; this.player?.drum.setMods({ perfectParryBonus: m.perfectParryBonus, decayDelayAddS: m.decayDelayAddS }); }
  get baoKhi() {
    if (!this.equipped) return null;
    const def = this.data.items.items.find((i) => i.id === this.equipped);
    return baoKhiEffect(def, this.gen.owned[this.equipped]?.level ?? 1);
  }

  spawnWorldEnemies() {
    for (const e of this.enemies ?? []) e.dispose();
    const defs = this.data.enemies.enemies;
    this.enemies = SPAWNS.enemies.map((s) => new Enemy(this, defs.find((d) => d.id === s.def), s));
    this.boss = new Enemy(this, defs.find((d) => d.id === SPAWNS.boss.def), SPAWNS.boss);
    this.enemies.push(this.boss);
  }

  buildNpcs() {
    const ferrywoman = makeHumanoid({ body: 0x5a4a6a, hatColor: 0xc8b47a, height: 0.95 });
    ferrywoman.root.position.set(-4, 0, 22.8); ferrywoman.root.rotation.y = Math.PI; this.scene.add(ferrywoman.root);
    this.villager = makeHumanoid({ body: 0x6a6a52, hat: false });
    this.villager.root.position.set(10, 0, -81); this.villager.root.rotation.y = 0.6; this.scene.add(this.villager.root);
    const caster = makeHumanoid({ body: 0x704a3a, hat: false, height: 1.05 });
    caster.root.position.set(HUB_X - 10.5, 0, -6.5); caster.root.rotation.y = 1.2; this.scene.add(caster.root);
    this.elder = makeHumanoid({ body: 0x606060, hat: true, hatColor: 0xa89a70, height: 0.92 });
    this.elder.root.position.set(HUB_X + 2.5, 0, -12); this.elder.root.visible = false; this.scene.add(this.elder.root);
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  checkpointPos() {
    const p = POINTS.find((x) => x.id === this.checkpoint) ?? POINTS[0];
    return { x: p.x - 1.5, z: p.z + 1.5 };
  }

  after(s, fn) { this.timers.push({ t: s, fn }); }

  // ------------------------------------------------------------------ flow
  startGame() {
    this.sfx.init(); this.sfx.setVolume(this.settings.volume); this.sfx.startAmbience();
    this.ui.close(); this.ui.showHud(true);
    this.mode = 'playing'; this.input.clearAll();
    for (const id of START_CODEX) this.codexUnlock(id, true);
    this.input.requestLock();
    const d = this.i18n.dialogue('dlg_01_opening');
    this.after(0.8, () => this.say(d.speaker, d.text, 5));
    const tips = ['tut_move', 'tut_parry', 'tut_unparryable', 'tut_lock', 'tut_drum'];
    tips.forEach((k, i) => this.after(6 + i * 6, () => this.ui.toast(this.i18n.t(k), 6)));
  }

  pause(tab) {
    if (this.mode !== 'playing') return;
    this.mode = 'paused'; this.input.exitLock(); this.ui.showPause(tab);
  }
  openScreen(name) {
    if (this.mode !== 'playing') return;
    this.mode = 'paused'; this.input.exitLock();
    if (name === 'codex') this.ui.showCodex();
    if (name === 'journal') this.ui.showJournal();
    if (name === 'skills') this.ui.showSkills();
    if (name === 'hints') this.ui.showHints();
    if (name === 'craft') this.ui.showCraft();
  }
  resume() {
    this.ui.close();
    if (this.mode === 'paused') { this.mode = 'playing'; this.input.clearAll(); this.input.requestLock(); }
  }
  quitToTitle() {
    this.ui.close(); this.ui.showHud(false); this.resetWorld(false);
    this.mode = 'title'; this.ui.showTitle();
  }

  resetWorld(keepLineage) {
    const keep = keepLineage ? { secret: this.secret.toJSON(), codex: [...this.codex] } : null;
    this.newGameState(keep);
    this.player.setCharacter('chr_coi'); this.player.slot = 0;
    this.player.respawn(this.checkpointPos());
    this.spawnWorldEnemies();
    for (const e of this.practiceEnemies ?? []) e.dispose();
    this.practiceEnemies = [];
    this.villager.root.position.set(10, 0, -81); this.props.mist.visible = true; this.props.mist.material.opacity = 0.35;
    for (const g of Object.values(this.props.rattan)) g.visible = true;
    this.props.kilnPieces.forEach((m) => { m.visible = true; });
    this.props.hollow.visible = true; this.props.hubHouse2.visible = false; this.elder.root.visible = false;
    this.timers = [];
  }

  // ------------------------------------------------------------------ frame
  frame() {
    const now = performance.now();
    const rawDt = Math.max(0, (now - this.lastNow) / 1000);
    const realDt = Math.min(0.1, rawDt);   // simulation step (clamped)
    const wallDt = Math.min(0.5, rawDt);   // wall clock: timers, pry rhythm, UI
    this.frameStart = this.lastNow; this.lastNow = now;
    this.fpsFrames.push(now); while (this.fpsFrames.length && now - this.fpsFrames[0] > 1000) this.fpsFrames.shift();
    this.fps = this.fpsFrames.length;
    this.input.pollGamepad();
    if (this.mode === 'playing') this.update(realDt, now / 1000, wallDt);
    else this.handleMenuKeys();
    this.ui.tick(wallDt);
    this.render(realDt);
    this.input.endFrame();
  }

  handleMenuKeys() {
    const i = this.input;
    if (this.mode === 'paused' && (i.pressed('menu') || (i.pressed('codex') && this.ui.screenName === 'codex')
      || (i.pressed('journal') && this.ui.screenName === 'journal') || (i.pressed('skills') && this.ui.screenName === 'skills'))) this.resume();
  }

  update(realDt, nowS, wallDt = realDt) {
    const i = this.input;
    this.playTime += wallDt;
    // timers (real time)
    for (const t of this.timers) t.t -= wallDt;
    const due = this.timers.filter((t) => t.t <= 0); this.timers = this.timers.filter((t) => t.t > 0);
    for (const t of due) t.fn();
    if (this.mode !== 'playing') return;
    if (i.pressed('menu')) { this.pause('settings'); return; }
    if (i.pressed('codex')) { this.openScreen('codex'); return; }
    if (i.pressed('journal')) { this.openScreen('journal'); return; }
    if (i.pressed('skills')) { this.openScreen('skills'); return; }
    if (i.pressed('fps')) this.updateSettings({ showFps: !this.settings.showFps });

    const dt = this.hitstop.advance(realDt);
    this.gameNow = (this.gameNow ?? 0) + dt;
    const p = this.player;
    this.updateLock(i);
    if (this.pry) this.updatePry(wallDt, i);
    p.update(dt, this.gameNow, i);
    if ((i.pressed('slot1') || i.pressed('slot2')) && !this.locked) this.swapWeapon(i.pressed('slot1') ? 0 : 1);
    this.tokens.tick(dt);
    for (const e of this.enemies) e.update(dt);
    for (const e of this.practiceEnemies ?? []) e.update(dt);
    this.updateZone();
    if (!this.locked) this.updateInteractions(realDt, i); else this.ui.prompt(null);
    this.updatePractice();
    this.updateCamera(realDt, i);
    this.updateHud();
  }

  // ------------------------------------------------------------------ camera
  updateCamera(dt, input) {
    const c = this.cam, p = this.player;
    const d = input.cameraDelta(dt);
    const sens = 0.0024 * this.settings.sens;
    c.yaw -= d.dx * sens; c.pitch = Math.max(-0.15, Math.min(1.1, c.pitch + d.dy * sens));
    if (this.lockTarget) {
      const want = Math.atan2(-(this.lockTarget.x - p.x), -(this.lockTarget.z - p.z));
      c.yaw += normAngle(want - c.yaw) * Math.min(1, dt * 6);
      c.pitch += (0.32 - c.pitch) * Math.min(1, dt * 3);
    }
    if (this.pry) { c.dist += (4.5 - c.dist) * Math.min(1, dt * 3); } else c.dist += (6.5 - c.dist) * Math.min(1, dt * 3);
    const fx = p.x, fy = 1.6, fz = p.z;
    let ox = 0, oy = 0;
    if (c.shakeT > 0 && this.settings.acc.acc_camera_shake) {
      c.shakeT -= dt; const a = c.shake * Math.max(0, c.shakeT / 0.25);
      ox = (Math.random() - 0.5) * a; oy = (Math.random() - 0.5) * a;
    }
    this.camera.position.set(fx + Math.sin(c.yaw) * Math.cos(c.pitch) * c.dist + ox, fy + Math.sin(c.pitch) * c.dist + oy, fz + Math.cos(c.yaw) * Math.cos(c.pitch) * c.dist);
    this.camera.lookAt(fx, fy, fz);
  }
  shake(weight) { this.cam.shake = shakeFor(this.data.combat.camera_shake, weight); this.cam.shakeT = 0.25; }

  render() {
    if (!this.renderer) return;
    const t = performance.now() / 1000;
    for (const f of Object.values(this.props.fires)) f.scale.y = 1 + Math.sin(t * 9 + f.id) * (this.settings.acc.acc_reduce_flash ? 0.02 : 0.12);
    this.renderer.render(this.scene, this.camera);
    if (this.mode === 'playing' || this.mode === 'paused') this.updateMarkers();
  }

  updateMarkers() {
    const v = new THREE.Vector3(), w = innerWidth, h = innerHeight, list = [];
    const all = [...this.enemies, ...(this.practiceEnemies ?? [])];
    for (const e of all) {
      const visible = e.alive && Math.hypot(e.x - this.player.x, e.z - this.player.z) < 30;
      if (!visible) { list.push({ id: e.uid, visible: false }); continue; }
      v.set(e.x, MARKER_H[e.def.id] ?? 2.2, e.z).project(this.camera);
      const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      list.push({ id: e.uid, visible: on, sx: (v.x + 1) / 2 * w, sy: (1 - v.y) / 2 * h, tele: e.telegraphKind,
        locked: this.lockTarget === e, showBars: !e.isBoss && (e.engaged || this.lockTarget === e), hp: e.hpNow / e.hpMax, the: e.posture.ratio });
    }
    this.ui.updateMarkers(list);
  }

  // ------------------------------------------------------------------ lock-on
  lockCandidates() {
    return [...this.enemies, ...(this.practiceEnemies ?? [])].filter((e) => e.lockable).map((e) => ({ id: e.uid, x: e.x, z: e.z, e }));
  }
  updateLock(i) {
    const lt = this.data.combat.lock_on, p = this.player;
    const holdMode = this.settings.acc.acc_lock_on_mode === 'hold';
    const fwd = { x: -Math.sin(this.cam.yaw), z: -Math.cos(this.cam.yaw) };
    const pick = () => {
      const c = this.lockCandidates(); const id = pickLockTarget(p, fwd, c, lt);
      return c.find((x) => x.id === id)?.e ?? null;
    };
    if (holdMode) {
      if (i.isDown('lock') && !this.lockTarget) this.lockTarget = pick();
      if (!i.isDown('lock')) this.lockTarget = null;
    } else if (i.pressed('lock')) this.lockTarget = this.lockTarget ? null : pick();
    if (this.lockTarget && (!this.lockTarget.lockable || shouldBreakLock(p, this.lockTarget, lt))) this.lockTarget = null;
  }
  softAim() {
    if (!this.diff.aimAssist) return null;
    const p = this.player, c = this.lockCandidates();
    const id = softAimTarget(p, { x: Math.sin(p.yaw), z: Math.cos(p.yaw) }, c, this.data.combat.lock_on, 4);
    return c.find((x) => x.id === id)?.e ?? null;
  }

  // ------------------------------------------------------------------ combat resolution
  _targetsInReach(range, arcDeg) {
    const p = this.player, fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), out = [];
    for (const e of [...this.enemies, ...(this.practiceEnemies ?? [])]) {
      if (!e.alive || e.state === 'pried') continue;
      const dx = e.x - p.x, dz = e.z - p.z;
      const along = dx * fx + dz * fz, lateral = Math.abs(dx * fz - dz * fx), dist = Math.hypot(dx, dz);
      if (dist > range + e.radius) continue;
      const ang = angleBetween(fx, fz, dx, dz);
      if (ang <= arcDeg / 2 || (along > 0 && lateral <= e.radius + 0.3) || dist < e.radius + 0.3) out.push(e);
    }
    return out;
  }

  playerStrike(move, kind, level, postPerfectDodge) {
    const heavyRef = this.player.weapon.moves.find((m) => m.input === 'H');
    const range = move.range_m ?? heavyRef.range_m, arc = move.arc_deg ?? heavyRef.arc_deg;
    const targets = this._targetsInReach(range, arc);
    this.hitDummies(range, arc);
    if (!targets.length) return;
    const weight = kind === 'house' ? 'heavy' : move.hit_weight;
    const p = this.player;
    for (const e of targets) {
      const toP = angleBetween(Math.sin(e.yaw), Math.cos(e.yaw), p.x - e.x, p.z - e.z);
      const dmg = playerHitDamage({ move, chargeLevel: level, kind, difficulty: this.diff, mods: this.mods, baoKhi: this.baoKhi,
        frontal: toP <= PROTO.frontArcDeg / 2, frontMult: e.def.front_damage_mult ?? 1, postPerfectDodge });
      const r = e.receiveHit(dmg);
      if (kind === 'house' && r) { const l = Math.hypot(e.x - p.x, e.z - p.z) || 1; const m = this.walk.move(e.x, e.z, (e.x - p.x) / l * 2, (e.z - p.z) / l * 2, e.radius * 0.6); e.x = m.x; e.z = m.z; }
      this.onHitResult(e, r);
    }
    p.drum.gain(kind === 'chain' || kind === 'dodge_attack' ? 'light_hit' : 'heavy_hit');
    this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, weight));
    this.shake(weight); this.sfx.hit(weight);
  }

  playerBurstHit(burst, last) {
    const w = this.player.weapon, range = Math.max(...w.moves.filter((m) => m.input === 'L').map((m) => m.range_m));
    const targets = this._targetsInReach(range, 90);
    this.hitDummies(range, 90);
    this.sfx.drum(last);
    for (const e of targets) this.onHitResult(e, e.receiveHit(burstHitDamage(burst, this.diff, this.mods)));
    const weight = last ? burst.hit_weight : 'medium';
    if (targets.length) { this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, weight)); this.shake(weight); this.sfx.hit(weight); }
  }

  hitDummies(range, arc) {
    if (!this.practice) return;
    const p = this.player;
    for (const d of this.props.dummies) {
      const dx = d.position.x - p.x, dz = d.position.z - p.z;
      if (Math.hypot(dx, dz) <= range + 0.4 && angleBetween(Math.sin(p.yaw), Math.cos(p.yaw), dx, dz) <= Math.max(arc, 40) / 2) {
        d.rotation.z = 0.3; setTimeout(() => { d.rotation.z = 0; }, 160); this.sfx.hit('light');
      }
    }
  }

  onHitResult(e, r) {
    if (!r) return;
    if (r.broke) { this.player.drum.gain('the_break'); this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, 'heavy')); }
    if (r.cracked) { this.sfx.crackSnap(); this.ui.center(this.i18n.t('msg_khoen_crack', { n: e.enc.khoen.cracks }), 1.6); }
    if (r.phaseChanged) this.onBossPhase2(e);
  }

  onBossPhase2() {
    const d = this.i18n.dialogue('dlg_02_see_shard');
    this.say(d.speaker, d.text, 4);
    this.codexUnlock('cx_khoen');
    this.sfx.telegraph('boar_pain', 'nodamage', 0);
  }

  onTelegraph(enemy, atk, kind, family) {
    const p = this.player;
    const rel = normAngle(Math.atan2(enemy.x - p.x, enemy.z - p.z) - Math.atan2(-Math.sin(this.cam.yaw), -Math.cos(this.cam.yaw)));
    const pan = this.settings.acc.acc_attack_audio_cue ? Math.sin(-rel) : 0;
    this.sfx.telegraph(family, kind, pan);
    if (kind === 'unparryable') {
      try { const pad = [...(navigator.getGamepads?.() ?? [])].find((x) => x?.vibrationActuator); pad?.vibrationActuator.playEffect('dual-rumble', { duration: 300, strongMagnitude: 0.6, weakMagnitude: 0.2 }); } catch { /* optional */ }
    }
  }

  enemyHitsPlayer(enemy, atk) {
    const p = this.player, g = this.data.combat.guard;
    if (!p.alive || p.state === 'pry' || this.locked || p.invulnDebug) return;
    if (atk.damage <= 0) {
      if (!p.defense.invulnerable && atk.pushback_m) {
        const dx = p.x - enemy.x, dz = p.z - enemy.z, l = Math.hypot(dx, dz) || 1;
        const r = this.walk.move(p.x, p.z, dx / l * atk.pushback_m, dz / l * atk.pushback_m, PROTO.playerRadiusM); p.x = r.x; p.z = r.z;
      }
      return;
    }
    const outcome = p.defense.resolve({ parryable: atk.parryable, guardable: atk.guardable });
    const T = this.i18n.t;
    switch (outcome) {
      case Outcome.PERFECT_DODGE:
        p.drum.gain('perfect_dodge'); this.sfx.dodge(true); this.ui.toast(T('msg_perfect_dodge'), 1.5);
        p.postPerfectDodgeUntil = this.gameNow + this.mods.postPerfectDodgeWindowS;
        return;
      case Outcome.DODGED: return;
      case Outcome.PERFECT_PARRY: case Outcome.PARRIED: {
        const perfect = outcome === Outcome.PERFECT_PARRY;
        this.onHitResult(enemy, enemy.receiveTheDamage(parryTheDamage(outcome, g)));
        p.drum.gain(perfect ? 'perfect_parry' : 'parry');
        this.sfx.parry(perfect); this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, perfect ? 'medium' : 'light'));
        this.ui.toast(T(perfect ? 'msg_perfect_parry' : 'msg_parry'), 1.5);
        if (perfect) p.perfectParryUntil = this.gameNow + g.perfect_parry_counter_window_s;
        return;
      }
      default: {
        const dmg = enemyHitDamage(atk, outcome, g, this.diff);
        p.takeHit(dmg, !atk.parryable, outcome);
        if (outcome === Outcome.GUARDED) this.sfx.parry(false);
        else { this.shake(atk.parryable ? 'light' : 'heavy'); this.callProgress *= this.villagerHoldKept(); }
        if (atk.applies?.status === 'slow' && outcome === Outcome.HIT) { p.slowT = atk.applies.duration_s; p.slowMult = atk.applies.speed_mult; }
      }
    }
  }
  villagerHoldKept() {
    const nc = this.data.enemies.non_combat_encounters[0];
    if (this.callProgress > 0 && this.input.isDown('call')) this.ui.toast(this.i18n.t('msg_call_interrupted'), 2);
    return nc.progress_kept_on_interrupt;
  }

  onBurst() { this.sfx.drum(true); this.ui.center(this.loc(this.player.weapon.drum_burst.name), 1.2); }

  onEnemyDefeated(e) {
    const key = e.def.defeat_behavior === 'dissipate' ? 'msg_enemy_dissipated' : 'msg_enemy_fled';
    this.ui.toast(this.i18n.t(key, { name: this.loc(e.def.name) }), 2.5);
    if (this.lockTarget === e) this.lockTarget = null;
    this.tokens.release(e.uid);
  }

  onPlayerDeath() {
    this.locked = true; this.lockTarget = null;
    this.ui.center(this.i18n.t('you_fell'), 2.5);
    this.after(2.2, () => this.ui.fade(true));
    this.after(2.8, () => {
      if (this.boss.state !== 'freed') this.boss.reset();
      this.restAt(this.checkpoint, false);
      this.ui.fade(false); this.locked = false;
      this.ui.toast(this.i18n.t('msg_respawn'), 3);
    });
  }

  restAt(pointId, showMsg = true) {
    this.checkpoint = pointId;
    this.player.respawn(this.checkpointPos());
    for (const e of this.enemies) if (!e.isBoss && e.def.respawns_at_checkpoint) e.reset();
    if (this.boss.state !== 'freed' && this.boss.state !== 'gone') this.boss.reset();
    if (showMsg) this.ui.toast(this.i18n.t('msg_rested'), 3);
  }

  swapWeapon(slot) {
    const p = this.player;
    if (slot >= this.gen.slots || slot >= this.gen.weapons.length || p.state !== 'free') return;
    if ((p.slot ?? 0) === slot) return;
    p.slot = slot; p.chainIndex = 0;
    this.ui.toast(this.i18n.t('msg_swap', { name: this.loc(p.weapon.name) }), 1.5);
    if (this.practice) this.practice.swaps += 1;
  }

  loc(o) { return this.i18n.loc(o); }
  speakerName(id) {
    const ch = this.data.lineage.characters.find((c) => c.id === id);
    if (ch) return this.loc(ch.name);
    if (id === this.data.secrets.chains[0].hint_giver.npc) return this.loc(this.data.secrets.chains[0].hint_giver.name);
    return this.i18n.t(`speaker_${id}`);
  }
  say(speaker, text, s) { this.ui.subtitle(speaker ? this.speakerName(speaker) : '', this.loc(text), s); }

  // ------------------------------------------------------------------ codex
  codexUnlock(id, silent = false) {
    if (this.codex.has(id)) return false;
    const e = this.data.codex.entries.find((x) => x.id === id);
    // SB11-17: no new entry using an era's forbidden words may unlock in that era.
    if (forbiddenHits([e.title, e.text], eraTags(this.data.lineage, this.era)).length) return false;
    this.codex.add(id);
    if (!silent) this.ui.toast(this.i18n.t('msg_codex_unlocked', { name: this.loc(e.title) }), 3);
    return true;
  }
  codexUnlocked(id) { return this.codex.has(id); }
  codexExtraUnlocked(e) { return e.text_extra_unlock === this.secret.chain.id && this.secret.finished; }

  // ------------------------------------------------------------------ zones, interactions
  updateZone() {
    const z = zoneAt(this.player.x, this.player.z);
    if (z && !['c01', 'c12', 'c24', 'c3', 'shortcut'].includes(z)) this.zone = z;
    if (z === 'z_dau_truong' && !this.bossSeen && this.boss.state !== 'freed') { this.bossSeen = true; this.codexUnlock('cx_lon_loi_dam'); }
    for (const pt of POINTS.filter((x) => x.kind === 'trace')) {
      if (!this.tracesSeen.has(pt.id) && this.era === 'era_lac_long_quan' && Math.hypot(pt.x - this.player.x, pt.z - this.player.z) < pt.r) {
        this.tracesSeen.add(pt.id); this.ui.subtitle('', this.loc(this.boss.def.intro_traces[pt.trace]), 4);
      }
    }
  }
  zoneName() {
    if (this.zone === 'hub') return this.loc(this.data.codex.entries.find((e) => e.id === 'cx_ben_lau').title);
    if (this.zone === 'hub_bank') return this.i18n.t('zone_bai_song');
    const l = this.data.secrets.locations.find((x) => x.id === this.zone);
    return l ? this.loc(l.name) : '';
  }
  secretVisible() { return this.era === this.secret.chain.era_restriction; }

  pointAvailable(pt) {
    const coi = this.era === 'era_lac_long_quan', freed = this.gen.flags.has(FREED_FLAG);
    switch (pt.kind) {
      case 'rest': case 'hint_npc': case 'ferry_to_hub': return coi;
      case 'secret': return coi && this.secret.isAvailable(pt.node);
      case 'kiln_piece': return coi && this.secret.isAvailable('sn_kiln');
      case 'gather': return coi && !this.gathered.has(pt.id);
      case 'call_name': return coi && !this.villagerSaved;
      case 'shortcut': return coi && !this.walk.gateOpen;
      case 'furnace': return coi;
      case 'thap': return true;
      case 'drum': return (coi && freed) || (!coi && this.practice?.done && !this.endReached);
      case 'ferry_to_marsh': return coi;
      default: return false;
    }
  }

  promptFor(pt) {
    const T = this.i18n.t, coi = this.era === 'era_lac_long_quan';
    const k = (key) => `<span class="kbd">F</span> ${this.ui.esc(T(key))}`;
    switch (pt.kind) {
      case 'rest': return k('prompt_rest');
      case 'hint_npc': return `${k('prompt_talk')} — ${this.ui.esc(this.speakerName('npc_ba_lai_do'))}`;
      case 'ferry_to_hub': case 'ferry_to_marsh': return k('prompt_board_ferry');
      case 'secret': return `${k('prompt_interact')} — ${this.ui.esc(this.loc(this.secret.node(pt.node).text))}`;
      case 'kiln_piece': return `${k('prompt_compare')} — ${this.ui.esc(T('kiln_piece', { n: pt.piece + 1 }))}`;
      case 'gather': return k('prompt_gather');
      case 'call_name': return `<span class="kbd">E</span> ${this.ui.esc(T('prompt_call_name'))}`;
      case 'shortcut': return k('prompt_shortcut');
      case 'furnace': return k('prompt_craft');
      case 'thap': return k('prompt_open_thap');
      case 'drum': return k(coi ? 'prompt_handoff' : 'prompt_continue');
      default: return '';
    }
  }

  updateInteractions(dt, i) {
    const p = this.player;
    let best = null, bestD = Infinity;
    for (const pt of POINTS) {
      if (pt.kind === 'trace') continue;
      const d = Math.hypot(pt.x - p.x, pt.z - p.z);
      if (d <= pt.r && d < bestD && this.pointAvailable(pt)) { best = pt; bestD = d; }
    }
    // Finisher / pry targets take priority.
    let foe = null;
    for (const e of [...this.enemies, ...(this.practiceEnemies ?? [])]) {
      if (!e.alive || !e.staggered) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (e.isBoss ? e.enc.canFinish() && d < e.radius + 3.2 : d < e.radius + 2.2) foe = e;
    }
    const T = this.i18n.t;
    if (foe) {
      const key = foe.isBoss ? (foe.enc.khoen.enabled ? (this.settings.acc.acc_hold_instead_of_tap ? 'prompt_pry_hold' : 'prompt_pry') : 'prompt_shove') : 'prompt_finish_normal';
      this.ui.prompt(`<span class="kbd">F</span> ${this.ui.esc(T(key))}`);
      if (i.pressed('interact') && p.state !== 'attack') {
        if (foe.isBoss) { if (foe.enc.khoen.enabled) this.startPry(foe); else this.shoveBoss(foe); }
        else { this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, 'finisher')); this.shake('heavy'); this.sfx.hit('heavy'); foe.defeat(); }
      }
      return;
    }
    if (!best) { this.ui.prompt(null); this.callProgress = this.villagerSaved ? 0 : this.callProgress; return; }
    if (best.kind === 'call_name') {
      const nc = this.data.enemies.non_combat_encounters[0];
      if (i.isDown('call') && p.state === 'free') this.callProgress = Math.min(1, this.callProgress + dt / nc.hold_s);
      this.ui.prompt(this.promptFor(best), this.callProgress);
      if (this.callProgress >= 1) this.saveVillager();
      return;
    }
    this.ui.prompt(this.promptFor(best));
    if (i.pressed('interact') && p.state === 'free') this.interact(best);
  }

  interact(pt) {
    const T = this.i18n.t;
    switch (pt.kind) {
      case 'rest': this.restAt(pt.id); this.sfx.ui(); break;
      case 'hint_npc': this.openScreen('hints'); break;
      case 'ferry_to_hub':
        if (!this.gen.flags.has(FREED_FLAG)) { this.ui.toast(T('msg_ferry_locked'), 4); break; }
        this.travel(SPAWNS.hub_arrive); break;
      case 'ferry_to_marsh': this.travel({ x: 0, z: 27 }); break;
      case 'secret': this.completeSecret(pt.node); break;
      case 'kiln_piece':
        if (pt.correct) { this.props.kilnPieces[pt.piece].visible = false; this.completeSecret('sn_kiln'); }
        else this.ui.toast(T('msg_puzzle_wrong'), 2.5);
        break;
      case 'gather': {
        this.gathered.add(pt.id); this.props.rattan[pt.id].visible = false;
        this.give('mat_day_may', 1); break;
      }
      case 'shortcut': this.walk.gateOpen = true; this.props.gate.visible = false; this.ui.toast(T('msg_shortcut_open'), 3); this.sfx.ui(); break;
      case 'furnace':
        if (!this.gen.flags.has('flag_village_bronze')) { this.gen.flags.add('flag_village_bronze'); this.give('mat_dong_lo_lang', 1); }
        this.openScreen('craft'); break;
      case 'thap': this.openThap(); break;
      case 'drum': if (this.era === 'era_lac_long_quan') this.confirmHandoff(); else this.finishDemo(); break;
      default: break;
    }
  }

  give(itemId, n) {
    this.inv.add(itemId, n); this.sfx.pickup();
    const it = this.data.items.items.find((x) => x.id === itemId);
    this.ui.toast(this.i18n.t('msg_got_item', { name: this.loc(it.name), n }), 3);
  }

  completeSecret(nodeId) {
    const r = this.secret.complete(nodeId);
    if (!r.ok) return;
    for (const c of r.granted) {
      const clue = this.secret.chain.clues.find((x) => x.id === c);
      this.ui.toast(this.i18n.t('msg_clue', { name: this.loc(clue.name) }), 4);
      this.ui.subtitle('', this.loc(clue.text), 6);
    }
    if (nodeId === 'sn_kiln') this.props.hollow.visible = true;
    if (r.reward) {
      for (const it of r.reward.items ?? []) this.give(it.item, it.count);
      this.props.hollow.visible = false;
      for (const cx of r.reward.codex_unlock_extra ?? []) {
        const e = this.data.codex.entries.find((x) => x.id === cx);
        this.codexUnlock(cx, true);
        this.ui.toast(this.i18n.t('msg_codex_extra', { name: this.loc(e.title) }), 4);
      }
    }
  }

  saveVillager() {
    const nc = this.data.enemies.non_combat_encounters[0];
    this.villagerSaved = true; this.callProgress = 0;
    this.gen.flags.add(nc.on_success.sets_flag);
    const pts = skillPointsFor(this.data.lineage, nc.id) || nc.on_success.grants_skill_points;
    this.gen.skills.points += pts;
    this.ui.toast(this.i18n.t('msg_villager_saved'), 4);
    this.ui.toast(this.i18n.t('msg_skill_points', { n: pts }), 4);
    this.sfx.pickup();
    const mist = this.props.mist;
    let t = 0; const iv = setInterval(() => { t += 0.05; mist.material.opacity = Math.max(0, 0.35 * (1 - t)); if (t >= 1) { clearInterval(iv); mist.visible = false; } }, 50);
    this.after(2.5, () => { this.villager.root.position.set(-7, 0, 19); this.villager.root.rotation.y = Math.PI; });
  }

  travel(pos) {
    this.locked = true; this.ui.fade(true); this.lockTarget = null;
    this.after(0.6, () => { this.player.x = pos.x; this.player.z = pos.z; this.player.yaw = Math.PI / 2; this.cam.yaw = -Math.PI / 2; });
    this.after(0.9, () => { this.ui.fade(false); this.locked = false; });
  }

  // ------------------------------------------------------------------ pry
  startPry(boss) {
    const p = this.player;
    const judge = boss.enc.beginPry({ windowAddS: this.mods.pryWindowAddS, holdMode: !!this.settings.acc.acc_hold_instead_of_tap, auto: this.diff.pryAuto });
    if (!judge) return;
    this.locked = true; this.lockTarget = boss;
    // Motion warp to the neck socket (graybox: beside the head).
    const fx = Math.sin(boss.yaw), fz = Math.cos(boss.yaw);
    p.x = boss.x + fx * 1.9 + fz * 1.2; p.z = boss.z + fz * 1.9 - fx * 1.2;
    p.yaw = Math.atan2(boss.x + fx * 1.0 - p.x, boss.z + fz * 1.0 - p.z);
    p.state = 'pry'; p.cur = null; p.showPole(true); p.pryLever = 0;
    this.pry = { boss, judge, msg: this.i18n.t(judge.auto ? 'pry_auto' : judge.holdMode ? 'pry_hint_hold' : 'pry_hint', { key: 'F' }) };
    boss.state = 'pried';
  }

  updatePry(realDt, i) {
    const { judge, boss } = this.pry;
    const events = [];
    if (i.pressed('interact') && !judge.holdMode && !judge.auto) {
      // Judge the press at its event timestamp, not at frame time (frame-rate independent).
      const lag = Math.max(-INPUT_GRACE_S, Math.min(realDt, (i.pressTime.interact - this.frameStart) / 1000));
      if (lag <= 0) events.push(...judge.press(lag), ...judge.tick(realDt));
      else events.push(...judge.tick(lag), ...judge.press(0), ...judge.tick(realDt - lag));
    } else {
      judge.setHeld(i.isDown('interact'));
      events.push(...judge.tick(realDt));
    }
    const T = this.i18n.t;
    for (const ev of events) {
      if (ev.type !== 'drum') (this.pryLog ??= []).push({ ...ev, t: +judge.t.toFixed(3) });
      if (ev.type === 'drum') this.sfx.drum(true);
      if (ev.type === 'hit') {
        this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, 'pry_beat')); this.sfx.crackSnap();
        this.player.pryLever = -0.18 * ev.beat; this.shake('medium');
        boss.mesh.cracks.forEach((c) => { c.scale.y = 1 + ev.beat * 0.6; });
        this.pry.msg = T('pry_beat_hit'); this.player.drum.gain('pry_beat');
      }
      if (ev.type === 'miss') { this.sfx.miss(); this.pry.msg = T('pry_beat_miss'); }
    }
    const slotFrac = judge.holdMode ? 0 : Math.max(0, Math.min(1, judge.timeToSlot / judge.interval));
    this.ui.pryWidget({ beats: judge.beats, hit: judge.beat, slotFrac, hold: judge.holdMode, holdProgress: judge.holdProgress / judge.holdDuration, msg: this.pry.msg });
    if (judge.done) {
      const res = boss.enc.resolvePry();
      this.ui.pryWidget(null);
      if (res === 'freed') this.onBossFreed(boss);
      else {
        this.ui.center(T('pry_failed'), 2);
        this.player.showPole(false); this.player.state = 'free'; this.locked = false; this.pry = null; boss.state = 'chase';
        const p = this.player, dx = p.x - boss.x, dz = p.z - boss.z, l = Math.hypot(dx, dz) || 1;
        const m = this.walk.move(p.x, p.z, dx / l * 2.5, dz / l * 2.5, PROTO.playerRadiusM); p.x = m.x; p.z = m.z;
      }
    }
  }

  onBossFreed(boss) {
    const tun = this.data.combat, T = this.i18n.t, kh = boss.def.khoen;
    this.pry = null;
    this.hitstop.trigger(hitStopFor(tun.hit_stop, 'pry_release'));
    this.shake('heavy'); this.sfx.crackSnap();
    // The khoen falls apart; pieces are narrative only (no item, no counter: V9).
    boss.mesh.khoen.visible = false;
    this.ui.showHud(false);
    this.after(0.15, () => this.sfx.silence(tun.pry.silence_after_s));
    const tusk = makeTusk(); tusk.position.set(boss.x + Math.sin(boss.yaw) * 2.2, 0.1, boss.z + Math.cos(boss.yaw) * 2.2); this.scene.add(tusk);
    this.freedTusk = tusk;
    this.after(tun.pry.silence_after_s + 0.2, () => {
      this.ui.showHud(true);
      boss.walkOff();
      const ve = this.i18n.dialogue('dlg_04_ve_after_pry');
      if ((ve.allowed_eras ?? [ve.era]).includes(this.era)) this.say(ve.speaker, ve.text, 9);
      this.player.showPole(false); this.player.state = 'free'; this.locked = false; this.lockTarget = null;
    });
    this.after(tun.pry.silence_after_s + 3, () => {
      for (const d of kh.on_pry_success.drops) this.give(d.item, d.count);
      this.scene.remove(tusk);
      this.gen.flags.add(kh.on_pry_success.sets_flag);
      const pts = skillPointsFor(this.data.lineage, kh.on_pry_success.sets_flag);
      this.gen.skills.points += pts; this.ui.toast(T('msg_skill_points', { n: pts }), 4);
      for (const hm of this.data.lineage.house_moves.filter((h) => h.unlock.flag === kh.on_pry_success.sets_flag)) {
        this.gen.houseMoves.push(hm.id); this.ui.toast(T('msg_house_move_learned', { name: this.loc(hm.name) }), 5);
      }
    });
  }

  shoveBoss(boss) {
    if (!boss.enc.shove()) return;
    const fb = boss.def.khoen.fallback_when_disabled;
    this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, 'finisher')); this.shake('heavy');
    boss.walkOff();
    this.after(2, () => {
      for (const d of fb.drops) this.give(d.item, d.count);
      this.gen.flags.add(fb.sets_flag);
      const pts = skillPointsFor(this.data.lineage, fb.sets_flag); this.gen.skills.points += pts;
    });
  }

  // ------------------------------------------------------------------ hub: craft, thap, handoff
  recipeMissing(r) { return missingFor(r, this.inv, this.gen.owned); }
  craftRecipe(id) {
    const r = this.data.items.recipes.find((x) => x.id === id);
    const res = craft(r, this.inv, this.gen.owned, this.data.items, this.gen.generation);
    if (!res.ok) { this.ui.toast(this.i18n.t('craft_missing'), 2); return false; }
    const it = this.data.items.items.find((x) => x.id === res.crafted.item);
    this.equipped = it.category === 'bao_khi' ? it.id : this.equipped;
    this.gen.flags.add(`crafted:${id}`);
    this.ui.toast(this.i18n.t(r.type === 'upgrade' ? 'msg_upgraded' : 'msg_crafted', { name: this.loc(it.name) }), 4);
    this.sfx.pickup();
    const d = this.data.strings.dialogue.find((x) => x.trigger === `craft_${id}`);
    if (d && d.era === this.era) this.say(d.speaker, d.text, 5);
    return true;
  }

  openThap() {
    const L = this.data.lineage, it = this.data.items.items, e = (s) => this.ui.esc(s);
    const content = this.thapContents();
    const html = `<h2>${e(this.loc(L.thap.name))}</h2><p>${e(this.loc(L.thap.description))}</p>
      ${content.length ? content.map((c) => { const d = it.find((x) => x.id === c.item); return `<div class="card"><b>${e(this.loc(d.name))}</b> — ${e(this.i18n.t('handoff_gen_label', { n: c.generation }))}<br>${e(this.loc(d.description))}</div>`; }).join('') : `<p class="dim">${e(this.i18n.t('thap_empty'))}</p>`}`;
    this.mode = 'paused'; this.input.exitLock();
    this.ui.showCard('thap', html, 'btn_close', () => this.resume());
  }
  thapContents() { return this.gen.thap; }

  confirmHandoff() {
    const L = this.data.lineage;
    const warn = handoffWarnings(L, { secretFinished: () => this.secret.finished, crafted: (id) => this.gen.flags.has(`crafted:${id}`) });
    const names = warn.map((id) => (id.startsWith('sec_') ? this.loc(this.secret.chain.name)
      : this.loc(this.data.items.items.find((x) => x.id === this.data.items.recipes.find((r) => r.id === id).output.item).name)));
    this.mode = 'paused'; this.input.exitLock();
    this.ui.showConfirm(this.i18n.t('handoff_confirm'), names, () => this.runHandoff(), () => this.resume());
  }

  /** Handoff sequence (lineage.handoff.steps). Everything shown here belongs to the next era and must
   *  pass that era's forbidden-word rule (checked by test/handoff.test.mjs). */
  runHandoff() {
    const L = this.data.lineage, steps = L.handoff.steps, e = (s) => this.ui.esc(s), T = this.i18n.t;
    const prev = this.gen;
    if (this.equipped && !prev.owned[this.equipped]) this.equipped = null;
    this.gen = handoff(L, prev);
    this.mods = this.gen.skills.modifiers();
    this.lockTarget = null;
    let idx = 0;
    const next = () => {
      const st = steps[idx++];
      if (!st) return;
      const card = (html) => this.ui.showCard(`handoff_${st.id}`, html, 'prompt_continue', next);
      switch (st.kind) {
        case 'title_card': card(`<p class="titlecard">${e(this.loc(st.text))}</p>`); break;
        case 'dialogue': {
          const d = this.i18n.dialogue(st.line_ref);
          card(`<p><span class="speaker"><b>${e(this.speakerName(d.speaker))}</b></span></p><p style="font-size:22px;white-space:pre-line">${e(this.loc(d.text))}</p>`);
          break;
        }
        case 'open_thap': {
          const it = this.data.items.items;
          card(`<h2>${e(this.loc(L.thap.name))}</h2><p>${e(this.loc(L.thap.description))}</p>${this.gen.thap.length ? this.gen.thap.map((c) => { const d = it.find((x) => x.id === c.item); return `<div class="card"><b>${e(this.loc(d.name))}</b> — ${e(T('handoff_gen_label', { n: c.generation }))}<br>${e(this.loc(d.description))}<br><span class="dim">${e(this.loc(d.effect_text))}</span></div>`; }).join('') : `<p class="dim">${e(T('thap_empty'))}</p>`}`);
          break;
        }
        case 'receive_tool': {
          const tool = L.tools.find((x) => x.id === st.ref);
          card(`<h2>${e(T('handoff_receive_tool', { name: this.loc(tool.name) }))}</h2><p>${e(this.loc(tool.description))}</p>`);
          break;
        }
        case 'show_inherited_skills': {
          const names = [...this.gen.skills.owned].map((id) => this.loc(L.skill_tree.nodes.find((n) => n.id === id).name));
          const hms = this.gen.houseMoves.map((id) => this.loc(L.house_moves.find((h) => h.id === id).name));
          card(`<h2>${e(T('skills_title'))}</h2><p>${e(T('handoff_skills', { n: names.length, p: this.gen.skills.points }))}</p><ul>${[...names, ...hms].map((n) => `<li>${e(n)}</li>`).join('')}</ul>`);
          break;
        }
        case 'unlock_weapon_slot': {
          const w = this.data.weapons.weapons.find((x) => x.id === st.weapon);
          card(`<h2>${e(T('handoff_slot2', { name: this.loc(w.name) }))}</h2><p>${e(this.loc(w.description))}</p>`);
          break;
        }
        case 'practice_fight': this.startPractice(st, next); break;
        case 'demo_end': this.showEnd(); break;
        default: next();
      }
    };
    this.handoffNext = next;
    next();
  }

  startPractice(step, next) {
    this.ui.close();
    this.player.setCharacter(this.gen.character); this.player.slot = 1;
    this.player.respawn(SPAWNS.bank_start); this.player.slot = 1;
    this.mods = this.gen.skills.modifiers();
    this.equipped = Object.keys(this.gen.owned)[0] ?? null;
    this.props.hubHouse2.visible = true; this.elder.root.visible = true; this.props.drum.scale.setScalar(1.25);
    for (const e of this.enemies) { e.state = 'gone'; e.mesh.root.visible = false; e._hideDecals(); }
    const defs = this.data.enemies.enemies;
    this.practiceEnemies = [];
    for (const en of step.enemies) {
      const def = defs.find((d) => d.id === en.enemy);
      for (let k = 0; k < en.count; k++) this.practiceEnemies.push(new Enemy(this, def, SPAWNS.practice[k % SPAWNS.practice.length], { practice: true }));
    }
    this.practice = { swaps: 0, done: false, next, goal: step.goal };
    this.practiceMode = step.fail_state === 'none_retry_freely';
    this.mode = 'playing'; this.locked = false; this.ui.showHud(true); this.input.clearAll(); this.input.requestLock();
    this.cam.yaw = 0;
  }

  updatePractice() {
    const pr = this.practice;
    if (!pr || pr.done) return;
    const allGone = this.practiceEnemies.every((e) => !e.alive);
    if (pr.swaps >= 1 && allGone) {
      pr.done = true; this.ui.toast(this.i18n.t('msg_practice_done'), 4);
      this.ui.center(this.i18n.t('msg_practice_done'), 2);
    } else if (allGone && !pr.respawnT) {
      // Practice can't be lost or exhausted: crabs come back until the goal is met.
      pr.respawnT = true;
      this.after(3, () => { pr.respawnT = false; if (!pr.done) for (const e of this.practiceEnemies) e.reset(); });
    }
  }

  finishDemo() {
    this.endReached = true;
    this.mode = 'paused'; this.input.exitLock();
    this.handoffNext?.();
  }

  showEnd() {
    const e = (s) => this.ui.esc(s), T = this.i18n.t;
    this.mode = 'end'; this.input.exitLock(); this.ui.showHud(false);
    this.ui._screen('end', `<p class="titlecard">${e(T('demo_end'))}</p>
      <div class="row"><button class="primary" data-act="memory">${e(T('demo_replay_memory'))}</button><button data-act="feedback">${e(T('btn_feedback'))}</button><button data-act="title">${e(T('btn_to_title'))}</button></div>`, { solid: true });
    this.ui._bind('[data-act=memory]', () => { this.ui.close(); this.resetWorld(true); this.mode = 'playing'; this.ui.showHud(true); this.input.requestLock(); });
    this.ui._bind('[data-act=feedback]', () => this.ui.showFeedback(() => this.showEnd()));
    this.ui._bind('[data-act=title]', () => this.quitToTitle());
  }

  buySkill(id) {
    if (!this.gen.skills.buy(id)) return false;
    this.mods = this.gen.skills.modifiers();
    return true;
  }

  // ------------------------------------------------------------------ HUD
  objective() {
    const T = this.i18n.t, f = this.gen.flags;
    if (this.era !== 'era_lac_long_quan') return this.practice && !this.practice.done ? T('obj_practice') : T('obj_end');
    if (!this.villagerSaved) return T('obj_find_villager');
    if (!f.has(FREED_FLAG)) return T('obj_boss');
    if (!f.has('crafted:rcp_nanh_dam')) return this.zone === 'hub' || this.zone === 'hub_bank' ? T('obj_craft') : T('obj_return');
    return T('obj_handoff');
  }

  updateHud() {
    const p = this.player, d = p.drum, seg = d.t.points_per_segment;
    const drum = [0, 1, 2, 3].map((k) => Math.max(0, Math.min(1, (d.points - k * seg) / seg)));
    const b = this.boss;
    const bossOn = this.era === 'era_lac_long_quan' && b.engaged && b.state !== 'freed' && b.state !== 'gone' && Math.hypot(b.x - p.x, b.z - p.z) < 30;
    this.ui.updateHud({
      hp: p.hp, hpMax: p.hpMax, the: p.the.ratio, drum, drumReady: d.canBurst(), heals: p.heals,
      weaponName: this.loc(p.weapon.name), slotText: this.gen.slots > 1 ? `[1] [2]` : '',
      points: `${this.i18n.t('skills_points')}: ${this.gen.skills.points} [K]`,
      zone: this.zoneName(), objective: this.objective(), fps: this.settings.showFps ? this.fps : null,
      boss: bossOn ? { name: this.loc(b.def.name), phase: this.loc(b.enc.phase.name), hp: b.enc.hpRatio, the: b.posture.ratio,
        cracks: b.enc.khoen.cracks, showCracks: b.enc.khoen.enabled } : null,
    });
    if (this.playTime > 2) this.fpsAvg = Math.round(this.fps);
  }

  // ------------------------------------------------------------------ debug hook (only with ?debug=1)
  debugApi() {
    const g = this;
    const enemyInfo = (e) => ({ uid: e.uid, id: e.def.id, state: e.state, hp: e.hpNow, the: e.posture.accumulated, theMax: e.posture.max,
      staggered: e.staggered, x: e.x, z: e.z, alive: e.alive, tele: e.telegraphKind, attack: e.attack?.id ?? null });
    return {
      state() {
        const b = g.boss;
        return { lock: g.lockTarget?.uid ?? null, mode: g.mode, era: g.era, character: g.gen.character, zone: g.zone, lang: g.i18n.lang, screen: g.ui.screenName, locked: g.locked,
          player: { x: g.player.x, z: g.player.z, yaw: g.player.yaw, hp: g.player.hp, state: g.player.state, drum: g.player.drum.points, alive: g.player.alive },
          enemies: g.enemies.filter((e) => !e.isBoss).map(enemyInfo), practice: (g.practiceEnemies ?? []).map(enemyInfo),
          boss: { ...enemyInfo(b), cracks: b.enc.khoen.cracks, khoen: b.enc.khoen.state, phase: b.enc.phase.id, canFinish: b.enc.canFinish(), outcome: b.enc.outcome },
          pageNow: performance.now(), pry: g.pry ? { slotAtMs: g.lastNow + g.pry.judge.timeToSlot * 1000, timeToSlot: g.pry.judge.timeToSlot, beat: g.pry.judge.beat, window: g.pry.judge.window, interval: g.pry.judge.interval, hold: g.pry.judge.holdMode, auto: g.pry.judge.auto } : null,
          flags: [...g.gen.flags], inventory: g.inv.toJSON(), owned: g.gen.owned, codex: [...g.codex], secret: g.secret.toJSON(),
          skills: g.gen.skills.toJSON(), practiceState: g.practice ? { swaps: g.practice.swaps, done: g.practice.done } : null,
          pryLog: (g.pryLog ?? []).slice(-12), fps: g.fps, missingStrings: g.i18n.missingKeys(), buildId: g.buildId };
      },
      teleport(x, z, yaw) { g.player.x = x; g.player.z = z; if (yaw != null) { g.player.yaw = yaw; } },
      faceEnemy(uid) {
        const e = [...g.enemies, ...(g.practiceEnemies ?? [])].find((x) => x.uid === uid);
        if (e) { g.player.yaw = Math.atan2(e.x - g.player.x, e.z - g.player.z); g.cam.yaw = Math.atan2(-(e.x - g.player.x), -(e.z - g.player.z)); }
      },
      setGod(on) { g.player.invulnDebug = !!on; },
      hitEnemy(uid, hp, the) { const e = [...g.enemies, ...(g.practiceEnemies ?? [])].find((x) => x.uid === uid); const r = e?.receiveHit({ hp, the }); if (e) g.onHitResult(e, r); return r; },
      setCameraYaw(y) { g.cam.yaw = y; },
      freezeEnemy(uid, on) { const e = g.enemies.find((x) => x.uid === uid); if (e) e.engaged = !on && e.engaged; if (e && on) { e.state = 'idle'; e.spawn = { x: e.x, z: e.z }; } },
      setDifficulty(id) { g.updateSettings({ difficulty: id }); },
      setAcc(k, v) { g.updateSettings({ acc: { [k]: v } }); },
      give(id, n) { g.give(id, n); },
      gather() { for (const pt of POINTS.filter((x) => x.kind === 'gather')) if (!g.gathered.has(pt.id)) { g.gathered.add(pt.id); g.props.rattan[pt.id].visible = false; g.inv.add('mat_day_may', 1); } },
      points: () => POINTS.map((p) => ({ id: p.id, kind: p.kind, x: p.x, z: p.z })),
    };
  }
}
