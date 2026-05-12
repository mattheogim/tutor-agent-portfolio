#!/usr/bin/env bun
/**
 * Session Timeline Renderer — visualize activity log as timeline
 *
 * Usage:
 *   bun src/hooks/session-timeline.ts                        # full timeline
 *   bun src/hooks/session-timeline.ts --compact              # one-line per event
 *   bun src/hooks/session-timeline.ts --filter guard,file    # category filter
 *   bun src/hooks/session-timeline.ts --last 10              # last N events
 *   bun src/hooks/session-timeline.ts --summary              # summary only
 */

import { parseArgs } from "util";
import { readLog, getSummary, type ActivityRecord } from "./activity-log.js";

const EVENT_LABELS: Record<string, string> = {
  session_start:     "SESSION START",
  session_end:       "SESSION END",
  user_message:      "MESSAGE",
  skill_activated:   "SKILL",
  skill_transition:  "TRANSITION",
  file_read:         "READ",
  file_written:      "WRITE",
  backup_created:    "BACKUP",
  boundary_block:    "BLOCKED",
  boundary_pass:     "ALLOWED",
  write_failure:     "WRITE FAIL",
  taste_decision:    "DECISION",
  user_challenge:    "QUESTION",
  mechanical:        "AUTO",
  error_recorded:    "ERROR",
  error_resolved:    "RESOLVED",
  section_completed: "SECTION DONE",
  question_answered: "ANSWER",
};

function renderFull(events: ActivityRecord[]): string {
  if (events.length === 0) return "(활동 로그 비어있음)";

  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const summary = getSummary();

  lines.push(`🕐 Session Timeline — ${today} (${summary.duration})`);
  lines.push("━".repeat(50));
  lines.push("");

  for (const e of events) {
    const ts = e.ts || "??:??";
    const icon = e.icon || "●";
    const label = EVENT_LABELS[e.event] ?? e.event.toUpperCase();
    const detail = e.detail || "";
    lines.push(detail ? `  ${ts}  ${icon}  ${label} — ${detail}` : `  ${ts}  ${icon}  ${label}`);
  }

  lines.push("");
  lines.push("━".repeat(50));

  const cats = summary.categories;
  const catParts: string[] = [];
  for (const c of ["skill", "file", "guard", "decision", "learning"]) {
    if (cats[c]) catParts.push(`${c}=${cats[c]}`);
  }
  lines.push(catParts.length > 0 ? `📊 Summary: ${catParts.join(" | ")}` : "📊 Summary: (이벤트 없음)");

  return lines.join("\n");
}

function renderCompact(events: ActivityRecord[]): string {
  if (events.length === 0) return "(활동 로그 비어있음)";
  return events
    .map((e) => `${e.ts || "??:??"} ${e.icon || "●"} ${e.detail || e.event}`)
    .join("\n");
}

function renderSummaryOnly(): string {
  const summary = getSummary();
  if (summary.total === 0) return "(활동 로그 비어있음)";

  const lines: string[] = [];
  lines.push(`📊 Session Summary — ${summary.duration}`);
  lines.push(`   Total events: ${summary.total}`);

  const catIcons: Record<string, string> = {
    system: "⚙️ System", skill: "📚 Skill", file: "📁 File",
    guard: "🛡️ Guard", decision: "🔀 Decision", learning: "📝 Learning",
  };

  for (const [cat, count] of Object.entries(summary.categories).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`   ${catIcons[cat] ?? `● ${cat}`}: ${count}`);
  }

  return lines.join("\n");
}

function main(): void {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      compact: { type: "boolean", default: false },
      filter: { type: "string", default: "" },
      last: { type: "string", default: "" },
      summary: { type: "boolean", default: false },
    },
  });

  if (values.summary) {
    console.log(renderSummaryOnly());
    return;
  }

  let events = readLog();

  if (values.filter) {
    const allowedCats = new Set(values.filter.split(","));
    events = events.filter((e) => allowedCats.has(e.cat));
  }

  if (values.last) {
    const n = parseInt(values.last, 10);
    if (n > 0) events = events.slice(-n);
  }

  console.log(values.compact ? renderCompact(events) : renderFull(events));
}

main();
