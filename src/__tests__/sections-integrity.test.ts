import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, basename } from "path";

const ROOT = join(import.meta.dir, "../..");
const SECTIONS_DIR = join(ROOT, ".claude/sections");
const SKILLS_DIR = join(ROOT, "skills");
const CLAUDE_MD = join(ROOT, "CLAUDE.md");

// --- Helpers ---

function parseSkillSections(skillPath: string): string[] {
  const content = readFileSync(skillPath, "utf-8");
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return [];

  const frontmatter = frontmatterMatch[1];
  const sectionsMatch = frontmatter.match(/sections:\s*\n((?:\s+-\s+.+\n)*)/);
  if (!sectionsMatch) {
    // Check for inline array: sections: [a, b, c] or sections: []
    const inlineMatch = frontmatter.match(/sections:\s*\[([^\]]*)\]/);
    if (inlineMatch) {
      const items = inlineMatch[1].trim();
      if (items === "") return [];
      return items.split(",").map((s) => s.trim());
    }
    return [];
  }

  return sectionsMatch[1]
    .split("\n")
    .map((line) => line.replace(/^\s+-\s+/, "").trim())
    .filter(Boolean);
}

function parseSectionRequiredBy(sectionPath: string): string[] {
  const content = readFileSync(sectionPath, "utf-8");
  const match = content.match(/<!-- REQUIRED BY:\s*(.+?)\s*-->/);
  if (!match) return [];
  return match[1].split(",").map((s) => s.trim().toLowerCase());
}

function parseAlwaysLoad(sectionPath: string): boolean {
  const content = readFileSync(sectionPath, "utf-8");
  const match = content.match(/<!-- ALWAYS LOAD:\s*(.+?)\s*-->/);
  return match ? match[1].trim() === "true" : false;
}

function getAllSkillDirs(): string[] {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function getAllSectionFiles(): string[] {
  return readdirSync(SECTIONS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(".md", ""));
}

// --- Tests ---

describe("Sections Integrity", () => {
  const skillDirs = getAllSkillDirs();
  const sectionFiles = getAllSectionFiles();

  // Build map: section name -> which skills reference it
  const sectionToSkills = new Map<string, string[]>();
  for (const skillName of skillDirs) {
    const skillPath = join(SKILLS_DIR, skillName, "SKILL.md");
    if (!existsSync(skillPath)) continue;
    const sections = parseSkillSections(skillPath);
    for (const sec of sections) {
      if (!sectionToSkills.has(sec)) sectionToSkills.set(sec, []);
      sectionToSkills.get(sec)!.push(skillName);
    }
  }

  it("all SKILL.md sections: references point to existing files", () => {
    const missing: string[] = [];
    for (const skillName of skillDirs) {
      const skillPath = join(SKILLS_DIR, skillName, "SKILL.md");
      if (!existsSync(skillPath)) continue;
      const sections = parseSkillSections(skillPath);
      for (const sec of sections) {
        const sectionFile = join(SECTIONS_DIR, `${sec}.md`);
        if (!existsSync(sectionFile)) {
          missing.push(`${skillName} → sections/${sec}.md`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("REQUIRED BY headers match actual SKILL.md references (bidirectional)", () => {
    const mismatches: string[] = [];

    for (const secName of sectionFiles) {
      const secPath = join(SECTIONS_DIR, `${secName}.md`);
      const isAlwaysLoad = parseAlwaysLoad(secPath);
      if (isAlwaysLoad) continue; // ALWAYS LOAD sections have special REQUIRED BY

      const declaredRequiredBy = parseSectionRequiredBy(secPath);
      const actualRequiredBy = sectionToSkills.get(secName) || [];

      // Check: skills that reference this section but aren't in REQUIRED BY
      for (const skill of actualRequiredBy) {
        if (!declaredRequiredBy.includes(skill)) {
          mismatches.push(
            `${secName}.md: missing "${skill}" in REQUIRED BY (but ${skill}/SKILL.md references it)`
          );
        }
      }

      // Check: REQUIRED BY lists a skill that doesn't actually reference this section
      for (const skill of declaredRequiredBy) {
        // Skip special entries like "(loaded by resume-protocol...)"
        if (skill.startsWith("(")) continue;
        if (skill === "all skills") continue;
        if (!actualRequiredBy.includes(skill)) {
          mismatches.push(
            `${secName}.md: REQUIRED BY lists "${skill}" but ${skill}/SKILL.md doesn't reference it`
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("no orphan section files (unreferenced by any skill or ALWAYS LOAD)", () => {
    const orphans: string[] = [];
    for (const secName of sectionFiles) {
      const secPath = join(SECTIONS_DIR, `${secName}.md`);
      const isAlwaysLoad = parseAlwaysLoad(secPath);
      const referencedBySkills = sectionToSkills.has(secName);

      if (!isAlwaysLoad && !referencedBySkills) {
        orphans.push(secName);
      }
    }
    // Warn but don't fail — some sections like setup.md are loaded indirectly
    if (orphans.length > 0) {
      console.warn(`⚠️ Orphan sections (not referenced by any SKILL.md): ${orphans.join(", ")}`);
    }
    // We don't fail on this — just warn. Sections like setup.md are loaded by resume-protocol.
  });

  it("CLAUDE.md stays under 250 lines", () => {
    const content = readFileSync(CLAUDE_MD, "utf-8");
    const lineCount = content.split("\n").length;
    expect(lineCount).toBeLessThanOrEqual(250);
  });

  it("all section files have REQUIRED BY header", () => {
    const missing: string[] = [];
    for (const secName of sectionFiles) {
      const secPath = join(SECTIONS_DIR, `${secName}.md`);
      const content = readFileSync(secPath, "utf-8");
      if (!content.includes("<!-- REQUIRED BY:")) {
        missing.push(secName);
      }
    }
    expect(missing).toEqual([]);
  });
});
