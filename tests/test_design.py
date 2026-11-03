import contextlib
import copy
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import design_validate as dv  # noqa: E402


class RealData(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle, load_rep = dv.load_bundle()
        assert not load_rep.errors, load_rep.errors
        cls.research = dv.load_research()

    def fresh(self):
        return copy.deepcopy(self.bundle)

    def errors(self, bundle):
        return dv.validate(bundle, self.research).errors

    def test_real_data_has_no_errors(self):
        self.assertEqual(self.errors(self.bundle), [])

    def test_cli_exit_zero(self):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(dv.main([]), 0)

    def test_real_secret_chain_has_no_softlock(self):
        for chain in self.bundle["secrets"]["chains"]:
            unreachable, softlocks = dv.secret_reachability(chain)
            self.assertEqual(unreachable, [])
            self.assertEqual(softlocks, [])

    def test_boss_khoen_has_three_beat_pry(self):
        boss = next(e for e in self.bundle["enemies"]["enemies"] if e["id"] == "boss_lon_loi_dam")
        self.assertEqual(boss["khoen"]["pry_beats"], 3)
        self.assertEqual(len(boss["phases"]), 2)

    def test_demo_has_two_weapons_and_four_difficulties(self):
        self.assertEqual(len(self.bundle["weapons"]["weapons"]), 2)
        self.assertEqual(len(self.bundle["combat_tuning"]["difficulty"]["presets"]), 4)

    # ---- broken data

    def test_missing_en_is_error(self):
        b = self.fresh()
        b["items"]["items"][0]["name"] = {"vi": "Nắm cơm lá"}
        self.assertTrue(any("'vi' and 'en'" in e for e in self.errors(b)))

    def test_plain_string_display_key_is_error(self):
        b = self.fresh()
        b["codex"]["entries"][0]["title"] = "Bến Lau"
        self.assertTrue(any("display string" in e for e in self.errors(b)))

    def test_invalid_and_unverified_labels(self):
        b = self.fresh()
        b["enemies"]["enemies"][0]["label"] = "FANTASY"
        b["items"]["items"][0]["label"] = "CHƯA XÁC MINH"
        errs = self.errors(b)
        self.assertTrue(any("invalid label" in e for e in errs))
        self.assertTrue(any("not allowed in game data" in e for e in errs))

    def test_missing_label_is_error(self):
        b = self.fresh()
        del b["weapons"]["weapons"][0]["label"]
        self.assertTrue(any("missing label" in e for e in self.errors(b)))

    def test_human_enemy_is_error(self):
        b = self.fresh()
        b["enemies"]["enemies"][0]["type"] = "human"
        self.assertTrue(any("'human' is forbidden" in e for e in self.errors(b)))

    def test_forbidden_species_in_chapter1(self):
        b = self.fresh()
        b["enemies"]["enemies"][0]["species_family"] = "giao_long"
        self.assertTrue(any("forbidden in ch_longbien" in e for e in self.errors(b)))

    def test_khoen_on_normal_enemy_is_error(self):
        b = self.fresh()
        boss = next(e for e in b["enemies"]["enemies"] if e["id"] == "boss_lon_loi_dam")
        b["enemies"]["enemies"][0]["khoen"] = copy.deepcopy(boss["khoen"])
        errs = self.errors(b)
        self.assertTrue(any("khoen only allowed on bosses" in e for e in errs))

    def test_khoen_must_be_disableable(self):
        b = self.fresh()
        boss = next(e for e in b["enemies"]["enemies"] if e["id"] == "boss_lon_loi_dam")
        del boss["khoen"]["feature_flag"]
        self.assertTrue(any("feature_flag" in e for e in self.errors(b)))

    def test_khoen_shard_item_is_error(self):
        b = self.fresh()
        b["items"]["items"].append({"id": "mat_manh_khoen", "category": "material", "label": "SÁNG TẠO",
                                    "rarity": "common", "name": {"vi": "Mảnh", "en": "Shard"},
                                    "source": {"kind": "khoen"}})
        self.assertTrue(any("V9" in e for e in self.errors(b)))

    def test_recipe_unknown_item_is_error(self):
        b = self.fresh()
        b["items"]["recipes"][0]["inputs"].append({"item": "mat_khong_co", "count": 1})
        self.assertTrue(any("unknown item 'mat_khong_co'" in e for e in self.errors(b)))

    def test_bao_khi_without_shed_part_is_error(self):
        b = self.fresh()
        rec = b["items"]["recipes"][0]
        rec["inputs"] = [x for x in rec["inputs"] if x["item"] != "mat_nanh_rung"]
        self.assertTrue(any("SB-06" in e for e in self.errors(b)))

    def test_unknown_codex_source_is_error(self):
        b = self.fresh()
        b["codex"]["entries"][0]["sources"] = ["NO_SUCH_SOURCE"]
        self.assertTrue(any("unknown source ids" in e for e in self.errors(b)))

    def test_legend_without_sources_is_error(self):
        b = self.fresh()
        cx = next(e for e in b["codex"]["entries"] if e["label"] == "HUYỀN THOẠI")
        cx["sources"] = []
        self.assertTrue(any("needs at least one source" in e for e in self.errors(b)))

    def test_secret_unreachable_node(self):
        b = self.fresh()
        chain = b["secrets"]["chains"][0]
        chain["clues"].append({"id": "clue_never", "label": "SÁNG TẠO", "kind": "journal", "consumable": False,
                               "name": {"vi": "x", "en": "x"}, "text": {"vi": "x", "en": "x"}})
        kiln = next(n for n in chain["nodes"] if n["id"] == "sn_kiln")
        kiln["requires"]["all"].append("clue_never")
        errs = self.errors(b)
        self.assertTrue(any("unreachable from start" in e for e in errs))

    def test_secret_dead_end_branch_is_softlock(self):
        # A node that, once done, grants nothing, does not softlock; but an end that
        # needs a clue only granted by an unreachable node does.
        b = self.fresh()
        chain = b["secrets"]["chains"][0]
        end = next(n for n in chain["nodes"] if n.get("is_end"))
        end["requires"] = {"all": ["clue_lo_khop", "clue_missing_x"], "any": []}
        chain["clues"].append({"id": "clue_missing_x", "label": "SÁNG TẠO", "kind": "journal", "consumable": False,
                               "name": {"vi": "x", "en": "x"}, "text": {"vi": "x", "en": "x"}})
        errs = self.errors(b)
        self.assertTrue(any("softlock" in e for e in errs))

    def test_consumable_clue_is_error(self):
        b = self.fresh()
        b["secrets"]["chains"][0]["clues"][0]["consumable"] = True
        self.assertTrue(any("consumable=false" in e for e in self.errors(b)))

    def test_point_of_no_return_is_error(self):
        b = self.fresh()
        b["secrets"]["locations"][2]["revisitable"] = False
        self.assertTrue(any("not revisitable" in e for e in self.errors(b)))

    def test_missing_hint_tier_is_error(self):
        b = self.fresh()
        node = b["secrets"]["chains"][0]["nodes"][1]
        node["hints"] = node["hints"][:2]
        self.assertTrue(any("tiers 1, 2, 3" in e for e in self.errors(b)))

    def test_khoen_text_in_later_era_is_error(self):
        b = self.fresh()
        b["lineage"]["thap"]["description"]["vi"] += " Có cả mảnh khoen."
        self.assertTrue(any("SB-02" in e for e in self.errors(b)))

    def test_khoen_in_hung6_dialogue_is_error(self):
        b = self.fresh()
        b["strings"]["dialogue"][0]["era"] = "era_hung_vuong_6"
        b["strings"]["dialogue"][0]["text"]["vi"] = "Mảnh khoen ở đây."
        self.assertTrue(any("khoen-free era" in e for e in self.errors(b)))

    def test_codex_khoen_must_hide_in_hung6(self):
        b = self.fresh()
        cx = next(e for e in b["codex"]["entries"] if e["id"] == "cx_khoen")
        del cx["hidden_in_eras"]
        self.assertTrue(any("hidden_in_eras" in e for e in self.errors(b)))

    def test_entranced_human_must_be_non_combat(self):
        b = self.fresh()
        b["enemies"]["non_combat_encounters"][0]["combat"] = True
        self.assertTrue(any("non-combat encounter" in e for e in self.errors(b)))

    def test_skill_prereq_cycle_is_error(self):
        b = self.fresh()
        nodes = {n["id"]: n for n in b["lineage"]["skill_tree"]["nodes"]}
        nodes["sk_vo_gong_suc"]["prereqs"] = ["sk_vo_danh_the"]
        self.assertTrue(any("cycle" in e for e in self.errors(b)))

    def test_negative_time_is_error(self):
        b = self.fresh()
        b["combat_tuning"]["dodge"]["iframe_duration_s"] = -0.1
        self.assertTrue(any("time must be a number" in e for e in self.errors(b)))

    def test_invalid_json_file_is_reported(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            for name in dv.FILES:
                (p / f"{name}.json").write_text(json.dumps(self.bundle[name], ensure_ascii=False), encoding="utf-8")
            (p / "items.json").write_text("{ not json", encoding="utf-8")
            _, rep = dv.load_bundle(p)
            self.assertTrue(any("items.json: invalid JSON" in e for e in rep.errors))


class SecretGraphUnit(unittest.TestCase):
    def chain(self, nodes):
        return {"id": "c", "nodes": nodes}

    def test_alternate_source_keeps_chain_solvable(self):
        nodes = [
            {"id": "s", "is_start": True, "requires": {"all": [], "any": []}, "grants": []},
            {"id": "a", "requires": {"all": [], "any": []}, "grants": ["k"]},
            {"id": "b", "requires": {"all": [], "any": []}, "grants": ["k"]},
            {"id": "e", "is_end": True, "requires": {"all": ["k"], "any": []}, "grants": []},
        ]
        self.assertEqual(dv.secret_reachability(self.chain(nodes)), ([], []))

    def test_no_start_is_reported(self):
        nodes = [{"id": "e", "is_end": True, "requires": {"all": [], "any": []}, "grants": []}]
        _, soft = dv.secret_reachability(self.chain(nodes))
        self.assertTrue(soft)


if __name__ == "__main__":
    unittest.main()
