import { z } from "zod";

export const EventTypeSchema = z.enum([
  "concept_studied",
  "question_answered",
  "error_created",
  "error_resolved",
  "skill_activated",
]);

const BaseEventSchema = z.object({
  event: EventTypeSchema,
  ts: z.string(),
  course: z.string(),
  professor: z.string(),
});

export const ConceptStudiedSchema = BaseEventSchema.extend({
  event: z.literal("concept_studied"),
  chapter: z.string(),
  section: z.string(),
  concepts: z.array(z.string()),
  duration_approx: z.string().optional(),
});

export const QuestionAnsweredSchema = BaseEventSchema.extend({
  event: z.literal("question_answered"),
  concept: z.string(),
  correct: z.boolean(),
  question_type: z.string(),
  source: z.enum(["practice_q", "practice_n", "quiz_reattempt"]),
  chapter: z.string(),
});

export const ErrorCreatedSchema = BaseEventSchema.extend({
  event: z.literal("error_created"),
  concept: z.string(),
  star_level: z.number(),
  source: z.string(),
});

export const ErrorResolvedSchema = BaseEventSchema.extend({
  event: z.literal("error_resolved"),
  concept: z.string(),
  days_active: z.number(),
  sessions_to_resolve: z.number(),
  trigger: z.string(),
});

export const SkillActivatedSchema = BaseEventSchema.extend({
  event: z.literal("skill_activated"),
  skill: z.string(),
  context: z.string().optional(),
});

export const LearningEventSchema = z.discriminatedUnion("event", [
  ConceptStudiedSchema,
  QuestionAnsweredSchema,
  ErrorCreatedSchema,
  ErrorResolvedSchema,
  SkillActivatedSchema,
]);

// --- Inferred types ---

export type EventType = z.infer<typeof EventTypeSchema>;
export type ConceptStudied = z.infer<typeof ConceptStudiedSchema>;
export type QuestionAnswered = z.infer<typeof QuestionAnsweredSchema>;
export type ErrorCreated = z.infer<typeof ErrorCreatedSchema>;
export type ErrorResolved = z.infer<typeof ErrorResolvedSchema>;
export type SkillActivated = z.infer<typeof SkillActivatedSchema>;
export type LearningEvent = z.infer<typeof LearningEventSchema>;
