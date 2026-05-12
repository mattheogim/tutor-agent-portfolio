/**
 * Skill frontmatter validator.
 *
 * Validates parsed frontmatter against the SkillFrontmatter schema
 * and checks for common issues.
 */

import { SkillFrontmatterSchema, type SkillFrontmatter } from "../types/skill.js";

export interface ValidationResult {
  valid: boolean;
  data?: SkillFrontmatter;
  errors: string[];
  warnings: string[];
}

export function validateSkillFrontmatter(
  raw: Record<string, unknown>,
  skillName: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Zod validation
  const parsed = SkillFrontmatterSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${skillName}: ${issue.path.join(".")} — ${issue.message}`);
    }
    return { valid: false, errors, warnings };
  }

  const fm = parsed.data;

  // Additional semantic checks
  if (fm.tools.length === 0) {
    warnings.push(`${skillName}: no tools declared`);
  }

  // Check for Write in tools without permissions
  const usesWrite = fm.tools.some((t) => t === "Write" || t === "Edit");
  const disallowsWrite = fm.disallowedTools?.some((t) => t === "Write" || t === "Edit");
  const hasWritePermission = fm.permissions?.allow.some((a) => a.startsWith("Write("));

  if (usesWrite && !hasWritePermission && !disallowsWrite) {
    warnings.push(`${skillName}: uses Write/Edit but no Write permission declared`);
  }

  // Check for contradictions
  if (fm.disallowedTools) {
    for (const tool of fm.tools) {
      const toolBase = tool.split("(")[0];
      if (fm.disallowedTools.includes(toolBase)) {
        errors.push(`${skillName}: "${toolBase}" in both tools and disallowedTools`);
      }
    }
  }

  return { valid: errors.length === 0, data: fm, errors, warnings };
}
