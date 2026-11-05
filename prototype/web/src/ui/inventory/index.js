// ui/inventory/index.js - Demo 0.3 UI systems wired into the game (hooks are one-liners in game.js):
//   createGameProgress(game)  -> game.progress (logic/progression.js) bound to the game's inventory,
//                                lineage weapons / flags and the Bảo khí slot
//   installUi03(game)         -> game.ui03: Pack (B), world map (M / Pack tab), minimap (HUD top-left),
//                                exploration (fog, lookouts, chests, environment secrets), gear on the
//                                player rig, XP / item notices.
// Hooks used by game.js: ui03.update(input, wallDt) while playing (returns true when it opened a
// screen), ui03.menuKeys(input, wallDt) while a screen is open, ui03.tick(wallDt) every frame,
// ui03.reset() on a new game, ui03.pointAvailable/promptFor/interact for the new world points,
// ui03.xp(kind, ref), ui03.onEnemyDefeated(e), ui03.openTab(tab).
import { Progress } from '../../logic/progression.js';
import { Exploration } from '../map/exploration.js';
import { Minimap } from '../map/minimap.js';
import { Pack } from './pack.js';
import { attachGear, gearKey } from './gearVisuals.js';

export function createGameProgress(game) {
  return new Progress(game.data, {
    store: () => game.inv,
    weapons: () => game.gen?.weapons ?? [],
    currentWeapon: () => game.player?.weaponId ?? game.gen?.weapons?.[0] ?? null,
    isUnlocked: (k) => (k === 'character_weapon_slots_2' ? (game.gen?.slots ?? 1) >= 2
      : k === 'flag_villager_saved' ? !!game.villagerSaved : !!game.gen?.flags?.has(k)),
    baoKhi: { owned: () => Object.keys(game.gen?.owned ?? {}), get: () => game.equipped ?? null, set: (id) => { game.equipped = id; } },
  });
}

export class Ui03 {
  constructor(game) {
    this.g = game;
    this.explore = new Exploration(game);
    this.minimap = new Minimap(game, this.explore, game.ui.hudView?.minimapSlot);
    this.pack = new Pack(game, this);
    this.fallback = new Set();
    this._installFallbackKeys();
    game.progress.onChange((ev) => this._onProgress(ev));
  }

  /** B / M straight from controls.json scheme_0_3 while the merged bindings do not have them yet. */
  _installFallbackKeys() {
    const sc = this.g.data.controls.scheme_0_3 ?? {};
    const all = [...(sc.actions_add ?? []), ...(sc.actions_replace ?? [])];
    const codes = {};
    for (const id of ['inventory', 'map']) { const a = all.find((x) => x.id === id); if (a) codes[id] = a.kbm.inputs; }
    addEventListener('keydown', (e) => {
      if (e.repeat || this.g.input.capture) return;
      for (const [id, list] of Object.entries(codes)) if (list.includes(e.code) && !this.g.input.bindings.desc.info[id]) this.fallback.add(id);
    });
  }
  consumeFallback(id) { return this.fallback.delete(id); }

  reset() {
    this.explore.reset();
    for (const g of Object.values(this.g.props?.points03 ?? {})) {
      if (g.userData.lid) g.userData.lid.rotation.x = 0;
      if (g.userData.nest) g.userData.nest.position.set(0, 0.1, 0);
      if (g.userData.beads) g.userData.beads.visible = true;
      if (g.userData.bundle) g.userData.bundle.visible = true;
    }
  }

  // ---------------------------------------------------------------- notices
  toast(text, s = 2.5) { this.g.ui.toast(text, s); }
  _onProgress(ev) {
    const g = this.g, t = g.i18n.t;
    if (ev.type === 'xp') this.toast(t('msg_xp', { n: ev.n }), 2.2);
    if (ev.type === 'item' && ev.gear) {
      const pc = g.data.items.gear_0_3.pieces.find((x) => x.id === ev.id);
      g.ui.pickup(t('msg_got_gear', { name: g.loc(pc.name) }));
      g.sfx?.pickup?.();
    }
  }
  /** Gives an item or gear piece (stack limits apply) with the pickup notice. */
  grant(id, n = 1) {
    const g = this.g;
    const r = g.progress.addItem(id, n);
    if (r.kind === 'stack' && r.added > 0) {
      const it = g.data.items.items.find((x) => x.id === id);
      g.ui.pickup(g.i18n.t('msg_got_item', { name: g.loc(it.name), n: r.added })); g.sfx?.pickup?.();
    }
    if (r.kind === 'stack' && r.overflow > 0) this.toast(g.i18n.t('inv_reason_stack_full'));
    return r;
  }
  xp(kind, ref) { return this.g.progress.awardXp(kind, ref); }
  /** XP + drops for a driven-off enemy, unless the gameplay module (game.gp) awards them itself. */
  onEnemyDefeated(e) {
    const g = this.g;
    if (g.gp || e.isBoss || e.practice) return;
    this.xp('enemy', e.def.id);
    for (const d of g.progress.rollDrops(e.def, g.rng)) this.grant(d.item, d.count);
  }

  // ---------------------------------------------------------------- world points (world.js POINTS)
  pointAvailable(pt) { return this.explore.pointAvailable(pt); }
  promptFor(pt) { return this.explore.promptFor(pt); }
  interact(pt) { return this.explore.interact(pt); }

  // ---------------------------------------------------------------- frame hooks
  openTab(tab) { this.pack.open(tab); }
  /** While playing. Returns true when a screen opened (the caller stops its update). */
  update(input, wallDt) {
    const g = this.g;
    if (input.pressed('inventory') || this.consumeFallback('inventory')) { this.pack.open('equipment'); return true; }
    if (input.pressed('map') || this.consumeFallback('map')) { this.pack.open('map'); return true; }
    this.explore.update(wallDt);
    return false;
  }
  /** While a screen is open: the Pack handles its own keys. */
  menuKeys(input, wallDt) {
    if (!this.pack.isOpen) { this.fallback.clear(); return false; }
    this.pack.nav(input, wallDt);
    return true;
  }
  /** Every frame (any mode). */
  tick(wallDt) {
    const g = this.g;
    this.minimap.update(wallDt);
    if (this.pack.isOpen) this.pack.tick(wallDt);
    // Worn gear on the player's rig (the rig is rebuilt when the character changes).
    const rig = g.player?.rig, worn = g.progress.equipment.worn(), k = gearKey(worn);
    if (rig && (rig !== this._rig || k !== this._gearKey)) { attachGear(rig, worn); this._rig = rig; this._gearKey = k; }
  }

  debug() {
    return { pack: this.pack.debugState(), fogVersion: this.explore.fog.version, discovered: [...this.explore.discovered], opened: [...this.explore.opened],
      envDone: [...this.explore.envDone], markers: this.explore.markers.list.length, minimapHidden: this.minimap.el.classList.contains('off'),
      minimapRect: (() => { const r = this.minimap.el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })(),
      xp: this.g.progress.xp, skills: { ...this.g.progress.skillLevels }, objective: this.explore.objectiveTarget() };
  }
}

export function installUi03(game) { return new Ui03(game); }
