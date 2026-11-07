// story/staging.js - pure presentation data for the 0.4 cut-scenes: where each actor and prop stands in
// each shot of design/data/cinematics.json (the data gives camera + lines + direction notes; the
// "direction" text is internal, so the blocking lives here as code constants: cinematics._note says
// "agent code chỉnh khung"). Coordinates are world.js metres (y up, -z north, HUB_X = 300).
// Also: display names of creatures (creatures_0_4.json) and the per-era line rule for story text.
import { forbiddenHits, eraTags } from '../logic/lineage.js';

const H = 300;      // HUB_X (world.js)
const N = Math.PI;  // yaw facing north (-z)

/**
 * STAGING[shotId] = { actors: { id: { at:[x,z] | from/to, y?, yaw? | face:[x,z], pose? } }, props: { id: {...} },
 *   cam?: { from:[x,y,z], look:[x,y,z], fov } | { pole: true, side: ±1, fov, back? } (close-up on the Mũi Sào tip,
 *   from the live pole), camShift?: [dx,dy,dz] added to the data camera, effects?: [ids] }
 * Actor ids: chr_coi / chr_buong (the player rig), npc_* (story NPCs), npc_heir (the young heir, ho_s05).
 * Poses: idle, pole (holding the Mũi Sào), offer (both hands, handover), torch, child, sit.
 */
export const STAGING = {
  // ---------------- cin_cold_open (90 s)
  co_s01: { actors: {}, effects: ['black'] },
  co_s02: {
    props: { boat: { from: [2.2, 56], to: [0.6, 44.5], yaw: N }, capsized: { at: [3, 40] } },
    actors: { chr_coi: { on: 'boat', local: [0, 0.32, 1.05], yaw: N, pose: 'pole' }, npc_ba_lai_do: { on: 'boat', local: [0, 0.32, -1.1], yaw: N, pose: 'torch' } },
  },
  co_s03: {
    props: { boat: { at: [0, 42.2], yaw: N }, capsized: { at: [3, 40] } },
    actors: { chr_coi: { on: 'boat', local: [0, 0.32, 0.9], face: [3, 40], pose: 'pole' }, npc_ba_lai_do: { on: 'boat', local: [0, 0.32, -1.1], yaw: N, pose: 'torch' } },
  },
  co_s04: {
    props: { boat: { at: [0, 41.2], yaw: N }, capsized: { at: [3, 40] } },
    actors: { chr_coi: { at: [0, 40.55], y: 0.32, yaw: 0.35, pose: 'pole' }, npc_ba_lai_do: { on: 'boat', local: [0, 0.32, 1.3], yaw: N, pose: 'torch' } },
    effects: ['strip_on_pole_mid'],
  },
  co_s05: {
    props: { boat: { at: [2.4, 31], yaw: N } },
    actors: { chr_coi: { from: [1.6, 30.6], to: [0.4, 27.2], face: [0, 24], pose: 'pole' }, npc_ba_lai_do: { at: [0.9, 29.6], yaw: N, pose: 'torch' },
      npc_nan: { from: [0.2, 20.5], to: [0.3, 24.6], yaw: 0, pose: 'idle', limp: true } },
  },
  co_s06: {
    props: { boat: { at: [2.4, 31], yaw: N } },
    actors: { chr_coi: { at: [0.3, 26.3], face: [0.4, 24.4], pose: 'idle' }, npc_nan: { at: [0.4, 24.4], face: [0.3, 26.3], pose: 'idle' },
      npc_ba_lai_do: { at: [-0.9, 25.4], face: [0.4, 24.4], pose: 'torch' } },
  },
  co_s07: {
    props: { boat: { at: [2.4, 31], yaw: N } },
    actors: { chr_coi: { at: [0.3, 26.3], yaw: N, pose: 'idle' }, npc_nan: { at: [0.4, 24.4], yaw: N, pose: 'idle' }, npc_ba_lai_do: { at: [-0.9, 25.4], yaw: N, pose: 'torch' } },
    effects: ['mist_far'],
  },
  co_s08: {
    props: { boat: { at: [2.4, 31], yaw: N } },
    actors: { npc_ba_lai_do: { at: [-1, 22.5], face: [-1.7, 23.7], pose: 'offer' }, chr_coi: { at: [-1.7, 23.7], face: [-1, 22.5], pose: 'idle' }, npc_nan: { at: [1.2, 24.2], face: [-1, 22.5], pose: 'idle' } },
  },
  co_s09: { actors: { chr_coi: { at: [-1.2, 21.4], yaw: N, pose: 'idle' } }, effects: ['blend_to_gameplay'] },

  // ---------------- cin_handoff (114 s)
  ho_s01: { actors: { chr_coi: { at: [H, -10.5], yaw: N, pose: 'offer' }, npc_nghe: { at: [H + 1.2, -10.7], face: [H, -10.5], pose: 'idle' } } },
  ho_s02: { actors: { chr_coi: { at: [H, -10.5], yaw: N, pose: 'offer' }, npc_nghe: { at: [H + 1.2, -10.7], face: [H, -10.5], pose: 'idle' } },
    cam: { pole: true, side: 1, fov: 28 }, effects: ['strip_on_pole'] },
  ho_s03: { actors: { chr_coi: { at: [H, -10.5], yaw: N, pose: 'offer' }, npc_nghe: { at: [H + 1.2, -10.7], face: [H, -10.5], pose: 'idle' } },
    cam: { pole: true, side: -1, fov: 28 }, effects: ['strip_on_pole', 'notch'] },
  ho_s04: { actors: { chr_coi: { at: [H, -2], yaw: 0, pose: 'pole', aged: 1 } }, props: { flood: {} }, effects: ['flood'] },
  ho_s05: { actors: { chr_coi: { at: [H - 0.6, -3], face: [H + 0.6, -3], pose: 'offer', aged: 2 }, npc_heir: { at: [H + 0.6, -3], face: [H - 0.6, -3], pose: 'idle' } }, props: { bloom: {} } },
  ho_s06: { actors: {}, props: { old_boat: { at: [H - 6, 22], yaw: 1.2 }, boat: { at: [H + 4, 37], yaw: 1.4 } }, effects: ['house2'] },
  ho_s07: { actors: { chr_buong: { from: [H, 6], to: [H, 12], yaw: 0, pose: 'idle' } }, props: { old_boat: { at: [H - 6, 22], yaw: 1.2 } }, effects: ['house2', 'drum_big', 'to_buong'] },
  ho_s08: { actors: { npc_nguoi_gia_ben: { at: [H - 0.4, -11.9], face: [H + 0.8, -10.9], pose: 'offer' }, chr_buong: { at: [H + 0.8, -10.9], face: [H - 0.4, -11.9], pose: 'idle' } }, effects: ['house2', 'drum_big'] },
  ho_s09: { actors: { npc_nguoi_gia_ben: { at: [H - 0.4, -11.9], face: [H + 0.8, -10.9], pose: 'idle' }, chr_buong: { at: [H + 0.8, -10.9], yaw: N, pose: 'offer' } },
    cam: { pole: true, side: 1, fov: 28 }, effects: ['house2', 'drum_big', 'strip_on_pole', 'notch'] },
  ho_s10: { actors: { npc_be_ke: { at: [H - 0.6, -10.1], face: [H + 0.9, -10.6], pose: 'child' }, npc_nguoi_gia_ben: { at: [H + 0.2, -11.9], face: [H - 0.6, -10.1], pose: 'idle' },
    chr_buong: { at: [H + 0.9, -10.6], face: [H - 0.6, -10.1], pose: 'pole' } }, effects: ['house2', 'drum_big', 'strip_on_pole', 'notch'] },
  ho_s11: { actors: { npc_be_ke: { at: [H - 0.6, -10.1], face: [H + 0.2, -11.9], pose: 'child' }, npc_nguoi_gia_ben: { at: [H + 0.2, -11.9], face: [H - 0.6, -10.1], pose: 'idle' },
    chr_buong: { at: [H + 0.9, -10.6], face: [H - 0.6, -10.1], pose: 'pole' } },
    cam: { from: [H - 1.6, 1.0, -8.6], look: [H - 0.6, 0.75, -10.1], fov: 34 }, effects: ['house2', 'drum_big', 'strip_on_pole', 'notch'] },
  ho_s12: { actors: { npc_nguoi_gia_ben: { at: [H + 0.1, -11.8], face: [H + 0.9, -10.6], pose: 'offer' }, chr_buong: { at: [H + 0.9, -10.6], face: [H + 0.1, -11.8], pose: 'offer' },
    npc_be_ke: { at: [H - 0.6, -10.1], face: [H + 0.9, -10.6], pose: 'child' } },
    cam: { pole: true, side: -1, fov: 30, back: 0.6 }, effects: ['house2', 'drum_big', 'strip_on_pole', 'notch', 'strip_new'] },
  ho_s13: { actors: { npc_nguoi_gia_ben: { at: [H - 0.5, -7], yaw: 0, pose: 'idle' }, chr_buong: { at: [H + 0.6, -7.2], yaw: 0, pose: 'pole' }, npc_be_ke: { at: [H + 1.5, -7.6], yaw: 0, pose: 'child' } },
    effects: ['house2', 'drum_big', 'strip_on_pole', 'notch', 'strip_new'] },

  // ---------------- cin_demo_hook (36 s)
  hk_s01: { actors: { npc_be_ke: { at: [H - 1.5, 33.6], yaw: 0, pose: 'child' } }, props: { far_bank: {} }, effects: ['house2', 'drum_big', 'crowd'] },
  hk_s02: { actors: {}, props: { far_bank: {} }, effects: ['house2', 'drum_big', 'crowd'] },
  hk_s03: { actors: { chr_buong: { at: [H + 0.6, 33.6], face: [H - 0.8, 32.8], pose: 'idle' }, npc_nguoi_gia_ben: { at: [H - 0.8, 32.8], face: [H + 0.6, 33.6], pose: 'offer' } }, props: { far_bank: {} },
    cam: { from: [H + 2.6, 1.6, 31.6], look: [H - 0.1, 1.3, 33.3], fov: 34 }, effects: ['house2', 'drum_big', 'crowd'] },
  hk_s04: { actors: { chr_buong: { at: [H + 0.6, 33.6], yaw: 0, pose: 'pole' }, npc_nguoi_gia_ben: { at: [H - 0.8, 32.8], yaw: 0, pose: 'idle' } }, props: { far_bank: {} },
    cam: { from: [H + 1.3, 1.65, 35.0], look: [H + 0.6, 1.45, 33.6], fov: 30 }, effects: ['house2', 'drum_big', 'crowd', 'strip_on_pole', 'notch', 'strip_new'] },
  hk_s05: { actors: {}, effects: ['black'] },
};

/** The village drum stands at (HUB_X, -11) (world.js, radius 0.9, x1.25 in Bương's era): the hub blocking
 *  above was laid out on the drum itself, so the drum-side shots are moved south by DRUM_CLEAR_Z (people
 *  stand in front of the drum, the drum stays in the background of the close-ups). */
export const DRUM = { x: H, z: -11, r: 0.9 * 1.25 };
export const DRUM_CLEAR_Z = 3.2;
const DRUM_SHOTS = ['ho_s01', 'ho_s02', 'ho_s03', 'ho_s08', 'ho_s09', 'ho_s10', 'ho_s11', 'ho_s12'];
for (const id of DRUM_SHOTS) {
  const st = STAGING[id];
  const xz = (v) => { if (v) v[1] += DRUM_CLEAR_Z; };
  for (const group of [st.actors ?? {}, st.props ?? {}]) for (const spec of Object.values(group)) { xz(spec.at); xz(spec.from); xz(spec.to); xz(spec.face); }
  if (st.cam?.from) { st.cam.from[2] += DRUM_CLEAR_Z; st.cam.look[2] += DRUM_CLEAR_Z; }
  st.camShift = [0, 0, DRUM_CLEAR_Z]; // the data camera (cinematics.json from / look_at) moves with the people
}

/** Display entry of a creature (creatures_0_4.json) for an enemy id in an era: the era's variant first. */
export function creatureFor(data, enemyId, era) {
  const list = data.creatures?.creatures ?? [];
  return list.find((c) => c.enemy_ref === enemyId && c.era === era) ?? list.find((c) => c.enemy_ref === enemyId && !c.variant_of && c.era !== 'era_hung_vuong_6') ?? null;
}

/** May this resolved line ({ text, allowedEras? }) be shown in `era`? (allowed_eras + the era's forbidden words) */
export function storyLineAllowed(line, era, lineage) {
  if (!line?.text) return false;
  if (line.allowedEras && !line.allowedEras.includes(era)) return false;
  return forbiddenHits(line.text, eraTags(lineage, era)).length === 0;
}
