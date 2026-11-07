// env/props.js - Blender props (env_props.glb, self-made) and CC0 nature models (env_nature.glb) placed
// over the map: replaces graybox primitives (world.js layers.gray / props groups) while keeping every
// Object3D the game toggles or animates (gate, drum, ferries, chest lids, nest, stakes, kiln pieces).
// Scatter props use one InstancedMesh per model; houses use THREE.LOD (Blender LOD1).
import * as THREE from 'three';

const FOLIAGE_MATS = new Set(['shrub_03', 'fern_02', 'weed_plant_02']);

export class PropLibrary {
  constructor(...gltfs) {
    this.nodes = {}; this.mats = {};
    for (const g of gltfs) {
      g.scene.updateMatrixWorld(true);
      g.scene.traverse((o) => {
        if (o.name && !this.nodes[o.name]) this.nodes[o.name] = o;
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true; o.userData.fxShadowTagged = true;
          const m = o.material;
          if (m && !this.mats[m.name]) this.mats[m.name] = m;
          if (m && (FOLIAGE_MATS.has(m.name) || m.name.startsWith('weed_plant_02'))) {
            m.alphaTest = 0.5; m.transparent = false; m.side = THREE.DoubleSide; m.depthWrite = true;
            o.castShadow = false;
          }
          if (m?.map) m.map.anisotropy = 4;
        }
      });
    }
  }
  has(name) { return !!this.nodes[name]; }
  /** Placed copy of a node (shares geometry + materials), with world transform reset. */
  place(name, parent, x, y, z, rotY = 0, scale = 1) {
    const src = this.nodes[name]; if (!src) return null;
    const o = src.clone(true);
    o.position.set(x, y, z); o.rotation.set(0, rotY, 0);
    if (typeof scale === 'number') o.scale.setScalar(scale); else o.scale.set(scale[0], scale[1], scale[2]);
    o.traverse((c) => { c.userData.fxShadowTagged = true; });
    parent.add(o); return o;
  }
  /** Geometry of a single-mesh node baked to its glTF transform, centred in x/z, base at y = 0. */
  geometry(name, sink = 0) {
    const src = this.nodes[name]; if (!src) return null;
    const mesh = src.isMesh ? src : src.children.find((c) => c.isMesh);
    if (!mesh) return null;
    const g = mesh.geometry.clone();
    g.applyMatrix4(mesh.matrixWorld);
    g.computeBoundingBox();
    const b = g.boundingBox;
    g.translate(-(b.min.x + b.max.x) / 2, -b.min.y - sink * (b.max.y - b.min.y), -(b.min.z + b.max.z) / 2);
    g.computeBoundingSphere();
    return { geo: g, mat: mesh.material };
  }
  /** One InstancedMesh per variant name; items [{x, y, z, rot, s, var}]. */
  instanced(parent, names, items, { sink = 0, shadows = true } = {}) {
    const out = [];
    names.forEach((name, vi) => {
      const list = items.filter((it) => it.var % names.length === vi);
      const gm = list.length && this.geometry(name, sink);
      if (!gm) return;
      const im = new THREE.InstancedMesh(gm.geo, gm.mat, list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
      list.forEach((it, i) => { e.set(0, it.rot, 0); q.setFromEuler(e); p.set(it.x, it.y, it.z); s.setScalar(it.s); im.setMatrixAt(i, m.compose(p, q, s)); });
      im.computeBoundingSphere();
      im.castShadow = shadows && !FOLIAGE_MATS.has(gm.mat.name); im.receiveShadow = true;
      im.userData.fxShadowTagged = true; im.name = `scatter_${name}`;
      parent.add(im); out.push(im);
    });
    return out;
  }
  lod(name, parent, x, y, z, rotY, scale, dist = 45) {
    const lod = new THREE.LOD();
    const a = this.place(name, lod, 0, 0, 0, 0, 1), b = this.place(`${name}_LOD1`, lod, 0, 0, 0, 0, 1);
    lod.addLevel(a, 0); if (b) lod.addLevel(b, dist);
    lod.position.set(x, y, z); lod.rotation.y = rotY; lod.scale.setScalar(scale);
    parent.add(lod); return lod;
  }
}

const hideChildren = (g, keep = []) => { for (const c of [...g.children]) if (!keep.includes(c)) c.visible = false; };

/** Dress the 0.3 map (and the legacy part of the 0.4 world). heightAt(x, z) = terrain height. */
export function dressLegacy(lib, world, root, heightAt, L) {
  const P = world.props, G = world.layers.gray ?? {}, M = lib.mats;
  const hide = (key) => { for (const m of G[key] ?? []) m.visible = false; };
  const groundY = (x, z) => Math.max(heightAt(x, z), L.waterY - 0.6);
  const placed = [];
  const put = (...a) => { const o = lib.place(...a); if (o) placed.push(o); return o; };

  // Stilt houses: on the banks just outside the walkable ground (characters have no collision with them).
  const HUB = 300;
  hide('hutBen'); hide('hubHouse');
  const houses = [[-21, 8.5, Math.PI / 2, 0.85], [22, 27.5, 0.35, 0.8], [-27, 21, 1.35, 0.75], [HUB + 22, 3, -Math.PI / 2, 0.9], [HUB - 23, -14, 0.25, 0.8], [HUB + 19, -19, -0.4, 0.75]];
  for (const [x, z, r, s] of houses) placed.push(lib.lod('nha_san', root, x, groundY(x, z) + 0.05, z, r, s));
  if (P.hubHouse2 && lib.has('nha_san')) { // appears after the handover (game toggles the mesh's visibility)
    P.hubHouse2.material = P.hubHouse2.material.clone(); P.hubHouse2.material.visible = false;
    const h = lib.place('nha_san', P.hubHouse2, -13, -1.3 + 0.05, 0, Math.PI / 2, 0.8);
    if (h) h.traverse((c) => { c.userData.fxShadowTagged = true; });
  }
  // Bamboo jetty over the dock rect (x -2..2, z 24..33), deck top at y 0.02.
  hide('dockPosts');
  for (const z of [33, 30, 27]) put('cau_tre', root, 0, 0, z, 0, [2.0, 1, 1]);
  put('coc_ben', root, -2.05, -0.1, 33.4, 0.4, 1); put('coc_ben', root, 2.05, -0.1, 33.4, 1.2, 0.9);
  put('coc_ben', root, -2.1, -0.15, 24.6, 2.1, 0.8);
  // Ferries: dugout canoes inside the game's ferry groups.
  if (P.ferry) { hideChildren(P.ferry); lib.place('thuyen_doc_moc', P.ferry, 0, L.waterY + 0.04, 0, Math.PI, 1.05); }
  if (P.hubFerry) { hideChildren(P.hubFerry); lib.place('thuyen_doc_moc', P.hubFerry, 0, L.waterY + 0.04, 0, Math.PI / 2, 1.05); }
  for (const [x, z, r] of [[-7.5, 26.6, 1.75], [9, 26.2, 1.45], [HUB - 6, 37, 1.6]]) put('thuyen_doc_moc', root, x, groundY(x, z) + 0.12, z, r, 1);
  // Stakes (trap / landmark stakes) and the mire gate posts.
  hide('stakes');
  for (const s of G.stakes ?? []) put(s.userData.envStake === 'broken' ? 'coc_gay' : 'coc_nhon', root, s.position.x, -0.02, s.position.z, s.position.x * 3.1, s.userData.envStake === 'broken' ? 1.1 : 1);
  hide('mireGate');
  for (const m of G.mireGate ?? []) put('coc_ben', root, m.position.x, -0.1, m.position.z, m.position.x, 1.4);
  for (const [x, z] of [[-5.2, -119.4], [5.0, -118.8], [-6.8, -120.2], [6.5, -119.6]]) put('coc_nhon', root, x, -0.05, z, x * 2, 1.15);
  // Gate barrier: same box (the game hides it when the shortcut opens), woven bamboo material.
  if (P.gate && M.woven_bamboo) P.gate.material = M.woven_bamboo;
  for (const x of [30.2, 37.8]) put('coc_ben', root, x, -0.1, -52.4, x, 1.2);
  // Kiln ruin + debris, hub casting furnace, plain jar, wooden skin drum.
  hide('kiln');
  put('lo_bo_hoang', root, -31, -0.05, -111, Math.PI * 0.5, 1);
  if (M.clay) { for (const m of G.ash ?? []) { m.material = M.clay.clone(); m.material.color.set(0x8d8478); } for (const k of P.kilnPieces ?? []) k.material = M.clay; if (P.hollow) P.hollow.material = M.clay; }
  hide('furnace'); put('lo_duc', root, HUB - 8, -0.02, -8, 0.6, 1);
  hide('jar'); put('thap_gom', root, HUB + 6, -0.02, -9, 0.3, 1);
  if (P.drum) { hideChildren(P.drum); lib.place('trong_go', P.drum, 0, 0, 0, 0, 1); }
  // Fires: ring of stones + charred logs around the flame (the flame mesh stays).
  hide('fireBase');
  for (const flame of Object.values(P.fires ?? {})) {
    const g = flame.parent; if (!g) continue;
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      lib.place(`rock_moss_set_01_rock0${1 + (k % 6)}`, g, Math.cos(a) * 0.72, -0.05, Math.sin(a) * 0.72, a * 3, 0.11);
    }
    for (let k = 0; k < 3; k++) lib.place('dead_tree_trunk', g, 0, 0.12, 0, k * 2.1, [0.28, 0.45, 0.45]);
  }
  // Fallen gáo trunk (contextual vault): CC0 dead trunk stretched to the vault segment.
  const lv = L.logs[0];
  if (lv && lib.has('dead_tree_trunk')) {
    hide('vaultLog');
    const len = Math.hypot(lv.bx - lv.ax, lv.bz - lv.az);
    const gm = lib.geometry('dead_tree_trunk', 0.04);
    if (gm) {
      const m = new THREE.Mesh(gm.geo, gm.mat);
      m.scale.set(len / 3.05, 3.3, 3.3); m.position.set((lv.ax + lv.bx) / 2, -0.06, (lv.az + lv.bz) / 2);
      m.rotation.y = -Math.atan2(lv.bz - lv.az, lv.bx - lv.ax); m.castShadow = m.receiveShadow = true; m.userData.fxShadowTagged = true;
      root.add(m); placed.push(m);
      put('tree_stump_01', root, lv.ax - 1.2, -0.05, lv.az - 0.6, 0.4, 0.9);
    }
  }
  hide('ditchRails');
  // Points (0.3): chests, the fallen-nest tree, fish trap, lookout posts.
  for (const [id, g] of Object.entries(P.points03 ?? {})) {
    if (id.startsWith('chest')) {
      const lid = g.userData.lid;
      hideChildren(g, [lid]);
      lib.place('ruong_may', g, 0, 0, 0, 0, 1);
      if (lid) { hideChildren(lid); lib.place('ruong_may_nap', lid, 0, 0, 0, Math.PI, 1); }
    } else if (id === 'es_to_chim') {
      hideChildren(g, [g.userData.nest]);
      lib.place('cay_sung', g, 0.85, -0.05, -0.45, 2.2, 1.1);
    } else if (id === 'es_do_ca' && M.woven_bamboo) {
      g.children[0].material = M.woven_bamboo;
    } else if (M.hewn_wood) {
      g.traverse((c) => { if (c.isMesh && c.geometry.type === 'CylinderGeometry' && c.material.color?.getHex() === 0x6b5636) c.material = M.hewn_wood; });
    }
  }
  if (M.hewn_wood) {
    for (const m of [P.trapStake, P.trapStakeTop, ...(G.lever ?? [])]) if (m) m.material = M.hewn_wood;
  }
  // A few fixed rocks / stumps as composition anchors (kiln yard, arena rim, hub bank, reed beds).
  const anchors = [[-36.5, -116, 0, 0.55], [-25.5, -105.5, 2, 0.4], [-38, -103, 3, 0.35], [19.5, -131, 4, 0.5], [-17, -146, 5, 0.6], [13, -152, 1, 0.45],
    [-19.5, -128, 2, 0.4], [HUB + 16, 33, 3, 0.45], [HUB - 16, 31, 0, 0.4], [27, -70, 5, 0.35], [-28, -60, 1, 0.4]];
  for (const [x, z, v, s] of anchors) put(`rock_moss_set_01_rock0${1 + v}`, root, x, groundY(x, z) - 0.25 * s, z, x + z, s);
  for (const [x, z, s] of [[-22, -95, 0.8], [21, -60, 0.9], [-12, -48, 0.7], [HUB + 13, -14, 0.8]]) put('tree_stump_01', root, x, groundY(x, z) - 0.05, z, x, s);
  // 0.4 visual landmarks (when the layout comes from world_0_4.json).
  for (const lm of L.landmarks ?? []) {
    if (lm.id.includes('sung') || lm.id.includes('gao') || lm.id.includes('sim')) put('cay_sung', root, lm.x, heightAt(lm.x, lm.z) - 0.1, lm.z, lm.x, Math.max(1, lm.height / 8));
    else if (lm.id.includes('ong_khoi')) put('lo_duc', root, lm.x, heightAt(lm.x, lm.z), lm.z, 0.3, Math.max(1, lm.height / 5));
  }
  return placed;
}

/** Hide the graybox ground/water/reed layers once the terrain and water replace them. */
export function hideGrayLayers(world) {
  const L = world.layers;
  for (const m of [...(L.ground ?? []), ...(L.shallow ?? []), L.water, L.reeds]) if (m) m.visible = false;
  for (const m of L.mud ?? []) if (m !== world.props.addedMud) m.visible = false;
}
