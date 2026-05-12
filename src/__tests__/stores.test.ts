import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { SessionStore } from "../state/session-store.js";
import { MetaStore } from "../state/meta-store.js";
import { GraphStore, normalizeConceptId } from "../state/graph-store.js";
import { setBasePath } from "../storage/paths.js";

// Use a temp directory for all store tests
const TEST_BASE = join(import.meta.dir, ".tmp-store-test");
const COURSE = "test101";
const PROF = "TestProf";

function setupDirs(): void {
  const personal = join(TEST_BASE, COURSE, PROF, "personal");
  mkdirSync(personal, { recursive: true });
}

function cleanup(): void {
  if (existsSync(TEST_BASE)) rmSync(TEST_BASE, { recursive: true });
  setBasePath(null);
}

// ─── SessionStore ────────────────────────────────────────

describe("SessionStore", () => {
  beforeEach(() => { cleanup(); setBasePath(TEST_BASE); setupDirs(); });
  afterEach(cleanup);

  test("new store starts with default state", () => {
    const store = new SessionStore(COURSE, PROF);
    expect(store.getMode()).toBe("idle");
    expect(store.isDirty()).toBe(false);
    expect(store.get().practice_state.questions_asked_count).toBe(0);
  });

  test("mutations mark dirty", () => {
    const store = new SessionStore(COURSE, PROF);
    expect(store.isDirty()).toBe(false);
    store.setMode("tutor");
    expect(store.isDirty()).toBe(true);
    expect(store.getMode()).toBe("tutor");
  });

  test("save + load round-trip", async () => {
    const store = new SessionStore(COURSE, PROF);
    store.setMode("practice_q");
    store.completeSection("1.1");
    store.completeSection("1.2");
    store.recordError("pointers");
    store.recordQuestionAnswered();
    store.setExamDate("2026-05-01");
    await store.save();

    const loaded = await SessionStore.load(COURSE, PROF);
    expect(loaded.getMode()).toBe("practice_q");
    expect(loaded.getTutorState().sections_completed).toEqual(["1.1", "1.2"]);
    expect(loaded.getErrorsThisSession()).toEqual(["pointers"]);
    expect(loaded.get().practice_state.questions_asked_count).toBe(1);
    expect(loaded.getExamDate()).toBe("2026-05-01");
    expect(loaded.get().countdown_active).toBe(true);
  });

  test("saveIfDirty skips when clean", async () => {
    const store = new SessionStore(COURSE, PROF);
    const saved = await store.saveIfDirty();
    // saveIfDirty returns void for SessionStore (inherited returns boolean from BaseStore)
    expect(store.isDirty()).toBe(false);
  });

  test("saveIfDirty saves when dirty", async () => {
    const store = new SessionStore(COURSE, PROF);
    store.setMode("tutor");
    expect(store.isDirty()).toBe(true);
    await store.saveIfDirty();
    expect(store.isDirty()).toBe(false);

    const loaded = await SessionStore.load(COURSE, PROF);
    expect(loaded.getMode()).toBe("tutor");
  });

  test("load returns default when file missing", async () => {
    const loaded = await SessionStore.load(COURSE, PROF);
    expect(loaded.getMode()).toBe("idle");
    expect(loaded.isDirty()).toBe(false);
  });

  test("remind queue add/remove", () => {
    const store = new SessionStore(COURSE, PROF);
    store.addRemindItem({ concept: "const_method", earliest_next: 5, got_wrong_at: 3, skill: "practice_q" });
    expect(store.getRemindQueue()).toHaveLength(1);

    // Replace existing
    store.addRemindItem({ concept: "const_method", earliest_next: 8, got_wrong_at: 6, skill: "practice_q" });
    expect(store.getRemindQueue()).toHaveLength(1);
    expect(store.getRemindQueue()[0].earliest_next).toBe(8);

    store.removeRemindItem("const_method");
    expect(store.getRemindQueue()).toHaveLength(0);
  });

  test("resetSession clears session-specific data", () => {
    const store = new SessionStore(COURSE, PROF);
    store.setMode("tutor");
    store.recordError("pointers");
    store.recordQuestionAnswered();
    store.addTempMovement({ concept: "x", direction: "resolved" });
    store.setAnalysisDone(true);

    store.resetSession();
    expect(store.getMode()).toBe("idle");
    expect(store.getErrorsThisSession()).toEqual([]);
    expect(store.get().practice_state.questions_asked_count).toBe(0);
    expect(store.getTempMovements()).toEqual([]);
    expect(store.get().analysis_done).toBe(false);
  });

  test("getDaysUntilExam returns null when no date", () => {
    const store = new SessionStore(COURSE, PROF);
    expect(store.getDaysUntilExam()).toBeNull();
  });
});

// ─── MetaStore ───────────────────────────────────────────

describe("MetaStore", () => {
  beforeEach(() => { cleanup(); setBasePath(TEST_BASE); setupDirs(); });
  afterEach(cleanup);

  const validMeta = {
    course: COURSE,
    professor: PROF,
    last_updated: "2026-04-01T12:00",
    chapters: {
      chapter_1: {
        title: "Intro",
        notes_path: "chapters/chapter_1/notes.md",
        section_plan_path: "chapters/chapter_1/section_plan.md",
        sections: ["1.1", "1.2"],
        last_studied: null,
      },
    },
    questions: { quiz: [], assignments: [], practice_exams: [] },
    personal: {
      error_notes_path: "personal/error_notes.md",
      error_count_active: 0,
      error_count_temp: 0,
      high_star_concepts: [],
      last_error_session: null,
    },
    analysis: { change_log_path: "analysis/change_log.md", analysis_done: false },
  };

  function writeMetaFile(data: object): void {
    const path = join(TEST_BASE, COURSE, PROF, "meta_index.json");
    writeFileSync(path, JSON.stringify(data, null, 2));
  }

  test("load returns null when file missing", async () => {
    const store = await MetaStore.load(COURSE, PROF);
    expect(store).toBeNull();
  });

  test("load parses valid file", async () => {
    writeMetaFile(validMeta);
    const store = await MetaStore.load(COURSE, PROF);
    expect(store).not.toBeNull();
    expect(store!.get().course).toBe(COURSE);
    expect(store!.getChapterKeys()).toEqual(["chapter_1"]);
  });

  test("mutations mark dirty", async () => {
    writeMetaFile(validMeta);
    const store = (await MetaStore.load(COURSE, PROF))!;
    expect(store.isDirty()).toBe(false);

    store.markChapterStudied("chapter_1");
    expect(store.isDirty()).toBe(true);
  });

  test("save + reload preserves changes", async () => {
    writeMetaFile(validMeta);
    const store = (await MetaStore.load(COURSE, PROF))!;

    store.setChapter("chapter_2", {
      title: "Pointers",
      notes_path: "chapters/chapter_2/notes.md",
      section_plan_path: "chapters/chapter_2/section_plan.md",
      sections: ["2.1"],
      last_studied: null,
    });
    store.updateErrorStats(3, 1, ["const_method"]);
    store.addQuiz("questions/quiz/quiz_1.md");
    store.setAnalysisDone(true);
    await store.save();

    const reloaded = (await MetaStore.load(COURSE, PROF))!;
    expect(reloaded.getChapterKeys()).toContain("chapter_2");
    expect(reloaded.getActiveErrorCount()).toBe(3);
    expect(reloaded.getHighStarConcepts()).toEqual(["const_method"]);
    expect(reloaded.isAnalysisDone()).toBe(true);
    expect(reloaded.get().questions.quiz).toEqual(["questions/quiz/quiz_1.md"]);
  });

  test("addQuiz deduplicates", async () => {
    writeMetaFile(validMeta);
    const store = (await MetaStore.load(COURSE, PROF))!;
    store.addQuiz("q1.md");
    store.addQuiz("q1.md");
    expect(store.get().questions.quiz).toEqual(["q1.md"]);
  });

  test("saveIfDirty returns false when clean", async () => {
    writeMetaFile(validMeta);
    const store = (await MetaStore.load(COURSE, PROF))!;
    expect(await store.saveIfDirty()).toBe(false);
  });

  test("getTotalSections counts across chapters", async () => {
    writeMetaFile(validMeta);
    const store = (await MetaStore.load(COURSE, PROF))!;
    expect(store.getTotalSections()).toBe(2);
  });
});

// ─── GraphStore ──────────────────────────────────────────

describe("GraphStore", () => {
  beforeEach(() => { cleanup(); setBasePath(TEST_BASE); setupDirs(); });
  afterEach(cleanup);

  const validGraph = {
    nodes: {
      pointers: { label: "Pointers", source: "ch1/1.1", chapter: 1, section: "1.1", error_count: 0, star_level: 0 },
      references: { label: "References", source: "ch1/1.2", chapter: 1, section: "1.2", error_count: 0, star_level: 0 },
    },
    edges: [
      { from: "pointers", to: "references", type: "prerequisite", source: "ch1", weight: 1 },
    ],
    last_updated: "2026-04-01T12:00",
  };

  function writeGraphFile(data: object): void {
    const path = join(TEST_BASE, COURSE, PROF, "knowledge_graph.json");
    writeFileSync(path, JSON.stringify(data, null, 2));
  }

  test("empty creates store with 0 nodes/edges", () => {
    const store = GraphStore.empty(COURSE, PROF);
    expect(store.getNodeCount()).toBe(0);
    expect(store.getEdgeCount()).toBe(0);
    expect(store.isDirty()).toBe(false);
  });

  test("load returns null when file missing", async () => {
    expect(await GraphStore.load(COURSE, PROF)).toBeNull();
  });

  test("load parses valid file", async () => {
    writeGraphFile(validGraph);
    const store = (await GraphStore.load(COURSE, PROF))!;
    expect(store.getNodeCount()).toBe(2);
    expect(store.getEdgeCount()).toBe(1);
  });

  test("setNode + dirty tracking", () => {
    const store = GraphStore.empty(COURSE, PROF);
    store.setNode("const_method", {
      label: "Const Method", source: "ch2/2.1", chapter: 2, section: "2.1",
      error_count: 0, star_level: 0,
    });
    expect(store.isDirty()).toBe(true);
    expect(store.getNode("const_method")?.label).toBe("Const Method");
  });

  test("addEdge deduplicates and increments weight", () => {
    const store = GraphStore.empty(COURSE, PROF);
    store.addEdge("a", "b", "prerequisite", "ch1");
    store.addEdge("a", "b", "prerequisite", "ch1");
    expect(store.getEdgeCount()).toBe(1);
    expect(store.get().edges[0].weight).toBe(2);
  });

  test("removeEdge", () => {
    const store = GraphStore.empty(COURSE, PROF);
    store.addEdge("a", "b", "confused_with");
    expect(store.getEdgeCount()).toBe(1);
    store.removeEdge("a", "b", "confused_with");
    expect(store.getEdgeCount()).toBe(0);
  });

  test("getPrerequisites and getDependents", async () => {
    writeGraphFile(validGraph);
    const store = (await GraphStore.load(COURSE, PROF))!;
    expect(store.getPrerequisites("references")).toEqual(["pointers"]);
    expect(store.getDependents("pointers")).toEqual(["references"]);
  });

  test("getConfusionPairs", () => {
    const store = GraphStore.empty(COURSE, PROF);
    store.addEdge("x", "y", "confused_with");
    const pairs = store.getConfusionPairs();
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual({ from: "x", to: "y", weight: 1 });
  });

  test("getHighRiskNodes filters by threshold", () => {
    const store = GraphStore.empty(COURSE, PROF);
    store.setNode("a", { label: "A", source: "ch1/1.1", chapter: 1, section: "1.1", error_count: 3, star_level: 2 });
    store.setNode("b", { label: "B", source: "ch1/1.2", chapter: 1, section: "1.2", error_count: 0, star_level: 0 });
    expect(store.getHighRiskNodes(1)).toHaveLength(1);
    expect(store.getHighRiskNodes(3)).toHaveLength(0);
  });

  test("syncStarLevels resets then applies", () => {
    const store = GraphStore.empty(COURSE, PROF);
    store.setNode("pointers", { label: "Pointers", source: "ch1/1.1", chapter: 1, section: "1.1", error_count: 5, star_level: 3 });

    store.syncStarLevels([{ concept: "Pointers", starLevel: 1, errorCount: 2 }]);

    const node = store.getNode("pointers")!;
    expect(node.star_level).toBe(1);
    expect(node.error_count).toBe(2);
  });

  test("save + load round-trip", async () => {
    const store = GraphStore.empty(COURSE, PROF);
    store.setNode("x", { label: "X", source: "ch1/1.1", chapter: 1, section: "1.1", error_count: 0, star_level: 0 });
    store.addEdge("x", "y", "builds_on");
    await store.save();

    const loaded = (await GraphStore.load(COURSE, PROF))!;
    expect(loaded.getNodeCount()).toBe(1);
    expect(loaded.getEdgeCount()).toBe(1);
    expect(loaded.isDirty()).toBe(false);
  });

  test("getStats returns correct counts", () => {
    const store = GraphStore.empty(COURSE, PROF);
    store.setNode("a", { label: "A", source: "ch1/1.1", chapter: 1, section: "1.1", error_count: 1, star_level: 1 });
    store.addEdge("a", "b", "confused_with");
    const stats = store.getStats();
    expect(stats.nodeCount).toBe(1);
    expect(stats.edgeCount).toBe(1);
    expect(stats.highRisk).toBe(1);
    expect(stats.confusionPairs).toBe(1);
  });
});

// ─── normalizeConceptId ──────────────────────────────────

describe("normalizeConceptId", () => {
  test("lowercase + spaces to underscore", () => {
    expect(normalizeConceptId("Const Method")).toBe("const_method");
  });

  test("strips punctuation", () => {
    expect(normalizeConceptId("pointer->deref")).toBe("pointerderef");
  });

  test("handles multiple spaces", () => {
    expect(normalizeConceptId("hello   world")).toBe("hello_world");
  });
});
