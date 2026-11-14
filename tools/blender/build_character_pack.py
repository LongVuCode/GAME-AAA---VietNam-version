#!/usr/bin/env python3
"""Deterministic custom skinned prototypes. Requires bpy 5.3; no downloaded artwork.
PLACEHOLDER_AI: internal prototypes, not commercial-ready art. All dimensions are meters.
Exports own skeletons (not Epic Mannequin), real keyed clips, FBX/GLB and a rendered preview.
"""
import argparse, hashlib, json, math, random
from pathlib import Path
import bpy
from mathutils import Vector

RNG = random.Random(20261113)
OUT = None
MATS = {}
OBJECTS = []

def material(name, color, roughness=.65, metallic=0, noise=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1)
    n.inputs['Roughness'].default_value=roughness;n.inputs['Metallic'].default_value=metallic
    if noise:
        tex=m.node_tree.nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=40
        bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=noise;bump.inputs['Distance'].default_value=.018
        m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],n.inputs['Normal'])
    MATS[name]=m;return m

def finish(o,name,mat):
    o.name=name
    if mat:o.data.materials.append(MATS[mat])
    if o.type=='MESH':
        for p in o.data.polygons:p.use_smooth=True
    OBJECTS.append(o);return o

def ellipsoid(name,loc,scale,mat,segments=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=16,location=loc)
    o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,mat)

def tube(name,points,radii,mat,sides=12):
    vs=[];fs=[]
    for i,p in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        tangent.normalize();a=tangent.cross(Vector((0,0,1)))
        if a.length<.01:a=tangent.cross(Vector((0,1,0)))
        a.normalize();b=tangent.cross(a).normalized()
        for j in range(sides):vs.append(Vector(p)+radii[i]*(a*math.cos(j*math.tau/sides)+b*math.sin(j*math.tau/sides)))
    for i in range(len(points)-1):
        for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
    fs.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))])
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
    return finish(o,name,mat)

def loft(name,rings,mat,fold=0,sides=48):
    vs=[];fs=[]
    for z,rx,ry,cy in rings:
        for j in range(sides):
            a=j*math.tau/sides;r=1+fold*math.sin(a*12+z*3)
            vs.append((math.cos(a)*rx*r,math.sin(a)*ry*r+cy,z))
    for i in range(len(rings)-1):
        for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
    return finish(o,name,mat)

def unify(parts,name,voxel=.017):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=parts[0];o.name=name
    o.data.remesh_voxel_size=voxel;bpy.ops.object.voxel_remesh()
    sm=o.modifiers.new('Anatomical smoothing','SMOOTH');sm.factor=.65;sm.iterations=5;bpy.ops.object.modifier_apply(modifier=sm.name)
    sub=o.modifiers.new('Skin surface','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
    for p in o.data.polygons:p.use_smooth=True
    return o

def rig(name,bones):
    bpy.ops.object.select_all(action='DESELECT');data=bpy.data.armatures.new(name);o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for n,h,t,parent in bones:
        b=data.edit_bones.new(n);b.head=h;b.tail=t
        if parent:b.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT');o.show_in_front=True;return o

def segment_distance(p,a,b):
    v=b-a;f=max(0,min(1,(p-a).dot(v)/max(v.length_squared,1e-9)));return (p-(a+f*v)).length

def bind(o,r,bone=None):
    mod=o.modifiers.new('Skin to '+r.name,'ARMATURE');mod.object=r;o.parent=r
    if bone:
        g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');return
    bones=[b for b in r.data.bones if b.name!='root']
    groups={b.name:o.vertex_groups.new(name=b.name) for b in bones}
    inv=r.matrix_world.inverted();mw=o.matrix_world
    for v in o.data.vertices:
        p=inv@mw@v.co
        near=sorted((segment_distance(p,b.head_local,b.tail_local),b.name) for b in bones)[:2]
        weights=[1/(d+.025)**4 for d,n in near];total=sum(weights)
        for (d,n),w in zip(near,weights):groups[n].add([v.index],w/total,'REPLACE')

def humanoid():
    start=len(OBJECTS);body=[]
    body.append(ellipsoid('Coi anatomical trunk',(0,0,1.2),(.155,.092,.285),'skin'))
    body.append(ellipsoid('Pelvic anatomy',(0,.006,.99),(.16,.105,.125),'skin'))
    body.append(tube('Neck',[(0,0,1.42),(0,0,1.53)],[.055,.046],'skin'))
    body.append(ellipsoid('Skull',(0,-.008,1.625),(.092,.078,.12),'skin',32))
    body.append(ellipsoid('Jaw',(0,-.016,1.565),(.065,.064,.059),'skin'))
    body.append(ellipsoid('Nose bridge',(0,-.084,1.625),(.014,.027,.026),'skin'))
    for side in [-1,1]:
        body.append(tube('Arm anatomy',[(side*.14,0,1.39),(side*.24,0,1.34),(side*.36,-.01,1.18),(side*.405,-.025,1.015)],[.065,.057,.042,.027],'skin'))
        body.append(ellipsoid('Hand',(side*.415,-.026,.97),(.032,.026,.065),'skin'))
        body.append(tube('Leg anatomy',[(side*.085,0,1.02),(side*.095,.012,.7),(side*.09,-.018,.47),(side*.09,0,.14)],[.083,.077,.048,.028],'skin'))
        body.append(ellipsoid('Foot',(side*.09,-.052,.075),(.043,.095,.042),'skin'))
    skin=unify(body,'Coi_continuous_skin',.012)
    shirt=loft('Indigo woven tunic',[(1.04,.158,.112,0),(1.14,.135,.1,0),(1.28,.157,.112,0),(1.39,.17,.108,0),(1.43,.1,.072,0)],'indigo',.025)
    skirt=loft('Wrapped hemp skirt',[(1.06,.165,.115,0),(.98,.175,.128,0),(.82,.2,.145,0),(.61,.23,.17,0)],'cloth',.055)
    belt=loft('Woven sash',[(1.025,.171,.12,0),(1.065,.17,.119,0)],'ochre',.01)
    # Geometric seams and overlapping front panel survive export without procedural shaders.
    for side in [-1,1]:tube('Tunic sewn edge',[(side*.11,-.073,1.43),(side*.07,-.106,1.28),(side*.025,-.106,1.065)],[.003]*3,'seam',8)
    loft('Skirt front overlap',[(1.025,.168,.126,-.006),(.83,.2,.148,-.004),(.615,.235,.175,-.003)],'cloth',.035,32)
    for side in [-1,1]:
        # Forehead/cheek features use smooth shapes; the body underneath is a single remeshed skin.
        ellipsoid('Eye white',(side*.035,-.075,1.65),(.021,.012,.011),'eye',20)
        ellipsoid('Iris',(side*.035,-.086,1.65),(.009,.004,.009),'iris',16)
        ellipsoid('Pupil',(side*.035,-.089,1.65),(.004,.002,.006),'hair',12)
        tube('Eyebrow',[(side*.016,-.079,1.674),(side*.036,-.082,1.678),(side*.056,-.071,1.672)],[.0035]*3,'hair',8)
        tube('Ear',[(side*.087,-.001,1.65),(side*.099,.001,1.625),(side*.087,-.002,1.603)],[.012,.013,.009],'skin')
        for k in range(4):
            x=side*(.394+k*.014)
            tube('Fingers',[(x,-.028,.942),(x+side*.003,-.034,.912),(x+side*.001,-.035,.899)],[.007,.006,.0045],'skin',8)
        tube('Thumb',[(side*.399,-.042,.972),(side*.383,-.057,.943),(side*.387,-.059,.928)],[.012,.009,.006],'skin',8)
    ellipsoid('Lower lip',(0,-.079,1.582),(.022,.006,.004),'lip',20)
    # Sculpted scalp with front hairline and a cloth head tie; not an external character model.
    cap=ellipsoid('Bound dark hair',(0,.015,1.692),(.096,.087,.068),'hair',32)
    ellipsoid('Hair knot',(0,.087,1.654),(.045,.046,.055),'hair')
    tube('Head cloth knot',[(0,.092,1.666),(.035,.12,1.63),(.052,.113,1.57)],[.015,.013,.006],'indigo')
    loft('Head cloth band',[(1.675,.097,.086,.012),(1.693,.095,.086,.012)],'ochre')
    bones=[('root',(0,0,0),(0,0,.15),None),('pelvis',(0,0,.94),(0,0,1.1),'root'),('spine',(0,0,1.1),(0,0,1.28),'pelvis'),('chest',(0,0,1.28),(0,0,1.43),'spine'),('neck',(0,0,1.43),(0,0,1.53),'chest'),('head',(0,0,1.53),(0,0,1.75),'neck')]
    for side,label in [(-1,'L'),(1,'R')]:
        bones += [('upper_arm.'+label,(side*.15,0,1.39),(side*.36,-.01,1.18),'chest'),('forearm.'+label,(side*.36,-.01,1.18),(side*.405,-.025,1.015),'upper_arm.'+label),('hand.'+label,(side*.405,-.025,1.015),(side*.415,-.026,.91),'forearm.'+label),('thigh.'+label,(side*.085,0,1.02),(side*.09,-.018,.47),'pelvis'),('shin.'+label,(side*.09,-.018,.47),(side*.09,0,.14),'thigh.'+label),('foot.'+label,(side*.09,0,.14),(side*.09,-.13,.07),'shin.'+label)]
    r=rig('Coi_Rig',bones)
    # Deselect removed objects from the pre-remesh list and skin only surviving meshes.
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name not in ('StudioFloor',)]
    for o in meshes:
        if o==skin:bind(o,r)
        else:
            z=sum((o.matrix_world@v.co).z for v in o.data.vertices)/max(1,len(o.data.vertices))
            bind(o,r,'head' if z>1.5 else 'pelvis' if z<1.1 else 'chest')
    # Bronze-tipped bamboo spear is bound to the right hand (same own skeleton).
    spear=tube('Coi bamboo spear',[(.445,-1.4,1.02),(.445,.88,1.02)],[.012,.016],'bamboo')
    tip=tube('Coi bronze spearhead',[(.445,-1.4,1.02),(.445,-1.55,1.02),(.445,-1.72,1.02)],[.012,.041,.001],'bronze')
    for o in [spear,tip]:bind(o,r,'hand.R');meshes.append(o)
    return r,meshes

def animal(kind):
    start=set(o.name for o in bpy.context.scene.objects);bones=[('root',(0,0,0),(0,0,.2),None)];partbones={}
    def part(o,bone):partbones[o.name]=bone;return o
    if kind=='stoneback':
        bones += [('body',(0,.2,.38),(0,-.25,.38),'root'),('head',(0,-.25,.33),(0,-.65,.27),'body')]
        part(ellipsoid('Cricket thorax',(0,0,.35),(.42,.58,.25),'chitin'),'body')
        part(ellipsoid('Cricket abdomen',(0,.45,.31),(.34,.38,.22),'chitin'),'body')
        part(ellipsoid('Cricket head',(0,-.54,.29),(.24,.2,.17),'chitin'),'head')
        stone=part(ellipsoid('Weathered moss stone',(0,.03,.61),(.63,.74,.16),'stone',32),'body')
        for v in stone.data.vertices:
            v.co *= 1+RNG.uniform(-.035,.035)
        for side,label in [(-1,'L'),(1,'R')]:
            part(ellipsoid('Dark cricket eye',(side*.15,-.69,.32),(.055,.04,.047),'iris'),'head')
            part(tube('Cricket short antenna',[(side*.12,-.68,.32),(side*.2,-.86,.38),(side*.22,-.95,.36)],[.014,.009,.003],'chitin'),'head')
            for j,y in enumerate([-.22,.23]):
                hip=(side*.32,y,.34);knee=(side*.64,y+.08,.21);foot=(side*.83,y-.08,.045)
                name=f'leg{j}.{label}';bones.append((name,hip,foot,'body'))
                part(tube('Segmented cricket leg',[hip,knee,foot],[.055,.04,.016],'chitin'),name)
            sh='front_shovel.'+label;bones.append((sh,(side*.21,-.4,.3),(side*.53,-.81,.14),'head'))
            part(tube('Cricket shovel arm',[(side*.2,-.42,.27),(side*.38,-.66,.15),(side*.5,-.83,.12)],[.07,.075,.09],'horn'),sh)
            blade=part(ellipsoid('Broad digging shovel',(side*.51,-.82,.13),(.19,.18,.065),'horn'),sh)
            for k in range(4):part(tube('Shovel horn teeth',[(side*(.38+.085*k),-.91,.12),(side*(.39+.085*k),-1.05,.09)],[.035,.005],'horn'),sh)
            # Four rigid shed-shell mud legs, distinct from the four walking legs.
            for j,y in enumerate([.42,.62]):
                part(tube('Dry shed mud leg',[(side*.28,y,.3),(side*.59,y+.12,.16),(side*.66,y-.02,.055)],[.045,.03,.009],'drymud'),'body')
        for k in range(15):
            a=k*2.4;part(ellipsoid('Moss clump',(math.cos(a)*.48,math.sin(a)*.56,.73+RNG.uniform(-.035,.02)),(.08,.1,.027),'moss',12),'body')
        r=rig('Stoneback_Rig',bones)
    else:
        bones += [('body',(0,.6,1.22),(0,-.4,1.35),'root'),('chest',(0,-.4,1.35),(0,-.85,1.55),'body'),('head',(0,-.85,1.4),(0,-1.65,1.04),'chest'),('jaw',(0,-1.22,.99),(0,-1.78,.92),'head')]
        parts=[ellipsoid('Boar muscular trunk',(0,.15,1.22),(.64,1.12,.66),'boarskin',32),ellipsoid('Boar shoulder hump',(0,-.5,1.48),(.69,.68,.69),'boarskin',32),ellipsoid('Boar sloped skull',(0,-1.1,1.24),(.49,.63,.49),'boarskin',32)]
        body=unify(parts,'Boar unified anatomy',.035);partbones[body.name]='body'
        part(ellipsoid('Boar long muzzle',(0,-1.59,1.02),(.29,.48,.24),'boarskin'),'head')
        part(ellipsoid('Boar snout disk',(0,-1.98,1.03),(.24,.06,.18),'horn'),'head')
        part(ellipsoid('Boar lower jaw',(0,-1.5,.9),(.28,.4,.12),'boarskin'),'jaw')
        for side,label in [(-1,'L'),(1,'R')]:
            part(ellipsoid('Boar nostril',(side*.105,-2.035,1.05),(.04,.012,.025),'hair'),'head')
            part(ellipsoid('Boar eye',(side*.41,-1.3,1.41),(.053,.045,.045),'eye'),'head')
            part(ellipsoid('Boar pupil',(side*.447,-1.325,1.41),(.023,.024,.026),'iris'),'head')
            part(tube('Curved boar tusk',[(side*.22,-1.62,.94),(side*.42,-1.76,1.02),(side*.53,-1.75,1.28),(side*.5,-1.66,1.45)],[.075,.062,.035,.002],'ivory'),'head')
            ear=part(ellipsoid('Boar upright ear',(side*.39,-.9,1.75),(.14,.12,.29),'boarskin'),'head');ear.rotation_euler[1]=side*.45
            for j,y in enumerate([-.55,.78]):
                h=(side*.42,y,1.09);k=(side*.49,y-.06,.59);f=(side*.48,y-.1,.13);n=f'leg{j}.{label}';bones.append((n,h,f,'chest' if j==0 else 'body'))
                part(tube('Boar weightbearing leg',[h,k,f],[.18,.12,.065],'boarskin'),n)
                for split in [-1,1]:part(ellipsoid('Cloven hoof',(side*.48+split*.055,y-.14,.1),(.06,.12,.09),'horn'),n)
        part(tube('Boar tail',[(0,1.14,1.15),(.12,1.32,1.14),(.17,1.34,.99)],[.045,.025,.012],'boarskin'),'body')
        for k in range(28):
            y=-.98+k*.074;z=1.84+(.35*math.sin((k/27)*math.pi))
            part(tube('Raised boar mane',[(0,y,z-.12),(RNG.uniform(-.055,.055),y+.05,z+.12)],[.045,.004],'hair',8),'body')
        for k in range(20):
            side=(-1 if k%2 else 1);y=RNG.uniform(-.8,.8);z=RNG.uniform(.85,1.5)
            part(ellipsoid('Dried marsh mud',(side*.61,y,z),(.027,.15,.11),'drymud',12),'body')
        # A visibly rough bronze restraint is a prototype narrative prop, not a magic collar.
        for k in range(11):
            a=k*math.tau/12;x=.49*math.cos(a);z=1.25+.45*math.sin(a)
            part(ellipsoid('Broken bronze restraint',(x,-.84,z),(.08,.065,.065),'bronze',12),'head')
        r=rig('Boar_Rig',bones)
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name not in start]
    for o in meshes:bind(o,r,partbones.get(o.name,'body'))
    return r,meshes

def pose(r,clip,t):
    q={};loc={};s=math.sin(t*math.tau);c=math.cos(t*math.tau);pulse=math.sin(t*math.pi)
    if r.name.startswith('Coi'):
        q['chest']=(.025*s,0,.015*c)
        if clip in ['walk','run']:
            speed=1 if clip=='walk' else 1.5
            for side,label in [(-1,'L'),(1,'R')]:
                q['thigh.'+label]=(.46*s*side*speed,0,0);q['shin.'+label]=(max(0,-s*side)*.75*speed,0,0)
                q['upper_arm.'+label]=(-.28*s*side,0,side*.12)
            loc['pelvis']=(0,0,.025*abs(s)*speed)
        elif clip in ['spear_light','spear_heavy']:
            a=1 if clip=='spear_light' else 1.5
            q['chest']=(.15*pulse,0,-.38*pulse*a);q['upper_arm.R']=(-1.1*pulse,0,-.3*pulse);q['forearm.R']=(-.7*pulse,0,0)
            q['upper_arm.L']=(-.8*pulse,0,.45*pulse);q['forearm.L']=(-.9*pulse,0,0);loc['pelvis']=(0,-.16*pulse*a,-.04*pulse)
        elif clip=='dodge':q['pelvis']=(.9*pulse,0,-.25*pulse);q['thigh.L']=(-.9*pulse,0,0);q['thigh.R']=(-.9*pulse,0,0);q['shin.L']=(1.3*pulse,0,0);q['shin.R']=(1.3*pulse,0,0);loc['pelvis']=(.32*pulse,0,-.27*pulse)
        elif clip=='parry':q['upper_arm.R']=(-.95*pulse,0,-.4*pulse);q['forearm.R']=(-1.2*pulse,0,0);q['chest']=(0,0,.25*pulse)
        elif clip=='hit':q['chest']=(-.38*pulse,0,.2*pulse);q['head']=(-.2*pulse,0,0);loc['pelvis']=(0,.12*pulse,0)
        elif clip=='interact':q['spine']=(.55*pulse,0,0);q['upper_arm.L']=(-.7*pulse,0,.1);q['forearm.L']=(-.5*pulse,0,0);q['upper_arm.R']=(-.5*pulse,0,-.1)
    elif r.name.startswith('Stoneback'):
        q['body']=(.025*s,.025*c,0)
        if clip=='walk':
            for label,side in [('L',-1),('R',1)]:
                for j in range(2):q[f'leg{j}.{label}']=(.12*s*((-1)**j),.2*s*side*((-1)**j),.15*s*side)
            loc['body']=(0,0,.025*abs(s))
        elif clip=='attack':q['front_shovel.L']=(.8*pulse,-.5*pulse,-.45*pulse);q['front_shovel.R']=(.8*pulse,.5*pulse,.45*pulse);q['head']=(.25*pulse,0,0)
        elif clip=='stagger':q['body']=(0,.65*pulse,.2*pulse);loc['body']=(0,.08*pulse,-.08*pulse)
        elif clip=='retreat':loc['body']=(0,.2*pulse,-.18*pulse);q['front_shovel.L']=(.55*pulse,0,0);q['front_shovel.R']=(.55*pulse,0,0)
    else:
        q['chest']=(.02*s,0,0);q['head']=(0,.03*s,-.02)
        if clip in ['walk','charge']:
            a=.35 if clip=='walk' else .7
            for label,side in [('L',-1),('R',1)]:
                for j in range(2):q[f'leg{j}.{label}']=(a*s*side*((-1)**j),0,0)
            if clip=='charge':q['head']=(.35,0,.03*s);loc['body']=(0,-.25*pulse,.055*abs(s))
        elif clip=='tusk':q['head']=(-.55*pulse,.25*pulse,.4*s);q['jaw']=(.25*pulse,0,0)
        elif clip=='stagger':q['body']=(.08*pulse,.2*pulse,.18*pulse);loc['body']=(0,.13*pulse,-.15*pulse)
        elif clip=='freed':q['head']=(-.15*pulse,0,.3*s);q['chest']=(.08*pulse,0,0);loc['body']=(0,0,-.08*pulse)
    return q,loc

def animate(r,names):
    clips=[]
    for clip in names:
        action=bpy.data.actions.new(r.name.replace('_Rig','')+'_'+clip);r.animation_data_create();r.animation_data.action=action
        frames=[1,7,13,19,25,31,37]
        for f in frames:
            t=(f-1)/36;q,loc=pose(r,clip,t)
            for b in r.pose.bones:
                b.rotation_mode='XYZ';b.rotation_euler=q.get(b.name,(0,0,0));b.location=loc.get(b.name,(0,0,0))
                b.keyframe_insert(data_path='rotation_euler',frame=f,group=b.name);b.keyframe_insert(data_path='location',frame=f,group=b.name)
        track=r.animation_data.nla_tracks.new();track.name=action.name
        strip=track.strips.new(action.name,1,action);track.mute=True
        r.animation_data.action=None
        clips.append({'name':action.name,'motion':clip,'start':1,'end':37,'fps':30,'duration_s':1.2,'keyed_pose_samples':7})
    for b in r.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0)
    return clips

def export_asset(name,r,meshes,clips):
    bpy.ops.object.select_all(action='DESELECT');r.select_set(True)
    for o in meshes:o.select_set(True)
    bpy.context.view_layer.objects.active=r
    for tr in r.animation_data.nla_tracks:tr.mute=False
    bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=37;bpy.context.scene.frame_set(1)
    files=[]
    fbx=OUT/(name+'.fbx')
    bpy.ops.export_scene.fbx(filepath=str(fbx),use_selection=True,object_types={'ARMATURE','MESH'},global_scale=1.0,apply_unit_scale=True,axis_forward='-Y',axis_up='Z',add_leaf_bones=False,bake_anim=True,bake_anim_use_all_actions=False,bake_anim_use_nla_strips=True,bake_anim_simplify_factor=0,mesh_smooth_type='FACE')
    files.append(fbx.name)
    glb=OUT/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_force_sampling=True)
    files.append(glb.name)
    for tr in r.animation_data.nla_tracks:tr.mute=True
    # One animation per FBX gives UE stable names and safe repeat imports; no duplicate mesh payload.
    for clip in clips:
        r.animation_data.action=bpy.data.actions[clip['name']]
        path=OUT/(clip['name']+'.fbx')
        bpy.ops.export_scene.fbx(filepath=str(path),use_selection=True,object_types={'ARMATURE'},global_scale=1.0,
            apply_unit_scale=True,axis_forward='-Y',axis_up='Z',add_leaf_bones=False,bake_anim=True,
            bake_anim_use_all_actions=False,bake_anim_use_nla_strips=False,bake_anim_simplify_factor=0)
        clip['file']=path.name;files.append(path.name)
    r.animation_data.action=None
    for b in r.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0)
    return {'asset':name,'skeleton':r.name,'units':'meters; FBX apply_unit_scale=True, global_scale=1; verify UE import scale','height_m':round(max((o.matrix_world@v.co).z for o in meshes for v in o.data.vertices),3),'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'bones':[b.name for b in r.data.bones],'clips':clips,'files':files,'classification':'PLACEHOLDER_AI','commercial_ready':False}

def render_preview(assets):
    # Arrange own rigs on a studio ground. Animations muted: clearly inspect actual geometry/rig rest poses.
    for r,meshes,x in assets:r.location.x=x
    material('studio',(.045,.055,.06),.9)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));floor=bpy.context.object;floor.name='StudioFloor';floor.data.materials.append(MATS['studio'])
    for name,loc,power,size in [('Key',(-4,-6,8),1800,7),('Fill',(5,-1,6),1200,6),('Rim',(0,5,7),2200,5)]:
        bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,1))-l.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(8,-13,7));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=12
    scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.world.color=(.13,.13,.13);scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.render.filepath=str(OUT/'character_contact_sheet.png');scene.render.image_settings.file_format='PNG';bpy.ops.render.render(write_still=True)
    # Coi close-up: readability of face, cloth and hands, not a claim of production-ready human art.
    cam.location=(-3.2,-3.4,1.75);target=Vector((-3.2,0,1.35));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=1.65
    scene.render.resolution_x=850;scene.render.resolution_y=1000;scene.render.filepath=str(OUT/'coi_detail.png');bpy.ops.render.render(write_still=True)

def main():
    global OUT
    parser=argparse.ArgumentParser();parser.add_argument('--out',default='game/ArtSource/Characters');parser.add_argument('--no-render',action='store_true');args=parser.parse_args()
    OUT=Path(args.out).resolve();OUT.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1;bpy.context.scene.render.fps=30
    for name,col,rough,metal,noise in [('skin',(.42,.245,.145),.65,0,.13),('indigo',(.025,.065,.12),.9,0,.2),('cloth',(.18,.125,.075),.95,0,.22),('ochre',(.45,.27,.08),.9,0,.1),('seam',(.31,.25,.13),.8,0,0),('hair',(.017,.012,.01),.8,0,0),('eye',(.56,.47,.31),.28,0,0),('iris',(.03,.02,.012),.24,0,0),('lip',(.31,.095,.065),.65,0,0),('bamboo',(.21,.25,.095),.65,0,.08),('bronze',(.29,.17,.065),.43,.72,.12),('stone',(.2,.22,.16),.95,0,.3),('moss',(.13,.2,.055),1,0,.4),('chitin',(.17,.095,.043),.55,0,.15),('horn',(.24,.17,.08),.6,0,.15),('drymud',(.27,.24,.16),1,0,.25),('boarskin',(.12,.085,.055),.85,0,.18),('ivory',(.65,.55,.34),.4,0,.05)]:material(name,col,rough,metal,noise)
    manifest={'generator':'tools/blender/build_character_pack.py','blender':bpy.app.version_string,'seed':20261113,'classification':'PLACEHOLDER_AI','release_use':'INTERNAL_PROTOTYPE_ONLY','notes':['Custom procedural models, own skeletons; not AAA/final character art.','Procedural shader bump is preview-only; exported materials retain base PBR colors.','FBX coordinates -Y forward/+Z up, apply_unit_scale true/global_scale1. Verify UE bounding boxes, skin and clips before claiming runtime.'],'assets':[]}
    arranged=[]
    for name,builder,names,x in [('Coi_Custom',humanoid,['idle','walk','run','spear_light','spear_heavy','dodge','parry','hit','interact'],-3.2),('Stoneback_Custom',lambda:animal('stoneback'),['idle','walk','attack','stagger','retreat'],0),('MarshBoar_Custom',lambda:animal('boar'),['idle','walk','charge','tusk','stagger','freed'],3.3)]:
        r,meshes=builder();clips=animate(r,names);manifest['assets'].append(export_asset(name,r,meshes,clips));arranged.append((r,meshes,x))
        # Hide previous assets from selection but keep the contact sheet possible.
    if not args.no_render:render_preview(arranged)
    for p in sorted(OUT.iterdir()):
        if p.suffix.lower() in ['.fbx','.glb','.png']:
            manifest.setdefault('file_checksums',{})[p.name]={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print('CHARACTER_PACK_DONE',[(a['asset'],a['vertices'],len(a['clips'])) for a in manifest['assets']],flush=True)

if __name__=='__main__':main()
