/**
 * Memory store — read/write/query memory files.
 *
 * Memory files live in .claude/memory/ with MEMORY.md as the index.
 * Each memory is a markdown file with YAML-like frontmatter (name, description, type).
 */

import { readFile, writeFile, readdir, mkdir } from "fs/promises";
import { join } from "path";
import { basePath, memoryDir } from "../storage/paths.js";
import { exists } from "../storage/file-ops.js";
import { parseMarkdown } from "../utils/markdown-parser.js";
import {
  MemoryFrontmatterSchema,
  type MemoryType,
  type MemoryEntry,
} from "../types/memory.js";

const MEMORY_DIR = () => memoryDir();
const INDEX_FILE = "MEMORY.md";
const MAX_INDEX_LINES = 200;

// ─── Read ───────────────────────────────────────────────

/** Load all memory entries from disk. */
export async function loadMemories(): Promise<MemoryEntry[]> {
  const dir = MEMORY_DIR();
  if (!(await exists(dir))) return [];

  const files = await readdir(dir);
  const entries: MemoryEntry[] = [];

  for (const file of files) {
    if (file === INDEX_FILE || !file.endsWith(".md")) continue;
    try {
      const content = await readFile(join(dir, file), "utf-8");
      const parsed = parseFrontmatter(content);
      if (parsed) {
        entries.push({ filename: file, ...parsed });
      }
    } catch { /* skip malformed */ }
  }

  return entries;
}

/** Load memories filtered by type. */
export async function loadMemoriesByType(type: MemoryType): Promise<MemoryEntry[]> {
  const all = await loadMemories();
  return all.filter((m) => m.frontmatter.type === type);
}

/** Read the MEMORY.md index. */
export async function readIndex(): Promise<string> {
  const indexPath = join(MEMORY_DIR(), INDEX_FILE);
  try {
    return await readFile(indexPath, "utf-8");
  } catch {
    return "";
  }
}

// ─── Write ──────────────────────────────────────────────

/** Write a memory file + update the index. */
export async function saveMemory(
  filename: string,
  frontmatter: { name: string; description: string; type: MemoryType },
  body: string
): Promise<void> {
  const dir = MEMORY_DIR();
  await mkdir(dir, { recursive: true });

  const content =
    `---\nname: ${frontmatter.name}\ndescription: ${frontmatter.description}\ntype: ${frontmatter.type}\n---\n\n${body}\n`;

  await writeFile(join(dir, filename), content, "utf-8");
  await updateIndex(filename, frontmatter.name, frontmatter.description);
}

/** Remove a memory file and its index entry. */
export async function removeMemory(filename: string): Promise<boolean> {
  const filePath = join(MEMORY_DIR(), filename);
  if (!(await exists(filePath))) return false;

  const { unlink } = await import("fs/promises");
  await unlink(filePath);
  await removeFromIndex(filename);
  return true;
}

// ─── Index management ───────────────────────────────────

async function updateIndex(
  filename: string,
  name: string,
  description: string
): Promise<void> {
  const indexPath = join(MEMORY_DIR(), INDEX_FILE);
  let content = "";
  try {
    content = await readFile(indexPath, "utf-8");
  } catch { /* new file */ }

  const lines = content.split("\n").filter((l) => l.trim());

  // Remove existing entry for this file
  const filtered = lines.filter((l) => !l.includes(`(${filename})`));

  // Add new entry
  const entry = `- [${name}](${filename}) — ${description.slice(0, 120)}`;
  filtered.push(entry);

  // Truncate to max lines
  const output = filtered.slice(0, MAX_INDEX_LINES).join("\n") + "\n";
  await writeFile(indexPath, output, "utf-8");
}

async function removeFromIndex(filename: string): Promise<void> {
  const indexPath = join(MEMORY_DIR(), INDEX_FILE);
  try {
    const content = await readFile(indexPath, "utf-8");
    const lines = content
      .split("\n")
      .filter((l) => !l.includes(`(${filename})`));
    await writeFile(indexPath, lines.join("\n") + "\n", "utf-8");
  } catch { /* index doesn't exist */ }
}

// ─── Parse helpers ──────────────────────────────────────

function parseFrontmatter(
  content: string
): { frontmatter: { name: string; description: string; type: MemoryType }; body: string } | null {
  const { frontmatter, body } = parseMarkdown(content);
  if (Object.keys(frontmatter).length === 0) return null;

  const parsed = MemoryFrontmatterSchema.safeParse(frontmatter);
  if (!parsed.success) return null;

  return { frontmatter: parsed.data, body: body.trim() };
}

// ─── Stats ──────────────────────────────────────────────

export async function getMemoryStats(): Promise<{
  total: number;
  byType: Record<MemoryType, number>;
  indexLines: number;
}> {
  const memories = await loadMemories();
  const byType: Record<MemoryType, number> = {
    user: 0,
    feedback: 0,
    project: 0,
    reference: 0,
  };
  for (const m of memories) {
    byType[m.frontmatter.type]++;
  }

  const index = await readIndex();
  const indexLines = index.split("\n").filter((l) => l.trim()).length;

  return { total: memories.length, byType, indexLines };
}
