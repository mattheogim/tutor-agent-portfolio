import { describe, test, expect } from "bun:test";
import { scoreBehavioral, behavioralAverage } from "../eval/behavioral.js";

describe("scoreBehavioral", () => {
  test("returns pending_judge when no transcript", () => {
    const results = scoreBehavioral([
      '"Guiding question used" — 바로 답을 주지 않고 유도 질문 사용',
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].method).toBe("pending_judge");
    expect(results[0].score).toBe(0);
  });

  test("Korean language check — high ratio", () => {
    const results = scoreBehavioral(
      ['"Response in Korean" — 한국어 응답'],
      "이것은 한국어로 작성된 응답입니다. 섹션 1.1에 대해 설명하겠습니다."
    );
    expect(results[0].method).toBe("heuristic");
    expect(results[0].score).toBeGreaterThanOrEqual(4);
  });

  test("Korean language check — low ratio", () => {
    const results = scoreBehavioral(
      ['"Response in Korean" — 한국어 응답'],
      "This is an English response with no Korean at all."
    );
    expect(results[0].method).toBe("heuristic");
    expect(results[0].score).toBeLessThanOrEqual(2);
  });

  test("source citation check", () => {
    const results = scoreBehavioral(
      ['"Source from notes" — Section 1.3의 예제를 활용'],
      "Section 1.3에 따르면 pass by value는 값의 복사를 전달합니다. 노트에서 봤듯이..."
    );
    expect(results[0].method).toBe("heuristic");
    expect(results[0].score).toBeGreaterThanOrEqual(4);
  });

  test("guiding question / Socratic check", () => {
    const results = scoreBehavioral(
      ['"Guiding question used" — 유도 질문 사용'],
      "함수에 변수를 넘기면 뭐가 전달된다고 생각해? 값 자체가 갈까, 아니면 주소가 갈까?"
    );
    expect(results[0].method).toBe("heuristic");
    expect(results[0].score).toBeGreaterThanOrEqual(4);
  });

  test("decision framing check — with options", () => {
    const results = scoreBehavioral(
      ['"Decision Framing format" — 선택지 포맷 사용'],
      "Chapter 3 끝났어요.\n\n추천: B가 좋겠어요.\n\nA) 다음 섹션\nB) 퀴즈\nC) 복습"
    );
    expect(results[0].method).toBe("heuristic");
    expect(results[0].score).toBeGreaterThanOrEqual(4);
  });

  test("mechanical decisions — silent execution", () => {
    const results = scoreBehavioral(
      ['"Mechanical decisions silent" — 물어보지 않고 자동 실행'],
      "포인터는 변수의 주소를 저장하는 변수입니다. 다음으로 넘어가겠습니다."
    );
    expect(results[0].method).toBe("heuristic");
    expect(results[0].score).toBeGreaterThanOrEqual(3);
  });

  test("asks user for decision", () => {
    const results = scoreBehavioral(
      ['"User Challenge asks" — 사용자에게 물어봄'],
      "이 부분은 좀 어렵죠. 다시 설명할까요, 아니면 문제를 풀어볼까요?"
    );
    expect(results[0].method).toBe("heuristic");
    expect(results[0].score).toBeGreaterThanOrEqual(4);
  });

  test("no matching heuristic falls back to pending", () => {
    const results = scoreBehavioral(
      ['"Some obscure assertion" — very specific check that has no rule'],
      "Here is a response."
    );
    expect(results[0].method).toBe("pending_judge");
    expect(results[0].score).toBe(0);
  });

  test("multiple assertions scored independently", () => {
    const results = scoreBehavioral(
      [
        '"Response in Korean" — 한국어 응답',
        '"Some unmatched" — no rule for this',
      ],
      "이것은 한국어 응답입니다."
    );
    expect(results).toHaveLength(2);
    expect(results[0].method).toBe("heuristic");
    expect(results[1].method).toBe("pending_judge");
  });
});

describe("behavioralAverage", () => {
  test("returns 0 when no heuristic scores", () => {
    const avg = behavioralAverage([
      { name: "A", score: 0, note: "", method: "pending_judge" },
    ]);
    expect(avg).toBe(0);
  });

  test("averages only heuristic scores", () => {
    const avg = behavioralAverage([
      { name: "A", score: 5, note: "", method: "heuristic" },
      { name: "B", score: 3, note: "", method: "heuristic" },
      { name: "C", score: 0, note: "", method: "pending_judge" },
    ]);
    expect(avg).toBe(4);
  });
});
