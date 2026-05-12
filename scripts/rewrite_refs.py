#!/usr/bin/env python3
"""Rewrite path references per manifest. Supports dry-run + apply modes.

Usage:
    # Dry run (generate diff preview)
    python3 scripts/rewrite_refs.py --target codenotes --dry-run

    # Apply (in-place edit)
    python3 scripts/rewrite_refs.py --target codenotes --apply

Flow:
    1. Load manifest (.claude/research/path_audit/{target}_refs.jsonl)
    2. For each hit with action=rewrite:
       - Compute new text based on match_type
       - Check for idempotency (skip if already rewritten)
    3. Apply grouped by file (read, modify, write)
    4. Record changes to rewrite_log.md
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path("/Users/matteokim/claude-tutor")

# Rewrite rules per target
REWRITES = {
    "codenotes": [
        # "codenotes/" → "cmpt125/Donaldson/codenotes/"
        # Skip if already qualified (cmpt125/Donaldson/codenotes/)
        # Skip if glob pattern (**/codenotes/**)
        {
            "name": "codenotes_path",
            "description": "codenotes/ → cmpt125/Donaldson/codenotes/ (path references, not glob patterns)",
            "pattern": re.compile(r'(?<!cmpt125/Donaldson/)(?<!\*\*/)codenotes/'),
            "replacement": "cmpt125/Donaldson/codenotes/",
            "guard": None,
        },
        # Absolute path
        {
            "name": "absolute_codenotes",
            "description": "/Users/matteokim/claude-tutor/codenotes → .../cmpt125/Donaldson/codenotes",
            "pattern": re.compile(r'/Users/matteokim/claude-tutor/codenotes'),
            "replacement": "/Users/matteokim/claude-tutor/cmpt125/Donaldson/codenotes",
            "guard": None,
        },
        # Glob patterns **/codenotes/** stay as-is (they're path-independent)
        # But we add a note: "bare_word" references in text context may be left alone
    ],
    "html": [
        {
            "name": "html_bubble",
            "pattern": re.compile(r'(?<![\w/])bubble_selection_visual\.html'),
            "replacement": "cmpt125/Donaldson/visualizations/bubble_selection_visual.html",
            "guard": lambda line: "visualizations/bubble_selection_visual" not in line,
        },
        {
            "name": "html_final_prep",
            "pattern": re.compile(r'(?<![\w/])cmpt125_final_prep\.html'),
            "replacement": "cmpt125/Donaldson/visualizations/cmpt125_final_prep.html",
            "guard": lambda line: "visualizations/cmpt125_final_prep" not in line,
        },
        {
            "name": "html_quiz",
            "pattern": re.compile(r'(?<![\w/])cmpt125_quiz_interactive\.html'),
            "replacement": "cmpt125/Donaldson/visualizations/cmpt125_quiz_interactive.html",
            "guard": lambda line: "visualizations/cmpt125_quiz_interactive" not in line,
        },
        {
            "name": "html_insertion",
            "pattern": re.compile(r'(?<![\w/])insertion_sort_visual\.html'),
            "replacement": "cmpt125/Donaldson/visualizations/insertion_sort_visual.html",
            "guard": lambda line: "visualizations/insertion_sort_visual" not in line,
        },
    ],
}


def load_manifest(target: str) -> list[dict]:
    path = REPO / ".claude/research/path_audit" / f"{target}_refs.jsonl"
    hits = []
    with open(path) as f:
        for line in f:
            hits.append(json.loads(line))
    return hits


def apply_rewrites(file_path: Path, rules: list[dict], dry_run: bool) -> tuple[int, list[str]]:
    """Return (change_count, diff_lines)."""
    try:
        original = file_path.read_text(encoding="utf-8")
    except Exception as e:
        return (0, [f"ERROR read {file_path}: {e}"])

    modified = original
    changes = []
    for rule in rules:
        def replacer(m, rule=rule):
            if rule["guard"] and not rule["guard"](m.string[max(0, m.start() - 100):m.end() + 100]):
                return m.group(0)
            return rule["replacement"]

        new = rule["pattern"].sub(replacer, modified)
        if new != modified:
            changes.append(f"  {rule['name']}: {modified.count(rule['pattern'].pattern) if False else '?'} changes")
            modified = new

    change_count = sum(1 for a, b in zip(original.split("\n"), modified.split("\n")) if a != b)
    if original == modified:
        return (0, [])

    diff_lines = []
    orig_lines = original.split("\n")
    new_lines = modified.split("\n")
    for i, (a, b) in enumerate(zip(orig_lines, new_lines), start=1):
        if a != b:
            diff_lines.append(f"L{i}")
            diff_lines.append(f"- {a}")
            diff_lines.append(f"+ {b}")

    if not dry_run:
        file_path.write_text(modified, encoding="utf-8")

    return (change_count, diff_lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", required=True, choices=["codenotes", "html"])
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    if not args.dry_run and not args.apply:
        print("ERROR: must specify --dry-run or --apply", file=sys.stderr)
        sys.exit(2)

    manifest = load_manifest(args.target)
    # Filter to action=rewrite
    rewrite_hits = [h for h in manifest if h["action"] == "rewrite"]
    print(f"[{args.target}] Total hits: {len(manifest)}, action=rewrite: {len(rewrite_hits)}")

    # Group by file
    by_file = defaultdict(list)
    for h in rewrite_hits:
        by_file[h["file"]].append(h)

    rules = REWRITES[args.target]
    summary = {"files_changed": 0, "total_lines_changed": 0, "per_file": []}
    out_dir = REPO / ".claude/research/path_audit"
    diff_file = out_dir / f"{args.target}_rewrite_diff_{'dryrun' if args.dry_run else 'applied'}.txt"
    log_lines = [f"# Rewrite diff — target={args.target} mode={'dry-run' if args.dry_run else 'applied'}\n"]

    for file_rel in sorted(by_file.keys()):
        fp = REPO / file_rel
        if not fp.exists():
            log_lines.append(f"\n## {file_rel} (MISSING)\n")
            continue
        n_changed, diff = apply_rewrites(fp, rules, args.dry_run)
        if n_changed > 0:
            summary["files_changed"] += 1
            summary["total_lines_changed"] += n_changed
            summary["per_file"].append({"file": file_rel, "lines_changed": n_changed})
            log_lines.append(f"\n## {file_rel}  ({n_changed} lines)\n")
            log_lines.extend(diff[:60])  # cap per-file diff
            if len(diff) > 60:
                log_lines.append(f"... (+{len(diff) - 60} more)\n")

    with open(diff_file, "w") as f:
        f.write("\n".join(log_lines))

    summary_file = out_dir / f"{args.target}_rewrite_{'dryrun' if args.dry_run else 'applied'}_summary.json"
    with open(summary_file, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\nFiles changed: {summary['files_changed']}")
    print(f"Lines changed: {summary['total_lines_changed']}")
    print(f"Diff log:    {diff_file}")
    print(f"Summary:     {summary_file}")
    if args.dry_run:
        print(f"\n⚠️  DRY RUN — no files modified. Review diff then re-run with --apply.")


if __name__ == "__main__":
    main()
