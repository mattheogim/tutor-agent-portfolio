import { z } from "zod";

export const SkillPermissionsSchema = z.object({
  allow: z.array(z.string()).default([]),
  deny: z.array(z.string()).default([]),
});

export const SkillFrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  when_to_use: z.string().optional(),
  tools: z.array(z.string()),
  disallowedTools: z.array(z.string()).optional(),
  effort: z.enum(["low", "medium", "high"]).optional(),
  permissions: SkillPermissionsSchema.optional(),
});

export const SkillDefinitionSchema = z.object({
  frontmatter: SkillFrontmatterSchema,
  filePath: z.string(),
  bodyContent: z.string(),
});

// --- Inferred types ---

export type SkillPermissions = z.infer<typeof SkillPermissionsSchema>;
export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;
