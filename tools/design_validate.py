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

FILES = ("combat_tuning", "weapons", "enemies", "items", "lineage", "secrets", "codex", "strings",
         "controls", "skills", "map", "dialogue", "quests", "cinematics")
WORLD_JS = ROOT / "prototype" / "web" / "src" / "game" / "world.js"

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
    gear = items.get("gear_0_3", {})
    all_entries += gear.get("pieces", []) + gear.get("sets", []) + b["skills"].get("skills", [])
    all_entries += b["skills"].get("currencies", [])
    for key in ("landmarks", "discovery_points", "chests", "environment_secrets"):
        all_entries += b["map"].get(key, [])
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
            # The fight always ends by prying: the creature never dies (DEMO §6), so it needs a
            # health floor that forces the final stagger (QA N1).
            floor = e.get("hp_floor")
            if not isinstance(floor, (int, float)) or isinstance(floor, bool) or floor <= 0:
                rep.err(f"enemies.{eid}: khoen boss needs hp_floor > 0 (the creature never dies; fight ends by prying)")
            if e.get("hp_floor_forces_final_stagger") is not True:
                rep.err(f"enemies.{eid}: khoen boss needs hp_floor_forces_final_stagger=true (floor opens the pry)")
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

    # ---- Demo 0.3 (DEMO_0_3_DESIGN): gear, skills, map, controls scheme, boss redesign
    check_demo_0_3(b, rep)
    # ---- Demo 0.4 story integration (research/narrative/STORY_INTEGRATION_0_4.md)
    check_story_0_4(b, rep)
    return rep


# ---------------------------------------------------------------- Demo 0.3

def hex_hue(h: str) -> float | None:
    m = re.fullmatch(r"#([0-9a-fA-F]{6})", h or "")
    if not m:
        return None
    r, g, bl = (int(m.group(1)[i:i + 2], 16) / 255 for i in (0, 2, 4))
    mx, mn = max(r, g, bl), min(r, g, bl)
    if mx == mn:
        return -1.0  # grey: no hue
    d = mx - mn
    if mx == r:
        hue = ((g - bl) / d) % 6
    elif mx == g:
        hue = (bl - r) / d + 2
    else:
        hue = (r - g) / d + 4
    return hue * 60


def hue_distance(a: float, b: float) -> float:
    if a < 0 or b < 0:
        return 360.0
    d = abs(a - b) % 360
    return min(d, 360 - d)


def in_shape(x: float, z: float, shape: dict) -> bool:
    if "rect" in shape:
        r = shape["rect"]
        return r["x0"] <= x <= r["x1"] and r["z0"] <= z <= r["z1"]
    if "circle" in shape:
        c = shape["circle"]
        return (x - c["cx"]) ** 2 + (z - c["cz"]) ** 2 <= c["r"] ** 2
    return False


def parse_world_points(path: Path = WORLD_JS) -> dict[str, tuple[float, float]] | None:
    """Reads POINTS ids and (x, z) from the prototype graybox layout (world.js)."""
    try:
        src = path.read_text(encoding="utf-8")
    except OSError:
        return None
    hub = re.search(r"export const HUB_X\s*=\s*(-?[\d.]+)", src)
    hub_x = float(hub.group(1)) if hub else 0.0
    body = re.search(r"export const POINTS\s*=\s*\[(.*?)\n\];", src, re.S)
    if not body:
        return None

    def num(expr: str) -> float:
        expr = expr.strip()
        m = re.fullmatch(r"HUB_X(?:\s*([+-])\s*([\d.]+))?", expr)
        if m:
            return hub_x + (float(m.group(2)) * (1 if m.group(1) == "+" else -1) if m.group(1) else 0.0)
        return float(expr)

    out = {}
    for m in re.finditer(r"\{\s*id:\s*'([^']+)'[^}]*?\bx:\s*([^,]+),\s*z:\s*([^,}]+)", body.group(1)):
        out[m.group(1)] = (num(m.group(2)), num(m.group(3)))
    return out


def merged_controls(controls: dict) -> tuple[list[dict], list[str]]:
    """Applies controls.scheme_0_3 (actions_replace / actions_add) to a copy of actions[]."""
    problems: list[str] = []
    sc = controls.get("scheme_0_3") or {}
    acts = [dict(a) for a in controls.get("actions", [])]
    idx = {a["id"]: i for i, a in enumerate(acts)}
    for a in sc.get("actions_replace", []):
        if a.get("id") not in idx:
            problems.append(f"scheme_0_3.actions_replace: unknown action {a.get('id')!r}")
        else:
            acts[idx[a["id"]]] = dict(a)
    for a in sc.get("actions_add", []):
        if a.get("id") in idx:
            problems.append(f"scheme_0_3.actions_add: action {a.get('id')!r} already exists (use actions_replace)")
        else:
            idx[a["id"]] = len(acts)
            acts.append(dict(a))
    return acts, problems


def binding_conflicts(acts: list[dict], kbm_over: dict | None = None, pad_over: dict | None = None) -> list[str]:
    """Duplicate gameplay inputs among actions that are not aliases (shares_input_with), not chords
    (pad.modifier) and not an explicit press/hold pair (shares_input_with_hold)."""
    out: list[str] = []
    kbm: dict[str, str] = {}
    pad: dict[int, str] = {}
    by_id = {a["id"]: a for a in acts}
    for a in acts:
        if a.get("context") != "gameplay" or a.get("reserved") or a.get("shares_input_with"):
            continue
        keys = (kbm_over or {}).get(a["id"], a.get("kbm", {}).get("inputs", []))
        for k in keys:
            if k in kbm:
                out.append(f"kbm {k} bound to both {kbm[k]} and {a['id']}")
            kbm[k] = a["id"]
        p = a.get("pad", {})
        if p.get("modifier"):
            continue
        buttons = [x["index"] for x in (pad_over or {}).get(a["id"], p.get("inputs", [])) if not x.get("axis")]
        for btn in buttons:
            other = pad.get(btn)
            pair = other and (a.get("shares_input_with_hold") == other
                              or by_id.get(other, {}).get("shares_input_with_hold") == a["id"])
            if other and not pair:
                out.append(f"pad button {btn} bound to both {other} and {a['id']}")
            pad[btn] = a["id"]
    return out


def check_controls_0_3(b: dict, rep: Report) -> None:
    controls = b["controls"]
    sc = controls.get("scheme_0_3")
    if not sc:
        return
    acts, problems = merged_controls(controls)
    for p in problems:
        rep.err(f"controls.{p}")
    unsafe = set(sc.get("browser_unsafe_kbm", []))
    for a in acts:
        if a.get("context") == "gameplay":
            bad = unsafe & set(a.get("kbm", {}).get("inputs", []))
            if bad:
                rep.err(f"controls.scheme_0_3: {a['id']} uses browser-unsafe keys {sorted(bad)} (Ctrl+W closes the tab, Alt opens menus)")
    for c in binding_conflicts(acts):
        rep.err(f"controls.scheme_0_3: {c}")
    ids_ = {a["id"] for a in acts}
    for pr in sc.get("kbm_presets", []):
        unknown = set(pr.get("overrides", {})) - ids_
        if unknown:
            rep.err(f"controls.scheme_0_3.kbm_presets.{pr.get('id')}: unknown actions {sorted(unknown)}")
        for a, keys in pr.get("overrides", {}).items():
            if unsafe & set(keys):
                rep.err(f"controls.scheme_0_3.kbm_presets.{pr.get('id')}: {a} uses browser-unsafe keys")
        for c in binding_conflicts(acts, kbm_over=pr.get("overrides", {})):
            rep.err(f"controls.scheme_0_3.kbm_presets.{pr.get('id')}: {c}")
    for pr in sc.get("pad_presets_replace", []):
        for c in binding_conflicts(acts, pad_over=pr.get("overrides", {})):
            rep.err(f"controls.scheme_0_3.pad_presets.{pr.get('id')}: {c}")
    acc = {o.get("id") for o in controls.get("accessibility_options", [])}
    acc |= {o.get("id") for o in sc.get("accessibility_add", [])}
    acc |= {o.get("id") for o in b["combat_tuning"].get("accessibility", {}).get("options", [])}
    ui = b["strings"].get("ui", {})
    for a in acts:
        if a.get("accessibility_option") and a["accessibility_option"] not in acc:
            rep.err(f"controls.scheme_0_3: {a['id']} accessibility_option {a['accessibility_option']!r} unknown")
        if a.get("opens_tab") and a["opens_tab"] not in ui:
            rep.err(f"controls.scheme_0_3: {a['id']} opens_tab {a['opens_tab']!r} not in strings.ui")
    for need in ("jump", "dodge", "inventory", "map"):
        a = next((x for x in acts if x["id"] == need), None)
        if not a or a.get("reserved") or not a.get("kbm", {}).get("inputs"):
            rep.err(f"controls.scheme_0_3: action {need!r} must be bound (PO 0.2 feedback)")


def check_demo_0_3(b: dict, rep: Report) -> None:
    tuning, items, enemies, weapons = b["combat_tuning"], b["items"], b["enemies"], b["weapons"]
    skills, mp, strings = b["skills"], b["map"], b["strings"]
    item_map = {i["id"]: i for i in items.get("items", [])}
    enemy_map = {e["id"]: e for e in enemies.get("enemies", [])}
    weapon_map = {w["id"]: w for w in weapons.get("weapons", [])}
    ui = strings.get("ui", {})

    # ---- rarity colours: never the red-bronze reserved for unparryable telegraphs (ART_DIRECTION P4)
    rr = items.get("rarity_rules_0_3", {})
    reserved = [hex_hue(h) for h in rr.get("reserved_hex", [])]
    min_d = rr.get("min_hue_distance_deg", 20)
    for r in items.get("rarities", []):
        if "color_hex" not in r:
            continue
        hue = hex_hue(r["color_hex"])
        if hue is None:
            rep.err(f"items.rarities.{r['id']}: color_hex {r['color_hex']!r} is not #RRGGBB")
            continue
        if r["color_hex"].upper() in {h.upper() for h in rr.get("reserved_hex", [])} or any(
                hue_distance(hue, x) < min_d for x in reserved if x is not None):
            rep.err(f"items.rarities.{r['id']}: color {r['color_hex']} too close to reserved red-bronze")

    # ---- gear
    gear = items.get("gear_0_3", {})
    slots = {s["id"]: s for s in gear.get("slots", [])}
    stat_ids = {s["id"] for s in gear.get("stat_defs", [])}
    rarities = {r["id"]: r for r in items.get("rarities", [])}
    pieces = {p["id"]: p for p in gear.get("pieces", [])}
    require_label(gear.get("pieces", []), "items.gear_0_3.pieces", rep)
    require_label(gear.get("sets", []), "items.gear_0_3.sets", rep)
    costs = (gear.get("upgrades") or {}).get("costs", {})
    max_plus = (gear.get("upgrades") or {}).get("max_plus", 0)
    for cat, lv in costs.items():
        if sorted(c.get("to_plus") for c in lv) != list(range(1, max_plus + 1)):
            rep.err(f"items.gear_0_3.upgrades.{cat}: needs to_plus 1..{max_plus}")
        for c in lv:
            for x in c.get("inputs", []):
                if x.get("item") not in item_map:
                    rep.err(f"items.gear_0_3.upgrades.{cat}: unknown item {x.get('item')!r}")
    for pid, p in pieces.items():
        kind = p.get("kind")
        accepts = {s["accepts"] for s in slots.values()}
        if kind not in accepts:
            rep.err(f"items.gear_0_3.{pid}: kind {kind!r} fits no slot")
        if kind == "armor" and slots.get(p.get("slot"), {}).get("accepts") != "armor":
            rep.err(f"items.gear_0_3.{pid}: armor slot {p.get('slot')!r} unknown")
        r = rarities.get(p.get("rarity"))
        if r is None or r.get("allowed_in_demo") is False:
            rep.err(f"items.gear_0_3.{pid}: rarity {p.get('rarity')!r} unknown or not allowed in demo")
        for s in p.get("stats", {}):
            if s not in stat_ids:
                rep.err(f"items.gear_0_3.{pid}: unknown stat {s!r}")
        if "era" not in p:
            rep.err(f"items.gear_0_3.{pid}: missing era")
        if p.get("upgrade_category") not in costs:
            rep.err(f"items.gear_0_3.{pid}: upgrade_category {p.get('upgrade_category')!r} has no costs")
        if "khoen" in pid or (p.get("source") or {}).get("kind") in ("khoen", "beast_part"):
            rep.err(f"items.gear_0_3.{pid}: no gear from khoen or beast parts (V9, SB-05)")
    for st in gear.get("sets", []):
        for pid in st.get("pieces", []):
            if pid not in pieces:
                rep.err(f"items.gear_0_3.sets.{st.get('id')}: unknown piece {pid!r}")
            elif pieces[pid].get("set") != st.get("id"):
                rep.err(f"items.gear_0_3.sets.{st.get('id')}: piece {pid} does not point back to the set")
        for bo in st.get("bonuses", []):
            if not 1 <= bo.get("count", 0) <= len(st.get("pieces", [])):
                rep.err(f"items.gear_0_3.sets.{st.get('id')}: bonus count {bo.get('count')} out of range")

    # ---- enemies: drops of normal enemies; boss 0.3 additions
    max_delayed = tuning.get("enemy_ai", {}).get("max_delayed_attacks_per_moveset", 1)
    br = tuning.get("boss_rules_0_3", {})
    presets = {p["id"] for p in tuning.get("difficulty", {}).get("presets", [])}
    for e in enemy_map.values():
        eid = e["id"]
        for d in e.get("drops", []):
            ch = d.get("chance", 1.0)
            if not isinstance(ch, (int, float)) or not 0 < ch <= 1:
                rep.err(f"enemies.{eid}: drop chance {ch!r} must be in (0, 1]")
            if e.get("rank") == "boss" and ch != 1.0:
                rep.err(f"enemies.{eid}: boss drops must be guaranteed (ArpgCore)")
        attacks = {a["id"]: a for a in e.get("attacks", [])}
        combos = {c["id"]: c for c in e.get("combos_0_3", [])}
        require_label(e.get("combos_0_3", []), f"enemies.{eid}.combos_0_3", rep)
        for cid, c in combos.items():
            steps = c.get("steps", [])
            if not 2 <= len(steps) <= br.get("max_combo_steps", 4):
                rep.err(f"enemies.{eid}.{cid}: combo needs 2..{br.get('max_combo_steps', 4)} steps")
            for i, s in enumerate(steps):
                for ref in (s.get("attack"), s.get("branch_if_player_behind")):
                    if ref is not None and ref not in attacks:
                        rep.err(f"enemies.{eid}.{cid}: step {i} unknown attack {ref!r}")
                a = attacks.get(s.get("attack"))
                if a and i > 0:
                    w = a.get("windup_s", 0) * s.get("windup_mult", 1.0)
                    floor = br.get("min_windup_s_parryable_in_combo", 0.3) if a.get("parryable") else br.get("min_windup_s_unparryable_in_combo", 0.9)
                    if w + 1e-9 < floor:
                        rep.err(f"enemies.{eid}.{cid}: step {i} windup {w:.2f}s below fairness floor {floor}s")
        for ph in e.get("phases", []):
            pid = ph.get("id")
            removes = set((ph.get("phase2_0_3") or {}).get("removes_from_moveset_0_3", []))
            for ref in list(ph.get("moveset_add_0_2", [])) + list(ph.get("moveset_add_0_3", [])) + list(removes):
                if ref not in attacks:
                    rep.err(f"enemies.{eid}.{pid}: moveset addition references unknown attack {ref!r}")
            eff = (set(ph.get("moveset", [])) | set(ph.get("moveset_add_0_2", [])) | set(ph.get("moveset_add_0_3", []))) - removes
            for cid in ph.get("combos_add_0_3", []):
                if cid not in combos:
                    rep.err(f"enemies.{eid}.{pid}: unknown combo {cid!r}")
                    continue
                for s in combos[cid].get("steps", []):
                    if s.get("attack") not in eff:
                        rep.err(f"enemies.{eid}.{pid}: combo {cid} uses {s.get('attack')!r} outside this phase's moveset")
            if ph.get("moveset_add_0_3") or ph.get("combos_add_0_3"):
                delayed = {m for m in eff if attacks.get(m, {}).get("delayed")}
                if len(delayed) > max_delayed:
                    rep.err(f"enemies.{eid}.{pid}: {len(delayed)} delayed attacks in the 0.3 moveset (max {max_delayed}, N7)")
                feints = [m for m in eff if attacks.get(m, {}).get("feint")]
                if len(feints) > br.get("max_feints_per_phase", 1):
                    rep.err(f"enemies.{eid}.{pid}: {len(feints)} feints (max {br.get('max_feints_per_phase', 1)})")
                for m in feints:
                    tgt = attacks.get(attacks[m].get("feint_of"))
                    if tgt is None:
                        rep.err(f"enemies.{eid}.{m}: feint_of unknown")
                    elif br.get("feint_requires_distinct_audio", True) and \
                            (attacks[m].get("telegraph") or {}).get("audio") == (tgt.get("telegraph") or {}).get("audio"):
                        rep.err(f"enemies.{eid}.{m}: feint must sound different from {tgt['id']} (fairness)")
            p2 = ph.get("phase2_0_3")
            if p2:
                arena = next((z for z in mp.get("zones", []) if z.get("id") in e.get("zones", [])), None)
                for st in (p2.get("arena_change_0_3") or {}).get("stakes_emerge", []):
                    if arena and not any(in_shape(st["x"], st["z"], s) for s in arena.get("shapes", [])):
                        rep.err(f"enemies.{eid}: stake {st.get('id')} outside the arena")
        beh = e.get("behavior_0_3") or {}
        all_eff = set()
        for ph in e.get("phases", []):
            all_eff |= set(ph.get("moveset", [])) | set(ph.get("moveset_add_0_3", []))
        for key in ("punish_heal", "punish_dodge_spam", "anti_kite"):
            resp = (beh.get(key) or {}).get("response")
            if resp and resp not in all_eff:
                rep.err(f"enemies.{eid}.behavior_0_3.{key}: response {resp!r} not in any phase moveset")
        diff = e.get("difficulty_0_3")
        if diff:
            got = {k for k in diff if not k.startswith("_")}
            if got != presets:
                rep.err(f"enemies.{eid}.difficulty_0_3: must cover exactly the presets {sorted(presets)}")

    # ---- skills
    require_label(skills.get("skills", []), "skills.skills", rep)
    require_label(skills.get("currencies", []), "skills.currencies", rep)
    rules = skills.get("rules", {})
    max_level = rules.get("max_level", 3)
    by_weapon: dict[str, list[dict]] = {}
    for s in skills.get("skills", []):
        sid = s.get("id")
        if s.get("weapon") not in weapon_map:
            rep.err(f"skills.{sid}: unknown weapon {s.get('weapon')!r}")
        by_weapon.setdefault(s.get("weapon"), []).append(s)
        if s.get("input") != f"skill_{s.get('slot')}" or s.get("input") not in rules.get("inputs", []):
            rep.err(f"skills.{sid}: input {s.get('input')!r} must be skill_<slot>")
        lv = s.get("levels", [])
        if [x.get("level") for x in lv] != list(range(1, max_level + 1)):
            rep.err(f"skills.{sid}: levels must be 1..{max_level}")
        if lv and lv[0].get("cost_xp") != 0:
            rep.err(f"skills.{sid}: level 1 costs nothing (unlock carries the cost)")
        for x in lv:
            if not isinstance(x.get("cooldown_s"), (int, float)) or x["cooldown_s"] <= 0:
                rep.err(f"skills.{sid}: level {x.get('level')} needs cooldown_s > 0")
        if s.get("unlock", {}).get("kind") not in ("start", "xp"):
            rep.err(f"skills.{sid}: unlock.kind must be start or xp")
    for wid, lst in by_weapon.items():
        if sorted(x.get("slot") for x in lst) != list(range(1, rules.get("slots_per_weapon", 2) + 1)):
            rep.err(f"skills: weapon {wid} needs exactly one skill per slot")
        ref = weapon_map.get(wid, {}).get("skills_0_3")
        if ref is not None and sorted(ref) != sorted(x["id"] for x in lst):
            rep.err(f"weapons.{wid}.skills_0_3 does not match skills.json")
    chains = {c.get("id") for c in b["secrets"].get("chains", [])}
    ncs = {n.get("id") for n in enemies.get("non_combat_encounters", [])}
    for x in skills.get("xp_sources", []):
        if x.get("enemy") and x["enemy"] not in enemy_map:
            rep.err(f"skills.xp_sources.{x.get('id')}: unknown enemy {x['enemy']!r}")
        if x.get("chain") and x["chain"] not in chains:
            rep.err(f"skills.xp_sources.{x.get('id')}: unknown chain {x['chain']!r}")
        if x.get("ref") and x["ref"] not in ncs:
            rep.err(f"skills.xp_sources.{x.get('id')}: unknown ref {x['ref']!r}")
    xp_ids = {x.get("id") for x in skills.get("xp_sources", [])}
    if rules.get("currency") not in {c.get("id") for c in skills.get("currencies", [])}:
        rep.err("skills.rules.currency unknown")

    # ---- map
    for key in ("levels", "zones", "landmarks", "discovery_points", "chests", "environment_secrets"):
        require_label(mp.get(key, []), f"map.{key}", rep)
    icons = {i["id"] for i in mp.get("icons", [])}
    levels = {lv["id"]: lv for lv in mp.get("levels", [])}
    zones = {z["id"]: z for z in mp.get("zones", [])}
    locs = {l["id"]: l for l in b["secrets"].get("locations", [])}
    for z in zones.values():
        if z.get("level") not in levels:
            rep.err(f"map.zones.{z['id']}: unknown level")
        if z["id"] in locs and locs[z["id"]].get("name") != z.get("name"):
            rep.err(f"map.zones.{z['id']}: name differs from secrets.locations")
    world = parse_world_points()
    if world is None:
        rep.warn("map: prototype world.js not found; landmark coordinates not cross-checked")

    def inside_level(o: dict, where: str) -> None:
        lv = levels.get(o.get("level")) if o.get("level") else None
        cands = [lv] if lv else list(levels.values())
        if not any(c["bounds"]["x0"] <= o["x"] <= c["bounds"]["x1"] and c["bounds"]["z0"] <= o["z"] <= c["bounds"]["z1"] for c in cands):
            rep.err(f"{where}: ({o['x']}, {o['z']}) outside every level bound")

    for l in mp.get("landmarks", []):
        where = f"map.landmarks.{l.get('id')}"
        if l.get("icon") not in icons:
            rep.err(f"{where}: unknown icon {l.get('icon')!r}")
        inside_level(l, where)
        if l.get("fast_travel") and l.get("kind") != "rest":
            rep.err(f"{where}: fast travel only at resting fires")
        wp = l.get("world_point")
        if wp and world is not None:
            if wp not in world:
                rep.err(f"{where}: world_point {wp!r} not in world.js POINTS")
            elif abs(world[wp][0] - l["x"]) > 0.01 or abs(world[wp][1] - l["z"]) > 0.01:
                rep.err(f"{where}: ({l['x']}, {l['z']}) differs from world.js {wp} {world[wp]}")
    gear_ids = set(pieces)
    for key in ("discovery_points", "chests", "environment_secrets"):
        for o in mp.get(key, []):
            where = f"map.{key}.{o.get('id')}"
            z = zones.get(o.get("zone"))
            if z is None:
                rep.err(f"{where}: unknown zone {o.get('zone')!r}")
            elif not any(in_shape(o["x"], o["z"], s) for s in z.get("shapes", [])):
                rep.err(f"{where}: ({o['x']}, {o['z']}) is outside zone {z['id']}")
            if o.get("xp_ref") and o["xp_ref"] not in xp_ids:
                rep.err(f"{where}: xp_ref {o['xp_ref']!r} unknown")
            rewards = list(o.get("contents", [])) + [{"item": x["item"]} for x in (o.get("reward") or {}).get("items", [])]
            rewards += [{"gear": g} for g in (o.get("reward") or {}).get("gear", [])]
            for r in rewards:
                if "gear" in r and r["gear"] not in gear_ids:
                    rep.err(f"{where}: unknown gear {r['gear']!r}")
                if "item" in r and r["item"] not in item_map:
                    rep.err(f"{where}: unknown item {r['item']!r}")
    map_refs = {o.get("id") for k in ("chests", "environment_secrets") for o in mp.get(k, [])}
    for p in pieces.values():
        ref = (p.get("source") or {}).get("map_ref")
        if ref and ref not in map_refs:
            rep.err(f"items.gear_0_3.{p['id']}: source map_ref {ref!r} not in map.json")
    mm = mp.get("minimap", {})
    for i in mm.get("shows", []):
        if i not in icons:
            rep.err(f"map.minimap.shows: unknown icon {i!r}")
    if mm and mm.get("rotation_default") not in mm.get("rotation_options", []):
        rep.err("map.minimap: rotation_default not among rotation_options")
    wm = mp.get("world_map", {})
    for k in (wm.get("quest_tracking") or {}).get("objective_string_keys", []):
        if k not in ui:
            rep.err(f"map.world_map: objective key {k!r} not in strings.ui")
    fk = (wm.get("zone_completion") or {}).get("format_key")
    if fk and fk not in ui:
        rep.err(f"map.world_map: format_key {fk!r} not in strings.ui")

    check_controls_0_3(b, rep)


# ---------------------------------------------------------------- Demo 0.4 story integration

# Worshipped figures never speak (Story Bible v1.2 §2): they appear only through what people tell.
DIVINE_SPEAKER_WORDS = ("lạc long quân", "long quân", "âu cơ", "gióng", "sơn tinh", "thủy tinh", "tản viên",
                        "hùng vương", "mị nương", "huyền thiên")
# A dialogue choice may only change details (CLAUDE.md §3): it sets its own flag_choice_* flag, nothing else.
CHOICE_EFFECT_KINDS = {"set_flag"}
CHOICE_FLAG_PREFIX = "flag_choice_"
QUEST_CONDITION_TYPES = {"inspect", "talk", "non_combat_success", "enter_zone", "boss_freed", "craft",
                         "interact", "open_chest", "environment_secret"}
MAIN_QUEST_STEPS = (4, 6)
COLD_OPEN_MAX_S = 90
OBJECTIVE_MAX_CHARS = 60
OFFMAP_ZONE = "offmap_cinematic"


def check_story_0_4(b: dict, rep: Report) -> None:
    dlg, qs, cin = b["dialogue"], b["quests"], b["cinematics"]
    strings, lineage, items, enemies, mp = b["strings"], b["lineage"], b["items"], b["enemies"], b["map"]
    ui = strings.get("ui", {})
    era_ids = {e.get("id") for e in lineage.get("eras", [])}

    speakers = dlg.get("speakers", [])
    convs = dlg.get("conversations", [])
    barks = dlg.get("barks", [])
    songs = dlg.get("songs", [])
    quests = qs.get("quests", [])
    cins = cin.get("cinematics", [])
    for key, lst in (("dialogue.speakers", speakers), ("dialogue.conversations", convs), ("dialogue.barks", barks),
                     ("dialogue.songs", songs), ("quests.quests", quests), ("cinematics.cinematics", cins)):
        require_label(lst, key, rep)
        for o in lst:
            if isinstance(o, dict) and o.get("era") not in era_ids:
                rep.err(f"{key}.{o.get('id')}: unknown era {o.get('era')!r}")

    speaker_ids = ids(speakers) | {c.get("id") for c in lineage.get("characters", [])} | {"narration_ve"}
    for sp in speakers:
        name = (sp.get("name") or {}).get("vi", "").lower()
        if any(w in name for w in DIVINE_SPEAKER_WORDS):
            rep.err(f"dialogue.speakers.{sp.get('id')}: worshipped figures have no lines (Story Bible §2)")

    # Lines: inline {id, speaker, text} or {id, line_ref}; collect ids.
    seen: dict[str, int] = {}
    line_ids: set[str] = set()
    refs: list[tuple[str, str]] = []
    choice_flags: set[str] = set()

    def note(i: Any) -> None:
        if isinstance(i, str):
            seen[i] = seen.get(i, 0) + 1

    def line(o: dict, where: str) -> None:
        note(o.get("id"))
        line_ids.add(o.get("id"))
        if "line_ref" in o:
            refs.append((o["line_ref"], where))
            return
        if o.get("speaker") not in speaker_ids:
            rep.err(f"{where}.{o.get('id')}: unknown speaker {o.get('speaker')!r}")
        if not is_loc(o.get("text")):
            rep.err(f"{where}.{o.get('id')}: line needs text {{vi, en}}")

    for cv in convs:
        cid = cv.get("id")
        note(cid)
        for o in cv.get("lines", []) + cv.get("after_choice", []):
            line(o, f"dialogue.{cid}")
        for v in cv.get("variants", []):
            for o in v.get("lines", []):
                line(o, f"dialogue.{cid}.variants")
        for ch in cv.get("choices", []):
            note(ch.get("id"))
            if not is_loc(ch.get("text")):
                rep.err(f"dialogue.{cid}.{ch.get('id')}: choice needs text {{vi, en}}")
            if not ch.get("response"):
                rep.err(f"dialogue.{cid}.{ch.get('id')}: choice needs a response")
            for o in ch.get("response", []):
                line(o, f"dialogue.{cid}.{ch.get('id')}")
            for ef in ch.get("effects", []):
                if ef.get("kind") not in CHOICE_EFFECT_KINDS:
                    rep.err(f"dialogue.{cid}.{ch.get('id')}: choice effect {ef.get('kind')!r} not allowed (choices change details only)")
                elif not str(ef.get("flag", "")).startswith(CHOICE_FLAG_PREFIX):
                    rep.err(f"dialogue.{cid}.{ch.get('id')}: choice may only set {CHOICE_FLAG_PREFIX}* flags, got {ef.get('flag')!r}")
                else:
                    choice_flags.add(ef["flag"])
        if cv.get("choices") and not cv.get("converges_to") and not cv.get("available"):
            rep.warn(f"dialogue.{cid}: choices without converges_to")
    for bk in barks:
        note(bk.get("id"))
        for o in bk.get("lines", []):
            line(o, f"dialogue.barks.{bk.get('id')}")
            if o.get("if_flag") and o["if_flag"] not in choice_flags:
                rep.err(f"dialogue.barks.{o.get('id')}: if_flag {o['if_flag']!r} is set by no choice")
    for sg in songs:
        note(sg.get("id"))
        if sg.get("singer") not in speaker_ids:
            rep.err(f"dialogue.songs.{sg.get('id')}: unknown singer {sg.get('singer')!r}")
        refs.append((sg.get("line_ref"), f"dialogue.songs.{sg.get('id')}"))

    strings_dlg = {d.get("id"): d for d in strings.get("dialogue", [])}
    for d in strings_dlg:
        note(d)
    all_line_refs = line_ids | set(strings_dlg)
    for r, where in refs:
        if r not in all_line_refs:
            rep.err(f"{where}: line_ref {r!r} unknown")
    # A reused strings.dialogue line must be allowed in the era of the conversation/song that reuses it.
    for owner in convs + songs:
        era = owner.get("era")
        olines = owner.get("lines", []) + owner.get("after_choice", []) + ([owner] if "singer" in owner else [])
        for o in olines:
            d = strings_dlg.get(o.get("line_ref"))
            if d and era not in (d.get("allowed_eras") or [d.get("era")]):
                rep.err(f"dialogue.{owner.get('id')}: reuses {d['id']} outside its eras ({era})")

    # ---- quests
    conv_ids = ids(convs)
    points = set((parse_world_points() or {}).keys())
    new_pts = qs.get("new_points", [])
    zones = {z.get("id"): z for z in mp.get("zones", [])}
    for npnt in new_pts:
        note(npnt.get("id"))
        if npnt.get("id") in points:
            rep.err(f"quests.new_points.{npnt.get('id')}: already in world.js")
        z = npnt.get("zone")
        if z == OFFMAP_ZONE:
            continue
        if z not in zones:
            rep.err(f"quests.new_points.{npnt.get('id')}: unknown zone {z!r}")
        elif not any(in_shape(npnt["x"], npnt["z"], sh) for sh in zones[z].get("shapes", [])):
            rep.err(f"quests.new_points.{npnt.get('id')}: ({npnt['x']}, {npnt['z']}) outside zone {z}")
    points |= ids(new_pts) | ids(mp.get("chests", [])) | ids(mp.get("environment_secrets", []))
    zone_ids = set(zones) | {l.get("id") for l in b["secrets"].get("locations", [])} | {"hub", "hub_bank"}
    recipes = ids(items.get("recipes", []))
    enemy_ids = ids(enemies.get("enemies", []))
    nc_ids = ids(enemies.get("non_combat_encounters", []))
    known = {"inspect": points, "interact": points, "open_chest": ids(mp.get("chests", [])),
             "environment_secret": ids(mp.get("environment_secrets", [])), "talk": conv_ids,
             "non_combat_success": nc_ids, "enter_zone": zone_ids, "boss_freed": enemy_ids, "craft": recipes}
    xp_ids = {x.get("id") for x in b["skills"].get("xp_sources", [])}
    gear_ids = ids(items.get("gear_0_3", {}).get("pieces", []))
    item_ids = ids(items.get("items", []))
    codex_ids = ids(b["codex"].get("entries", []))
    step_map: dict[str, dict] = {}
    mains = [q for q in quests if q.get("kind") == "main"]
    if len(mains) != 1:
        rep.err(f"quests: need exactly one main quest, found {len(mains)}")
    for q in quests:
        qid = q.get("id")
        note(qid)
        if q.get("giver") not in speaker_ids:
            rep.err(f"quests.{qid}: unknown giver {q.get('giver')!r}")
        steps = q.get("steps", [])
        if not steps:
            rep.err(f"quests.{qid}: no steps")
        if q.get("kind") == "main" and not MAIN_QUEST_STEPS[0] <= len(steps) <= MAIN_QUEST_STEPS[1]:
            rep.err(f"quests.{qid}: main quest needs {MAIN_QUEST_STEPS[0]}-{MAIN_QUEST_STEPS[1]} steps, has {len(steps)}")
        for st in steps:
            sid = st.get("id")
            note(sid)
            step_map[sid] = st
            for k in ("objective", "why"):
                if not is_loc(st.get(k)):
                    rep.err(f"quests.{qid}.{sid}: {k} must be {{vi, en}}")
            ok = st.get("objective_key")
            if ok not in ui:
                rep.err(f"quests.{qid}.{sid}: objective_key {ok!r} not in strings.ui")
            elif ui[ok] != st.get("objective"):
                rep.err(f"quests.{qid}.{sid}: objective differs from strings.ui.{ok}")
            if is_loc(st.get("objective")) and len(st["objective"]["vi"]) > OBJECTIVE_MAX_CHARS:
                rep.err(f"quests.{qid}.{sid}: objective longer than {OBJECTIVE_MAX_CHARS} characters (one line)")
            conds = (st.get("complete_when") or {}).get("all", [])
            if not conds:
                rep.err(f"quests.{qid}.{sid}: complete_when.all is empty")
            for c in conds:
                t = c.get("type")
                if t not in QUEST_CONDITION_TYPES:
                    rep.err(f"quests.{qid}.{sid}: unknown condition type {t!r}")
                elif c.get("ref") not in known[t]:
                    rep.err(f"quests.{qid}.{sid}: {t} ref {c.get('ref')!r} unknown")
            for r in (st.get("on_complete") or {}).get("lines", []):
                if r not in all_line_refs:
                    rep.err(f"quests.{qid}.{sid}: on_complete line {r!r} unknown")
        rw = q.get("reward") or {}
        if rw.get("xp_ref") and rw["xp_ref"] not in xp_ids:
            rep.err(f"quests.{qid}: xp_ref {rw['xp_ref']!r} not in skills.xp_sources")
        for it in rw.get("items", []):
            if it.get("item") not in item_ids:
                rep.err(f"quests.{qid}: reward item {it.get('item')!r} unknown")
        if rw.get("codex") and rw["codex"] not in codex_ids:
            rep.err(f"quests.{qid}: reward codex {rw['codex']!r} unknown")
        for flag, eff in (rw.get("by_choice") or {}).items():
            if flag not in choice_flags:
                rep.err(f"quests.{qid}: reward by_choice flag {flag!r} is set by no choice")
            for k in ("keep_gear", "lose_gear"):
                if eff.get(k) and eff[k] not in gear_ids:
                    rep.err(f"quests.{qid}: {k} {eff[k]!r} unknown")
    for cv in convs:
        if cv.get("converges_to") and cv["converges_to"] not in step_map:
            rep.err(f"dialogue.{cv.get('id')}: converges_to {cv['converges_to']!r} is no quest step")

    # ---- cinematics
    prompt_keys = set(ui)
    for c in cins:
        cid = c.get("id")
        note(cid)
        shots = c.get("shots", [])
        t = 0.0
        for sh in shots:
            note(sh.get("id"))
            if abs(sh.get("t_s", -1) - t) > 1e-6:
                rep.err(f"cinematics.{cid}.{sh.get('id')}: t_s {sh.get('t_s')} should be {round(t, 2)}")
            t += sh.get("duration_s", 0)
            if sh.get("era") and sh["era"] not in era_ids:
                rep.err(f"cinematics.{cid}.{sh.get('id')}: unknown era {sh['era']!r}")
            for r in sh.get("line_refs", []):
                if r not in all_line_refs:
                    rep.err(f"cinematics.{cid}.{sh.get('id')}: line_ref {r!r} unknown")
                d = strings_dlg.get(r)
                se = sh.get("era") or c.get("era")
                if d and se not in (d.get("allowed_eras") or [d.get("era")]):
                    rep.err(f"cinematics.{cid}.{sh.get('id')}: {r} shown outside its eras ({se})")
            for k in ("title_key",):
                if sh.get(k) and sh[k] not in prompt_keys:
                    rep.err(f"cinematics.{cid}.{sh.get('id')}: {k} {sh[k]!r} not in strings.ui")
            ia = sh.get("interactive")
            if ia and ia.get("prompt_key") not in prompt_keys:
                rep.err(f"cinematics.{cid}.{sh.get('id')}: prompt_key {ia.get('prompt_key')!r} not in strings.ui")
            if sh.get("objective_ref") and sh["objective_ref"] not in step_map:
                rep.err(f"cinematics.{cid}.{sh.get('id')}: objective_ref unknown")
        if abs(t - c.get("total_s", -1)) > 1e-6:
            rep.err(f"cinematics.{cid}: shots sum to {round(t, 2)} s, total_s is {c.get('total_s')}")
        if c.get("role") == "cold_open":
            if t > COLD_OPEN_MAX_S:
                rep.err(f"cinematics.{cid}: cold open is {round(t, 2)} s (> {COLD_OPEN_MAX_S} s)")
            mq = mains[0] if len(mains) == 1 else {}
            if c.get("objective_ref") not in ids(mq.get("steps", [])):
                rep.err(f"cinematics.{cid}: cold open must show a main-quest objective")
            if not is_loc(c.get("dramatic_question")):
                rep.err(f"cinematics.{cid}: cold open needs a dramatic_question {{vi, en}}")
        if not c.get("skippable"):
            rep.err(f"cinematics.{cid}: every cinematic must be skippable (accessibility)")
        for hs in c.get("then_handoff_steps", []) + c.get("replaces_handoff_steps", []):
            if hs not in ids(lineage.get("handoff", {}).get("steps", [])):
                rep.err(f"cinematics.{cid}: handoff step {hs!r} unknown")

    for k, v in seen.items():
        if v > 1:
            rep.err(f"story 0.4: duplicate id {k!r} ({v}x)")


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
