"""Build /Game/Maps/L_BenSay_Sample05, separate from the old technical graybox.
Run Tools > Execute Python Script in UE, NOT while PIE runs.
Outside UE: validate the scene data without modifying any map.
This increment adds a quest/route/shortcut; production character/enemy art is still pending.
"""
import json
import math
from pathlib import Path
import runpy

try:
    import unreal
except ImportError:
    unreal = None

REPO = Path(__file__).resolve().parents[3]
DATA_PATH = REPO / 'design/data/ue_sample_0_5.json'
MAP_PATH = '/Game/Maps/L_BenSay_Sample05'
FOLDER = 'Sample05'
MATERIAL_DIR = '/Game/Sample05/Materials'


def load_scene(path=DATA_PATH):
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    if data['schema_version'] != 1 or data['map_path'] != MAP_PATH:
        raise ValueError('Unsupported sample scene schema/map')
    if len({m['name'] for m in data['meshes']}) != len(data['meshes']):
        raise ValueError('Duplicate mesh labels')
    for mesh in data['meshes']:
        if mesh['shape'] not in ('cube', 'sphere', 'cone', 'cylinder'):
            raise ValueError('Unknown shape: ' + mesh['shape'])
        if mesh['material'] not in data['palette'] or any(x <= 0 for x in mesh['size']):
            raise ValueError('Invalid material/size: ' + mesh['name'])
        if any(not math.isfinite(x) for x in mesh['pos'] + mesh['size']):
            raise ValueError('Nonfinite geometry')
    for value in data['strings'].values():
        if not value.get('vi') or not value.get('en'):
            raise ValueError('Missing vi/en sample string')
    return data


def build(scene):
    # Load shared helpers without triggering construction of the old map.
    shared = runpy.run_path(str(Path(__file__).with_name('build_graybox_longbien.py')),
                            init_globals={'_FERRY_IMPORT_ONLY': True})
    builder = shared['GrayboxBuilder']()
    levels, actors = builder.levels, builder.actors
    if unreal.EditorAssetLibrary.does_asset_exist(MAP_PATH):
        if not levels.load_level(MAP_PATH):
            raise RuntimeError('Could not load sample map')
        for actor in actors.get_all_level_actors():
            if str(actor.get_folder_path()).startswith(FOLDER + '/'):
                actors.destroy_actor(actor)
    else:
        unreal.EditorAssetLibrary.make_directory('/Game/Maps')
        if not levels.new_level(MAP_PATH):
            raise RuntimeError('Could not create sample map')
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    unreal.EditorAssetLibrary.make_directory(MATERIAL_DIR)
    materials = {}
    for key, rgb in scene['palette'].items():
        path = MATERIAL_DIR + '/M_S05_' + key
        if unreal.EditorAssetLibrary.does_asset_exist(path):
            material = unreal.EditorAssetLibrary.load_asset(path)
        else:
            material = tools.create_asset('M_S05_' + key, MATERIAL_DIR, unreal.Material,
                                          unreal.MaterialFactoryNew())
            color = unreal.MaterialEditingLibrary.create_material_expression(
                material, unreal.MaterialExpressionConstant3Vector, -300, 0)
            color.set_editor_property('constant', unreal.LinearColor(*rgb, 1.0))
            if not unreal.MaterialEditingLibrary.connect_material_property(
                    color, '', unreal.MaterialProperty.MP_BASE_COLOR):
                raise RuntimeError('Could not connect sample material ' + key)
            unreal.MaterialEditingLibrary.recompile_material(material)
            unreal.EditorAssetLibrary.save_loaded_asset(material)
        materials[key] = material
    shape_paths = {'cube': shared['CUBE'], 'cone': shared['CONE'],
                   'cylinder': shared['CYLINDER'], 'sphere': '/Engine/BasicShapes/Sphere.Sphere'}
    meshes = {k: unreal.EditorAssetLibrary.load_asset(v) for k, v in shape_paths.items()}

    def finish(actor, name, category, tags):
        actor.set_actor_label(name)
        actor.set_folder_path(FOLDER + '/' + category)
        actor.set_editor_property('tags', [unreal.Name(t) for t in tags])
        return actor

    for item in scene['meshes']:
        rotation = unreal.Rotator(pitch=item.get('pitch', 0), yaw=item.get('yaw', 0), roll=item.get('roll', 0))
        actor = actors.spawn_actor_from_object(meshes[item['shape']],
                    unreal.Vector(*(v * 100 for v in item['pos'])), rotation)
        actor.set_actor_scale3d(unreal.Vector(*item['size']))
        actor.static_mesh_component.set_material(0, materials[item['material']])
        if not item.get('collide', True):
            actor.static_mesh_component.set_collision_profile_name('NoCollision')
        tags = item.get('tags', [])
        finish(actor, item['name'], 'Scenery', tags)
        if 'FerrySampleBridgeDeck' in tags or 'FerrySampleHelpedVisual' in tags:
            actor.set_actor_hidden_in_game(True)
            actor.set_actor_enable_collision(False)
    for item in scene['points']:
        actor = actors.spawn_actor_from_class(unreal.TargetPoint,
                    unreal.Vector(*(v * 100 for v in item['pos'])))
        finish(actor, item['name'], 'Markers', item['tags'])
    spawn = scene['spawn']
    actor = actors.spawn_actor_from_class(unreal.PlayerStart,
                unreal.Vector(*(v * 100 for v in spawn['pos'])), unreal.Rotator(yaw=spawn['yaw']))
    finish(actor, 'SamplePlayerStart', 'Markers', ['FerrySamplePlayerStart'])
    for item in scene['labels']:
        actor = actors.spawn_actor_from_class(unreal.TextRenderActor,
                    unreal.Vector(*(v * 100 for v in item['pos'])), unreal.Rotator(yaw=180))
        actor.text_render.set_text(unreal.Text(scene['strings'][item['key']]['vi']))
        actor.text_render.set_world_size(38)
        finish(actor, item['key'], 'Signs', [])
    for cls, name, position in [(unreal.DirectionalLight, 'SampleSun', (40, 0, 30)),
                               (unreal.SkyLight, 'SampleSkyLight', (0, 0, 15)),
                               (unreal.SkyAtmosphere, 'SampleSky', (0, 0, 0))]:
        actor = actors.spawn_actor_from_class(cls, unreal.Vector(*(v * 100 for v in position)))
        if cls == unreal.DirectionalLight:
            actor.set_actor_rotation(unreal.Rotator(pitch=-40, yaw=-25), False)
        finish(actor, name, 'Lighting', [])
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    world.get_world_settings().set_editor_property('default_game_mode',
                       unreal.load_class(None, '/Script/ProjectFerry.FerryGameMode'))
    if not levels.save_current_level():
        raise RuntimeError('Save sample level failed')
    unreal.log('[sample05] scene ready: %s; %d meshes, %d markers; runtime/art acceptance pending' %
               (MAP_PATH, len(scene['meshes']), len(scene['points'])))


if __name__ == '__main__' or unreal is not None:
    scene = load_scene()
    if unreal is None:
        print('Sample05 valid:', len(scene['meshes']), 'meshes;', len(scene['points']), 'markers;', MAP_PATH)
    else:
        build(scene)
