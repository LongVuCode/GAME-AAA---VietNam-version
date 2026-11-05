// world.js - graybox level built from basic shapes (DEMO_0_1_DESIGN §2). All place names are
// [SÁNG TẠO]; no lake, temple, shrine or real site is modelled. Sizes follow the design's assumed
// dimensions (Z0 30x25 m, Z1 60x40, Z2 50x50, Z3 20x20, boss mire r≈18 with 3 mud pools).
import * as THREE from 'three';

export const HUB_X = 300;

// Walkable areas (axis-aligned rects {x0,x1,z0,z1} or circles {cx,cz,r}). -z is "north".
export const AREAS = [
  { id: 'z_ben_say', rect: { x0: -15, x1: 15, z0: 0, z1: 25 }, color: 0x7c7356 },
  { id: 'z_ben_say', rect: { x0: -2, x1: 2, z0: 24, z1: 33 }, color: 0x6b5236, dock: true },
  { id: 'c01', rect: { x0: -3, x1: 3, z0: -7, z1: 1 }, color: 0x6f6a4e },
  { id: 'z_dam_nong', rect: { x0: -30, x1: 30, z0: -46, z1: -6 }, color: 0x56604a, shallow: true },
  { id: 'c12', rect: { x0: -3, x1: 3, z0: -53, z1: -45 }, color: 0x6f6a4e },
  { id: 'z_bai_lau', rect: { x0: -25, x1: 25, z0: -102, z1: -52 }, color: 0x7d7a4c },
  { id: 'shortcut', rect: { x0: 24, x1: 37, z0: -60, z1: -54 }, color: 0x6f6a4e },
  { id: 'shortcut', rect: { x0: 31, x1: 37, z0: -54, z1: 10 }, color: 0x6f6a4e },
  { id: 'shortcut', rect: { x0: 14, x1: 37, z0: 4, z1: 10 }, color: 0x6f6a4e },
  { id: 'c24', rect: { x0: -3, x1: 3, z0: -120, z1: -101 }, color: 0x66604a },
  { id: 'c3', rect: { x0: -21, x1: -2, z0: -114, z1: -108 }, color: 0x66604a },
  { id: 'z_lo_bo_hoang', rect: { x0: -41, x1: -20, z0: -121, z1: -101 }, color: 0x6e5f50 },
  { id: 'z_dau_truong', circle: { cx: 0, cz: -136, r: 18 }, color: 0x5a4c3a },
  // Hub (separate "level", many days downriver): placed far away in the same scene.
  { id: 'hub', rect: { x0: HUB_X - 15, x1: HUB_X + 15, z0: -15, z1: 15 }, color: 0x86795a },
  { id: 'hub_bank', rect: { x0: HUB_X - 15, x1: HUB_X + 15, z0: 15, z1: 35 }, color: 0x8a8462 },
];

/** Shallow water sheets inside the marsh [cx, cz, w, d] (visual hint of the speed multiplier; also drawn on the map). */
export const SHALLOW_SHEETS = [[-14, -18, 14, 10], [10, -36, 16, 9], [18, -14, 8, 7]];
export const MUD_POOLS_BASE = [{ cx: -7, cz: -131, r: 3.2 }, { cx: 8, cz: -140, r: 3.6 }, { cx: -2, cz: -147, r: 2.8 }];
export const MUD_POOLS = MUD_POOLS_BASE; // kept for callers; the live list is Walkable.mudPools

/** Graybox placement of each encounters_0_2 group (members are placed around the anchor). */
export const ENCOUNTER_LAYOUT = {
  enc_ben_cua_don: { x: -6, z: 6 },
  enc_dam_cua_doi: { x: -9, z: -22 },
  enc_dam_ub_cua: { x: 6, z: -37 },
  enc_lau_bo_ngua_phuc: { x: -8, z: -76 },
  enc_lau_hon_hop: { x: 1, z: -91 },
  enc_lo_ub_tinh_anh: { x: -35, z: -106 },
};
/** Spawn list from enemies.json encounters_0_2 (first member of the first group is the Bến Sậy crab). */
export function encounterSpawns(enemiesData) {
  const groups = enemiesData.encounters_0_2?.groups ?? [];
  const out = [];
  for (const g of groups) {
    const a = ENCOUNTER_LAYOUT[g.id]; if (!a) continue;
    let k = 0;
    for (const m of g.members) for (let i = 0; i < m.count; i++, k++) {
      const ang = k * 2.2, r = k === 0 ? 0 : 3.2;
      out.push({ def: m.enemy, x: a.x + Math.cos(ang) * r, z: a.z + Math.sin(ang) * r, group: g.id });
    }
  }
  SPAWNS.enemies = out;
  return out;
}

/** Contextual vault obstacles (combat_tuning.movement.contextual_vault): a fallen log and a ditch.
 *  Segment a->b with half width hw; height <= max_height_m / gap <= max_gap_m. */
export const VAULTS = [
  { id: 'log_dam', kind: 'log', ax: -23.1, az: -34.6, bx: -14.9, bz: -31.4, hw: 0.5 },
  { id: 'ditch_ben', kind: 'ditch', ax: 3.5, az: 2.2, bx: 13, bz: 2.2, hw: 0.7 },
];
function segDist(px, pz, v) {
  const dx = v.bx - v.ax, dz = v.bz - v.az, l2 = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((px - v.ax) * dx + (pz - v.az) * dz) / l2));
  return Math.hypot(px - (v.ax + dx * t), pz - (v.az + dz * t));
}

export const GATE = { x0: 30.5, x1: 37.5, z0: -53.2, z1: -51.6 };

export const SPAWNS = {
  player_start: { x: 0, z: 18 },
  hub_arrive: { x: HUB_X - 10, z: 0 },
  bank_start: { x: HUB_X, z: 18 },
  // Filled from enemies.json encounters_0_2 by encounterSpawns() (positions are graybox layout only).
  enemies: [],
  boss: { def: 'boss_lon_loi_dam', x: 0, z: -142 },
  practice: [
    { def: 'en_cua_cang_bun', x: HUB_X - 8, z: 29 },
    { def: 'en_cua_cang_bun', x: HUB_X + 8, z: 29 },
  ],
  dummies: [{ x: HUB_X - 4, z: 24 }, { x: HUB_X + 4, z: 24 }],
};

// Interactables. `kind` is resolved by the game layer.
export const POINTS = [
  { id: 'fire_ben_say', kind: 'rest', x: 6, z: 9, r: 2.2, checkpoint: 'cp_ben_say' },
  { id: 'fire_cong_lau', kind: 'rest', x: 2, z: -106, r: 2.2, checkpoint: 'cp_cong_lau' },
  { id: 'npc_ba_lai_do', kind: 'hint_npc', x: -4, z: 22, r: 2.2 },
  { id: 'ferry_ben_say', kind: 'ferry_to_hub', x: 0, z: 31.5, r: 2.2 },
  { id: 'trap_a', kind: 'secret', node: 'sn_trap_a', x: -18, z: -30, r: 2.2 },
  { id: 'trap_b', kind: 'secret', node: 'sn_trap_b', x: -2.3, z: -117.5, r: 1.8 },
  { id: 'stake_3', kind: 'secret', node: 'sn_scrap', x: 6, z: -76, r: 2 },
  { id: 'kiln_p0', kind: 'kiln_piece', piece: 0, x: -34, z: -111, r: 1.3 },
  { id: 'kiln_p1', kind: 'kiln_piece', piece: 1, x: -28, z: -111, r: 1.3 },
  { id: 'kiln_p2', kind: 'kiln_piece', piece: 2, x: -31, z: -108, r: 1.3 },
  { id: 'kiln_p3', kind: 'kiln_piece', piece: 3, x: -31, z: -114, r: 1.3, correct: true },
  { id: 'kiln_hollow', kind: 'secret', node: 'sn_end', x: -31, z: -112.6, r: 1.6 },
  { id: 'rattan_1', kind: 'gather', x: 12, z: -20, r: 1.8 },
  { id: 'rattan_2', kind: 'gather', x: -22, z: -12, r: 1.8 },
  { id: 'rattan_3', kind: 'gather', x: 21, z: -40, r: 1.8 },
  { id: 'rattan_4', kind: 'gather', x: -15, z: -64, r: 1.8 },
  { id: 'rattan_5', kind: 'gather', x: 18, z: -92, r: 1.8 },
  { id: 'rattan_6', kind: 'gather', x: -11, z: -96, r: 1.8 },
  { id: 'villager', kind: 'call_name', x: 10, z: -81, r: 2.4 },
  { id: 'gate_lever', kind: 'shortcut', x: 34, z: -56, r: 2.2 },
  { id: 'trace_1', kind: 'trace', trace: 0, x: 0, z: -103, r: 3 },
  { id: 'trace_2', kind: 'trace', trace: 1, x: -2.3, z: -117.5, r: 3.2 },
  { id: 'trace_3', kind: 'trace', trace: 2, x: 0.5, z: -113, r: 3 },
  // Demo 0.3 (map.json new_in_0_3; same coordinates, checked by tools/design_validate.py and mapfog.test):
  // lookouts are found by walking up to them, chests and environment secrets open with Interact.
  { id: 'dp_cau_ben_say', kind: 'lookout', x: 0, z: 27, r: 3.5 },
  { id: 'dp_cay_go_do', kind: 'lookout', x: -19, z: -38, r: 3.5 },
  { id: 'dp_hang_coc', kind: 'lookout', x: -3, z: -60, r: 3.5 },
  { id: 'dp_mieng_lo', kind: 'lookout', x: -36, z: -104, r: 3.5 },
  { id: 'dp_cong_bai_lay', kind: 'lookout', x: 0, z: -119, r: 3.5 },
  { id: 'chest_dam_nong', kind: 'chest', x: 22, z: -28, r: 2 },
  { id: 'chest_bai_lau', kind: 'chest', x: -20, z: -88, r: 2 },
  { id: 'es_to_chim', kind: 'env_secret', x: -27, z: -42, r: 2.2 },
  { id: 'es_do_ca', kind: 'env_secret', x: 12, z: 21, r: 2.2 },
  { id: 'es_go_kho', kind: 'env_secret', x: 20, z: -70, r: 2.4 },
  { id: 'furnace', kind: 'furnace', x: HUB_X - 8, z: -8, r: 2.6 },
  { id: 'thap', kind: 'thap', x: HUB_X + 6, z: -9, r: 2.2 },
  { id: 'drum', kind: 'drum', x: HUB_X, z: -11, r: 2.6 },
  { id: 'ferry_hub', kind: 'ferry_to_marsh', x: HUB_X - 13, z: 0, r: 2.4 },
];

export function zoneAt(x, z) {
  for (const a of AREAS) {
    if (a.rect && x >= a.rect.x0 && x <= a.rect.x1 && z >= a.rect.z0 && z <= a.rect.z1) return a.id;
    if (a.circle && Math.hypot(x - a.circle.cx, z - a.circle.cz) <= a.circle.r) return a.id;
  }
  return null;
}

export class Walkable {
  constructor() { this.gateOpen = false; this.mudPools = MUD_POOLS_BASE.map((m) => ({ ...m })); }
  resetMud() { this.mudPools = MUD_POOLS_BASE.map((m) => ({ ...m })); }
  addMudPool(cx, cz, r) { this.mudPools.push({ cx, cz, r, added: true }); }
  /** A vault obstacle in front within `gap` m: returns the landing point beyond it, or null. */
  vaultAhead(x, z, yaw, gap = 2.5) {
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    for (const v of VAULTS) {
      if (segDist(x, z, v) > v.hw + 0.9) continue;
      const side = (px, pz) => Math.sign((v.bx - v.ax) * (pz - v.az) - (v.bz - v.az) * (px - v.ax));
      const s0 = side(x, z);
      for (let d = v.hw + 0.4; d <= gap + v.hw + 0.6; d += 0.2) {
        const tx = x + fx * d, tz = z + fz * d;
        if (side(tx, tz) !== s0 && segDist(tx, tz, v) > v.hw + 0.35 && this.inside(tx, tz, 0.3)) return { x: tx, z: tz, id: v.id };
      }
    }
    return null;
  }
  nearVault(x, z, r = 1.4) { return VAULTS.find((v) => segDist(x, z, v) <= v.hw + r) ?? null; }
  inside(x, z, margin = 0.3) {
    if (!this.gateOpen && x >= GATE.x0 && x <= GATE.x1 && z >= GATE.z0 && z <= GATE.z1) return false;
    if (margin > 0) for (const v of VAULTS) if (segDist(x, z, v) < v.hw + margin * 0.5) return false;
    for (const a of AREAS) {
      if (a.rect) {
        if (x >= a.rect.x0 + margin && x <= a.rect.x1 - margin && z >= a.rect.z0 + margin && z <= a.rect.z1 - margin) return true;
      } else if (Math.hypot(x - a.circle.cx, z - a.circle.cz) <= a.circle.r - margin) return true;
    }
    // Overlap seams between areas: accept if inside with zero margin of two areas.
    let n = 0;
    for (const a of AREAS) {
      if (a.rect ? (x >= a.rect.x0 && x <= a.rect.x1 && z >= a.rect.z0 && z <= a.rect.z1)
        : Math.hypot(x - a.circle.cx, z - a.circle.cz) <= a.circle.r) n++;
    }
    return n >= 2;
  }
  /** Moves from (x,z) by (dx,dz) with axis sliding. Returns new {x,z}. */
  move(x, z, dx, dz, margin = 0.3) {
    if (this.inside(x + dx, z + dz, margin)) return { x: x + dx, z: z + dz };
    if (this.inside(x + dx, z, margin)) return { x: x + dx, z };
    if (this.inside(x, z + dz, margin)) return { x, z: z + dz };
    return { x, z };
  }
  speedMult(x, z) {
    for (const m of this.mudPools) if (Math.hypot(x - m.cx, z - m.cz) <= m.r) return 'mud';
    const a = AREAS.find((ar) => ar.shallow && ar.rect && x >= ar.rect.x0 && x <= ar.rect.x1 && z >= ar.rect.z0 && z <= ar.rect.z1);
    return a ? 'shallow' : null;
  }
}

const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

function addBox(parent, w, h, d, color, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(color));
  m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
}
function addCyl(parent, rt, rb, h, color, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), lam(color));
  m.position.set(x, y, z); parent.add(m); return m;
}

export function buildWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fb4b8);
  scene.fog = new THREE.Fog(0x9fb4b8, 45, 140);
  const hemi = new THREE.HemisphereLight(0xdfe8e6, 0x4a4030, 1.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
  sun.position.set(-30, 60, 20); scene.add(sun);
  // Surfaces the FX/atmosphere layer restyles (src/fx/atmosphere.js): water, shallow sheets, ground, mud.
  const layers = { water: null, shallow: [], ground: [], mud: [], reeds: null };

  // Murky water / marsh beyond the walkable areas.
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), lam(0x3c5552));
  water.rotation.x = -Math.PI / 2; water.position.y = -0.25; scene.add(water); layers.water = water;

  for (const a of AREAS) {
    let g;
    if (a.rect) {
      g = new THREE.PlaneGeometry(a.rect.x1 - a.rect.x0, a.rect.z1 - a.rect.z0);
      const m = new THREE.Mesh(g, lam(a.color));
      m.rotation.x = -Math.PI / 2;
      m.position.set((a.rect.x0 + a.rect.x1) / 2, a.dock ? 0.02 : 0, (a.rect.z0 + a.rect.z1) / 2);
      scene.add(m); layers.ground.push(m);
      if (a.shallow) {
        // Shallow water sheets inside the marsh (visual hint of the speed multiplier).
        for (const [x, z, w, d] of SHALLOW_SHEETS) {
          const w2 = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam(0x4f6d6a, { transparent: true, opacity: 0.8 }));
          w2.rotation.x = -Math.PI / 2; w2.position.set(x, 0.03, z); scene.add(w2); layers.shallow.push(w2);
        }
      }
    } else {
      g = new THREE.CircleGeometry(a.circle.r, 48);
      const m = new THREE.Mesh(g, lam(a.color));
      m.rotation.x = -Math.PI / 2; m.position.set(a.circle.cx, 0, a.circle.cz); scene.add(m); layers.ground.push(m);
    }
  }
  for (const p of MUD_POOLS_BASE) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(p.r, 28), lam(0x3b2e22));
    m.rotation.x = -Math.PI / 2; m.position.set(p.cx, 0.02, p.cz); scene.add(m); layers.mud.push(m);
  }

  // Reeds (instanced): dense in the reed beds, sparse elsewhere, ring around the mire.
  const reedGeo = new THREE.BoxGeometry(0.06, 1, 0.06, 1, 2, 1); // 2 height segments: wind bend in fx/atmosphere.js
  const reedMat = lam(0xa59a5a);
  const spots = [];
  const rnd = mulberry32(7);
  const free = (x, z) => POINTS.every((p) => Math.hypot(p.x - x, p.z - z) > 3.2)
    && Math.abs(x) > 3.5 && SPAWNS.enemies.every((e) => Math.hypot(e.x - x, e.z - z) > 3);
  for (let i = 0; i < 1500; i++) {
    const x = -24 + rnd() * 48, z = -101 + rnd() * 48;
    if (free(x, z) && !(Math.hypot(x - 10, z + 81) < 6)) spots.push([x, z, 1.6 + rnd() * 1.1]);
  }
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2, r = 18.5 + rnd() * 5;
    const x = Math.cos(a) * r, z = -136 + Math.sin(a) * r;
    if (z < -121 || Math.abs(x) > 5) spots.push([x, z, 1.8 + rnd() * 1.2]);
  }
  for (let i = 0; i < 260; i++) {
    const x = -30 + rnd() * 60, z = -46 + rnd() * 40;
    if ((Math.abs(x) > 24 || z < -42 || z > -9) && free(x, z)) spots.push([x, z, 1.2 + rnd() * 0.8]);
  }
  const reeds = new THREE.InstancedMesh(reedGeo, reedMat, spots.length);
  const mtx = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler();
  spots.forEach(([x, z, h], i) => {
    e.set((rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.25); q.setFromEuler(e);
    mtx.compose(new THREE.Vector3(x, h / 2, z), q, new THREE.Vector3(1, h, 1));
    reeds.setMatrixAt(i, mtx);
  });
  scene.add(reeds); layers.reeds = reeds;

  const props = {};
  // Bến Sậy: dock posts, ferry boat, hut.
  for (const z of [26, 29, 32]) { addCyl(scene, 0.12, 0.12, 1.4, 0x4c3a28, -2.2, 0.5, z); addCyl(scene, 0.12, 0.12, 1.4, 0x4c3a28, 2.2, 0.5, z); }
  props.ferry = new THREE.Group();
  addBox(props.ferry, 1.6, 0.4, 6, 0x5b4632, 0, 0.1, 0);
  addBox(props.ferry, 1.2, 0.5, 1.2, 0x8a7a55, 0, 0.5, 0.6);
  props.ferry.position.set(3.4, 0, 33); scene.add(props.ferry);
  addBox(scene, 4, 2.4, 3.4, 0x8d7a58, -10, 1.2, 4); // hut
  addBox(scene, 4.6, 0.3, 4, 0x6d5b3c, -10, 2.55, 4);
  // Fires.
  props.fires = {};
  for (const p of POINTS.filter((x) => x.kind === 'rest')) {
    const g = new THREE.Group();
    addCyl(g, 0.8, 0.9, 0.25, 0x5a5048, 0, 0.12, 0);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.0, 8), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
    flame.position.y = 0.7; g.add(flame);
    g.position.set(p.x, 0, p.z); scene.add(g); props.fires[p.id] = flame;
  }
  // Fallen gáo tree near trap A, stakes, blade, villager marker etc.
  const lv = VAULTS[0], llen = Math.hypot(lv.bx - lv.ax, lv.bz - lv.az);
  const log = addCyl(scene, 0.42, 0.5, llen, 0x5b4a36, (lv.ax + lv.bx) / 2, 0.45, (lv.az + lv.bz) / 2); log.rotation.z = Math.PI / 2; log.rotation.y = -Math.atan2(lv.bz - lv.az, lv.bx - lv.ax);
  // Ditch ("rạch nước") at Bến Sậy: a narrow water channel to vault over.
  const dv = VAULTS[1];
  const ditch = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(dv.bx - dv.ax, dv.bz - dv.az), dv.hw * 2), lam(0x2f4846));
  ditch.rotation.x = -Math.PI / 2; ditch.position.set((dv.ax + dv.bx) / 2, 0.035, (dv.az + dv.bz) / 2); scene.add(ditch); layers.shallow.push(ditch);
  for (const s2 of [-1, 1]) addBox(scene, Math.hypot(dv.bx - dv.ax, dv.bz - dv.az), 0.12, 0.12, 0x4c3e2c, (dv.ax + dv.bx) / 2, 0.06, dv.az + s2 * dv.hw);
  const stake = (x, z, broken) => { const s = addCyl(scene, 0.09, 0.11, broken ? 0.7 : 1.3, 0x7a6748, x, broken ? 0.35 : 0.65, z, 6); s.rotation.z = broken ? 0.4 : 0; return s; };
  stake(-18, -30, true); stake(-2.3, -117.5, true);
  stake(-6, -60, false); stake(0, -68, false); stake(6, -76, false);
  props.blade = addBox(scene, 0.5, 0.06, 0.18, 0x7d6a4a, 6, 1.05, -75.85, 0.5);
  // Tusk furrows (trace 1) and flattened reeds (trace 3).
  for (let i = 0; i < 3; i++) addBox(scene, 0.25, 0.05, 3, 0x3e3324, -0.8 + i * 0.6, 0.03, -103);
  addBox(scene, 2.4, 0.06, 5, 0x9a8f58, 0.5, 0.03, -114, 0.2);
  // Shortcut gate (rattan barrier) and lever.
  props.gate = addBox(scene, GATE.x1 - GATE.x0, 1.8, GATE.z1 - GATE.z0, 0x6a5a3a, (GATE.x0 + GATE.x1) / 2, 0.9, (GATE.z0 + GATE.z1) / 2);
  addCyl(scene, 0.1, 0.1, 1.2, 0x7a6748, 34, 0.6, -56);
  // Kiln (Z3): rough earthen dome, ash pile, 4 lip pieces, hollow cover.
  addCyl(scene, 2.2, 3, 2.6, 0x8a6a50, -31, 1.3, -111, 14);
  const ash = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam(0x9a948c));
  ash.position.set(-31, 0, -115.6); scene.add(ash);
  props.kilnPieces = POINTS.filter((p) => p.kind === 'kiln_piece').map((p, i) => {
    const m = addBox(scene, 0.8, 0.18, 0.5, 0x9a7458, p.x, 0.12, p.z, i * 0.7);
    return m;
  });
  props.hollow = addBox(scene, 0.9, 0.7, 0.2, 0x4a3426, -31, 0.6, -113.2);
  // Broken trap stake at the edge of the mire (seen as trace 2 before the fight): the boss rams it in
  // the phase-2 set piece "Húc cọc" (enemies.json transition_set_piece_0_2).
  props.trapStake = addCyl(scene, 0.13, 0.16, 1.5, 0x7a6748, -6, 0.75, -121.5, 6); props.trapStake.rotation.z = 0.25;
  props.trapStakeTop = addCyl(scene, 0.11, 0.13, 0.7, 0x7a6748, -6, 1.75, -121.5, 6); props.trapStakeTop.rotation.z = 0.25;
  props.addedMud = new THREE.Mesh(new THREE.CircleGeometry(1, 28), lam(0x3b2e22)); props.addedMud.rotation.x = -Math.PI / 2; props.addedMud.visible = false; scene.add(props.addedMud); layers.mud.push(props.addedMud);
  // Mire gate posts.
  addCyl(scene, 0.15, 0.15, 2.2, 0x5a4a36, -3.4, 1.1, -119); addCyl(scene, 0.15, 0.15, 2.2, 0x5a4a36, 3.4, 1.1, -119);

  // Hub: Lau Landing (fictional), furnace, plain wide-mouth jar, skin-headed wooden drum, river bank.
  addBox(scene, 6, 3, 5, 0x9a8564, HUB_X + 8, 1.5, 6); addBox(scene, 6.8, 0.4, 5.8, 0x6d5b3c, HUB_X + 8, 3.2, 6);
  props.hubHouse2 = addBox(scene, 5, 2.6, 4, 0x9a8564, HUB_X - 9, 1.3, 8); props.hubHouse2.visible = false;
  addCyl(scene, 1.4, 1.8, 2.4, 0x7a5a42, HUB_X - 8, 1.2, -8, 12); // furnace
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.55, 1.1, 16, 1, true), lam(0x9b7b5d, { side: THREE.DoubleSide }));
  jar.position.set(HUB_X + 6, 0.55, -9); scene.add(jar);
  props.drum = new THREE.Group();
  addCyl(props.drum, 0.9, 0.9, 1.2, 0x6b4a2e, 0, 0.9, 0, 16);
  addCyl(props.drum, 0.92, 0.92, 0.04, 0xd8c8a0, 0, 1.52, 0, 16);
  props.drum.position.set(HUB_X, 0, -11); scene.add(props.drum);
  props.hubFerry = new THREE.Group(); addBox(props.hubFerry, 6, 0.4, 1.6, 0x5b4632, 0, 0.1, 0);
  props.hubFerry.position.set(HUB_X - 18, 0, 0); scene.add(props.hubFerry);
  const dummies = [];
  for (const d of SPAWNS.dummies) {
    const g = new THREE.Group();
    addCyl(g, 0.08, 0.08, 1.8, 0x6b5a3a, 0, 0.9, 0);
    addCyl(g, 0.35, 0.3, 0.9, 0xc9b26a, 0, 1.3, 0, 8);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), lam(0xc9b26a)); head.position.y = 2.0; g.add(head);
    g.position.set(d.x, 0, d.z); scene.add(g); dummies.push(g);
  }
  props.dummies = dummies;
  // Rattan gather nodes.
  props.rattan = {};
  for (const p of POINTS.filter((x) => x.kind === 'gather')) {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) { const c = addCyl(g, 0.04, 0.05, 1.4, 0x7b8f3a, Math.cos(i) * 0.25, 0.7, Math.sin(i) * 0.25, 5); c.rotation.z = 0.3 * (i - 1.5); }
    g.position.set(p.x, 0, p.z); scene.add(g); props.rattan[p.id] = g;
  }
  // Demo 0.3 points (map.json): lookout posts with a cloth strip, rattan chests, environment secrets.
  props.points03 = {};
  for (const p of POINTS) {
    const g = new THREE.Group();
    if (p.kind === 'lookout') {
      addCyl(g, 0.07, 0.09, 2.6, 0x6b5636, 0, 1.3, 0, 6);
      const strip = addBox(g, 0.05, 0.5, 0.36, 0x2e3d5b, 0, 2.3, 0.2); strip.rotation.x = 0.15;
      addCyl(g, 0.45, 0.6, 0.25, 0x77705a, 0, 0.12, 0, 7);
    } else if (p.kind === 'chest') {
      addBox(g, 0.9, 0.5, 0.6, 0x8a6a3c, 0, 0.25, 0);
      const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.3); g.add(lid);
      addBox(lid, 0.94, 0.12, 0.64, 0x9a7a48, 0, 0.06, 0.3);
      for (const x of [-0.3, 0, 0.3]) addBox(g, 0.05, 0.52, 0.62, 0x6b5232, x, 0.26, 0);
      g.userData.lid = lid;
    } else if (p.kind === 'env_secret') {
      if (p.id === 'es_to_chim') {
        addCyl(g, 0.22, 0.32, 5.5, 0x5b4a36, 1.2, 2.75, -0.6, 8);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), lam(0x5d6b3e)); crown.position.set(1.2, 5.6, -0.6); g.add(crown);
        const nest = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.09, 6, 12), lam(0x8a7448)); nest.rotation.x = Math.PI / 2; nest.position.y = 0.1; g.add(nest);
        g.userData.nest = nest;
      } else if (p.id === 'es_do_ca') {
        const trap = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.3, 9, 1, true), lam(0xa08a58, { side: THREE.DoubleSide }));
        trap.rotation.z = Math.PI / 2; trap.position.y = 0.3; g.add(trap);
        const beads = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 5, 10), lam(0x9a5a3a)); beads.position.set(-0.62, 0.32, 0); beads.rotation.y = Math.PI / 2; g.add(beads);
        g.userData.beads = beads;
      } else {
        const mound = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam(0x8b7a55)); mound.scale.y = 0.45; g.add(mound);
        const reed = addCyl(g, 0.03, 0.03, 1.6, 0xc6ae78, 0, 1.4, 0, 5); reed.rotation.z = Math.PI;
        g.userData.bundle = addBox(g, 0.4, 0.22, 0.3, 0x6b6a52, 0.5, 0.75, 0.3);
      }
    } else continue;
    g.position.set(p.x, 0, p.z); scene.add(g); props.points03[p.id] = g;
  }
  // Illusory mist around the entranced villager.
  props.mist = new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 12), new THREE.MeshBasicMaterial({ color: 0xd8e4ec, transparent: true, opacity: 0.35, depthWrite: false }));
  props.mist.position.set(10, 1.2, -81); scene.add(props.mist);

  return { scene, props, sun, hemi, layers };
}

export function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
