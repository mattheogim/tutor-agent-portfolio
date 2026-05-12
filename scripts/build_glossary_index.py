"""Build glossary _index.json — maps term names + aliases to glossary filenames."""

import json
import re
from datetime import date
from pathlib import Path

GLOSSARY_DIR = Path(__file__).resolve().parent.parent / "cmpt125" / "Donaldson" / "glossary"

def extract_aliases(filepath: Path) -> list[str]:
    """Extract aliases from YAML frontmatter if present."""
    text = filepath.read_text(encoding="utf-8")
    # Match YAML frontmatter
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return []
    frontmatter = m.group(1)
    # Extract aliases line: aliases: [a, b, c]
    alias_match = re.search(r"aliases:\s*\[([^\]]*)\]", frontmatter)
    if not alias_match:
        return []
    raw = alias_match.group(1)
    return [a.strip().strip("'\"") for a in raw.split(",") if a.strip()]

def build_index() -> dict:
    terms = {}
    for f in sorted(GLOSSARY_DIR.glob("*.md")):
        if f.name.startswith("_"):
            continue
        stem = f.stem  # e.g. "const method"
        # Add filename stem as primary term
        terms[stem.lower()] = f.name
        # Add aliases
        for alias in extract_aliases(f):
            terms[alias.lower()] = f.name
    return {
        "generated": str(date.today()),
        "count": len([f for f in GLOSSARY_DIR.glob("*.md") if not f.name.startswith("_")]),
        "terms": dict(sorted(terms.items())),
    }

if __name__ == "__main__":
    index = build_index()
    out = GLOSSARY_DIR / "_index.json"
    out.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"✅ Glossary index: {index['count']} files → {len(index['terms'])} terms → {out}")
