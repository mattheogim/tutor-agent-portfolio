#!/usr/bin/env bun
/**
 * GC Agent — System health auditor for claude-tutor
 *
 * 10 checks: dead references, schema drift, permission gaps,
 * orphan files, stale data, config consistency, cross-references,
 * hook health, hardcoded paths, memory links.
 *
 * Read-only. Produces a report, never modifies files.
 *
 * Usage:
 *   npm run gc           # print to stdout
 *   npm run gc:report    # write to eval/results/gc_report_{ts}.md
 */

import { readFile, readdir, writeFile, mkdir, stat } from "fs/promises";
import { join, basename, relative } from "path";
import { z } from "zod";
import { MetaIndexSchema } from "../types/meta.js";
import { KnowledgeGraphSchema } from "../types/graph.js";
import { SessionStateSchema } from "../types/session.js";
import {
  basePath,
  skillsDir,
  agentsDir,
  scriptsDir,
  settingsPath,
  memoryDir,
  discoverCourses,
} from "../storage/paths.js";
import {
  readJSONRaw,
  readText,
  exists,
  listDir,
  findFiles,
} from "../storage/file-ops.js";

// ─── Types ───────────────────────────────────────────────

export type Severity = "critical" | "warning" | "info";

export interface GCCheckResult {
  severity: Severity;
  code: string;
  message: string;
  file?: string;
  line?: number;
}

// ─── Main ────────────────────────────────────────────────

export async function runGC(): Promise<GCCheckResult[]> {
  const base = basePath();
  const results: GCCheckResult[] = [];

  const checks: [string, (b: string) => Promise<GCCheckResult[]>][] = [
    ["DEAD_REF", checkDeadReferences],
    ["SCHEMA", checkSchemaDrift],
    ["PERMISSION", checkPermissionGaps],
    ["ORPHAN", checkOrphanFiles],
    ["STALE", checkStaleData],
    ["CONFIG", checkConfigConsistency],
    ["CROSS_REF", checkCrossReferences],
    ["HOOK_HEALTH", checkHookHealth],
    ["HARDCODE", checkHardcodedPaths],
    ["MEMORY", () => checkMemoryLinks()],
  ];

  for (const [name, check] of checks) {
    try {
      results.push(...(await check(base)));
    } catch (err) {
      results.push({
        severity: "info",
        code: "CHECK_ERROR",
        message: `Check "${name}" threw: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return results;
}

/**
 * Lightweight GC — schema drift + stale session only.
 * Designed for SessionStart hook (< 5s).
 */
export async function runGCLite(): Promise<GCCheckResult[]> {
  const base = basePath();
  const results: GCCheckResult[] = [];

  try {
    results.push(...(await checkSchemaDrift(base)));
  } catch (err) {
    results.push({
      severity: "info",
      code: "CHECK_ERROR",
      message: `Schema drift check threw: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Check stale session (7+ days old)
  try {
    const courses = await discoverCourses(base);
    for (const { course, professor, path: coursePath } of courses) {
      const sessionPath = join(coursePath, "personal", "current_session.json");
      if (await exists(sessionPath)) {
        const s = await safeStat(sessionPath);
        if (s) {
          const daysOld = (Date.now() - s.mtime.getTime()) / (1000 * 60 * 60 * 24);
          if (daysOld > 7) {
            results.push({
              severity: "warning",
              code: "STALE_SESSION",
              message: `current_session.json is ${Math.round(daysOld)} days old — may be stale`,
              file: `${course}/${professor}/personal/current_session.json`,
            });
          }
        }
      }
    }
  } catch { /* don't block session start */ }

  return results;
}

// ─── Check 1: Dead References ────────────────────────────

async function checkDeadReferences(base: string): Promise<GCCheckResult[]> {
  const results: GCCheckResult[] = [];

  // Extract file paths referenced in CLAUDE.md
  const claudeMd = await readText(join(base, "CLAUDE.md"));
  const pathRefs = extractPathReferences(claudeMd);

  for (const { path: refPath, line } of pathRefs) {
    const fullPath = join(base, refPath);
    if (!(await exists(fullPath))) {
      results.push({
        severity: "critical",
        code: "DEAD_REF",
        message: `CLAUDE.md references "${refPath}" but file does not exist`,
        file: "CLAUDE.md",
        line,
      });
    }
  }

  // Check skill delegation list in CLAUDE.md matches actual skill dirs
  const skillDelegationPaths = claudeMd
    .match(/skills\/[\w-]+\/SKILL\.md/g)
    ?.map((s) => s) ?? [];

  for (const skillPath of skillDelegationPaths) {
    const fullPath = join(base, skillPath);
    if (!(await exists(fullPath))) {
      results.push({
        severity: "critical",
        code: "DEAD_REF",
        message: `Skill delegation references "${skillPath}" but SKILL.md missing`,
        file: "CLAUDE.md",
      });
    }
  }

  // Check agent .md files referenced in CLAUDE.md
  const agentRefs = claudeMd.match(/\.claude\/agents\/[\w-]+\.md/g) ?? [];
  for (const agentRef of agentRefs) {
    const fullPath = join(base, agentRef);
    if (!(await exists(fullPath))) {
      results.push({
        severity: "critical",
        code: "DEAD_REF",
        message: `Agent reference "${agentRef}" does not exist`,
        file: "CLAUDE.md",
      });
    }
  }

  // Check section includes in CLAUDE.md
  const sectionRefs =
    claudeMd.match(/\.claude\/sections\/[\w-]+\.md/g) ?? [];
  for (const secRef of sectionRefs) {
    const fullPath = join(base, secRef);
    if (!(await exists(fullPath))) {
      results.push({
        severity: "warning",
        code: "DEAD_REF",
        message: `Section reference "${secRef}" does not exist`,
        file: "CLAUDE.md",
      });
    }
  }

  // Check meta_index paths point to real files
  const courses = await discoverCourses(base);
  for (const { course, professor, path: coursePath } of courses) {
    const metaRaw = await readJSONRaw(join(coursePath, "meta_index.json"));
    if (!metaRaw || typeof metaRaw !== "object") continue;

    const meta = metaRaw as Record<string, unknown>;
    const chapters = meta.chapters as Record<string, { notes_path?: string; section_plan_path?: string }> | undefined;
    if (chapters) {
      for (const [chKey, ch] of Object.entries(chapters)) {
        if (ch.notes_path) {
          const notesFullPath = join(coursePath, ch.notes_path);
          if (!(await exists(notesFullPath))) {
            results.push({
              severity: "warning",
              code: "DEAD_REF",
              message: `meta_index.json chapter "${chKey}" notes_path "${ch.notes_path}" missing`,
              file: `${course}/${professor}/meta_index.json`,
            });
          }
        }
        if (ch.section_plan_path) {
          const spFullPath = join(coursePath, ch.section_plan_path);
          if (!(await exists(spFullPath))) {
            results.push({
              severity: "warning",
              code: "DEAD_REF",
              message: `meta_index.json chapter "${chKey}" section_plan_path missing`,
              file: `${course}/${professor}/meta_index.json`,
            });
          }
        }
      }
    }
  }

  if (results.length === 0) {
    results.push({
      severity: "info",
      code: "OK",
      message: "All file references are valid",
    });
  }

  return results;
}

export function extractPathReferences(
  content: string
): { path: string; line: number }[] {
  const refs: { path: string; line: number }[] = [];
  const lines = content.split("\n");
  // Match patterns like: skills/X/SKILL.md, .claude/agents/X.md, .claude/sections/X.md
  const patterns = [
    /(?:skills\/[\w-]+\/SKILL\.md)/g,
    /(?:\.claude\/agents\/[\w-]+\.md)/g,
    /(?:\.claude\/sections\/[\w-]+\.md)/g,
  ];

  for (let i = 0; i < lines.length; i++) {
    for (const pat of patterns) {
      pat.lastIndex = 0;
      let m;
      while ((m = pat.exec(lines[i])) !== null) {
        refs.push({ path: m[0], line: i + 1 });
      }
    }
  }
  return refs;
}

// ─── Check 2: Schema Drift ──────────────────────────────

async function checkSchemaDrift(base: string): Promise<GCCheckResult[]> {
  const results: GCCheckResult[] = [];
  const courses = await discoverCourses(base);

  for (const { course, professor, path: coursePath } of courses) {
    // meta_index.json
    const metaPath = join(coursePath, "meta_index.json");
    if (await exists(metaPath)) {
      const raw = await readJSONRaw(metaPath);
      const parsed = MetaIndexSchema.safeParse(raw);
      if (!parsed.success) {
        for (const issue of parsed.error.issues.slice(0, 5)) {
          results.push({
            severity: "critical",
            code: "SCHEMA",
            message: `meta_index.json: ${issue.path.join(".")} — ${issue.message}`,
            file: `${course}/${professor}/meta_index.json`,
          });
        }
      }
    }

    // knowledge_graph.json
    const graphPath = join(coursePath, "knowledge_graph.json");
    if (await exists(graphPath)) {
      const raw = await readJSONRaw(graphPath);
      const parsed = KnowledgeGraphSchema.safeParse(raw);
      if (!parsed.success) {
        for (const issue of parsed.error.issues.slice(0, 5)) {
          results.push({
            severity: "critical",
            code: "SCHEMA",
            message: `knowledge_graph.json: ${issue.path.join(".")} — ${issue.message}`,
            file: `${course}/${professor}/knowledge_graph.json`,
          });
        }
      }
    }

    // current_session.json
    const sessionPath = join(coursePath, "personal", "current_session.json");
    if (await exists(sessionPath)) {
      const raw = await readJSONRaw(sessionPath);
      const parsed = SessionStateSchema.safeParse(raw);
      if (!parsed.success) {
        for (const issue of parsed.error.issues.slice(0, 3)) {
          results.push({
            severity: "warning",
            code: "SCHEMA",
            message: `current_session.json: ${issue.path.join(".")} — ${issue.message}`,
            file: `${course}/${professor}/personal/current_session.json`,
          });
        }
      }
    }
  }

  if (results.length === 0) {
    results.push({
      severity: "info",
      code: "OK",
      message: "All JSON files match their schemas",
    });
  }

  return results;
}

// ─── Check 3: Permission Gaps ────────────────────────────

async function checkPermissionGaps(base: string): Promise<GCCheckResult[]> {
  const results: GCCheckResult[] = [];
  const skillsDirPath = skillsDir();

  const skillEntries = await listDir(skillsDirPath);
  for (const entry of skillEntries) {
    if (!entry.isDirectory || entry.name.startsWith(".")) continue;

    const skillMdPath = join(skillsDirPath, entry.name, "SKILL.md");
    if (!(await exists(skillMdPath))) {
      results.push({
        severity: "warning",
        code: "PERMISSION",
        message: `Skill directory "${entry.name}" has no SKILL.md`,
        file: `skills/${entry.name}/`,
      });
      continue;
    }

    const content = await readText(skillMdPath);
    const frontmatter = extractFrontmatter(content);
    if (!frontmatter) continue;

    const tools = (frontmatter.tools ?? []) as string[];
    const disallowed = (frontmatter.disallowedTools ?? []) as string[];
    const permissions = (frontmatter.permissions ?? {}) as Record<string, unknown>;
    const allows = (Array.isArray(permissions.allow) ? permissions.allow : []) as string[];

    // Check: if skill uses Write tool but no Write permissions
    // Skip if Write is explicitly in disallowedTools (read-only skill)
    const writeExplicitlyDisallowed = disallowed.some(
      (t) => t === "Write" || t === "Edit"
    );
    const usesWrite = tools.some(
      (t) => t === "Write" || t === "Edit"
    );
    const bodyMentionsWrite =
      content.includes("FILE WRITE") || content.includes("파일 저장");
    const hasWritePermission = allows.some((a) =>
      a.startsWith("Write(")
    );

    if ((usesWrite || bodyMentionsWrite) && !hasWritePermission && !writeExplicitlyDisallowed) {
      results.push({
        severity: "warning",
        code: "PERMISSION",
        message: `Skill "${entry.name}" uses Write/Edit but no Write permission in frontmatter`,
        file: `skills/${entry.name}/SKILL.md`,
      });
    }

    // Check: if skill uses Read but has deny for Read that might block needed access
    const denies = (Array.isArray(permissions.deny) ? permissions.deny : []) as string[];
    const deniesAllRead = denies.some(
      (d) => d === "Read(**)" || d === "Read(*)"
    );
    if (deniesAllRead) {
      results.push({
        severity: "critical",
        code: "PERMISSION",
        message: `Skill "${entry.name}" denies all Read access — likely misconfigured`,
        file: `skills/${entry.name}/SKILL.md`,
      });
    }
  }

  if (results.length === 0) {
    results.push({
      severity: "info",
      code: "OK",
      message: "All skill permissions look consistent",
    });
  }

  return results;
}

// ─── Check 4: Orphan Files ──────────────────────────────

async function checkOrphanFiles(base: string): Promise<GCCheckResult[]> {
  const results: GCCheckResult[] = [];

  // Check scripts/ — every .py should be referenced somewhere
  const scriptsDirPath = scriptsDir();
  const scriptFiles = await listDir(scriptsDirPath);
  const pyFiles = scriptFiles
    .filter((e) => e.name.endsWith(".py") && !e.name.startsWith("__"))
    .map((e) => e.name);

  // Gather all references from settings.json + SKILL.md files + CLAUDE.md
  const settingsContent = await readText(settingsPath());
  const claudeMdContent = await readText(join(base, "CLAUDE.md"));
  let allRefs = settingsContent + "\n" + claudeMdContent;

  const skillsDirPath = skillsDir();
  const skillEntries = await listDir(skillsDirPath);
  for (const entry of skillEntries) {
    if (!entry.isDirectory) continue;
    const skillMd = await readText(
      join(skillsDirPath, entry.name, "SKILL.md")
    );
    allRefs += "\n" + skillMd;
  }

  // Also check .claude/sections/
  const sectionsPath = join(base, ".claude", "sections");
  const sectionFiles = await listDir(sectionsPath);
  for (const sf of sectionFiles) {
    if (sf.name.endsWith(".md")) {
      allRefs += "\n" + (await readText(join(sectionsPath, sf.name)));
    }
  }

  for (const pyFile of pyFiles) {
    if (!allRefs.includes(pyFile)) {
      results.push({
        severity: "warning",
        code: "ORPHAN",
        message: `Script "${pyFile}" is not referenced by any skill, hook, or config`,
        file: `scripts/${pyFile}`,
      });
    }
  }

  // Check for orphan skill directories (not in CLAUDE.md delegation list)
  for (const entry of skillEntries) {
    if (!entry.isDirectory || entry.name.startsWith(".")) continue;
    const skillRef = `skills/${entry.name}/SKILL.md`;
    if (!claudeMdContent.includes(skillRef)) {
      results.push({
        severity: "warning",
        code: "ORPHAN",
        message: `Skill "${entry.name}" exists but not listed in CLAUDE.md SKILL DELEGATION`,
        file: `skills/${entry.name}/`,
      });
    }
  }

  if (results.length === 0) {
    results.push({
      severity: "info",
      code: "OK",
      message: "No orphan files detected",
    });
  }

  return results;
}

// ─── Check 5: Stale Data ────────────────────────────────

async function checkStaleData(base: string): Promise<GCCheckResult[]> {
  const results: GCCheckResult[] = [];
  const NOW = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  // Check for known duplicate/stale directories
  const knownDuplicates = ["TutorAgent", "antigravity", "claude"];
  for (const dirName of knownDuplicates) {
    const dirPath = join(base, dirName);
    if (await exists(dirPath)) {
      const dirStat = await safeStat(dirPath);
      const sizeStr = dirStat ? `${Math.round(dirStat.size / 1024 / 1024)}MB` : "unknown size";
      results.push({
        severity: "warning",
        code: "STALE",
        message: `Directory "${dirName}" appears to be a duplicate/stale directory (${sizeStr})`,
        file: dirName,
      });
    }
  }

  // Check for empty .versions/ directories
  const courses = await discoverCourses(base);
  for (const { course, professor, path: coursePath } of courses) {
    const versionsDirs = await findFiles(coursePath, ".versions");
    // Actually check dirs named .versions
    const personalVersions = join(coursePath, "personal", ".versions");
    if (await exists(personalVersions)) {
      const entries = await listDir(personalVersions);
      if (entries.length === 0) {
        results.push({
          severity: "info",
          code: "STALE",
          message: `Empty .versions/ directory`,
          file: `${course}/${professor}/personal/.versions/`,
        });
      }
    }

    // Check stale analytics
    const analyticsFile = join(coursePath, "analytics", "learning_events.jsonl");
    if (await exists(analyticsFile)) {
      const s = await safeStat(analyticsFile);
      if (s && NOW - s.mtime.getTime() > THIRTY_DAYS) {
        results.push({
          severity: "info",
          code: "STALE",
          message: `Analytics file not updated in 30+ days`,
          file: `${course}/${professor}/analytics/learning_events.jsonl`,
        });
      }
    }
  }

  // Check for __pycache__
  const pycachePath = join(base, "scripts", "__pycache__");
  if (await exists(pycachePath)) {
    results.push({
      severity: "info",
      code: "STALE",
      message: `__pycache__ can be safely deleted`,
      file: "scripts/__pycache__/",
    });
  }

  if (results.length === 0) {
    results.push({
      severity: "info",
      code: "OK",
      message: "No stale data detected",
    });
  }

  return results;
}

// ─── Check 6: Config Consistency ─────────────────────────

async function checkConfigConsistency(
  base: string
): Promise<GCCheckResult[]> {
  const results: GCCheckResult[] = [];
  const claudeMd = await readText(join(base, "CLAUDE.md"));
  const settingsJson = await readJSONRaw(settingsPath());

  // Check: all hook command scripts in settings.json actually exist
  if (settingsJson && typeof settingsJson === "object") {
    const settingsStr = JSON.stringify(settingsJson);
    // Match both relative (src/hooks/foo.ts, scripts/bar.py) and absolute paths
    const commandPattern = /"command":\s*"(?:bun\s+)?([^"]+)"/g;
    let cmdMatch: RegExpExecArray | null;
    const checkedPaths = new Set<string>();
    while ((cmdMatch = commandPattern.exec(settingsStr)) !== null) {
      // Extract the script path (skip "bun" prefix, take first arg)
      const cmdParts = cmdMatch[1].trim().split(/\s+/);
      const scriptPath = cmdParts[0];
      if (checkedPaths.has(scriptPath)) continue;
      checkedPaths.add(scriptPath);
      const fullPath = scriptPath.startsWith("/") ? scriptPath : join(base, scriptPath);
      if (!(await exists(fullPath))) {
        results.push({
          severity: "critical",
          code: "CONFIG",
          message: `settings.json hook command references "${scriptPath}" but file missing`,
          file: ".claude/settings.json",
        });
      }
    }
  }

  // Check: CLAUDE.md AGENT DELEGATION table agent names match .claude/agents/ files
  // Extract only the agent delegation section (between AGENT DELEGATION and next ###)
  const agentSection = claudeMd.match(
    /### AGENT DELEGATION[\s\S]*?\n\|[\s\S]*?\n\n/
  );
  if (agentSection) {
    const agentRows = agentSection[0].match(/\| `([\w-]+)` \|/g);
    if (agentRows) {
      const agentNames = agentRows
        .map((m) => m.match(/`([\w-]+)`/)?.[1])
        .filter(Boolean) as string[];

      const agentsDirPath = agentsDir();
      for (const name of agentNames) {
        const agentPath = join(agentsDirPath, `${name}.md`);
        if (!(await exists(agentPath))) {
          results.push({
            severity: "warning",
            code: "CONFIG",
            message: `CLAUDE.md agent table mentions "${name}" but .claude/agents/${name}.md missing`,
            file: "CLAUDE.md",
          });
        }
      }
    }
  }

  // Check: ETHOS.md exists and is mentioned in CLAUDE.md
  const ethosPath = join(base, "ETHOS.md");
  if (claudeMd.includes("ETHOS.md") && !(await exists(ethosPath))) {
    results.push({
      severity: "warning",
      code: "CONFIG",
      message: `CLAUDE.md references ETHOS.md but file does not exist`,
      file: "CLAUDE.md",
    });
  }

  // Check: skill frontmatter tool lists don't include disallowed tools for that skill
  const skillsDirPath = skillsDir();
  const skillEntries = await listDir(skillsDirPath);
  for (const entry of skillEntries) {
    if (!entry.isDirectory) continue;
    const skillPath = join(skillsDirPath, entry.name, "SKILL.md");
    if (!(await exists(skillPath))) continue;

    const content = await readText(skillPath);
    const frontmatter = extractFrontmatter(content);
    if (!frontmatter) continue;

    const tools = (frontmatter.tools ?? []) as string[];
    const disallowed = (frontmatter.disallowedTools ?? []) as string[];

    for (const tool of tools) {
      const toolName = tool.split("(")[0]; // "Bash(python3...)" → "Bash"
      if (disallowed.includes(toolName)) {
        results.push({
          severity: "critical",
          code: "CONFIG",
          message: `Skill "${entry.name}": "${toolName}" is in both tools and disallowedTools`,
          file: `skills/${entry.name}/SKILL.md`,
        });
      }
    }
  }

  if (results.length === 0) {
    results.push({
      severity: "info",
      code: "OK",
      message: "Configuration is consistent",
    });
  }

  return results;
}

// ─── Check 7: Cross-References ──────────────────────────

async function checkCrossReferences(base: string): Promise<GCCheckResult[]> {
  const results: GCCheckResult[] = [];
  const courses = await discoverCourses(base);

  for (const { course, professor, path: coursePath } of courses) {
    // 1. Parse error_notes.md concepts
    const errorNotesPath = join(coursePath, "personal", "error_notes.md");
    if (!(await exists(errorNotesPath))) continue;

    const errorContent = await readText(errorNotesPath);
    const errorConcepts = extractErrorConcepts(errorContent);

    // 2. Load knowledge_graph.json nodes
    const graphPath = join(coursePath, "knowledge_graph.json");
    if (!(await exists(graphPath))) {
      if (errorConcepts.length > 0) {
        results.push({
          severity: "warning",
          code: "CROSS_REF",
          message: `error_notes has ${errorConcepts.length} concepts but no knowledge_graph.json exists`,
          file: `${course}/${professor}/`,
        });
      }
      continue;
    }

    const graphRaw = await readJSONRaw(graphPath);
    if (!graphRaw || typeof graphRaw !== "object") continue;

    const graphNodeIds = extractGraphNodeIds(graphRaw as Record<string, unknown>);

    // 3. Check: error concepts → graph nodes
    for (const concept of errorConcepts) {
      const normalized = normalizeId(concept);
      if (!graphNodeIds.has(normalized)) {
        results.push({
          severity: "warning",
          code: "CROSS_REF",
          message: `Error concept "${concept}" not found in knowledge_graph nodes`,
          file: `${course}/${professor}/personal/error_notes.md`,
        });
      }
    }

    // 4. Check: graph nodes with star_level > 0 → error_notes
    const normalizedErrorSet = new Set(errorConcepts.map(normalizeId));
    const starredNodes = extractStarredNodes(graphRaw as Record<string, unknown>);
    for (const { id, starLevel } of starredNodes) {
      if (!normalizedErrorSet.has(id)) {
        results.push({
          severity: "warning",
          code: "CROSS_REF",
          message: `Graph node "${id}" has star_level=${starLevel} but no matching error_notes entry`,
          file: `${course}/${professor}/knowledge_graph.json`,
        });
      }
    }
  }

  if (results.length === 0) {
    results.push({
      severity: "info",
      code: "OK",
      message: "Error notes and knowledge graph are in sync",
    });
  }

  return results;
}

/** Extract concept names from error_notes.md ## headers (e.g., "## Foo Bar — ★★") */
export function extractErrorConcepts(content: string): string[] {
  const concepts: string[] = [];
  const pattern = /^## (.+?)(?:\s*—\s*★|$)/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    const name = match[1].trim();
    // Skip status/header/non-concept lines
    if (name.startsWith("STATUS") || name.startsWith("#") || name.startsWith("⚠️")) continue;
    concepts.push(name);
  }
  return concepts;
}

/** Extract node IDs from knowledge_graph.json (handles both array and record formats) */
function extractGraphNodeIds(raw: Record<string, unknown>): Set<string> {
  const ids = new Set<string>();
  const nodes = raw.nodes;
  if (Array.isArray(nodes)) {
    // Array format: [{id: "foo", ...}, ...]
    for (const node of nodes) {
      if (node && typeof node === "object" && "id" in node) {
        ids.add(String((node as Record<string, unknown>).id));
      }
    }
  } else if (nodes && typeof nodes === "object") {
    // Record format: {"foo": {...}, ...}
    for (const key of Object.keys(nodes as Record<string, unknown>)) {
      ids.add(key);
    }
  }
  return ids;
}

/** Extract graph nodes with star_level > 0 */
function extractStarredNodes(raw: Record<string, unknown>): { id: string; starLevel: number }[] {
  const starred: { id: string; starLevel: number }[] = [];
  const nodes = raw.nodes;
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      if (node && typeof node === "object") {
        const n = node as Record<string, unknown>;
        const sl = Number(n.star_level ?? 0);
        if (sl > 0) starred.push({ id: String(n.id), starLevel: sl });
      }
    }
  } else if (nodes && typeof nodes === "object") {
    for (const [key, val] of Object.entries(nodes as Record<string, unknown>)) {
      if (val && typeof val === "object") {
        const sl = Number((val as Record<string, unknown>).star_level ?? 0);
        if (sl > 0) starred.push({ id: key, starLevel: sl });
      }
    }
  }
  return starred;
}

/** Normalize concept name: lowercase, spaces→_, strip non-alphanumeric */
function normalizeId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

// ─── Check 8: Hook Health ───────────────────────────────

async function checkHookHealth(base: string): Promise<GCCheckResult[]> {
  const results: GCCheckResult[] = [];
  const logPath = join(base, ".session_activity.jsonl");

  if (!(await exists(logPath))) {
    results.push({
      severity: "info",
      code: "HOOK_HEALTH",
      message: "No activity log found — first session or log cleared",
    });
    return results;
  }

  const content = await readText(logPath);
  const lines = content.split("\n").filter((l) => l.trim());

  if (lines.length === 0) {
    results.push({
      severity: "info",
      code: "HOOK_HEALTH",
      message: "Activity log is empty",
    });
    return results;
  }

  // Parse events
  const events: { event: string; detail: string; ts_full: string }[] = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch { /* skip */ }
  }

  // Check 1: session_start should be present
  const hasSessionStart = events.some((e) => e.event === "session_start");
  if (!hasSessionStart) {
    results.push({
      severity: "warning",
      code: "HOOK_HEALTH",
      message: "Activity log has no session_start event — SessionStart hook may not be firing",
      file: ".session_activity.jsonl",
    });
  }

  // Check 2: if there are backup_created events, they should match write patterns
  // (this is a sanity check — backups should only happen for protected files)
  const backups = events.filter((e) => e.event === "backup_created");
  const writeFailures = events.filter((e) => e.event === "write_failure");

  if (writeFailures.length > 0) {
    results.push({
      severity: "warning",
      code: "HOOK_HEALTH",
      message: `${writeFailures.length} write failure(s) in current session log`,
      file: ".session_activity.jsonl",
    });
  }

  // Check 3: if there are user_message events but no skill events, hooks may be partially broken
  const userMessages = events.filter((e) => e.event === "user_message");
  const skillEvents = events.filter((e) => e.event === "skill_activated");
  if (userMessages.length >= 5 && skillEvents.length === 0 && backups.length === 0) {
    results.push({
      severity: "info",
      code: "HOOK_HEALTH",
      message: `${userMessages.length} user messages but no skill/backup activity — hooks may be idle or session was non-study`,
      file: ".session_activity.jsonl",
    });
  }

  if (results.length === 0) {
    results.push({
      severity: "info",
      code: "OK",
      message: `Hook health OK — ${events.length} events, ${backups.length} backups, ${writeFailures.length} failures`,
    });
  }

  return results;
}

// ─── Check 9: Hardcoded Paths ───────────────────────────

async function checkHardcodedPaths(base: string): Promise<GCCheckResult[]> {
  const results: GCCheckResult[] = [];
  const pattern = /\/Users\/\w+\//g;

  // Files to scan (relative to base)
  const targets = [
    "CLAUDE.md",
    ".claude/settings.json",
  ];

  // Add all SKILL.md files
  const skillsDirPath = skillsDir();
  const skillEntries = await listDir(skillsDirPath);
  for (const entry of skillEntries) {
    if (!entry.isDirectory || entry.name.startsWith(".")) continue;
    targets.push(`skills/${entry.name}/SKILL.md`);
  }

  // Add all agent .md files
  const agentsDirPath = agentsDir();
  const agentEntries = await listDir(agentsDirPath);
  for (const entry of agentEntries) {
    if (entry.name.endsWith(".md")) {
      targets.push(`.claude/agents/${entry.name}`);
    }
  }

  for (const target of targets) {
    const fullPath = join(base, target);
    if (!(await exists(fullPath))) continue;

    const content = await readText(fullPath);
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        results.push({
          severity: "warning",
          code: "HARDCODE",
          message: `Hardcoded absolute path found`,
          file: target,
          line: i + 1,
        });
      }
      pattern.lastIndex = 0;
    }
  }

  if (results.length === 0) {
    results.push({
      severity: "info",
      code: "OK",
      message: "No hardcoded paths found in system files",
    });
  }

  return results;
}

// ─── Check 8: Memory Links ──────────────────────────────

export async function checkMemoryLinks(): Promise<GCCheckResult[]> {
  const results: GCCheckResult[] = [];
  const memDir = memoryDir();
  const indexPath = join(memDir, "MEMORY.md");

  if (!(await exists(indexPath))) {
    return results; // No memory index — nothing to check
  }

  const content = await readText(indexPath);
  const linkPattern = /\]\(([^)]+\.md)\)/g;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(content)) !== null) {
    const linkedPath = join(memDir, match[1]);
    if (!(await exists(linkedPath))) {
      results.push({
        severity: "warning",
        code: "MEMORY",
        message: `MEMORY.md links to "${match[1]}" but file does not exist`,
        file: "memory/MEMORY.md",
      });
    }
  }

  if (results.length === 0) {
    results.push({
      severity: "info",
      code: "OK",
      message: "All memory links are valid",
    });
  }

  return results;
}

// ─── Helpers ─────────────────────────────────────────────
// discoverCourses is imported from ../storage/paths.js

/** Thin wrapper around the canonical parseMarkdown. Returns null if no frontmatter found. */
export function extractFrontmatter(content: string): Record<string, unknown> | null {
  const { parseMarkdown } = require("../utils/markdown-parser.js") as typeof import("../utils/markdown-parser.js");
  const result = parseMarkdown(content);
  return Object.keys(result.frontmatter).length > 0 ? result.frontmatter : null;
}

async function safeStat(
  filePath: string
): Promise<{ size: number; mtime: Date } | null> {
  try {
    const s = await stat(filePath);
    return { size: s.size, mtime: s.mtime };
  } catch {
    return null;
  }
}

// ─── Report Generator ────────────────────────────────────

export function formatReport(results: GCCheckResult[]): string {
  const now = new Date().toISOString().slice(0, 10);
  const critical = results.filter((r) => r.severity === "critical");
  const warnings = results.filter((r) => r.severity === "warning");
  const infos = results.filter((r) => r.severity === "info");

  let report = `# GC Report — ${now}\n\n`;

  if (critical.length > 0) {
    report += `## 🔴 Critical (${critical.length})\n`;
    for (const r of critical) {
      report += `- [${r.code}] ${r.message}`;
      if (r.file) report += ` (${r.file}${r.line ? `:${r.line}` : ""})`;
      report += "\n";
    }
    report += "\n";
  }

  if (warnings.length > 0) {
    report += `## 🟡 Warning (${warnings.length})\n`;
    for (const r of warnings) {
      report += `- [${r.code}] ${r.message}`;
      if (r.file) report += ` (${r.file})`;
      report += "\n";
    }
    report += "\n";
  }

  if (infos.length > 0) {
    report += `## 🟢 Info (${infos.length})\n`;
    for (const r of infos) {
      report += `- [${r.code}] ${r.message}`;
      if (r.file) report += ` (${r.file})`;
      report += "\n";
    }
    report += "\n";
  }

  report += `## Summary: ${critical.length} critical, ${warnings.length} warnings, ${infos.length} info\n`;

  return report;
}

// ─── CLI Entry ───────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const writeReport = args.includes("--report");
  const jsonOutput = args.includes("--json");
  const liteMode = args.includes("--lite");

  if (!jsonOutput) console.log(`🔍 Running GC ${liteMode ? "lite " : ""}audit...\n`);

  const results = liteMode ? await runGCLite() : await runGC();

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    const report = formatReport(results);
    console.log(report);

    if (writeReport) {
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const reportDir = join(basePath(), "eval", "results");
      await mkdir(reportDir, { recursive: true });
      const reportPath = join(reportDir, `gc_report_${ts}.md`);
      await writeFile(reportPath, report, "utf-8");
      console.log(`📄 Report saved: ${reportPath}`);
    }
  }

  // Exit with code 1 if any critical issues found
  const hasCritical = results.some((r) => r.severity === "critical");
  process.exit(hasCritical ? 1 : 0);
}

main().catch((err) => {
  console.error("GC agent failed:", err);
  process.exit(2);
});
