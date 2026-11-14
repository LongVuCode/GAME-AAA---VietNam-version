"""Render the actual exported source geometry/layout, NOT an Unreal screenshot or concept image."""
import argparse,json,math
from pathlib import Path
import bpy
from mathutils import Matrix,Vector

ROOT=Path(__file__).resolve().parents[2]

def height(x,y):
    return 18*math.exp(-((x-210)/210)**2-((y+210)/140)**2)+8*math.sin(x/155)*math.sin(y/170)+5*math.cos((x+y)/190)-9*math.exp(-((y-20*math.sin(x/180))/25)**2)+12

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);a=ap.parse_args();out=Path(a.out).resolve();out.mkdir(parents=True,exist_ok=True)
    art=ROOT/'game/ArtSource/Environment06';meta=json.loads((art/'manifest.json').read_text());data=json.loads((ROOT/'design/data/ue_realistic_0_6.json').read_text())
    bpy.ops.wm.read_factory_settings(use_empty=True);mats={};templates={}
    for name,info in meta['materials'].items():
        m=bpy.data.materials.new('Preview_'+name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');mats[name]=m
        bs.inputs['Roughness'].default_value=info.get('roughness_value',.8)
        if info.get('color'):
            t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(art/'textures'/info['color']),check_existing=True)
            m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color'])
            if info.get('masked'):m.node_tree.links.new(t.outputs['Alpha'],bs.inputs['Alpha'])
        else:bs.inputs['Base Color'].default_value=(*info.get('base_color',[.3,.3,.3]),1)
        file=info.get('roughness') or info.get('arm')
        if file:
            t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(art/'textures'/file),check_existing=True);t.image.colorspace_settings.name='Non-Color'
            if info.get('arm'):
                split=m.node_tree.nodes.new('ShaderNodeSeparateColor');m.node_tree.links.new(t.outputs['Color'],split.inputs['Color']);m.node_tree.links.new(split.outputs['Green'],bs.inputs['Roughness'])
            else:m.node_tree.links.new(t.outputs['Color'],bs.inputs['Roughness'])
    for name,info in meta['assets'].items():
        before=set(bpy.context.scene.objects);bpy.ops.import_scene.fbx(filepath=str(art/info['file']))
        obj=next(o for o in bpy.context.scene.objects if o not in before and o.type=='MESH')
        obj.data.transform(Matrix.Scale(.01,4));indices=[p.material_index for p in obj.data.polygons];obj.data.materials.clear()
        for key in info['materials']:obj.data.materials.append(mats[key])
        for polygon,index in zip(obj.data.polygons,indices):polygon.material_index=index
        obj.hide_render=True;obj.hide_set(True);templates[name]=obj
    for name in ['Terrain06','River06']:
        ob=templates[name];ob.hide_render=False;ob.hide_set(False)
    for i,item in enumerate(data['instances']):
        ob=templates[item['asset']].copy();ob.data=templates[item['asset']].data;bpy.context.collection.objects.link(ob)
        x,y=item['xy'];z=height(x,y)+item['z_offset']
        if 'FerrySampleBridgeDeck' in item['tags']:
            t=(y+16.5)/72;z=(1-t)*height(240,-16.5)+t*height(240,55.5)+.08-1.92
        ob.location=(x,y,z);ob.scale=item['scale'];ob.rotation_euler.z=math.radians(item['yaw']);ob.hide_render=False;ob.hide_set(False)
    bpy.ops.object.light_add(type='SUN',location=(0,0,100));sun=bpy.context.object;sun.data.energy=3;sun.data.angle=math.radians(8);sun.rotation_euler=(.45,-.5,-.6)
    world=bpy.data.worlds.new('PreviewSky');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.38,.5,.65,1);world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.6
    bpy.ops.object.camera_add(location=(90,-145,48));cam=bpy.context.object;cam.data.lens=35;cam.data.clip_end=5000
    scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=20;scene.cycles.use_denoising=True
    scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
    for name,pos,target in [('landing_source_preview',(65,-140,33),(8,-80,17)),('region_source_preview',(1050,-1050,1000),(300,0,8))]:
        cam.data.type='ORTHO' if name.startswith('region') else 'PERSP';cam.data.ortho_scale=1650
        cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
    print('SOURCE_PREVIEWS_RENDERED',flush=True)

if __name__=='__main__':main()
