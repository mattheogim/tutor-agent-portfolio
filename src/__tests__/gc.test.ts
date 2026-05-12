import { describe, it, expect } from "bun:test";
import {
  extractPathReferences,
  extractFrontmatter,
  extractErrorConcepts,
  formatReport,
  checkMemoryLinks,
  type GCCheckResult,
} from "../agents/gc.js";

describe("extractPathReferences", () => {
  it("extracts skill paths from CLAUDE.md content", () => {
    const content = `Some text
- skills/tutor/SKILL.md — section-by-section note explanation
- skills/practice-questions/SKILL.md — chapter-level question generation
More text`;
    const refs = extractPathReferences(content);
    expect(refs).toHaveLength(2);
    expect(refs[0].path).toBe("skills/tutor/SKILL.md");
    expect(refs[1].path).toBe("skills/practice-questions/SKILL.md");
  });

  it("extracts agent paths", () => {
    const content = ".claude/agents/error-analyzer.md is used for analysis";
    const refs = extractPathReferences(content);
    expect(refs).toHaveLength(1);
    expect(refs[0].path).toBe(".claude/agents/error-analyzer.md");
  });

  it("extracts section paths", () => {
    const content = "→ 상세: .claude/sections/dev-mode.md (load when /dev prefix detected)";
    const refs = extractPathReferences(content);
    expect(refs).toHaveLength(1);
    expect(refs[0].path).toBe(".claude/sections/dev-mode.md");
  });

  it("returns line numbers", () => {
    const content = "line 1\nskills/tutor/SKILL.md\nline 3";
    const refs = extractPathReferences(content);
    expect(refs[0].line).toBe(2);
  });

  it("returns empty for no matches", () => {
    expect(extractPathReferences("no paths here")).toEqual([]);
  });
});

describe("extractFrontmatter", () => {
  it("extracts simple key-value frontmatter", () => {
    const content = `---
name: tutor
description: Section-by-section note explanation
model: sonnet
---

Body content here.`;
    const fm = extractFrontmatter(content);
    expect(fm).not.toBeNull();
    expect(fm!.name).toBe("tutor");
    expect(fm!.description).toBe("Section-by-section note explanation");
    expect(fm!.model).toBe("sonnet");
  });

  it("returns null for no frontmatter", () => {
    expect(extractFrontmatter("Just regular content")).toBeNull();
  });

  it("handles array values", () => {
    const content = `---
name: test
tools:
  - Read
  - Grep
  - Bash
---`;
    const fm = extractFrontmatter(content);
    expect(fm).not.toBeNull();
    expect(fm!.tools).toEqual(["Read", "Grep", "Bash"]);
  });
});

describe("formatReport", () => {
  it("formats results by severity", () => {
    const results: GCCheckResult[] = [
      { severity: "critical", code: "DEAD_REF", message: "Missing file" },
      { severity: "warning", code: "ORPHAN", message: "Unused script" },
      { severity: "info", code: "OK", message: "All good" },
    ];
    const report = formatReport(results);
    expect(report).toContain("Critical (1)");
    expect(report).toContain("Warning (1)");
    expect(report).toContain("Info (1)");
    expect(report).toContain("[DEAD_REF]");
    expect(report).toContain("[ORPHAN]");
    expect(report).toContain("1 critical, 1 warnings, 1 info");
  });

  it("includes file and line info when present", () => {
    const results: GCCheckResult[] = [
      { severity: "critical", code: "TEST", message: "msg", file: "CLAUDE.md", line: 42 },
    ];
    const report = formatReport(results);
    expect(report).toContain("CLAUDE.md:42");
  });

  it("handles empty results", () => {
    const report = formatReport([]);
    expect(report).toContain("0 critical, 0 warnings, 0 info");
  });
});

describe("extractErrorConcepts", () => {
  it("extracts concept names from ## headers with star levels", () => {
    const content = `# Error Notes

---

## Compiled vs Interpreted — ★★
Some content here.

---

## cin Buffer Consumption — ★
More content.`;
    const concepts = extractErrorConcepts(content);
    expect(concepts).toEqual(["Compiled vs Interpreted", "cin Buffer Consumption"]);
  });

  it("handles headers without star levels", () => {
    const content = `## Some Concept\nContent`;
    const concepts = extractErrorConcepts(content);
    expect(concepts).toEqual(["Some Concept"]);
  });

  it("skips STATUS lines", () => {
    const content = `## STATUS: RESOLVED — moved to temp\n## Real Concept — ★`;
    const concepts = extractErrorConcepts(content);
    expect(concepts).toEqual(["Real Concept"]);
  });

  it("returns empty for no concepts", () => {
    expect(extractErrorConcepts("just text")).toEqual([]);
  });
});

describe("checkMemoryLinks", () => {
  it("returns results array", async () => {
    const results = await checkMemoryLinks();
    expect(Array.isArray(results)).toBe(true);
    for (const r of results) {
      expect(r).toHaveProperty("severity");
      expect(r).toHaveProperty("code");
      expect(r).toHaveProperty("message");
    }
  });

  it("does not return critical severity for memory issues", async () => {
    const results = await checkMemoryLinks();
    const critical = results.filter((r) => r.severity === "critical");
    expect(critical).toHaveLength(0);
  });
});
