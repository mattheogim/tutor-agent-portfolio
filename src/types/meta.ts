import { z } from "zod";

export const ChapterSchema = z.object({
  title: z.string(),
  notes_path: z.string(),
  section_plan_path: z.string(),
  sections: z.array(z.string()),
  last_studied: z.string().nullable(),
});

export const CodenoteSchema = z.object({
  path: z.string(),
  section_plan_path: z.string(),
  topics: z.array(z.string()),
  chapter_mapping: z.string(),
});

export const QuestionEntrySchema = z.object({
  path: z.string(),
  type: z.string().optional(),
  chapter: z.string().optional(),
});

export const QuestionsSchema = z.object({
  quiz: z.array(z.union([z.string(), QuestionEntrySchema])),
  assignments: z.array(z.union([z.string(), QuestionEntrySchema])),
  practice_exams: z.array(z.union([z.string(), QuestionEntrySchema])),
});

export const PersonalMetaSchema = z.object({
  error_notes_path: z.string(),
  error_count_active: z.number(),
  error_count_temp: z.number(),
  high_star_concepts: z.array(z.string()),
  last_error_session: z.string().nullable(),
});

export const AnalysisMetaSchema = z.object({
  change_log_path: z.string(),
  analysis_done: z.boolean(),
});

export const MetaIndexSchema = z.object({
  course: z.string(),
  professor: z.string(),
  last_updated: z.string(),
  chapters: z.record(ChapterSchema),
  codenotes: z.record(CodenoteSchema).optional().default({}),
  questions: QuestionsSchema,
  ppt: z.array(z.string()).optional().default([]),
  syllabus_path: z.string().nullable().optional(),
  personal: PersonalMetaSchema,
  analysis: AnalysisMetaSchema,
});

// --- Inferred types ---

export type Chapter = z.infer<typeof ChapterSchema>;
export type Codenote = z.infer<typeof CodenoteSchema>;
export type Questions = z.infer<typeof QuestionsSchema>;
export type PersonalMeta = z.infer<typeof PersonalMetaSchema>;
export type AnalysisMeta = z.infer<typeof AnalysisMetaSchema>;
export type MetaIndex = z.infer<typeof MetaIndexSchema>;
