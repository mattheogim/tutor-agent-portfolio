#!/usr/bin/env bun
/**
 * Knowledge Graph CLI — replaces scripts/graph_utils.py.
 *
 * Usage:
 *   bun src/utils/graph-cli.ts --file <path> stats
 *   bun src/utils/graph-cli.ts --file <path> add-node --id x --label "X" --source ch1/1.1 --chapter 1 --section 1.1
 *   bun src/utils/graph-cli.ts --file <path> add-edge --from x --to y --type prerequisite --source ch1
 *   bun src/utils/graph-cli.ts --file <path> update-error --id x --errors 2 --stars 1
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { existsSync } from "fs";
import { KnowledgeGraphSchema, type KnowledgeGraph, type EdgeType } from "../types/graph.js";

async function loadGraph(filepath: string): Promise<KnowledgeGraph> {
  if (!existsSync(filepath)) {
    return { nodes: {}, edges: [], last_updated: new Date().toISOString().slice(0, 16) };
  }
  const raw = JSON.parse(await readFile(filepath, "utf-8"));
  return KnowledgeGraphSchema.parse(raw);
}

async function saveGraph(filepath: string, graph: KnowledgeGraph): Promise<void> {
  graph.last_updated = new Date().toISOString().slice(0, 16);
  await mkdir(dirname(filepath), { recursive: true });
  await writeFile(filepath, JSON.stringify(graph, null, 2) + "\n", "utf-8");
}

function printStats(graph: KnowledgeGraph): void {
  const nodeCount = Object.keys(graph.nodes).length;
  const edgeCount = graph.edges.length;

  const highRisk = Object.entries(graph.nodes)
    .filter(([, n]) => n.star_level >= 1)
    .sort(([, a], [, b]) => b.star_level - a.star_level)
    .slice(0, 5);

  const confusionPairs = graph.edges
    .filter((e) => e.type === "confused_with")
    .slice(0, 5);

  console.log("=== Knowledge Graph Stats ===");
  console.log(`Nodes: ${nodeCount}`);
  console.log(`Edges: ${edgeCount}`);

  console.log("\nHigh Risk Nodes (★1+):");
  if (highRisk.length === 0) console.log("  (none)");
  for (const [id, node] of highRisk) {
    console.log(`  - ${id} (★${node.star_level})`);
  }

  console.log("\nTop Confusion Pairs:");
  if (confusionPairs.length === 0) console.log("  (none)");
  for (const e of confusionPairs) {
    console.log(`  - ${e.from} <--> ${e.to}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf("--file");
  if (fileIdx === -1 || !args[fileIdx + 1]) {
    console.error("Usage: graph-cli.ts --file <path> <command> [options]");
    process.exit(1);
  }

  const filepath = args[fileIdx + 1];
  const remaining = [...args.slice(0, fileIdx), ...args.slice(fileIdx + 2)];
  const command = remaining[0];

  const graph = await loadGraph(filepath);

  function getArg(name: string): string {
    const idx = remaining.indexOf(`--${name}`);
    if (idx === -1 || !remaining[idx + 1]) {
      console.error(`Missing required argument: --${name}`);
      process.exit(1);
    }
    return remaining[idx + 1];
  }

  function getArgOpt(name: string, defaultValue: string): string {
    const idx = remaining.indexOf(`--${name}`);
    if (idx === -1 || !remaining[idx + 1]) return defaultValue;
    return remaining[idx + 1];
  }

  switch (command) {
    case "stats":
      printStats(graph);
      break;

    case "add-node": {
      const id = getArg("id");
      graph.nodes[id] = {
        label: getArg("label"),
        source: getArg("source"),
        chapter: parseInt(getArg("chapter"), 10),
        section: getArg("section"),
        difficulty: getArgOpt("difficulty", "medium") as "easy" | "medium" | "hard",
        error_count: parseInt(getArgOpt("errors", "0"), 10),
        star_level: parseInt(getArgOpt("stars", "0"), 10),
      };
      await saveGraph(filepath, graph);
      console.log(`Added/Updated node: ${id}`);
      break;
    }

    case "add-edge": {
      const from = getArg("from");
      const to = getArg("to");
      const type = getArg("type") as EdgeType;
      const source = getArg("source");
      const weight = parseInt(getArgOpt("weight", "1"), 10);
      const dup = graph.edges.find((e) => e.from === from && e.to === to && e.type === type);
      if (!dup) {
        graph.edges.push({ from, to, type, source, weight });
      }
      await saveGraph(filepath, graph);
      console.log(`Added edge: ${from} -> ${to} (${type})`);
      break;
    }

    case "update-error": {
      const id = getArg("id");
      const node = graph.nodes[id];
      if (!node) {
        console.error(`Error: Node ${id} not found.`);
        process.exit(1);
      }
      node.error_count = parseInt(getArg("errors"), 10);
      node.star_level = parseInt(getArg("stars"), 10);
      await saveGraph(filepath, graph);
      console.log(`Updated error status for: ${id}`);
      break;
    }

    default:
      console.error("Commands: stats, add-node, add-edge, update-error");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
