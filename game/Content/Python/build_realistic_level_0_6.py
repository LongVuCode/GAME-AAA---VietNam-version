"""Import source art and build /Game/Maps/L_BenSay_Realistic06 in the Unreal Editor.
Run this file with Tools > Execute Python Script after building the new C++ target.
Does not alter Sample05/graybox. Outside UE: validate data and source checksums only.
"""
import hashlib
import json
import math
import re
from collections import defaultdict
from pathlib import Path

try:
    import unreal
except ImportError:
    unreal = None

REPO = Path(__file__).resolve().parents[3]
SCENE_FILE = REPO / 'design/data/ue_realistic_0_6.json'
ART = REPO / 'game/ArtSource'
BASE = '/Game/Realistic06'
MAP_PATH = '/Game/Maps/L_BenSay_Realistic06'
FOLDER = 'Realistic06'


def asset_name(name):
    return re.sub(r'[^A-Za-z0-9_]', '_', name)


def terrain_height(x, y):
    return (18 * math.exp(-((x-210)/210)**2 - ((y+210)/140)**2)
            + 8*math.sin(x/155)*math.sin(y/170) + 5*math.cos((x+y)/190)
            - 9*math.exp(-((y-20*math.sin(x/180))/25)**2) + 12)


def bridge_deck_height(y):
    t=(y+16.5)/72
    return (1-t)*terrain_height(240,-16.5)+t*terrain_height(240,55.5)+.08


def load_sources():
    scene=json.loads(SCENE_FILE.read_text(encoding='utf-8'))
    env=json.loads((ART/'Environment06/manifest.json').read_text())
    chars=json.loads((ART/'Characters/manifest.json').read_text())
    if scene['schema_version']!=1 or scene['map_path']!=MAP_PATH or env['schema_version']!=2:
        raise ValueError('Unsupported scene/art schema')
    if scene['settings']['save_slot']!='FerryRealistic06_v1':
        raise ValueError('Realistic06 must use an isolated save')
    if len({asset_name(n) for n in env['materials']}) != len(env['materials']):
        raise ValueError('Material asset names collide after sanitizing')
    for entry in scene['instances']:
        if entry['asset'] not in env['assets']:
            raise ValueError('Missing mesh '+entry['asset'])
        values=entry['xy']+entry['scale']+[entry['yaw'],entry['z_offset']]
        if not all(math.isfinite(v) for v in values) or min(entry['scale'])<=0:
            raise ValueError('Invalid instance transform')
    for key,value in scene['strings'].items():
        if not value.get('vi') or not value.get('en'):raise ValueError('Missing localization '+key)
    # Catch Git LFS pointer stubs, missing files or stale art before touching a level.
    for directory,manifest in [('Environment06',env),('Characters',chars)]:
        for name,expected in manifest['file_checksums'].items():
            path=ART/directory/name
            if path.stat().st_size!=expected['bytes'] or hashlib.sha256(path.read_bytes()).hexdigest()!=expected['sha256']:
                raise ValueError('Source checksum mismatch: '+str(path)+'; run git lfs pull')
    return scene,env,chars


def import_task(source,destination,name,options=None):
    task=unreal.AssetImportTask()
    task.set_editor_property('filename',str(source))
    task.set_editor_property('destination_path',destination)
    task.set_editor_property('destination_name',name)
    task.set_editor_property('automated',True)
    task.set_editor_property('replace_existing',True)
    task.set_editor_property('save',True)
    if options:
        options.set_editor_property('automated_import_should_detect_type',False)
        task.set_editor_property('factory',unreal.FbxFactory())
        task.set_editor_property('options',options)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    assets=[unreal.load_asset(path) for path in task.get_editor_property('imported_object_paths')]
    if not assets:raise RuntimeError('Import produced no assets: '+str(source))
    return assets


def create_material(name,info,textures):
    tools=unreal.AssetToolsHelpers.get_asset_tools(); folder=BASE+'/Materials'
    safe_name=asset_name('M_'+name)
    path=folder+'/'+safe_name
    material=unreal.load_asset(path)
    if material is None:
        material=tools.create_asset(safe_name,folder,unreal.Material,unreal.MaterialFactoryNew())
    if material is None:raise RuntimeError('Cannot create material '+safe_name)
    unreal.MaterialEditingLibrary.delete_all_material_expressions(material)
    material.set_editor_property('two_sided',info.get('masked',False))
    if info.get('masked'):material.set_editor_property('blend_mode',unreal.BlendMode.BLEND_MASKED)
    def texture(key,x,y):
        file=info.get(key)
        if not file:return None
        tex=textures[file]
        if key!='color':
            tex.set_editor_property('srgb',False)
            tex.set_editor_property('compression_settings',unreal.TextureCompressionSettings.TC_NORMALMAP if key=='normal' else unreal.TextureCompressionSettings.TC_MASKS)
            if key=='normal':tex.set_editor_property('flip_green_channel',not info.get('normal_dx',False))
            unreal.EditorAssetLibrary.save_loaded_asset(tex)
        node=unreal.MaterialEditingLibrary.create_material_expression(material,unreal.MaterialExpressionTextureSample,x,y)
        node.set_editor_property('texture',tex)
        node.set_editor_property('sampler_type',unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL if key=='normal' else unreal.MaterialSamplerType.SAMPLERTYPE_COLOR if key=='color' else unreal.MaterialSamplerType.SAMPLERTYPE_MASKS)
        return node
    def link(node,output,prop):
        if not unreal.MaterialEditingLibrary.connect_material_property(node,output,prop):
            raise RuntimeError('Material connection failed '+name)
    color=texture('color',-500,0)
    if color:
        link(color,'RGB',unreal.MaterialProperty.MP_BASE_COLOR)
        if info.get('masked'):link(color,'A',unreal.MaterialProperty.MP_OPACITY_MASK)
    else:
        node=unreal.MaterialEditingLibrary.create_material_expression(material,unreal.MaterialExpressionConstant3Vector,-500,0)
        node.set_editor_property('constant',unreal.LinearColor(*info.get('base_color',[.3,.3,.3]),1))
        link(node,'',unreal.MaterialProperty.MP_BASE_COLOR)
    normal=texture('normal',-500,200)
    if normal:link(normal,'RGB',unreal.MaterialProperty.MP_NORMAL)
    rough=texture('roughness',-500,400);arm=texture('arm',-500,600)
    if rough:link(rough,'R',unreal.MaterialProperty.MP_ROUGHNESS)
    elif arm:
        link(arm,'G',unreal.MaterialProperty.MP_ROUGHNESS)
        link(arm,'R',unreal.MaterialProperty.MP_AMBIENT_OCCLUSION)
    else:
        node=unreal.MaterialEditingLibrary.create_material_expression(material,unreal.MaterialExpressionConstant,-500,400)
        node.set_editor_property('r',info.get('roughness_value',.8))
        link(node,'',unreal.MaterialProperty.MP_ROUGHNESS)
    unreal.MaterialEditingLibrary.recompile_material(material)
    unreal.EditorAssetLibrary.save_loaded_asset(material)
    return material


def import_environment(manifest):
    textures={}
    for filename in sorted({v for m in manifest['materials'].values() for k,v in m.items() if k in ('color','normal','roughness','arm') and v}):
        textures[filename]=import_task(ART/'Environment06/textures'/filename,BASE+'/Textures',Path(filename).stem)[0]
    materials={name:create_material(name,info,textures) for name,info in manifest['materials'].items()}
    meshes={}
    for name,info in manifest['assets'].items():
        options=unreal.FbxImportUI()
        options.set_editor_property('import_mesh',True)
        options.set_editor_property('import_as_skeletal',False)
        options.set_editor_property('mesh_type_to_import',unreal.FBXImportType.FBXIT_STATIC_MESH)
        options.set_editor_property('import_materials',False);options.set_editor_property('import_textures',False)
        data=options.static_mesh_import_data
        for key,value in [('combine_meshes',True),('auto_generate_collision',False),('generate_lightmap_u_vs',False),('convert_scene',False),('convert_scene_unit',False)]:
            data.set_editor_property(key,value)
        imported=import_task(ART/'Environment06'/info['file'],BASE+'/Meshes',name,options)
        mesh=next((a for a in imported if isinstance(a,unreal.StaticMesh)),None)
        if mesh is None:raise RuntimeError('No static mesh '+name)
        for i,slot in enumerate(info['materials']):mesh.set_material(i,materials[slot])
        unreal.EditorAssetLibrary.set_metadata_tag(mesh,'FerryClassification','PLACEHOLDER_AI' if name in ('Terrain06','River06') else 'LICENSED_SOURCE_DERIVATIVE')
        # Walkable detailed terrain/bridge; foliage uses non-blocking instances.
        if name in ('Terrain06','cau_tre','dead_tree_trunk'):
            mesh.get_editor_property('body_setup').set_editor_property('collision_trace_flag',unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
        if name == 'FigTree' or name.startswith(('rock_', 'shrub_', 'fern_', 'weed_')):
            reductions=[]
            for ratio,screen in [(1.0,1.0),(.45,.35),(.18,.12)]:
                reduction=unreal.EditorScriptingMeshReductionSettings()
                reduction.set_editor_property('percent_triangles',ratio)
                reduction.set_editor_property('screen_size',screen)
                reductions.append(reduction)
            settings=unreal.EditorScriptingMeshReductionOptions()
            settings.set_editor_property('auto_compute_lod_screen_size',False)
            settings.set_editor_property('reduction_settings',reductions)
            if unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem).set_lods(mesh,settings) < 1:
                raise RuntimeError('Could not build foliage/rock LODs: '+name)
        unreal.EditorAssetLibrary.save_loaded_asset(mesh)
        meshes[name]=mesh
    return meshes


def import_characters(manifest):
    result={}
    for item in manifest['assets']:
        name=item['asset'];folder=BASE+'/Characters/'+name
        options=unreal.FbxImportUI()
        options.set_editor_property('import_as_skeletal',True)
        options.set_editor_property('mesh_type_to_import',unreal.FBXImportType.FBXIT_SKELETAL_MESH)
        options.set_editor_property('import_mesh',True);options.set_editor_property('import_animations',False)
        options.set_editor_property('import_materials',True);options.set_editor_property('import_textures',False)
        options.skeletal_mesh_import_data.set_editor_property('convert_scene',True)
        options.skeletal_mesh_import_data.set_editor_property('convert_scene_unit',True)
        imported=import_task(ART/'Characters'/(name+'.fbx'),folder,name,options)
        meshes=[a for a in imported if isinstance(a,unreal.SkeletalMesh)]
        if len(meshes)!=1:raise RuntimeError('Expected one combined skeletal mesh for '+name)
        mesh=meshes[0]
        if mesh.get_name()!=name:raise RuntimeError('Unexpected skeletal mesh name '+mesh.get_name())
        unreal.EditorAssetLibrary.set_metadata_tag(mesh,'FerryClassification','PLACEHOLDER_AI')
        clips={}
        for clip in item['clips']:
            anim_options=unreal.FbxImportUI()
            anim_options.set_editor_property('import_mesh',False)
            anim_options.set_editor_property('import_as_skeletal',True)
            anim_options.set_editor_property('mesh_type_to_import',unreal.FBXImportType.FBXIT_ANIMATION)
            anim_options.set_editor_property('import_animations',True)
            anim_options.set_editor_property('import_materials',False)
            anim_options.set_editor_property('import_textures',False)
            anim_options.set_editor_property('skeleton',mesh.get_editor_property('skeleton'))
            imported=import_task(ART/'Characters'/clip['file'],folder,clip['name'],anim_options)
            animations=[a for a in imported if isinstance(a,unreal.AnimSequence)]
            if len(animations)!=1 or animations[0].get_name()!=clip['name']:
                raise RuntimeError('Expected single clip named '+clip['name']+'; got '+str([a.get_name() for a in animations]))
            clips[clip['motion']]=animations[0]
            unreal.EditorAssetLibrary.set_metadata_tag(animations[0],'FerryClassification','PLACEHOLDER_AI')
        result[name]=(mesh,clips)
    return result


def build(scene,environment,characters):
    if unreal.EditorLevelLibrary.get_pie_worlds(False):raise RuntimeError('Stop Play before rebuilding')
    levels=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    # Import/validate the entire pack before replacing generated actors in the target map.
    meshes=import_environment(environment);chars=import_characters(characters)
    if unreal.EditorAssetLibrary.does_asset_exist(MAP_PATH):
        if not levels.load_level(MAP_PATH):raise RuntimeError('Cannot load target map')
        existing=actors.get_all_level_actors()
        if not any(a.actor_has_tag('FerryRealisticRoot') for a in existing):
            raise RuntimeError('Existing map is not owned by this generator; preserved')
        for actor in existing:
            if str(actor.get_folder_path()).startswith(FOLDER+'/'):actors.destroy_actor(actor)
    else:
        unreal.EditorAssetLibrary.make_directory('/Game/Maps')
        if not levels.new_level(MAP_PATH):raise RuntimeError('Cannot create map')
    world=unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    def position(xy,zoffset=0):return unreal.Vector(xy[0]*100,xy[1]*100,(terrain_height(*xy)+zoffset)*100)
    def finish(actor,name,category,tags=()):
        actor.set_actor_label(name);actor.set_folder_path(FOLDER+'/'+category)
        actor.set_editor_property('tags',[unreal.Name(t) for t in tags]);return actor
    for key in ('Terrain06','River06'):
        actor=actors.spawn_actor_from_object(meshes[key],unreal.Vector())
        actor.static_mesh_component.set_collision_profile_name('BlockAll' if key=='Terrain06' else 'NoCollision')
        finish(actor,key,'Terrain')
    groups=defaultdict(list)
    for index,item in enumerate(scene['instances']):
        xy=item['xy'];loc=position(xy,item['z_offset']);scale=unreal.Vector(*item['scale']);rotation=unreal.Rotator(yaw=item['yaw'])
        if 'FerrySampleBridgeDeck' in item['tags']:
            # All segment deck tops follow a gentle bank-to-bank grade, not the river bed.
            loc.z=(bridge_deck_height(xy[1])-1.92)*100
        transform=unreal.Transform(location=loc,rotation=rotation.quaternion(),scale=scale)
        if not item['tags'] and item['asset'] not in ('nha_san','lo_bo_hoang','trong_go','thuyen_doc_moc'):
            groups[item['asset']].append(transform);continue
        actor=actors.spawn_actor_from_object(meshes[item['asset']],loc,rotation)
        actor.set_actor_scale3d(scale)
        actor.static_mesh_component.set_collision_profile_name('BlockAll' if item['tags'] else 'NoCollision')
        finish(actor,item['asset']+'_'+str(index),'Structures',item['tags'])
        if 'FerrySampleBridgeDeck' in item['tags']:
            actor.set_actor_hidden_in_game(True);actor.set_actor_enable_collision(False)
    for name,transforms in groups.items():
        folder=BASE+'/Foliage';path=folder+'/FT_'+name
        foliage=unreal.load_asset(path)
        if foliage is None:
            foliage=unreal.AssetToolsHelpers.get_asset_tools().create_asset('FT_'+name,folder,unreal.FoliageType_InstancedStaticMesh,unreal.FoliageType_InstancedStaticMeshFactory())
        foliage.set_editor_property('mesh',meshes[name])
        foliage.set_editor_property('cull_distance',unreal.Int32Interval(min=24000,max=42000) if name=='FigTree' else unreal.Int32Interval(min=9000,max=18000))
        unreal.EditorAssetLibrary.save_loaded_asset(foliage)
        unreal.InstancedFoliageActor.add_instances(world,foliage,transforms)
    for actor in actors.get_all_level_actors():
        if isinstance(actor,unreal.InstancedFoliageActor):finish(actor,'InstancedVegetation','Foliage')
    for marker in scene['points']:
        actor=actors.spawn_actor_from_class(unreal.TargetPoint,position(marker['xy'],.2))
        finish(actor,marker['name'],'Markers',marker['tags'])
    start=actors.spawn_actor_from_class(unreal.PlayerStart,position(scene['spawn']['xy'],1.2),unreal.Rotator(yaw=scene['spawn']['yaw']))
    finish(start,'RealisticPlayerStart','Markers',['FerrySamplePlayerStart'])
    for npc in scene['npcs']:
        actor=actors.spawn_actor_from_class(unreal.SkeletalMeshActor,position(npc['xy']),unreal.Rotator(yaw=npc['yaw']))
        component=actor.skeletal_mesh_component;mesh,clips=chars['Coi_Custom']
        component.set_skeletal_mesh(mesh)
        component.set_editor_property('animation_mode',unreal.AnimationMode.ANIMATION_SINGLE_NODE)
        component.set_editor_property('animation_data',unreal.SingleAnimationPlayData(anim_to_play=clips['idle'],saved_looping=True,saved_playing=True))
        component.set_collision_profile_name('NoCollision')
        finish(actor,npc['name'],'Characters',npc['tags'])
        if 'FerrySampleHelpedVisual' in npc['tags']:actor.set_actor_hidden_in_game(True)
    for cls,name in [(unreal.DirectionalLight,'Sun'),(unreal.SkyLight,'SkyFill'),(unreal.SkyAtmosphere,'Atmosphere'),(unreal.ExponentialHeightFog,'RiverHaze')]:
        actor=actors.spawn_actor_from_class(cls,unreal.Vector(0,0,5000))
        if cls in (unreal.DirectionalLight,unreal.SkyLight):
            component=actor.get_component_by_class(unreal.LightComponentBase)
            component.set_mobility(unreal.ComponentMobility.MOVABLE)
        if cls==unreal.DirectionalLight:
            actor.set_actor_rotation(unreal.Rotator(pitch=-27,yaw=-35),False)
            actor.get_component_by_class(unreal.DirectionalLightComponent).set_editor_property('intensity',5)
        if cls==unreal.SkyLight:
            actor.get_component_by_class(unreal.SkyLightComponent).set_editor_property('real_time_capture',True)
        if cls==unreal.ExponentialHeightFog:
            actor.get_component_by_class(unreal.ExponentialHeightFogComponent).set_editor_property('fog_density',.009)
        finish(actor,name,'Lighting')
    settings=world.get_world_settings()
    settings.set_editor_property('force_no_precomputed_lighting',True)
    settings.set_editor_property('default_game_mode',unreal.load_class(None,'/Script/ProjectFerry.FerryGameMode'))
    if not levels.save_current_level():raise RuntimeError('Cannot save new level')
    unreal.EditorAssetLibrary.save_directory(BASE,only_if_is_dirty=True,recursive=True)
    # Open this map on the next session too; old startup map was a source of misleading screenshots.
    maps=unreal.get_default_object(unreal.GameMapsSettings)
    map_object=MAP_PATH+'.'+MAP_PATH.rsplit('/',1)[1]
    maps.set_editor_property('editor_startup_map',unreal.SoftObjectPath(map_object))
    maps.set_editor_property('game_default_map',unreal.SoftObjectPath(map_object))
    # Persist through the config file; UObject.save_config is not exposed consistently to Python.
    config=REPO/'game/Config/DefaultEngine.ini'
    text=config.read_text(encoding='utf-8')
    for key in ('EditorStartupMap','GameDefaultMap'):
        text=re.sub(r'(?m)^'+key+r'=.*$',key+'='+map_object,text)
    config.write_text(text,encoding='utf-8')
    unreal.log('[realistic06] READY '+MAP_PATH+'; terrain 1200x1000 m; '+str(len(scene['instances']))+' placements; source art imported. Runtime, visual and performance acceptance pending.')


if __name__=='__main__' or unreal is not None:
    sources=load_sources()
    if unreal is None:print('Realistic06 source validation passed;',len(sources[0]['instances']),'placements;',MAP_PATH)
    else:build(*sources)
