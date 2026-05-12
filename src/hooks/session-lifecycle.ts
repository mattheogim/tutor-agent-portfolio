#!/usr/bin/env bun
/**
 * Session lifecycle hooks — start and stop handlers.
 *
 * Usage:
 *   bun src/hooks/session-lifecycle.ts start   # SessionStart hook
 *   bun src/hooks/session-lifecycle.ts stop     # Stop hook (reads stdin)
 *
 * Exit 0 always — never block.
 */

import { existsSync, readFileSync, appendFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from "fs";
import { join } from "path";
import { clearLog, logEvent, getSummary, readLog } from "./activity-log.js";
import { basePath, memoryDir, discoverCoursesSync } from "../storage/paths.js";

const MEMORY_DIR = memoryDir();

const BASE = basePath();
const LOG_PATH = `${BASE}/.session_activity.jsonl`;

function validateJsonFile(path: string): { ok: boolean; error?: string } {
  if (!existsSync(path)) return { ok: true }; // missing is fine
  try {
    JSON.parse(readFileSync(path, "utf-8"));
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `CORRUPTED: ${path.split("/").pop()} — ${msg}` };
  }
}

// ─── Session Start ───────────────────────────────────────

function sessionStart(): void {
  // 1. Clear previous activity log
  clearLog();

  const courseDirs = discoverCoursesSync();

  // 2. Validate critical JSON files
  let jsonOk = 0;
  let jsonFail = 0;
  const failDetails: string[] = [];

  for (const { path: coursePath } of courseDirs) {
    for (const filename of ["meta_index.json", "knowledge_graph.json"]) {
      const result = validateJsonFile(join(coursePath, filename));
      if (result.ok) jsonOk++;
      else { jsonFail++; failDetails.push(result.error!); }
    }

    const sessionResult = validateJsonFile(join(coursePath, "personal", "current_session.json"));
    if (sessionResult.ok) jsonOk++;
    else { jsonFail++; failDetails.push(sessionResult.error!); }
  }

  // 3. Check previous session failures
  let failureCount = 0;
  if (existsSync(LOG_PATH)) {
    try {
      const content = readFileSync(LOG_PATH, "utf-8");
      failureCount = (content.match(/write_failure|boundary_block/g) ?? []).length;
    } catch { /* ignore */ }
  }

  // 4. Log session_start to analytics
  const record = { event: "session_start", ts: new Date().toISOString() };
  for (const { path: coursePath } of courseDirs) {
    const analyticsDir = join(coursePath, "analytics");
    if (existsSync(analyticsDir)) {
      const sessionsPath = join(analyticsDir, "sessions.jsonl");
      appendFileSync(sessionsPath, JSON.stringify(record) + "\n", "utf-8");
    }
  }

  // 4b. Memory index validation — check MEMORY.md links
  const brokenMemories: string[] = [];
  const memoryIndex = join(MEMORY_DIR, "MEMORY.md");
  if (existsSync(memoryIndex)) {
    try {
      const content = readFileSync(memoryIndex, "utf-8");
      const linkPattern = /\]\(([^)]+\.md)\)/g;
      let match: RegExpExecArray | null;
      while ((match = linkPattern.exec(content)) !== null) {
        const linked = join(MEMORY_DIR, match[1]);
        if (!existsSync(linked)) {
          brokenMemories.push(match[1]);
        }
      }
    } catch { /* ignore */ }
  }

  // 4c. Sections integrity — verify SKILL.md sections: → .claude/sections/ files exist
  const sectionWarnings: string[] = [];
  const skillsDir = join(BASE, "skills");
  const sectionsDir = join(BASE, ".claude/sections");
  try {
    const skillFolders = readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const skillName of skillFolders) {
      const skillPath = join(skillsDir, skillName, "SKILL.md");
      if (!existsSync(skillPath)) continue;
      const content = readFileSync(skillPath, "utf-8");

      // Parse sections from frontmatter
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;
      const fm = fmMatch[1];

      let sections: string[] = [];
      const listMatch = fm.match(/sections:\s*\n((?:\s+-\s+.+\n)*)/);
      if (listMatch) {
        sections = listMatch[1].split("\n").map((l) => l.replace(/^\s+-\s+/, "").trim()).filter(Boolean);
      } else {
        const inlineMatch = fm.match(/sections:\s*\[([^\]]*)\]/);
        if (inlineMatch && inlineMatch[1].trim()) {
          sections = inlineMatch[1].split(",").map((s) => s.trim());
        }
      }

      for (const sec of sections) {
        if (!existsSync(join(sectionsDir, `${sec}.md`))) {
          sectionWarnings.push(`${skillName} → sections/${sec}.md`);
        }
      }
    }
  } catch { /* ignore — sections check is best-effort */ }

  // 4d. GC Lite — check stale sessions (7+ days)
  const staleWarnings: string[] = [];
  for (const { course, professor, path: coursePath } of courseDirs) {
    const sessionPath = join(coursePath, "personal", "current_session.json");
    if (existsSync(sessionPath)) {
      try {
        const s = statSync(sessionPath);
        const daysOld = (Date.now() - s.mtime.getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld > 7) {
          staleWarnings.push(`${course}/${professor} session ${Math.round(daysOld)}일 전`);
        }
      } catch { /* ignore */ }
    }
  }

  // 5. Build summary
  const parts: string[] = [];
  if (jsonOk > 0) parts.push(`JSON ${jsonOk}개 정상`);
  if (jsonFail > 0) parts.push(`JSON ${jsonFail}개 손상`);
  parts.push(failureCount > 0 ? `이전 세션 이슈 ${failureCount}건` : "이전 이슈 없음");
  if (staleWarnings.length > 0) parts.push(`stale: ${staleWarnings.join(", ")}`);
  if (brokenMemories.length > 0) parts.push(`memory 깨짐 ${brokenMemories.length}건`);
  if (sectionWarnings.length > 0) parts.push(`sections 누락 ${sectionWarnings.length}건`);

  if (courseDirs.length > 0) {
    const courseNames = [...new Set(courseDirs.map((d) => d.course))];
    parts.push(`과목: ${courseNames.join(", ")}`);
  }

  const detail = parts.join(", ");

  // 6. Log to activity log
  logEvent("session_start", detail);

  // 7. Print feedback
  if (jsonFail > 0 || brokenMemories.length > 0 || sectionWarnings.length > 0) {
    console.log(`⚠️ 세션 시작 — ${detail}`);
    for (const d of failDetails) console.log(`  ${d}`);
    for (const m of brokenMemories) console.log(`  MEMORY 누락: ${m}`);
    for (const s of sectionWarnings) console.log(`  SECTION 누락: ${s}`);
  } else {
    console.log(`🟢 세션 시작 — ${detail}`);
  }
}

// ─── Session Stop ────────────────────────────────────────

function sessionStop(): void {
  let input = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    try {
      let hookInput: Record<string, unknown> = {};
      try { hookInput = JSON.parse(input); } catch { /* empty */ }

      const sessionId = (hookInput.session_id as string) ?? "unknown";
      const stopReason = (hookInput.stop_reason as string) ?? "unknown";

      const courseDirs = discoverCoursesSync();

      // Write session record to analytics
      const record = {
        event: "session_end",
        ts: new Date().toISOString(),
        session_id: sessionId,
        stop_reason: stopReason,
      };

      for (const { path: coursePath } of courseDirs) {
        const analyticsDir = join(coursePath, "analytics");
        if (existsSync(analyticsDir)) {
          appendFileSync(
            join(analyticsDir, "sessions.jsonl"),
            JSON.stringify(record) + "\n",
            "utf-8"
          );
        } else {
          // Create analytics dir if course exists
          mkdirSync(analyticsDir, { recursive: true });
          appendFileSync(
            join(analyticsDir, "sessions.jsonl"),
            JSON.stringify(record) + "\n",
            "utf-8"
          );
        }
      }

      // Get session summary
      const summary = getSummary();
      const cats = summary.categories;
      const parts = [summary.duration];
      for (const c of ["skill", "file", "guard", "learning"]) {
        if (cats[c]) parts.push(`${c}=${cats[c]}`);
      }
      const detail = parts.join(", ");

      // Save timeline to file (before clearing log next session)
      const events = readLog();
      if (events.length > 1) {
        const today = new Date().toISOString().slice(0, 10);
        const time = new Date().toTimeString().slice(0, 5).replace(":", "");
        const timelineDir = join(BASE, "conversation_history", "timelines");
        mkdirSync(timelineDir, { recursive: true });

        const lines: string[] = [];
        lines.push(`# Session Timeline — ${today}`);
        lines.push(`Duration: ${summary.duration} | Events: ${summary.total}`);
        lines.push("");
        for (const e of events) {
          const ts = e.ts || "??:??";
          const d = e.detail || e.event;
          lines.push(`${ts}  ${e.icon || "●"}  ${d}`);
        }
        lines.push("");
        lines.push(`Summary: ${detail}`);

        writeFileSync(
          join(timelineDir, `${today}_${time}.md`),
          lines.join("\n") + "\n",
          "utf-8"
        );
      }

      // Log session end
      logEvent("session_end", detail);

      if (summary.total > 0) {
        console.log(`🏁 세션 종료 — ${detail}`);
      }
    } catch {
      // never fail
    }
    process.exit(0);
  });
}

// ─── CLI Entry ───────────────────────────────────────────

const command = process.argv[2];

if (command === "start") {
  try {
    sessionStart();
  } catch (e) {
    try { logEvent("session_start", `ERROR: ${e}`); } catch { /* */ }
    console.log("🟢 세션 시작 (검증 생략)");
  }
  process.exit(0);
} else if (command === "stop") {
  sessionStop();
} else {
  console.error("Usage: session-lifecycle.ts start|stop");
  process.exit(1);
}
