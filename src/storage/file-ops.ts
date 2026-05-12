/** File I/O helpers — safe read/write with directory creation and Zod validation. */
import { readFile, writeFile, appendFile, mkdir, stat, readdir } from "fs/promises";
import { dirname } from "path";
import { z } from "zod";

/** Log to stderr when CLAUDE_TUTOR_DEBUG is set. */
function debugLog(op: string, path: string, err: unknown): void {
  if (process.env.CLAUDE_TUTOR_DEBUG) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[file-ops:${op}] ${path} — ${msg}`);
  }
}

/**
 * Read a JSON file and validate against a Zod schema.
 * Returns null data with ZodError if file doesn't exist or is invalid.
 */
export async function readJSON<S extends z.ZodTypeAny>(
  filePath: string,
  schema: S
): Promise<{ data: z.output<S>; errors: null } | { data: null; errors: z.ZodError }> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (result.success) {
      return { data: result.data, errors: null };
    }
    debugLog("readJSON:schema", filePath, result.error.message);
    return { data: null, errors: result.error };
  } catch (err) {
    debugLog("readJSON", filePath, err);
    return { data: null, errors: new z.ZodError([{ code: "custom", message: `File not found or invalid JSON: ${filePath}`, path: [] }]) };
  }
}

/**
 * Read a JSON file without schema validation.
 * Returns the raw parsed object or null.
 */
export async function readJSONRaw(filePath: string): Promise<unknown | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    debugLog("readJSONRaw", filePath, err);
    return null;
  }
}

/**
 * Write a JSON file (pretty-printed).
 * Creates parent directories if needed.
 */
export async function writeJSON(filePath: string, data: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/**
 * Append a line to a JSONL file.
 */
export async function appendJSONL(filePath: string, data: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, JSON.stringify(data) + "\n", "utf-8");
}

/**
 * Read a text/markdown file. Returns empty string if missing.
 */
export async function readText(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch (err) {
    debugLog("readText", filePath, err);
    return "";
  }
}

/**
 * Check if a file or directory exists.
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats (size, mtime). Returns null if missing.
 */
export async function fileStat(filePath: string): Promise<{ size: number; mtime: Date } | null> {
  try {
    const s = await stat(filePath);
    return { size: s.size, mtime: s.mtime };
  } catch (err) {
    debugLog("fileStat", filePath, err);
    return null;
  }
}

/**
 * List directory entries with isDirectory flag.
 */
export async function listDir(
  dirPath: string
): Promise<{ name: string; isDirectory: boolean }[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries.map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
  } catch (err) {
    debugLog("listDir", dirPath, err);
    return [];
  }
}

/**
 * Recursively find files matching a pattern (simple glob).
 * Pattern supports * (any chars) and ** (any path segments).
 */
export async function findFiles(
  dirPath: string,
  pattern: string
): Promise<string[]> {
  const results: string[] = [];
  const regex = globToRegex(pattern);

  async function walk(dir: string, relBase: string): Promise<void> {
    const entries = await listDir(dir);
    for (const entry of entries) {
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory) {
        if (entry.name !== "node_modules" && entry.name !== ".git") {
          await walk(full, rel);
        }
      } else {
        if (regex.test(rel)) {
          results.push(full);
        }
      }
    }
  }

  await walk(dirPath, "");
  return results;
}

function globToRegex(pattern: string): RegExp {
  let re = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "<<GLOBSTAR>>")
    .replace(/\*/g, "[^/]*")
    .replace(/<<GLOBSTAR>>/g, ".*");
  return new RegExp(`^${re}$`);
}
