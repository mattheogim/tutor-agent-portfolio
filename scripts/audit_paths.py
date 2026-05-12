#!/usr/bin/env python3
"""Path reference auditor — scan repo for codenotes/ and HTML references, classify by type, emit JSONL manifest."""

import json
import os
import re
import sys
from pathlib import Path
from typing import Iterator

REPO_ROOT = Path("/Users/matteokim/claude-tutor")

# Directories to skip entirely
EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    ".claude/worktrees",
    ".claire",
    "dist",
    "build",
    "__pycache__",
    ".next",
    ".turbo",
    ".claude/research/path_audit",  # don't scan our own output
}

# File extensions we scan (text files)
INCLUDE_EXT = {
    ".md",
    ".json",
    ".jsonl",
    ".yaml",
    ".yml",
    ".toml",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".sh",
    ".cpp",
    ".h",
    ".c",
    ".hpp",
    ".css",
    ".html",
    ".txt",
}

# Patterns to hunt (regex)
PATTERNS = {
    "codenotes": [
        # bare path
        (re.compile(r'(?<!/)codenotes/'), "bare_path"),
        # fully qualified (already cmpt125/Donaldson prefix)
        (re.compile(r'cmpt125/Donaldson/codenotes'), "qualified_path"),
        # glob patterns in permissions
        (re.compile(r'\*\*/codenotes/\*\*'), "glob_pattern"),
        # absolute path
        (re.compile(r'/Users/matteokim/claude-tutor/codenotes'), "absolute_path"),
        # as a naked word (comment references like "see codenotes")
        (re.compile(r'\bcodenotes\b(?!/)'), "word_reference"),
    ],
    "html": [
        (re.compile(r'\bbubble_selection_visual\.html\b'), "html_ref"),
        (re.compile(r'\bcmpt125_final_prep\.html\b'), "html_ref"),
        (re.compile(r'\bcmpt125_quiz_interactive\.html\b'), "html_ref"),
        (re.compile(r'\binsertion_sort_visual\.html\b'), "html_ref"),
    ],
}

# Rules for classifying hits (decide action)
# action: "rewrite" | "skip" | "review"
# rationale: why
def classify_hit(file_path: Path, line_text: str, match_type: str) -> tuple[str, str, str]:
    """Return (hit_type, action, risk)."""
    rel = file_path.relative_to(REPO_ROOT).as_posix()

    # Historical: sessions log — keep history
    if "analytics/sessions.jsonl" in rel or "analytics/learning_events.jsonl" in rel:
        return ("log_historical", "skip", "low")

    # Historical: .versions/ automatic backups
    if "/.versions/" in rel:
        return ("archive_backup", "skip", "low")

    # Historical: worktrees snapshots
    if "/.claude/worktrees/" in rel or "/.claire/" in rel:
        return ("worktree_snapshot", "skip", "low")

    # Audit research docs (current, actionable)
    if rel.startswith(".claude/research/") and rel.endswith(".md"):
        # These are our own audit findings — update them
        return ("audit_doc", "rewrite", "low")

    # Audit registry / L0 hashes (live reference files)
    if rel.startswith(".claude/research/") and rel.endswith(".json"):
        return ("audit_config", "rewrite", "high")

    # Conversation history session summaries (historical)
    if rel.startswith("conversation_history/session_summaries/"):
        return ("session_summary_archive", "skip", "low")

    # Conversation history monthly rollups / archive
    if rel.startswith("conversation_history/"):
        return ("conversation_archive", "skip", "low")

    # Claude plans (live plan docs)
    if rel.startswith(".claude/plans/"):
        return ("plan_doc", "rewrite", "medium")

    # Claude TODO
    if rel == ".claude/TODO.md":
        return ("todo", "rewrite", "medium")

    # Claude settings
    if rel.startswith(".claude/settings"):
        return ("settings", "rewrite", "high")

    # Top-level HTML (architecture / kg viewer etc)
    if rel.endswith(".html") and "/" not in rel:
        return ("html_doc", "rewrite", "medium")

    # Analysis docs (cmpt125/Donaldson/analysis/*.md) — rewrite
    if rel.startswith("cmpt125/") and "/analysis/" in rel and rel.endswith(".md"):
        return ("analysis_doc", "rewrite", "medium")

    # Eval work dir (snapshots, historical)
    if rel.startswith("eval/work/"):
        return ("eval_snapshot", "skip", "low")

    # Eval scenarios (live)
    if rel.startswith("eval/") and rel.endswith(".md"):
        return ("eval_scenario", "rewrite", "low")

    # Skill permission (allow/deny patterns)
    if rel.startswith("skills/") and rel.endswith("SKILL.md"):
        if "Read(" in line_text or "Write(" in line_text or "allow:" in line_text or "deny:" in line_text:
            return ("skill_permission", "rewrite", "high")
        # Other skill content (descriptions, inline refs)
        return ("skill_content", "rewrite", "medium")

    # Course-level config/spec docs
    if rel.endswith("/exam_brief.md") or rel.endswith("/course_directives.md"):
        return ("course_config", "rewrite", "medium")

    # Practice exam questions
    if "/questions/practice_exams/" in rel:
        return ("practice_exam", "rewrite", "medium")

    # TypeScript src
    if rel.startswith("src/") and (rel.endswith(".ts") or rel.endswith(".tsx")):
        return ("src_ts", "rewrite", "high")

    # Section plans (citations)
    if "/section_plan.md" in rel:
        if "Codenotes:" in line_text or "codenotes/" in line_text or "Slides:" in line_text:
            return ("section_plan_citation", "rewrite", "high")

    # Code notes
    if "/code_notes.md" in rel:
        return ("code_notes_citation", "rewrite", "high")

    # Meta config
    if rel.endswith("meta_index.json") or rel.endswith("knowledge_graph.json"):
        return ("config", "rewrite", "high")

    # Test files
    if "__tests__" in rel or rel.endswith(".test.ts") or rel.endswith(".test.js"):
        return ("test", "rewrite", "medium")

    # Main config docs
    if rel in {"CLAUDE.md", "AGENTS.md", "README.md"}:
        return ("main_doc", "rewrite", "medium")

    # Sections
    if rel.startswith(".claude/sections/"):
        return ("section_doc", "rewrite", "medium")

    # Agents
    if rel.startswith(".claude/agents/"):
        return ("agent_doc", "rewrite", "medium")

    # Python scripts
    if rel.startswith("scripts/") and rel.endswith(".py"):
        return ("script", "rewrite", "medium")

    # Notes files (L0 prof notes) — should NOT contain codenotes/ refs typically
    if "/notes.md" in rel or "/notes_old_summary.md" in rel:
        return ("notes_l0", "review", "medium")

    # Glossary
    if "/glossary/" in rel:
        return ("glossary", "rewrite", "low")

    # Personal (live study docs + session state)
    if "/personal/" in rel:
        return ("personal", "rewrite", "low")

    # Fallback
    return ("unknown", "review", "medium")


def scan_file(file_path: Path, patterns: list, target: str) -> list[dict]:
    """Scan one file for pattern matches, return hit dicts."""
    hits = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            for lineno, line in enumerate(f, start=1):
                for regex, match_type in patterns:
                    for m in regex.finditer(line):
                        hit_type, action, risk = classify_hit(file_path, line, match_type)
                        hits.append({
                            "file": file_path.relative_to(REPO_ROOT).as_posix(),
                            "line": lineno,
                            "col": m.start() + 1,
                            "match_text": m.group(0),
                            "match_type": match_type,
                            "surrounding": line.rstrip("\n")[:200],
                            "target": target,
                            "hit_type": hit_type,
                            "action": action,
                            "risk": risk,
                        })
    except Exception as e:
        print(f"ERROR scanning {file_path}: {e}", file=sys.stderr)
    return hits


def walk_files() -> Iterator[Path]:
    """Walk repo, yielding eligible files."""
    for root, dirs, files in os.walk(REPO_ROOT):
        # Skip excluded dirs
        rel_root = Path(root).relative_to(REPO_ROOT).as_posix()
        dirs[:] = [
            d for d in dirs
            if not any((rel_root + "/" + d).startswith(ex) or rel_root + "/" + d == ex or d == Path(ex).name
                       for ex in EXCLUDE_DIRS)
        ]
        # Extra check for deeper paths
        if any(ex in rel_root for ex in EXCLUDE_DIRS):
            continue
        for fname in files:
            p = Path(root) / fname
            if p.suffix in INCLUDE_EXT:
                yield p


def main():
    output_dir = REPO_ROOT / ".claude/research/path_audit"
    output_dir.mkdir(parents=True, exist_ok=True)

    all_hits = {"codenotes": [], "html": []}

    file_count = 0
    for p in walk_files():
        file_count += 1
        for target, patterns in PATTERNS.items():
            all_hits[target].extend(scan_file(p, patterns, target))

    # Write manifests
    for target, hits in all_hits.items():
        out_path = output_dir / f"{target}_refs.jsonl"
        with open(out_path, "w", encoding="utf-8") as f:
            for h in hits:
                f.write(json.dumps(h, ensure_ascii=False) + "\n")

    # Summary
    summary = {
        "scanned_files": file_count,
        "targets": {},
    }
    for target, hits in all_hits.items():
        by_action = {}
        by_hit_type = {}
        by_risk = {}
        by_file_count = len(set(h["file"] for h in hits))
        for h in hits:
            by_action[h["action"]] = by_action.get(h["action"], 0) + 1
            by_hit_type[h["hit_type"]] = by_hit_type.get(h["hit_type"], 0) + 1
            by_risk[h["risk"]] = by_risk.get(h["risk"], 0) + 1
        summary["targets"][target] = {
            "total_hits": len(hits),
            "unique_files": by_file_count,
            "by_action": by_action,
            "by_hit_type": by_hit_type,
            "by_risk": by_risk,
        }

    summary_path = output_dir / "summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
