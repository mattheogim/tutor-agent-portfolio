import { z } from "zod";

export const DifficultySchema = z.enum(["easy", "medium", "hard"]);

export const GraphNodeSchema = z.object({
  label: z.string(),
  source: z.string(),
  chapter: z.number(),
  section: z.string(),
  difficulty: DifficultySchema.optional(),
  error_count: z.number().default(0),
  star_level: z.number().default(0),
});

export const EdgeTypeSchema = z.enum([
  "prerequisite",
  "confused_with",
  "connection_tag",
  "builds_on",
]);

export const GraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: EdgeTypeSchema,
  source: z.string().optional(),
  weight: z.number().default(1),
});

export const KnowledgeGraphSchema = z.object({
  nodes: z.record(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  last_updated: z.string(),
});

// --- Inferred types ---

export type Difficulty = z.infer<typeof DifficultySchema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;
