#!/usr/bin/env python3
"""Summarize gcov line coverage for a CMake build tree (no gcovr needed).

Runs `gcov` (or `llvm-cov gcov` for clang builds) on every .gcda file found under
--build-dir, parses the produced .gcov text files, merges per source file (a line counts
as covered if any translation unit executed it) and prints a per-file table.

Usage (ArpgCore):
  cmake -S game/Source/ArpgCore -B build/arpgcore-cov -G Ninja -DCMAKE_BUILD_TYPE=Debug -DARPGCORE_COVERAGE=ON
  cmake --build build/arpgcore-cov && ctest --test-dir build/arpgcore-cov
  cmake --build build/arpgcore-cov --target coverage      # calls this script
  # or directly:
  python3 tools/coverage_summary.py --build-dir build/arpgcore-cov \
      --filter game/Source/ArpgCore/Private/ --target-filter game/Source/ArpgCore/Private/ --min-percent 80

Exit code: 0 if the --target-filter total is >= --min-percent (or no threshold), 1 otherwise,
2 on usage/tool errors.
"""
from __future__ import annotations

import argparse
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field


@dataclass
class FileCoverage:
    path: str
    lines: dict[int, int] = field(default_factory=dict)  # line number -> hit count (max over TUs)

    def merge(self, line: int, hits: int) -> None:
        self.lines[line] = max(self.lines.get(line, 0), hits)

    @property
    def executable(self) -> int:
        return len(self.lines)

    @property
    def covered(self) -> int:
        return sum(1 for hits in self.lines.values() if hits > 0)


def parse_gcov_file(path: str) -> tuple[str | None, list[tuple[int, int]]]:
    """Returns (source path, [(line, hits)]) for executable lines of one .gcov file."""
    source = None
    entries: list[tuple[int, int]] = []
    with open(path, encoding="utf-8", errors="replace") as handle:
        for raw in handle:
            parts = raw.split(":", 2)
            if len(parts) < 3:
                continue
            count, number = parts[0].strip(), parts[1].strip()
            if number == "0":
                if parts[2].startswith("Source:"):
                    source = parts[2][len("Source:"):].strip()
                continue
            if count == "-" or not number.isdigit():
                continue
            if count in ("#####", "====="):
                hits = 0
            else:
                digits = count.rstrip("*")
                if not digits.isdigit():
                    continue
                hits = int(digits)
            entries.append((int(number), hits))
    return source, entries


def resolve(path: str, base: str) -> str:
    return os.path.realpath(path if os.path.isabs(path) else os.path.join(base, path))


def collect(build_dir: str, gcov_cmd: list[str]) -> dict[str, FileCoverage]:
    files: dict[str, FileCoverage] = {}
    gcda_files = []
    for root, _dirs, names in os.walk(build_dir):
        gcda_files.extend(os.path.join(root, n) for n in names if n.endswith(".gcda"))
    if not gcda_files:
        print(f"error: no .gcda files under {build_dir} (build with coverage and run the tests first)",
              file=sys.stderr)
        sys.exit(2)

    work = tempfile.mkdtemp(prefix="gcov_")
    try:
        for gcda in sorted(gcda_files):
            obj_dir = os.path.dirname(gcda)
            result = subprocess.run(gcov_cmd + ["-p", "-o", obj_dir, gcda], cwd=work,
                                    capture_output=True, text=True, check=False)
            if result.returncode != 0:
                print(f"warning: gcov failed for {gcda}: {result.stderr.strip()}", file=sys.stderr)
            for name in os.listdir(work):
                full = os.path.join(work, name)
                if name.endswith(".gcov"):
                    source, entries = parse_gcov_file(full)
                    if source:
                        key = resolve(source, obj_dir)
                        cov = files.setdefault(key, FileCoverage(key))
                        for line, hits in entries:
                            cov.merge(line, hits)
                os.remove(full)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return files


def summarize(files: list[FileCoverage]) -> tuple[int, int]:
    return sum(f.covered for f in files), sum(f.executable for f in files)


def pct(covered: int, total: int) -> float:
    return 100.0 * covered / total if total else 100.0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--build-dir", required=True)
    parser.add_argument("--gcov", default="gcov", help='gcov command, e.g. "gcov" or "llvm-cov gcov"')
    parser.add_argument("--filter", action="append", default=[],
                        help="only report sources under this path prefix (repeatable)")
    parser.add_argument("--target-filter", default=None,
                        help="path prefix whose total is compared to --min-percent")
    parser.add_argument("--min-percent", type=float, default=None)
    args = parser.parse_args()

    gcov_cmd = shlex.split(args.gcov)
    if shutil.which(gcov_cmd[0]) is None and not os.path.exists(gcov_cmd[0]):
        print(f"error: gcov tool not found: {gcov_cmd[0]}", file=sys.stderr)
        return 2

    all_files = collect(os.path.realpath(args.build_dir), gcov_cmd)
    filters = [os.path.realpath(f) for f in args.filter]
    selected = sorted((f for f in all_files.values()
                       if not filters or any(f.path.startswith(p) for p in filters)),
                      key=lambda f: f.path)
    if not selected:
        print("error: no sources matched the filters", file=sys.stderr)
        return 2

    common = os.path.commonpath([f.path for f in selected]) if len(selected) > 1 else os.path.dirname(selected[0].path)
    width = max(len(os.path.relpath(f.path, common)) for f in selected)
    print(f"{'File':<{width}}  {'Lines':>6}  {'Exec':>6}  {'Cover':>7}")
    print("-" * (width + 25))
    for f in selected:
        print(f"{os.path.relpath(f.path, common):<{width}}  {f.executable:>6}  {f.covered:>6}  "
              f"{pct(f.covered, f.executable):>6.1f}%")
    covered, total = summarize(selected)
    print("-" * (width + 25))
    print(f"{'TOTAL (reported files)':<{width}}  {total:>6}  {covered:>6}  {pct(covered, total):>6.1f}%")

    if args.target_filter:
        target = os.path.realpath(args.target_filter)
        target_files = [f for f in selected if f.path.startswith(target)]
        t_cov, t_total = summarize(target_files)
        t_pct = pct(t_cov, t_total)
        print(f"TARGET {args.target_filter}: {t_cov}/{t_total} lines = {t_pct:.1f}%"
              + (f" (threshold {args.min_percent:.1f}%)" if args.min_percent is not None else ""))
        if args.min_percent is not None and t_pct + 1e-9 < args.min_percent:
            print("COVERAGE BELOW THRESHOLD", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
