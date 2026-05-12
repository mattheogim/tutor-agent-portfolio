#!/usr/bin/env bun
/**
 * Eval Report Generator — aggregate results into markdown report.
 *
 * Usage:
 *   bun src/eval/report.ts <results_dir>
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// ─── Types ───────────────────────────────────────────────

interface StructuralAssertion {
  name: string;
  result: "PASS" | "FAIL";
  detail?: string;
}

interface BehavioralAssertion {
  name: string;
  score: number;
  note?: string;
}

interface ScenarioResult {
  scenario: string;
  category: string;
  verdict: "PASS" | "PARTIAL" | "FAIL";
  structural: {
    total: number;
    passed: number;
    assertions: StructuralAssertion[];
  };
  behavioral: {
    average: number;
    assertions: BehavioralAssertion[];
  };
  notes?: string;
}

interface ConsistencyResult {
  scenario: string;
  total_runs: number;
  decisions: string[];
  distribution: Record<string, number>;
  most_common: string;
  agreement_rate: number;
  verdict: "CONSISTENT" | "VARIABLE" | "INCONSISTENT";
}

// ─── Load ────────────────────────────────────────────────

export function loadResults(resultsDir: string): ScenarioResult[] {
  const scenarioDir = join(resultsDir, "scenario_results");
  if (!existsSync(scenarioDir)) return [];

  const results: ScenarioResult[] = [];
  for (const file of readdirSync(scenarioDir).sort()) {
    if (!file.endsWith(".json") || file.includes("consistency")) continue;
    try {
      const content = readFileSync(join(scenarioDir, file), "utf-8");
      results.push(JSON.parse(content));
    } catch { /* skip malformed */ }
  }
  return results;
}

export function loadConsistencyResults(resultsDir: string): ConsistencyResult[] {
  const scenarioDir = join(resultsDir, "scenario_results");
  if (!existsSync(scenarioDir)) return [];

  const results: ConsistencyResult[] = [];
  for (const file of readdirSync(scenarioDir).sort()) {
    if (!file.endsWith("_consistency.json")) continue;
    try {
      const content = readFileSync(join(scenarioDir, file), "utf-8");
      results.push(JSON.parse(content));
    } catch { /* skip */ }
  }
  return results;
}

// ─── Report ──────────────────────────────────────────────

export function generateReport(resultsDir: string): string {
  const results = loadResults(resultsDir);
  const consistency = loadConsistencyResults(resultsDir);

  if (results.length === 0 && consistency.length === 0) {
    return "# Eval Report\n\nNo results found.\n";
  }

  const total = results.length;
  const passCount = results.filter((r) => r.verdict === "PASS").length;
  const partialCount = results.filter((r) => r.verdict === "PARTIAL").length;
  const failCount = results.filter((r) => r.verdict === "FAIL").length;

  const behScores = results
    .filter((r) => r.behavioral?.average)
    .map((r) => r.behavioral.average);
  const avgBehavioral = behScores.length > 0
    ? behScores.reduce((a, b) => a + b, 0) / behScores.length
    : 0;

  const lines: string[] = [];
  const now = new Date().toISOString().replace("T", " ").slice(0, 16);

  lines.push(`# Eval Report — ${now}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- **Total Scenarios**: ${total}`);
  if (total > 0) {
    lines.push(`- **PASS**: ${passCount} (${Math.round((passCount / total) * 100)}%)`);
    lines.push(`- **PARTIAL**: ${partialCount} (${Math.round((partialCount / total) * 100)}%)`);
    lines.push(`- **FAIL**: ${failCount} (${Math.round((failCount / total) * 100)}%)`);
    lines.push(`- **Behavioral Average**: ${avgBehavioral.toFixed(2)}/5.0`);
  }
  lines.push("");

  // By category
  const cats = new Map<string, ScenarioResult[]>();
  for (const r of results) {
    const cat = r.category || "unknown";
    if (!cats.has(cat)) cats.set(cat, []);
    cats.get(cat)!.push(r);
  }

  lines.push("## Results by Category");
  lines.push("");

  for (const [cat, catResults] of [...cats.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const catPass = catResults.filter((r) => r.verdict === "PASS").length;
    lines.push(`### ${cat} (${catPass}/${catResults.length} PASS)`);
    lines.push("");
    lines.push("| Scenario | Structural | Behavioral | Verdict | Notes |");
    lines.push("|----------|-----------|------------|---------|-------|");

    for (const r of catResults) {
      const sTotal = r.structural?.total ?? 0;
      const sPassed = r.structural?.passed ?? 0;
      const bAvg = r.behavioral?.average ?? 0;
      const verdict = r.verdict === "FAIL" ? "**FAIL**" : r.verdict;
      const notes = (r.notes ?? "").slice(0, 50);
      lines.push(`| ${r.scenario} | ${sPassed}/${sTotal} | ${bAvg.toFixed(1)}/5.0 | ${verdict} | ${notes} |`);
    }
    lines.push("");
  }

  // Consistency results
  if (consistency.length > 0) {
    lines.push("## Consistency Tests");
    lines.push("");
    lines.push("| Scenario | Runs | Agreement | Verdict |");
    lines.push("|----------|------|-----------|---------|");

    for (const c of consistency) {
      const icon = { CONSISTENT: "🟢", VARIABLE: "🟡", INCONSISTENT: "🔴" }[c.verdict] ?? "?";
      lines.push(
        `| ${c.scenario} | ${c.total_runs} | ${Math.round(c.agreement_rate * 100)}% | ${icon} ${c.verdict} |`
      );
    }
    lines.push("");
  }

  // Failures detail
  const failures = results.filter((r) => r.verdict === "FAIL");
  if (failures.length > 0) {
    lines.push("## Failures Detail");
    lines.push("");
    for (const r of failures) {
      lines.push(`### ${r.scenario} — FAIL`);
      if (r.behavioral?.assertions) {
        for (const a of r.behavioral.assertions) {
          if (a.score < 3) {
            lines.push(`- **${a.name}**: ${a.score}/5 — ${a.note ?? ""}`);
          }
        }
      }
      if (r.structural?.assertions) {
        for (const a of r.structural.assertions) {
          if (a.result === "FAIL") {
            lines.push(`- **[STRUCT]** ${a.name}: FAIL — ${a.detail ?? ""}`);
          }
        }
      }
      lines.push("");
    }
  }

  // Recommendations
  lines.push("## Recommendations");
  lines.push("");
  if (failCount > 0) {
    lines.push(`- ${failCount} scenario(s) failed — review and fix corresponding rules`);
  }
  if (partialCount > 0) {
    lines.push(`- ${partialCount} scenario(s) partial — minor improvements needed`);
  }
  if (avgBehavioral > 0 && avgBehavioral < 4.0) {
    lines.push(`- Overall behavioral average (${avgBehavioral.toFixed(2)}) below 4.0`);
  }
  if (failCount === 0 && partialCount === 0 && total > 0) {
    lines.push("- All scenarios passed! System behavior is compliant.");
  }

  return lines.join("\n");
}

// ─── CLI ─────────────────────────────────────────────────

function main(): void {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Usage: bun src/eval/report.ts <results_dir>");
    process.exit(1);
  }

  if (!existsSync(dir)) {
    console.error(`[ERROR] Directory not found: ${dir}`);
    process.exit(1);
  }

  const report = generateReport(dir);
  const reportPath = join(dir, "report.md");
  writeFileSync(reportPath, report, "utf-8");

  const results = loadResults(dir);
  const pass = results.filter((r) => r.verdict === "PASS").length;
  const partial = results.filter((r) => r.verdict === "PARTIAL").length;
  const fail = results.filter((r) => r.verdict === "FAIL").length;

  console.log(`[report] Written to ${reportPath}`);
  console.log(`[summary] ${results.length} scenarios — PASS ${pass}, PARTIAL ${partial}, FAIL ${fail}`);
}

const isMain = process.argv[1]?.endsWith("report.ts") || process.argv[1]?.endsWith("report.js");
if (isMain) main();
