#!/usr/bin/env python3
"""Validator for design data (design/data/*.json), Demo 0.1.

Usage:
    python3 tools/design_validate.py [--data DIR] [--research DIR]

Checks: valid JSON; every display string has both `vi` and `en`; every content
entry has a valid label; cross references; secret chains cannot softlock;
no human enemies; khoen only on allowed bosses (V9 rules); Story Bible v1.1
content rules that can be checked mechanically. Pure Python 3, no dependencies.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "design" / "data"
RESEARCH_DIR = ROOT / "research" / "data"

FILES = ("combat_tuning", "weapons", "enemies", "items", "lineage", "secrets", "codex", "strings")

ALL_LABELS = {"SỬ LIỆU", "SỬ LIỆU-TRANH LUẬN", "HUYỀN THOẠI", "CỔ TÍCH", "SÁNG TẠO", "CHƯA XÁC MINH"}
# CHƯA XÁC MINH can never reach the game (CLAUDE.md §3).
GAME_LABELS = ALL_LABELS - {"CHƯA XÁC MINH"}
HISTORICAL = {"SỬ LIỆU", "SỬ LIỆU-TRANH LUẬN"}
NEEDS_SOURCES = HISTORICAL | {"HUYỀN THOẠI", "CỔ TÍCH"}
NON_EVIDENTIAL = {"MODERN_SCHOLARSHIP", "LITERARY", "FOLK_ORAL"}

# Keys whose value must be a localized {"vi","en"} object.
DISPLAY_KEYS = {"name", "description", "text", "title", "narrative", "effect_text", "text_extra"}

# Enemy policy (D-017, D-018, Story Bible v1.1 §2). Policy lives here, not in data,
# so data cannot authorize itself.
ALLOWED_ENEMY_TYPES = {"beast", "insect", "spirit", "illusion"}
FORBIDDEN_SPECIES_BY_CHAPTER = {
    "ch_longbien": {"human", "fox", "giao_long", "thuong_luong", "snake", "turtle", "crocodile", "reptile", "lizard"},
}
FORBIDDEN_SPECIES_ALL = {"human"}
KHOEN_ALLOWED_BOSSES = {"boss_lon_loi_dam", "boss_ca_o_gai", "boss_ret_lon", "boss_gau_lon", "boss_lon_loi_nui"}
KHOEN_FORBIDDEN_CHAPTERS = {"ch_phudong"}
BAO_KHI_SOURCE_KINDS = {"shed_after_pry", "remains_after_dissolve"}
HIT_WEIGHTS = {"light", "medium", "heavy"}
MAX_SECRET_STATES = 50000


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def err(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)


# ---------------------------------------------------------------- loading

def load_bundle(data_dir: Path = DATA_DIR) -> tuple[dict[str, Any], Report]:
    rep = Report()
    bundle: dict[str, Any] = {}
    for name in FILES:
        path = data_dir / f"{name}.json"
        try:
            with open(path, encoding="utf-8") as f:
                bundle[name] = json.load(f)
        except FileNotFoundError:
            rep.err(f"{name}.json: file missing")
        except json.JSONDecodeError as e:
            rep.err(f"{name}.json: invalid JSON ({e})")
    return bundle, rep


def load_research(research_dir: Path = RESEARCH_DIR) -> dict[str, Any]:
    def ld(n: str) -> dict:
        with open(research_dir / n, encoding="utf-8") as f:
            return json.load(f)
    return {
        "sources": {s["id"]: s for s in ld("sources.json")["sources"]},
        "myths": {m["id"] for m in ld("myths.json")["myths"]},
        "timeline": {e["id"] for e in ld("timeline.json")["events"]},
    }


# ---------------------------------------------------------------- helpers

def is_loc(v: Any) -> bool:
    return (isinstance(v, dict) and set(v.keys()) == {"vi", "en"}
            and all(isinstance(v[k], str) and v[k].strip() for k in ("vi", "en")))


def check_display(obj: Any, path: str, rep: Report) -> None:
    """Every {"vi"/"en"} object must have both, non-empty; DISPLAY_KEYS must be localized."""
    if isinstance(obj, dict):
        if "vi" in obj or "en" in obj:
            if not is_loc(obj):
                rep.err(f"{path}: display string needs non-empty 'vi' and 'en' (and nothing else)")
            return
        for k, v in obj.items():
            if k.startswith("_"):
                continue
            if k in DISPLAY_KEYS and not is_loc(v) and not (isinstance(v, dict) and ("vi" in v or "en" in v)):
                rep.err(f"{path}.{k}: must be a {{'vi','en'}} display string")
                continue
            check_display(v, f"{path}.{k}", rep)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            check_display(v, f"{path}[{i}]", rep)


def check_labels_anywhere(obj: Any, path: str, rep: Report) -> None:
    if isinstance(obj, dict):
        if "label" in obj:
            lab = obj["label"]
            if lab not in ALL_LABELS:
                rep.err(f"{path}: invalid label {lab!r}")
            elif lab not in GAME_LABELS:
                rep.err(f"{path}: label {lab!r} is not allowed in game data")
        for k, v in obj.items():
            check_labels_anywhere(v, f"{path}.{k}", rep)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            check_labels_anywhere(v, f"{path}[{i}]", rep)


def require_label(entries: Iterable[Any], path: str, rep: Report) -> None:
    for i, e in enumerate(entries):
        if not isinstance(e, dict):
            rep.err(f"{path}[{i}]: entry must be an object")
            continue
        if "label" not in e:
            rep.err(f"{path}[{i}] ({e.get('id', '?')}): missing label")


def check_sources(owner: str, label: str, srcs: list, research: dict, rep: Report) -> None:
    sources = research["sources"]
    unknown = [s for s in srcs if s not in sources]
    if unknown:
        rep.err(f"{owner}: unknown source ids {unknown}")
    if label in NEEDS_SOURCES and not srcs:
        rep.err(f"{owner}: label {label} needs at least one source")
    if label in HISTORICAL:
        lineages = {sources[s]["lineage"] for s in srcs if s in sources} - NON_EVIDENTIAL
        if len(lineages) < 2:
            msg = f"{owner}: {label} has {sorted(lineages)}; needs >=2 independent evidential lineages"
            (rep.err if label == "SỬ LIỆU" else rep.warn)(msg)


def check_times(obj: Any, path: str, rep: Report) -> None:
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.endswith("_s") and isinstance(v, dict) and {"min", "max"} <= set(v):
                if not all(isinstance(v[x], (int, float)) and v[x] >= 0 for x in ("min", "max")) or v["min"] > v["max"]:
                    rep.err(f"{path}.{k}: range must be 0 <= min <= max (seconds)")
            elif k.endswith("_s"):
                if not isinstance(v, (int, float)) or isinstance(v, bool) or v < 0:
                    rep.err(f"{path}.{k}: time must be a number >= 0 (seconds)")
            elif k.endswith("_deg"):
                if not isinstance(v, (int, float)) or isinstance(v, bool) or not 0 <= v <= 360:
                    rep.err(f"{path}.{k}: angle must be 0..360 degrees")
            check_times(v, f"{path}.{k}", rep)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            check_times(v, f"{path}[{i}]", rep)


def ids(entries: Iterable[dict]) -> set[str]:
    return {e.get("id") for e in entries if isinstance(e, dict)}


# ---------------------------------------------------------------- secrets

def secret_reachability(chain: dict) -> tuple[list[str], list[str]]:
    """Return (unreachable_node_ids, softlock_descriptions).

    State = set of completed nodes; clues are never consumed, so a node is
    completable when its requirements are met by clues granted so far.
    Enumerates every reachable state and checks an end node stays reachable.
    """
    nodes = {n["id"]: n for n in chain.get("nodes", [])}
    starts = [n for n in nodes.values() if n.get("is_start")]
    ends = {n["id"] for n in nodes.values() if n.get("is_end")}
    if not starts:
        return list(nodes), ["no start node"]

    def clues_of(state: frozenset) -> set[str]:
        out: set[str] = set()
        for nid in state:
            out.update(nodes[nid].get("grants", []))
        return out

    def can_do(nid: str, clues: set[str]) -> bool:
        req = nodes[nid].get("requires", {}) or {}
        all_ok = all(c in clues for c in req.get("all", []))
        anyl = req.get("any", [])
        any_ok = (not anyl) or any(c in clues for c in anyl)
        return all_ok and any_ok

    init = frozenset(n["id"] for n in starts)
    seen = {init}
    edges: dict[frozenset, list[frozenset]] = {}
    q = deque([init])
    while q:
        st = q.popleft()
        clues = clues_of(st)
        nxt = []
        for nid in nodes:
            if nid not in st and can_do(nid, clues):
                ns = st | {nid}
                nxt.append(ns)
                if ns not in seen:
                    if len(seen) >= MAX_SECRET_STATES:
                        return [], [f"state space exceeds {MAX_SECRET_STATES}; simplify chain"]
                    seen.add(ns)
                    q.append(ns)
        edges[st] = nxt

    reached_nodes = set().union(*seen)
    unreachable = sorted(set(nodes) - reached_nodes)

    # States from which an end node is reachable (reverse fixed point).
    good = {st for st in seen if st & ends}
    changed = True
    while changed:
        changed = False
        for st in seen:
            if st not in good and any(ns in good for ns in edges.get(st, [])):
                good.add(st)
                changed = True
    softlocks = [f"from state {sorted(st)} no end node is reachable" for st in seen if st not in good]
    return unreachable, softlocks[:5]


def check_secrets(b: dict, rep: Report, item_ids: set, codex_ids: set) -> set[str]:
    sec = b["secrets"]
    locs = {l["id"]: l for l in sec.get("locations", [])}
    chain_ids: set[str] = set()
    for chain in sec.get("chains", []):
        cid = chain.get("id", "?")
        chain_ids.add(cid)
        clues = {c["id"]: c for c in chain.get("clues", [])}
        for c in clues.values():
            if c.get("consumable", True) is not False:
                rep.err(f"{cid}.{c['id']}: clue must have consumable=false (clues are never consumed)")
        nodes = chain.get("nodes", [])
        if sum(1 for n in nodes if n.get("is_start")) != 1:
            rep.err(f"{cid}: needs exactly one start node")
        if not any(n.get("is_end") for n in nodes):
            rep.err(f"{cid}: needs at least one end node")
        seen_ids: set[str] = set()
        for n in nodes:
            nid = n.get("id", "?")
            if nid in seen_ids:
                rep.err(f"{cid}.{nid}: duplicate node id")
            seen_ids.add(nid)
            loc = n.get("location")
            if loc not in locs:
                rep.err(f"{cid}.{nid}: unknown location {loc!r}")
            elif not locs[loc].get("revisitable"):
                rep.err(f"{cid}.{nid}: location {loc} is not revisitable (point of no return)")
            req = n.get("requires", {}) or {}
            for c in list(req.get("all", [])) + list(req.get("any", [])):
                if c not in clues:
                    rep.err(f"{cid}.{nid}: requires unknown clue {c!r}")
            for c in n.get("grants", []):
                if c not in clues:
                    rep.err(f"{cid}.{nid}: grants unknown clue {c!r}")
            if n.get("consumes"):
                rep.err(f"{cid}.{nid}: nodes may not consume clues ({n['consumes']})")
            if not n.get("is_start"):
                tiers = sorted(h.get("tier") for h in n.get("hints", []))
                if tiers != [1, 2, 3]:
                    rep.err(f"{cid}.{nid}: needs hints for tiers 1, 2, 3 (has {tiers})")
            rw = n.get("reward", {}) or {}
            for r in rw.get("items", []):
                if r.get("item") not in item_ids:
                    rep.err(f"{cid}.{nid}: reward item {r.get('item')!r} not in items.json")
            for cx in rw.get("codex_unlock_extra", []):
                if cx not in codex_ids:
                    rep.err(f"{cid}.{nid}: codex entry {cx!r} not in codex.json")
        unreachable, softlocks = secret_reachability(chain)
        for u in unreachable:
            rep.err(f"{cid}: node {u} unreachable from start")
        for s in softlocks:
            rep.err(f"{cid}: softlock: {s}")
    return chain_ids


def loc_texts(obj: Any) -> Iterable[tuple[str, str]]:
    if isinstance(obj, dict):
        if is_loc(obj):
            yield obj["vi"], obj["en"]
            return
        for k, v in obj.items():
            if not k.startswith("_"):
                yield from loc_texts(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from loc_texts(v)


# Words that betray a forbidden content tag (Story Bible v1.2 §2, SB11-01, SB11-16).
TAG_WORDS = {
    "khoen": (["khoen"], ["khoen", "collar", "binding ring"]),
    "mảnh": (["mảnh"], ["shard", "shards"]),
    "chốt": (["chốt"], ["pin", "linchpin"]),
    "bear": (["gấu"], ["bear", "bears"]),
    "melting": (["nấu chảy", "nấu mảnh"], ["melt", "melted", "melting"]),
}


def forbidden_hits(obj: Any, tags: Iterable[str]) -> list[str]:
    hits: list[str] = []
    for vi, en in loc_texts(obj):
        for tag in tags:
            vi_words, en_words = TAG_WORDS.get(tag, ([tag], []))
            for w in vi_words:
                if re.search(rf"(?<!\w){re.escape(w)}(?!\w)", vi.lower()):
                    hits.append(w)
            for w in en_words:
                if re.search(rf"(?<!\w){re.escape(w)}(?!\w)", en.lower()):
                    hits.append(w)
    return sorted(set(hits))


def check_khoen_free_eras(b: dict, rep: Report) -> None:
    """SB-02 / SB11-01: content belonging to an era must not use that era's forbidden words."""
    eras = b["lineage"].get("eras", [])
    era_tags = {e["id"]: e.get("forbidden_content_tags", []) for e in eras}
    chapter_era = {c: e["id"] for e in eras for c in e.get("chapters", [])}
    restricted = {eid for eid, tags in era_tags.items() if tags}
    if not restricted:
        return

    def eras_of(o: dict) -> set[str]:
        out = set()
        if o.get("era") in restricted:
            out.add(o["era"])
        if o.get("chapter") in chapter_era:
            out.add(chapter_era[o["chapter"]])
        chs = o.get("chapters") if isinstance(o.get("chapters"), list) else []
        out.update(chapter_era[c] for c in chs if c in chapter_era)
        return out & restricted

    def walk(o: Any, path: str) -> None:
        if isinstance(o, dict):
            for era in eras_of(o):
                hits = forbidden_hits(o, era_tags[era])
                if hits:
                    rep.err(f"{path} ({o.get('id', '?')}): uses {hits} in era {era} (SB-02, SB11-01)")
                    return
            for k, v in o.items():
                if not k.startswith("_"):
                    walk(v, f"{path}.{k}")
        elif isinstance(o, list):
            for i, v in enumerate(o):
                walk(v, f"{path}[{i}]")

    for name in FILES:
        walk(b[name], name)
    # Codex is out-of-story UI (SB11-17): an entry may be read later, but an entry
    # mentioning forbidden words must unlock in an era where they are allowed.
    for e in b["codex"].get("entries", []):
        ue = e.get("unlock_era")
        if ue not in era_tags:
            rep.err(f"codex.{e.get('id')}: unlock_era {ue!r} unknown")
        elif era_tags[ue] and forbidden_hits(e, era_tags[ue]):
            rep.err(f"codex.{e.get('id')}: unlocks in {ue} but uses {forbidden_hits(e, era_tags[ue])} (SB11-17)")


# ---------------------------------------------------------------- main checks

def validate(b: dict, research: dict) -> Report:
    rep = Report()
    for name in FILES:
        if name not in b:
            rep.err(f"{name}.json: missing from bundle")
    if rep.errors:
        return rep

    # Generic: display strings, labels anywhere, time/angle units.
    for name in FILES:
        check_display(b[name], name, rep)
        check_labels_anywhere(b[name], name, rep)
        check_times(b[name], name, rep)

    tuning, weapons, enemies, items = b["combat_tuning"], b["weapons"], b["enemies"], b["items"]
    lineage, codex, strings = b["lineage"], b["codex"], b["strings"]

    # Required labels on content entries.
    require_label(weapons.get("weapons", []), "weapons.weapons", rep)
    require_label([w["drum_burst"] for w in weapons.get("weapons", []) if "drum_burst" in w], "weapons.drum_burst", rep)
    require_label([w["basis"] for w in weapons.get("weapons", []) if "basis" in w], "weapons.basis", rep)
    require_label(enemies.get("enemies", []), "enemies.enemies", rep)
    require_label(enemies.get("non_combat_encounters", []), "enemies.non_combat_encounters", rep)
    require_label(items.get("items", []), "items.items", rep)
    require_label(items.get("stations", []), "items.stations", rep)
    require_label(codex.get("entries", []), "codex.entries", rep)
    for key in ("eras", "characters", "tools", "house_moves"):
        require_label(lineage.get(key, []), f"lineage.{key}", rep)
    require_label([lineage["thap"]] if "thap" in lineage else [], "lineage.thap", rep)
    st = lineage.get("skill_tree", {})
    require_label(st.get("branches", []), "lineage.skill_tree.branches", rep)
    require_label(st.get("nodes", []), "lineage.skill_tree.nodes", rep)
    for ch in b["secrets"].get("chains", []):
        require_label([ch], "secrets.chains", rep)
        require_label(ch.get("clues", []), f"secrets.{ch.get('id')}.clues", rep)
    require_label(strings.get("dialogue", []), "strings.dialogue", rep)

    # Global id uniqueness across content.
    all_entries: list[dict] = []
    all_entries += weapons.get("weapons", []) + enemies.get("enemies", []) + enemies.get("non_combat_encounters", [])
    all_entries += items.get("items", []) + items.get("recipes", []) + items.get("stations", []) + codex.get("entries", [])
    all_entries += lineage.get("characters", []) + lineage.get("tools", []) + lineage.get("house_moves", []) + lineage.get("eras", [])
    all_entries += st.get("nodes", []) + st.get("branches", []) + strings.get("dialogue", [])
    counts: dict[str, int] = {}
    for e in all_entries:
        counts[e.get("id")] = counts.get(e.get("id"), 0) + 1
    for k, v in counts.items():
        if v > 1:
            rep.err(f"duplicate id {k!r} ({v}x)")

    item_map = {i["id"]: i for i in items.get("items", [])}
    enemy_map = {e["id"]: e for e in enemies.get("enemies", [])}
    codex_ids = ids(codex.get("entries", []))
    skill_map = {n["id"]: n for n in st.get("nodes", [])}
    char_map = {c["id"]: c for c in lineage.get("characters", [])}
    era_map = {e["id"]: e for e in lineage.get("eras", [])}
    weapon_map = {w["id"]: w for w in weapons.get("weapons", [])}
    dialogue_ids = ids(strings.get("dialogue", []))

    # ---- codex
    for e in codex.get("entries", []):
        eid = e.get("id")
        check_sources(f"codex.{eid}", e.get("label"), e.get("sources", []), research, rep)
        for r in e.get("research_refs", []):
            if r not in research["myths"] and r not in research["timeline"]:
                rep.err(f"codex.{eid}: research_ref {r!r} not in myths.json/timeline.json")

    # ---- weapons
    for w in weapons.get("weapons", []):
        wid = w.get("id")
        basis = w.get("basis")
        if basis:
            check_sources(f"weapons.{wid}.basis", basis.get("label"), basis.get("sources", []), research, rep)
            ref = basis.get("research_ref")
            if ref and ref not in research["timeline"] and ref not in research["myths"]:
                rep.err(f"weapons.{wid}.basis: research_ref {ref!r} unknown")
        if "era" not in w:
            rep.err(f"weapons.{wid}: missing era")
        if w.get("owner_character") not in char_map:
            rep.err(f"weapons.{wid}: owner_character {w.get('owner_character')!r} not in lineage")
        if w.get("codex_ref") and w["codex_ref"] not in codex_ids:
            rep.err(f"weapons.{wid}: codex_ref {w['codex_ref']!r} not in codex")
        for m in w.get("moves", []):
            if m.get("hit_weight") not in HIT_WEIGHTS:
                rep.err(f"weapons.{wid}.{m.get('id')}: invalid hit_weight {m.get('hit_weight')!r}")
            for k in ("damage", "the_damage", "startup_s", "active_s", "recovery_s"):
                if k not in m:
                    rep.err(f"weapons.{wid}.{m.get('id')}: missing {k}")
            for sk in (m.get("requires_skill"), (m.get("charge") or {}).get("level_2_requires_skill")):
                if sk and sk not in skill_map:
                    rep.err(f"weapons.{wid}.{m.get('id')}: unknown skill {sk!r}")
        if "drum_burst" not in w:
            rep.err(f"weapons.{wid}: missing drum_burst")

    # ---- enemies
    max_delayed = tuning.get("enemy_ai", {}).get("max_delayed_attacks_per_moveset", 1)
    for e in enemies.get("enemies", []):
        eid = e.get("id")
        etype = e.get("type")
        if etype == "human":
            rep.err(f"enemies.{eid}: type 'human' is forbidden (no fighting real people, D-017/D-018)")
        elif etype not in ALLOWED_ENEMY_TYPES:
            rep.err(f"enemies.{eid}: type {etype!r} not in {sorted(ALLOWED_ENEMY_TYPES)}")
        species = e.get("species_family")
        forbidden = FORBIDDEN_SPECIES_ALL | FORBIDDEN_SPECIES_BY_CHAPTER.get(e.get("chapter"), set())
        if species in forbidden:
            rep.err(f"enemies.{eid}: species {species!r} forbidden in {e.get('chapter')}")
        attacks = {a["id"]: a for a in e.get("attacks", [])}
        for a in attacks.values():
            aid = f"enemies.{eid}.{a['id']}"
            if not isinstance(a.get("parryable"), bool):
                rep.err(f"{aid}: parryable must be a boolean")
            tel = a.get("telegraph") or {}
            if not tel.get("visual") or not tel.get("audio"):
                rep.err(f"{aid}: telegraph needs both visual and audio cues")
            if a.get("parryable") is False and a.get("damage", 0) > 0 and tel.get("color_cue") in (None, "none"):
                rep.err(f"{aid}: unparryable damaging attack needs a color_cue (plus audio)")
        movesets = [p.get("moveset", []) for p in e.get("phases", [])] or [list(attacks)]
        for ms in movesets:
            for mid in ms:
                if mid not in attacks:
                    rep.err(f"enemies.{eid}: moveset references unknown attack {mid!r}")
            delayed = sum(1 for mid in ms if attacks.get(mid, {}).get("delayed"))
            if delayed > max_delayed:
                rep.err(f"enemies.{eid}: {delayed} delayed attacks in one moveset (max {max_delayed})")
        for d in e.get("drops", []):
            if d.get("item") not in item_map:
                rep.err(f"enemies.{eid}: drop item {d.get('item')!r} unknown")
        if e.get("rank") == "boss" and not e.get("phases"):
            rep.err(f"enemies.{eid}: boss needs phases")
        kh = e.get("khoen")
        if kh is not None:
            if e.get("rank") != "boss":
                rep.err(f"enemies.{eid}: khoen only allowed on bosses")
            if eid not in KHOEN_ALLOWED_BOSSES:
                rep.err(f"enemies.{eid}: khoen not allowed on this boss (allowed: {sorted(KHOEN_ALLOWED_BOSSES)})")
            if e.get("chapter") in KHOEN_FORBIDDEN_CHAPTERS:
                rep.err(f"enemies.{eid}: no khoen in chapter {e.get('chapter')} (V2)")
            if kh.get("binding_item") is not True:
                rep.err(f"enemies.{eid}: khoen must be binding_item=true (V9)")
            if not kh.get("feature_flag"):
                rep.err(f"enemies.{eid}: khoen needs a feature_flag so it can be disabled (V9)")
            if "fallback_when_disabled" not in kh:
                rep.err(f"enemies.{eid}: khoen needs fallback_when_disabled (V9)")
            if not isinstance(kh.get("crack_stages"), int) or kh["crack_stages"] < 1:
                rep.err(f"enemies.{eid}: khoen.crack_stages must be int >= 1")
            if kh.get("pry_beats") != tuning.get("pry", {}).get("beats"):
                rep.err(f"enemies.{eid}: khoen.pry_beats must match combat_tuning.pry.beats")
            pc = kh.get("pry_condition", {})
            if pc.get("khoen_cracks_at_least", 0) > kh.get("crack_stages", 0):
                rep.err(f"enemies.{eid}: pry requires more cracks than crack_stages")
            for blk in ("on_pry_success", "fallback_when_disabled"):
                for d in (kh.get(blk) or {}).get("drops", []):
                    if d.get("item") not in item_map:
                        rep.err(f"enemies.{eid}.khoen.{blk}: drop item {d.get('item')!r} unknown")
                    elif item_map[d["item"]].get("source", {}).get("kind") == "khoen":
                        rep.err(f"enemies.{eid}: khoen shards may not drop as items (V9)")
    for nc in enemies.get("non_combat_encounters", []):
        if nc.get("combat") is not False or nc.get("targetable_by_attacks") is not False:
            rep.err(f"enemies.{nc.get('id')}: non-combat encounter must have combat=false and targetable_by_attacks=false")
        for d in (nc.get("on_success") or {}).get("dispels", []):
            if d not in enemy_map:
                rep.err(f"enemies.{nc.get('id')}: dispels unknown enemy {d!r}")

    # ---- items
    rarities = {r["id"]: r for r in items.get("rarities", [])}
    recipes = {r["id"]: r for r in items.get("recipes", [])}
    stations = ids(items.get("stations", []))
    secret_chain_ids = {c.get("id") for c in b["secrets"].get("chains", [])}
    for it in items.get("items", []):
        iid = it.get("id")
        r = rarities.get(it.get("rarity"))
        if r is None:
            rep.err(f"items.{iid}: unknown rarity {it.get('rarity')!r}")
        elif r.get("allowed_in_demo") is False:
            rep.err(f"items.{iid}: rarity {r['id']} not allowed in demo")
        src = it.get("source", {})
        if src.get("kind") == "khoen" or it.get("category") == "khoen" or "khoen" in str(iid):
            rep.err(f"items.{iid}: khoen shards are never items/materials (V9)")
        if src.get("recipe") and src["recipe"] not in recipes:
            rep.err(f"items.{iid}: source recipe {src['recipe']!r} unknown")
        if src.get("enemy") and src["enemy"] not in enemy_map:
            rep.err(f"items.{iid}: source enemy {src['enemy']!r} unknown")
        if src.get("secret_chain") and src["secret_chain"] not in secret_chain_ids:
            rep.err(f"items.{iid}: source secret_chain {src['secret_chain']!r} unknown")
        if it.get("codex_ref") and it["codex_ref"] not in codex_ids:
            rep.err(f"items.{iid}: codex_ref {it['codex_ref']!r} unknown")
        if it.get("category") == "bao_khi":
            rec = recipes.get(src.get("recipe"))
            kinds = {item_map.get(x.get("item"), {}).get("source", {}).get("kind") for x in (rec or {}).get("inputs", [])}
            if not kinds & BAO_KHI_SOURCE_KINDS:
                rep.err(f"items.{iid}: Bảo khí must be crafted from a part shed after pry or remains after dissolving (SB-06)")
        for lv in it.get("upgrade_levels", []):
            if lv.get("recipe") and lv["recipe"] not in recipes:
                rep.err(f"items.{iid}: upgrade recipe {lv['recipe']!r} unknown")
    for rid, rec in recipes.items():
        if rec.get("station") not in stations:
            rep.err(f"items.recipes.{rid}: unknown station {rec.get('station')!r}")
        refs = [x.get("item") for x in rec.get("inputs", [])] + [(rec.get("output") or {}).get("item"), rec.get("target")]
        for ref in refs:
            if ref is not None and ref not in item_map:
                rep.err(f"items.recipes.{rid}: unknown item {ref!r}")
        if not rec.get("inputs"):
            rep.err(f"items.recipes.{rid}: needs inputs")

    # ---- lineage
    for c in char_map.values():
        if c.get("era") not in era_map:
            rep.err(f"lineage.{c['id']}: unknown era {c.get('era')!r}")
        for w in c.get("start_weapons", []):
            if w not in weapon_map:
                rep.err(f"lineage.{c['id']}: start weapon {w!r} unknown")
    for e in era_map.values():
        check_sources(f"lineage.eras.{e['id']}", e.get("label"), e.get("sources", []), research, rep)
    for n in skill_map.values():
        if n.get("branch") not in ids(st.get("branches", [])):
            rep.err(f"lineage.skill.{n['id']}: unknown branch {n.get('branch')!r}")
        for p in n.get("prereqs", []):
            if p not in skill_map:
                rep.err(f"lineage.skill.{n['id']}: unknown prereq {p!r}")
    # Acyclic prereqs.
    state: dict[str, int] = {}

    def dfs(nid: str) -> bool:
        state[nid] = 1
        for p in skill_map.get(nid, {}).get("prereqs", []):
            if p in skill_map:
                if state.get(p) == 1 or (state.get(p) is None and not dfs(p)):
                    return False
        state[nid] = 2
        return True
    for nid in skill_map:
        if state.get(nid) is None and not dfs(nid):
            rep.err(f"lineage.skill: prereq cycle involving {nid}")
            break
    for t in lineage.get("tools", []):
        if t.get("occupies_weapon_slot") is not False or t.get("has_stats") is not False:
            rep.err(f"lineage.{t.get('id')}: tools take no weapon slot and have no stats (R3-06)")
    thap = lineage.get("thap", {})
    if thap and (thap.get("material") != "gom" or thap.get("funerary_reference") is not False):
        rep.err("lineage.thap: Thạp must be pottery (gom) with funerary_reference=false (SB-08)")
    ho = lineage.get("handoff", {})
    if ho:
        for k in ("from", "to"):
            if ho.get(k) not in char_map:
                rep.err(f"lineage.handoff: {k} {ho.get(k)!r} unknown")
        for step in ho.get("steps", []):
            sid = step.get("id")
            if step.get("line_ref") and step["line_ref"] not in dialogue_ids:
                rep.err(f"lineage.handoff.{sid}: line_ref {step['line_ref']!r} unknown")
            for en in step.get("enemies", []):
                if en.get("enemy") not in enemy_map:
                    rep.err(f"lineage.handoff.{sid}: enemy {en.get('enemy')!r} unknown")
                elif "khoen" in enemy_map[en["enemy"]]:
                    rep.err(f"lineage.handoff.{sid}: khoen enemy in handoff")
            if step.get("weapon") and step["weapon"] not in weapon_map:
                rep.err(f"lineage.handoff.{sid}: weapon {step['weapon']!r} unknown")
            if step.get("kind") == "receive_tool" and step.get("ref") not in ids(lineage.get("tools", [])):
                rep.err(f"lineage.handoff.{sid}: tool {step.get('ref')!r} unknown")
        # Era rule (SB-02, SB11-01): text shown when handing off into an era must respect its tags.
        to_era = era_map.get(char_map.get(ho.get("to"), {}).get("era"), {})
        tags = to_era.get("forbidden_content_tags", [])
        if tags:
            dlg = {d.get("id"): d for d in strings.get("dialogue", [])}
            seen = {"thap": lineage.get("thap", {}).get("description", {})}
            seen.update({t.get("id"): t.get("description", {}) for t in lineage.get("tools", [])})
            seen.update({i.get("id"): [i.get("name", {}), i.get("description", {}), i.get("effect_text", {})]
                         for i in items.get("items", []) if i.get("inheritable_via")})
            for step in ho.get("steps", []):
                seen[step.get("id")] = [step.get("text", {}), dlg.get(step.get("line_ref"), {}).get("text", {})]
            for key, obj in seen.items():
                hits = forbidden_hits(obj, tags)
                if hits:
                    rep.err(f"lineage.handoff: {key} shown in era {to_era.get('id')} uses {hits} (SB-02, SB11-01)")
    check_khoen_free_eras(b, rep)
    for hm in lineage.get("house_moves", []):
        if hm.get("learned_by") not in char_map:
            rep.err(f"lineage.{hm.get('id')}: learned_by unknown")

    # ---- secrets
    chain_ids = check_secrets(b, rep, set(item_map), codex_ids)
    for e in codex.get("entries", []):
        if e.get("text_extra_unlock") and e["text_extra_unlock"] not in chain_ids:
            rep.err(f"codex.{e.get('id')}: text_extra_unlock {e['text_extra_unlock']!r} unknown")

    # ---- combat tuning
    g = tuning.get("guard", {})
    if g.get("perfect_parry_window_s", 0) > g.get("parry_window_s", 0):
        rep.err("combat_tuning.guard: perfect parry window larger than parry window")
    dg = tuning.get("dodge", {})
    if dg.get("iframe_start_s", 0) + dg.get("iframe_duration_s", 0) > dg.get("duration_s", 0):
        rep.err("combat_tuning.dodge: i-frames exceed dodge duration")
    if dg.get("perfect_dodge_window_s", 0) > dg.get("iframe_duration_s", 0):
        rep.err("combat_tuning.dodge: perfect dodge window larger than i-frames")
    if tuning.get("drum_rhythm", {}).get("segments") != 4:
        rep.err("combat_tuning.drum_rhythm: segments must be 4 (GDD §3)")
    for k, v in tuning.get("hit_stop", {}).items():
        if k.endswith("_s") and not 0 <= v <= 0.2:
            rep.err(f"combat_tuning.hit_stop.{k}: {v}s outside 0..0.2")
    diff = tuning.get("difficulty", {})
    presets = ids(diff.get("presets", []))
    if len(diff.get("presets", [])) != 4:
        rep.err("combat_tuning.difficulty: needs exactly 4 presets")
    if diff.get("default") not in presets:
        rep.err("combat_tuning.difficulty: default preset unknown")
    pr = diff.get("custom_ranges", {}).get("parry_window_s", {})
    if not pr or not pr.get("min", 1) <= g.get("parry_window_s", -1) <= pr.get("max", -1):
        rep.err("combat_tuning.difficulty: custom parry range must contain default parry window")
    heal = tuning.get("healing", {}).get("item_id")
    if heal and heal not in item_map:
        rep.err(f"combat_tuning.healing: item {heal!r} unknown")
    return rep


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--data", type=Path, default=DATA_DIR)
    ap.add_argument("--research", type=Path, default=RESEARCH_DIR)
    args = ap.parse_args(argv)
    bundle, rep = load_bundle(args.data)
    if not rep.errors:
        rep2 = validate(bundle, load_research(args.research))
        rep.errors += rep2.errors
        rep.warnings += rep2.warnings
    for w in rep.warnings:
        print(f"WARN  {w}")
    for e in rep.errors:
        print(f"ERROR {e}")
    print(f"design_validate: {len(rep.errors)} errors, {len(rep.warnings)} warnings")
    return 1 if rep.errors else 0


__all__ = ["Report", "load_bundle", "load_research", "validate", "secret_reachability"]

if __name__ == "__main__":
    sys.exit(main())
