"""Independent FBX re-import checks. Run with the same bpy Python used for export."""
import argparse,hashlib,json
from pathlib import Path
import bpy

ROOT=Path(__file__).resolve().parents[2]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--out',required=True);args=parser.parse_args()
    report={'status':'source_fbx_verified_not_unreal','blender':bpy.app.version_string,'static':{},'characters':{}}
    art=ROOT/'game/ArtSource';env=json.loads((art/'Environment06/manifest.json').read_text())
    for name in ['Terrain06','FigTree','cau_tre','shrub_03_a']:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=str(art/'Environment06'/env['assets'][name]['file']))
        obj=next(o for o in bpy.context.scene.objects if o.type=='MESH')
        low=[min(v.co[i] for v in obj.data.vertices)/100 for i in range(3)]
        high=[max(v.co[i] for v in obj.data.vertices)/100 for i in range(3)]
        for i in range(3):
            assert abs(low[i]-env['assets'][name]['bounds_m'][0][i])<.001
            assert abs(high[i]-env['assets'][name]['bounds_m'][1][i])<.001
        assert obj.data.uv_layers
        report['static'][name]={'bounds_m':[low,high],'vertices':len(obj.data.vertices),'uv_layers':len(obj.data.uv_layers)}
    manifest=json.loads((art/'Characters/manifest.json').read_text())
    for item in manifest['assets']:
        clips={}
        for clip in item['clips']:
            path=art/'Characters'/clip['file'];bpy.ops.wm.read_factory_settings(use_empty=True)
            bpy.ops.import_scene.fbx(filepath=str(path),use_anim=True)
            rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
            actions=list(bpy.data.actions);assert len(actions)==1
            action=actions[0];assert action.frame_range[1]-action.frame_range[0]>=35
            assert set(item['bones']).issubset({b.name for b in rig.data.bones})
            rig.animation_data_create();rig.animation_data.action=action
            digest=hashlib.sha256()
            for frame in [1,7,13,19,25,31,37]:
                bpy.context.scene.frame_set(frame)
                values=[round(value,5) for bone in sorted(rig.pose.bones,key=lambda b:b.name) for row in bone.matrix_basis for value in row]
                digest.update(json.dumps(values).encode())
            clips[clip['motion']]={'file':clip['file'],'bones':len(rig.data.bones),'frame_range':list(action.frame_range),'pose_signature':digest.hexdigest()}
        assert len({c['pose_signature'] for c in clips.values()})==len(clips),item['asset']+' has duplicate motion'
        report['characters'][item['asset']]=clips
    out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,indent=2)+'\n')
    print('FBX_REIMPORT_CHECK_PASS',len(report['static']),'static meshes;',sum(len(v) for v in report['characters'].values()),'clips',flush=True)

if __name__=='__main__':main()
