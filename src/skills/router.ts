/**
 * Skill Router — Scenario Detection logic codified.
 *
 * Determines which skill to activate based on user input,
 * available materials, and session state.
 *
 * Maps the SCENARIO DETECTION section of CLAUDE.md to code.
 */

import type { CurrentMode } from "../types/session.js";

// ─── Types ───────────────────────────────────────────────

export type SkillRoute =
  | "input-processing"
  | "tutor"
  | "practice-questions"
  | "practice-notes"
  | "analysis"
  | "exam-coach"
  | "note-organization"
  | "end-session"
  | "dev"
  | "eval";

export type ContentClassification =
  | "COURSE_RELEVANT"
  | "DIRECTIVE"
  | "PROFILE_HINT"
  | "META_CONVERSATION"
  | "AMBIGUOUS";

export interface RoutingContext {
  /** What chapters have notes on disk */
  chaptersAvailable: string[];
  /** Whether reference materials (quizzes, assignments, exams) exist */
  hasReferenceMaterials: boolean;
  /** Whether analysis has been run this session */
  analysisDone: boolean;
  /** Whether user is uploading files */
  isUpload: boolean;
  /** Current mode */
  currentMode: CurrentMode;
}

export interface RouteResult {
  skill: SkillRoute;
  confidence: "high" | "medium" | "low";
  reason: string;
  prerequisite?: string;
}

// ─── Input classification ────────────────────────────────

const END_SESSION_PATTERNS = [
  /오늘\s*끝/,
  /종료/,
  /그만/,
  /여기까지/,
  /끝낼[래게]/,
];

const DEV_PREFIX = /^\/dev\b/;
const EVAL_PREFIX = /^\/eval\b/;

const STUDY_PATTERNS = [
  /공부/,
  /설명/,
  /가르쳐/,
  /알려/,
  /배우/,
  /튜터/,
  /이어서/,
];

const QUESTION_PATTERNS = [
  /문제/,
  /퀴즈/,
  /practice/,
  /연습/,
  /시험\s*대비/,
  /풀어/,
];

const SECTION_QUIZ_PATTERNS = [
  /방금.*퀴즈/,
  /배운\s*거.*퀴즈/,
  /이해.*확인/,
];

const STRATEGY_PATTERNS = [
  /전략/,
  /뭐부터/,
  /공부\s*순서/,
  /시험\s*대비\s*계획/,
  /시험\s*준비\s*시작/,
];

const DIRECTIVE_PATTERNS = [
  /교수.*(?:말|했|강조|중요)/,
  /감점/,
  /시험에\s*나온다/,
  /꼭\s*외워/,
];

const COVERAGE_PATTERNS = [
  /커버리지/,
  /coverage/i,
];

// ─── Router ──────────────────────────────────────────────

/**
 * Route a user message to the appropriate skill.
 */
export function routeMessage(
  message: string,
  context: RoutingContext
): RouteResult {
  const msg = message.trim();

  // 1. Command prefixes (highest priority)
  if (DEV_PREFIX.test(msg)) {
    return { skill: "dev", confidence: "high", reason: "/dev prefix" };
  }

  if (EVAL_PREFIX.test(msg)) {
    return { skill: "eval", confidence: "high", reason: "/eval prefix" };
  }

  // 2. End session
  if (END_SESSION_PATTERNS.some((p) => p.test(msg))) {
    return { skill: "end-session", confidence: "high", reason: "end session signal" };
  }

  // 3. Coverage dashboard shortcut
  if (COVERAGE_PATTERNS.some((p) => p.test(msg))) {
    return { skill: "dev", confidence: "high", reason: "coverage request → /dev coverage" };
  }

  // 4. Upload detection
  if (context.isUpload) {
    return { skill: "input-processing", confidence: "high", reason: "file upload detected" };
  }

  // 5. Strategy / exam coach
  if (STRATEGY_PATTERNS.some((p) => p.test(msg))) {
    return { skill: "exam-coach", confidence: "high", reason: "strategy request" };
  }

  // 6. Section quiz ("방금 배운 거 퀴즈")
  if (SECTION_QUIZ_PATTERNS.some((p) => p.test(msg))) {
    return { skill: "practice-notes", confidence: "high", reason: "section-level quiz request" };
  }

  // 7. Questions / practice
  if (QUESTION_PATTERNS.some((p) => p.test(msg))) {
    // Check if analysis needed first
    if (context.hasReferenceMaterials && !context.analysisDone) {
      return {
        skill: "analysis",
        confidence: "medium",
        reason: "questions requested + reference materials exist, analysis first",
      };
    }
    // Check if notes exist
    if (context.chaptersAvailable.length === 0) {
      return {
        skill: "practice-questions",
        confidence: "low",
        reason: "questions requested but no notes available",
        prerequisite: "노트가 필요해요. 먼저 노트를 올려주세요.",
      };
    }
    return {
      skill: "practice-questions",
      confidence: "high",
      reason: "question/practice request",
    };
  }

  // 8. Study / tutor
  if (STUDY_PATTERNS.some((p) => p.test(msg))) {
    if (context.chaptersAvailable.length === 0) {
      return {
        skill: "tutor",
        confidence: "low",
        reason: "study requested but no notes",
        prerequisite: "공부할 노트가 필요해요. 먼저 노트를 올려주세요.",
      };
    }
    return { skill: "tutor", confidence: "high", reason: "study/explain request" };
  }

  // 9. Directive detection
  if (DIRECTIVE_PATTERNS.some((p) => p.test(msg))) {
    // Not a skill route — just classification
    return { skill: "tutor", confidence: "low", reason: "possible directive" };
  }

  // 10. Default based on current mode
  if (context.currentMode === "tutor") {
    return { skill: "tutor", confidence: "medium", reason: "continuing tutor mode" };
  }
  if (context.currentMode === "practice_q" || context.currentMode === "practice_n") {
    return {
      skill: context.currentMode === "practice_q" ? "practice-questions" : "practice-notes",
      confidence: "medium",
      reason: "continuing practice mode",
    };
  }

  return { skill: "tutor", confidence: "low", reason: "ambiguous — defaulting to tutor" };
}

/**
 * Classify user message content type (Always-On Rule 1).
 */
export function classifyContent(message: string): ContentClassification {
  const msg = message.trim();

  if (DIRECTIVE_PATTERNS.some((p) => p.test(msg))) return "DIRECTIVE";

  // Profile hints
  if (/나는|저는|제가/.test(msg) && /좋아|싫어|선호|스타일/.test(msg)) return "PROFILE_HINT";

  // Meta conversation
  if (/잠깐|쉬자|ㅋㅋ|ㅎㅎ|안녕/.test(msg) && msg.length < 30) return "META_CONVERSATION";

  // If it mentions course content → relevant
  if (/챕터|섹션|chapter|section|코드|함수|class|pointer|const/i.test(msg)) return "COURSE_RELEVANT";

  // Short ambiguous messages
  if (msg.length < 10) return "AMBIGUOUS";

  return "COURSE_RELEVANT";
}
