#!/usr/bin/env bun
/**
 * Eval Fixture Manager — copy fixtures to work dir, verify, clean.
 *
 * Usage:
 *   bun src/eval/fixtures.ts              # full setup
 *   bun src/eval/fixtures.ts --clean      # remove work dir
 *   bun src/eval/fixtures.ts --verify     # verify only
 */

import { cpSync, rmSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { parseArgs } from "util";
import { basePath, evalDir } from "../storage/paths.js";

const BASE = basePath();
const EVAL = evalDir();
const FIXTURES_DIR = join(EVAL, "fixtures");
const WORK_DIR = join(EVAL, "work");
const FIXTURE_COURSE = join(FIXTURES_DIR, "courses", "test_cs101", "TestProf");
const WORK_COURSE = join(WORK_DIR, "test_cs101", "TestProf");

const EXPECTED_FILES = [
  "chapters/chapter_1/notes.md",
  "chapters/chapter_1/section_plan.md",
  "personal/error_notes.md",
  "personal/handoff.md",
  "personal/current_session.json",
  "meta_index.json",
  "knowledge_graph.json",
  "questions/quiz/quiz_1.md",
  "analytics/learning_events.jsonl",
  "analysis/analysis_summary.md",
];

const EXPECTED_GLOBAL = ["user_profile/current.md"];

// ─── Operations ──────────────────────────────────────────

export function cleanWorkDir(): void {
  if (existsSync(WORK_DIR)) {
    rmSync(WORK_DIR, { recursive: true, force: true });
    console.log(`[clean] Removed ${WORK_DIR}`);
  }
}

export function copyFixtures(): string {
  cleanWorkDir();

  // Copy course fixtures
  cpSync(FIXTURE_COURSE, WORK_COURSE, { recursive: true });
  console.log(`[copy] ${FIXTURE_COURSE} → ${WORK_COURSE}`);

  // Copy user profile
  const srcProfile = join(FIXTURES_DIR, "user_profile");
  const dstProfile = join(WORK_DIR, "user_profile");
  if (existsSync(srcProfile)) {
    cpSync(srcProfile, dstProfile, { recursive: true });
    console.log(`[copy] user_profile`);
  }

  // Create empty directories
  for (const d of ["conversation_history", "codenotes"]) {
    mkdirSync(join(WORK_DIR, d), { recursive: true });
  }

  // Create results dir
  const ts = new Date().toISOString().replace(/[T:.-]/g, "").slice(0, 15);
  const resultsDir = join(EVAL, "results", ts);
  mkdirSync(join(resultsDir, "scenario_results"), { recursive: true });

  // Write manifest
  const manifest = {
    run_id: ts,
    started_at: new Date().toISOString(),
    fixture_source: FIXTURES_DIR,
    work_dir: WORK_DIR,
    scenarios: [] as string[],
    completed_at: null as string | null,
  };
  writeFileSync(join(resultsDir, "run_manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`[manifest] ${resultsDir}/run_manifest.json`);

  return ts;
}

export function verifyFixtures(): { ok: boolean; present: string[]; missing: string[] } {
  const present: string[] = [];
  const missing: string[] = [];

  for (const rel of EXPECTED_FILES) {
    const full = join(WORK_COURSE, rel);
    if (existsSync(full)) {
      present.push(rel);
    } else {
      missing.push(rel);
    }
  }

  for (const rel of EXPECTED_GLOBAL) {
    const full = join(WORK_DIR, rel);
    if (existsSync(full)) {
      present.push(rel);
    } else {
      missing.push(rel);
    }
  }

  return { ok: missing.length === 0, present, missing };
}

export function getWorkDir(): string {
  return WORK_DIR;
}

export function getWorkCoursePath(): string {
  return WORK_COURSE;
}

// ─── CLI ─────────────────────────────────────────────────

function main(): void {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      clean: { type: "boolean", default: false },
      verify: { type: "boolean", default: false },
    },
  });

  if (values.clean) {
    cleanWorkDir();
    return;
  }

  if (values.verify) {
    const result = verifyFixtures();
    if (result.ok) {
      console.log(`[verify] All ${result.present.length} fixture files present ✓`);
    } else {
      console.log(`[WARN] Missing ${result.missing.length} fixture files:`);
      for (const m of result.missing) console.log(`  - ${m}`);
    }
    return;
  }

  console.log("=".repeat(40));
  console.log("Eval Fixture Setup");
  console.log("=".repeat(40));

  const runId = copyFixtures();
  console.log(`\n[run_id] ${runId}`);

  const verify = verifyFixtures();
  console.log(verify.ok
    ? `\n✅ Ready — ${verify.present.length} files`
    : `\n⚠️ Incomplete — ${verify.missing.length} missing`
  );

  if (!verify.ok) {
    for (const m of verify.missing) console.log(`  - ${m}`);
  }
}

const isMain = process.argv[1]?.endsWith("fixtures.ts") || process.argv[1]?.endsWith("fixtures.js");
if (isMain) main();
