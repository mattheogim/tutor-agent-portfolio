/**
 * SessionState CRUD + disk persistence.
 *
 * In-memory state management with automatic disk saves on triggers:
 * 1. Mode transition
 * 2. Section completion
 * 3. Question answer
 * 4. Error occurrence
 * 5. Session end
 */

import { currentSessionPath } from "../storage/paths.js";
import {
  SessionStateSchema,
  type SessionState,
  type CurrentMode,
  type TutorState,
  type PracticeState,
  type RemindItem,
  type TempMovement,
} from "../types/session.js";
import { BaseStore } from "./base-store.js";

// ─── Default state ───────────────────────────────────────

function defaultState(): SessionState {
  const now = new Date();
  return {
    last_updated: now.toISOString(),
    session_date: now.toISOString().slice(0, 10),
    current_mode: "idle",
    tutor_state: {
      current_chapter: null,
      current_section: null,
      sections_completed: [],
    },
    practice_state: {
      remind_queue: [],
      questions_asked_count: 0,
      errors_this_session: [],
    },
    exam_date: null,
    countdown_active: false,
    analysis_done: false,
    temp_movements: [],
  };
}

// ─── Store class ─────────────────────────────────────────

export class SessionStore extends BaseStore<SessionState> {
  constructor(course: string, professor: string, initial?: SessionState) {
    super(course, professor, initial ?? defaultState());
  }

  protected filePath(): string {
    return currentSessionPath(this.course, this.professor);
  }

  protected stampUpdated(): void {
    this.data.last_updated = new Date().toISOString();
  }

  /** Load from disk. Returns default state if file missing or invalid. */
  static async load(course: string, professor: string): Promise<SessionStore> {
    const path = currentSessionPath(course, professor);
    const data = await BaseStore.loadData(path, SessionStateSchema);
    return new SessionStore(course, professor, data ?? undefined);
  }

  // ─── Domain Getters ─────────────────────────────────────

  getMode(): CurrentMode {
    return this.data.current_mode;
  }

  getTutorState(): Readonly<TutorState> {
    return this.data.tutor_state;
  }

  getPracticeState(): Readonly<PracticeState> {
    return this.data.practice_state;
  }

  getExamDate(): string | null {
    return this.data.exam_date;
  }

  getRemindQueue(): readonly RemindItem[] {
    return this.data.practice_state.remind_queue;
  }

  getErrorsThisSession(): readonly string[] {
    return this.data.practice_state.errors_this_session;
  }

  getTempMovements(): readonly TempMovement[] {
    return this.data.temp_movements;
  }

  getDaysUntilExam(): number | null {
    if (!this.data.exam_date) return null;
    const now = new Date();
    const exam = new Date(this.data.exam_date);
    const diff = exam.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // ─── Mutations (each marks dirty) ───────────────────

  /** Trigger 1: Mode transition */
  setMode(mode: CurrentMode): void {
    this.data.current_mode = mode;
    this.markDirty();
  }

  /** Trigger 2: Section completion */
  completeSection(section: string): void {
    if (!this.data.tutor_state.sections_completed.includes(section)) {
      this.data.tutor_state.sections_completed.push(section);
    }
    this.markDirty();
  }

  setCurrentPosition(chapter: string | null, section: string | null): void {
    this.data.tutor_state.current_chapter = chapter;
    this.data.tutor_state.current_section = section;
    this.markDirty();
  }

  /** Trigger 3: Question answered */
  recordQuestionAnswered(): void {
    this.data.practice_state.questions_asked_count++;
    this.markDirty();
  }

  addRemindItem(item: RemindItem): void {
    const idx = this.data.practice_state.remind_queue.findIndex(
      (r) => r.concept === item.concept
    );
    if (idx >= 0) {
      this.data.practice_state.remind_queue[idx] = item;
    } else {
      this.data.practice_state.remind_queue.push(item);
    }
    this.markDirty();
  }

  removeRemindItem(concept: string): void {
    this.data.practice_state.remind_queue =
      this.data.practice_state.remind_queue.filter((r) => r.concept !== concept);
    this.markDirty();
  }

  /** Trigger 4: Error occurred */
  recordError(concept: string): void {
    if (!this.data.practice_state.errors_this_session.includes(concept)) {
      this.data.practice_state.errors_this_session.push(concept);
    }
    this.markDirty();
  }

  /** Temp movements (resolved/reactivated) */
  addTempMovement(movement: TempMovement): void {
    this.data.temp_movements.push(movement);
    this.markDirty();
  }

  /** Exam date */
  setExamDate(date: string | null): void {
    this.data.exam_date = date;
    this.data.countdown_active = date !== null;
    this.markDirty();
  }

  /** Analysis status */
  setAnalysisDone(done: boolean): void {
    this.data.analysis_done = done;
    this.markDirty();
  }

  /** Reset for new session (keeps course context, clears session-specific data) */
  resetSession(): void {
    this.data.session_date = new Date().toISOString().slice(0, 10);
    this.data.current_mode = "idle";
    this.data.practice_state.errors_this_session = [];
    this.data.practice_state.questions_asked_count = 0;
    this.data.temp_movements = [];
    this.data.analysis_done = false;
    this.markDirty();
  }
}
