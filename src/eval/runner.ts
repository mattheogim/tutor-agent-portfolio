#!/usr/bin/env bun
/**
 * Eval Runner — load scenarios, parse assertions, execute structural checks.
 *
 * Structural assertions are auto-verified (file exists, grep match, value check).
 * Behavioral assertions require LLM judge (eval-judge agent) — logged for manual review.
 *
 * Usage:
 *   bun src/eval/runner.ts list                     # list all scenarios
 *   bun src/eval/runner.ts run <name>               # run one scenario
 *   bun src/eval/runner.ts run-all                  # run all scenarios
 *   bun src/eval/runner.ts run-all --category X     # run by category
 *   bun src/eval/runner.ts consistency <name> [N]   # run N times for consistency
 */

import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { parseArgs } from "util";
import { evalDir } from "../storage/paths.js";
import { parseMarkdown } from "../utils/markdown-parser.js";
import { copyFixtures, verifyFixtures, getWorkCoursePath } from "./fixtures.js";
import { generateReport } from "./report.js";
import { scoreBehavioral, behavioralAverage } from "./behavioral.js";

// ─── Types ───────────────────────────────────────────────

interface ScenarioMetadata {
  name: string;
  category: string;
  tests: string;
  priority: string;
  skillUnderTest: string;
  filePath: string;
}

interface StructuralAssertion {
  type: "glob" | "grep" | "read" | "exists" | "not_exists" | "json_field";
  target: string;
  pattern?: string;
  expected?: string;
  description: string;
}

interface ParsedScenario {
  metadata: ScenarioMetadata;
  fixtures: string[];
  preconditions: string[];
  stimuli: string[];
  structuralAssertions: StructuralAssertion[];
  behavioralAssertions: string[];
}

interface AssertionResult {
  name: string;
  result: "PASS" | "FAIL";
  detail?: string;
}

interface ScenarioResult {
  scenario: string;
  category: string;
  verdict: "PASS" | "PARTIAL" | "FAIL";
  structural: {
    total: number;
    passed: number;
    assertions: AssertionResult[];
  };
  behavioral: {
    average: number;
    assertions: { name: string; score: number; note: string }[];
  };
  notes: string;
}

// ─── Scenario Discovery ──────────────────────────────────

function discoverScenarios(): ScenarioMetadata[] {
  const scenariosDir = join(evalDir(), "scenarios");
  const scenarios: ScenarioMetadata[] = [];

  for (const catEntry of readdirSync(scenariosDir, { withFileTypes: true })) {
    if (!catEntry.isDirectory()) continue;
    const catDir = join(scenariosDir, catEntry.name);

    for (const file of readdirSync(catDir)) {
      if (!file.endsWith(".md") || file.startsWith("_")) continue;

      const filePath = join(catDir, file);
      const content = readFileSync(filePath, "utf-8");
      const meta = parseScenarioMetadata(content, catEntry.name, file, filePath);
      if (meta) scenarios.push(meta);
    }
  }

  return scenarios.sort((a, b) => a.name.localeCompare(b.name));
}

function parseScenarioMetadata(
  content: string,
  category: string,
  filename: string,
  filePath: string
): ScenarioMetadata | null {
  const name = filename.replace(".md", "");

  // Extract metadata from markdown
  const categoryMatch = content.match(/\*\*Category\*\*:\s*(.*)/);
  const testsMatch = content.match(/\*\*Tests\*\*:\s*(.*)/);
  const priorityMatch = content.match(/\*\*Priority\*\*:\s*(.*)/);
  const skillMatch = content.match(/\*\*Skill Under Test\*\*:\s*(.*)/);

  return {
    name,
    category: categoryMatch?.[1]?.trim() ?? category,
    tests: testsMatch?.[1]?.trim() ?? "",
    priority: priorityMatch?.[1]?.trim() ?? "P1",
    skillUnderTest: skillMatch?.[1]?.trim() ?? "",
    filePath,
  };
}

// ─── Scenario Parsing ────────────────────────────────────

function parseScenario(filePath: string): ParsedScenario {
  const content = readFileSync(filePath, "utf-8");
  const name = basename(filePath, ".md");
  const category = basename(join(filePath, ".."));

  // Metadata
  const metadata = parseScenarioMetadata(content, category, basename(filePath), filePath)!;

  // Fixtures
  const fixturesSection = content.match(/### Fixtures Required\n([\s\S]*?)(?=\n###|\n## )/);
  const fixtures = fixturesSection
    ? fixturesSection[1].split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim())
    : [];

  // Preconditions
  const preSection = content.match(/### Pre-conditions\n([\s\S]*?)(?=\n## )/);
  const preconditions = preSection
    ? preSection[1].split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim())
    : [];

  // Stimuli
  const stimuli: string[] = [];
  const stimulusMatches = content.matchAll(/```\n([\s\S]*?)\n```/g);
  for (const m of stimulusMatches) {
    stimuli.push(m[1].trim());
  }

  // Structural assertions
  const structuralSection = content.match(
    /### Structural Assertions.*?\n([\s\S]*?)(?=\n### Behavioral|\n## Rubric|\n## Scoring)/
  );
  const structuralAssertions: StructuralAssertion[] = [];
  if (structuralSection) {
    const lines = structuralSection[1].split("\n").filter((l) => l.match(/^\s*-\s*\[/));
    for (const line of lines) {
      const assertion = parseStructuralAssertion(line);
      if (assertion) structuralAssertions.push(assertion);
    }
  }

  // Behavioral assertions
  const behavioralSection = content.match(
    /### Behavioral Assertions.*?\n([\s\S]*?)(?=\n## Rubric|\n## Scoring|$)/
  );
  const behavioralAssertions: string[] = [];
  if (behavioralSection) {
    const lines = behavioralSection[1].split("\n").filter((l) => l.match(/^\s*-\s*\[/));
    for (const line of lines) {
      const desc = line.replace(/^\s*-\s*\[\s*\]\s*/, "").trim();
      if (desc) behavioralAssertions.push(desc);
    }
  }

  return {
    metadata,
    fixtures,
    preconditions,
    stimuli,
    structuralAssertions,
    behavioralAssertions,
  };
}

function parseStructuralAssertion(line: string): StructuralAssertion | null {
  const desc = line.replace(/^\s*-\s*\[\s*\]\s*/, "").trim();

  // Glob(path) — file exists
  const globMatch = desc.match(/`?Glob\(([^)]+)\)`?\s*—?\s*(.*)/);
  if (globMatch) {
    return { type: "exists", target: globMatch[1], description: globMatch[2] || `File exists: ${globMatch[1]}` };
  }

  // Grep("pattern", file) — pattern found in file
  const grepMatch = desc.match(/`?Grep\("([^"]+)",\s*([^)]+)\)`?\s*—?\s*(.*)/);
  if (grepMatch) {
    return { type: "grep", target: grepMatch[2].trim(), pattern: grepMatch[1], description: grepMatch[3] || `Grep: ${grepMatch[1]}` };
  }

  // Read(file) → value_check
  const readMatch = desc.match(/`?Read\(([^)]+)\)\s*→\s*([^`]*)`?\s*—?\s*(.*)/);
  if (readMatch) {
    return { type: "read", target: readMatch[1], expected: readMatch[2].trim(), description: readMatch[3] || `Read check: ${readMatch[1]}` };
  }

  // Generic description
  return { type: "exists", target: "", description: desc };
}

// ─── Assertion Execution ─────────────────────────────────

function executeStructuralAssertions(
  assertions: StructuralAssertion[],
  workPath: string
): AssertionResult[] {
  const results: AssertionResult[] = [];

  for (const assertion of assertions) {
    if (!assertion.target) {
      results.push({ name: assertion.description, result: "PASS", detail: "No target — skipped" });
      continue;
    }

    const targetPath = join(workPath, assertion.target);

    switch (assertion.type) {
      case "exists": {
        const found = existsSync(targetPath);
        results.push({
          name: assertion.description,
          result: found ? "PASS" : "FAIL",
          detail: found ? `Found: ${assertion.target}` : `Missing: ${assertion.target}`,
        });
        break;
      }

      case "not_exists": {
        const found = existsSync(targetPath);
        results.push({
          name: assertion.description,
          result: !found ? "PASS" : "FAIL",
          detail: !found ? `Correctly absent: ${assertion.target}` : `Should not exist: ${assertion.target}`,
        });
        break;
      }

      case "grep": {
        if (!existsSync(targetPath)) {
          results.push({
            name: assertion.description,
            result: "FAIL",
            detail: `File not found: ${assertion.target}`,
          });
          break;
        }
        const content = readFileSync(targetPath, "utf-8");
        const regex = new RegExp(assertion.pattern!, "m");
        const found = regex.test(content);
        results.push({
          name: assertion.description,
          result: found ? "PASS" : "FAIL",
          detail: found ? `Pattern found` : `Pattern not found: ${assertion.pattern}`,
        });
        break;
      }

      case "read": {
        if (!existsSync(targetPath)) {
          results.push({
            name: assertion.description,
            result: "FAIL",
            detail: `File not found: ${assertion.target}`,
          });
          break;
        }
        const content = readFileSync(targetPath, "utf-8");
        const found = content.includes(assertion.expected!);
        results.push({
          name: assertion.description,
          result: found ? "PASS" : "FAIL",
          detail: found ? `Value found` : `Expected "${assertion.expected}" not found`,
        });
        break;
      }

      case "json_field": {
        if (!existsSync(targetPath)) {
          results.push({
            name: assertion.description,
            result: "FAIL",
            detail: `File not found: ${assertion.target}`,
          });
          break;
        }
        try {
          const data = JSON.parse(readFileSync(targetPath, "utf-8"));
          const fieldPath = assertion.pattern!.split(".");
          let val: unknown = data;
          for (const key of fieldPath) {
            val = (val as Record<string, unknown>)?.[key];
          }
          const expected = assertion.expected;
          const match = expected ? String(val) === expected : val !== undefined;
          results.push({
            name: assertion.description,
            result: match ? "PASS" : "FAIL",
            detail: match ? `Field OK` : `Expected ${expected}, got ${String(val)}`,
          });
        } catch (e) {
          results.push({
            name: assertion.description,
            result: "FAIL",
            detail: `JSON parse error`,
          });
        }
        break;
      }
    }
  }

  return results;
}

function computeVerdict(
  structural: AssertionResult[],
  behavioralAvg: number
): "PASS" | "PARTIAL" | "FAIL" {
  const structFailed = structural.some((a) => a.result === "FAIL");
  if (structFailed) return "FAIL";
  if (behavioralAvg === 0) return structural.length > 0 ? "PASS" : "PARTIAL"; // no behavioral = struct only
  if (behavioralAvg >= 4.0) return "PASS";
  if (behavioralAvg >= 3.0) return "PARTIAL";
  return "FAIL";
}

// ─── Commands ────────────────────────────────────────────

function listScenarios(): void {
  const scenarios = discoverScenarios();
  console.log(`📋 ${scenarios.length} scenarios found:\n`);

  const byCat = new Map<string, ScenarioMetadata[]>();
  for (const s of scenarios) {
    if (!byCat.has(s.category)) byCat.set(s.category, []);
    byCat.get(s.category)!.push(s);
  }

  for (const [cat, items] of [...byCat.entries()].sort()) {
    console.log(`  ${cat}/ (${items.length})`);
    for (const s of items) {
      console.log(`    ${s.priority} ${s.name} — ${s.tests || s.skillUnderTest}`);
    }
  }
}

function runScenario(name: string, resultsDir?: string): ScenarioResult {
  const scenarios = discoverScenarios();
  const scenario = scenarios.find((s) => s.name === name);

  if (!scenario) {
    console.error(`[ERROR] Scenario not found: ${name}`);
    console.error(`Available: ${scenarios.map((s) => s.name).join(", ")}`);
    process.exit(1);
  }

  console.log(`▶ Running: ${scenario.name} (${scenario.category})`);
  const parsed = parseScenario(scenario.filePath);
  const workPath = getWorkCoursePath();

  // Execute structural assertions
  const structResults = executeStructuralAssertions(
    parsed.structuralAssertions,
    workPath
  );
  const structPassed = structResults.filter((a) => a.result === "PASS").length;

  // Behavioral: try heuristic scoring if transcript exists
  const transcriptPath = join(workPath, "..", "transcripts", `${scenario.name}.txt`);
  const transcript = existsSync(transcriptPath) ? readFileSync(transcriptPath, "utf-8") : undefined;

  const behavioralResults = scoreBehavioral(parsed.behavioralAssertions, transcript);
  const behAvg = behavioralAverage(behavioralResults);
  const heuristicCount = behavioralResults.filter((r) => r.method === "heuristic").length;
  const pendingCount = behavioralResults.filter((r) => r.method === "pending_judge").length;

  const verdict = computeVerdict(structResults, behAvg);

  const result: ScenarioResult = {
    scenario: scenario.name,
    category: scenario.category,
    verdict,
    structural: {
      total: structResults.length,
      passed: structPassed,
      assertions: structResults,
    },
    behavioral: {
      average: behAvg,
      assertions: behavioralResults.map((r) => ({
        name: r.name,
        score: r.score,
        note: r.note,
      })),
    },
    notes: `Structural: ${structPassed}/${structResults.length}, Behavioral: avg=${behAvg.toFixed(1)} (${heuristicCount} heuristic, ${pendingCount} pending)`,
  };

  // Print results
  for (const a of structResults) {
    const icon = a.result === "PASS" ? "✅" : "❌";
    console.log(`  ${icon} ${a.name} — ${a.detail ?? ""}`);
  }

  for (const b of behavioralResults) {
    const icon = b.method === "heuristic" ? (b.score >= 4 ? "✅" : b.score >= 3 ? "🟡" : "❌") : "📝";
    console.log(`  ${icon} ${b.name} — ${b.note}`);
  }

  console.log(`  → ${verdict}`);

  // Save result
  if (resultsDir) {
    const outPath = join(resultsDir, "scenario_results", `${scenario.name}.json`);
    writeFileSync(outPath, JSON.stringify(result, null, 2));
  }

  return result;
}

function runAll(category?: string): void {
  const runId = copyFixtures();
  const verify = verifyFixtures();
  if (!verify.ok) {
    console.warn(`⚠️ ${verify.missing.length} fixtures missing — results may be incomplete`);
  }

  const resultsDir = join(evalDir(), "results", runId);
  const scenarios = discoverScenarios();
  const filtered = category
    ? scenarios.filter((s) => s.category === category)
    : scenarios;

  console.log(`\n🧪 Running ${filtered.length} scenarios${category ? ` (${category})` : ""}...\n`);

  const results: ScenarioResult[] = [];
  for (const s of filtered) {
    const result = runScenario(s.name, resultsDir);
    results.push(result);
    console.log("");
  }

  // Generate report
  const report = generateReport(resultsDir);
  const reportPath = join(resultsDir, "report.md");
  writeFileSync(reportPath, report, "utf-8");

  // Summary
  const pass = results.filter((r) => r.verdict === "PASS").length;
  const partial = results.filter((r) => r.verdict === "PARTIAL").length;
  const fail = results.filter((r) => r.verdict === "FAIL").length;

  console.log("═".repeat(40));
  console.log(`📊 Results: ${pass} PASS, ${partial} PARTIAL, ${fail} FAIL`);
  console.log(`📄 Report: ${reportPath}`);
}

// ─── CLI ─────────────────────────────────────────────────

function main(): void {
  const command = process.argv[2];

  switch (command) {
    case "list":
      listScenarios();
      break;

    case "run": {
      const name = process.argv[3];
      if (!name) {
        console.error("Usage: bun src/eval/runner.ts run <scenario_name>");
        process.exit(1);
      }
      // Setup fixtures first
      copyFixtures();
      runScenario(name);
      break;
    }

    case "run-all": {
      const { values } = parseArgs({
        args: process.argv.slice(3),
        options: { category: { type: "string" } },
      });
      runAll(values.category);
      break;
    }

    case "consistency": {
      const name = process.argv[3];
      const n = parseInt(process.argv[4] ?? "5", 10);
      if (!name) {
        console.error("Usage: bun src/eval/runner.ts consistency <scenario_name> [N]");
        process.exit(1);
      }
      console.log(`🔄 Running ${name} × ${n} for consistency...`);
      const results: ScenarioResult[] = [];
      for (let i = 0; i < n; i++) {
        copyFixtures();
        console.log(`\n--- Run ${i + 1}/${n} ---`);
        results.push(runScenario(name));
      }
      // Analyze consistency
      const verdicts = results.map((r) => r.verdict);
      const counts = new Map<string, number>();
      for (const v of verdicts) counts.set(v, (counts.get(v) ?? 0) + 1);
      const mostCommon = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const agreement = mostCommon[1] / n;
      const cVerdict = agreement >= 0.8 ? "CONSISTENT" : agreement >= 0.6 ? "VARIABLE" : "INCONSISTENT";
      const icon = { CONSISTENT: "🟢", VARIABLE: "🟡", INCONSISTENT: "🔴" }[cVerdict];
      console.log(`\n${icon} ${name}: ${Math.round(agreement * 100)}% agreement — ${cVerdict}`);
      break;
    }

    default:
      console.log("Usage:");
      console.log("  bun src/eval/runner.ts list");
      console.log("  bun src/eval/runner.ts run <name>");
      console.log("  bun src/eval/runner.ts run-all [--category X]");
      console.log("  bun src/eval/runner.ts consistency <name> [N]");
  }
}

const isMain = process.argv[1]?.endsWith("runner.ts") || process.argv[1]?.endsWith("runner.js");
if (isMain) main();
