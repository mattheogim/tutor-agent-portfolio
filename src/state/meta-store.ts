/**
 * MetaIndex CRUD operations.
 *
 * Handles reading, writing, and updating the central meta_index.json
 * for each course/professor pair.
 */

import { exists } from "../storage/file-ops.js";
import { metaIndexPath, coursePath } from "../storage/paths.js";
import {
  MetaIndexSchema,
  type MetaIndex,
  type Chapter,
} from "../types/meta.js";
import { BaseStore } from "./base-store.js";

// ─── Store class ─────────────────────────────────────────

export class MetaStore extends BaseStore<MetaIndex> {
  constructor(course: string, professor: string, meta: MetaIndex) {
    super(course, professor, meta);
  }

  protected filePath(): string {
    return metaIndexPath(this.course, this.professor);
  }

  protected stampUpdated(): void {
    this.data.last_updated = new Date().toISOString().slice(0, 16);
  }

  /** Load from disk. Returns null if file missing or invalid. */
  static async load(course: string, professor: string): Promise<MetaStore | null> {
    const path = metaIndexPath(course, professor);
    const data = await BaseStore.loadData(path, MetaIndexSchema);
    if (!data) return null;
    return new MetaStore(course, professor, data);
  }

  // ─── Domain Getters ─────────────────────────────────────

  getChapters(): Readonly<Record<string, Chapter>> {
    return this.data.chapters;
  }

  getChapter(key: string): Readonly<Chapter> | undefined {
    return this.data.chapters[key];
  }

  getChapterKeys(): string[] {
    return Object.keys(this.data.chapters);
  }

  getTotalSections(): number {
    let total = 0;
    for (const ch of Object.values(this.data.chapters)) {
      total += ch.sections.length;
    }
    return total;
  }

  getActiveErrorCount(): number {
    return this.data.personal.error_count_active;
  }

  getHighStarConcepts(): string[] {
    return this.data.personal.high_star_concepts;
  }

  isAnalysisDone(): boolean {
    return this.data.analysis.analysis_done;
  }

  // ─── Mutations ───────────────────────────────────────

  /** Update chapter's last_studied date */
  markChapterStudied(chapterKey: string, date?: string): void {
    const ch = this.data.chapters[chapterKey];
    if (ch) {
      ch.last_studied = date ?? new Date().toISOString().slice(0, 10);
      this.markDirty();
    }
  }

  /** Add or update a chapter entry */
  setChapter(key: string, chapter: Chapter): void {
    this.data.chapters[key] = chapter;
    this.markDirty();
  }

  /** Update personal error stats (called by end-session) */
  updateErrorStats(
    activeCount: number,
    tempCount: number,
    highStarConcepts: string[]
  ): void {
    this.data.personal.error_count_active = activeCount;
    this.data.personal.error_count_temp = tempCount;
    this.data.personal.high_star_concepts = highStarConcepts;
    this.data.personal.last_error_session = new Date().toISOString().slice(0, 10);
    this.markDirty();
  }

  /** Mark analysis as done */
  setAnalysisDone(done: boolean): void {
    this.data.analysis.analysis_done = done;
    this.markDirty();
  }

  /** Add a quiz to the questions list */
  addQuiz(path: string): void {
    if (!this.data.questions.quiz.includes(path)) {
      this.data.questions.quiz.push(path);
      this.markDirty();
    }
  }

  /** Add an assignment */
  addAssignment(path: string): void {
    if (!this.data.questions.assignments.includes(path)) {
      this.data.questions.assignments.push(path);
      this.markDirty();
    }
  }

  /** Add a practice exam */
  addPracticeExam(path: string): void {
    if (!this.data.questions.practice_exams.includes(path)) {
      this.data.questions.practice_exams.push(path);
      this.markDirty();
    }
  }

  // ─── Validation ──────────────────────────────────────

  /** Validate that all referenced paths actually exist on disk */
  async validatePaths(): Promise<{ valid: string[]; missing: string[] }> {
    const base = coursePath(this.course, this.professor);
    const valid: string[] = [];
    const missing: string[] = [];

    for (const [key, ch] of Object.entries(this.data.chapters)) {
      const notesPath = `${base}/${ch.notes_path}`;
      if (await exists(notesPath)) {
        valid.push(`${key}/notes`);
      } else {
        missing.push(`${key}/notes: ${ch.notes_path}`);
      }

      const spPath = `${base}/${ch.section_plan_path}`;
      if (await exists(spPath)) {
        valid.push(`${key}/section_plan`);
      } else {
        missing.push(`${key}/section_plan: ${ch.section_plan_path}`);
      }
    }

    return { valid, missing };
  }
}
