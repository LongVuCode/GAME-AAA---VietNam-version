"""Build UE environment source meshes; use decoded licensed GLBs, bpy 5.3 and Pillow.
Static FBX contract: raw XYZ centimetres, +Z up; import with convert_scene/unit false.
Characters use their own standard skeletal FBX contract. No UE installation needed here.
"""
import argparse
import hashlib
import json
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/assets'))
from expand_glb_images import expand_images, extract_images


def height(x, y):
    ridge = 18 * math.exp(-((x - 210) / 210)**2 - ((y + 210) / 140)**2)
    hills = 8 * math.sin(x / 155) * math.sin(y / 170) + 5 * math.cos((x + y) / 190)
    river = -9 * math.exp(-((y - 20 * math.sin(x / 180)) / 25)**2)
    return ridge + hills + river + 12


def segment_distance(x, y, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = max(0, min(1, ((x-a[0])*dx + (y-a[1])*dy)/(dx*dx+dy*dy)))
    return math.hypot(x-a[0]-t*dx, y-a[1]-t*dy)


def export_mesh(path, objects, name):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        # glTF foliage instances share mesh data. Export baking must not rescale other source objects.
        obj.data = obj.data.copy()
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    # Bake original collection/object transforms into geometry and use an origin at ground level.
    transform = obj.matrix_world.copy()
    obj.data.transform(transform)
    obj.matrix_world = Matrix.Identity(4)
    if name not in ('Terrain06', 'River06'):
        low = min(v.co.z for v in obj.data.vertices)
        xs = [v.co.x for v in obj.data.vertices]; ys = [v.co.y for v in obj.data.vertices]
        obj.data.transform(Matrix.Translation((-(min(xs)+max(xs))/2, -(min(ys)+max(ys))/2, -low)))
    obj.name = name
    slots = [slot.material.name for slot in obj.material_slots]
    bounds = [[min(v.co[i] for v in obj.data.vertices) for i in range(3)],
              [max(v.co[i] for v in obj.data.vertices) for i in range(3)]]
    # Identity axis basis, baked centimetre vertices: eliminates implicit axis/unit conversions.
    obj.data.transform(Matrix.Scale(100, 4))
    bpy.ops.export_scene.fbx(filepath=str(path.resolve()), use_selection=True, object_types={'MESH'},
        global_scale=1, apply_unit_scale=False, axis_forward='Y', axis_up='Z',
        path_mode='STRIP', mesh_smooth_type='FACE', bake_anim=False)
    return {'file': path.name, 'materials': slots, 'bounds_m': bounds,
            'vertices': len(obj.data.vertices), 'triangles': sum(len(p.vertices)-2 for p in obj.data.polygons)}


def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--decoded',required=True); parser.add_argument('--out',required=True)
    args=parser.parse_args(); out=Path(args.out).resolve(); out.mkdir(parents=True,exist_ok=True)
    tex=out/'textures'; tex.mkdir(exist_ok=True)
    scene=json.loads((ROOT/'design/data/ue_realistic_0_6.json').read_text())
    bpy.ops.wm.read_factory_settings(use_empty=True)
    atlas=Image.open(ROOT/'prototype/web/assets/terrain/terrain_albedo.jpg')
    normal=Image.open(ROOT/'prototype/web/assets/terrain/terrain_nrm.jpg'); w=atlas.width
    materials={}
    # Exact order from tools/assets/prepare_textures.py, not inferred names.
    for index,name in enumerate(['mud','grass','path','dry_mud','bank']):
        atlas.crop((0,index*w,w,(index+1)*w)).save(tex/(name+'_color.png'))
        packed=np.array(normal.crop((0,index*w,w,(index+1)*w)))
        xy=packed[:,:,:2].astype(float)/127.5-1
        z=np.sqrt(np.maximum(0,1-(xy*xy).sum(axis=2)))
        rgb=np.dstack([packed[:,:,0],255-packed[:,:,1],((z*.5+.5)*255).astype('uint8')]).astype('uint8')
        Image.fromarray(rgb).save(tex/(name+'_normal.png'))
        Image.fromarray(packed[:,:,2]).save(tex/(name+'_roughness.png'))
        key='Terrain_'+name
        materials[key]={'color':name+'_color.png','normal':name+'_normal.png',
                        'roughness':name+'_roughness.png','normal_dx':True,'masked':False}
    n=241; ny=201; vertices=[]; faces=[]
    for j in range(ny):
        y=-500+j*5
        for i in range(n):
            x=-300+i*5; vertices.append((x,y,height(x,y)))
    for j in range(ny-1):
        for i in range(n-1):
            q=j*n+i; faces.append((q,q+1,q+n+1,q+n))
    mesh=bpy.data.meshes.new('Terrain06'); mesh.from_pydata(vertices,[],faces); mesh.update()
    obj=bpy.data.objects.new('Terrain06',mesh); bpy.context.collection.objects.link(obj)
    names=list(materials)
    for key in names:
        m=bpy.data.materials.new(key); mesh.materials.append(m)
    uv=mesh.uv_layers.new(name='UVMap')
    segments=[(a,b) for route in scene['routes_m'] for a,b in zip(route,route[1:])]
    for p in mesh.polygons:
        x=sum(vertices[v][0] for v in p.vertices)/4; y=sum(vertices[v][1] for v in p.vertices)/4
        distance=min(segment_distance(x,y,a,b) for a,b in segments)
        p.material_index=2 if distance<5 else 0 if abs(y-20*math.sin(x/180))<19 else 1 if height(x,y)>12 else 4
        p.use_smooth=True
        for li in p.loop_indices:
            v=vertices[mesh.loops[li].vertex_index]; uv.data[li].uv=(v[0]/6,v[1]/6)
    exports={'Terrain06':export_mesh(out/'Terrain06.fbx',[obj],'Terrain06')}
    # A winding river surface, no collision; terrain provides the walkable bed/ford.
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    vv=[]; ff=[]
    for i in range(241):
        x=-300+i*5; cy=20*math.sin(x/180); z=height(x,cy)+.45
        vv.extend([(x,cy-10,z),(x,cy+10,z)])
        if i:ff.append((2*i-2,2*i,2*i+1,2*i-1))
    me=bpy.data.meshes.new('River06'); me.from_pydata(vv,[],ff); me.update()
    ob=bpy.data.objects.new('River06',me); bpy.context.collection.objects.link(ob)
    me.materials.append(bpy.data.materials.new('RiverWater'))
    exports['River06']=export_mesh(out/'River06.fbx',[ob],'River06')
    materials['RiverWater']={'base_color':[.04,.12,.11], 'roughness_value':.19, 'metallic_value':.12, 'masked':False}
    for filename in ['nature','props']:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        png=Path(args.decoded)/(filename+'_png.glb')
        expand_images(Path(args.decoded)/(filename+'.glb'),png)
        bpy.ops.import_scene.gltf(filepath=str(png.resolve()))
        extracted=extract_images(png,tex)
        for mat in bpy.data.materials:
            if not mat.use_nodes:continue
            for node in mat.node_tree.nodes:
                if node.type=='TEX_IMAGE' and node.image:
                    original=node.image
                    target=extracted[original.name]
                    loaded=bpy.data.images.load(str(target),check_existing=True)
                    loaded.colorspace_settings.name=original.colorspace_settings.name
                    node.image=loaded
        for mat in bpy.data.materials:
            if not mat.use_nodes:continue
            images=[node.image for node in mat.node_tree.nodes if node.type=='TEX_IMAGE' and node.image]
            def find_image(*terms):
                return next((Path(im.filepath_raw).name for im in images if any(t in im.name for t in terms)),None)
            bs=next((node for node in mat.node_tree.nodes if node.type=='BSDF_PRINCIPLED'),None)
            info={'color':find_image('diff'), 'normal':find_image('nor'), 'arm':find_image('_arm','_rough'),
                  'normal_dx':False, 'masked':bool(bs and bs.inputs['Alpha'].is_linked)}
            if bs:info['base_color']=list(bs.inputs['Base Color'].default_value[:3])
            materials[mat.name]=info
        objects=[ob for ob in bpy.context.scene.objects if ob.type=='MESH' and 'LOD1' not in ob.name]
        tree=[ob for ob in objects if ob.name.startswith('cay_sung')]
        if tree:
            objects=[ob for ob in objects if not ob.name.startswith('cay_sung')]
            # The web tree's 24 sparse clumps left an almost bare crown at third-person scale.
            # Build a fuller, irregular crown from the same licensed leaf geometry, not solid spheres.
            rng=random.Random(61114)
            leaf=next(ob for ob in tree if ob.name.startswith('cay_sung_leaf'))
            for i in range(72):
                copy=leaf.copy();copy.data=leaf.data;bpy.context.collection.objects.link(copy)
                angle=rng.uniform(0,math.tau);radius=math.sqrt(rng.random())*3.6
                copy.location=(math.cos(angle)*radius,math.sin(angle)*radius,7.2+rng.uniform(-1,1.8))
                copy.scale=(1.8,1.8,1.8)
                copy.rotation_euler=(rng.uniform(-.3,.3),rng.uniform(-.3,.3),angle)
                tree.append(copy)
            exports['FigTree']=export_mesh(out/'FigTree.fbx',tree,'FigTree')
        for ob in objects:
            name=ob.name.replace('.','_')
            exports[name]=export_mesh(out/(name+'.fbx'),[ob],name)
    manifest={'schema_version':2,'generator':'tools/blender/build_realistic_environment.py',
              'static_fbx_import':{'convert_scene':False,'convert_scene_unit':False,'units':'raw XYZ centimetres, Z up'},
              'terrain_bounds_m':[-300,900,-500,500],'terrain_vertices':n*ny,'terrain_quads':len(faces),
              'source_license':'L-023,L-024,L-027,L-028; see L-031,L-032',
              'assets':exports,'materials':materials}
    manifest['file_checksums']={str(p.relative_to(out)):{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}
        for p in sorted(out.rglob('*')) if p.is_file() and p.suffix in ('.fbx','.png')}
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('ENVIRONMENT_EXPORT_COMPLETE',len(exports),'meshes',len(materials),'materials')

if __name__=='__main__':main()
