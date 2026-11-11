"""Regression checks for editor generation behavior; not an Unreal API/runtime test."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

FILE = Path(__file__).resolve().parents[1] / 'game/Content/Python/build_graybox_longbien.py'
spec = importlib.util.spec_from_file_location('graybox_builder', FILE)
graybox = importlib.util.module_from_spec(spec)
spec.loader.exec_module(graybox)


class GrayboxBuilderRegression(unittest.TestCase):
    def test_existing_instances_are_reparented_on_rerun(self):
        parent = object()
        instance = object()
        api = Mock()
        api.EditorAssetLibrary.does_asset_exist.return_value = True
        api.EditorAssetLibrary.load_asset.side_effect = lambda p: parent if p == graybox.BASE_MATERIAL else instance
        api.MaterialEditingLibrary.set_material_instance_vector_parameter_value.return_value = True
        builder = graybox.GrayboxBuilder.__new__(graybox.GrayboxBuilder)
        builder.materials = {}
        with patch.object(graybox, 'unreal', api):
            builder.build_materials()
        calls = api.MaterialEditingLibrary.set_material_instance_parent.call_args_list
        self.assertEqual(len(calls), len(graybox.MATERIALS))
        self.assertTrue(all(c.args == (instance, parent) for c in calls))
        self.assertEqual(set(builder.materials), set(graybox.MATERIALS))

    def test_only_target_points_register_as_checkpoints(self):
        builder = graybox.GrayboxBuilder.__new__(graybox.GrayboxBuilder)
        builder.mesh = Mock()
        builder.point = Mock()
        api = SimpleNamespace(PlayerStart=object(), TargetPoint=object())
        with patch.object(graybox, 'unreal', api):
            builder.build_markers()
        self.assertFalse(any('FerryCheckpoint' in (c.args[6] or []) for c in builder.mesh.call_args_list))
        checkpoints = [c for c in builder.point.call_args_list if 'FerryCheckpoint' in (c.args[5] or [])]
        self.assertEqual(len(checkpoints), len(graybox.CHECKPOINTS))
        self.assertTrue(all(c.args[0] is api.TargetPoint for c in checkpoints))
