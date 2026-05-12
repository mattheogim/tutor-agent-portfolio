import { resolve, join } from "path";

/** Single source of truth for base path. Override with CLAUDE_TUTOR_BASE env var. */
let _basePath: string | null = null;

export function basePath(): string {
  if (_basePath !== null) return _basePath;
  return process.env.CLAUDE_TUTOR_BASE ?? process.cwd();
}

/** Override base path (for testing). Pass null to reset to env/cwd. */
export function setBasePath(path: string | null): void {
  _basePath = path;
}

export function coursePath(course: string, professor: string): string {
  return join(basePath(), course, professor);
}

export function chapterPath(
  course: string,
  professor: string,
  chapter: string
): string {
  return join(coursePath(course, professor), "chapters", chapter);
}

export function notesPath(
  course: string,
  professor: string,
  chapter: string
): string {
  return join(chapterPath(course, professor, chapter), "notes.md");
}

export function sectionPlanPath(
  course: string,
  professor: string,
  chapter: string
): string {
  return join(chapterPath(course, professor, chapter), "section_plan.md");
}

export function personalPath(course: string, professor: string): string {
  return join(coursePath(course, professor), "personal");
}

export function errorNotesPath(course: string, professor: string): string {
  return join(personalPath(course, professor), "error_notes.md");
}

export function currentSessionPath(course: string, professor: string): string {
  return join(personalPath(course, professor), "current_session.json");
}

export function handoffPath(course: string, professor: string): string {
  return join(personalPath(course, professor), "handoff.md");
}

export function metaIndexPath(course: string, professor: string): string {
  return join(coursePath(course, professor), "meta_index.json");
}

export function knowledgeGraphPath(course: string, professor: string): string {
  return join(coursePath(course, professor), "knowledge_graph.json");
}

export function analyticsPath(course: string, professor: string): string {
  return join(coursePath(course, professor), "analytics");
}

export function learningEventsPath(course: string, professor: string): string {
  return join(analyticsPath(course, professor), "learning_events.jsonl");
}

export function analysisPath(course: string, professor: string): string {
  return join(coursePath(course, professor), "analysis");
}

export function questionsPath(course: string, professor: string): string {
  return join(coursePath(course, professor), "questions");
}

export function changeLogPath(course: string, professor: string): string {
  return join(analysisPath(course, professor), "change_log.md");
}

export function versionsDir(filePath: string): string {
  const dir = resolve(filePath, "..");
  return join(dir, ".versions");
}

export function userProfilePath(): string {
  return join(basePath(), "user_profile", "current.md");
}

export function settingsPath(): string {
  return join(basePath(), ".claude", "settings.json");
}

export function skillsDir(): string {
  return join(basePath(), "skills");
}

export function agentsDir(): string {
  return join(basePath(), ".claude", "agents");
}

export function scriptsDir(): string {
  return join(basePath(), "scripts");
}

export function evalDir(): string {
  return join(basePath(), "eval");
}

export function memoryDir(): string {
  const home = process.env.HOME ?? "~";
  return resolve(home, ".claude/projects/-Users-matteokim-claude-tutor/memory");
}

export function sessionSummariesDir(): string {
  return join(basePath(), "conversation_history", "session_summaries");
}

/** Directories to skip when scanning for course dirs. */
const COURSE_SKIP = new Set([
  "node_modules", "dist", "src", "eval", "scripts", "skills",
  ".claude", "user_profile", "conversation_history", "codenotes",
  ".git", "TutorAgent", "antigravity", "claude", "notes",
  "assignemnt", "practice_midterm", "logs", "test101", "LearningtoLearn",
]);

export interface CourseDir {
  course: string;
  professor: string;
  path: string;
}

/**
 * Discover all course directories by scanning base path (async).
 * Heuristic: a course dir has a professor subdir with chapters/ or personal/ or meta_index.json.
 */
export async function discoverCourses(base?: string): Promise<CourseDir[]> {
  const { listDir, exists } = await import("./file-ops.js");
  const root = base ?? basePath();

  const courses: CourseDir[] = [];
  const entries = await listDir(root);

  for (const entry of entries) {
    if (!entry.isDirectory || entry.name.startsWith(".") || COURSE_SKIP.has(entry.name)) continue;
    const courseDirPath = join(root, entry.name);
    const subs = await listDir(courseDirPath);

    for (const sub of subs) {
      if (!sub.isDirectory) continue;
      const profPath = join(courseDirPath, sub.name);
      const hasChapters = await exists(join(profPath, "chapters"));
      const hasMeta = await exists(join(profPath, "meta_index.json"));
      const hasPersonal = await exists(join(profPath, "personal"));
      if (hasChapters || hasMeta || hasPersonal) {
        courses.push({ course: entry.name, professor: sub.name, path: profPath });
      }
    }
  }
  return courses;
}

/**
 * Discover all course directories (sync). For use in hooks that need synchronous I/O.
 */
export function discoverCoursesSync(base?: string): CourseDir[] {
  const { existsSync, readdirSync, statSync } = require("fs") as typeof import("fs");
  const root = base ?? basePath();
  const courses: CourseDir[] = [];

  if (!existsSync(root)) return courses;

  for (const item of readdirSync(root)) {
    if (item.startsWith(".") || COURSE_SKIP.has(item)) continue;
    const itemPath = join(root, item);
    if (!statSync(itemPath).isDirectory()) continue;

    for (const sub of readdirSync(itemPath)) {
      if (sub.startsWith(".")) continue;
      const subPath = join(itemPath, sub);
      if (!statSync(subPath).isDirectory()) continue;
      // Heuristic: has chapters/ or personal/ or meta_index.json
      const hasMarker = existsSync(join(subPath, "chapters"))
        || existsSync(join(subPath, "meta_index.json"))
        || existsSync(join(subPath, "personal"));
      if (hasMarker) {
        courses.push({ course: item, professor: sub, path: subPath });
      }
    }
  }
  return courses;
}
