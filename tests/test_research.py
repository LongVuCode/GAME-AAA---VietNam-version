import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import research_tool as rt  # noqa: E402

SOURCES = {"sources": [
    {"id": "A", "title": "a", "lineage": "VN_ANNALS"},
    {"id": "B", "title": "b", "lineage": "CN_ANNALS"},
    {"id": "C", "title": "c", "lineage": "VN_ANNALS"},
    {"id": "M", "title": "m", "lineage": "MODERN_SCHOLARSHIP"},
]}


def item(**kw):
    base = {"id": "X1", "label": "SỬ LIỆU", "sources": ["A", "B"], "sensitivity": "low",
            "game_use": "candidate", "verification": "B"}
    base.update(kw)
    return base


class LintRules(unittest.TestCase):
    def run_lint(self, events, myths=()):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            (p / "sources.json").write_text(json.dumps(SOURCES), encoding="utf-8")
            (p / "timeline.json").write_text(json.dumps({"events": list(events)}), encoding="utf-8")
            (p / "myths.json").write_text(json.dumps({"myths": list(myths)}), encoding="utf-8")
            return rt.lint(p)

    def test_valid_item_passes(self):
        self.assertEqual(self.run_lint([item()]).errors, [])

    def test_same_lineage_is_not_independent(self):
        rep = self.run_lint([item(sources=["A", "C"])])
        self.assertTrue(any("independent" in e for e in rep.errors))

    def test_modern_scholarship_does_not_count(self):
        rep = self.run_lint([item(sources=["A", "M"])])
        self.assertTrue(rep.errors)

    def test_draft_level_only_warns(self):
        rep = self.run_lint([item(sources=["A", "C"], verification="C")])
        self.assertEqual(rep.errors, [])
        self.assertEqual(len(rep.warnings), 1)

    def test_unverified_cannot_enter_game(self):
        rep = self.run_lint([item(label="CHƯA XÁC MINH", game_use="candidate")])
        self.assertTrue(any("excluded" in e for e in rep.errors))

    def test_in_game_requires_level_a_review_and_citations(self):
        rep = self.run_lint([item(game_use="in_game")])
        self.assertEqual(len(rep.errors), 3)
        ok = item(game_use="in_game", verification="A", reviewed_by="Dr. X", citations=["TT t.1 tr.10"])
        self.assertEqual(self.run_lint([ok]).errors, [])

    def test_unknown_source_and_duplicate_id(self):
        rep = self.run_lint([item(sources=["A", "Z"]), item()])
        self.assertTrue(any("unknown" in e for e in rep.errors))
        self.assertTrue(any("duplicate" in e for e in rep.errors))

    def test_exclude_sensitivity_must_be_excluded(self):
        rep = self.run_lint([item(sensitivity="exclude")])
        self.assertTrue(rep.errors)


    def test_worshipped_artifact_cannot_be_wielded(self):
        myth = item(label="HUYỀN THOẠI", worshipped=True, player_can_wield=True)
        rep = self.run_lint([], [myth])
        self.assertTrue(any("player_can_wield" in e for e in rep.errors))

    def test_worship_fields_must_be_boolean(self):
        rep = self.run_lint([], [item(label="HUYỀN THOẠI", worshipped="yes", player_can_wield=False)])
        self.assertTrue(any("boolean" in e for e in rep.errors))

    def test_myth_missing_worship_fields_is_error(self):
        rep = self.run_lint([], [item(label="HUYỀN THOẠI")])
        self.assertTrue(any("missing" in e for e in rep.errors))


class RealData(unittest.TestCase):
    def test_project_research_data_has_no_errors(self):
        rep = rt.lint()
        self.assertEqual(rep.errors, [], "\n".join(rep.errors))

    def test_nothing_is_in_game_yet(self):
        # Phase 0: no content has passed human historian review.
        for fname, key in (("timeline.json", "events"), ("myths.json", "myths")):
            for it in rt.load(fname)[key]:
                self.assertNotEqual(it["game_use"], "in_game", it["id"])


if __name__ == "__main__":
    unittest.main()
