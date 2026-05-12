import { z } from "zod";

export const HookTypeSchema = z.enum(["command", "prompt", "agent", "http"]);

export const HookTriggerSchema = z.enum([
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "UserPromptSubmit",
  "SessionStart",
  "Stop",
]);

export const HookEntrySchema = z.object({
  type: HookTypeSchema,
  command: z.string().optional(),
  if: z.string().optional(),
  statusMessage: z.string().optional(),
  timeout: z.number().optional(),
});

export const HookMatcherGroupSchema = z.object({
  matcher: z.string().optional(),
  hooks: z.array(HookEntrySchema),
});

export const HooksConfigSchema = z.object({
  hooks: z.record(HookTriggerSchema, z.array(HookMatcherGroupSchema)),
});

// Activity log event (from .session_activity.jsonl)

export const ActivityCategorySchema = z.enum([
  "system",
  "skill",
  "file",
  "guard",
  "decision",
  "learning",
]);

export const ActivityEventSchema = z.object({
  ts: z.string(),
  event: z.string(),
  detail: z.string().optional().default(""),
  cat: ActivityCategorySchema,
  icon: z.string().optional().default(""),
});

// --- Inferred types ---

export type HookType = z.infer<typeof HookTypeSchema>;
export type HookTrigger = z.infer<typeof HookTriggerSchema>;
export type HookEntry = z.infer<typeof HookEntrySchema>;
export type HookMatcherGroup = z.infer<typeof HookMatcherGroupSchema>;
export type HooksConfig = z.infer<typeof HooksConfigSchema>;
export type ActivityCategory = z.infer<typeof ActivityCategorySchema>;
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
