/**
 * Skill registry — loads SKILL.md files from disk, parses frontmatter,
 * provides lookup by name.
 */

import { join } from "path";
import { skillsDir } from "../storage/paths.js";
import { readText, listDir, exists } from "../storage/file-ops.js";
import { parseMarkdown } from "../utils/markdown-parser.js";
import { validateSkillFrontmatter, type ValidationResult } from "./validator.js";
import type { SkillDefinition, SkillFrontmatter } from "../types/skill.js";

// ─── Registry ────────────────────────────────────────────

export class SkillRegistry {
  private skills = new Map<string, SkillDefinition>();
  private loaded = false;

  /** Load all skills from the skills/ directory. */
  async load(): Promise<{
    loaded: string[];
    errors: { skill: string; issues: string[] }[];
  }> {
    const dir = skillsDir();
    const entries = await listDir(dir);
    const loaded: string[] = [];
    const errors: { skill: string; issues: string[] }[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory || entry.name.startsWith(".")) continue;

      const skillPath = join(dir, entry.name, "SKILL.md");
      if (!(await exists(skillPath))) {
        errors.push({ skill: entry.name, issues: ["SKILL.md not found"] });
        continue;
      }

      const content = await readText(skillPath);
      const { frontmatter: raw, body } = parseMarkdown(content);

      // Ensure tools is an array
      if (!raw.tools) raw.tools = [];
      if (!Array.isArray(raw.tools)) raw.tools = [raw.tools];

      const validation = validateSkillFrontmatter(raw, entry.name);

      if (validation.valid && validation.data) {
        this.skills.set(entry.name, {
          frontmatter: validation.data,
          filePath: skillPath,
          bodyContent: body,
        });
        loaded.push(entry.name);
      } else {
        errors.push({ skill: entry.name, issues: validation.errors });
      }
    }

    this.loaded = true;
    return { loaded, errors };
  }

  /** Get a skill by name. */
  get(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  /** Get all loaded skills. */
  getAll(): Map<string, SkillDefinition> {
    return this.skills;
  }

  /** Get skill names. */
  names(): string[] {
    return [...this.skills.keys()];
  }

  /** Check if a skill exists. */
  has(name: string): boolean {
    return this.skills.has(name);
  }

  /** Get skill frontmatter. */
  getFrontmatter(name: string): SkillFrontmatter | undefined {
    return this.skills.get(name)?.frontmatter;
  }

  /** Find skills that match a tool usage pattern. */
  findByTool(tool: string): string[] {
    const matches: string[] = [];
    for (const [name, skill] of this.skills) {
      if (skill.frontmatter.tools.some((t) => t === tool || t.startsWith(tool + "("))) {
        matches.push(name);
      }
    }
    return matches;
  }
}

/** Singleton registry instance */
let _registry: SkillRegistry | null = null;

export async function getSkillRegistry(): Promise<SkillRegistry> {
  if (!_registry) {
    _registry = new SkillRegistry();
    await _registry.load();
  }
  return _registry;
}
