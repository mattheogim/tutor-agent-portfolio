/**
 * BaseStore — shared foundation for all JSON-backed stores.
 *
 * Provides: dirty tracking, save/saveIfDirty, course/professor context,
 * and a standard load pattern. Domain stores extend this with specific
 * getters and mutations.
 *
 * Inspired by harness-ref's createStore() pattern but adapted for
 * our async file-backed persistence model.
 */

import { readJSON, writeJSON, exists } from "../storage/file-ops.js";
import { z } from "zod";

export abstract class BaseStore<T> {
  protected data: T;
  protected course: string;
  protected professor: string;
  private _dirty = false;

  constructor(course: string, professor: string, data: T) {
    this.course = course;
    this.professor = professor;
    this.data = data;
  }

  /** Subclasses must define where their data lives on disk. */
  protected abstract filePath(): string;

  /** Subclasses must define how to stamp "last updated". */
  protected abstract stampUpdated(): void;

  // ─── Dirty tracking ─────────────────────────────────────

  isDirty(): boolean {
    return this._dirty;
  }

  protected markDirty(): void {
    this._dirty = true;
  }

  protected clearDirty(): void {
    this._dirty = false;
  }

  // ─── Persistence ────────────────────────────────────────

  /** Save current state to disk. */
  async save(): Promise<void> {
    this.stampUpdated();
    await writeJSON(this.filePath(), this.data);
    this._dirty = false;
  }

  /** Save only if state has changed since last save. */
  async saveIfDirty(): Promise<boolean> {
    if (!this._dirty) return false;
    await this.save();
    return true;
  }

  // ─── Accessors ──────────────────────────────────────────

  /** Get the full state as readonly. */
  get(): Readonly<T> {
    return this.data;
  }

  getCourse(): string {
    return this.course;
  }

  getProfessor(): string {
    return this.professor;
  }

  // ─── Static helper for subclass load() implementations ──

  /** Shared load logic: check existence, read + validate, return parsed data or null. */
  protected static async loadData<S extends z.ZodTypeAny>(
    path: string,
    schema: S
  ): Promise<z.output<S> | null> {
    if (!(await exists(path))) return null;
    const result = await readJSON(path, schema);
    return result.data ?? null;
  }
}
