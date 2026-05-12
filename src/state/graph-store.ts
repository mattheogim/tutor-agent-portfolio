/**
 * KnowledgeGraph operations.
 *
 * Handles reading, querying, and updating the concept relationship graph.
 */

import { knowledgeGraphPath } from "../storage/paths.js";
import {
  KnowledgeGraphSchema,
  type KnowledgeGraph,
  type GraphNode,
  type EdgeType,
} from "../types/graph.js";
import { BaseStore } from "./base-store.js";

// ─── Helpers ─────────────────────────────────────────────

/** Normalize concept name to node ID: lowercase, spaces→_, strip punctuation */
export function normalizeConceptId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

// ─── Store class ─────────────────────────────────────────

export class GraphStore extends BaseStore<KnowledgeGraph> {
  constructor(course: string, professor: string, graph: KnowledgeGraph) {
    super(course, professor, graph);
  }

  protected filePath(): string {
    return knowledgeGraphPath(this.course, this.professor);
  }

  protected stampUpdated(): void {
    this.data.last_updated = new Date().toISOString().slice(0, 16);
  }

  /** Load from disk. Returns null if file missing or invalid. */
  static async load(course: string, professor: string): Promise<GraphStore | null> {
    const path = knowledgeGraphPath(course, professor);
    const data = await BaseStore.loadData(path, KnowledgeGraphSchema);
    if (!data) return null;
    return new GraphStore(course, professor, data);
  }

  /** Create empty graph */
  static empty(course: string, professor: string): GraphStore {
    const graph: KnowledgeGraph = {
      nodes: {},
      edges: [],
      last_updated: new Date().toISOString().slice(0, 16),
    };
    return new GraphStore(course, professor, graph);
  }

  // ─── Domain Getters ─────────────────────────────────────

  getNode(id: string): Readonly<GraphNode> | undefined {
    return this.data.nodes[id];
  }

  getNodeCount(): number {
    return Object.keys(this.data.nodes).length;
  }

  getEdgeCount(): number {
    return this.data.edges.length;
  }

  /** Get all nodes with star_level >= threshold */
  getHighRiskNodes(threshold = 1): { id: string; node: GraphNode }[] {
    return Object.entries(this.data.nodes)
      .filter(([_, node]) => node.star_level >= threshold)
      .map(([id, node]) => ({ id, node }));
  }

  /** Get confusion pairs (confused_with edges) */
  getConfusionPairs(): { from: string; to: string; weight: number }[] {
    return this.data.edges
      .filter((e) => e.type === "confused_with")
      .map((e) => ({ from: e.from, to: e.to, weight: e.weight }));
  }

  /** Get prerequisites for a concept */
  getPrerequisites(nodeId: string): string[] {
    return this.data.edges
      .filter((e) => e.to === nodeId && e.type === "prerequisite")
      .map((e) => e.from);
  }

  /** Get concepts that depend on this one */
  getDependents(nodeId: string): string[] {
    return this.data.edges
      .filter((e) => e.from === nodeId && e.type === "prerequisite")
      .map((e) => e.to);
  }

  /** Get connected concepts via connection_tag edges */
  getConnected(nodeId: string): string[] {
    return this.data.edges
      .filter(
        (e) =>
          e.type === "connection_tag" &&
          (e.from === nodeId || e.to === nodeId)
      )
      .map((e) => (e.from === nodeId ? e.to : e.from));
  }

  /** Find weak clusters — groups of connected high-star nodes */
  getWeakClusters(starThreshold = 1): string[][] {
    const highRisk = new Set(
      this.getHighRiskNodes(starThreshold).map((n) => n.id)
    );
    if (highRisk.size === 0) return [];

    const adj = new Map<string, Set<string>>();
    for (const id of highRisk) adj.set(id, new Set());

    for (const edge of this.data.edges) {
      if (highRisk.has(edge.from) && highRisk.has(edge.to)) {
        adj.get(edge.from)!.add(edge.to);
        adj.get(edge.to)!.add(edge.from);
      }
    }

    const visited = new Set<string>();
    const clusters: string[][] = [];

    for (const id of highRisk) {
      if (visited.has(id)) continue;
      const cluster: string[] = [];
      const queue = [id];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (visited.has(curr)) continue;
        visited.add(curr);
        cluster.push(curr);
        for (const neighbor of adj.get(curr) ?? []) {
          if (!visited.has(neighbor)) queue.push(neighbor);
        }
      }
      if (cluster.length > 1) clusters.push(cluster);
    }

    return clusters;
  }

  // ─── Mutations ───────────────────────────────────────

  /** Add or update a node */
  setNode(id: string, node: GraphNode): void {
    this.data.nodes[id] = node;
    this.markDirty();
  }

  /** Update star_level and error_count for a node */
  updateNodeStars(conceptName: string, starLevel: number, errorCount: number): void {
    const id = normalizeConceptId(conceptName);
    const node = this.data.nodes[id];
    if (node) {
      node.star_level = starLevel;
      node.error_count = errorCount;
      this.markDirty();
    }
  }

  /** Bulk sync star levels from error_notes data */
  syncStarLevels(errors: { concept: string; starLevel: number; errorCount: number }[]): void {
    for (const node of Object.values(this.data.nodes)) {
      node.star_level = 0;
      node.error_count = 0;
    }
    for (const err of errors) {
      this.updateNodeStars(err.concept, err.starLevel, err.errorCount);
    }
    this.markDirty();
  }

  /** Add an edge (deduplicates by from+to+type) */
  addEdge(from: string, to: string, type: EdgeType, source?: string): void {
    const existing = this.data.edges.find(
      (e) => e.from === from && e.to === to && e.type === type
    );
    if (existing) {
      existing.weight++;
      if (source) existing.source = source;
    } else {
      this.data.edges.push({ from, to, type, source, weight: 1 });
    }
    this.markDirty();
  }

  /** Remove all edges of a type between two nodes */
  removeEdge(from: string, to: string, type: EdgeType): void {
    const before = this.data.edges.length;
    this.data.edges = this.data.edges.filter(
      (e) => !(e.from === from && e.to === to && e.type === type)
    );
    if (this.data.edges.length !== before) this.markDirty();
  }

  // ─── Stats ───────────────────────────────────────────

  getStats(): {
    nodeCount: number;
    edgeCount: number;
    highRisk: number;
    confusionPairs: number;
    clusters: number;
  } {
    return {
      nodeCount: this.getNodeCount(),
      edgeCount: this.getEdgeCount(),
      highRisk: this.getHighRiskNodes().length,
      confusionPairs: this.getConfusionPairs().length,
      clusters: this.getWeakClusters().length,
    };
  }
}
