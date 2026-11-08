// game.js - orchestration: loop, camera, flow (title → Cói's lifetime → handoff → Bương → end),
// combat resolution between actors, interactions, secrets, crafting, codex, pry sequence.
import * as THREE from 'three';
import { createI18n } from '../logic/i18n.js';
import { resolveDifficulty } from '../logic/difficulty.js';
import { HitStopClock, hitStopFor, shakeFor } from '../logic/hitstop.js';
import { AttackTokens } from '../logic/enemyAi.js';
import { Outcome } from '../logic/defense.js';
import { enemyHitDamage, parryTheDamage, playerHitDamage, burstHitDamage } from '../logic/damage.js';
import { pickLockTarget, shouldBreakLock, softAimTarget, angleBetween, pickSwitchTarget } from '../logic/lockon.js';
import { sweepHits, playerKnockback } from '../logic/attackMotion.js';
import { SecretChain } from '../logic/secrets.js';
import { INPUT_GRACE_S } from '../logic/shackle.js';
import { Inventory, craft, missingFor, baoKhiEffect } from '../logic/crafting.js';
import { newGeneration, handoff, handoffWarnings, skillPointsFor, eraTags, forbiddenHits } from '../logic/lineage.js';
import { PROTO } from '../logic/proto.js';
import { buildWorld, Walkable, POINTS, SPAWNS, zoneAt, mulberry32, encounterSpawns, CORRIDOR_IDS } from './world.js';
import { Enemy, normAngle } from './enemy.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { UI } from './ui.js';
import { makeTusk } from './meshes.js';
import { createFx, gameStep } from '../fx/index.js';
import { GameFxHooks } from '../fx/hooks.js';
import { Gameplay03 } from './gameplay03.js';
import { createGameProgress, installUi03 } from '../ui/inventory/index.js'; // Demo 0.3 Pack / map / minimap
import { StoryDirector } from '../story/director.js'; // Story Integration 0.4: cut-scenes, NPCs, dialogue, quests

const SETTINGS_KEY = 'ngb_demo01_settings_v1';
const WEIGHT_RANK = { light: 0, medium: 1, heavy: 2, finisher: 3 };
const _proj = new THREE.Vector3();
const START_CODEX = ['cx_ben_lau', 'cx_mui_sao', 'cx_bronze_weapons', 'cx_ho_tinh'];
const FREED_FLAG = 'flag_boss_lon_loi_freed';
const MAX_SIM_DT_S = 0.1;  // clamp of one simulation step (s)
const MAX_WALL_DT_S = 0.5; // clamp of one real-time step (s)
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
    // Control options from controls.json (acc_sprint_mode 'device' = hold on keyboard / toggle on pad).
    for (const o of this.data.controls.accessibility_options) {
      if (o.uses_existing || o.type === 'action' || o.id in acc) continue;
      acc[o.id] = o.id === 'acc_sprint_mode' ? 'device' : Array.isArray(o.default) ? [...o.default] : o.default;
    }
    const def = { lang: 'vi', difficulty: this.data.combat.difficulty.default, custom: {}, acc, showFps: false, hints: true, volume: 0.7, sens: 1, gfx: 'high' };
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
    this.fx?.setQuality(s.gfx);
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
    encounterSpawns(this.data.enemies); // enemies.json encounters_0_2 -> SPAWNS.enemies
    const w = buildWorld();
    this.scene = w.scene; this.props = w.props;
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
    this.walk = new Walkable();
    this.input = new Input(r.domElement, this.data.controls, () => this.settings.acc);
    this.input.flickThreshold = this.data.combat.lock_on.switch_stick_threshold;
    this.sfx = new Sfx();
    // VFX / lighting / hit sounds (src/fx). Hooks: this.fxh.<event>(...) — list in src/fx/README.md.
    this.fx = createFx(this.scene, this.camera, r, this.sfx, {
      overlayParent: this.container, feel: this.data.combat.feel, shake: this.data.combat.camera_shake,
      shakeEnabled: () => !!this.settings.acc.acc_camera_shake, reduceFlash: () => !!this.settings.acc.acc_reduce_flash,
    });
    this.fx.attachWorld(w);
    this.fx.setQuality(this.settings.gfx);
    this.hitstop = new HitStopClock(0);
    this.cam = { yaw: 0, pitch: 0.38, dist: this.data.combat.feel?.camera_distance_m ?? 6.5, fx: 0, fy: 1.6, fz: 0, init: false, punchX: 0, punchY: 0, punchZ: 0, pvx: 0, pvy: 0, pvz: 0, orbit: 0, lookBias: 0 };
    this.feedbackLog = [];
    this.ui = new UI(this.container, this);
    this.story = new StoryDirector(this); // Story 0.4 (src/story): DOM layer now, world props in buildNpcs()
    this.progress = createGameProgress(this); // Demo 0.3 progression API (logic/progression.js)
    this.tokens = new AttackTokens(this.data.combat.enemy_ai);
    this.applySettings();
    this.newGameState();
    this.player = new Player(this);
    this.fxh = new GameFxHooks(this, this.fx);
    this.gp = new Gameplay03(this); // Demo 0.3 gameplay: jump, Arts, riposte, Ghì nanh, cinematic burst, boss arena
    this.applySettings();
    this.spawnWorldEnemies();
    this.buildNpcs();
    this.ui03 = installUi03(this); // Pack (B), map (M), minimap, exploration
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
    this.progress?.reset(); this.ui03?.reset(); this.story?.reset();
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
    this._rebuildAll();
  }
  _rebuildAll() { this._all = [...(this.enemies ?? []), ...(this.practiceEnemies ?? [])]; }
  /** Every enemy actor in play (world + practice); cached, no per-frame allocation. */
  allEnemies() { return this._all ?? []; }

  /** Story NPCs (src/story/director.js): Bà Mơ, Nghệ (the entranced villager), Năn, Đót, Bác Sung, Ông Vầu, Bé Kê.
   *  this.villager = Nghệ and this.elder = Ông Vầu keep the 0.1-0.3 call sites working. */
  buildNpcs() { this.story.build(); }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.fx?.setSize(w, h);
  }

  checkpointPos() {
    const p = POINTS.find((x) => x.id === this.checkpoint) ?? POINTS[0];
    return { x: p.x - 1.5, z: p.z + 1.5 };
  }

  after(s, fn) { this.timers.push({ t: s, fn }); }

  // ------------------------------------------------------------------ flow
  /** HTML key glyph for an action, for the device in use (controls.json bindings). */
  kbd(action) { return this.ui.kbd(action); }
  glyphText(action) { return this.ui.glyphText(action); }

  startGame() {
    this.sfx.init(); this.sfx.setVolume(this.settings.volume); this.sfx.startAmbience();
    this.ui.close();
    this.input.clearAll();
    for (const id of START_CODEX) this.codexUnlock(id, true);
    this.input.requestLock();
    // Cold open (cinematics.json cin_cold_open, 90 s, hold to skip); the main quest starts on its end and the
    // key tips come after it (STORY_INTEGRATION_0_4 §3: no key toasts over the opening).
    this.story.play('cin_cold_open', { onEnd: () => this._afterColdOpen() });
    if (this.opts.skipIntro) this.story.skip();
  }
  _afterColdOpen() {
    this.mode = 'playing'; this.ui.showHud(true); this.input.clearAll(); this.input.requestLock();
    this.player.respawn({ x: -1.2, z: 21.4 }); this.player.yaw = Math.PI;
    const g = (a) => this.glyphText(a);
    const tips = [['tut2_move', () => ({ move: [g('move_up'), g('move_left'), g('move_down'), g('move_right')].join(''), sprint: g('sprint'), walk: g('walk') })],
      ['tut4_parry', () => ({ key: g('parry') })], ['tut2_unparryable', () => ({ key: g('dodge') })],
      ['tut2_lock', () => ({ key: g('lock_on') })], ['tut2_drum', () => ({ key: g('drum_burst') })]];
    tips.forEach(([k, v], i) => this.after(5 + i * 6, () => this.ui.toast(this.i18n.t(k, v()), 6)));
  }

  pause(tab) {
    if (this.mode !== 'playing') return;
    this.mode = 'paused'; this.input.exitLock(); this.ui.showPause(tab);
  }
  openScreen(name) {
    if (this.mode !== 'playing') return;
    if (['codex', 'journal', 'skills'].includes(name) && this.ui03) { this.ui03.openTab(name); return; } // tabs of the Pack (0.3)
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
    this._rebuildAll();
    this.walk.resetMud(); this.props.addedMud.visible = false;
    this.villager.root.position.set(10, this.walk?.groundAt?.(10, -81) ?? 0, -81); this.props.mist.visible = true; this.props.mist.material.opacity = 0.35;
    for (const g of Object.values(this.props.rattan)) g.visible = true;
    this.props.kilnPieces.forEach((m) => { m.visible = true; });
    this.props.hollow.visible = true; this.props.hubHouse2.visible = false; this.elder.root.visible = false;
    this.timers = [];
  }

  // ------------------------------------------------------------------ frame
  frame() {
    const now = performance.now();
    const rawDt = Math.max(0, (now - this.lastNow) / 1000);
    // Large hitches (tab switch, GC, slow machine) are clamped so the simulation never jumps.
    const realDt = Math.min(MAX_SIM_DT_S, rawDt);  // simulation step (then scaled by hit-stop)
    const wallDt = Math.min(MAX_WALL_DT_S, rawDt); // bounded real time for timers/UI; pry keeps rawDt to match input timestamps
    this._prevFrameS = rawDt; // duration of the frame that just ended (pry input grace)
    this.frameStart = this.lastNow; this.lastNow = now;
    this.fpsFrames.push(now); while (this.fpsFrames.length && now - this.fpsFrames[0] > 1000) this.fpsFrames.shift();
    this.fps = this.fpsFrames.length;
    this.input.pollGamepad();
    if (this.mode === 'playing') this.update(realDt, now / 1000, wallDt, rawDt);
    else if (this.mode === 'cinematic') { this.playTime += wallDt; this.story.updateCinematic(wallDt, this.input); }
    else if (this.mode === 'dialogue') { this.playTime += wallDt; this.story.updateDialogue(wallDt, this.input); }
    else { this.handleMenuKeys(); this._menuAnim(wallDt); }
    this.story?.uiTick(wallDt);
    this.ui.tick(wallDt);
    this.ui03?.tick(wallDt);
    this.render(wallDt);
    this.input.endFrame();
  }

  handleMenuKeys() {
    const i = this.input;
    if (i.capture) return; // remap screen is waiting for a key
    if (this.ui03?.menuKeys(i, Math.min(MAX_WALL_DT_S, (performance.now() - this.frameStart) / 1000))) return; // Pack handles its own keys
    if (this.ui.screenName) this.ui.menuNav(i); // pad / keyboard navigation (ui_* actions of controls.json)
    if (this.mode === 'paused' && (i.pressed('menu') || (i.pressed('codex') && this.ui.screenName === 'codex')
      || (i.pressed('journal') && this.ui.screenName === 'journal') || (i.pressed('skills') && this.ui.screenName === 'skills'))) this.resume();
  }

  update(realDt, nowS, wallDt = realDt, pryDt = wallDt) {
    const i = this.input;
    this.playTime += wallDt;
    this.simTime = (this.simTime ?? 0) + realDt; // clamped simulation seconds (tests wait on this, not on wall time)
    // timers (real time)
    for (const t of this.timers) t.t -= wallDt;
    const due = this.timers.filter((t) => t.t <= 0); this.timers = this.timers.filter((t) => t.t > 0);
    for (const t of due) t.fn();
    if (this.mode !== 'playing') return;
    if (i.pressed('menu')) { this.pause('settings'); return; }
    if (this.ui03?.update(i, wallDt)) return; // B / M open the Pack; fog + lookouts
    if (i.pressed('codex')) { this.openScreen('codex'); return; }
    if (i.pressed('journal')) { this.openScreen('journal'); return; }
    if (i.pressed('skills')) { this.openScreen('skills'); return; }
    if (i.pressed('fps')) this.updateSettings({ showFps: !this.settings.showFps });

    // Game step: hit-stop, then FX slow-mo (fx.timeScale). The pry rhythm and timers below use
    // wallDt and are never scaled (QA S2; contract in src/fx/logic.js TimeScale).
    const dt = gameStep(realDt, this.hitstop, this.fx.time);
    this.gameNow = (this.gameNow ?? 0) + dt;
    const p = this.player;
    this.updateLock(i);
    // The pry rhythm uses unclamped elapsed time, NOT simulation or UI time, so it stays in
    // sync with the drum the player hears (QA: hit-stop on beats 1-2 must not shift beat 3).
    if (this.pry && !this.debugPryFrozen) this.updatePry(pryDt, i);
    this.noAttack = this.boss?.state === 'transition'; // set piece: move / guard / dodge only
    this.input.lockFlick = !!this.lockTarget;
    p.update(dt, this.gameNow, i);
    this.tokens.tick(dt);
    for (const e of this.allEnemies()) e.update(dt);
    this.gp?.update(dt, wallDt, i);
    this._updateFinisher(wallDt);
    this.updateZone();
    if (!this.locked) this.updateInteractions(realDt, i); else this.ui.prompt(null);
    this.updatePractice();
    this.updateCamera(realDt, i);
    this.fxh.update(wallDt);
    this.story.tick(wallDt);
    this.updateHud(wallDt);
  }

  // ------------------------------------------------------------------ camera
  updateCamera(dt, input) {
    const c = this.cam, p = this.player, feel = this.data.combat.feel ?? {}, tun = this.data.combat;
    const d = input.cameraDelta(dt);
    const sens = 0.0024 * this.settings.sens;
    const lt = this.lockTarget, fin = this.finishing;
    if (!fin) { c.yaw -= d.dx * sens * (lt ? 0.25 : 1); c.pitch = Math.max(-0.15, Math.min(1.1, c.pitch + d.dy * sens)); }
    // Desired distance: base / sprint / lock-on / boss (keeps the whole boss in frame) / pry / finisher.
    const bossNear = this.boss && (lt === this.boss || (this.boss.engaged && this.boss.alive && this.zone === 'z_dau_truong'));
    let want = feel.camera_distance_m ?? 6.5;
    if (p.sprinting) want = feel.camera_sprint_distance_m ?? 7.3;
    if (lt) want = feel.camera_lock_on_distance_m ?? 7.0;
    if (bossNear) want = feel.camera_boss_distance_m ?? 8.5;
    let orbit = 0;
    if (this.pry) { const beat = this.pry.judge.beat; want = (tun.pry.camera_distance_m ?? 4.5) - beat * (tun.pry.camera_push_per_beat_m ?? 0.25); orbit = beat * (tun.pry.camera_orbit_per_beat_deg ?? 12) * Math.PI / 180; }
    if (fin) { want = tun.finisher?.camera_distance_m ?? 4.8; orbit = (tun.finisher?.camera_orbit_deg ?? 30) * Math.PI / 180 * fin.side; }
    if (this.gp && !fin && !this.pry) ({ want, orbit } = this.gp.cameraShot(want, orbit, dt)); // 0.3 scripted shots
    c.orbit += (orbit - c.orbit) * Math.min(1, dt * (fin ? 5 : 3));
    c.dist += (want - c.dist) * Math.min(1, dt * (fin ? 6 : 2.5));
    if (lt) {
      // Smooth lock-on: yaw eases toward "behind the player, facing the target"; the frame centre is
      // biased toward the target (more for the boss) so both stay on screen.
      const yawWant = Math.atan2(-(lt.x - p.x), -(lt.z - p.z));
      c.yaw += normAngle(yawWant - c.yaw) * Math.min(1, dt * 4.5);
      c.pitch += ((lt.isBoss ? 0.4 : 0.32) - c.pitch) * Math.min(1, dt * 3);
    }
    const bias = lt ? (lt.isBoss ? 0.35 : 0.18) : 0;
    c.lookBias += (bias - c.lookBias) * Math.min(1, dt * 4);
    // Follow lag on the focus point (feel.camera_follow_lag_s).
    // Focus height follows the ground under the player (world_0_4 heightmap, Player.groundY smoothing).
    const tx = p.x + (lt ? (lt.x - p.x) * c.lookBias : 0), tz = p.z + (lt ? (lt.z - p.z) * c.lookBias : 0), ty = 1.6 + (lt?.isBoss ? 0.3 : 0) + (p._gy ?? 0);
    if (!c.init || Math.hypot(tx - c.fx, tz - c.fz) > 8) { c.fx = tx; c.fy = ty; c.fz = tz; c.init = true; }
    const k = 1 - Math.exp(-dt / Math.max(0.01, feel.camera_follow_lag_s ?? 0.08));
    c.fx += (tx - c.fx) * k; c.fy += (ty - c.fy) * k; c.fz += (tz - c.fz) * k;
    // Directional punch (spring) from hits: the camera is shoved along the blow.
    const w = 2 * Math.PI * 7, z = 0.6, n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let s2 = 0; s2 < n; s2++) {
      c.pvx += (-2 * z * w * c.pvx - w * w * c.punchX) * h; c.punchX += c.pvx * h;
      c.pvy += (-2 * z * w * c.pvy - w * w * c.punchY) * h; c.punchY += c.pvy * h;
      c.pvz += (-2 * z * w * c.pvz - w * w * c.punchZ) * h; c.punchZ += c.pvz * h;
    }
    const yaw = c.yaw + c.orbit;
    this.camera.position.set(c.fx + Math.sin(yaw) * Math.cos(c.pitch) * c.dist + c.punchX, c.fy + Math.sin(c.pitch) * c.dist + c.punchY, c.fz + Math.cos(yaw) * Math.cos(c.pitch) * c.dist + c.punchZ);
    // Never inside the ground: keep the eye 0.45 m above the terrain under it (hills, banks, knolls).
    const cp = this.camera.position, gMin = this.walk.groundAt(cp.x, cp.z) + 0.45;
    if (cp.y < gMin) cp.y = gMin;
    this.camera.lookAt(c.fx, c.fy, c.fz);
    this.fx.applyCamera(); // shake offset (obeys acc_camera_shake)
  }
  /** Directional camera shove (m/s impulse along dir {x,z}); obeys acc_camera_shake. */
  cameraPunch(dx, dz, strength) {
    if (!this.settings.acc.acc_camera_shake) return false;
    const l = Math.hypot(dx, dz) || 1, c = this.cam;
    c.pvx += (dx / l) * strength; c.pvz += (dz / l) * strength; c.pvy -= strength * 0.35;
    return true;
  }
  shake(weight) { this.fx.cameraShake(shakeFor(this.data.combat.camera_shake, weight), this.data.combat.camera_shake.duration_s ?? 0.25); }

  /** While a menu is open the scene still shows the player working (craft at the furnace). */
  _menuAnim(wallDt) {
    const p = this.player; if (!p) return;
    if (this.mode === 'paused' && this.ui.screenName === 'craft') { p.animOverride = 'craft'; p._anim(wallDt); }
  }
  render(wallDt = 0) {
    if (!this.renderer) return;
    const t = performance.now() / 1000;
    for (const f of Object.values(this.props.fires)) f.scale.y = 1 + Math.sin(t * 9 + f.id) * (this.settings.acc.acc_reduce_flash ? 0.02 : 0.12);
    // FX run on real time and freeze while paused / in menus.
    const live = this.mode === 'playing' || this.mode === 'cinematic' || this.mode === 'dialogue';
    this.fx.update(live && !this.debugFxFrozen ? wallDt : 0, this.player);
    this.fx.render();
    if (this.mode === 'playing' || this.mode === 'paused') this.updateMarkers();
  }

  updateMarkers() {
    const v = _proj, w = innerWidth, h = innerHeight, list = this._markerList ?? (this._markerList = []);
    list.length = 0;
    for (const e of this.allEnemies()) {
      const visible = e.alive && Math.hypot(e.x - this.player.x, e.z - this.player.z) < 30;
      v.set(e.x, (MARKER_H[e.def.id] ?? 2.2) * 0.6, e.z).project(this.camera);
      e.onScreen = v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95; // enemy_ai token priority / off-screen cue
      if (!visible) { list.push({ id: e.uid, visible: false }); continue; }
      v.set(e.x, MARKER_H[e.def.id] ?? 2.2, e.z).project(this.camera);
      const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      e.screenX = (v.x + 1) / 2 * w; e.screenY = (1 - v.y) / 2 * h;
      list.push({ id: e.uid, visible: on, sx: e.screenX, sy: e.screenY, tele: e.telegraphKind,
        locked: this.lockTarget === e, showBars: !e.isBoss && (e.engaged || this.lockTarget === e), hp: e.hpNow / e.hpMax, the: e.posture.ratio });
    }
    this.ui.updateMarkers(list);
  }

  // ------------------------------------------------------------------ lock-on
  lockCandidates() {
    return this.allEnemies().filter((e) => e.lockable).map((e) => ({ id: e.uid, x: e.x, z: e.z, e }));
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
      if (i.isDown('lock_on') && !this.lockTarget) this.lockTarget = pick();
      if (!i.isDown('lock_on')) this.lockTarget = null;
    } else if (i.pressed('lock_on')) {
      const had = this.lockTarget;
      this.lockTarget = had ? null : pick();
      if (!had && !this.lockTarget) this.cam.yaw = Math.atan2(-Math.sin(p.yaw), -Math.cos(p.yaw)); // no target: recentre behind
    }
    // Switch target (wheel / right-stick flick): lock_prev / lock_next.
    if (this.lockTarget && (i.pressed('lock_prev') || i.pressed('lock_next'))) {
      const c = this.lockCandidates(), cur = c.find((x) => x.e === this.lockTarget);
      const id = pickSwitchTarget(p, fwd, cur, c, lt, i.pressed('lock_next') ? 1 : -1);
      const e = c.find((x) => x.id === id)?.e; if (e) this.lockTarget = e;
    }
    if (this.lockTarget && (!this.lockTarget.lockable || shouldBreakLock(p, this.lockTarget, lt))) this.lockTarget = null;
  }
  softAim() {
    if (!this.diff.aimAssist) return null;
    const p = this.player, c = this.lockCandidates();
    const id = softAimTarget(p, { x: Math.sin(p.yaw), z: Math.cos(p.yaw) }, c, this.data.combat.lock_on, 4);
    return c.find((x) => x.id === id)?.e ?? null;
  }

  // ------------------------------------------------------------------ combat resolution
  /**
   * Swept hit for one frame of the player's active window (player._updateAttack): every enemy the
   * weapon passes through this frame is hit once per move (attack_motion.hit_detection).
   */
  sweepStrike(cur, u0, u1, postPerfectDodge) {
    const p = this.player, move = cur.move;
    const heavyRef = p.weapon.moves.find((m) => m.input === 'H');
    const spec = this._sweepSpec ?? (this._sweepSpec = { hitbox: 'line', range: 2, arcDeg: 20, sweepDir: 1 });
    spec.hitbox = cur.motion.hitbox; spec.range = move.range_m ?? heavyRef.range_m; spec.arcDeg = move.arc_deg ?? heavyRef.arc_deg; spec.sweepDir = cur.sweepDir;
    const att = this._att ?? (this._att = { x: 0, z: 0, yaw: 0 }); att.x = p.x; att.z = p.z; att.yaw = p.yaw;
    const weight = cur.kind === 'house' ? 'heavy' : move.hit_weight;
    let hits = 0;
    for (const e of this.allEnemies()) {
      if (!e.alive || e.state === 'pried' || cur.hit.has(e)) continue;
      if (!sweepHits(att, e, spec, u0, u1)) continue;
      cur.hit.add(e);
      const toP = angleBetween(Math.sin(e.yaw), Math.cos(e.yaw), p.x - e.x, p.z - e.z);
      const dmg = playerHitDamage({ move, chargeLevel: cur.level, kind: cur.kind === 'sprint' || cur.kind === 'swap' ? 'chain' : cur.kind, difficulty: this.diff, mods: this.mods, baoKhi: this.baoKhi,
        frontal: toP <= PROTO.frontArcDeg / 2, frontMult: e.frontMult ?? 1, postPerfectDodge });
      dmg.the *= cur.motion.theMult; // sprint_attack / swap_attack Thế multiplier
      // Dụi cổ: a blow on the neck from the side gets exposed_neck_the_mult (aim at the binding, not the beast).
      if (e.neckExposed && e.attack) {
        const side = Math.abs(90 - toP) <= (e.attack.exposed_side_arc_deg ?? 90) / 2;
        if (side) { dmg.the *= e.attack.exposed_neck_the_mult ?? 1.5; this.feedbackNote = 'neck'; }
      }
      const r = e.receiveHit(dmg, { weight, motion: cur.motion, fromX: p.x, fromZ: p.z });
      if (!r) continue;
      if (cur.kind === 'house') { const l = Math.hypot(e.x - p.x, e.z - p.z) || 1; const m = this.walk.move(e.x, e.z, (e.x - p.x) / l * 2, (e.z - p.z) / l * 2, e.radius * 0.6); e.x = m.x; e.z = m.z; }
      this._hitFeedback(e, weight, r, cur.kind, dmg);
      this.onHitResult(e, r);
      hits++;
    }
    this.hitDummies(cur, spec, att, u0, u1);
    if (hits && !cur.hitAny) { cur.hitAny = true; p.drum.gain(cur.kind === 'chain' || cur.kind === 'dodge_attack' || cur.kind === 'sprint' || cur.kind === 'swap' ? 'light_hit' : 'heavy_hit'); }
  }

  /** The feedback layers of one landed hit (FUN_PASS_0_2 P0-4, feel.min_feedback_layers_per_hit). */
  _hitFeedback(e, weight, r, kind, dmg) {
    const p = this.player, feel = this.data.combat.feel ?? {}, layers = [];
    this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, weight)); layers.push('hitstop');
    this.fxh.playerHitEnemy(e, weight, r, kind); layers.push('impact_particles', 'impact_sound', 'hit_flash'); // sparks/dust + layered sound + flash
    this.shake(weight); layers.push('camera_shake');
    const dx = e.x - p.x, dz = e.z - p.z;
    if (this.cameraPunch(dx, dz, WEIGHT_RANK[weight] >= 2 ? 1.6 : WEIGHT_RANK[weight] === 1 ? 1.0 : 0.6)) layers.push('camera_punch_directional');
    if (Math.abs(r.knockM ?? 0) > 1e-3 || (r.flinchS ?? 0) > 0) layers.push('knockback_flinch');
    const heavy = WEIGHT_RANK[weight] >= 2;
    if (this.input.rumble(heavy ? feel.rumble_heavy_strength ?? 0.6 : feel.rumble_light_strength ?? 0.25, heavy ? feel.rumble_heavy_s ?? 0.15 : feel.rumble_light_s ?? 0.06)) layers.push('rumble');
    this.ui.popup(e, Math.round(dmg.the), r.broke ? 'break' : this.feedbackNote === 'neck' ? 'neck' : ''); layers.push('the_popup');
    this.feedbackNote = null;
    if (heavy) layers.push('fov_kick');
    this.feedbackLog.push({ t: +this.gameNow.toFixed(2), enemy: e.def.id, weight, layers });
    if (this.feedbackLog.length > 30) this.feedbackLog.shift();
  }

  /** Training dummies on the river bank react to the same sweep. */
  hitDummies(cur, spec, att, u0, u1) {
    if (!this.practice) return;
    cur.dummies ??= new Set();
    for (const d of this.props.dummies) {
      if (cur.dummies.has(d)) continue;
      if (!sweepHits(att, { x: d.position.x, z: d.position.z, radius: 0.4 }, spec, u0, u1)) continue;
      cur.dummies.add(d);
      d.rotation.z = 0.3; setTimeout(() => { d.rotation.z = 0; }, 160); this.fxh.dummyHit(d);
      if (!this.practice.dummyBark) { this.practice.dummyBark = true; this.story?.bark('dummy_broken'); }
    }
  }
  _targetsInReach(range, arcDeg) {
    const p = this.player, fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), out = [];
    for (const e of this.allEnemies()) {
      if (!e.alive || e.state === 'pried') continue;
      const dx = e.x - p.x, dz = e.z - p.z;
      const along = dx * fx + dz * fz, lateral = Math.abs(dx * fz - dz * fx), dist = Math.hypot(dx, dz);
      if (dist > range + e.radius) continue;
      const ang = angleBetween(fx, fz, dx, dz);
      if (ang <= arcDeg / 2 || (along > 0 && lateral <= e.radius + 0.3) || dist < e.radius + 0.3) out.push(e);
    }
    return out;
  }

  playerBurstHit(burst, last) {
    const w = this.player.weapon, range = Math.max(...w.moves.filter((m) => m.input === 'L').map((m) => m.range_m));
    const targets = this._targetsInReach(range, 90);
    this.sfx.drum(last);
    const weight = last ? burst.hit_weight : 'medium';
    for (const e of targets) {
      const dmg = burstHitDamage(burst, this.diff, this.mods);
      const r = e.receiveHit(dmg, { weight, fromX: this.player.x, fromZ: this.player.z });
      if (r) this.ui.popup(e, Math.round(dmg.the), r.broke ? 'break' : '');
      this.onHitResult(e, r);
    }
    this.fxh.burstHit(targets, last, weight);
    if (targets.length) { this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, weight)); this.shake(weight); this.input.rumble(last ? 0.7 : 0.35, last ? 0.2 : 0.08); }
  }

  /** Heavy charge reached a level: tip glint, small drum, lens push, rumble. */
  onChargeLevel(p, level) { this.fxh.chargeLevel(p, level); this.input.rumble(0.3 + 0.2 * level, 0.08); }

  onHitResult(e, r) {
    if (!r) return;
    if (r.broke) {
      this.player.drum.gain('the_break'); this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, 'heavy')); this.fxh.postureBreak(e);
      this.sfx.drum(true); this.input.rumble(0.7, 0.2);
      if (!e.isBoss) this.story?.bark('guard_break');
    }
    if (r.cracked) { this.fxh.khoenCrack(e); this.ui.center(this.i18n.t('msg_khoen_crack', { n: e.enc.khoen.cracks }), 1.6); }
    if (r.phaseChanged) this.onBossPhase2(e);
  }

  onBossPhase2(e) {
    this.codexUnlock('cx_khoen');
    if (e.enc.phase.transition_set_piece_0_2?.replaces_transition_beat) return; // the line comes in the set piece
    const d = this.i18n.dialogue('dlg_02_see_shard');
    this.say(d.speaker, d.text, 4);
    this.sfx.telegraph('boar_pain', 'nodamage', 0);
  }

  /** Set piece "Húc cọc" (enemies.json transition_set_piece_0_2) events from enemy.js. */
  onBossTransition(boss, ev) {
    this.gp?.onBossTransition(boss, ev); // 0.3: water recedes, stakes emerge
    const st = this.props.trapStake, top = this.props.trapStakeTop;
    switch (ev) {
      case 'start': this.lockTarget = boss; this.sfx.telegraph('boar_roar', 'nodamage', 0); this.transitionSeen = (this.transitionSeen ?? 0) + 1; break;
      case 'stake_hit':
        this.fxh.stakeHit(boss, st.position); this.sfx.impact?.('heavy', 'wood'); this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, 'heavy'));
        top.rotation.z = 1.4; top.position.y = 0.3; top.position.x = st.position.x + 0.9; // the stake snaps in two
        this.input.rumble(0.8, 0.25);
        break;
      case 'kneel': this.sfx.telegraph('boar_pain', 'nodamage', 0); break;
      case 'line': { const d = this.i18n.dialogue('dlg_02_see_shard'); this.say(d.speaker, d.text, 4); break; }
      case 'stand': {
        this.after(1.6, () => this.story.bark('boss_phase2_stakes_revealed', { force: true, seconds: 3 }));
        // The fourth mud pool spreads where the stake fell (arena_change: mud_pool_added_at_stake).
        const r = 2.6; this.walk.addMudPool(st.position.x, st.position.z, r);
        const m = this.props.addedMud; m.position.set(st.position.x, 0.025, st.position.z); m.scale.setScalar(r); m.visible = true;
        break;
      }
      default: break;
    }
  }

  onTelegraph(enemy, atk, kind, family, offscreen = false) {
    const p = this.player;
    const rel = normAngle(Math.atan2(enemy.x - p.x, enemy.z - p.z) - Math.atan2(-Math.sin(this.cam.yaw), -Math.cos(this.cam.yaw)));
    // Off-screen attacks always pan their cue toward the attacker (enemy_ai.offscreen_attack_requires_audio_cue).
    const pan = this.settings.acc.acc_attack_audio_cue || offscreen ? Math.sin(-rel) : 0;
    this.sfx.telegraph(family, kind, pan);
    if (kind === 'unparryable') this.input.rumble(0.6, 0.3);
  }

  enemyHitsPlayer(enemy, atk) {
    const p = this.player, g = this.data.combat.guard, hr = this.data.combat.hit_react ?? {};
    if (!p.alive || p.state === 'pry' || this.locked || p.invulnDebug || p.invulnerable) return;
    if (atk.damage <= 0) {
      if (!p.defense.invulnerable && atk.pushback_m) p.push(enemy.x, enemy.z, atk.pushback_m);
      return;
    }
    const outcome = p.defense.resolve({ parryable: atk.parryable, guardable: atk.guardable });
    const T = this.i18n.t, feel = this.data.combat.feel ?? {};
    switch (outcome) {
      case Outcome.PERFECT_DODGE:
        p.drum.gain('perfect_dodge'); this.sfx.dodge(true); this.fxh.perfectDodge(); this.ui.toast(T('msg_perfect_dodge'), 1.5);
        p.postPerfectDodgeUntil = this.gameNow + this.mods.postPerfectDodgeWindowS;
        this.gp?.onPerfectDodge(p);
        return;
      case Outcome.DODGED: return;
      case Outcome.PERFECT_PARRY: case Outcome.PARRIED: {
        const perfect = outcome === Outcome.PERFECT_PARRY;
        this.onHitResult(enemy, enemy.receiveTheDamage(parryTheDamage(outcome, g)));
        p.drum.gain(perfect ? 'perfect_parry' : 'parry');
        this.fxh.parry(enemy, perfect); this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, perfect ? 'medium' : 'light'));
        this.input.rumble(perfect ? feel.rumble_perfect_parry_strength ?? 0.8 : 0.35, perfect ? feel.rumble_perfect_parry_s ?? 0.08 : 0.06);
        enemy.mesh.hitReact?.(perfect ? 0.9 : 0.5, 0);
        this.ui.toast(T(perfect ? 'msg_perfect_parry' : 'msg_parry'), 1.5);
        if (perfect) p.perfectParryUntil = this.gameNow + g.perfect_parry_counter_window_s;
        if (perfect) this.gp?.onPerfectParry(enemy, atk); // 0.3 Phản nhịp
        if (perfect) this.story?.bark('perfect_parry');
        return;
      }
      default: {
        const dmg = enemyHitDamage(atk, outcome, g, this.diff);
        const knockM = outcome === Outcome.GUARDED ? playerKnockback(atk, hr) * 0.4 : playerKnockback(atk, hr);
        p.takeHit(dmg, !atk.parryable, outcome, { fromX: enemy.x, fromZ: enemy.z, knockM, knockdown: outcome === Outcome.HIT && !!atk.player_knockdown, attack: atk });
        if (outcome === Outcome.GUARDED) { this.fxh.guardBlock(enemy); this.input.rumble(0.3, 0.06); }
        else {
          this.shake(atk.parryable ? 'light' : 'heavy'); this.cameraPunch(p.x - enemy.x, p.z - enemy.z, atk.parryable ? 1.0 : 2.0);
          this.fxh.playerHurt(enemy, !atk.parryable); this.input.rumble(atk.parryable ? 0.5 : 0.9, atk.parryable ? 0.12 : 0.3);
          this.callProgress *= this.villagerHoldKept();
        }
        if (atk.applies?.status === 'slow' && outcome === Outcome.HIT) { p.slowT = atk.applies.duration_s; p.slowMult = atk.applies.speed_mult; }
      }
    }
  }
  villagerHoldKept() {
    const nc = this.data.enemies.non_combat_encounters[0];
    if (this.callProgress > 0 && (this.input.isDown('call_name') || this.callLatched)) this.ui.toast(this.i18n.t('msg_call_interrupted'), 2);
    this.callLatched = false;
    return nc.progress_kept_on_interrupt;
  }

  onBurst() { this.sfx.drum(true); this.fxh.drumBurst(); this.ui.center(this.loc(this.player.weapon.drum_burst.name), 1.2); this.story?.bark('drum_burst'); }

  onEnemyDefeated(e) {
    const key = e.def.defeat_behavior === 'dissipate' ? 'msg_enemy_dissipated' : 'msg_enemy_fled';
    this.ui.toast(this.i18n.t(key, { name: this.story?.creatureName(e.def) ?? this.loc(e.def.name) }), 2.5); // creatures_0_4 display name (id unchanged)
    if (!e.isBoss) this.after(0.6, () => this.story?.bark(e.def.defeat_behavior === 'dissipate' ? 'enemy_dissipated' : 'enemy_fled'));
    this.fxh.enemyDefeated(e);
    this.ui03?.onEnemyDefeated(e); // XP + drops (0.3)
    this.gp?.onEnemyDefeated(e);
    if (this.lockTarget === e) this.lockTarget = null;
    this.tokens.release(e.uid);
  }

  // ------------------------------------------------------------------ finisher (combat_tuning.finisher)
  /** Finisher on a broken normal enemy: 0.9 s, player invulnerable, low orbit camera, slow-mo on contact,
   *  the creature is flipped / swept / pierced and then flees or slumps (never killed). */
  startFinisher(e) {
    const f = this.data.combat.finisher ?? {}, p = this.player;
    p.startFinisher(e); e.startFinished(f.normal_duration_s ?? 0.9);
    const side = Math.sign(normAngle(this.cam.yaw - Math.atan2(-(e.x - p.x), -(e.z - p.z)))) || 1;
    this.finishing = { e, t: 0, dur: f.normal_duration_s ?? 0.9, contact: false, side };
    this.fx.setFovOffset('finisher', (f.camera_fov_deg ?? 52) - (this.data.combat.feel?.fov_base_deg ?? 60));
    this.finisherCount = (this.finisherCount ?? 0) + 1;
  }
  _updateFinisher(wallDt) {
    const f = this.finishing; if (!f) return;
    f.t += wallDt;
    if (!f.contact && f.t >= f.dur * 0.45) {
      f.contact = true;
      const hr = this.data.combat.hit_react ?? {};
      this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, 'finisher')); this.shake('heavy'); this.fxh.finisher(f.e);
      this.input.rumble(0.9, 0.2);
      const p = this.player, dx = f.e.x - p.x, dz = f.e.z - p.z, l = Math.hypot(dx, dz) || 1, km = hr.knockback_finisher_m ?? 1.5;
      f.e.knock = { vx: dx / l * km / 0.25, vz: dz / l * km / 0.25, t: 0.25 };
      this.cameraPunch(dx, dz, 1.6);
    }
    if (f.t >= f.dur) {
      this.player.endFinisher();
      this.finishing = null;
      this.fx.setFovOffset('finisher', 0);
    }
  }

  onPlayerDeath() {
    this.locked = true; this.lockTarget = null;
    this.ui.center(this.i18n.t('you_fell'), 2.5);
    this.after(2.2, () => this.ui.fade(true));
    this.after(2.8, () => {
      if (this.boss.state !== 'freed') this.resetBoss();
      this.restAt(this.checkpoint, false);
      this.ui.fade(false); this.locked = false;
      this.ui.toast(this.i18n.t('msg_respawn'), 3);
    });
  }
  resetBoss() {
    this.boss.reset(); this.walk.resetMud(); this.props.addedMud.visible = false;
    this.gp?.resetArena();
    const st = this.props.trapStake, top = this.props.trapStakeTop;
    top.rotation.z = 0.25; top.position.set(st.position.x + 0.25, 1.75, st.position.z);
  }

  restAt(pointId, showMsg = true) {
    this.checkpoint = pointId;
    this.player.respawn(this.checkpointPos());
    for (const e of this.enemies) if (!e.isBoss && e.def.respawns_at_checkpoint) e.reset();
    if (this.boss.state !== 'freed' && this.boss.state !== 'gone') this.resetBoss();
    if (showMsg) this.ui.toast(this.i18n.t('msg_rested'), 3);
  }

  /** Weapon slot key: validated here, the swap itself is a 0.15 s player action (weapon_swap). */
  swapWeapon(slot) {
    const p = this.player;
    if (this.locked || slot >= this.gen.slots || slot >= this.gen.weapons.length) return;
    p.requestSwap(slot);
  }
  onSwapped(p) {
    this.ui.toast(this.i18n.t('msg_swap', { name: this.loc(p.weapon.name) }), 1.5);
    this.sfx.whoosh(0.8, 'light');
    if (this.practice) this.practice.swaps += 1;
    this.story?.bark(p.weaponId === 'wp_riu_xeo' ? 'swap_to_axe' : 'swap_to_spear');
  }

  loc(o) { return this.i18n.loc(o); }
  speakerName(id) {
    const st = this.story?.speakerName(id); if (st) return st; // dialogue.json speakers (Bà Mơ, Năn, ...)
    const ch = this.data.lineage.characters.find((c) => c.id === id);
    if (ch) return this.loc(ch.name);
    if (id === this.data.secrets.chains[0].hint_giver.npc) return this.loc(this.data.secrets.chains[0].hint_giver.name);
    return this.i18n.t(`speaker_${id}`);
  }
  say(speaker, text, s) { this.ui.subtitle(speaker ? this.speakerName(speaker) : '', this.loc(text), s); }

  // ------------------------------------------------------------------ codex
  /** Codex list: codex.json entries + creature entries from creatures_0_4.json (Story 0.4). */
  codexEntries() { return this._codexAll ?? (this._codexAll = [...this.data.codex.entries, ...this.story.codexEntries()]); }
  codexUnlock(id, silent = false) {
    if (this.codex.has(id)) return false;
    const e = this.codexEntries().find((x) => x.id === id);
    if (!e) return false;
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
    if (z && !CORRIDOR_IDS.has(z)) {
      if (z !== this.zone && this.era === 'era_lac_long_quan') this.story.record('enter_zone', z);
      this.zone = z;
    }
    if (z === 'z_dau_truong' && !this.bossSeen && this.boss.state !== 'freed') {
      this.bossSeen = true; this.codexUnlock('cx_lon_loi_dam');
      this.after(1.2, () => this.story.bark('boss_intro', { force: true, seconds: 3.2 }));
    }
    if (z === 'z_bai_lau' && this.era === 'era_lac_long_quan' && !this.villagerSaved) this.codexUnlock('cx_suong_bai_lau');
    for (const pt of POINTS.filter((x) => x.kind === 'trace')) {
      if (!this.tracesSeen.has(pt.id) && this.era === 'era_lac_long_quan' && Math.hypot(pt.x - this.player.x, pt.z - this.player.z) < pt.r) {
        this.tracesSeen.add(pt.id); this.ui.subtitle('', this.loc(this.boss.def.intro_traces[pt.trace]), 4);
      }
    }
  }
  zoneName() {
    if (this.zone === 'hub') return this.loc(this.data.codex.entries.find((e) => e.id === 'cx_ben_lau').title);
    if (this.zone === 'hub_bank') return this.i18n.t('zone_bai_song');
    const l = this.data.secrets.locations.find((x) => x.id === this.zone) ?? this.data.map.zones?.find((x) => x.id === this.zone);
    return l?.name ? this.loc(l.name) : '';
  }
  secretVisible() { return this.era === this.secret.chain.era_restriction; }

  pointAvailable(pt) {
    const coi = this.era === 'era_lac_long_quan', freed = this.gen.flags.has(FREED_FLAG);
    switch (pt.kind) {
      case 'rest': case 'hint_npc': case 'ferry_to_hub': return coi;
      // trap_a is also step 1 of the main quest: inspectable for the quest even when the secret took the other trail.
      case 'secret': return coi && (this.secret.isAvailable(pt.node) || (pt.id === 'trap_a' && !this.story.quests.has('inspect', 'trap_a')));
      case 'kiln_piece': return coi && this.secret.isAvailable('sn_kiln');
      case 'gather': return coi && !this.gathered.has(pt.id);
      case 'call_name': return coi && !this.villagerSaved;
      case 'shortcut': return coi && !this.walk.gateOpen;
      case 'furnace': return coi;
      case 'thap': return true;
      case 'drum': return (coi && freed) || (!coi && this.practice?.done && !this.endReached);
      case 'ferry_to_marsh': return coi;
      case 'npc': case 'env_story': case 'quest_interact': return this.story.pointAvailable(pt);
      default: return this.ui03?.pointAvailable(pt) ?? false;
    }
  }

  promptFor(pt) {
    const T = this.i18n.t, coi = this.era === 'era_lac_long_quan';
    const k = (key) => `${this.kbd('interact')} ${this.ui.esc(T(key))}`;
    switch (pt.kind) {
      case 'rest': return k('prompt_rest');
      case 'hint_npc': return `${k('prompt_talk')} — ${this.ui.esc(this.speakerName('npc_ba_lai_do'))}`;
      case 'ferry_to_hub': case 'ferry_to_marsh': return k('prompt_board_ferry');
      case 'secret': return `${k('prompt_interact')} — ${this.ui.esc(this.loc(this.secret.node(pt.node).text))}`;
      case 'kiln_piece': return `${k('prompt_compare')} — ${this.ui.esc(T('kiln_piece', { n: pt.piece + 1 }))}`;
      case 'gather': return k('prompt_gather');
      case 'call_name': return `${this.kbd('call_name')} ${this.ui.esc(T(this.settings.acc.acc_call_name_mode === 'toggle' ? 'prompt_call_name_press' : 'prompt_call_name'))}`;
      case 'shortcut': return k('prompt_shortcut');
      case 'furnace': return k('prompt_craft');
      case 'thap': return k('prompt_open_thap');
      case 'drum': return k(coi ? 'prompt_handoff' : 'prompt_continue');
      case 'npc': case 'env_story': case 'quest_interact': return this.story.promptFor(pt);
      default: return this.ui03?.promptFor(pt) ?? '';
    }
  }

  updateInteractions(dt, i) {
    const p = this.player;
    p.animOverride = null;
    if (this.finishing) { this.ui.prompt(null); return; }
    if (this.gp?.interactions(dt, i)) return; // 0.3: Phản nhịp, Ghì nanh
    let best = null, bestD = Infinity;
    for (const pt of POINTS) {
      if (pt.kind === 'trace') continue;
      const d = Math.hypot(pt.x - p.x, pt.z - p.z);
      if (d <= pt.r && d < bestD && this.pointAvailable(pt)) { best = pt; bestD = d; }
    }
    // Finisher / pry targets take priority.
    let foe = null;
    for (const e of this.allEnemies()) {
      if (!e.alive || !e.staggered || e.state === 'finished') continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (e.isBoss ? e.enc.canFinish() && d < e.radius + 3.2 : d < e.radius + 2.2) foe = e;
    }
    const T = this.i18n.t;
    if (foe) {
      const key = foe.isBoss ? (foe.enc.khoen.enabled ? (this.settings.acc.acc_hold_instead_of_tap ? 'prompt_pry_hold' : 'prompt_pry') : 'prompt_finisher_shove') : 'prompt_finish_normal';
      this.ui.prompt(`${this.kbd('interact')} ${this.ui.esc(T(key))}`);
      if (i.pressed('interact') && p.state !== 'attack' && p.state !== 'finisher') {
        if (foe.isBoss) { if (foe.enc.khoen.enabled) this.startPry(foe); else this.shoveBoss(foe); }
        else this.startFinisher(foe);
      }
      return;
    }
    // Contextual vault: Interact next to a log / ditch (sprinting into it vaults automatically).
    const v = !best && (p.state === 'free' || p.state === 'guard') ? this.walk.nearVault(p.x, p.z, 1.2) : null;
    if (v) {
      this.ui.prompt(`${this.kbd('interact')} ${this.ui.esc(T('prompt_vault'))} · ${this.kbd('sprint')}`);
      if (i.pressed('interact')) { const land = this.walk.vaultAhead(p.x, p.z, p.yaw, this.data.combat.movement.contextual_vault?.max_gap_m ?? 2.5); if (land) p.startVault(land); }
      return;
    }
    if (!best) { this.ui.prompt(null); this.callProgress = this.villagerSaved ? 0 : this.callProgress; this.callLatched = false; return; }
    if (best.kind === 'call_name') {
      const nc = this.data.enemies.non_combat_encounters[0];
      // acc_call_name_mode: hold (default) or a single press that runs until done / hit / out of range.
      if (this.settings.acc.acc_call_name_mode === 'toggle') { if (i.pressed('call_name')) this.callLatched = !this.callLatched; } else this.callLatched = false;
      const holding = (i.isDown('call_name') || this.callLatched) && (p.state === 'free' || p.state === 'guard');
      if (holding) {
        this.callProgress = Math.min(1, this.callProgress + dt / nc.hold_s); p.animOverride = 'call';
        // Three calls of rising urgency (bk_s_call_1..3); the last points at the indigo strip on her pole.
        for (const [at, trig] of [[0, 'call_name_progress_0'], [0.5, 'call_name_progress_50'], [0.9, 'call_name_progress_90']]) {
          if (this.callProgress >= at && !this.story.callBarks.has(trig)) { this.story.callBarks.add(trig); this.story.bark(trig, { force: true, seconds: 2.4 }); }
        }
      }
      this.ui.prompt(this.promptFor(best), this.callProgress);
      if (this.callProgress >= 1) { this.callLatched = false; this.saveVillager(); }
      return;
    }
    this.ui.prompt(this.promptFor(best));
    if (i.pressed('interact') && p.state === 'free') this.interact(best);
  }

  interact(pt) {
    const T = this.i18n.t;
    switch (pt.kind) {
      case 'rest': this.restAt(pt.id); this.sfx.ui(); break;
      case 'hint_npc': if (!this.story.talk(pt.id, 'npc_ba_lai_do')) this.openScreen('hints'); break; // story first, then the 3-tier hints
      case 'ferry_to_hub':
        if (!this.gen.flags.has(FREED_FLAG)) { this.ui.toast(T('msg_ferry_locked'), 4); break; }
        this.travel(SPAWNS.hub_arrive); break;
      case 'ferry_to_marsh': this.travel({ x: 0, z: 27 }); break;
      case 'secret':
        if (this.secret.isAvailable(pt.node)) this.completeSecret(pt.node);
        else { this.story.inspect(pt.id); this.after(0.3, () => this.story.bark(`inspect:${pt.id}`, { force: true, seconds: 3.5 })); }
        break;
      case 'kiln_piece':
        if (pt.correct) { this.props.kilnPieces[pt.piece].visible = false; this.completeSecret('sn_kiln'); }
        else this.ui.toast(T('msg_puzzle_wrong'), 2.5);
        break;
      case 'gather': {
        this.gathered.add(pt.id); this.props.rattan[pt.id].visible = false;
        this.give('mat_day_may', 1); break;
      }
      case 'shortcut': this.walk.gateOpen = true; this.props.gate.visible = false; this.ui.toast(T('msg_shortcut_open'), 3); this.sfx.ui(); break;
      case 'furnace': {
        const open = () => {
          if (!this.gen.flags.has('flag_village_bronze')) { this.gen.flags.add('flag_village_bronze'); this.give('mat_dong_lo_lang', 1); }
          this.openScreen('craft');
        };
        // Bác Sung reads the trap blade first (cv_gianh_furnace, step 6), then the furnace opens.
        if (!this.story.talk('npc_tho_duc_lang', 'npc_tho_duc_lang', open)) open();
        break;
      }
      case 'thap': this.openThap(); break;
      case 'drum': if (this.era === 'era_lac_long_quan') this.confirmHandoff(); else this.finishDemo(); break;
      case 'npc': case 'env_story': case 'quest_interact': this.story.interact(pt); break;
      default:
        if (this.ui03?.interact(pt)) this.story.record(pt.kind === 'chest' ? 'open_chest' : 'environment_secret', pt.id);
        break;
    }
  }

  give(itemId, n) {
    this.inv.add(itemId, n); this.sfx.pickup();
    const it = this.data.items.items.find((x) => x.id === itemId);
    this.ui.pickup(this.i18n.t('msg_got_item', { name: this.loc(it.name), n }));
  }

  completeSecret(nodeId) {
    const r = this.secret.complete(nodeId);
    if (!r.ok) return;
    const spot = POINTS.find((x) => x.node === nodeId && x.kind === 'secret');
    if (spot) { this.story.inspect(spot.id); this.after(6.2, () => this.story.bark(`inspect:${spot.id}`, { force: true, seconds: 3.5 })); }
    for (const c of r.granted) {
      const clue = this.secret.chain.clues.find((x) => x.id === c);
      this.ui.toast(this.i18n.t('msg_clue', { name: this.loc(clue.name) }), 4);
      this.ui.subtitle('', this.loc(clue.text), 6);
    }
    if (nodeId === 'sn_kiln') this.props.hollow.visible = true;
    if (r.reward) {
      this.ui03?.xp('secret_chain_end', this.secret.chain.id);
      for (const it of r.reward.items ?? []) this.give(it.item, it.count);
      this.props.hollow.visible = false;
      for (const cx of r.reward.codex_unlock_extra ?? []) {
        const e = this.codexEntries().find((x) => x.id === cx);
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
    this.ui03?.xp('non_combat_success', nc.id);
    this.ui.toast(this.i18n.t('msg_villager_saved'), 4);
    this.ui.toast(this.i18n.t('msg_skill_points', { n: pts }), 4);
    this.sfx.pickup();
    const mist = this.props.mist;
    let t = 0; const iv = setInterval(() => { t += 0.05; mist.material.opacity = Math.max(0, 0.35 * (1 - t)); if (t >= 1) { clearInterval(iv); mist.visible = false; } }, 50);
    this.story.record('non_combat_success', nc.id);
    // Nghệ wakes and talks (cv_nghe_rescue: choice "drive it out" / "see what hurts it"); then walks home.
    this.after(1.2, () => {
      const cv = this.data.dialogue.conversations.find((c) => c.id === 'cv_nghe_rescue');
      if (this.mode === 'playing' && cv) this.story.startConversation(cv, 'npc_nghe');
    });
    this.after(2.5, () => { if (this.mode === 'playing') this.story.placeNpcs(); }); // Nghệ walks home (-7, 19), ground height from the heightmap
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
    this.pry = { boss, judge, msg: this.i18n.t(judge.auto ? 'pry_auto' : judge.holdMode ? 'pry_hint_hold' : 'pry_hint', { key: this.glyphText('interact') }) };
    p.pryBeats = 0;
    boss.state = 'pried';
  }

  updatePry(realDt, i) {
    const { judge, boss } = this.pry;
    const events = [];
    // Grace = max(INPUT_GRACE_S, one frame): at a low frame rate the press is seen a frame late.
    judge.grace = Math.max(INPUT_GRACE_S, (this._prevFrameS ?? realDt) + 0.05);
    if (i.pressed('interact') && !judge.holdMode && !judge.auto) {
      // Judge the press at its event timestamp, not at frame time (frame-rate independent).
      const lag = Math.max(-judge.grace, Math.min(realDt, (i.pressedAt('interact') - this.frameStart) / 1000));
      if (lag <= 0) events.push(...judge.press(lag), ...judge.tick(realDt));
      else events.push(...judge.tick(lag), ...judge.press(0), ...judge.tick(realDt - lag));
    } else {
      judge.setHeld(i.isDown('interact'));
      events.push(...judge.tick(realDt));
    }
    const T = this.i18n.t;
    for (const ev of events) {
      if (ev.type !== 'drum') (this.pryLog ??= []).push({ ...ev, t: +judge.t.toFixed(3) });
      if (ev.type === 'drum') { this.sfx.drum(true); this.fxh.pryDrum(boss); }
      if (ev.type === 'hit') {
        this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, 'pry_beat')); this.fxh.pryBeat(boss, ev.beat);
        this.player.pryBeats = ev.beat; this.player.anim.pryBeat(); this.shake('medium'); this.input.rumble(0.6, 0.1);
        boss.mesh.cracks.forEach((c) => { c.scale.y = 1 + ev.beat * 0.6; });
        this.pry.msg = T('pry_beat_hit'); this.player.drum.gain('pry_beat');
        this.story.bark(`pry_beat_${ev.beat}`, { force: true, seconds: 1.2 }); // "Một… Hai… Ba!" (display only, never the clock)
      }
      if (ev.type === 'miss') { this.sfx.miss(); this.fxh.pryMiss(boss); this.pry.msg = T('pry_beat_miss'); this.story.bark('pry_beat_miss', { force: true, seconds: 1.5 }); }
    }
    const slotFrac = judge.holdMode ? 0 : Math.max(0, Math.min(1, judge.timeToSlot / judge.interval));
    this.ui.pryWidget({ beats: judge.beats, hit: judge.beat, slotFrac, hold: judge.holdMode, holdProgress: judge.holdProgress / judge.holdDuration, msg: this.pry.msg });
    if (judge.done) {
      const res = boss.enc.resolvePry();
      this.ui.pryWidget(null);
      if (res === 'freed') this.onBossFreed(boss);
      else {
        this.ui.center(T('pry_failed'), 2);
        this.player.showPole(false); this.player.state = 'free'; this.player.pryBeats = 0; this.locked = false; this.pry = null; boss.state = 'chase';
        const p = this.player, dx = p.x - boss.x, dz = p.z - boss.z, l = Math.hypot(dx, dz) || 1;
        const m = this.walk.move(p.x, p.z, dx / l * 2.5, dz / l * 2.5, PROTO.playerRadiusM); p.x = m.x; p.z = m.z;
      }
    }
  }

  onBossFreed(boss) {
    const tun = this.data.combat, T = this.i18n.t, kh = boss.def.khoen;
    this.pry = null;
    // Release: brief real-time-safe slow-mo of the game step (pry.release_*), never the pry clock.
    this.fx.slowMo(tun.pry.release_time_scale ?? 0.3, tun.pry.release_slowmo_s ?? 0.4);
    this.hitstop.trigger(hitStopFor(tun.hit_stop, 'pry_release'));
    this.shake('heavy'); this.fxh.bossFreed(boss);
    if (!this.gp) this.ui03?.xp('enemy', boss.def.id); else this.gp.onBossFreed(boss); // XP once (gp owns the award when present)
    // The khoen falls apart; pieces are narrative only (no item, no counter: V9).
    boss.mesh.khoen.visible = false;
    this.ui.showHud(false);
    this.after(0.15, () => this.sfx.silence(tun.pry.silence_after_s));
    const tusk = makeTusk(); tusk.position.set(boss.x + Math.sin(boss.yaw) * 2.2, 0.1, boss.z + Math.cos(boss.yaw) * 2.2); this.scene.add(tusk);
    this.freedTusk = tusk;
    this.after(tun.pry.silence_after_s + 0.2, () => {
      this.ui.showHud(true);
      boss.walkOff();
      // qs_m5 on_complete: Cói's line in the silence, the verse line by line, then she picks up the blade.
      this.story.bark('after_pry_silence_before_ve', { force: true, seconds: 2.8 });
      const veS = this.story.sing('dlg_04_ve_after_pry', null, { delay: 3.0, perLine: 3.4 });
      this.after(3.4 + veS, () => this.story.bark('after_ve_pick_blade', { force: true, seconds: 4 }));
      this.player.showPole(false); this.player.state = 'free'; this.player.pryBeats = 0; this.locked = false; this.lockTarget = null;
    });
    this.after(tun.pry.silence_after_s + 3, () => {
      for (const d of kh.on_pry_success.drops) this.give(d.item, d.count);
      this.scene.remove(tusk);
      this.gen.flags.add(kh.on_pry_success.sets_flag);
      this.story.record('boss_freed', boss.def.id);
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
    this.hitstop.trigger(hitStopFor(this.data.combat.hit_stop, 'finisher')); this.shake('heavy'); this.fxh.finisher(boss);
    boss.walkOff();
    this.after(2, () => {
      for (const d of fb.drops) this.give(d.item, d.count);
      this.gen.flags.add(fb.sets_flag);
      this.story.record('boss_freed', boss.def.id);
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
    this.story.record('craft', id);
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

  /** Handoff sequence. Story 0.4: the cut-scene cin_handoff (carve the notch, tie the strip, seasons, Bương fits
   *  a new shaft, Ông Vầu ties a new strip) replaces the title / line / tool / verse / theme cards
   *  (cinematics.replaces_handoff_steps); then the remaining lineage.handoff.steps (then_handoff_steps), the
   *  practice, the demo hook cin_demo_hook and the end. Everything shown in Bương's era must pass that era's
   *  forbidden-word rule (test/handoff.test.mjs, test/story04.test.mjs, smoke). */
  runHandoff() {
    const L = this.data.lineage, e = (s) => this.ui.esc(s), T = this.i18n.t;
    const cins = this.data.cinematics.cinematics, ho = cins.find((c) => c.id === 'cin_handoff'), hook = cins.find((c) => c.id === 'cin_demo_hook');
    const byId = (id) => L.handoff.steps.find((x) => x.id === id);
    const steps = [...ho.then_handoff_steps.map(byId), { id: hook.id, kind: 'cinematic', ref: hook.id }, ...hook.then_handoff_steps.map(byId)].filter(Boolean);
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
        case 'cinematic': this.ui.close(); this.story.play(st.ref, { onEnd: () => { this.mode = 'paused'; next(); } }); break;
        case 'demo_end': this.showEnd(); break;
        default: next();
      }
    };
    this.handoffNext = next;
    this.story.record('interact', 'drum'); // qs_h1_khac_vet -> on_complete cin_handoff
    this.ui.close();
    this.story.play('cin_handoff', { onEnd: () => { this.mode = 'paused'; this.input.exitLock(); next(); } });
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
    this._rebuildAll();
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
      this.after(3, () => { if (!this.endReached && this.mode === 'playing') this.finishDemo(); }); // -> cin_demo_hook
    } else if (allGone && !pr.respawnT) {
      // Practice can't be lost or exhausted: crabs come back until the goal is met.
      pr.respawnT = true;
      this.after(3, () => { pr.respawnT = false; if (!pr.done) for (const e of this.practiceEnemies) e.reset(); });
    }
  }

  finishDemo() {
    if (this.endReached) return;
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
    const story = this.story?.objectiveText(); if (story) return story; // quests.json "Người chưa về" (0.4)
    if (!this.villagerSaved) return T('obj_find_villager');
    if (!f.has(FREED_FLAG)) return T('obj_boss');
    if (!f.has('crafted:rcp_nanh_dam')) return this.zone === 'hub' || this.zone === 'hub_bank' ? T('obj_craft') : T('obj_return');
    return T('obj_handoff');
  }

  updateHud(dt = 0) {
    const p = this.player, d = p.drum, seg = d.t.points_per_segment;
    const drum = [0, 1, 2, 3].map((k) => Math.max(0, Math.min(1, (d.points - k * seg) / seg)));
    const b = this.boss;
    const bossOn = this.era === 'era_lac_long_quan' && b.engaged && b.state !== 'freed' && b.state !== 'gone' && Math.hypot(b.x - p.x, b.z - p.z) < 30;
    this.ui.updateHud({
      hp: p.hp, hpMax: p.hpMax, the: p.the.ratio, drum, drumReady: d.canBurst(), heals: p.heals,
      weaponName: this.loc(p.weapon.name), slotText: this.gen.slots > 1 ? `[${this.glyphText('weapon_slot_1')}] [${this.glyphText('weapon_slot_2')}]` : '',
      points: `${this.i18n.t('skills_points')}: ${this.gen.skills.points} [${this.glyphText('skills')}]`,
      healKey: this.glyphText('heal'), burstKey: this.glyphText('drum_burst'), sprinting: p.sprinting, device: this.input.device,
      weapon: p.weapon, slot: p.slot ?? 0, slots: this.gen.slots, // HUD 0.3: weapon medallion + slot keys
      otherWeapon: this.gen.slots > 1 ? this.data.weapons.weapons.find((w) => w.id === this.gen.weapons[(p.slot ?? 0) === 0 ? 1 : 0]) ?? null : null,
      combat: this.allEnemies().some((e) => e.engaged && e.alive && Math.hypot(e.x - p.x, e.z - p.z) < 30), // minimal HUD
      zone: this.zoneName(), objective: this.objective(), fps: this.settings.showFps ? this.fps : null,
      boss: bossOn ? { name: this.story.creatureName(b.def), phase: this.loc(b.enc.phase.name), hp: b.enc.hpRatio, the: b.posture.ratio,
        cracks: b.enc.khoen.cracks, showCracks: b.enc.khoen.enabled } : null,
    }, dt);
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
          boss: { ...enemyInfo(b), hpMax: b.enc.def.hp, cracks: b.enc.khoen.cracks, khoen: b.enc.khoen.state, phase: b.enc.phase.id, canFinish: b.enc.canFinish(), outcome: b.enc.outcome },
          pageNow: performance.now(), pry: g.pry ? { slotAtMs: g.lastNow + g.pry.judge.timeToSlot * 1000, timeToSlot: g.pry.judge.timeToSlot, beat: g.pry.judge.beat, window: g.pry.judge.window, interval: g.pry.judge.interval, hold: g.pry.judge.holdMode, auto: g.pry.judge.auto } : null,
          flags: [...g.gen.flags], inventory: g.inv.toJSON(), owned: g.gen.owned, codex: [...g.codex], secret: g.secret.toJSON(),
          skills: g.gen.skills.toJSON(), practiceState: g.practice ? { swaps: g.practice.swaps, done: g.practice.done } : null,
          pryLog: (g.pryLog ?? []).slice(-12), fps: g.fps, simTime: g.simTime ?? 0, missingStrings: g.i18n.missingKeys(), buildId: g.buildId };
      },
      teleport(x, z, yaw) { g.player.x = x; g.player.z = z; if (yaw != null) { g.player.yaw = yaw; } },
      faceEnemy(uid) {
        const e = g.allEnemies().find((x) => x.uid === uid);
        if (e) { g.player.yaw = Math.atan2(e.x - g.player.x, e.z - g.player.z); g.cam.yaw = Math.atan2(-(e.x - g.player.x), -(e.z - g.player.z)); }
      },
      setGod(on) { g.player.invulnDebug = !!on; },
      /** Test-only: hold the pry clock while a screenshot is taken. */
      freezePry(on) { g.debugPryFrozen = !!on; },
      hitEnemy(uid, hp, the) { const e = g.allEnemies().find((x) => x.uid === uid); const r = e?.receiveHit({ hp, the }); if (e) g.onHitResult(e, r); return r; },
      setCameraYaw(y) { g.cam.yaw = y; },
      freezeEnemy(uid, on) { const e = g.enemies.find((x) => x.uid === uid); if (e) e.engaged = !on && e.engaged; if (e && on) { e.state = 'idle'; e.spawn = { x: e.x, z: e.z }; } },
      setDifficulty(id) { g.updateSettings({ difficulty: id }); },
      setAcc(k, v) { g.updateSettings({ acc: { [k]: v } }); },
      /** HUD 0.3 read-out (tier/colour of the health bar, drum full state...). */
      hud() { return g.ui.hudView.debugState(); },
      /** FX diagnostics (particle counts, quality, time scale...). */
      fx: () => g.fx.stats(),
      /** Movement / animation probe: speed, gait, sprint, facing, rig joint angles. */
      playerInfo() { const p = g.player; return { x: p.x, z: p.z, yaw: p.yaw, speed: p.loco.speed, gait: p.loco.gait, sprinting: p.loco.sprinting, state: p.state,
        the: p.the.ratio, dodge: p.dodge ? { kind: p.dodge.kind, local: p.dodge.local, dirX: p.dodge.dirX, dirZ: p.dodge.dirZ } : null, joints: p.jointAngles(), device: g.input.device,
        attack: p.cur ? { id: p.cur.move.id, kind: p.cur.kind, lunge: p.cur.lunge, t: p.cur.t } : null }; },
      feedbackLog: () => g.feedbackLog.slice(-10),
      /** Demo 0.3 gameplay probe (jump height, Arts, boss chains / waves / stakes, Ghì nanh). */
      gp03: () => g.gp.debug(),
      bindings: () => g.input.bindings.toJSON(),
      enemyDetail(uid) { const e = g.allEnemies().find((x) => x.uid === uid); return e ? { state: e.state, x: e.x, z: e.z, speed: e.speed, history: [...e.history], onScreen: e.onScreen, transitionSeen: g.transitionSeen ?? 0 } : null; },
      finisherCount: () => g.finisherCount ?? 0,
      setQuality(q) { g.updateSettings({ gfx: q }); },
      /** Test-only: fire one effect in front of the player (screenshots / smoke). With freeze, the FX
       *  clock is advanced 0.07 s and then held (headless frames are slow: short sparks would expire
       *  before the screenshot). Unfreeze with freezeFx(false). */
      fxDemo(weight, surface = 'bronze', freeze = false, dist = 1.6) {
        const p = g.player, f = { x: Math.sin(p.yaw), z: Math.cos(p.yaw) };
        g.fx.impact({ x: p.x + f.x * dist, y: 1.2, z: p.z + f.z * dist }, { x: -f.x, y: 0.4, z: -f.z }, { weight, surface });
        if (freeze) { g.fx.update(0.07, g.player); g.debugFxFrozen = true; }
        return g.fx.stats();
      },
      freezeFx(on) { g.debugFxFrozen = !!on; },
      give(id, n) { g.give(id, n); },
      gather() { for (const pt of POINTS.filter((x) => x.kind === 'gather')) if (!g.gathered.has(pt.id)) { g.gathered.add(pt.id); g.props.rattan[pt.id].visible = false; g.inv.add('mat_day_may', 1); } },
      points: () => POINTS.map((p) => ({ id: p.id, kind: p.kind, x: p.x, z: p.z })),
      /** Demo 0.3 Pack / map / minimap read-out and helpers (ui/inventory, ui/map). */
      ui03: () => g.ui03.debug(),
      progress: () => g.progress.toJSON(),
      openPack(tab) { g.ui03.openTab(tab); },
      addXp(n) { return g.progress.addXp(n); },
      grant(id, n = 1) { return g.ui03.grant(id, n); },
      /** Story 0.4 read-out: cut-scene (shot, era, skip / hold progress), dialogue node, quests, line log. */
      story: () => g.story.debug(),
      /** Test-only: run the active cut-scene forward by `s` real seconds in 0.1 s steps (no skip, no hold held). */
      cinAdvance(s) { const none = { isDown: () => false, pressed: () => false }; for (let t = 0; t < s && g.mode === 'cinematic'; t += 0.1) g.story.updateCinematic(0.1, none); return g.story.debug().cinematic; },
      /** Test-only: record a story fact (quests.json complete_when) as the game would. */
      storyFact(type, ref) { return g.story.record(type, ref).map((e) => `${e.type}:${e.step?.id ?? e.quest?.id}`); },
    };
  }
}
