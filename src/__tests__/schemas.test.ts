import { describe, it, expect } from "bun:test";
import { SessionStateSchema } from "../types/session.js";
import { MetaIndexSchema } from "../types/meta.js";
import { KnowledgeGraphSchema } from "../types/graph.js";
import { ErrorEntrySchema } from "../types/error-notes.js";

describe("SessionStateSchema", () => {
  it("parses a valid session state", () => {
    const valid = {
      last_updated: "2026-04-02T10:00:00",
      session_date: "2026-04-02",
      current_mode: "tutor",
      tutor_state: {
        current_chapter: "chapter_3",
        current_section: "3.2",
        sections_completed: ["3.1"],
      },
      practice_state: {
        remind_queue: [],
        questions_asked_count: 0,
        errors_this_session: [],
      },
      exam_date: null,
      countdown_active: false,
      analysis_done: false,
      temp_movements: [],
    };
    const result = SessionStateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects invalid current_mode", () => {
    const invalid = {
      last_updated: "2026-04-02T10:00:00",
      session_date: "2026-04-02",
      current_mode: "invalid_mode",
      tutor_state: { current_chapter: null, current_section: null, sections_completed: [] },
      practice_state: { remind_queue: [], questions_asked_count: 0, errors_this_session: [] },
      exam_date: null,
      countdown_active: false,
      analysis_done: false,
      temp_movements: [],
    };
    const result = SessionStateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts all valid modes", () => {
    const modes = ["idle", "input", "tutor", "practice_q", "practice_n", "analysis", "end_session", "dev"];
    for (const mode of modes) {
      const data = {
        last_updated: "2026-04-02T10:00:00",
        session_date: "2026-04-02",
        current_mode: mode,
        tutor_state: { current_chapter: null, current_section: null, sections_completed: [] },
        practice_state: { remind_queue: [], questions_asked_count: 0, errors_this_session: [] },
        exam_date: null,
        countdown_active: false,
        analysis_done: false,
        temp_movements: [],
      };
      expect(SessionStateSchema.safeParse(data).success).toBe(true);
    }
  });
});

describe("MetaIndexSchema", () => {
  const validMeta = {
    course: "cmpt125",
    professor: "Donaldson",
    last_updated: "2026-04-01T10:00",
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

  it("parses valid meta_index", () => {
    const result = MetaIndexSchema.safeParse(validMeta);
    expect(result.success).toBe(true);
  });

  it("defaults codenotes to empty object", () => {
    const result = MetaIndexSchema.parse(validMeta);
    expect(result.codenotes).toEqual({});
  });

  it("defaults ppt to empty array", () => {
    const result = MetaIndexSchema.parse(validMeta);
    expect(result.ppt).toEqual([]);
  });

  it("rejects missing required fields", () => {
    const result = MetaIndexSchema.safeParse({ course: "test" });
    expect(result.success).toBe(false);
  });
});

describe("KnowledgeGraphSchema", () => {
  it("parses valid graph", () => {
    const valid = {
      nodes: {
        const_method: {
          label: "const method",
          source: "chapter_3/3.2",
          chapter: 3,
          section: "3.2",
          difficulty: "medium",
          error_count: 2,
          star_level: 1,
        },
      },
      edges: [
        { from: "const_method", to: "pointer", type: "confused_with", weight: 1 },
      ],
      last_updated: "2026-04-01T10:00",
    };
    const result = KnowledgeGraphSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("defaults star_level and error_count to 0", () => {
    const minimal = {
      nodes: {
        test: {
          label: "test",
          source: "ch1/1.1",
          chapter: 1,
          section: "1.1",
          difficulty: "easy",
        },
      },
      edges: [],
      last_updated: "2026-04-01",
    };
    const result = KnowledgeGraphSchema.parse(minimal);
    expect(result.nodes.test.star_level).toBe(0);
    expect(result.nodes.test.error_count).toBe(0);
  });
});

describe("ErrorEntrySchema", () => {
  const validEntry = {
    concept: "pointer_deref",
    star_level: 2,
    error_history: [
      {
        date: "2026-04-01",
        source: "practice_q",
        result: "wrong" as const,
        context: "tried to dereference a reference",
        thought_process: "I thought & was for pointers",
      },
    ],
    users_understanding: "& gets the address, * dereferences",
    correct_understanding: "& is address-of, * is dereference operator",
    connection_tags: ["pointer", "reference"],
  };

  it("parses valid error entry", () => {
    const result = ErrorEntrySchema.safeParse(validEntry);
    expect(result.success).toBe(true);
  });

  it("rejects star_level out of range", () => {
    const invalid = { ...validEntry, star_level: 5 };
    const result = ErrorEntrySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("defaults status to ACTIVE", () => {
    const result = ErrorEntrySchema.parse(validEntry);
    expect(result.status).toBe("ACTIVE");
  });

  it("defaults recurrence to false", () => {
    const result = ErrorEntrySchema.parse(validEntry);
    expect(result.recurrence).toBe(false);
  });
});
