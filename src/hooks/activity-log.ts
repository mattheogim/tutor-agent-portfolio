#!/usr/bin/env bun
/**
 * Session Activity Log — shared logging module + CLI
 *
 * All hooks use this module to record session activity
 * to .session_activity.jsonl.
 *
 * Module usage:
 *   import { logEvent, clearLog } from "./activity-log.js";
 *   logEvent("backup_created", "error_notes.md → .versions/...", "file");
 *
 * CLI usage:
 *   bun src/hooks/activity-log.ts backup_created "error_notes.md" --cat file
 *   bun src/hooks/activity-log.ts --clear
 *   bun src/hooks/activity-log.ts --summary
 */

import { appendFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { parseArgs } from "util";
import { basePath } from "../storage/paths.js";

const LOG_PATH = `${basePath()}/.session_activity.jsonl`;

// ─── Event defaults ──────────────────────────────────────

interface EventDefault {
  icon: string;
  cat: string;
}

const EVENT_DEFAULTS: Record<string, EventDefault> = {
  // system
  session_start:     { icon: "🟢", cat: "system" },
  session_end:       { icon: "🏁", cat: "system" },
  user_message:      { icon: "💬", cat: "system" },
  // skill
  skill_activated:   { icon: "📚", cat: "skill" },
  skill_transition:  { icon: "🔄", cat: "skill" },
  // file
  file_read:         { icon: "📖", cat: "file" },
  file_written:      { icon: "📝", cat: "file" },
  backup_created:    { icon: "💾", cat: "file" },
  // guard
  boundary_block:    { icon: "🛡️", cat: "guard" },
  boundary_pass:     { icon: "✅", cat: "guard" },
  write_failure:     { icon: "⚠️", cat: "guard" },
  // decision
  taste_decision:    { icon: "🔀", cat: "decision" },
  user_challenge:    { icon: "❓", cat: "decision" },
  mechanical:        { icon: "⚙️", cat: "decision" },
  // learning
  error_recorded:    { icon: "📝", cat: "learning" },
  error_resolved:    { icon: "✅", cat: "learning" },
  section_started:   { icon: "▶️", cat: "learning" },
  section_completed: { icon: "🎯", cat: "learning" },
  question_asked:    { icon: "❔", cat: "learning" },
  question_answered: { icon: "📊", cat: "learning" },
};

// ─── Core functions ──────────────────────────────────────

export interface ActivityRecord {
  ts: string;
  ts_full: string;
  cat: string;
  event: string;
  detail: string;
  icon: string;
}

export function logEvent(
  event: string,
  detail = "",
  cat = "",
  icon = ""
): ActivityRecord {
  const defaults = EVENT_DEFAULTS[event] ?? { icon: "●", cat: "other" };
  if (!icon) icon = defaults.icon;
  if (!cat) cat = defaults.cat;

  const now = new Date();
  const record: ActivityRecord = {
    ts: now.toTimeString().slice(0, 8),
    ts_full: now.toISOString(),
    cat,
    event,
    detail,
    icon,
  };

  const dir = dirname(LOG_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(LOG_PATH, JSON.stringify(record) + "\n", "utf-8");

  return record;
}

export function clearLog(): void {
  if (existsSync(LOG_PATH)) unlinkSync(LOG_PATH);
}

export function readLog(): ActivityRecord[] {
  if (!existsSync(LOG_PATH)) return [];
  const events: ActivityRecord[] = [];
  const content = readFileSync(LOG_PATH, "utf-8");
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }
  return events;
}

export interface SessionSummary {
  total: number;
  categories: Record<string, number>;
  duration: string;
}

export function getSummary(): SessionSummary {
  const events = readLog();
  if (events.length === 0) {
    return { total: 0, categories: {}, duration: "0분" };
  }

  const cats: Record<string, number> = {};
  for (const e of events) {
    const c = e.cat || "other";
    cats[c] = (cats[c] ?? 0) + 1;
  }

  let duration = "< 1분";
  if (events.length >= 2) {
    const first = events[0].ts_full;
    const last = events[events.length - 1].ts_full;
    try {
      const t1 = new Date(first).getTime();
      const t2 = new Date(last).getTime();
      const mins = Math.floor((t2 - t1) / 60000);
      duration = mins > 0 ? `${mins}분` : "< 1분";
    } catch {
      duration = "?";
    }
  }

  return { total: events.length, categories: cats, duration };
}

export function printSummary(): void {
  const summary = getSummary();
  if (summary.total === 0) {
    console.log("(활동 로그 비어있음)");
    return;
  }

  const catIcons: Record<string, string> = {
    system: "⚙️", skill: "📚", file: "📁",
    guard: "🛡️", decision: "🔀", learning: "📝",
  };

  const parts = Object.entries(summary.categories)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([c, count]) => `${catIcons[c] ?? "●"}${c}=${count}`);

  console.log(
    `📊 Session: ${summary.duration} | ${summary.total} events | ${parts.join(" ")}`
  );
}

// ─── CLI ─────────────────────────────────────────────────

function main(): void {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      cat: { type: "string", default: "" },
      icon: { type: "string", default: "" },
      clear: { type: "boolean", default: false },
      summary: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  if (values.clear) {
    clearLog();
    console.log("Activity log cleared.");
    return;
  }

  if (values.summary) {
    printSummary();
    return;
  }

  const event = positionals[0];
  if (!event) {
    console.error("Usage: activity-log.ts <event> [detail] [--cat X] [--icon X] [--clear] [--summary]");
    process.exit(1);
  }

  const detail = positionals[1] ?? "";
  const record = logEvent(event, detail, values.cat ?? "", values.icon ?? "");
  console.log(`${record.icon}  ${record.event.toUpperCase()}: ${record.detail}`);
}

// Run if executed directly
const isMainModule = process.argv[1]?.endsWith("activity-log.ts") ||
  process.argv[1]?.endsWith("activity-log.js");
if (isMainModule) {
  main();
}
