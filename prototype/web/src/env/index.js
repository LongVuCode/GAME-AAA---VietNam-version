// env/index.js - environment layer (Demo 0.4 look-dev): data-driven terrain, water, foliage, CC0 /
// Blender props, HDRI lighting, mist. Built synchronously from the layout (terrain + water appear at
// once with palette colours), assets stream in afterwards. API (used by fx/atmosphere.js):
//
//   const env = new Environment(world, renderer, { source })   // source: 'world_0_3' | 'world_0_4'
//   env.state            'loading' | 'ready' | 'partial' (some asset failed) | 'failed'
//   env.ready            Promise (resolves when every load settled)
//   env.update(dt, focus, camera, mood)   env.setQuality('high' | 'low')   env.stats()
//   env.heightAt(x, z)   terrain height (for the game layer when 0.4 walkability lands)
//   env.onHdri = (texture, meanLum) => ...   hook for the sky / IBL (atmosphere)
import * as THREE from 'three';
import { HUB_X, AREAS, SHALLOW_SHEETS, MUD_POOLS_BASE, POINTS, VAULTS, SPAWNS } from '../game/world.js';
import { legacyLayout } from './layout.js';
import { terrainModel, treeSpots, canopySpots } from '../game/world04.js';
import { createField } from './field.js';
import { buildPatchGrid, buildTerrainMeshes, terrainMaterial, setTerrainTextures, heightTexture } from './terrain.js';
import { waterMaterial, waterPlane } from './water.js';
import { buildFoliage } from './foliage.js';
import { scatter } from './scatter.js';
import { PropLibrary, dressLegacy, dressWorld04, instancedTrees, canopyBlobs, lowTrunks, hideGrayLayers } from './props.js';
import { Mist } from './mist.js';
import { ASSETS, loadArrayTexture, loadTexture, loadGLB, loadHDR } from './assets.js';

const LEGACY = { AREAS, SHALLOW_SHEETS, MUD_POOLS_BASE, POINTS, VAULTS, HUB_X, SPAWNS };

/** Water level of the shallow sheets and mud pools (their hollows are carved below it in env/field.js). */
const SHEET_Y = -0.03;
export const ENV_QUALITY = {
  high: { mist: 36, terrainLod: 110, terrainFar: 320, anisotropy: 8, treeDist: 190, canopyDist: 330, propDist: 1e9 },
  low: { mist: 4, terrainLod: 30, terrainFar: 150, anisotropy: 1, treeDist: 80, canopyDist: 200, propDist: 70 },
};

/** Which layout to build: the Demo 0.4 world (design/data/world_0_4.json, the one the game walks on);
 *  ?world=03 renders the old 0.3 layout for look-dev comparisons only (gameplay stays on 0.4). */
export function pickSource(search = typeof location !== 'undefined' ? location.search : '') {
  return new URLSearchParams(search).get('world') === '03' ? 'world_0_3' : 'world_0_4';
}

export class Environment {
  constructor(world, renderer, { source = pickSource(), load = true } = {}) {
    this.world = world; this.renderer = renderer; this.scene = world.scene; this.quality = 'high';
    this.source = source;
    // 0.4: the same layout + height field as the game's ground (world.js groundAt), so feet, camera and terrain agree.
    const model = source === 'world_0_4' ? terrainModel(LEGACY) : null;
    this.layout = model ? model.layout : legacyLayout(LEGACY);
    this.field = model ? model.field : createField(this.layout);
    this.timing = {};
    const t0 = performance.now();
    this.grids = this.layout.patches.map((p) => buildPatchGrid(this.field, p));
    this.timing.gridMs = Math.round(performance.now() - t0);
    this.root = new THREE.Group(); this.root.name = 'environment'; this.scene.add(this.root);
    this.terrainMat = terrainMaterial(this.layout.waterY);
    this.terrain = this.grids.map((G) => buildTerrainMeshes(G, this.terrainMat));
    for (const t of this.terrain) this.root.add(t.group);
    this.timing.terrainMs = Math.round(performance.now() - t0);
    this._buildWater();
    hideGrayLayers(world);
    const t1 = performance.now();
    this.items = scatter(this.layout, this.field, this.grids);
    this.timing.scatterMs = Math.round(performance.now() - t1);
    this.mist = new Mist(ENV_QUALITY.high.mist, this.layout.waterY); this.root.add(this.mist.mesh);
    this.foliage = []; this.propsPlaced = []; this.scatterMeshes = []; this.errors = [];
    this.loaded = { terrain: false, reeds: false, grass: false, props: false, nature: false, hdri: false };
    this.state = 'loading';
    this.onHdri = null; this._hdri = null;
    this.timing.buildMs = Math.round(performance.now() - t0);
    this.ready = load ? this._load() : Promise.resolve();
  }

  _buildWater() {
    const L = this.layout;
    this.waterMats = [];
    this.water = [];
    this.grids.forEach((G, i) => {
      const ht = heightTexture(G);
      G.heightTex = ht;
      const P = G.patch;
      const main = waterMaterial(ht, G, L.waterY, { deep: 0x4f5138, shallow: 0x6a694d, reflect: 0.8 });
      this.water.push(waterPlane(P.x0, P.x1, P.z0, P.z1, L.waterY, main)); this.waterMats.push(main);
      if (i !== 0) return;
      const sheet = waterMaterial(ht, G, SHEET_Y, { deep: 0x5e5d43, shallow: 0x6a694d, reflect: 0.65, clarity: 4.5, opacityMax: 0.9 });
      this.waterMats.push(sheet);
      for (const s of L.shallow) this.water.push(waterPlane(s.x0 - 2.6, s.x1 + 2.6, s.z0 - 2.6, s.z1 + 2.6, SHEET_Y, sheet));
      for (const v of L.ditches) this.water.push(waterPlane(Math.min(v.ax, v.bx) - 1, Math.max(v.ax, v.bx) + 1, Math.min(v.az, v.bz) - v.hw - 1, Math.max(v.az, v.bz) + v.hw + 1, -0.04, sheet));
      const mire = waterMaterial(ht, G, SHEET_Y, { deep: 0x2a241c, shallow: 0x3a3024, reflect: 0.45, ripple: 0.25, clarity: 14, opacityMax: 0.98 });
      this.waterMats.push(mire);
      for (const p of L.mudPools) this.water.push(waterPlane(p.cx - p.r * 1.3, p.cx + p.r * 1.3, p.cz - p.r * 1.3, p.cz + p.r * 1.3, SHEET_Y, mire));
    });
    for (const w of this.water) this.root.add(w);
  }

  async _load() {
    const A = ENV_QUALITY[this.quality].anisotropy;
    const jobs = {
      terrain: Promise.all([
        loadArrayTexture(ASSETS.terrainAlbedo, 5, { srgb: true, anisotropy: A }),
        loadArrayTexture(ASSETS.terrainNrm, 5, { anisotropy: A }),
        loadArrayTexture(ASSETS.terrainHeight, 5, { anisotropy: 1 }),
      ]).then(([alb, nrm, hgt]) => { this.terrainTex = { alb, nrm, hgt }; setTerrainTextures(this.terrainMat, this.terrainTex); }),
      reeds: loadTexture(ASSETS.reeds, { anisotropy: A }).then((t) => this._addFoliage('reed', this.items.reeds, t, 4)),
      grass: loadTexture(ASSETS.grass, { anisotropy: A }).then((t) => this._addFoliage('grass', this.items.grass, t, 4)),
      models: Promise.all([loadGLB(ASSETS.props), loadGLB(ASSETS.nature)]).then(([p, n]) => this._addProps(p, n)),
      hdri: loadHDR(ASSETS.hdri).then((t) => { this._hdri = t; this.loaded.hdri = true; this.onHdri?.(t, meanSkyLum(t)); }),
    };
    const names = Object.keys(jobs);
    const res = await Promise.allSettled(Object.values(jobs));
    res.forEach((r, i) => {
      if (r.status === 'rejected') this.errors.push(`${names[i]}: ${r.reason?.message ?? r.reason}`);
      else if (names[i] === 'terrain') this.loaded.terrain = true;
      else if (names[i] === 'models') this.loaded.props = this.loaded.nature = true;
    });
    this.state = this.errors.length === 0 ? 'ready' : this.errors.length >= names.length ? 'failed' : 'partial';
    if (this.errors.length) console.warn(`[env] assets not loaded (graybox kept for those): ${this.errors.join('; ')}`);
    this.setQuality(this.quality);
    return this.state;
  }

  _addFoliage(kind, items, tex, cols) {
    const f = buildFoliage(kind, items, tex, cols);
    f.setQuality(this.quality);
    this.root.add(f.group); this.foliage.push(f);
    this.loaded[kind === 'reed' ? 'reeds' : 'grass'] = true;
  }

  _addProps(propsGltf, natureGltf) {
    const lib = this.lib = new PropLibrary(propsGltf, natureGltf);
    const hAt = (x, z) => this.heightAt(x, z);
    this.propsPlaced = dressLegacy(lib, this.world, this.root, hAt, this.layout);
    if (this.source === 'world_0_4') {
      this.propsPlaced.push(...dressWorld04(lib, this.root, hAt, this.layout, this.field));
      const spots = treeSpots(LEGACY);
      this.trees = instancedTrees(lib, this.root, 'cay_sung', spots);
      for (const m of this.trees) m.userData.q = 'high';
      // Low (headless SwiftShader is vertex-bound: ~1 s per 0.5 M instanced triangles): a 6-sided tapered
      // trunk + two leafy blobs per tree instead of the 1.6 k-triangle trunk and ~22 leaf clumps.
      const trunkLow = lowTrunks(this.root, spots, lib.mats.bark);
      if (trunkLow) { trunkLow.userData.q = 'low'; this.trees.push(trunkLow); }
      // Low: each crown is two leafy blobs instead of ~22 leaf clumps (1 M -> ~0.1 M triangles in view).
      const crowns = spots.filter((t) => !t.bare).map((t) => { const sb = 2.5 * t.s; return { x: t.x, y: t.y + 6.6 * t.s - 1.6 * sb, z: t.z, s: sb, rot: t.rot, k: (t.x * 0.13 + t.z * 0.07) % 1 }; });
      for (const m of canopyBlobs(this.root, crowns, lib.mats.shrub_03)) { m.name = 'tree_crown_low'; m.userData.q = 'low'; this.trees.push(m); }
      const far = canopyBlobs(this.root, canopySpots(LEGACY), lib.mats.shrub_03);
      for (const m of far) m.userData.q = 'high'; // far-shore canopy: High only (Low keeps the bare shore in the fog)
      this.trees.push(...far);
    }
    const I = this.items;
    this.scatterMeshes = [
      // fern_02 is not drawn: its decimated fronds lie flat and read as striped mats (look-dev 0.4).
      ...lib.instanced(this.root, ['shrub_03_a', 'shrub_03_b', 'shrub_03_c', 'shrub_03_d'], I.shrubs),
      ...lib.instanced(this.root, ['weed_plant_02_a_LOD0', 'weed_plant_02_b_LOD0', 'weed_plant_02_c_LOD0', 'weed_plant_02_d_LOD0', 'weed_plant_02_e_LOD0'], I.weeds),
      ...lib.instanced(this.root, ['dry_branches_medium_01_a', 'dry_branches_medium_01_b', 'dry_branches_medium_01_c'], I.branches, { shadows: false }),
      ...lib.instanced(this.root, [1, 2, 3, 4, 5, 6].map((k) => `rock_moss_set_01_rock0${k}`), I.rocks, { sink: 0.3 }),
      ...lib.instanced(this.root, ['tree_stump_01'], I.stumps, { sink: 0.1 }),
    ];
    for (const m of this.scatterMeshes) m.userData.q = 'high';
    // Low: no scatter at all (the hand-placed rocks, stumps and props stay, from their LOD1 meshes where
    // they have one and only within ENV_QUALITY.low.propDist).
    this.scatterMeshes.push(...(this.trees ?? []));
  }

  heightAt(x, z) {
    for (const G of this.grids) if (G.contains(x, z)) return G.heightAt(x, z);
    return this.field.height(x, z);
  }

  setQuality(q) {
    this.quality = q === 'low' ? 'low' : 'high';
    const Q = ENV_QUALITY[this.quality];
    for (const t of this.terrain) for (const lod of t.lods) { lod.levels[1].distance = Q.terrainLod; lod.levels[2].distance = Q.terrainFar; }
    for (const f of this.foliage) f.setQuality(this.quality);
    this.mist.setCount(Q.mist);
    // Per-quality sets (userData.q 'high' | 'low' | 'both'): High = full scatter, CC0 LOD0 and full trees;
    // Low = rocks/stumps LOD1, simple trunks + blob crowns, no ground clutter, no far-shore canopy.
    for (const m of this.scatterMeshes) { const q = m.userData.q ?? 'both'; m.visible = q === 'both' || q === this.quality; }
    // Houses and other prop LODs: Low shows LOD1 from 0 m.
    this.root.traverse((o) => { if (o.isLOD && !o.userData.fxOwned && o.levels[1]) { o.userData.d1 ??= o.levels[1].distance; o.levels[1].distance = this.quality === 'low' ? 0.01 : o.userData.d1; } });
  }

  /** dt real seconds; focus {x, z} (player); mood: atmosphere's current blended values. */
  update(dt, focus, camera, mood) {
    const fog = this.scene.fog;
    for (const m of this.waterMats) {
      const u = m.uniforms;
      u.uTime.value += dt;
      if (mood) {
        u.uZenith.value.copy(mood.zenith); u.uHorizon.value.copy(mood.horizon); u.uFog.value.copy(mood.fog);
        u.uSunColor.value.copy(mood.sun); u.uSunI.value = mood.sunI; u.uWind.value = mood.wind; u.uGlow.value = mood.glow;
      }
      if (fog) { u.fogColor.value.copy(fog.color); u.fogDensity.value = fog.density; }
    }
    for (const f of this.foliage) {
      const u = f.uniforms;
      u.uTime.value += dt; if (mood) u.uWind.value = mood.wind;
      if (focus) u.uPlayer.value.set(focus.x, 0, focus.z);
      f.update(camera);
    }
    // Low: hand-placed props beyond propDist are skipped (checked every ~0.5 s of camera travel).
    if (camera && this.propsPlaced.length) {
      const cp = camera.position, Q = ENV_QUALITY[this.quality];
      if (!this._propCam || Math.hypot(cp.x - this._propCam.x, cp.z - this._propCam.z) > 4 || this._propQ !== this.quality) {
        this._propCam = { x: cp.x, z: cp.z }; this._propQ = this.quality;
        for (const o of this.propsPlaced) if (o && o.parent === this.root) o.visible = Math.hypot(o.position.x - cp.x, o.position.z - cp.z) < Q.propDist;
      }
    }
    // Tree cells beyond the fog are skipped (64 m cells, bounding spheres from instancedTrees).
    if (this.trees?.length && camera) {
      const Q = ENV_QUALITY[this.quality], cp = camera.position;
      for (const m of this.trees) {
        const bs = m.boundingSphere; if (!bs) continue;
        const d = Math.hypot(bs.center.x - cp.x, bs.center.z - cp.z) - bs.radius;
        const q = m.userData.q ?? 'both';
        m.visible = (q === 'both' || q === this.quality) && d < (m.name === 'tree_canopy_far' ? Q.canopyDist : Q.treeDist);
      }
    }
    if (mood) { this.mist.u.uAmount.value = mood.mist ?? 0.6; this.mist.u.uColor.value.copy(mood.horizon).lerp(mood.fog, 0.5); }
    if (fog) this.mist.u.fogColor.value.copy(fog.color);
    this.mist.update(dt, camera, (x, z) => this.heightAt(x, z));
  }

  stats() {
    const tris = (o) => { let n = 0; o.traverse((c) => { if (c.isMesh && c.visible) { const g = c.geometry; const t = (g.index ? g.index.count : g.attributes.position.count) / 3; n += c.isInstancedMesh ? t * c.count : t; } }); return Math.round(n); };
    return {
      source: this.source, state: this.state, quality: this.quality, loaded: { ...this.loaded }, errors: this.errors.slice(),
      timing: this.timing, reeds: this.items.reeds.length, grass: this.items.grass.length,
      reedsDrawn: this.foliage.find((f) => f.group.name === 'foliage_reed')?.drawn() ?? 0,
      props: this.propsPlaced.length, scatter: this.scatterMeshes.reduce((a, m) => a + m.count, 0),
      terrainChunks: this.terrain.reduce((a, t) => a + t.lods.length, 0), water: this.water.length, hdri: this.loaded.hdri,
      envTris: tris(this.root),
    };
  }
}

/** Mean luminance of the upper hemisphere of an equirect half-float HDR (for the sky cloud contrast). */
export function meanSkyLum(tex) {
  const d = tex.image?.data; if (!d) return 1;
  const w = tex.image.width, h = tex.image.height, from = THREE.DataUtils.fromHalfFloat;
  let s = 0, n = 0;
  const rows = Math.floor(h * 0.45);
  for (let y = 0; y < rows; y += 4) for (let x = 0; x < w; x += 8) {
    const k = (y * w + x) * 4;
    s += 0.299 * from(d[k]) + 0.587 * from(d[k + 1]) + 0.114 * from(d[k + 2]); n++;
  }
  return s / Math.max(1, n);
}
