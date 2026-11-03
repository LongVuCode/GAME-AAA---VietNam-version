#!/usr/bin/env python3
"""Research data validator and Markdown renderer.

Usage:
    python3 tools/research_tool.py lint
    python3 tools/research_tool.py render
"""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "research" / "data"
OUT = ROOT / "research" / "generated"

LABELS = {"SỬ LIỆU", "SỬ LIỆU-TRANH LUẬN", "HUYỀN THOẠI", "CỔ TÍCH", "SÁNG TẠO", "CHƯA XÁC MINH"}
HISTORICAL = {"SỬ LIỆU", "SỬ LIỆU-TRANH LUẬN"}
SENSITIVITY = {"low", "med", "high", "exclude"}
GAME_USE = {"candidate", "background", "excluded", "in_game"}
VERIFICATION = {"A", "B", "C"}
# Analysis, not independent evidence: never counts toward the 2-lineage rule.
NON_EVIDENTIAL = {"MODERN_SCHOLARSHIP", "LITERARY", "FOLK_ORAL"}


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def load(name: str, base: Path = DATA) -> dict:
    with open(base / name, encoding="utf-8") as f:
        return json.load(f)


def check_item(item: dict, sources: dict[str, dict], rep: Report, is_myth: bool = False) -> None:
    iid = item.get("id", "?")
    label = item.get("label")
    if label not in LABELS:
        rep.errors.append(f"{iid}: invalid label {label!r}")
    if item.get("sensitivity") not in SENSITIVITY:
        rep.errors.append(f"{iid}: invalid sensitivity {item.get('sensitivity')!r}")
    use = item.get("game_use")
    if use not in GAME_USE:
        rep.errors.append(f"{iid}: invalid game_use {use!r}")
    ver = item.get("verification")
    if ver not in VERIFICATION:
        rep.errors.append(f"{iid}: invalid verification {ver!r}")

    srcs = item.get("sources", [])
    if not srcs:
        rep.errors.append(f"{iid}: no sources")
    unknown = [s for s in srcs if s not in sources]
    if unknown:
        rep.errors.append(f"{iid}: unknown source ids {unknown}")

    # Unverified content can never reach the game.
    if label == "CHƯA XÁC MINH" and use != "excluded":
        rep.errors.append(f"{iid}: CHƯA XÁC MINH must have game_use=excluded")
    if item.get("sensitivity") == "exclude" and use != "excluded":
        rep.errors.append(f"{iid}: sensitivity=exclude must have game_use=excluded")
    if use == "in_game":
        if ver != "A":
            rep.errors.append(f"{iid}: in_game requires verification A")
        if not item.get("reviewed_by"):
            rep.errors.append(f"{iid}: in_game requires reviewed_by (human historian)")
        if not item.get("citations"):
            rep.errors.append(f"{iid}: in_game requires page-level citations")

    # Worship rules (VERDICT C1): a worshipped figure's artifacts never go to the player.
    for key in ("worshipped", "player_can_wield"):
        if key in item and not isinstance(item[key], bool):
            rep.errors.append(f"{iid}: {key} must be a boolean")
    if item.get("worshipped") is True and item.get("player_can_wield") is True:
        rep.errors.append(f"{iid}: worshipped figures' artifacts cannot be player_can_wield")
    if is_myth:
        missing = [k for k in ("worshipped", "player_can_wield") if k not in item]
        if missing:
            rep.errors.append(f"{iid}: missing {missing}")

    if label in HISTORICAL:
        lineages = {sources[s]["lineage"] for s in srcs if s in sources} - NON_EVIDENTIAL
        if len(lineages) < 2:
            msg = f"{iid}: {label} needs >=2 independent evidential lineages, has {sorted(lineages)}"
            if label == "SỬ LIỆU" and ver in {"A", "B"}:
                rep.errors.append(msg)
            else:
                rep.warnings.append(msg)


def lint(base: Path = DATA) -> Report:
    rep = Report()
    sources = {s["id"]: s for s in load("sources.json", base)["sources"]}
    seen: set[str] = set()
    for fname, key in (("timeline.json", "events"), ("myths.json", "myths")):
        for item in load(fname, base)[key]:
            iid = item.get("id")
            if iid in seen:
                rep.errors.append(f"{iid}: duplicate id")
            seen.add(iid)
            check_item(item, sources, rep, is_myth=(key == "myths"))
    return rep


def _src_list(ids: list[str], sources: dict[str, dict]) -> str:
    return ", ".join(f"{i} ({sources[i]['title']})" if i in sources else i for i in ids)


def render(base: Path = DATA, out: Path = OUT) -> list[Path]:
    out.mkdir(parents=True, exist_ok=True)
    sources = {s["id"]: s for s in load("sources.json", base)["sources"]}
    written = []

    lines = ["# Dòng thời gian Việt Nam (sinh tự động — KHÔNG sửa tay)", "",
             "Nguồn: `research/data/timeline.json`. Nhãn và mức xác minh xem `docs/RESEARCH_PROTOCOL.md`.", "",
             "| ID | Thời kỳ | Năm | Sự kiện | Nhãn | Nguồn | Nhạy cảm | Dùng | XM |",
             "|---|---|---|---|---|---|---|---|---|"]
    for e in load("timeline.json", base)["events"]:
        lines.append(f"| {e['id']} | {e['era']} | {e['year']} | {e['title']} | [{e['label']}] | "
                     f"{', '.join(e['sources'])} | {e['sensitivity']} | {e['game_use']} | {e['verification']} |")
    lines += ["", "## Chi tiết và tranh luận", ""]
    for e in load("timeline.json", base)["events"]:
        lines.append(f"### {e['id']} — {e['title']} ({e['year']}) [{e['label']}]")
        if e.get("summary"):
            lines.append(e["summary"])
        if e.get("dispute"):
            lines.append(f"- **Tranh luận/lưu ý:** {e['dispute']}")
        lines.append(f"- **Nguồn:** {_src_list(e['sources'], sources)}")
        lines.append("")
    p = out / "TIMELINE.md"
    p.write_text("\n".join(lines), encoding="utf-8")
    written.append(p)

    lines = ["# Danh mục thần thoại – truyền thuyết – cổ tích (sinh tự động — KHÔNG sửa tay)", "",
             "Nguồn: `research/data/myths.json`.", ""]
    for m in load("myths.json", base)["myths"]:
        lines.append(f"## {m['id']} — {m['title']} [{m['label']}]")
        lines.append(f"- **Vùng:** {m['region']} · **Nhạy cảm:** {m['sensitivity']} · "
                     f"**Dùng:** {m['game_use']} · **Xác minh:** {m['verification']}")
        sites = ", ".join(m.get("worship_sites") or []) or "—"
        lines.append(f"- **Được thờ:** {'có' if m.get('worshipped') else 'không'} · "
                     f"**Người chơi được cầm vật:** {'có' if m.get('player_can_wield') else 'không'} · "
                     f"**Văn bản sớm nhất:** {m.get('earliest_text_century', '—')}")
        lines.append(f"- **Nơi thờ / lễ hội:** {sites}")
        lines.append(f"- **Tóm tắt:** {m['summary']}")
        if m.get("variants"):
            lines.append("- **Dị bản:**")
            lines += [f"  - {v}" for v in m["variants"]]
        if m.get("canon") and m["canon"] != "—":
            lines.append(f"- **Canon của game:** {m['canon']}")
        if m.get("note"):
            lines.append(f"- **Lưu ý thể hiện:** {m['note']}")
        lines.append(f"- **Tiềm năng gameplay:** {m['gameplay']}")
        lines.append(f"- **Nguồn:** {_src_list(m['sources'], sources)}")
        lines.append("")
    p = out / "MYTH_CATALOG.md"
    p.write_text("\n".join(lines), encoding="utf-8")
    written.append(p)
    return written


def main(argv: list[str]) -> int:
    cmd = argv[1] if len(argv) > 1 else "lint"
    if cmd == "lint":
        rep = lint()
        for w in rep.warnings:
            print(f"WARN  {w}")
        for e in rep.errors:
            print(f"ERROR {e}")
        print(f"lint: {len(rep.errors)} error(s), {len(rep.warnings)} warning(s)")
        return 1 if rep.errors else 0
    if cmd == "render":
        for p in render():
            print(f"wrote {p.relative_to(ROOT)}")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
