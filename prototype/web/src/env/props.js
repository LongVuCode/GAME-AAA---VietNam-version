// env/props.js - Blender props (env_props.glb, self-made) and CC0 nature models (env_nature.glb) placed
// over the map: replaces graybox primitives (world.js layers.gray / props groups) while keeping every
// Object3D the game toggles or animates (gate, drum, ferries, chest lids, nest, stakes, kiln pieces).
// Scatter props use one InstancedMesh per model; houses use THREE.LOD (Blender LOD1).
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
  /** Placed Mesh with the normalized geometry (centred, base on y = 0): safe for CC0 parts whose vertices are offset. */
  mesh(name, parent, x, y, z, rotY = 0, scale = 1, sink = 0) {
    const key = `${name}|${sink}`;
    this._norm ??= {};
    const gm = this._norm[key] ?? (this._norm[key] = this.geometry(name, sink));
    if (!gm) return null;
    const m = new THREE.Mesh(gm.geo, gm.mat);
    m.position.set(x, y, z); m.rotation.y = rotY;
    if (typeof scale === 'number') m.scale.setScalar(scale); else m.scale.set(scale[0], scale[1], scale[2]);
    m.castShadow = !FOLIAGE_MATS.has(gm.mat.name); m.receiveShadow = true; m.userData.fxShadowTagged = true;
    parent.add(m); return m;
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
      lib.mesh(`rock_moss_set_01_rock0${1 + (k % 6)}`, g, Math.cos(a) * 0.72, -0.04, Math.sin(a) * 0.72, a * 3, 0.13, 0.2);
    }
    for (let k = 0; k < 3; k++) lib.mesh('dead_tree_trunk', g, 0, 0.0, 0, k * 2.1, [0.26, 0.5, 0.5]);
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
      placed.push(lib.mesh('tree_stump_01', root, lv.ax - 1.2, -0.05, lv.az - 0.6, 0.4, 0.9, 0.1));
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
  for (const [x, z, v, s] of anchors) placed.push(lib.mesh(`rock_moss_set_01_rock0${1 + v}`, root, x, groundY(x, z), z, x + z, s, 0.25));
  for (const [x, z, s] of [[-22, -95, 0.8], [21, -60, 0.9], [-12, -48, 0.7], [HUB + 13, -14, 0.8]]) placed.push(lib.mesh('tree_stump_01', root, x, groundY(x, z), z, x, s, 0.1));
  // 0.4 landmark trees come with world04.treeSpots (instancedTrees), the chimney with dressWorld04.
  return placed;
}

/** Hide the graybox ground/water/reed layers once the terrain and water replace them. */
export function hideGrayLayers(world) {
  const L = world.layers;
  for (const m of [...(L.ground ?? []), ...(L.shallow ?? []), L.water, L.reeds]) if (m) m.visible = false;
  for (const m of L.mud ?? []) if (m !== world.props.addedMud) m.visible = false;
}

// ------------------------------------------------------------------ Demo 0.4 world dressing
/** Instanced trees from a multi-part node (trunk + leaf clumps, e.g. the self-made fig 'cay_sung'):
 *  one InstancedMesh per part geometry, grouped in 64 m cells so frustum culling and the distance cut
 *  work per cell. items [{x, y, z, rot, s, far}] (far: only every 3rd leaf clump, slightly larger). */
export function instancedTrees(lib, parent, name, items, { cell = 64, shadows = true } = {}) {
  const src = lib.nodes[name]; if (!src || !items.length) return [];
  src.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(src.matrixWorld).invert();
  const parts = [];
  let leafK = 0;
  src.traverse((o) => {
    if (!o.isMesh) return;
    const rel = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const leaf = FOLIAGE_MATS.has(o.material.name);
    parts.push({ geo: o.geometry, mat: o.material, rel, leaf, k: leaf ? leafK++ : -1 });
  });
  const leafParts = [...new Map(parts.filter((pt) => pt.leaf).map((pt) => [pt.geo.uuid, pt])).values()];
  const cells = new Map();
  for (const it of items) { const key = `${Math.floor(it.x / cell)},${Math.floor(it.z / cell)}`; (cells.get(key) ?? cells.set(key, []).get(key)).push(it); }
  const out = [];
  const T = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), M = new THREE.Matrix4();
  const leafDepth = new Map();
  for (const [, list] of cells) {
    // Per geometry (shared by several leaf nodes): collect instance matrices.
    const byGeo = new Map();
    for (const it of list) {
      e.set(it.tilt ?? 0, it.rot, 0); q.setFromEuler(e); p.set(it.x, it.y, it.z); s.setScalar(it.s);
      T.compose(p, q, s);
      for (const pt of parts) {
        if (pt.leaf && it.bare) continue;
        if (pt.leaf && (it.far ? pt.k % 3 !== 0 : pt.k % 2 !== 0)) continue; // tip clumps thinned, the crown filler below carries the mass
        let m = M.multiplyMatrices(T, pt.rel);
        if (pt.leaf) { // fuller crowns than the Blender source (fig canopy); far trees: fewer, larger clumps
          const k = it.far ? 2.5 : 1.75, sc = new THREE.Matrix4().makeScale(k, k * 0.85, k);
          m = M.multiplyMatrices(T, new THREE.Matrix4().multiplyMatrices(pt.rel, sc));
        }
        const key = pt.geo.uuid + pt.mat.uuid;
        (byGeo.get(key) ?? byGeo.set(key, { pt, ms: [] }).get(key)).ms.push(m.clone());
      }
      // Crown filler: extra leaf clumps in an ellipsoid around the upper trunk (the Blender tree has
      // clumps only at the branch tips, which reads as a dead tree from the ground).
      if (!it.bare && leafParts.length) {
        let sd = Math.floor(Math.abs(it.x * 73.1 + it.z * 37.7)) | 0;
        const rr = () => { sd = (sd * 16807 + 11) % 2147483647; return sd / 2147483647; };
        const n = it.far ? 5 : 10;
        for (let k = 0; k < n; k++) {
          const pt = leafParts[k % leafParts.length];
          const u = rr() * Math.PI * 2, v = rr() * 2 - 1, r = Math.cbrt(0.25 + 0.75 * rr());
          const lx = Math.cos(u) * Math.sqrt(1 - v * v) * r * 2.9, ly = 6.7 + v * r * 1.5, lz = Math.sin(u) * Math.sqrt(1 - v * v) * r * 2.9;
          const sc = (it.far ? 3.8 : 2.9) * (0.75 + 0.5 * rr());
          e.set(0, rr() * 6.283, 0); q.setFromEuler(e); p.set(lx, ly, lz); s.set(sc, sc * 0.8, sc);
          const local = new THREE.Matrix4().compose(p, q, s);
          const key = pt.geo.uuid + pt.mat.uuid;
          (byGeo.get(key) ?? byGeo.set(key, { pt, ms: [] }).get(key)).ms.push(new THREE.Matrix4().multiplyMatrices(T, local));
        }
      }
    }
    for (const { pt, ms } of byGeo.values()) {
      const im = new THREE.InstancedMesh(pt.geo, pt.mat, ms.length);
      ms.forEach((m, i) => im.setMatrixAt(i, m));
      im.computeBoundingSphere();
      im.castShadow = shadows; im.receiveShadow = true;
      if (pt.leaf) {
        let d = leafDepth.get(pt.mat.uuid);
        if (!d) { d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: pt.mat.map, alphaTest: 0.5, side: THREE.DoubleSide }); leafDepth.set(pt.mat.uuid, d); }
        im.customDepthMaterial = d;
      }
      im.userData.fxShadowTagged = true; im.name = `tree_${name}${pt.leaf ? '_leaf' : '_trunk'}`;
      parent.add(im); out.push(im);
    }
  }
  return out;
}

/** Hand-placed dressing of the 0.4 regions (world_0_4 points / landmarks): set pieces at the named spots. */
export function dressWorld04(lib, root, heightAt, L, field) {
  const M = lib.mats, placed = [];
  const pts = Object.fromEntries((L.points ?? []).map((p) => [p.id, p]));
  const H = (x, z) => Math.max(heightAt(x, z), L.waterY - 0.6);
  const put = (name, x, z, rot = 0, s = 1, dy = 0) => { const o = lib.place(name, root, x, H(x, z) + dy, z, rot, s); if (o) placed.push(o); return o; };
  const mesh = (name, x, z, rot, s, sink = 0, dy = 0) => { const o = lib.mesh(name, root, x, H(x, z) + dy, z, rot, s, sink); if (o) placed.push(o); return o; };
  /** First spot off the walkable ground (walkDist > minD) going outward along (dx, dz). */
  const offWalk = (x, z, dx, dz, minD = 2.5) => { const l = Math.hypot(dx, dz) || 1; for (let k = 0; k < 60; k++) { const px = x + dx / l * k, pz = z + dz / l * k; if (field.walkDist(px, pz) > minD) return [px, pz]; } return [x, z]; };
  const at = (id) => pts[id];

  // Bãi bồi bến cũ (old silt landing): abandoned stilt houses on the bank, upturned and rotting dugouts, net stakes.
  for (const [x, z, dx, dz, r, s] of [[70, 20, 1, 0.6, -2.2, 0.85], [44, 34, 0, 1, 0.2, 0.8], [26, 30, 0, 1, 2.9, 0.75]]) {
    const [hx, hz] = offWalk(x, z, dx, dz, 3);
    placed.push(lib.lod('nha_san', root, hx, H(hx, hz) + 0.05, hz, r, s));
  }
  if (at('chest_bai_boi')) { const o = put('thuyen_doc_moc', 63.6, 9.2, 0.6, 1, 0.42); if (o) o.rotation.z = Math.PI; }
  if (at('dp_thuyen_muc')) { const o = put('thuyen_doc_moc', 49.2, 23.4, 2.1, 1.1, -0.18); if (o) { o.rotation.x = 0.12; o.rotation.z = 0.35; } }
  if (at('es_luoi_rach')) for (const [dx, dz, r] of [[-1.2, 0.4, 0.3], [1.1, -0.2, 1.4], [0.1, 1.3, 2.2]]) put('coc_nhon', 58 + dx, -10 + dz, r, 1.1, -0.05);
  // Rạch nước tây: the broken bamboo bridge, the fallen trunk to balance on, pole-vault banks.
  if (at('dp_cau_tre_gay')) {
    put('cau_tre', -59.5, -8.5, 1.05, [1.6, 1, 1], 0.05);
    const b = put('cau_tre', -56.3, -11.4, 1.05, [1.6, 1, 1], -0.35); if (b) b.rotation.z = -0.28; // the snapped span
    put('coc_ben', -61.2, -6.3, 0.5, 1.2, -0.1); put('coc_ben', -54.6, -13.6, 1.3, 1.1, -0.2);
  }
  const trunkAlong = (ax, az, bx, bz, thick = 3.3) => {
    const gm = lib.geometry('dead_tree_trunk', 0.04); if (!gm) return;
    const len = Math.hypot(bx - ax, bz - az), m = new THREE.Mesh(gm.geo, gm.mat);
    m.scale.set(len / 3.05, thick, thick); m.position.set((ax + bx) / 2, Math.min(H(ax, az), H(bx, bz)) - 0.06, (az + bz) / 2);
    m.rotation.y = -Math.atan2(bz - az, bx - ax); m.castShadow = m.receiveShadow = true; m.userData.fxShadowTagged = true;
    root.add(m); placed.push(m);
  };
  if (at('balance_go_rach')) trunkAlong(-61, -40, -49, -40, 4.2);
  if (at('es_be_chuoi')) for (let k = 0; k < 5; k++) trunkAlong(-52.4 + k * 0.55, -31.6, -52.4 + k * 0.55, -28.2, 1.4);
  for (const id of ['pv_rach_1', 'pv_rach_2']) { const p = at(id); if (p) { put('coc_ben', p.x + 0.6, p.z + 0.4, p.x, 1.35, -0.1); put('coc_ben', p.x - 0.5, p.z - 0.6, p.z, 1.1, -0.1); } }
  // Đồi gò sim: weathered rocks breaking the knoll slopes, stumps on the saddle.
  const R = rngLocal(404);
  for (const [cx, cz, rad, n] of [[88, -64, 26, 16], [58, -36, 13, 6], [110, -96, 12, 6]]) {
    for (let k = 0; k < n; k++) {
      const a = R() * Math.PI * 2, r = rad * (0.35 + 0.6 * R()), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if ((L.paths ?? []).some((pp) => distToPolyline(x, z, pp.points) < pp.width * 0.5 + 1.5) || (L.keepOut ?? []).some((k2) => Math.hypot(k2.x - x, k2.z - z) < k2.r + 1)) continue;
      mesh(`rock_moss_set_01_rock0${1 + Math.floor(R() * 6)}`, x, z, R() * 6.28, 0.7 + R() * 0.9, 0.45);
    }
  }
  // Rừng sung: the fallen fig to vault, the hollow trunk.
  if (at('vault_sung_do')) trunkAlong(87.5, -131.8, 93.5, -128.4, 3.6);
  if (at('es_bong_sung')) mesh('tree_stump_01', 101.2, -171, 0.8, 2.1, 0.05);
  // Sân lò ngoài: ruined kiln on the raised floor, the leaning chimney (landmark) and the fallen one.
  put('lo_bo_hoang', -53, -138.5, 0.4, 1.35, -0.05);
  const clay = M.clay?.clone();
  if (clay) {
    clay.color.set(0x9a6a4c); // fired-earth brick, darker than the kiln dome plaster
    const chimney = (x, z, h, r, tiltX, tiltZ, rotY = 0, y = null) => {
      const g = new THREE.Group();
      for (let k = 0; k < 4; k++) { // offset courses of hand-laid brick, tapering; the top one broken off (open, jagged)
        const top = k === 3, hh = top ? h * 0.16 : h * 0.28;
        const geo = new THREE.CylinderGeometry(r * (0.8 - k * 0.08), r * (0.95 - k * 0.08), hh, 12, top ? 3 : 2, top);
        if (top) { const p2 = geo.attributes.position; for (let i = 0; i < p2.count; i++) if (p2.getY(i) > 0) p2.setY(i, p2.getY(i) - hh * (0.55 + 0.45 * Math.sin(i * 2.7) ** 2)); geo.computeVertexNormals(); }
        const seg = new THREE.Mesh(geo, clay);
        seg.position.set((k % 2) * 0.06, k * h * 0.28 + hh / 2, (k % 3) * 0.04); seg.rotation.y = k * 0.9; g.add(seg);
      }
      g.position.set(x, y ?? H(x, z) - 0.2, z); g.rotation.set(tiltX, rotY, tiltZ);
      g.traverse((c) => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; c.userData.fxShadowTagged = true; } });
      root.add(g); placed.push(g); return g;
    };
    const lm = (L.landmarks ?? []).find((l) => l.id === 'lm4_ong_khoi_lo');
    if (lm) chimney(lm.x - 3.5, lm.z - 3, lm.height, 1.3, 0.1, -0.07);
    if (at('es_ong_khoi_do')) chimney(-31.5, -150.5, 7, 1.0, 0, Math.PI / 2 - 0.06, 0.7, H(-30, -150) + 0.75);
  }
  // Đồng lầy bắc: rows of old stakes in the mud, the north gate posts.
  for (let k = 0; k < 14; k++) { const x = -40 + k * 4.6 + R() * 1.5, z = -200 - Math.sin(k * 0.7) * 6; if (field.walkDist(x, z) < 0 && (L.paths ?? []).every((pp) => distToPolyline(x, z, pp.points) > 2.2)) put(R() < 0.5 ? 'coc_gay' : 'coc_nhon', x, z, R() * 6, 1 + R() * 0.3, -0.05); }
  for (const x of [-4.6, 4.6]) put('coc_ben', x, -158, x, 1.4, -0.1);
  // Vệt dấu (tracks): ploughed furrows in the mud (dark grooves).
  const mud = new THREE.MeshStandardMaterial({ color: 0x2f261b, roughness: 0.55, metalness: 0 });
  for (const p of L.points ?? []) {
    if (p.kind !== 'track') continue;
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 2.8), mud);
      m.position.set(p.x - 0.7 + k * 0.62, H(p.x, p.z) + 0.01, p.z); m.rotation.y = 0.5 + k * 0.08; m.receiveShadow = true; m.userData.fxShadowTagged = true;
      root.add(m); placed.push(m);
    }
  }
  return placed.filter(Boolean);
}

function distToPolyline(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], ex = bx - ax, ez = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1)));
    best = Math.min(best, Math.hypot(x - ax - ex * t, z - az - ez * t));
  }
  return best;
}
function rngLocal(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Far-shore forest silhouettes: 3 lumpy blobs per spot (one InstancedMesh, ~300 tris each), seen through
 *  the fog at 50-150 m. Cheap stand-in for full trees where nobody walks. */
export function canopyBlobs(root, items, leafMat) {
  if (!items.length) return [];
  const geo = mergeVertices(new THREE.IcosahedronGeometry(1, 1).deleteAttribute('normal').deleteAttribute('uv'));
  const pos = geo.attributes.position, v = new THREE.Vector3(), uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { // deterministic lumps; spherical UVs so the leaf texture tiles over the shell
    v.fromBufferAttribute(pos, i);
    uv[i * 2] = (Math.atan2(v.z, v.x) / (Math.PI * 2) + 0.5) * 4; uv[i * 2 + 1] = (v.y * 0.5 + 0.5) * 2;
    const n = Math.sin(v.x * 5.1 + v.y * 3.7) * Math.cos(v.z * 4.3 - v.y * 2.9) * 0.2 + Math.sin(v.x * 11.3 + v.z * 9.1) * 0.08;
    v.multiplyScalar(1 + n); v.y = v.y * 0.78 - (v.y < -0.3 ? 0.15 : 0); pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  // Leafy shell (alpha-tested leaf texture: ragged silhouette) over a dark solid core (no sky through it).
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.42 });
  if (leafMat?.map) { shellMat.map = leafMat.map.clone(); shellMat.map.wrapS = shellMat.map.wrapT = THREE.RepeatWrapping; shellMat.map.needsUpdate = true; }
  const coreMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  const n = items.length * 2, shell = new THREE.InstancedMesh(geo, shellMat, n), core = new THREE.InstancedMesh(geo, coreMat, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc3 = new THREE.Vector3(), c = new THREE.Color();
  let k = 0;
  for (const it of items) {
    for (let j = 0; j < 2; j++) {
      const a = it.rot + j * 2.1, r = it.s * (j ? 0.8 : 0);
      e.set(0, a, 0); q.setFromEuler(e);
      const sc = it.s * (j ? 0.75 : 1.05);
      p.set(it.x + Math.cos(a) * r, it.y + it.s * (1.6 + 0.35 * j), it.z + Math.sin(a) * r); sc3.set(sc * 1.2, sc, sc * 1.2);
      shell.setMatrixAt(k, m.compose(p, q, sc3));
      sc3.multiplyScalar(0.86); core.setMatrixAt(k, m.compose(p, q, sc3));
      c.setRGB(0.62 + 0.25 * it.k, 0.66 + 0.2 * it.k, 0.5 + 0.1 * j); shell.setColorAt(k, c);
      c.setRGB(0.07 + 0.03 * it.k, 0.09 + 0.03 * it.k, 0.05); core.setColorAt(k, c); k++;
    }
  }
  const out = [];
  for (const [im, name] of [[core, 'tree_canopy_far'], [shell, 'tree_canopy_far']]) {
    im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = false; im.name = name; im.userData.fxShadowTagged = true;
    root.add(im); out.push(im);
  }
  return out;
}

/** Low-quality trunks: one tapered 6-sided cylinder per tree (instanced, bark material). */
export function lowTrunks(root, spots, bark) {
  if (!spots.length) return null;
  const geo = new THREE.CylinderGeometry(0.22, 0.42, 6.4, 6, 1, true); geo.translate(0, 3.2, 0);
  const mat = bark ?? new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 });
  const im = new THREE.InstancedMesh(geo, mat, spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  spots.forEach((t, i) => { e.set(0, t.rot, 0); q.setFromEuler(e); p.set(t.x, t.y, t.z); s.setScalar(t.s); im.setMatrixAt(i, m.compose(p, q, s)); });
  im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = true; im.name = 'tree_trunk_low'; im.userData.fxShadowTagged = true;
  root.add(im); return im;
}
