// ui/map/exploration.js - game-side state of the Demo 0.3 map (map.json): fog revealed as the
// player walks (and wider at lookouts), lookouts found by walking up to them, rattan chests and
// environment secrets opened with Interact (rewards from data), custom markers, objective tracking,
// zone completion and fast travel between found resting fires. Reads the game; owns no rendering.
import { MapFog, MarkerSet, zoneOf, levelOf, zoneProgress } from './mapModel.js';
import { POINTS, zoneAt } from '../../game/world.js';

const COI_ERA = 'era_lac_long_quan';
const OBJECTIVE_TARGETS = {
  obj_find_villager: 'villager', obj_boss: 'lm_boss_arena', obj_return: 'ferry_ben_say', obj_craft: 'furnace', obj_handoff: 'drum',
  obj_practice: 'drum', obj_end: 'drum',
};

export class Exploration {
  constructor(game) {
    this.g = game; this.map = game.data.map;
    const cm = this.map.world_map.custom_markers;
    this.markers = new MarkerSet(cm.max, cm.kinds);
    this.fog = new MapFog(this.map);
    this.reset();
  }
  reset() {
    this.fog.reset(); this.markers.clear();
    this.discovered = new Set(); this.opened = new Set(); this.envDone = new Set(); this.seenZones = new Set();
    this.tracking = true; this._last = null; this._t = 0;
    // "reveal: always" landmarks are drawn on the cloth from the start (the ferrywoman knows her landing).
    for (const l of this.map.landmarks) if (l.reveal === 'always') this.fog.reveal(l.x, l.z, 6);
  }
  get coi() { return this.g.era === COI_ERA; }

  // ---------------------------------------------------------------- per frame (playing)
  update(dt) {
    const p = this.g.player; if (!p) return;
    this._t += dt;
    const moved = !this._last || Math.hypot(p.x - this._last.x, p.z - this._last.z) > 1.0;
    if (moved || this._t > 0.5) {
      this._t = 0; this._last = { x: p.x, z: p.z };
      this.fog.reveal(p.x, p.z);
      const z = zoneOf(this.map, p.x, p.z); if (z) this.seenZones.add(z.id);
    }
    if (!this.coi) return;
    for (const dp of this.map.discovery_points) {
      if (this.discovered.has(dp.id)) continue;
      const pt = POINTS.find((x) => x.id === dp.id);
      if (Math.hypot(dp.x - p.x, dp.z - p.z) <= (pt?.r ?? 3.5)) this.discover(dp);
    }
  }
  discover(dp) {
    this.discovered.add(dp.id);
    this.fog.reveal(dp.x, dp.z, dp.reveal_radius_m ?? this.map.fog.reveal_radius_m);
    const T = this.g.i18n.t;
    this.g.ui.center(T('msg_lookout', { name: this.g.loc(dp.name) }), 2.2);
    this.g.sfx?.ui?.();
    this.g.ui03?.xp('discovery_point', dp.id);
  }

  // ---------------------------------------------------------------- interactable points (world.js POINTS)
  pointAvailable(pt) {
    if (!this.coi) return false;
    if (pt.kind === 'chest') return !this.opened.has(pt.id);
    if (pt.kind === 'env_secret') return !this.envDone.has(pt.id);
    return false;
  }
  promptFor(pt) {
    const ui = this.g.ui, T = this.g.i18n.t;
    const def = this.map.chests.find((c) => c.id === pt.id) ?? this.map.environment_secrets.find((c) => c.id === pt.id);
    const key = pt.kind === 'chest' ? 'prompt_open_chest' : 'prompt_inspect_secret';
    return `${this.g.kbd('interact')} ${ui.esc(T(key))} — ${ui.esc(this.g.loc(def?.name))}`;
  }
  interact(pt) {
    const g = this.g, props = g.props.points03?.[pt.id];
    if (pt.kind === 'chest') {
      const c = this.map.chests.find((x) => x.id === pt.id); if (!c) return false;
      this.opened.add(pt.id);
      if (props?.userData.lid) props.userData.lid.rotation.x = -1.9;
      for (const it of c.contents) g.ui03.grant(it.gear ?? it.item, it.count ?? 1);
      return true;
    }
    if (pt.kind === 'env_secret') {
      const es = this.map.environment_secrets.find((x) => x.id === pt.id); if (!es) return false;
      this.envDone.add(pt.id);
      g.ui.subtitle('', g.loc(es.description), 6);
      if (props?.userData.nest) { props.userData.nest.position.set(1.0, 2.6, -0.45); }
      if (props?.userData.beads) props.userData.beads.visible = false;
      if (props?.userData.bundle) props.userData.bundle.visible = false;
      for (const it of es.reward?.items ?? []) g.ui03.grant(it.item, it.count);
      for (const gid of es.reward?.gear ?? []) g.ui03.grant(gid, 1);
      g.ui03.xp('environment_secret', es.id);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- visibility, objective, progress
  /** Landmark visible on the map / minimap: reveal always, or its spot seen (on_discover), or tracked (on_quest). */
  landmarkVisible(l) {
    if (l.kind === 'secret' && !(this.coi && this.g.secretVisible())) return false;
    if (l.kind === 'gather' && this.g.gathered?.has(l.world_point)) return false;
    if (l.kind === 'quest' && this.g.villagerSaved) return false;
    if (l.reveal === 'always') return true;
    if (l.reveal === 'on_quest') { const t = this.objectiveTarget(); return (t && t.id === l.id) || this.fog.isRevealed(l.x, l.z); }
    return this.fog.isRevealed(l.x, l.z);
  }
  objectiveKey() {
    const text = this.g.objective?.(); if (!text) return null;
    const T = this.g.i18n.t;
    return Object.keys(OBJECTIVE_TARGETS).find((k) => T(k) === text) ?? null;
  }
  /** Tracked objective: { id, key, x, z, name, zone } or null (tracking off / nothing to track). */
  objectiveTarget() {
    if (!this.tracking) return null;
    const key = this.objectiveKey(); if (!key) return null;
    const ref = OBJECTIVE_TARGETS[key];
    const lm = this.map.landmarks.find((l) => l.id === ref || l.world_point === ref);
    const pt = POINTS.find((x) => x.id === ref);
    const x = lm?.x ?? pt?.x, z = lm?.z ?? pt?.z;
    if (x == null) return null;
    return { id: lm?.id ?? ref, key, x, z, text: this.g.i18n.t(key), zone: zoneOf(this.map, x, z)?.id ?? null };
  }
  secretNodes() {
    if (!this.coi || !this.g.secretVisible()) return [];
    return POINTS.filter((p) => p.kind === 'secret').map((p) => ({ zone: zoneOf(this.map, p.x, p.z)?.id ?? zoneAt(p.x, p.z), done: this.g.secret.completed.has(p.node) }));
  }
  zoneProgress(zoneId) {
    return zoneProgress(this.map, zoneId, { chests: this.opened, envSecrets: this.envDone, discovered: this.discovered, secretNodes: this.secretNodes() });
  }

  // ---------------------------------------------------------------- fast travel (map.json fast_travel)
  /** Resting fires that can be travelled to: [{ landmark, ok, reason }]. */
  fastTravelTargets() {
    const ft = this.map.fast_travel, p = this.g.player;
    const engaged = this.g.allEnemies().some((e) => e.alive && e.engaged && Math.hypot(e.x - p.x, e.z - p.z) < 30);
    const zone = zoneOf(this.map, p.x, p.z)?.id;
    const here = levelOf(this.map, p.x, p.z)?.id;
    return this.map.landmarks.filter((l) => l.fast_travel && this.landmarkVisible(l)).map((l) => {
      let reason = null;
      if (!this.coi) reason = 'era';
      else if (ft.blocked_while_engaged && engaged) reason = 'engaged';
      else if (ft.blocked_in.includes(zone)) reason = 'zone';
      else if (levelOf(this.map, l.x, l.z)?.id !== here) reason = 'level';
      return { landmark: l, ok: !reason, reason };
    });
  }
  travelTo(landmarkId) {
    const t = this.fastTravelTargets().find((x) => x.landmark.id === landmarkId);
    if (!t?.ok) return false;
    const g = this.g;
    g.resume();
    g.travel({ x: t.landmark.x - 1.5, z: t.landmark.z + 1.5 });
    return true;
  }

  toJSON() { return { fog: this.fog.toJSON(), markers: this.markers.list, discovered: [...this.discovered], opened: [...this.opened], envDone: [...this.envDone] }; }
}
