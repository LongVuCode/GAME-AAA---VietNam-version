// story/director.js - Story Integration 0.4 in the running game (three.js + DOM through ui/story):
//   * cut-scenes from cinematics.json (camera shots, letterbox, subtitles, actors/props per shot from
//     staging.js, hold-to-skip, hold-to-act shots) on REAL time (wallDt) - never hit-stop / slow-mo;
//   * the 6 named NPCs + the child voice (rig humanoids with own colours / headwear), their talk points,
//     the named dialogue box with choices (flag_choice_* only, branches converge), songs, barks;
//   * quests.json: main quest + transition + 3 side quests (QuestLog), HUD tracker, journal, map target,
//     banners, rewards;
//   * environmental story points (quests.new_points) with a short description + Codex entry;
//   * creature display names / Codex entries from creatures_0_4.json (technical ids unchanged).
// game.js calls: story.play(id, { onEnd }), story.updateCinematic / updateDialogue (in their modes),
// story.tick(wallDt) every playing frame, story.record(type, ref) for game facts, story.bark(trigger),
// story.pointAvailable / promptFor / interact for its POINTS kinds (npc, env_story, quest_interact).
import * as THREE from 'three';
import { makeHumanoid } from '../game/meshes.js';
import { POINTS, HUB_X } from '../game/world.js';
import { P, makePose } from '../anim/pose.js';
import { CinematicTimeline, shotCamera, lerp3, ease } from './timeline.js';
import { QuestLog } from './quests.js';
import { DialogueRun, BarkBook, conversationsFor, lineIndex, resolveLine } from './dialogue.js';
import { STAGING, creatureFor, storyLineAllowed } from './staging.js';
import { StoryUi } from '../ui/story/storyUi.js';

const COI_ERA = 'era_lac_long_quan';
const INDIGO = 0x2b3a6e, INDIGO_FADED = 0x55648a;
const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c));
const cyl = (rt, rb, h, c, seg = 8) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), lam(c));
const _v = new THREE.Vector3();

/** Looks of the story NPCs (rig colours + headwear), so no two read alike; none is an enemy. */
const NPC_LOOK = {
  npc_ba_lai_do: { body: 0x5a4a6a, legs: 0x2e2a30, hatColor: 0xc8b47a, height: 0.93, scarf: 0x2e2a3a, torch: true },
  npc_nghe: { body: 0x9a7a3e, legs: 0x4a3e2c, hat: false, height: 0.9, tuft: 0x1d1a16 },
  npc_nan: { body: 0x6f7d4c, legs: 0x3c3a2c, hat: false, height: 0.86, scarf: 0x8a3a2a, band: 0x8a3a2a },
  npc_dot: { body: 0x4a3a2a, legs: 0x2a241c, hat: false, height: 1.02, band: 0x24221c, coil: true },
  npc_tho_duc_lang: { body: 0x704a3a, legs: 0x3a2e26, hat: false, height: 1.05, apron: 0x2e2620, band: 0x6a5a3a },
  npc_nguoi_gia_ben: { body: 0x606060, legs: 0x3a3a38, hatColor: 0xa89a70, height: 0.92, beard: true },
  npc_be_ke: { body: 0xb08850, legs: 0x5a4a30, hat: false, height: 0.62, tuft: 0x1d1a16 },
  npc_heir: { body: 0x6a5a48, legs: 0x3a3228, hat: false, height: 0.98 },
};
/** Where each NPC stands in the world (outside cut-scenes) and in which era. */
const NPC_HOME = {
  npc_ba_lai_do: { x: -4, z: 22.8, face: [0, 18], era: COI_ERA },
  npc_nan: { x: 4.4, z: 20.6, face: [0, 18], era: COI_ERA },
  npc_nghe: { x: 10, z: -81, yaw: 0.6, era: COI_ERA },
  npc_dot: { x: -14.6, z: -27.6, face: [-18, -30], era: COI_ERA },
  npc_tho_duc_lang: { x: HUB_X - 11, z: -5, face: [HUB_X - 8, -8], era: COI_ERA },
  npc_nguoi_gia_ben: { x: HUB_X + 2.5, z: -12, face: [HUB_X, 18], era: 'era_hung_vuong_6' },
  npc_be_ke: { x: HUB_X - 2.5, z: 21, face: [HUB_X, 26], era: 'era_hung_vuong_6' },
};
const POSES = (() => {
  const base = { armLR: 0.12, armRR: 0.12, elbowL: 0.2, elbowR: 0.2, wpY: -5 };
  return {
    idle: makePose(null, base),
    offer: makePose(null, { ...base, spinePitch: 0.18, headPitch: 0.15, armLP: 1.15, armRP: 1.15, elbowL: 0.35, elbowR: 0.35, armLR: 0.05, armRR: 0.05 }),
    torch: makePose(null, { ...base, armRP: 1.0, elbowR: 1.25, armRR: 0.2 }),
    child: makePose(null, { ...base, headPitch: -0.25 }),
    talk: makePose(null, { ...base, armRP: 0.55, elbowR: 0.9 }),
  };
})();
/** Codex entry opened by each environmental story point. */
const ENV_CODEX = { np_bo_lau_bo: 'cx_suong_bai_lau', np_cay_vet_ten: 'cx_lon_loi_dam', np_o_bun_xoi: 'cx_yeu_dam', trap_dot_1: 'cx_luoi_bay_nha_dot' };
/** Map / minimap target (world point or landmark id) for each objective key. */
const OBJ_TARGETS = { obj_0_4_m1: 'trap_a', obj_0_4_m2: 'npc_dot_dam_nong', obj_0_4_m3: 'villager', obj_0_4_m4: 'lm_boss_arena', obj_0_4_m5: 'lm_boss_arena', obj_0_4_m6: 'furnace', obj_0_4_h1: 'drum' };
const PERSISTENT_EFFECTS = new Set(['strip_on_pole', 'strip_on_pole_mid', 'notch', 'strip_new', 'house2', 'drum_big', 'to_buong']);

export class StoryDirector {
  constructor(game) {
    this.g = game; this.data = game.data;
    this.quests = new QuestLog(this.data.quests);
    this.barks = new BarkBook(this.data.dialogue);
    this.lines = lineIndex(this.data.dialogue);
    this.ui = new StoryUi(game.container, game);
    this.ui.onChoice = (i) => this._choose(i);
    this.npcs = {}; this.props = {}; this.envMeshes = {};
    this.lineLog = []; this.cinLog = [];
    this.reset();
  }
  get era() { return this.g.gen?.era ?? COI_ERA; }
  /** Ground height under (x, z) (world_0_4 heightmap through Walkable.groundAt; 0 on the flat 0.3 world). */
  gy(x, z) { return this.g.walk?.groundAt?.(x, z) ?? 0; }
  t(k, v) { return this.g.i18n.t(k, v); }
  loc(o) { return this.g.i18n.loc(o); }
  hasFlag(f) { return !!this.g.gen?.flags?.has(f); }
  ctx() {
    return { hasFlag: (f) => this.hasFlag(f), setFlag: (f) => this.g.gen.flags.add(f), stepDone: (s) => this.quests.stepDone(s), readyOrDone: (q) => this.quests.readyOrDone(q) };
  }

  reset() {
    this.quests.reset(); this.barks.reset();
    this.seen = new Set(); this.inspected = new Set(); this.pulled = new Set(); this.songs = new Set();
    this.strip = { tied: false, notch: false, fresh: false };
    this.cin = null; this.dlg = null; this.lowHpBarked = false; this._prevPState = null; this.callBarks = new Set();
    this.lineLog.length = 0;
    if (this.g.props && this.g.gen && Object.keys(this.npcs).length) this.placeNpcs();
    for (const m of Object.values(this.envMeshes)) m.visible = true;
  }

  // ================================================================== world: NPCs, props, story points
  build() {
    const scene = this.g.scene;
    for (const [id, look] of Object.entries(NPC_LOOK)) {
      const n = makeHumanoid(look);
      this._accessorize(n.rig, look);
      n.id = id; n.pose = 'idle'; n.t = Math.random() * 6; scene.add(n.root);
      this.npcs[id] = n;
    }
    this.g.villager = this.npcs.npc_nghe; this.g.elder = this.npcs.npc_nguoi_gia_ben;
    // Cut-scene props: the family boat, the capsized reed-cutters' boat with Nghệ's rough woven hat, the old
    // boat on the bank, a flood sheet, reed plumes, the far bank with travellers (demo hook).
    const P2 = this.props;
    P2.boat = this._boat(0x6b5236); P2.old_boat = this._boat(0x4a4036); P2.old_boat.rotation.z = 0.12;
    P2.capsized = this._boat(0x7a6a48, true);
    P2.flood = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), lam(0x4f6a66, { transparent: true, opacity: 0.85 })); P2.flood.rotation.x = -Math.PI / 2; P2.flood.position.set(HUB_X, -0.3, 5);
    P2.bloom = this._reedBloom();
    P2.far_bank = this._farBank();
    for (const p of Object.values(P2)) { p.visible = false; scene.add(p); }
    // Environmental story points (quests.new_points) and Đót's set traps.
    for (const pt of POINTS) {
      if (pt.kind !== 'env_story' && pt.kind !== 'quest_interact') continue;
      if (pt.offmap) continue;
      const m = this._envMesh(pt); m.position.set(pt.x, this.gy(pt.x, pt.z), pt.z); scene.add(m); this.envMeshes[pt.id] = m;
    }
    this.placeNpcs();
  }

  _accessorize(rig, look) {
    const add = (parent, mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh; };
    if (look.scarf) { const s = add(rig.neck, new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.035, 6, 12), lam(look.scarf)), 0, 0.0, 0); s.rotation.x = Math.PI / 2; }
    if (look.band) { const b = add(rig.neck, new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.022, 6, 14), lam(look.band)), 0, 0.17, 0.01); b.rotation.x = Math.PI / 2 - 0.15; }
    if (look.tuft) add(rig.neck, new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), lam(look.tuft)), 0, 0.23, -0.02);
    if (look.apron) add(rig.chest, box(0.32, 0.5, 0.03, look.apron), 0, -0.05, 0.14);
    if (look.beard) add(rig.neck, box(0.09, 0.08, 0.05, 0xd8d4c8), 0, 0.03, 0.1);
    if (look.coil) { const c = add(rig.chest, new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 14), lam(0x8a7a50)), 0.05, 0.12, 0); c.rotation.set(0.3, 0, 0.9); }
    if (look.torch) {
      const t = new THREE.Group(); t.add(cyl(0.02, 0.025, 0.6, 0x5a4630));
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), new THREE.MeshBasicMaterial({ color: 0xffb04a })); fl.position.y = 0.36; t.add(fl);
      t.position.set(0, -0.05, 0.05); t.rotation.x = -0.2; rig.handR.add(t); rig.torch = t;
    }
  }
  _boat(color, capsized = false) {
    const g = new THREE.Group();
    const hull = box(1.1, 0.42, 4.4, color); hull.position.y = -0.02; g.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 4), lam(color)); bow.rotation.x = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(0, -0.02, -2.6); bow.scale.set(1, 1, 0.45); g.add(bow);
    const rim = box(1.16, 0.06, 4.45, 0x3e3022); rim.position.y = 0.2; g.add(rim);
    if (capsized) {
      g.rotation.z = Math.PI * 0.92; g.position.y = 0.05;
      const reed = new THREE.Group(); for (let k = 0; k < 6; k++) { const r = cyl(0.015, 0.015, 1.6, 0xc8b878, 4); r.rotation.z = Math.PI / 2; r.position.set(0.9 + k * 0.08, 0.35, -0.6 + k * 0.25); reed.add(r); } g.add(reed);
      // Nghệ's rough woven hat with its indigo strip, caught on the upturned hull (cold open shots 3-4):
      // outside the flipped hull group so it sits right side up and reads at a glance.
      const outer = new THREE.Group(); outer.add(g);
      const hat = new THREE.Group();
      const brim = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.2, 12), lam(0xd9c38a)); brim.position.y = 0.1; hat.add(brim);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.032, 6, 16), lam(INDIGO)); band.rotation.x = Math.PI / 2; band.position.y = 0.07; hat.add(band);
      const tail = box(0.06, 0.02, 0.45, INDIGO); tail.position.set(0.2, 0.05, 0.26); tail.rotation.y = 0.5; hat.add(tail);
      hat.position.set(-0.15, 0.24, 0.9); hat.rotation.set(0.25, 0, -0.2); outer.add(hat);
      outer.userData.hat = hat;
      return outer;
    }
    return g;
  }
  _reedBloom() {
    const g = new THREE.Group();
    for (let k = 0; k < 40; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), lam(0xf2eee0)); m.position.set(HUB_X - 14 + (k % 10) * 3.1, 1.6 + (k % 3) * 0.2, 16 + Math.floor(k / 10) * 1.6); m.scale.y = 1.8; g.add(m); }
    return g;
  }
  _farBank() {
    const g = new THREE.Group();
    const bank = box(90, 0.6, 8, 0x5a5a44); bank.position.set(HUB_X, 0, 68); g.add(bank);
    for (let k = 0; k < 9; k++) {
      const h = makeHumanoid({ body: 0x2e2c2a, legs: 0x22201e, hat: k % 2 === 0, hatColor: 0x3a3630, height: 0.85 + (k % 3) * 0.08 });
      h.root.position.set(HUB_X - 9 + k * 2.2, 0.3, 65.5 + (k % 2) * 0.8); h.root.rotation.y = Math.PI; g.add(h.root);
      if (k % 3 === 1) { const pole = cyl(0.02, 0.02, 1.6, 0x3a3428); pole.rotation.z = Math.PI / 2; pole.position.set(HUB_X - 9 + k * 2.2, 1.55, 65.5); g.add(pole); }
    }
    return g;
  }
  _envMesh(pt) {
    const g = new THREE.Group();
    if (pt.id === 'np_bo_lau_bo') {
      for (let k = 0; k < 7; k++) { const r = cyl(0.02, 0.02, 1.5, 0xcdbd80, 4); r.rotation.z = Math.PI / 2; r.rotation.y = 0.2 * k; r.position.set(0, 0.08 + (k % 2) * 0.05, -0.2 + k * 0.07); g.add(r); }
      const sickle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 4, 10, Math.PI * 1.2), lam(0x8a6a3a)); sickle.rotation.x = -Math.PI / 2; sickle.position.set(0.6, 0.04, 0.5); g.add(sickle);
    } else if (pt.id === 'np_cay_vet_ten') {
      const trunk = cyl(0.32, 0.4, 3.6, 0x5a4a36); trunk.position.y = 1.8; g.add(trunk);
      const scar = cyl(0.335, 0.335, 0.32, 0x5e8c72); scar.position.y = 0.95; g.add(scar); // green patina smear at neck height
      const bark = cyl(0.336, 0.336, 0.08, 0xb8a888); bark.position.y = 1.15; g.add(bark);
    } else if (pt.id === 'np_o_bun_xoi') {
      const bed = new THREE.Mesh(new THREE.CircleGeometry(1.6, 14), lam(0x3a3024)); bed.rotation.x = -Math.PI / 2; bed.position.y = 0.04; g.add(bed);
      for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.08 + 0.03 * (k % 2), 6, 4), lam(0x6a5a44)); b.position.set(Math.cos(k * 1.3) * 0.8, 0.07, Math.sin(k * 1.3) * 0.7); b.userData.bubble = k; g.add(b); }
      g.userData.bubbles = true;
    } else if (pt.kind === 'quest_interact') {
      const stake = cyl(0.06, 0.08, 0.9, 0x6f5c40); stake.position.y = 0.45; g.add(stake);
      const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 4, 10, Math.PI), lam(0x5e8c72)); jaw.rotation.x = -Math.PI / 2; jaw.position.set(0, 0.06, 0.2); g.add(jaw);
      const rope = cyl(0.012, 0.012, 1.2, 0x8a7a56, 4); rope.rotation.z = Math.PI / 2.3; rope.position.set(0.35, 0.4, 0); g.add(rope);
    }
    return g;
  }

  /** NPC world placement for the current era / story state (outside cut-scenes). */
  placeNpcs() {
    const g = this.g, era = this.era;
    for (const [id, n] of Object.entries(this.npcs)) {
      const home = NPC_HOME[id];
      if (!home) { n.root.visible = false; continue; }
      let x = home.x, z = home.z;
      if (id === 'npc_nghe' && g.villagerSaved) { x = -7; z = 19; }
      n.root.visible = home.era === era;
      if (id === 'npc_nguoi_gia_ben') n.root.visible = era !== COI_ERA && !!g.practice; // appears with the river-bank practice
      n.root.position.set(x, this.gy(x, z), z);
      n.root.rotation.y = home.face ? Math.atan2(home.face[0] - x, home.face[1] - z) : (home.yaw ?? 0);
      n.homeYaw = n.root.rotation.y; n.pose = 'idle';
      if (n.rig.torch) n.rig.torch.visible = true;
    }
  }

  _npcAnim(n, dt, talking = false) {
    n.t += dt;
    const p = this._pose ?? (this._pose = new Float32Array(P.N));
    p.set(POSES[talking ? 'talk' : n.pose] ?? POSES.idle);
    p[P.spinePitch] += 0.02 * Math.sin(n.t * 1.6);
    p[P.headYaw] += 0.08 * Math.sin(n.t * 0.5);
    if (talking) p[P.headPitch] += 0.06 * Math.sin(n.t * 6);
    n.rig.apply(p);
  }

  // ================================================================== strip on the pole (Mũi Sào)
  _syncPole() {
    const pole = this.g.player?.pole; if (!pole) return;
    if (pole !== this._poleRef) {
      this._poleRef = pole;
      const mk = (color, z) => { const g = new THREE.Group(); const wrap = cyl(0.048, 0.048, 0.06, color); wrap.rotation.x = Math.PI / 2; g.add(wrap);
        const tail = box(0.05, 0.42, 0.012, color); tail.position.set(0.03, -0.2, 0); tail.rotation.z = 0.15; g.add(tail); g.position.z = z; pole.add(g); return g; };
      this._strip = mk(INDIGO_FADED, 2.22); this._strip2 = mk(INDIGO, 2.1);
      this._notch = cyl(0.052, 0.052, 0.015, 0x2a1a10); this._notch.rotation.x = Math.PI / 2; this._notch.position.z = 2.4; pole.add(this._notch);
    }
    this._strip.visible = this.strip.tied; this._strip2.visible = this.strip.fresh; this._notch.visible = this.strip.notch;
  }

  // ================================================================== names, lines, barks
  speakerName(id) {
    const s = this.data.dialogue.speakers.find((x) => x.id === id);
    if (s) return this.loc(s.name);
    const ch = this.data.lineage.characters.find((c) => c.id === id);
    if (ch) return this.loc(ch.name);
    if (this.g.i18n.has(`speaker_${id}`)) return this.t(`speaker_${id}`);
    return '';
  }
  /** Resolve a line id (dialogue.json line or strings.dialogue id). */
  line(ref) {
    const l = this.lines.get(ref)?.line;
    if (l) return resolveLine(l, this.data.strings.dialogue);
    return resolveLine({ id: ref, line_ref: ref }, this.data.strings.dialogue);
  }
  /** Show a line as a subtitle if the era allows it (allowed_eras + forbidden words). */
  say(line, seconds, { era = this.era, song = false } = {}) {
    if (!line) return false;
    const ok = storyLineAllowed(line, era, this.data.lineage);
    this.lineLog.push({ id: line.id, era, ok, vi: line.text?.vi ?? '' });
    if (this.lineLog.length > 200) this.lineLog.shift();
    if (!ok) return false;
    const name = line.speaker ? this.speakerName(line.speaker) : '';
    this.ui.subtitle(name, this.loc(line.text), seconds, song || line.form === 'luc_bat');
    return true;
  }
  /** One bark (dialogue.json barks) for a game event; respects cooldown, era and if_flag. */
  bark(trigger, { force = false, seconds = 2.6 } = {}) {
    if (this.cin || this.dlg) return null;
    const l = this.barks.pick(trigger, { era: this.era, hasFlag: (f) => this.hasFlag(f), now: this.g.playTime, force });
    if (!l) return null;
    this.say({ id: l.id, speaker: l.speaker, text: l.text }, seconds);
    return l.id;
  }
  /** A verse sung line by line (perf_* songs): returns its length in seconds. */
  sing(lineRef, singer, { perLine = 3.2, delay = 0 } = {}) {
    const d = this.line(lineRef); if (!d) return 0;
    if (!storyLineAllowed(d, this.era, this.data.lineage)) return 0;
    const vi = d.text.vi.split('\n'), en = (d.text.en ?? '').split('\n');
    vi.forEach((v, k) => this.g.after(delay + k * perLine, () => this.say({ id: `${d.id}#${k}`, speaker: singer ?? d.speaker, text: { vi: v, en: en[k] ?? v }, form: 'luc_bat' }, perLine + 0.2, { song: true })));
    return delay + vi.length * perLine;
  }

  // ================================================================== quests
  /** Record a game fact (quests.json complete_when types). */
  record(type, ref) {
    const ev = this.quests.record(type, ref);
    for (const e of ev) this._onQuestEvent(e);
    return ev;
  }
  _onQuestEvent(e) {
    const g = this.g, T = (k, v) => this.t(k, v);
    if (e.type === 'quest_started') {
      const q = e.quest;
      if (q.kind === 'side') { this.ui.banner(T('quest_side'), this.loc(q.title), this.loc(q.description), 3.5); g.ui.toast(T('quest_new', { name: this.loc(q.title) }), 4); }
      else this.ui.banner(T('quest_main'), this.loc(q.title), this.loc(q.description), 5);
      g.sfx?.drum?.(false);
    }
    if (e.type === 'step_done' && e.quest.steps.length > 1) g.ui.toast(T('quest_step_done', { name: this.loc(e.step.objective) }), 3.5);
    if (e.type === 'quest_done') {
      const q = e.quest;
      if (q.kind !== 'transition') this.ui.banner(T('quest_done'), this.loc(q.title), '', 3.5);
      this._reward(q);
    }
  }
  _reward(q) {
    const g = this.g, r = q.reward; if (!r) return;
    const src = r.xp_ref ? this.data.skills.xp_sources.find((x) => x.id === r.xp_ref) : null;
    if (src) g.progress.addXp(src.xp, `quest:${q.id}`);
    for (const it of r.items ?? []) g.give(it.item, it.count);
    if (r.codex) g.codexUnlock(r.codex);
    for (const [flag, eff] of Object.entries(r.by_choice ?? {})) {
      if (!this.hasFlag(flag)) continue;
      if (eff.lose_gear) { const eq = g.progress.equipment, slot = eq.equippedIn(eff.lose_gear); if (slot) g.progress.unequip(slot); eq.owned.delete(eff.lose_gear); }
      if (eff.extra_xp) g.progress.addXp(eff.extra_xp, `quest:${q.id}`);
    }
  }
  /** Tracked objective text (HUD .h-obj and the map), or null outside Cói's quests. */
  objectiveText() {
    if (this.era !== COI_ERA) return null;
    const q = this.quests.tracked(); if (!q) return null;
    const st = this.quests.currentStep(q.id);
    return st ? this.t(st.objective_key) : null;
  }
  /** Map target point / landmark for an objective key (the map's OBJECTIVE_TARGETS API). */
  objectiveRef(key) {
    const g = this.g, atHub = g.zone === 'hub' || g.zone === 'hub_bank';
    if (key === 'obj_0_4_m6') return atHub ? 'furnace' : 'ferry_ben_say';
    if (key === 'obj_0_4_h1') return atHub ? 'drum' : 'ferry_ben_say';
    if (key === 'obj_0_4_m3' && g.villagerSaved) return 'villager';
    return OBJ_TARGETS[key] ?? null;
  }
  _trackerState() {
    if (this.era !== COI_ERA || this.cin) return null;
    const q = this.quests.tracked();
    const side = this.quests.activeSide().filter((x) => x.era === this.era).slice(0, 2).map((x) => {
      const st = this.quests.currentStep(x.id), pr = this.quests.progress(st);
      return { title: this.loc(x.title), objective: this.loc(st.objective), prog: pr.total > 1 ? `${pr.met}/${pr.total}` : '' };
    });
    if (!q && !side.length) return null;
    const st = q ? this.quests.currentStep(q.id) : null, pr = st ? this.quests.progress(st) : null;
    return { title: q ? this.loc(q.title) : '', step: st?.id ?? '', prog: st ? `${q.steps.indexOf(st) + 1}/${q.steps.length}${pr.total > 1 ? ` · ${pr.met}/${pr.total}` : ''}` : '', why: st ? this.loc(st.why) : '', side };
  }
  /** Sổ tay: quests of the current era (journal tab of the Pack and the pause menu). */
  journalHtml(esc) {
    const T = (k, v) => this.t(k, v), out = [];
    const list = this.quests.started().filter((q) => q.era === this.era);
    if (!list.length) return '';
    for (const kind of ['main', 'transition', 'side']) {
      const qs = list.filter((q) => q.kind === kind);
      if (!qs.length) continue;
      if (kind !== 'transition') out.push(`<h3>${esc(T(kind === 'side' ? 'quest_side' : 'quest_main'))}</h3>`);
      for (const q of qs) {
        const done = this.quests.isDone(q.id), cur = this.quests.currentStep(q.id);
        const steps = q.steps.filter((s) => this.quests.stepDone(s.id) || s === cur).map((s) => {
          const ok = this.quests.stepDone(s.id);
          return `<li class="${ok ? 'done' : 'cur'}">${ok ? '✓ ' : '◆ '}${esc(this.loc(s.objective))}${!ok ? `<br><span class="dim">${esc(T('quest_why'))}: ${esc(this.loc(s.why))}</span>` : ''}</li>`;
        }).join('');
        out.push(`<div class="card"><b>${esc(this.loc(q.title))}</b>${done ? ` — <span class="dim">${esc(T('quest_done'))}</span>` : ''}<br><span class="dim">${esc(this.loc(q.description))}</span><ul class="qsteps">${steps}</ul></div>`);
      }
    }
    return out.join('');
  }

  // ================================================================== story points (POINTS kinds npc / env_story / quest_interact)
  npcForPoint(pt) { return pt.npc ? this.npcs[pt.npc] : null; }
  pointAvailable(pt) {
    const g = this.g;
    if (pt.kind === 'npc') {
      const n = this.npcForPoint(pt);
      if (!n?.root.visible) return false;
      if (pt.npc === 'npc_nghe') return g.villagerSaved;
      return Math.hypot(n.root.position.x - pt.x, n.root.position.z - pt.z) < 3;
    }
    if (pt.kind === 'env_story') return this.era === COI_ERA && !pt.offmap;
    if (pt.kind === 'quest_interact') return this.era === COI_ERA && this.quests.isActive('sq_bay_nha_dot') && !this.pulled.has(pt.id);
    return false;
  }
  promptFor(pt) {
    const g = this.g, esc = g.ui.esc, k = (key) => `${g.kbd('interact')} ${esc(this.t(key))}`;
    if (pt.kind === 'npc') return `${k('prompt_talk')} — ${esc(this.speakerName(pt.npc))}`;
    if (pt.kind === 'env_story') return `${k('prompt_inspect_secret')} — ${esc(this.t(`env_name_${pt.id}`))}`;
    if (pt.kind === 'quest_interact') return `${k('prompt_pull_trap')} — ${esc(this.t('env_name_trap_dot'))}`;
    return '';
  }
  interact(pt) {
    const g = this.g;
    if (pt.kind === 'npc') return this.talk(pt.id, pt.npc);
    if (pt.kind === 'env_story') {
      this.inspect(pt.id);
      this.ui.subtitle('', this.t(`env_desc_${pt.id}`), 5);
      g.after(4.2, () => this.bark(`inspect:${pt.id}`, { force: true, seconds: 3 }));
      if (ENV_CODEX[pt.id]) g.codexUnlock(ENV_CODEX[pt.id]);
      g.sfx?.ui?.();
      return true;
    }
    if (pt.kind === 'quest_interact') {
      this.pulled.add(pt.id);
      const m = this.envMeshes[pt.id]; if (m) m.visible = false;
      g.sfx?.pickup?.(); g.input.rumble?.(0.4, 0.12);
      const pts = POINTS.filter((x) => x.kind === 'quest_interact');
      g.ui.toast(this.t('msg_trap_pulled', { n: pts.filter((x) => this.pulled.has(x.id)).length, max: pts.length }), 3);
      this.ui.subtitle('', this.t('env_desc_trap_dot'), 4);
      this.record('interact', pt.id);
      return true;
    }
    return false;
  }
  inspect(id) { this.inspected.add(id); this.record('inspect', id); }

  // ================================================================== dialogue
  _available(pointId) { return conversationsFor(this.data.dialogue, pointId, this.ctx()); }
  /** Something new to say at this talk point (marker above the NPC). */
  hasNew(pointId, npcId) {
    if (this._available(pointId).some((c) => !this.seen.has(c.id))) return true;
    return npcId === 'npc_nan' && this._songReady();
  }
  _songReady() {
    const s = this.data.dialogue.songs.find((x) => x.id === 'perf_ve_nan');
    return !this.songs.has(s.id) && (s.requires_flags ?? []).every((f) => this.hasFlag(f)) && (!s.after_quest_step || this.quests.stepDone(s.after_quest_step));
  }
  /** Talk at a point: an unseen conversation, else Năn's song, else a repeated last line. False = nothing (caller falls back). */
  talk(pointId, npcId, onEnd = null) {
    const conv = this._available(pointId).find((c) => !this.seen.has(c.id));
    if (conv) return this.startConversation(conv, npcId, onEnd);
    if (npcId === 'npc_nan' && this._songReady()) { this._playSong(); return true; }
    if (pointId === 'npc_ba_lai_do' || onEnd) return false; // the ferrywoman falls back to the hints, the caster to the furnace
    const last = [...this.seen].reverse().map((id) => this.data.dialogue.conversations.find((c) => c.id === id)).find((c) => c?.trigger?.ref === pointId);
    const n = this.npcs[npcId];
    const line = last ? [...(last.after_choice ?? []), ...(last.lines ?? [])].reverse().find((l) => l.speaker === npcId) : null;
    if (line) { this.say(resolveLine(line, this.data.strings.dialogue), 3.5); if (n) n.talkT = 2; return true; }
    return false;
  }
  _playSong() {
    const s = this.data.dialogue.songs.find((x) => x.id === 'perf_ve_nan');
    this.songs.add(s.id);
    const n = this.npcs.npc_nan; if (n) n.talkT = 13;
    this.sing(s.line_ref, s.singer);
    this.record('song', s.id);
  }

  startConversation(conv, npcId = null, onEnd = null) {
    const g = this.g;
    const run = new DialogueRun(conv, this.data.strings.dialogue, this.ctx());
    if (run.done) return false;
    this.dlg = { run, conv, npcId, onEnd, focus: 0, t: 0, prevMode: g.mode, cam0: { pos: g.camera.position.clone(), look: this._lookPoint() } };
    g.mode = 'dialogue'; g.input.exitLock(); g.ui.prompt(null); g.lockTarget = null;
    const p = g.player; p.state = p.state === 'free' || p.state === 'guard' ? 'free' : p.state; p.loco.speed = 0;
    if (npcId && this.npcs[npcId]) { const n = this.npcs[npcId]; p.yaw = Math.atan2(n.root.position.x - p.x, n.root.position.z - p.z); }
    this._renderDialog();
    return true;
  }
  _lookPoint() { const d = new THREE.Vector3(); this.g.camera.getWorldDirection(d); return this.g.camera.position.clone().addScaledVector(d, 5); }
  _renderDialog() {
    const d = this.dlg, g = this.g, node = d.run.node;
    if (!node) { this.ui.dialog(null); return; }
    const esc = g.ui.esc;
    if (node.kind === 'line') {
      const l = node.line, ok = storyLineAllowed(l, this.era, this.data.lineage);
      this.lineLog.push({ id: l.id, era: this.era, ok, vi: l.text?.vi ?? '' });
      if (!ok) { d.run.next(); this._renderDialog(); return; }
      this.ui.dialog({ name: l.speaker ? this.speakerName(l.speaker) : '', text: this.loc(l.text), hint: `${g.kbd('interact')} ${esc(this.t('prompt_continue'))}` });
      if (this.npcs[l.speaker]) this.npcs[l.speaker].talkT = 1.6;
    } else {
      this.ui.dialog({ name: this.speakerName('chr_coi'), text: '', choices: node.choices.map((c) => this.loc(c.text)), focus: d.focus,
        hint: `${g.kbd('weapon_slot_1')} ${g.kbd('weapon_slot_2')} · ${g.kbd('interact')}` });
    }
  }
  _choose(i) {
    const d = this.dlg; if (!d || d.run.node?.kind !== 'choice') return;
    const ch = d.run.conv.choices[i]; if (!ch) return;
    d.run.choose(i);
    this.record('choice', ch.id);
    this.g.sfx?.ui?.();
    d.focus = 0; this._renderDialog();
    if (d.run.done) this._endConversation();
  }
  updateDialogue(wallDt, input) {
    const d = this.dlg; if (!d) return;
    d.t += wallDt;
    const node = d.run.node;
    if (node?.kind === 'line') {
      if (d.t > 0.25 && (input.pressed('interact') || input.pressed('jump') || input.ui?.('ui_confirm'))) { d.run.next(); d.t = 0; this._renderDialog(); }
    } else if (node?.kind === 'choice') {
      const n = node.choices.length;
      if (input.pressed('move_down') || input.pressed('camera_down')) { d.focus = (d.focus + 1) % n; this._renderDialog(); }
      if (input.pressed('move_up') || input.pressed('camera_up')) { d.focus = (d.focus + n - 1) % n; this._renderDialog(); }
      if (input.pressed('weapon_slot_1')) this._choose(0);
      else if (input.pressed('weapon_slot_2') && n > 1) this._choose(1);
      else if (d.t > 0.25 && input.pressed('interact')) this._choose(d.focus);
    }
    if (this.dlg && d.run.done) this._endConversation();
    if (!this.dlg) return;
    this._dialogCamera(wallDt);
    this._tickNpcs(wallDt);
    this.g.player._anim(wallDt);
  }
  _dialogCamera(dt) {
    const g = this.g, d = this.dlg, p = g.player, n = this.npcs[d.npcId];
    if (!n) return;
    const nx = n.root.position.x, nz = n.root.position.z, mx = (p.x + nx) / 2, mz = (p.z + nz) / 2;
    const dx = nx - p.x, dz = nz - p.z, l = Math.hypot(dx, dz) || 1, sx = -dz / l, sz = dx / l;
    const side = d.side ?? (d.side = (Math.sin(g.cam.yaw) * sx + Math.cos(g.cam.yaw) * sz) >= 0 ? 1 : -1);
    const ground = this.gy(mx, mz);
    const pos = _v.set(mx + sx * 3.0 * side - dx / l * 0.9, 1.75 + ground, mz + sz * 3.0 * side - dz / l * 0.9);
    d.camBlend = Math.min(1, (d.camBlend ?? 0) + dt * 2);
    g.camera.position.lerpVectors(d.cam0.pos, pos, ease(d.camBlend));
    const look = lerp3([d.cam0.look.x, d.cam0.look.y, d.cam0.look.z], [nx * 0.6 + p.x * 0.4, 1.35 + ground, nz * 0.6 + p.z * 0.4], ease(d.camBlend));
    g.camera.lookAt(look[0], look[1], look[2]);
  }
  _endConversation() {
    const g = this.g, d = this.dlg; if (!d) return;
    this.dlg = null; this.ui.dialog(null);
    this.seen.add(d.conv.id);
    g.mode = d.prevMode === 'dialogue' ? 'playing' : d.prevMode;
    g.cam.init = false; g.input.clearAll();
    this.record('talk', d.conv.id);
    if (d.conv.id === 'cv_nghe_rescue') g.after(1.2, () => this.placeNpcs()); // Nghệ walks home to Bến Sậy
    if (d.conv.id === 'cv_nan_basket' && this._songReady()) g.after(0.8, () => this._playSong());
    d.onEnd?.();
    // Re-lock the mouse only when play resumes (onEnd may open a screen, e.g. the furnace: a lock would eat its clicks).
    if (g.mode === 'playing') g.input.requestLock();
  }

  // ================================================================== cut-scenes
  /** Play a cinematics.json scene. opts.onEnd(skipped) runs when it ends (the caller sets the next mode). */
  play(id, { onEnd } = {}) {
    const g = this.g, def = this.data.cinematics.cinematics.find((c) => c.id === id);
    if (!def) { onEnd?.(false); return false; }
    const tl = new CinematicTimeline(def);
    this.cin = { def, tl, onEnd, prevMode: g.mode, lastCam: null, blendFrom: null, shotEra: def.era, prevShot: null };
    this.cinLog.push({ id, t: g.playTime });
    g.mode = 'cinematic'; g.locked = true; g.lockTarget = null;
    g.ui.close(); g.ui.showHud(false); g.ui.prompt(null); g.ui.pryWidget?.(null);
    g.ui.hudView?.setCinematic(true);
    this.ui.cinematic(true);
    this._baseFov = g.fx.baseFov;
    for (const e of g.allEnemies()) e.mesh.root.visible = false; // the scene shows people and the place, not a fight
    this._camLook = new THREE.Vector3();
    this.updateCinematic(0, g.input);
    return true;
  }
  updateCinematic(wallDt, input) {
    const c = this.cin; if (!c) return;
    const g = this.g, tl = c.tl;
    const ev = tl.update(wallDt, { skipHeld: input.isDown('jump') || input.isDown('menu'), actionHeld: input.isDown('interact') });
    for (const e of ev) {
      if (e.type === 'shot') this._enterShot(e.shot);
      else if (e.type === 'line') {
        if (e.shot.ve_line_index != null && e.ref === 'dlg_06_ve_floor') continue; // verse shown line by line below
        this.say(this.line(e.ref), e.duration + 0.3, { era: e.shot.era ?? c.def.era });
      } else if (e.type === 'title') this.ui.card(this.t(e.key), Math.min(e.duration, 5.5));
      else if (e.type === 'interactive_done') { g.sfx?.drum?.(false); g.input.rumble?.(0.5, 0.15); this._shotEffect('done', e.shot); }
      else if (e.type === 'end') { this._finishCinematic(e.skipped); return; }
    }
    const s = tl.shot; if (!s) return;
    // Actors, props, camera.
    this._stage(s, tl.u, wallDt);
    this._camera(s, tl.u);
    // Prompts.
    const it = s.interactive && !tl.interactiveDone ? s.interactive : null;
    this.ui.hold(it ? { html: `${g.kbd('interact')} ${g.ui.esc(this.t(it.prompt_key))}`, progress: tl.holdProgress } : null);
    this.ui.skip(c.def.skippable !== false ? { text: this.t('cin_skip_hold', { key: g.glyphText('jump') }), progress: tl.skipProgress } : null);
  }
  /** End the running cut-scene now, as a completed skip (test hook ?intro=0, same end state as holding skip). */
  skip() { if (this.cin) this._finishCinematic(true); }
  _enterShot(s) {
    const c = this.cin, g = this.g;
    c.prevShot = c.shot; c.shot = s; c.shotEra = s.era ?? c.def.era;
    c.blendFrom = c.lastCam ? { pos: c.lastCam.pos.slice(), look: c.lastCam.look.slice() } : null;
    const st = STAGING[s.id] ?? { actors: {} };
    this.ui.black(s.camera?.kind === 'black' || (st.effects ?? []).includes('black'));
    // Verse line of the time-lapse (ve_line_index on dlg_06_ve_floor).
    if (s.ve_line_index != null) {
      const d = this.line('dlg_06_ve_floor'), vi = d.text.vi.split('\n'), en = d.text.en.split('\n'), k = s.ve_line_index;
      this.say({ id: `dlg_06_ve_floor#${k}`, speaker: d.speaker, text: { vi: vi[k], en: en[k] }, form: 'luc_bat' }, s.duration_s, { era: c.shotEra, song: true });
    }
    for (const fx of st.effects ?? []) this._shotEffect(fx, s);
    // Props of this shot only.
    for (const [id, m] of Object.entries(this.props)) m.visible = !!st.props?.[id];
    // People not in this shot are off screen.
    for (const n of Object.values(this.npcs)) n.root.visible = !!st.actors?.[n.id];
    g.player.rig.root.visible = !!(st.actors?.chr_coi || st.actors?.chr_buong);
    if (s.music) g.sfx?.startAmbience?.();
  }
  _shotEffect(fx, s) {
    const g = this.g, pr = g.props;
    switch (fx) {
      case 'strip_on_pole': this.strip.tied = true; g.codexUnlock('cx_dai_cham', true); break;
      case 'notch': this.strip.notch = true; break;
      case 'strip_new': this.strip.fresh = true; break;
      case 'house2': if (pr.hubHouse2) pr.hubHouse2.visible = true; break;
      case 'drum_big': pr.drum?.scale.setScalar(1.25); break;
      case 'to_buong': if (g.player.character !== 'chr_buong') { g.player.setCharacter('chr_buong'); this._poleRef = null; } break;
      case 'mist_far': if (pr.mist) { pr.mist.visible = true; pr.mist.material.opacity = 0.35; } break;
      case 'done':
        if (s.id === 'ho_s02') this.strip.notch = true;
        if (s.id === 'ho_s12') this.strip.fresh = true;
        break;
      default: break;
    }
  }
  _place(obj, spec, u) {
    let x, z, y = spec.y ?? 0, yaw = spec.yaw;
    if (spec.on) {
      const b = this.props[spec.on], [lx, ly, lz] = spec.local;
      const c = Math.cos(b.rotation.y), s = Math.sin(b.rotation.y);
      x = b.position.x + lx * c + lz * s; z = b.position.z - lx * s + lz * c; y = ly + b.position.y;
      if (yaw == null && !spec.face) yaw = b.rotation.y;
    } else if (spec.from) { const k = ease(u); x = spec.from[0] + (spec.to[0] - spec.from[0]) * k; z = spec.from[1] + (spec.to[1] - spec.from[1]) * k; if (spec.limp) y = 0.03 * Math.abs(Math.sin(u * 30)); }
    else { [x, z] = spec.at; }
    if (spec.face) yaw = Math.atan2(spec.face[0] - x, spec.face[1] - z);
    return { x, y, z, yaw: yaw ?? 0 };
  }
  _stage(s, u, dt) {
    const g = this.g, st = STAGING[s.id] ?? { actors: {} };
    for (const [id, spec] of Object.entries(st.props ?? {})) {
      const m = this.props[id]; if (!m) continue;
      if (spec.at || spec.from) {
        const pos = spec.from ? lerp3([spec.from[0], 0, spec.from[1]], [spec.to[0], 0, spec.to[1]], ease(u)) : [spec.at[0], 0, spec.at[1]];
        m.position.x = pos[0]; m.position.z = pos[2];
        if (id !== 'capsized') m.position.y = 0.02 * Math.sin(g.playTime * 1.3 + pos[0]);
        if (spec.yaw != null) m.rotation.y = spec.yaw;
      }
      if (id === 'flood') m.position.y = -0.3 + 0.55 * Math.sin(Math.PI * u);
    }
    if ((st.effects ?? []).includes('strip_on_pole_mid') && u > 0.45) this.strip.tied = true;
    const hat = this.props.capsized?.userData.hat; // the strip leaves the hat once Cói ties it on her pole
    if (hat) hat.children[1].visible = hat.children[2].visible = !this.strip.tied;
    for (const [id, spec] of Object.entries(st.actors ?? {})) {
      if (id === 'chr_coi' || id === 'chr_buong') {
        const p = g.player, q = this._place(p, spec, u);
        // On the boat q.y is absolute (water); on land it is above the ground (the player rig adds the ground).
        p.x = q.x; p.z = q.z; p.y = spec.on ? q.y - this.gy(q.x, q.z) : q.y; p.yaw = q.yaw;
        p.state = spec.pose === 'offer' ? 'handover' : 'free'; p.loco.speed = spec.from ? 1.1 : 0;
        p.showPole(spec.pose === 'pole' || spec.pose === 'offer');
        p.animOverride = null; p.rig.root.visible = true;
        p._anim(dt);
        p.rig.root.scale.setScalar(spec.aged ? 1 - 0.03 * spec.aged : 1);
        continue;
      }
      const n = this.npcs[id]; if (!n) continue;
      const q = this._place(n.root, spec, u);
      n.root.position.set(q.x, q.y + (spec.on ? 0 : this.gy(q.x, q.z)), q.z); n.root.rotation.y = q.yaw; n.root.visible = true;
      n.pose = spec.pose === 'pole' ? 'idle' : spec.pose ?? 'idle';
      if (n.rig.torch) n.rig.torch.visible = spec.pose === 'torch';
    }
    this._tickNpcs(dt, true);
    this._syncPole();
  }
  _camera(s, u) {
    const g = this.g, c = this.cin, st = STAGING[s.id] ?? {};
    let pose = shotCamera(s, u);
    if (pose && st.camShift) { const [dx, dy, dz] = st.camShift; pose.pos = [pose.pos[0] + dx, pose.pos[1] + dy, pose.pos[2] + dz]; pose.look = [pose.look[0] + dx, pose.look[1] + dy, pose.look[2] + dz]; }
    if (!pose && st.cam?.pole) pose = this._poleCamera(st.cam, u);
    else if (!pose && st.cam) pose = { pos: st.cam.from, look: st.cam.look, fov: st.cam.fov ?? s.camera?.fov_deg ?? 40 };
    if (s.camera?.kind === 'blend_to_gameplay') {
      const p = g.player, dist = this.data.combat.feel?.camera_distance_m ?? 6.5, pitch = 0.38;
      g.cam.yaw = p.yaw + Math.PI; g.cam.pitch = pitch; g.cam.dist = dist;
      const want = { pos: [p.x + Math.sin(g.cam.yaw) * Math.cos(pitch) * dist, 1.6 + Math.sin(pitch) * dist, p.z + Math.cos(g.cam.yaw) * Math.cos(pitch) * dist], look: [p.x, 1.6, p.z] };
      const from = c.blendFrom ?? want, k = ease(Math.min(1, u * 1.4));
      pose = { pos: lerp3(from.pos, want.pos, k), look: lerp3(from.look, want.look, k), fov: s.camera.fov_deg ?? 60 };
    }
    if (!pose) { // black / unknown: keep the last camera
      if (s.camera?.kind === 'black') g.fx.baseFov = s.camera.fov_deg ?? this._baseFov;
      return;
    }
    // A slow breathing drift keeps locked shots alive (5 cm, never on the black card).
    const t = g.playTime, drift = s.camera?.kind?.startsWith('locked') ? 0 : 0.05;
    g.camera.position.set(pose.pos[0] + Math.sin(t * 0.7) * drift, pose.pos[1] + Math.sin(t * 0.9) * drift * 0.6, pose.pos[2]);
    const cp = g.camera.position, gMin = this.gy(cp.x, cp.z) + 0.45; // never inside a bank or knoll
    if (cp.y < gMin) cp.y = gMin;
    g.camera.lookAt(pose.look[0], pose.look[1], pose.look[2]);
    g.fx.baseFov = pose.fov;
    c.lastCam = { pos: pose.pos, look: pose.look };
  }
  /** Close-up on the tip of the live Mũi Sào (notch, indigo strip): beside the tip, slightly above, drifting in. */
  _poleCamera(spec, u) {
    const pole = this.g.player?.pole; if (!pole) return null;
    pole.updateWorldMatrix(true, false);
    const tip = new THREE.Vector3(0, 0, 2.25).applyMatrix4(pole.matrixWorld), base = new THREE.Vector3(0, 0, 1.0).applyMatrix4(pole.matrixWorld);
    const dir = tip.clone().sub(base).normalize(), up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(dir, up); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize().multiplyScalar(spec.side ?? 1);
    const dist = 0.95 - 0.12 * ease(u) + (spec.back ?? 0);
    const pos = tip.clone().addScaledVector(side, dist).addScaledVector(up, 0.32).addScaledVector(dir, -0.35);
    const look = tip.clone().addScaledVector(dir, -0.05);
    return { pos: [pos.x, pos.y, pos.z], look: [look.x, look.y, look.z], fov: spec.fov ?? 30 };
  }
  _finishCinematic(skipped) {
    const g = this.g, c = this.cin; if (!c) return;
    // A skipped scene still leaves the world as its end state (strip tied, era switched, house built...).
    if (skipped) for (const s of c.def.shots) for (const fx of STAGING[s.id]?.effects ?? []) if (PERSISTENT_EFFECTS.has(fx)) this._shotEffect(fx === 'strip_on_pole_mid' ? 'strip_on_pole' : fx, s);
    for (const s of c.def.shots) if (s.interactive) this._shotEffect('done', s);
    if (c.def.id === 'cin_cold_open') this.strip.tied = true;
    this.cin = null;
    this.cinLog[this.cinLog.length - 1].skipped = skipped;
    this.cinLog[this.cinLog.length - 1].end = g.playTime;
    for (const m of Object.values(this.props)) m.visible = false;
    if (g.props.mist && g.villagerSaved) g.props.mist.visible = false;
    g.fx.baseFov = this._baseFov ?? 60;
    this.ui.cinematic(false); this.ui.subtitle('', '');
    g.ui.hudView?.setCinematic(false); g.ui.showHud(true);
    const p = g.player; p.rig.root.visible = true; p.rig.root.scale.setScalar(1); p.y = 0; p.state = 'free'; p.showPole(false); p.loco.speed = 0;
    for (const e of g.allEnemies()) e.mesh.root.visible = e.state !== 'gone';
    g.locked = false; g.cam.init = false;
    this.placeNpcs();
    g.mode = c.prevMode === 'cinematic' ? 'playing' : c.prevMode;
    if (g.mode === 'title' || g.mode === 'boot') g.mode = 'playing';
    this.record('cinematic', c.def.id);
    c.onEnd?.(skipped);
  }

  // ================================================================== per frame (playing)
  _tickNpcs(dt, inCinematic = false) {
    const p = this.g.player;
    for (const n of Object.values(this.npcs)) {
      if (!n.root.visible) continue;
      n.talkT = Math.max(0, (n.talkT ?? 0) - dt);
      if (!inCinematic && !this.dlg) {
        // Turn toward the player when close (conversation partner), back home otherwise.
        const d = Math.hypot(p.x - n.root.position.x, p.z - n.root.position.z);
        const want = d < 4.5 ? Math.atan2(p.x - n.root.position.x, p.z - n.root.position.z) : n.homeYaw ?? n.root.rotation.y;
        let da = want - n.root.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
        n.root.rotation.y += da * Math.min(1, dt * 3);
      } else if (this.dlg && n.id === this.dlg.npcId) {
        const want = Math.atan2(p.x - n.root.position.x, p.z - n.root.position.z);
        let da = want - n.root.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); n.root.rotation.y += da * Math.min(1, dt * 5);
      }
      this._npcAnim(n, dt, n.talkT > 0);
    }
  }
  tick(wallDt) {
    const g = this.g, p = g.player;
    this._tickNpcs(wallDt);
    this._syncPole();
    // Breathing mud bed (Ụ Bùn being woken).
    const bed = this.envMeshes.np_o_bun_xoi;
    if (bed) for (const b of bed.children) if (b.userData.bubble != null) b.scale.setScalar(0.8 + 0.4 * Math.abs(Math.sin(g.playTime * 1.7 + b.userData.bubble)));
    // Barks from player state changes (heal) and low health.
    if (p.state === 'heal' && this._prevPState !== 'heal') this.bark('heal');
    this._prevPState = p.state;
    const ratio = p.hp / p.hpMax;
    if (ratio < 0.3 && !this.lowHpBarked && p.alive) { this.lowHpBarked = true; this.bark(g.villagerSaved ? 'low_health_after_rescue' : 'low_health_before_rescue'); }
    if (ratio > 0.6) this.lowHpBarked = false;
    // Codex: creatures met (creatures_0_4 display entries).
    for (const e of g.allEnemies()) if (e.engaged && e.alive) { const c = creatureFor(this.data, e.def.id, this.era); if (c) g.codexUnlock(c.id); }
    // HUD tracker + NPC markers.
    this.ui.setTracker(this._trackerState());
    this._marks();
    this.ui.tick(wallDt);
  }
  /** Ticks the DOM timers in any mode (subtitles / banners keep timing while a menu or scene runs). */
  uiTick(wallDt) { if (this.g.mode !== 'playing') this.ui.tick(wallDt); }
  _marks() {
    const g = this.g, list = this._markList ?? (this._markList = []), w = innerWidth, h = innerHeight;
    list.length = 0;
    const add = (id, x, y, z) => {
      _v.set(x, y, z).project(g.camera);
      const dist = Math.hypot(x - g.player.x, z - g.player.z);
      list.push({ id, sx: (_v.x + 1) / 2 * w, sy: (1 - _v.y) / 2 * h, visible: _v.z < 1 && Math.abs(_v.x) < 1 && Math.abs(_v.y) < 1 && dist < 40 });
    };
    if (g.mode === 'playing' && this.era === COI_ERA) {
      for (const pt of POINTS) {
        if (pt.kind === 'npc' && this.pointAvailable(pt) && this.hasNew(pt.id, pt.npc)) { const n = this.npcs[pt.npc]; add(pt.id, n.root.position.x, n.root.position.y + 2.2 * (NPC_LOOK[pt.npc]?.height ?? 1), n.root.position.z); }
        if (pt.id === 'npc_ba_lai_do' && this.hasNew(pt.id, 'npc_ba_lai_do') && this.npcs.npc_ba_lai_do.root.visible) add(pt.id, pt.x, this.gy(pt.x, pt.z) + 2.1, pt.z + 0.8);
        if (pt.kind === 'quest_interact' && this.pointAvailable(pt)) add(pt.id, pt.x, this.gy(pt.x, pt.z) + 1.5, pt.z);
      }
    }
    this.ui.marks(list);
  }

  // ================================================================== creature display / codex
  creatureName(def) { const c = creatureFor(this.data, def.id, this.era); return this.loc(c?.name ?? def.name); }
  /** Codex entries made from creatures_0_4 (name, description, moves) for the Codex list. */
  codexEntries() {
    return this.data.creatures.creatures.map((c) => ({ id: c.id, title: c.name, text: c.description, label: c.label, sources: [], review_status: c.review_status, moves: c.attack_display ? Object.values(c.attack_display) : null }));
  }

  debug() {
    const q = this.quests, tr = q.tracked();
    return {
      mode: this.g.mode, cinematic: this.cin ? { id: this.cin.def.id, shot: this.cin.tl.shot?.id ?? null, t: +this.cin.tl.total.toFixed(2), era: this.cin.shotEra, waiting: this.cin.tl.waiting, skip: this.cin.tl.skipProgress, hold: this.cin.tl.holdProgress } : null,
      cinLog: this.cinLog.map((x) => ({ ...x })), dialogue: this.dlg ? { conv: this.dlg.conv.id, node: this.dlg.run.node?.kind ?? null, line: this.dlg.run.node?.line?.id ?? null, speaker: this.dlg.run.node?.line?.speaker ?? null } : null,
      tracked: tr ? { quest: tr.id, step: q.currentStep(tr.id)?.id ?? null } : null, quests: q.state, seen: [...this.seen], facts: [...q.facts],
      strip: { ...this.strip }, lineLog: this.lineLog.slice(-80), subtitle: this.ui.lastSub ?? null,
      npcs: Object.fromEntries(Object.entries(this.npcs).map(([id, n]) => [id, { x: +n.root.position.x.toFixed(2), z: +n.root.position.z.toFixed(2), visible: n.root.visible }])),
    };
  }
}
