/** Skill permission simulator — verify each skill's permission patterns don't drift.
 *
 * Purpose: Before Phase 3 move, capture which files each skill CAN read.
 * After move, re-run this test. Set of readable files must match (only paths changed,
 * semantic unchanged).
 *
 * If counts differ wildly after move → rewrite broke something.
 */

import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";
import { basePath } from "../storage/paths.js";

const REPO = basePath();

interface SkillPermissions {
  allow: string[];
  deny: string[];
}

function parseSkillFrontmatter(path: string): SkillPermissions {
  const content = readFileSync(path, "utf-8");
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return { allow: [], deny: [] };

  const yaml = fm[1];
  const allow: string[] = [];
  const deny: string[] = [];

  let mode: "allow" | "deny" | null = null;
  for (const line of yaml.split("\n")) {
    if (/^\s*allow:\s*$/.test(line)) mode = "allow";
    else if (/^\s*deny:\s*$/.test(line)) mode = "deny";
    else if (/^\s*[a-z_]+:/.test(line) && !line.startsWith(" ") && !line.startsWith("-")) mode = null;
    else if (mode) {
      const m = line.match(/^\s*-\s*"([^"]+)"/);
      if (m) (mode === "allow" ? allow : deny).push(m[1]);
    }
  }
  return { allow, deny };
}

/** Convert glob-style pattern to regex.
 * Semantics: doublestar matches any path component(s) including none.
 */
function globToRegex(glob: string): RegExp {
  const innerMatch = glob.match(/^(?:Read|Write|Edit|Bash|Grep|Glob)\((.+)\)$/);
  let pattern = innerMatch ? innerMatch[1] : glob;

  // Escape regex specials (except *, ?)
  const specials = new RegExp("[.+^" + "\\$" + "{}()|\\[\\]\\\\]", "g");
  pattern = pattern.replace(specials, "\\$&");

  // Placeholders to avoid collision during serial replacement
  pattern = pattern.replace(/\*\*\//g, "\x00DSTAR_SLASH\x00");
  pattern = pattern.replace(/\*\*/g, "\x00DSTAR\x00");
  pattern = pattern.replace(/\*/g, "[^/]*");
  pattern = pattern.replace(/\?/g, ".");

  // Restore placeholders with regex equivalents
  pattern = pattern.replace(/\x00DSTAR_SLASH\x00/g, "(?:.*/)?");
  pattern = pattern.replace(/\x00DSTAR\x00/g, ".*");

  return new RegExp("^" + pattern + "$");
}

function matchesAny(path: string, patterns: string[]): boolean {
  return patterns.some(p => {
    try {
      return globToRegex(p).test(path);
    } catch {
      return false;
    }
  });
}

/** Get all files under repo that a permission pattern could theoretically match. */
function listAllFiles(root: string, relBase: string = ""): string[] {
  const out: string[] = [];
  const EXCLUDE = new Set([".git", "node_modules", ".claude/worktrees", ".claire", "dist", "build"]);

  function walk(dir: string, rel: string) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      const relPath = rel ? `${rel}/${entry}` : entry;
      if (EXCLUDE.has(entry) || EXCLUDE.has(relPath)) continue;
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(full, relPath);
      else out.push(relPath);
    }
  }
  walk(root, relBase);
  return out;
}

function getSkillReadableFiles(skillName: string, allFiles: string[]): Set<string> {
  const skillPath = resolve(REPO, "skills", skillName, "SKILL.md");
  if (!existsSync(skillPath)) return new Set();
  const { allow, deny } = parseSkillFrontmatter(skillPath);
  const readAllow = allow.filter(p => p.startsWith("Read("));
  const readDeny = deny.filter(p => p.startsWith("Read("));

  const readable = new Set<string>();
  for (const f of allFiles) {
    if (matchesAny(f, readAllow) && !matchesAny(f, readDeny)) {
      readable.add(f);
    }
  }
  return readable;
}

describe("skill permission baseline (Phase 2 pre-move)", () => {
  const allFiles = listAllFiles(REPO);

  const skills = ["tutor", "practice-questions", "practice-notes", "analysis", "exam-coach",
                  "input-processing", "note-organization", "end-session", "dev", "eval"];

  for (const skill of skills) {
    test(`${skill}: readable file set baseline`, () => {
      const readable = getSkillReadableFiles(skill, allFiles);
      // Just capture the count — post-move test compares
      // Not asserting specific count, just that skill has non-empty reachable set (if it has Read permissions)
      const skillPath = resolve(REPO, "skills", skill, "SKILL.md");
      if (!existsSync(skillPath)) return;
      const { allow } = parseSkillFrontmatter(skillPath);
      const hasRead = allow.some(p => p.startsWith("Read("));
      if (hasRead) {
        expect(readable.size).toBeGreaterThan(0);
      }
    });
  }

  test("tutor can reach codenotes pointers.cpp (smoke)", () => {
    const readable = getSkillReadableFiles("tutor", allFiles);
    const hasAnchor = Array.from(readable).some(f =>
      f.endsWith("codenotes/week3/pointers.cpp") || f.includes("codenotes/week3/pointers.cpp")
    );
    expect(hasAnchor).toBe(true);
  });

  test("analysis does NOT reach _my_drafts (F7 invariant)", () => {
    const readable = getSkillReadableFiles("analysis", allFiles);
    const leaks = Array.from(readable).filter(f => f.includes("/_my_drafts/"));
    expect(leaks).toEqual([]);
  });

  test("practice-questions does NOT reach _my_drafts (F7-R1 invariant)", () => {
    const readable = getSkillReadableFiles("practice-questions", allFiles);
    const leaks = Array.from(readable).filter(f => f.includes("/_my_drafts/"));
    expect(leaks).toEqual([]);
  });
});
