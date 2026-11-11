"""Data/route checks for the sample, not a substitute for UE collision or playtest."""
import importlib.util
from collections import deque
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sample05', ROOT / 'game/Content/Python/build_sample_bensay_0_5.py')
sample = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sample)


class SampleScene(unittest.TestCase):
    def setUp(self):
        self.data = sample.load_scene()

    def test_runtime_markers_and_localized_contract(self):
        points = self.data['points']
        self.assertEqual(sum('FerrySampleRoot' in p['tags'] for p in points), 1)
        self.assertEqual({p['tags'][1] for p in points if 'FerrySampleInteract' in p['tags']}, {'nan', 'help', 'bridge'})
        self.assertEqual({p['tags'][1] for p in points if 'FerrySampleCheckpoint' in p['tags']}, {'start', 'help', 'bridge'})
        self.assertTrue(all('FerryCheckpoint' in p['tags'] for p in points if 'FerrySampleCheckpoint' in p['tags']))
        self.assertEqual(self.data['settings']['save_slot'], 'FerrySample05_v1')
        keys = ['objective_start', 'objective_route', 'objective_help', 'objective_bridge', 'objective_return', 'objective_complete', 'hint_nan', 'hint_help', 'hint_bridge', 'talk_nan', 'help_done', 'bridge_done', 'return_done', 'blocked_bridge', 'save_failed']
        for key in keys:
            self.assertTrue(self.data['strings'][key]['vi'])
            self.assertTrue(self.data['strings'][key]['en'])
        decks = [m for m in self.data['meshes'] if 'FerrySampleBridgeDeck' in m.get('tags', [])]
        self.assertEqual(len(decks), 1)
        self.assertNotEqual(self.data['map_path'], '/Game/Maps/L_LongBien_Graybox')

    def test_each_branch_reaches_help_without_opening_bridge(self):
        floors = [m for m in self.data['meshes'] if m['material'] in ('ground', 'path', 'mud')]
        def reachable(exclude):
            usable = [m for m in floors if not m['name'].startswith(exclude)]
            def walkable(p):
                return any(abs(p[0]-m['pos'][0]) <= m['size'][0]/2-.5 and
                           abs(p[1]-m['pos'][1]) <= m['size'][1]/2-.5 for m in usable)
            q, seen = deque([(0,0)]), {(0,0)}
            while q:
                x,y = q.popleft()
                if (x,y) == (95,0): return True
                for point in [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]:
                    if point not in seen and walkable(point): seen.add(point); q.append(point)
            return False
        self.assertTrue(reachable('Low'), 'upper branch disconnected')
        self.assertTrue(reachable('North'), 'lower branch disconnected')
