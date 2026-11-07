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

    def test_khoen_boss_without_hp_floor_is_error(self):
        for value in (None, 0, -1, "1", True):
            with self.subTest(hp_floor=value):
                b = self.fresh()
                boss = next(e for e in b["enemies"]["enemies"] if e["id"] == "boss_lon_loi_dam")
                if value is None:
                    del boss["hp_floor"]
                else:
                    boss["hp_floor"] = value
                self.assertTrue(any("needs hp_floor > 0" in e for e in self.errors(b)))

    def test_khoen_boss_floor_must_force_final_stagger(self):
        b = self.fresh()
        boss = next(e for e in b["enemies"]["enemies"] if e["id"] == "boss_lon_loi_dam")
        boss["hp_floor_forces_final_stagger"] = False
        self.assertTrue(any("hp_floor_forces_final_stagger=true" in e for e in self.errors(b)))
        del boss["hp_floor_forces_final_stagger"]
        self.assertTrue(any("hp_floor_forces_final_stagger=true" in e for e in self.errors(b)))

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
        b["lineage"]["thap"]["description"]["vi"] += " Có cả khoen."
        self.assertTrue(any("SB-02" in e for e in self.errors(b)))

    def test_khoen_in_hung6_dialogue_is_error(self):
        b = self.fresh()
        b["strings"]["dialogue"][0]["era"] = "era_hung_vuong_6"
        b["strings"]["dialogue"][0]["text"]["vi"] = "Mảnh khoen ở đây."
        self.assertTrue(any("in era era_hung_vuong_6" in e for e in self.errors(b)))

    def test_codex_khoen_cannot_unlock_in_hung6(self):
        b = self.fresh()
        cx = next(e for e in b["codex"]["entries"] if e["id"] == "cx_khoen")
        cx["unlock_era"] = "era_hung_vuong_6"
        self.assertTrue(any("SB11-17" in e for e in self.errors(b)))

    def test_manh_or_chot_in_hung6_is_error(self):
        for word in ("mảnh", "chốt"):
            b = self.fresh()
            line = next(d for d in b["strings"]["dialogue"] if d["id"] == "dlg_06_ve_floor")
            line["text"]["vi"] += f" Còn {word} dưới vực."
            self.assertTrue(any("SB11-01" in e for e in self.errors(b)), word)

    def test_inherited_item_text_checked_on_handoff(self):
        b = self.fresh()
        it = next(i for i in b["items"]["items"] if i["id"] == "bk_nanh_dam")
        it["description"]["en"] += " A shard remains."
        self.assertTrue(any("lineage.handoff" in e for e in self.errors(b)))

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

    # ---- Demo 0.3 (DEMO_0_3_DESIGN)

    def boss(self, b):
        return next(e for e in b["enemies"]["enemies"] if e["id"] == "boss_lon_loi_dam")

    def test_0_3_scheme_binds_jump_dodge_inventory_map(self):
        acts, problems = dv.merged_controls(self.bundle["controls"])
        self.assertEqual(problems, [])
        by = {a["id"]: a for a in acts}
        self.assertEqual(by["jump"]["kbm"]["inputs"], ["Space"])
        self.assertNotIn("Space", by["dodge"]["kbm"]["inputs"])
        self.assertEqual(by["inventory"]["kbm"]["inputs"], ["KeyB"])
        self.assertEqual(by["map"]["kbm"]["inputs"], ["KeyM"])
        self.assertEqual(dv.binding_conflicts(acts), [])

    def test_0_3_scheme_conflict_is_error(self):
        b = self.fresh()
        dodge = next(a for a in b["controls"]["scheme_0_3"]["actions_replace"] if a["id"] == "dodge")
        dodge["kbm"]["inputs"] = ["Space"]  # collides with jump
        self.assertTrue(any("bound to both" in e for e in self.errors(b)))

    def test_0_3_browser_unsafe_key_is_error(self):
        b = self.fresh()
        dodge = next(a for a in b["controls"]["scheme_0_3"]["actions_replace"] if a["id"] == "dodge")
        dodge["kbm"]["inputs"] = ["ControlLeft"]
        self.assertTrue(any("browser-unsafe" in e for e in self.errors(b)))

    def test_0_3_pad_preset_conflict_is_error(self):
        b = self.fresh()
        pr = b["controls"]["scheme_0_3"]["pad_presets_replace"][0]
        del pr["overrides"]["interact"]  # RB now both light attack and interact
        self.assertTrue(any("pad_presets" in e and "bound to both" in e for e in self.errors(b)))

    def test_0_3_rarity_color_near_red_bronze_is_error(self):
        b = self.fresh()
        b["items"]["rarities"][3]["color_hex"] = "#C8552E"
        self.assertTrue(any("red-bronze" in e for e in self.errors(b)))

    def test_0_3_gear_unknown_stat_and_set_piece(self):
        b = self.fresh()
        b["items"]["gear_0_3"]["pieces"][0]["stats"]["luck"] = 3
        b["items"]["gear_0_3"]["sets"][0]["pieces"].append("ar_khong_co")
        errs = self.errors(b)
        self.assertTrue(any("unknown stat 'luck'" in e for e in errs))
        self.assertTrue(any("unknown piece 'ar_khong_co'" in e for e in errs))

    def test_0_3_normal_enemy_drop_chance_range(self):
        b = self.fresh()
        b["enemies"]["enemies"][0]["drops"][0]["chance"] = 1.5
        self.assertTrue(any("drop chance" in e for e in self.errors(b)))

    def test_0_3_boss_second_delayed_attack_in_phase_is_error(self):
        b = self.fresh()
        self.boss(b)["phases"][0]["moveset_add_0_3"].append("ll_dam_cham")
        self.assertTrue(any("delayed attacks in the 0.3 moveset" in e for e in self.errors(b)))

    def test_0_3_combo_windup_fairness_floor(self):
        b = self.fresh()
        cb = next(c for c in self.boss(b)["combos_0_3"] if c["id"] == "cb_hat_lui_can")
        cb["steps"][1]["windup_mult"] = 0.5  # unparryable charge with 0.6 s telegraph
        self.assertTrue(any("fairness floor" in e for e in self.errors(b)))

    def test_0_3_feint_must_sound_different(self):
        b = self.fresh()
        atk = {a["id"]: a for a in self.boss(b)["attacks"]}
        atk["ll_cao_mong_gia"]["telegraph"]["audio"] = atk["ll_can_lay"]["telegraph"]["audio"]
        self.assertTrue(any("must sound different" in e for e in self.errors(b)))

    def test_0_3_combo_outside_phase_moveset_is_error(self):
        b = self.fresh()
        self.boss(b)["phases"][1]["combos_add_0_3"].append("cb_hat_lui_can")  # Càn lầy is phase 1 only
        self.assertTrue(any("outside this phase's moveset" in e for e in self.errors(b)))

    def test_0_3_boss_difficulty_covers_all_presets(self):
        b = self.fresh()
        del self.boss(b)["difficulty_0_3"]["diff_thac_du"]
        self.assertTrue(any("difficulty_0_3" in e for e in self.errors(b)))

    def test_0_3_skill_levels_and_slots(self):
        b = self.fresh()
        b["skills"]["skills"][0]["levels"].pop()
        b["skills"]["skills"][1]["slot"] = 1
        errs = self.errors(b)
        self.assertTrue(any("levels must be 1..3" in e for e in errs))
        self.assertTrue(any("one skill per slot" in e for e in errs))

    def test_0_3_axe_skill_text_obeys_hung6_rule(self):
        b = self.fresh()
        sk = next(s for s in b["skills"]["skills"] if s["id"] == "sk_riu_moc_thuyen")
        sk["description"]["vi"] += " Còn mảnh đồng."
        self.assertTrue(any("era_hung_vuong_6" in e for e in self.errors(b)))

    def test_0_3_map_landmark_must_match_world_js(self):
        b = self.fresh()
        lm = next(l for l in b["map"]["landmarks"] if l["id"] == "lm_fire_cong_lau")
        lm["x"] += 3
        self.assertTrue(any("differs from world.js" in e for e in self.errors(b)))

    def test_0_3_map_point_outside_zone_is_error(self):
        b = self.fresh()
        b["map"]["chests"][0]["x"] = 100
        self.assertTrue(any("outside zone" in e for e in self.errors(b)))

    def test_0_3_boss_stake_outside_arena_is_error(self):
        b = self.fresh()
        self.boss(b)["phases"][1]["phase2_0_3"]["arena_change_0_3"]["stakes_emerge"][0]["x"] = 40
        self.assertTrue(any("outside the arena" in e for e in self.errors(b)))

    def test_0_3_world_points_parse(self):
        pts = dv.parse_world_points()
        self.assertIsNotNone(pts)
        self.assertEqual(pts["fire_cong_lau"], (2.0, -106.0))
        self.assertEqual(pts["furnace"], (292.0, -8.0))

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


class StoryIntegration04(unittest.TestCase):
    """Demo 0.4 story pass: dialogue.json, quests.json, cinematics.json."""

    @classmethod
    def setUpClass(cls):
        cls.bundle, load_rep = dv.load_bundle()
        assert not load_rep.errors, load_rep.errors
        cls.research = dv.load_research()

    def fresh(self):
        return copy.deepcopy(self.bundle)

    def errors(self, bundle):
        return dv.validate(bundle, self.research).errors

    def conv(self, b, cid):
        return next(c for c in b["dialogue"]["conversations"] if c["id"] == cid)

    def test_real_story_data_is_clean(self):
        self.assertEqual([e for e in self.errors(self.bundle) if "story" in e or e.startswith(("dialogue", "quests", "cinematics"))], [])

    def test_main_quest_has_four_to_six_steps_with_reasons(self):
        main = [q for q in self.bundle["quests"]["quests"] if q["kind"] == "main"]
        self.assertEqual(len(main), 1)
        self.assertTrue(4 <= len(main[0]["steps"]) <= 6)
        for st in main[0]["steps"]:
            self.assertTrue(st["why"]["vi"] and st["why"]["en"])

    def test_three_side_quests_tied_to_npcs(self):
        sides = [q for q in self.bundle["quests"]["quests"] if q["kind"] == "side"]
        self.assertGreaterEqual(len(sides), 3)
        npcs = {s["id"] for s in self.bundle["dialogue"]["speakers"]}
        self.assertTrue(all(q["giver"] in npcs for q in sides))

    def test_cold_open_fits_ninety_seconds(self):
        cold = next(c for c in self.bundle["cinematics"]["cinematics"] if c["role"] == "cold_open")
        self.assertLessEqual(sum(s["duration_s"] for s in cold["shots"]), 90)

    def test_long_cold_open_is_error(self):
        b = self.fresh()
        cold = next(c for c in b["cinematics"]["cinematics"] if c["role"] == "cold_open")
        cold["shots"][0]["duration_s"] += 30
        errs = self.errors(b)
        self.assertTrue(any("cold open is" in e for e in errs))
        self.assertTrue(any("shots sum to" in e for e in errs))

    def test_choice_cannot_change_legend_flags(self):
        b = self.fresh()
        self.conv(b, "cv_nghe_rescue")["choices"][0]["effects"] = [{"kind": "set_flag", "flag": "flag_boss_lon_loi_freed"}]
        self.assertTrue(any("flag_choice_" in e for e in self.errors(b)))

    def test_choice_cannot_skip_steps(self):
        b = self.fresh()
        self.conv(b, "cv_dot_dam_nong")["choices"][0]["effects"].append({"kind": "complete_step", "ref": "qs_m5_cay"})
        self.assertTrue(any("not allowed" in e for e in self.errors(b)))

    def test_worshipped_figure_cannot_speak(self):
        b = self.fresh()
        b["dialogue"]["speakers"].append({"id": "npc_x", "name": {"vi": "Lạc Long Quân", "en": "Lac Long Quan"},
                                          "label": "SÁNG TẠO", "era": "era_lac_long_quan"})
        self.assertTrue(any("worshipped figures" in e for e in self.errors(b)))

    def test_hung_6_line_with_khoen_is_error(self):
        b = self.fresh()
        cv = self.conv(b, "cv_handoff_buong")
        cv["lines"][1]["text"] = {"vi": "Khoen này của bà tổ.", "en": "This khoen was our ancestor's."}
        self.assertTrue(any("SB11-01" in e for e in self.errors(b)))

    def test_hung_6_shot_cannot_reuse_khoen_ve(self):
        b = self.fresh()
        ho = next(c for c in b["cinematics"]["cinematics"] if c["id"] == "cin_handoff")
        ho["shots"][-1]["line_refs"] = ["dlg_04_ve_after_pry"]
        self.assertTrue(any("outside its eras" in e for e in self.errors(b)))

    def test_objective_must_match_string_table(self):
        b = self.fresh()
        b["strings"]["ui"]["obj_0_4_m1"] = {"vi": "Khác", "en": "Other"}
        self.assertTrue(any("differs from strings.ui" in e for e in self.errors(b)))

    def test_unknown_refs_are_errors(self):
        b = self.fresh()
        main = next(q for q in b["quests"]["quests"] if q["kind"] == "main")
        main["steps"][0]["complete_when"]["all"][0]["ref"] = "no_such_point"
        self.conv(b, "cv_cold_open")["lines"].append({"id": "ln_tmp", "line_ref": "dlg_missing"})
        errs = self.errors(b)
        self.assertTrue(any("no_such_point" in e for e in errs))
        self.assertTrue(any("dlg_missing" in e for e in errs))

    def test_new_point_outside_zone_is_error(self):
        b = self.fresh()
        b["quests"]["new_points"][0]["x"] = 999
        self.assertTrue(any("outside zone" in e for e in self.errors(b)))

    def test_every_cinematic_skippable(self):
        b = self.fresh()
        b["cinematics"]["cinematics"][0]["skippable"] = False
        self.assertTrue(any("skippable" in e for e in self.errors(b)))

    # ---- review fixes (REVIEW_STORY_INTEGRATION_0_4)

    def creature(self, b, cid):
        return next(c for c in b["creatures_0_4"]["creatures"] if c["id"] == cid)

    def test_si03_crab_replaced_but_legacy_id_kept(self):
        c = self.creature(self.bundle, "cvd_de_cong_da")
        self.assertEqual(c["enemy_ref"], "en_cua_cang_bun")
        self.assertTrue(c["legacy_id"])
        self.assertNotIn("cua", c["name"]["vi"].lower())
        self.assertEqual(c["anatomy"]["forelimbs"]["count"], 2)
        self.assertEqual(c["anatomy"]["limbs_total"], 10)

    def test_si03_crab_name_or_spit_attack_is_error(self):
        b = self.fresh()
        self.creature(b, "cvd_de_cong_da")["name"]["vi"] = "Cua Đá"
        self.creature(b, "cvd_de_cong_da")["attack_display"]["cua_kep"]["vi"] = "Phun bùn"
        errs = self.errors(b)
        self.assertTrue(any("uses ['cua']" in e for e in errs))
        self.assertTrue(any("spitting" in e for e in errs))

    def test_si03_hub_practice_has_no_marsh_spirit(self):
        step = next(s for s in self.bundle["lineage"]["handoff"]["steps"] if s["id"] == "ho_07_trial")
        variants = {x.get("variant") for x in step["enemies"]}
        for v in variants:
            self.assertNotEqual(self.creature(self.bundle, v)["lore_kind"], "yeu_dam")
        b = self.fresh()
        self.creature(b, "cvd_de_cong_da_non")["lore_kind"] = "yeu_dam"
        self.assertTrue(any("SB11-13" in e for e in self.errors(b)))

    def test_creature_rig_must_match_enemies(self):
        b = self.fresh()
        self.creature(b, "cvd_u_bun")["rig"] = "quadruped_shared"
        self.assertTrue(any("differs from enemies skeleton_family" in e for e in self.errors(b)))

    def test_si10_trap_blade_words_blocked_in_hung_6(self):
        b = self.fresh()
        cv = self.conv(b, "cv_handoff_buong")
        cv["lines"][5]["text"] = {"vi": "Lưỡi bẫy đồng cũ mắc ở cổ nó.", "en": "It had something in its neck."}
        self.assertTrue(any("lưỡi bẫy" in e for e in self.errors(b)))

    def test_si01_strip_not_tied_on_wrist(self):
        shots = [s for c in self.bundle["cinematics"]["cinematics"] for s in c["shots"]]
        self.assertFalse(any("buộc vào cổ tay" in s.get("direction", "") for s in shots))
        calls = [o["text"]["vi"] for bk in self.bundle["dialogue"]["barks"] for o in bk["lines"]]
        self.assertFalse(any("về ăn cơm" in t for t in calls))

    def test_si05_marsh_spirit_codex_does_not_cite_lncq(self):
        e = next(x for x in self.bundle["codex"]["entries"] if x["id"] == "cx_yeu_dam")
        self.assertEqual(e["research_refs"], [])
        self.assertNotIn("Lĩnh Nam", e["text"]["vi"])
        self.assertNotIn("phe", e["text"]["vi"])



class Combat04(unittest.TestCase):
    """Demo 0.4 combat moves, enemy/boss move sets and world_0_4 (design/COMBAT_0_4.md)."""

    @classmethod
    def setUpClass(cls):
        cls.bundle, load_rep = dv.load_bundle()
        assert not load_rep.errors, load_rep.errors
        cls.research = dv.load_research()

    def fresh(self):
        return copy.deepcopy(self.bundle)

    def errors(self, bundle):
        return dv.validate(bundle, self.research).errors

    def weapon(self, b, wid):
        return next(w for w in b["weapons"]["weapons"] if w["id"] == wid)

    def enemy(self, b, eid):
        return next(e for e in b["enemies"]["enemies"] + b["enemies"]["enemies_0_4"] if e["id"] == eid)

    def test_world_present_and_grows_3_to_5x(self):
        self.assertIn("world_0_4", self.bundle)
        m = dv.world_metrics_0_4(self.bundle["world_0_4"])
        self.assertTrue(3.0 <= m["area_m2"] / m["legacy_area_m2"] <= 5.0)
        self.assertEqual(len(m["reachable"]), len(m["walk"]))  # one connected walkable world

    def test_each_weapon_has_three_chains_conditionals_and_new_art(self):
        for wid in ("wp_giao_dong", "wp_riu_xeo"):
            w = self.weapon(self.bundle, wid)
            kinds = [c["kind"] for c in w["chains_0_4"]]
            self.assertGreaterEqual(sum(k in ("light", "light_pause", "heavy", "mixed") for k in kinds), 3)
            self.assertTrue(any(m["input"].startswith("perfect_dodge") for m in w["moves_0_4"]))
            self.assertEqual(len(w["skills_0_4"]), 1)

    def test_bad_input_token_and_chain_step(self):
        b = self.fresh()
        w = self.weapon(b, "wp_giao_dong")
        w["moves_0_4"][0]["input"] = "L,X"
        w["chains_0_4"][0]["steps"].append("sp_nope")
        errs = self.errors(b)
        self.assertTrue(any("input tokens" in e for e in errs))
        self.assertTrue(any("sp_nope" in e for e in errs))

    def test_move_unlock_must_list_move(self):
        b = self.fresh()
        self.weapon(b, "wp_riu_xeo")["moves_0_4"][0]["unlock"] = "mu_ax_quai"
        self.assertTrue(any("does not list this move" in e for e in self.errors(b)))

    def test_new_enemy_species_and_type_rules(self):
        b = self.fresh()
        b["enemies"]["enemies_0_4"][0]["species_family"] = "snake"
        b["enemies"]["enemies_0_4"][1]["type"] = "human"
        errs = self.errors(b)
        self.assertTrue(any("species 'snake' forbidden" in e for e in errs))
        self.assertTrue(any("type 'human' not allowed" in e for e in errs))

    def test_unparryable_new_attack_needs_color_cue(self):
        b = self.fresh()
        a = next(x for x in self.enemy(b, "en_cua_cang_bun")["attacks_0_4"] if x["id"] == "dc4_om_ghi")
        a["telegraph"]["color_cue"] = "none"
        self.assertTrue(any("dc4_om_ghi: unparryable damaging attack needs a color_cue" in e for e in self.errors(b)))

    def test_normal_enemy_moveset_rules(self):
        b = self.fresh()
        bn = self.enemy(b, "en_bo_ngua_lau")
        next(x for x in bn["attacks_0_4"] if x["id"] == "bn4_luot_canh")["delayed"] = True
        self.enemy(b, "en_u_bun")["weak_points_0_4"] = []
        errs = self.errors(b)
        self.assertTrue(any("en_bo_ngua_lau.moveset_0_4: more than" in e for e in errs))
        self.assertTrue(any("en_u_bun: needs weak_points_0_4" in e for e in errs))

    def test_boss_phase_rules(self):
        b = self.fresh()
        boss = self.enemy(b, "boss_lon_loi_dam")
        ph1 = boss["phases_0_4"][0]
        ph1["moveset"] = [m for m in ph1["moveset"] if m not in ("ll_hat_nanh", "ll_quat_doi", "ll_dam_lay", "ll_quay_hong", "ll_cao_mong_gia")]
        errs = self.errors(b)
        self.assertTrue(any("unparryable moves" in e for e in errs))
        self.assertTrue(any("needs >= 8 moves" in e for e in errs))
        self.assertTrue(any("outside this phase" in e for e in errs))

    def test_boss_combo_floor_and_punish_window(self):
        b = self.fresh()
        boss = self.enemy(b, "boss_lon_loi_dam")
        next(c for c in boss["combos_0_4"] if c["id"] == "cb4_hat_ui")["steps"][2]["windup_mult"] = 0.5
        next(a for a in boss["attacks_0_4"] if a["id"] == "ll4_cay_nanh")["punish_window_s"] = 0.2
        errs = self.errors(b)
        self.assertTrue(any("cb4_hat_ui step 2 windup" in e for e in errs))
        self.assertTrue(any("ll4_cay_nanh: unparryable attack needs punish_window_s" in e for e in errs))

    def test_world_point_outside_region_and_legacy_moved(self):
        b = self.fresh()
        pts = {p["id"]: p for p in b["world_0_4"]["points"]}
        pts["chest_go_sim"]["x"] = -100
        pts["fire_ben_say"]["x"] = 7
        errs = self.errors(b)
        self.assertTrue(any("chest_go_sim: (-100" in e and "outside region" in e for e in errs))
        self.assertTrue(any("fire_ben_say: moved from world.js" in e for e in errs))

    def test_unreachable_point_is_error(self):
        b = self.fresh()
        b["world_0_4"]["blockers"].append({"id": "rw_test", "kind": "reed_wall", "half_width_m": 1.5,
                                           "points": [[-104, -120], [-88, -120], [-88, -134], [-104, -134], [-104, -120]]})
        b["world_0_4"]["points"].append({"id": "test_box", "kind": "chest", "x": -96, "z": -127, "region": "z_lau_sau"})
        self.assertTrue(any("test_box: not reachable" in e for e in self.errors(b)))

    def test_pacing_and_area_targets(self):
        b = self.fresh()
        b["world_0_4"]["pacing"]["max_gap_s"] = 2
        b["world_0_4"]["targets"]["area_ratio_max"] = 2.0
        errs = self.errors(b)
        self.assertTrue(any("without a point of interest" in e for e in errs))
        self.assertTrue(any("x legacy, outside" in e for e in errs))

    def test_map_0_4_must_match_world(self):
        b = self.fresh()
        b["map"]["map_0_4"]["chests"][0]["x"] += 3
        b["map"]["map_0_4"]["discovery_points"][0]["xp_ref"] = "xp_nope"
        errs = self.errors(b)
        self.assertTrue(any("differs from world_0_4" in e for e in errs))
        self.assertTrue(any("xp_nope" in e for e in errs))

    def test_axe_moves_obey_hung6_rule(self):
        b = self.fresh()
        self.weapon(b, "wp_riu_xeo")["moves_0_4"][0]["name"] = {"vi": "Bổ mảnh khoen", "en": "Shard chop"}
        self.assertTrue(any("era_hung_vuong_6" in e for e in self.errors(b)))

if __name__ == "__main__":
    unittest.main()
