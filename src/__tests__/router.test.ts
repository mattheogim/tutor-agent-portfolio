import { describe, it, expect } from "bun:test";
import { routeMessage, classifyContent, type RoutingContext } from "../skills/router.js";

const defaultCtx: RoutingContext = {
  chaptersAvailable: ["chapter_1", "chapter_2"],
  hasReferenceMaterials: false,
  analysisDone: false,
  isUpload: false,
  currentMode: "idle",
};

describe("routeMessage", () => {
  it("routes /dev commands", () => {
    const result = routeMessage("/dev status", defaultCtx);
    expect(result.skill).toBe("dev");
    expect(result.confidence).toBe("high");
  });

  it("routes /eval commands", () => {
    const result = routeMessage("/eval list", defaultCtx);
    expect(result.skill).toBe("eval");
    expect(result.confidence).toBe("high");
  });

  it("routes end session signals", () => {
    expect(routeMessage("오늘 끝", defaultCtx).skill).toBe("end-session");
    expect(routeMessage("종료", defaultCtx).skill).toBe("end-session");
    expect(routeMessage("여기까지", defaultCtx).skill).toBe("end-session");
  });

  it("routes coverage requests to dev", () => {
    expect(routeMessage("커버리지 보여줘", defaultCtx).skill).toBe("dev");
    expect(routeMessage("coverage", defaultCtx).skill).toBe("dev");
  });

  it("routes file uploads", () => {
    const ctx = { ...defaultCtx, isUpload: true };
    expect(routeMessage("여기 노트요", ctx).skill).toBe("input-processing");
  });

  it("routes strategy requests to exam-coach", () => {
    expect(routeMessage("전략 짜줘", defaultCtx).skill).toBe("exam-coach");
    expect(routeMessage("뭐부터 해야해", defaultCtx).skill).toBe("exam-coach");
    expect(routeMessage("시험 대비 계획", defaultCtx).skill).toBe("exam-coach");
  });

  it("routes section quiz to practice-notes", () => {
    expect(routeMessage("방금 배운 거 퀴즈", defaultCtx).skill).toBe("practice-notes");
  });

  it("routes question requests to practice-questions", () => {
    expect(routeMessage("문제 풀자", defaultCtx).skill).toBe("practice-questions");
    expect(routeMessage("퀴즈 내줘", defaultCtx).skill).toBe("practice-questions");
  });

  it("routes to analysis first when ref materials exist and not analyzed", () => {
    const ctx = { ...defaultCtx, hasReferenceMaterials: true, analysisDone: false };
    expect(routeMessage("문제 풀자", ctx).skill).toBe("analysis");
  });

  it("routes to practice-questions when ref materials already analyzed", () => {
    const ctx = { ...defaultCtx, hasReferenceMaterials: true, analysisDone: true };
    expect(routeMessage("문제 풀자", ctx).skill).toBe("practice-questions");
  });

  it("routes study requests to tutor", () => {
    expect(routeMessage("공부하자", defaultCtx).skill).toBe("tutor");
    expect(routeMessage("설명해줘", defaultCtx).skill).toBe("tutor");
  });

  it("returns low confidence when notes missing for study", () => {
    const ctx = { ...defaultCtx, chaptersAvailable: [] };
    const result = routeMessage("공부하자", ctx);
    expect(result.skill).toBe("tutor");
    expect(result.confidence).toBe("low");
    expect(result.prerequisite).toBeDefined();
  });

  it("continues current mode for ambiguous messages", () => {
    const ctx = { ...defaultCtx, currentMode: "tutor" as const };
    const result = routeMessage("네 계속해", ctx);
    expect(result.skill).toBe("tutor");
    expect(result.confidence).toBe("medium");
  });

  it("defaults to tutor with low confidence for unknown input", () => {
    const result = routeMessage("xyz", defaultCtx);
    expect(result.skill).toBe("tutor");
    expect(result.confidence).toBe("low");
  });
});

describe("classifyContent", () => {
  it("classifies directives", () => {
    expect(classifyContent("이 교수는 세미콜론 빠지면 감점해")).toBe("DIRECTIVE");
  });

  it("classifies profile hints", () => {
    expect(classifyContent("나는 시각적인 설명을 선호해")).toBe("PROFILE_HINT");
  });

  it("classifies meta conversation", () => {
    expect(classifyContent("잠깐 쉬자")).toBe("META_CONVERSATION");
    expect(classifyContent("ㅋㅋ")).toBe("META_CONVERSATION");
  });

  it("classifies course-relevant content", () => {
    expect(classifyContent("chapter 3의 pointer 부분 설명해줘")).toBe("COURSE_RELEVANT");
  });

  it("classifies short ambiguous messages", () => {
    expect(classifyContent("ㅇㅇ")).toBe("AMBIGUOUS");
  });
});
