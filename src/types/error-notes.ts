import { z } from "zod";

export const ErrorStatusSchema = z.enum(["ACTIVE", "RESOLVED"]);

export const ErrorHistoryEntrySchema = z.object({
  date: z.string(),
  source: z.string(),
  result: z.enum(["wrong", "confused", "hesitant"]),
  context: z.string(),
  thought_process: z.string(),
});

export const ErrorEntrySchema = z.object({
  concept: z.string(),
  star_level: z.number().min(1).max(3),
  status: ErrorStatusSchema.default("ACTIVE"),
  error_history: z.array(ErrorHistoryEntrySchema),
  users_understanding: z.string(),
  correct_understanding: z.string(),
  connection_tags: z.array(z.string()),
  recurrence: z.boolean().default(false),
});

// --- Inferred types ---

export type ErrorStatus = z.infer<typeof ErrorStatusSchema>;
export type ErrorHistoryEntry = z.infer<typeof ErrorHistoryEntrySchema>;
export type ErrorEntry = z.infer<typeof ErrorEntrySchema>;
