import { z } from "zod";

// --- Sub-schemas ---

export const RemindItemSchema = z.object({
  concept: z.string(),
  earliest_next: z.number(),
  got_wrong_at: z.number(),
  skill: z.enum(["practice_q", "practice_n"]),
});

export const TutorStateSchema = z.object({
  current_chapter: z.string().nullable(),
  current_section: z.string().nullable(),
  sections_completed: z.array(z.string()),
});

export const PracticeStateSchema = z.object({
  remind_queue: z.array(RemindItemSchema),
  questions_asked_count: z.number(),
  errors_this_session: z.array(z.string()),
});

export const TempMovementSchema = z.object({
  concept: z.string(),
  direction: z.enum(["resolved", "reactivated"]),
});

// --- Main schema ---

export const CurrentModeSchema = z.enum([
  "idle",
  "input",
  "tutor",
  "practice_q",
  "practice_n",
  "analysis",
  "end_session",
  "dev",
]);

export const SessionStateSchema = z.object({
  last_updated: z.string(),
  session_date: z.string(),
  current_mode: CurrentModeSchema,
  tutor_state: TutorStateSchema,
  practice_state: PracticeStateSchema,
  exam_date: z.string().nullable(),
  countdown_active: z.boolean(),
  analysis_done: z.boolean(),
  temp_movements: z.array(TempMovementSchema),
});

// --- Inferred types ---

export type RemindItem = z.infer<typeof RemindItemSchema>;
export type TutorState = z.infer<typeof TutorStateSchema>;
export type PracticeState = z.infer<typeof PracticeStateSchema>;
export type TempMovement = z.infer<typeof TempMovementSchema>;
export type CurrentMode = z.infer<typeof CurrentModeSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;
