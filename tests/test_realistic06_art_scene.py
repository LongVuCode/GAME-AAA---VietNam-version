"""Source geometry/rig/route contracts; does not claim UE import or playtest success."""
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import struct
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('realistic06',ROOT/'game/Content/Python/build_realistic_level_0_6.py')
level=importlib.util.module_from_spec(spec);spec.loader.exec_module(level)


def glb(path):
    raw=path.read_bytes();size,kind=struct.unpack_from('<II',raw,12)
    assert kind==0x4e4f534a
    data=json.loads(raw[20:20+size]);offset=20+size
    length,kind=struct.unpack_from('<II',raw,offset)
    return data,raw[offset+8:offset+8+length]


class Realistic06SourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.scene,cls.env,cls.characters=level.load_sources()

    def test_map_quest_contract_and_save_isolation(self):
        self.assertNotEqual(self.scene['map_path'],'/Game/Maps/L_BenSay_Sample05')
        self.assertEqual(self.scene['settings']['save_slot'],'FerryRealistic06_v1')
        points=self.scene['points']
        self.assertEqual(sum('FerryRealisticRoot' in p['tags'] for p in points),1)
        self.assertEqual({p['tags'][1] for p in points if 'FerrySampleInteract' in p['tags']},{'nan','help','bridge'})
        self.assertEqual({p['tags'][1] for p in points if 'FerrySampleCheckpoint' in p['tags']},{'start','help','bridge'})
        enemies=json.loads((ROOT/'design/data/enemies.json').read_text())
        valid={e['id'] for e in enemies['enemies']}
        for p in points:
            if 'FerrySpawn' in p['tags']:self.assertIn(p['tags'][1],valid)
        for key in ('objective_boss','journal_boss','blocked_boss','boss_freed'):
            self.assertTrue(self.scene['strings'][key]['vi']);self.assertTrue(self.scene['strings'][key]['en'])

    def test_terrain_extent_slopes_and_open_routes(self):
        self.assertEqual(self.env['terrain_bounds_m'],[-300,900,-500,500])
        self.assertGreaterEqual(self.env['terrain_quads'],48000)
        for route in self.scene['routes_m']:
            for a,b in zip(route,route[1:]):
                steps=max(1,math.ceil(math.dist(a,b)))
                for i in range(steps+1):
                    x=a[0]+(b[0]-a[0])*i/steps;y=a[1]+(b[1]-a[1])*i/steps
                    dx=(level.terrain_height(x+.1,y)-level.terrain_height(x-.1,y))/.2
                    dy=(level.terrain_height(x,y+.1)-level.terrain_height(x,y-.1))/.2
                    self.assertLess(math.degrees(math.atan(math.hypot(dx,dy))),40,'Route too steep at '+str((x,y)))
        # Lower branch reaches the carrier independently, before bridge state changes.
        self.assertIn([460,-80],self.scene['routes_m'][0]);self.assertIn([460,-80],self.scene['routes_m'][1])
        decks=sorted(i['xy'][1] for i in self.scene['instances'] if 'FerrySampleBridgeDeck' in i['tags'])
        # The outer planks meet the banks below a conservative 30 cm step, without needing a jump.
        for centre,bank in [(decks[0],decks[0]-1.5),(decks[-1],decks[-1]+1.5)]:
            self.assertLess(abs(level.bridge_deck_height(centre)-level.terrain_height(240,bank)),.3)
        for a,b in zip(decks,decks[1:]):
            self.assertLessEqual(b-a,3.01)
            self.assertLess(abs(level.bridge_deck_height(a)-level.bridge_deck_height(b)),.3)

    def test_exported_rigs_have_distinct_nonempty_motion_data(self):
        expected={'Coi_Custom':9,'Stoneback_Custom':5,'MarshBoar_Custom':6}
        for item in self.characters['assets']:
            data,binary=glb(ROOT/'game/ArtSource/Characters'/(item['asset']+'.glb'))
            self.assertTrue(data['skins'])
            self.assertGreaterEqual(len(data['skins'][0]['joints']),len(item['bones']))
            animations=data['animations'];self.assertEqual(len(animations),expected[item['asset']])
            signatures=[]
            for animation in animations:
                h=hashlib.sha256();samples=0
                for sampler in animation['samplers']:
                    accessor=data['accessors'][sampler['output']];view=data['bufferViews'][accessor['bufferView']]
                    start=view.get('byteOffset',0)+accessor.get('byteOffset',0)
                    h.update(binary[start:start+view['byteLength']]);samples+=accessor['count']
                self.assertGreater(samples,30);signatures.append(h.hexdigest())
            self.assertEqual(len(set(signatures)),len(animations),'Different named clips must contain different motion')
            for clip in item['clips']:
                self.assertGreater((ROOT/'game/ArtSource/Characters'/clip['file']).stat().st_size,1000)

    def test_static_art_materials_resolve_and_data_not_shared_baked(self):
        for asset in self.env['assets'].values():
            for slot in asset['materials']:self.assertIn(slot,self.env['materials'])
        self.assertLess(self.env['assets']['shrub_03_a']['vertices'],self.env['assets']['FigTree']['vertices'])
        for name in ('bark','shrub_03','thatch','planks','rock_moss_set_01'):
            self.assertTrue(self.env['materials'][name]['color'],name+' lost its source texture')
        for name in ('cau_tre','FigTree','nha_san'):
            bounds=self.env['assets'][name]['bounds_m']
            self.assertAlmostEqual(bounds[0][2],0,places=4)
            self.assertGreater(bounds[1][2],1)
        for material in self.env['materials'].values():
            if material.get('masked'):self.assertTrue(material.get('color'),'Opacity mask needs the source alpha texture')
            for key in ('color','normal','roughness','arm'):
                if material.get(key):self.assertTrue((ROOT/'game/ArtSource/Environment06/textures'/material[key]).is_file())
        self.assertTrue(all(level.asset_name(k).replace('_','').isalnum() for k in self.env['materials']))


if __name__=='__main__':unittest.main()
