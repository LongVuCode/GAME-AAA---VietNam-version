"""build_graybox_longbien.py - builds the Demo 0.1 graybox level /Game/Maps/L_LongBien_Graybox.

STATUS: NOT YET RUN IN UNREAL ENGINE ("chua build/chay trong UE"). Written against the UE 5.x editor
Python API (LevelEditorSubsystem, EditorActorSubsystem, EditorAssetLibrary, MaterialEditingLibrary).
Lines marked "VERIFY:" use API details the author could not test; failures there are caught and
logged as warnings so the rest of the level is still built.

Layout source: design/DEMO_0_1_DESIGN.md §2 (zones Z0-Z4, sizes are design assumptions).
Only engine basic shapes (/Engine/BasicShapes/*) are used; no external assets.

How to run (see docs/BUILD_GUIDE_UE.md §6):
  * Editor menu Tools > Execute Python Script... > pick this file, or
  * Output Log, switch the input box to "Python" and type:  py build_graybox_longbien.py
    (Content/Python is on the editor's Python path), or
  * Output Log "Cmd" box:  py "<repo>/game/Content/Python/build_graybox_longbien.py"
Re-running is safe: actors inside the "Graybox/..." outliner folders are deleted and rebuilt.

Outside the editor (no "unreal" module) the script prints the layout plan and cross-checks enemy and
zone ids against design/data/*.json. That is how it was checked in the AI container:
  python3 game/Content/Python/build_graybox_longbien.py

Conventions read by the C++ game module (ProjectFerry):
  * Tag "FerrySpawn" + enemy id (e.g. "en_cua_cang_bun", "boss_lon_loi_dam") + zone id: AFerryGameMode
    spawns AFerryEnemy there at BeginPlay.
  * Tag "FerryCheckpoint" + checkpoint id: respawn point after death (bonfire, "bep lua").
  * Tags "FerryNpc", "FerrySecret", "FerryTrace", "FerryShortcut", "FerryMud", "FerryShallowWater",
    "FerryZone", "FerryInteract": markers only in this version (no C++ behaviour yet).
Units: the layout table is in metres (design doc); UE uses centimetres (x100). X = north, Y = east.
"""

import json
import math
import os
import random

try:
    import unreal  # Only available inside the Unreal Editor.
except ImportError:  # pragma: no cover - plain Python (AI container / CI) path
    unreal = None

MAP_PATH = "/Game/Maps/L_LongBien_Graybox"
MATERIAL_DIR = "/Game/Graybox/Materials"
ROOT_FOLDER = "Graybox"

CUBE = "/Engine/BasicShapes/Cube.Cube"            # 100 cm cube, pivot at centre
CYLINDER = "/Engine/BasicShapes/Cylinder.Cylinder"  # 100 cm diameter, 100 cm tall, pivot at centre
CONE = "/Engine/BasicShapes/Cone.Cone"
BASE_MATERIAL = MATERIAL_DIR + "/M_GB_Color"
# A project-owned master material exposes Color; engine BasicShapeMaterial may not.
COLOR_PARAM = "Color"

M = 100.0  # metres -> centimetres
GROUND_THICKNESS_M = 0.5
SEED = 20261103  # fixed seed: same reed layout every run

# Graybox colours (linear RGB). Purely readability aids, not art direction.
MATERIALS = {
    "MI_GB_Ground": (0.32, 0.36, 0.26),
    "MI_GB_Mud": (0.22, 0.14, 0.08),
    "MI_GB_ShallowWater": (0.18, 0.32, 0.40),
    "MI_GB_DeepWater": (0.05, 0.12, 0.20),
    "MI_GB_Reed": (0.55, 0.60, 0.25),
    "MI_GB_Wood": (0.45, 0.30, 0.16),
    "MI_GB_Kiln": (0.35, 0.18, 0.12),
    "MI_GB_Marker": (0.95, 0.55, 0.10),
    "MI_GB_Fire": (1.00, 0.30, 0.05),
}

# ---------------------------------------------------------------------------------------------
# Layout (metres). Zone ids match design/data/secrets.json "locations" and enemies.json "zones".
# ---------------------------------------------------------------------------------------------
# Rectangular floors: (label, zone_id or "", centre (x, y), size (x, y), material)
FLOORS = [
    # Z0 Ben Say: 30 (E-W) x 25 (N-S) m. Bonfire, ferry to the hub level.
    ("Floor_Z0_BenSay", "z_ben_say", (0.0, 0.0), (25.0, 30.0), "MI_GB_Ground"),
    ("Path_Z0_Z1", "", (18.75, 0.0), (12.5, 6.0), "MI_GB_Ground"),
    # Z1 Dam nong: 60 x 40 m.
    ("Floor_Z1_DamNong", "z_dam_nong", (45.0, 0.0), (40.0, 60.0), "MI_GB_Ground"),
    ("Path_Z1_Z2", "", (70.0, 0.0), (10.0, 8.0), "MI_GB_Ground"),
    # Z2 Bai lau: 50 x 50 m.
    ("Floor_Z2_BaiLau", "z_bai_lau", (100.0, 0.0), (50.0, 50.0), "MI_GB_Ground"),
    # Path Z2 -> Z4 with the bonfire before the boss and the branch to Z3.
    ("Path_Z2_Z4", "", (136.0, 0.0), (22.0, 8.0), "MI_GB_Ground"),
    ("Path_Z3_Branch", "", (135.0, -12.0), (4.0, 16.0), "MI_GB_Ground"),
    # Z3 Lo bo hoang (secret): 20 x 20 m, west of the Z2-Z4 path.
    ("Floor_Z3_LoBoHoang", "z_lo_bo_hoang", (135.0, -30.0), (20.0, 20.0), "MI_GB_Ground"),
    # Shortcut Z2 (east edge) -> Z0 (north-east corner), separated from Z1 by a strip of water.
    ("Shortcut_Z2_Link", "", (100.0, 29.25), (5.0, 8.5), "MI_GB_Ground"),
    ("Shortcut_Strip", "", (50.0, 36.0), (105.0, 5.0), "MI_GB_Ground"),
    ("Shortcut_Z0_Link", "", (0.0, 24.25), (5.0, 18.5), "MI_GB_Ground"),
]

# Z4 boss arena: round, r ~ 18 m (cylinder floor).
ARENA = {"label": "Floor_Z4_BaiLay", "zone": "z_dau_truong", "centre": (165.0, 0.0), "radius": 18.0}

# Deep water under everything (walkable in this graybox; swimming is out of scope for 0.1).
DEEP_WATER = {"label": "DeepWater", "centre": (85.0, 0.0), "size": (240.0, 130.0), "top_z": -0.6}

# Flat patches on top of floors: (label, tag, centre, size or radius, material)
SHALLOW_WATER = [
    ("Shallow_Z1_A", (35.0, -18.0), (12.0, 10.0)),
    ("Shallow_Z1_B", (52.0, 10.0), (10.0, 14.0)),
    ("Shallow_Z1_C", (60.0, -20.0), (8.0, 8.0)),
]
MUD_POOLS_ARENA = [  # 3 mud pools in the boss arena (design §2)
    ("MudPool_Z4_A", (160.0, 7.0), 3.0),
    ("MudPool_Z4_B", (170.0, -6.0), 3.0),
    ("MudPool_Z4_C", (157.0, -9.0), 2.5),
]
MUD_PATCHES = [("Mud_Z1_A", (44.0, -4.0), (6.0, 5.0))]

# Reed beds: scattered thin cylinders inside these rectangles, leaving a walkable lane.
REED_BEDS = [
    # (label prefix, centre, size, count, lane half-width along X axis (y = 0))
    ("Reed_Z2", (100.0, 0.0), (48.0, 48.0), 220, 2.5),
]
ARENA_REED_RING = {"count": 70, "inner_r": 18.5, "outer_r": 22.0}

# Spawn markers: (enemy id, zone id, (x, y), yaw degrees)
SPAWNS = [
    ("en_cua_cang_bun", "z_ben_say", (8.0, 6.0), 180.0),      # tutorial crab
    ("en_cua_cang_bun", "z_dam_nong", (35.0, -10.0), 180.0),
    ("en_cua_cang_bun", "z_dam_nong", (50.0, 14.0), 180.0),
    ("en_u_bun", "z_dam_nong", (57.0, -3.0), 180.0),          # elite
    ("en_bo_ngua_lau", "z_bai_lau", (95.0, -10.0), 180.0),
    ("en_bo_ngua_lau", "z_bai_lau", (110.0, 12.0), 180.0),
    ("en_u_bun", "z_lo_bo_hoang", (142.0, -25.0), 90.0),
    ("boss_lon_loi_dam", "z_dau_truong", (172.0, 0.0), 180.0),
]

# Checkpoints (bonfires): (id, (x, y)). cp_cong_lau = "checkpoint_before" of the boss in enemies.json.
CHECKPOINTS = [
    ("cp_ben_say", (2.0, -8.0)),
    ("cp_cong_lau", (139.0, 2.5)),
]

PLAYER_START = {"pos": (-8.0, 0.0), "yaw": 0.0}

# Markers without C++ behaviour yet: (tag, id, (x, y), mesh, size (x, y, z) metres)
MARKERS = [
    ("FerryNpc", "npc_ba_lai_do", (-10.0, 5.0), CYLINDER, (0.6, 0.6, 1.7)),        # hint giver
    ("FerryNpc", "nc_nguoi_bi_me", (106.0, -16.0), CYLINDER, (0.6, 0.6, 1.7)),     # non-combat encounter
    ("FerrySecret", "sn_trap_a", (40.0, 22.0), CYLINDER, (0.2, 0.2, 1.2)),         # broken trap stake (alt. 1)
    ("FerrySecret", "sn_trap_b", (149.0, 3.0), CYLINDER, (0.2, 0.2, 1.2)),         # broken stake at mire gate (alt. 2)
    ("FerrySecret", "sn_scrap", (116.0, 18.0), CUBE, (0.6, 0.3, 0.1)),            # recast trap blade
    ("FerrySecret", "sn_kiln", (136.5, -33.0), CUBE, (0.8, 0.8, 0.8)),           # 4 kiln-mouth pieces area
    ("FerrySecret", "sn_end", (134.0, -36.5), CUBE, (1.0, 1.0, 1.0)),             # kiln hollow
    ("FerryTrace", "trace_tusk_furrow", (128.0, -2.0), CUBE, (2.0, 0.3, 0.1)),
    ("FerryTrace", "trace_broken_stake", (132.0, 2.5), CYLINDER, (0.2, 0.2, 0.9)),
    ("FerryTrace", "trace_flattened_reeds", (143.0, -1.5), CUBE, (3.0, 1.2, 0.05)),
    ("FerryShortcut", "shortcut_bai_lau_ben_say", (100.0, 25.5), CUBE, (4.0, 0.6, 1.2)),
    ("FerryInteract", "ferry_to_hub", (-22.0, 0.0), CUBE, (6.0, 2.0, 0.6)),         # the ferry boat
]

# Dock planks reaching into the water south of Z0.
DOCK = ("Dock_BenSay", (-16.5, 0.0), (8.0, 3.0), 0.3)

# Kiln ruin walls in Z3: interior x 131..139, y -38.5..-30.5; the east side (towards the branch path)
# is open.
KILN_WALLS = [
    ("Kiln_Wall_W", (135.0, -38.5), (8.0, 0.8, 2.0)),
    ("Kiln_Wall_N", (139.0, -34.5), (0.8, 8.0, 2.0)),
    ("Kiln_Wall_S", (131.0, -34.5), (0.8, 8.0, 2.0)),
]


# ---------------------------------------------------------------------------------------------
# Pure helpers (no unreal dependency; used by both the editor path and the dry run)
# ---------------------------------------------------------------------------------------------
def generate_reeds(rng):
    """Returns a list of (label, (x, y), height_m) for every reed stalk."""
    reeds = []
    for prefix, (cx, cy), (sx, sy), count, lane in REED_BEDS:
        placed = 0
        attempts = 0
        while placed < count and attempts < count * 20:
            attempts += 1
            x = cx + rng.uniform(-sx / 2.0, sx / 2.0)
            y = cy + rng.uniform(-sy / 2.0, sy / 2.0)
            if lane > 0.0 and abs(y - cy) < lane:
                continue  # keep the main lane free
            if any(_dist((x, y), pos) < 3.0 for _, _, pos, _ in SPAWNS):
                continue  # keep spawn points clear
            if any(_dist((x, y), pos) < 2.5 for _, _, pos, _, _ in MARKERS):
                continue
            reeds.append(("%s_%03d" % (prefix, placed), (x, y), rng.uniform(1.8, 2.6)))
            placed += 1
    ring = ARENA_REED_RING
    acx, acy = ARENA["centre"]
    for i in range(ring["count"]):
        angle = rng.uniform(0.0, 2.0 * math.pi)
        # Leave the west entrance (from the bonfire path) open.
        if abs(math.atan2(math.sin(angle - math.pi), math.cos(angle - math.pi))) < math.radians(20.0):
            continue
        r = rng.uniform(ring["inner_r"], ring["outer_r"])
        reeds.append(("Reed_Z4Ring_%03d" % i, (acx + r * math.cos(angle), acy + r * math.sin(angle)),
                      rng.uniform(2.0, 2.8)))
    return reeds


def _dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _repo_design_dir():
    """design/data relative to this file: <repo>/game/Content/Python -> <repo>/design/data."""
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.normpath(os.path.join(here, "..", "..", "..", "design", "data"))


def cross_check_design_data(log):
    """Warns when spawn ids / zones drift from design/data. Returns the number of problems."""
    design_dir = _repo_design_dir()
    enemies_path = os.path.join(design_dir, "enemies.json")
    secrets_path = os.path.join(design_dir, "secrets.json")
    if not os.path.isfile(enemies_path):
        log("design data not found at %s; skipping cross-check" % design_dir)
        return 0
    problems = 0
    with open(enemies_path, encoding="utf-8") as f:
        enemies = {e["id"]: e for e in json.load(f).get("enemies", [])}
    for enemy_id, zone, _, _ in SPAWNS:
        enemy = enemies.get(enemy_id)
        if enemy is None:
            log("PROBLEM: spawn uses unknown enemy id '%s'" % enemy_id)
            problems += 1
        elif zone not in enemy.get("zones", []):
            log("PROBLEM: '%s' placed in zone '%s' but enemies.json lists %s" % (enemy_id, zone, enemy.get("zones")))
            problems += 1
    boss = enemies.get("boss_lon_loi_dam")
    if boss and boss.get("checkpoint_before") not in [cp for cp, _ in CHECKPOINTS]:
        log("PROBLEM: boss checkpoint_before '%s' has no bonfire marker" % boss.get("checkpoint_before"))
        problems += 1
    if os.path.isfile(secrets_path):
        with open(secrets_path, encoding="utf-8") as f:
            secrets = json.load(f)
        zone_ids = {loc["id"] for loc in secrets.get("locations", [])}
        used = {z for _, z, _, _, _ in FLOORS if z} | {ARENA["zone"]}
        for missing in sorted(zone_ids - used):
            log("PROBLEM: zone '%s' from secrets.json has no floor" % missing)
            problems += 1
        node_ids = {n["id"] for c in secrets.get("chains", []) for n in c.get("nodes", [])}
        for tag, marker_id, _, _, _ in MARKERS:
            if tag == "FerrySecret" and marker_id not in node_ids:
                log("PROBLEM: secret marker '%s' is not a node in secrets.json" % marker_id)
                problems += 1
    return problems


# ---------------------------------------------------------------------------------------------
# Editor path
# ---------------------------------------------------------------------------------------------
class GrayboxBuilder(object):
    def __init__(self):
        self.actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        self.levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        self.cube = unreal.EditorAssetLibrary.load_asset(CUBE)
        self.cylinder = unreal.EditorAssetLibrary.load_asset(CYLINDER)
        self.cone = unreal.EditorAssetLibrary.load_asset(CONE)
        self.meshes = {CUBE: self.cube, CYLINDER: self.cylinder, CONE: self.cone}
        self.materials = {}
        self.count = 0

    # -- level ---------------------------------------------------------------------------------
    def open_or_create_level(self):
        if unreal.EditorAssetLibrary.does_asset_exist(MAP_PATH):
            unreal.log("[graybox] loading existing %s and clearing the Graybox folders" % MAP_PATH)
            self.levels.load_level(MAP_PATH)
            doomed = [a for a in self.actors.get_all_level_actors()
                      if str(a.get_folder_path()).startswith(ROOT_FOLDER)]
            for actor in doomed:
                self.actors.destroy_actor(actor)
        else:
            unreal.EditorAssetLibrary.make_directory("/Game/Maps")
            # VERIFY: UE 5.1+ signature is new_level(asset_path, is_partitioned_world=False).
            if not self.levels.new_level(MAP_PATH):
                raise RuntimeError("could not create level %s" % MAP_PATH)

    def save(self):
        if not self.levels.save_current_level():
            unreal.log_warning("[graybox] save_current_level returned False; save manually (Ctrl+S)")

    def set_game_mode_override(self):
        try:
            world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
            game_mode = unreal.load_class(None, "/Script/ProjectFerry.FerryGameMode")
            if game_mode is not None:
                # VERIFY: AWorldSettings::DefaultGameMode is exposed to Python as "default_game_mode".
                world.get_world_settings().set_editor_property("default_game_mode", game_mode)
        except Exception as exc:  # noqa: BLE001 - editor API differences must not abort the build
            unreal.log_warning("[graybox] GameMode override skipped (%s); DefaultEngine.ini already sets it" % exc)

    # -- materials ------------------------------------------------------------------------------
    def build_materials(self):
        tools = unreal.AssetToolsHelpers.get_asset_tools()
        unreal.EditorAssetLibrary.make_directory(MATERIAL_DIR)
        if unreal.EditorAssetLibrary.does_asset_exist(BASE_MATERIAL):
            parent = unreal.EditorAssetLibrary.load_asset(BASE_MATERIAL)
        else:
            parent = tools.create_asset("M_GB_Color", MATERIAL_DIR, unreal.Material, unreal.MaterialFactoryNew())
            color = unreal.MaterialEditingLibrary.create_material_expression(
                parent, unreal.MaterialExpressionVectorParameter, -300, 0)
            color.set_editor_property("parameter_name", unreal.Name(COLOR_PARAM))
            color.set_editor_property("default_value", unreal.LinearColor(0.5, 0.5, 0.5, 1.0))
            if not unreal.MaterialEditingLibrary.connect_material_property(
                    color, "", unreal.MaterialProperty.MP_BASE_COLOR):
                raise RuntimeError("could not connect graybox Color to Base Color")
            unreal.MaterialEditingLibrary.recompile_material(parent)
            unreal.EditorAssetLibrary.save_loaded_asset(parent)
        try:
            parameters = unreal.MaterialEditingLibrary.get_vector_parameter_names(parent)
            unreal.log("[graybox] master vector parameters: %s" % [str(p) for p in parameters])
        except Exception as exc:  # diagnostic only; preserve compatibility across editor APIs
            unreal.log_warning("[graybox] could not inspect master parameters (%s)" % exc)
        for name, rgb in MATERIALS.items():
            path = "%s/%s" % (MATERIAL_DIR, name)
            try:
                if unreal.EditorAssetLibrary.does_asset_exist(path):
                    mi = unreal.EditorAssetLibrary.load_asset(path)
                else:
                    mi = tools.create_asset(name, MATERIAL_DIR, unreal.MaterialInstanceConstant,
                                            unreal.MaterialInstanceConstantFactoryNew())
                # Also migrate instances created by older script versions.
                unreal.MaterialEditingLibrary.set_material_instance_parent(mi, parent)
                # Refresh inherited parameter metadata after changing an existing instance's parent.
                unreal.MaterialEditingLibrary.update_material_instance(mi)
                ok = unreal.MaterialEditingLibrary.set_material_instance_vector_parameter_value(
                    mi, COLOR_PARAM, unreal.LinearColor(rgb[0], rgb[1], rgb[2], 1.0))
                unreal.MaterialEditingLibrary.update_material_instance(mi)
                actual = unreal.MaterialEditingLibrary.get_material_instance_vector_parameter_value(mi, COLOR_PARAM)
                matches = all(abs(float(getattr(actual, channel)) - expected) < 0.001
                              for channel, expected in zip(("r", "g", "b", "a"), (*rgb, 1.0)))
                if not matches:
                    unreal.log_warning("[graybox] %s Color mismatch: wanted=%s actual=%s setter_result=%s" %
                                       (name, rgb, actual, ok))
                else:
                    unreal.log("[graybox] %s Color verified" % name)
                unreal.EditorAssetLibrary.save_loaded_asset(mi)
                self.materials[name] = mi
            except Exception as exc:  # noqa: BLE001
                unreal.log_warning("[graybox] material %s skipped (%s); default grey is used" % (name, exc))

    # -- actor helpers --------------------------------------------------------------------------
    def _finish(self, actor, label, folder, tags):
        actor.set_actor_label(label)
        try:
            actor.set_folder_path("%s/%s" % (ROOT_FOLDER, folder))
        except Exception as exc:  # noqa: BLE001  VERIFY: Actor.set_folder_path in Python
            unreal.log_warning("[graybox] set_folder_path failed (%s); re-runs will not clear %s" % (exc, label))
        if tags:
            actor.set_editor_property("tags", [unreal.Name(t) for t in tags])
        self.count += 1
        return actor

    def mesh(self, mesh_path, label, folder, centre_m, size_m, material=None, tags=None,
             yaw=0.0, collide=True, rotation=None):
        """Spawns a StaticMeshActor whose bounds are size_m metres (basic shapes are 1 m)."""
        x, y, z = centre_m
        actor = self.actors.spawn_actor_from_object(self.meshes[mesh_path], unreal.Vector(x * M, y * M, z * M),
                                                    rotation or unreal.Rotator(0.0, 0.0, yaw))
        actor.set_actor_scale3d(unreal.Vector(size_m[0], size_m[1], size_m[2]))
        component = actor.static_mesh_component
        if material and material in self.materials:
            component.set_material(0, self.materials[material])
        if not collide:
            component.set_collision_profile_name("NoCollision")
        return self._finish(actor, label, folder, tags)

    def floor(self, label, zone, centre, size, material, top_z=0.0):
        cz = top_z - GROUND_THICKNESS_M / 2.0
        tags = ["FerryZone", zone] if zone else None
        return self.mesh(CUBE, label, "Zones", (centre[0], centre[1], cz), (size[0], size[1], GROUND_THICKNESS_M),
                         material, tags)

    def point(self, cls, label, folder, pos_m, yaw, tags):
        actor = self.actors.spawn_actor_from_class(cls, unreal.Vector(pos_m[0] * M, pos_m[1] * M, pos_m[2] * M),
                                                   unreal.Rotator(0.0, 0.0, yaw))
        return self._finish(actor, label, folder, tags)

    # -- content ----------------------------------------------------------------------------------
    def build_ground(self):
        dw = DEEP_WATER
        self.floor(dw["label"], "", dw["centre"], dw["size"], "MI_GB_DeepWater", top_z=dw["top_z"])
        for label, zone, centre, size, material in FLOORS:
            self.floor(label, zone, centre, size, material)
        cx, cy = ARENA["centre"]
        d = ARENA["radius"] * 2.0
        self.mesh(CYLINDER, ARENA["label"], "Zones", (cx, cy, -GROUND_THICKNESS_M / 2.0), (d, d, GROUND_THICKNESS_M),
                  "MI_GB_Ground", ["FerryZone", ARENA["zone"]])
        for label, (x, y), (sx, sy) in SHALLOW_WATER:
            self.mesh(CUBE, label, "Zones", (x, y, 0.02), (sx, sy, 0.04), "MI_GB_ShallowWater",
                      ["FerryShallowWater"], collide=False)
        for label, (x, y), (sx, sy) in MUD_PATCHES:
            self.mesh(CUBE, label, "Zones", (x, y, 0.02), (sx, sy, 0.04), "MI_GB_Mud", ["FerryMud"], collide=False)
        for label, (x, y), r in MUD_POOLS_ARENA:
            self.mesh(CYLINDER, label, "Zones", (x, y, 0.02), (2 * r, 2 * r, 0.04), "MI_GB_Mud", ["FerryMud"],
                      collide=False)
        label, (x, y), (sx, sy), thick = DOCK
        self.mesh(CUBE, label, "Zones", (x, y, -thick / 2.0), (sx, sy, thick), "MI_GB_Wood")
        for label, (x, y), size in KILN_WALLS:
            self.mesh(CUBE, label, "Zones", (x, y, size[2] / 2.0), size, "MI_GB_Kiln")

    def build_reeds(self):
        for label, (x, y), height in generate_reeds(random.Random(SEED)):
            # Reeds do not block movement (the player walks through them).
            self.mesh(CYLINDER, label, "Reeds", (x, y, height / 2.0), (0.08, 0.08, height), "MI_GB_Reed",
                      collide=False)

    def build_markers(self):
        self.point(unreal.PlayerStart, "PlayerStart_BenSay", "Markers",
                   (PLAYER_START["pos"][0], PLAYER_START["pos"][1], 1.0), PLAYER_START["yaw"], ["FerryPlayerStart"])
        counters = {}
        for enemy_id, zone, (x, y), yaw in SPAWNS:
            counters[enemy_id] = counters.get(enemy_id, 0) + 1
            self.point(unreal.TargetPoint, "SP_%s_%d" % (enemy_id, counters[enemy_id]), "Spawns", (x, y, 1.0), yaw,
                       ["FerrySpawn", enemy_id, zone])
        for cp_id, (x, y) in CHECKPOINTS:
            self.mesh(CONE, "Bonfire_%s" % cp_id, "Markers", (x, y, 0.35), (0.7, 0.7, 0.7), "MI_GB_Fire",
                      ["FerryCheckpointVisual", cp_id], collide=False)
            self.point(unreal.TargetPoint, "CP_%s" % cp_id, "Markers", (x + 1.5, y, 1.0), 0.0,
                       ["FerryCheckpoint", cp_id])
        for tag, marker_id, (x, y), mesh_path, size in MARKERS:
            material = "MI_GB_Wood" if marker_id == "ferry_to_hub" else "MI_GB_Marker"
            self.mesh(mesh_path, "MK_%s" % marker_id, "Markers", (x, y, size[2] / 2.0), size, material,
                      [tag, marker_id], collide=(tag in ("FerryShortcut", "FerryInteract")))

    def build_lighting(self):
        sun = self.point(unreal.DirectionalLight, "Sun", "Lighting", (0.0, 0.0, 30.0), 0.0, None)
        # unreal.Rotator positional order is (roll, pitch, yaw).
        sun.set_actor_rotation(unreal.Rotator(0.0, -38.0, 35.0), False)
        try:
            comp = sun.get_component_by_class(unreal.DirectionalLightComponent)
            comp.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
            comp.set_editor_property("intensity", 8.0)
            # VERIFY: bAtmosphereSunLight -> "atmosphere_sun_light" in Python.
            comp.set_editor_property("atmosphere_sun_light", True)
        except Exception as exc:  # noqa: BLE001
            unreal.log_warning("[graybox] sun settings skipped (%s)" % exc)
        sky = self.point(unreal.SkyLight, "SkyLight", "Lighting", (0.0, 0.0, 25.0), 0.0, None)
        try:
            comp = sky.get_component_by_class(unreal.SkyLightComponent)
            comp.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
            comp.set_editor_property("real_time_capture", True)  # VERIFY: bRealTimeCapture
        except Exception as exc:  # noqa: BLE001
            unreal.log_warning("[graybox] sky light settings skipped (%s)" % exc)
        self.point(unreal.SkyAtmosphere, "SkyAtmosphere", "Lighting", (0.0, 0.0, 0.0), 0.0, None)
        fog = self.point(unreal.ExponentialHeightFog, "MarshFog", "Lighting", (80.0, 0.0, 0.0), 0.0, None)
        try:
            fog.get_component_by_class(unreal.ExponentialHeightFogComponent).set_editor_property("fog_density", 0.03)
        except Exception as exc:  # noqa: BLE001
            unreal.log_warning("[graybox] fog settings skipped (%s)" % exc)

    def run(self):
        problems = cross_check_design_data(unreal.log_warning)
        self.open_or_create_level()
        self.build_materials()
        self.build_ground()
        self.build_reeds()
        self.build_markers()
        self.build_lighting()
        self.set_game_mode_override()
        self.save()
        unreal.log("[graybox] done: %d actors in %s (%d data warnings)" % (self.count, MAP_PATH, problems))


def dry_run():
    """Plain-Python check: prints the plan and validates ids against design/data."""
    reeds = generate_reeds(random.Random(SEED))
    print("Graybox plan for %s" % MAP_PATH)
    print("  floors: %d rectangles + round arena r=%.0f m" % (len(FLOORS), ARENA["radius"]))
    print("  reeds: %d stalks (seed %d)" % (len(reeds), SEED))
    print("  spawns: %d, checkpoints: %d, markers: %d" % (len(SPAWNS), len(CHECKPOINTS), len(MARKERS)))
    problems = cross_check_design_data(lambda m: print("  " + m))
    print("  design-data problems: %d" % problems)
    return problems


if unreal is not None and not globals().get("_FERRY_IMPORT_ONLY", False):
    # Inside the editor the file is executed by "Execute Python Script" / "py <file>"; build directly
    # (VERIFY: __name__ is not guaranteed to be "__main__" on every execution path).
    GrayboxBuilder().run()
elif __name__ == "__main__":
    raise SystemExit(1 if dry_run() else 0)
