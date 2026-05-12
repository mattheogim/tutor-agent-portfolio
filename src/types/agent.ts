import { z } from "zod";

export const AgentModelSchema = z.enum(["opus", "sonnet", "haiku"]);

export const AgentFrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  model: AgentModelSchema.optional(),
  tools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
});

export const AgentDefinitionSchema = z.object({
  frontmatter: AgentFrontmatterSchema,
  filePath: z.string(),
  bodyContent: z.string(),
});

// --- Inferred types ---

export type AgentModel = z.infer<typeof AgentModelSchema>;
export type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>;
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
