import { z } from "zod";

export const MemoryTypeSchema = z.enum(["user", "feedback", "project", "reference"]);

export const MemoryFrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: MemoryTypeSchema,
});

export type MemoryType = z.infer<typeof MemoryTypeSchema>;
export type MemoryFrontmatter = z.infer<typeof MemoryFrontmatterSchema>;

export interface MemoryEntry {
  filename: string;
  frontmatter: MemoryFrontmatter;
  body: string;
}
