/** Centralized path resolution. Reads config/paths.json — single source of truth.
 *
 * Usage:
 *   import { coursePaths } from './lib/paths-config.js';
 *   const codenotes = coursePaths('cmpt125_donaldson').codenotes;
 *
 * Do NOT hardcode paths elsewhere. Ever.
 */

import { readFileSync } from "fs";
import { join, resolve } from "path";
import { basePath } from "../storage/paths.js";

interface CourseConfig {
  course_id: string;
  professor: string;
  root: string;
  chapters?: string;
  codenotes?: string;
  glossary?: string;
  questions?: string;
  personal?: string;
  analytics?: string;
  analysis?: string;
  assignment?: string;
  visualizations?: string | null;
  meta_index?: string;
  knowledge_graph?: string;
  exam_brief?: string;
  course_directives?: string;
}

interface PathsConfig {
  _meta: Record<string, string>;
  repo_root: string;
  courses: Record<string, CourseConfig>;
  repo_wide: Record<string, string>;
}

let _cache: PathsConfig | null = null;

function loadConfig(): PathsConfig {
  if (_cache !== null) return _cache;
  const configPath = resolve(basePath(), "config/paths.json");
  const raw = readFileSync(configPath, "utf-8");
  _cache = JSON.parse(raw) as PathsConfig;
  return _cache;
}

export function clearCache(): void {
  _cache = null;
}

/** Get all paths for a course. Returns absolute paths. */
export function coursePaths(courseKey: string): Record<string, string> {
  const cfg = loadConfig();
  const course = cfg.courses[courseKey];
  if (!course) {
    throw new Error(`Unknown course key: ${courseKey}. Available: ${Object.keys(cfg.courses).join(", ")}`);
  }
  const base = basePath();
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(course)) {
    if (typeof val === "string" && !key.startsWith("_")) {
      result[key] = resolve(base, val);
    }
  }
  return result;
}

/** Get repo-wide path. */
export function repoPath(key: string): string {
  const cfg = loadConfig();
  const rel = cfg.repo_wide[key];
  if (!rel) throw new Error(`Unknown repo_wide key: ${key}`);
  return resolve(basePath(), rel);
}

/** Get raw config (for introspection). */
export function getPathsConfig(): PathsConfig {
  return loadConfig();
}

/** Resolve arbitrary repo-relative path. */
export function repoRelative(relPath: string): string {
  return resolve(basePath(), relPath);
}
