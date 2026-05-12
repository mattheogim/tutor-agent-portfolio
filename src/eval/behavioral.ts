/**
 * Behavioral assertion matcher — regex/keyword heuristics.
 *
 * Provides partial auto-scoring for behavioral assertions when a
 * response transcript is available. Falls back to "needs judge"
 * when no transcript or no matching heuristic exists.
 *
 * Heuristic scores: 5 = strong match, 3 = weak match, 0 = no transcript/no heuristic.
 */

export interface BehavioralResult {
  name: string;
  score: number; // 0-5
  note: string;
  method: "heuristic" | "pending_judge";
}

interface HeuristicRule {
  /** Keywords in the assertion name/description that activate this rule */
  trigger: RegExp;
  /** Check function: returns score (1-5) and note, or null if can't determine */
  check: (response: string) => { score: number; note: string } | null;
}

// ─── Heuristic Rules ────────────────────────────────────

const HEURISTIC_RULES: HeuristicRule[] = [
  // Language check: Korean response
  {
    trigger: /korean|한국어|response in korean/i,
    check: (response) => {
      const koreanChars = response.match(/[\uac00-\ud7af]/g)?.length ?? 0;
      const totalChars = response.replace(/\s/g, "").length;
      if (totalChars === 0) return null;
      const ratio = koreanChars / totalChars;
      if (ratio > 0.3) return { score: 5, note: `Korean ratio: ${Math.round(ratio * 100)}%` };
      if (ratio > 0.1) return { score: 3, note: `Low Korean ratio: ${Math.round(ratio * 100)}%` };
      return { score: 1, note: `Minimal Korean: ${Math.round(ratio * 100)}%` };
    },
  },

  // Source citation: references notes/sections
  {
    trigger: /source|citation|출처|notes|section.*활용|from notes/i,
    check: (response) => {
      const citationPatterns = [
        /section\s+\d+\.\d+/i,
        /chapter\s+\d+/i,
        /노트/,
        /에\s*따르면/,
        /섹션\s+\d/,
        /챕터\s+\d/,
      ];
      const matches = citationPatterns.filter((p) => p.test(response)).length;
      if (matches >= 2) return { score: 5, note: `${matches} citation patterns found` };
      if (matches === 1) return { score: 4, note: "1 citation pattern found" };
      return { score: 2, note: "No clear source citations found" };
    },
  },

  // Guiding question / Socratic: uses question marks, not lecture-style
  {
    trigger: /guiding question|socratic|유도 질문|not.*lectur/i,
    check: (response) => {
      const questions = response.match(/\?/g)?.length ?? 0;
      const sentences = response.split(/[.!?。]\s/).length;
      const questionRatio = sentences > 0 ? questions / sentences : 0;
      if (questionRatio > 0.3) return { score: 5, note: `High question ratio: ${questions} questions in ${sentences} sentences` };
      if (questions >= 2) return { score: 4, note: `${questions} questions found` };
      if (questions >= 1) return { score: 3, note: "1 question found" };
      return { score: 2, note: "No guiding questions detected" };
    },
  },

  // Decision framing format: 상황요약 + 선택지 (A/B/C)
  {
    trigger: /decision framing|선택지|A\).*B\).*C\)|format/i,
    check: (response) => {
      const hasOptions = /[ABC]\)|[가나다]\)|[①②③]|1\)|2\)|3\)/.test(response);
      const hasRecommendation = /추천|recommend/i.test(response);
      if (hasOptions && hasRecommendation) return { score: 5, note: "Options + recommendation found" };
      if (hasOptions) return { score: 4, note: "Choice options found" };
      return { score: 2, note: "No decision framing structure detected" };
    },
  },

  // Error recording: mentions error notes or star level
  {
    trigger: /error.*record|오답.*기록|star.*escalat|★/i,
    check: (response) => {
      const hasStarRef = /★|star_level|error_notes/i.test(response);
      const hasErrorAction = /기록|record|추가|added|update/i.test(response);
      if (hasStarRef && hasErrorAction) return { score: 5, note: "Error recording indicators found" };
      if (hasStarRef || hasErrorAction) return { score: 3, note: "Partial error tracking signal" };
      return null;
    },
  },

  // Completion status protocol
  {
    trigger: /completion.*status|DONE|DONE_WITH_CONCERNS/i,
    check: (response) => {
      if (/DONE_WITH_CONCERNS/.test(response)) return { score: 5, note: "DONE_WITH_CONCERNS status used" };
      if (/DONE/.test(response) || /끝|완료/.test(response)) return { score: 4, note: "Completion signal found" };
      return { score: 2, note: "No clear completion status" };
    },
  },

  // Silent/automatic execution (mechanical decisions)
  {
    trigger: /silent|자동.*실행|mechanical|물어보지 않/i,
    check: (response) => {
      // If the response does NOT ask about routine things, that's a pass
      const asksAboutRoutine = /업데이트.*할까|기록.*할까|저장.*할까/.test(response);
      if (!asksAboutRoutine) return { score: 4, note: "No unnecessary confirmation requests detected" };
      return { score: 2, note: "Asks confirmation for routine actions" };
    },
  },

  // Asks user (user challenge)
  {
    trigger: /asks|물어봄|사용자.*물어|선택권/i,
    check: (response) => {
      const asksUser = /할까요|할래요|어떻게|뭘.*할까|선택|고르|결정/.test(response);
      const hasQuestion = /\?/.test(response);
      if (asksUser && hasQuestion) return { score: 5, note: "Asks user for decision" };
      if (hasQuestion) return { score: 3, note: "Has questions but unclear if decision-type" };
      return { score: 2, note: "No user decision request detected" };
    },
  },
];

// ─── Main scorer ────────────────────────────────────────

/**
 * Score behavioral assertions against a response transcript.
 * If no transcript, all assertions get score=0 with "pending_judge".
 */
export function scoreBehavioral(
  assertions: string[],
  transcript?: string
): BehavioralResult[] {
  return assertions.map((desc) => {
    const name = desc.split("—")[0]?.replace(/"/g, "").trim() ?? desc;

    if (!transcript) {
      return { name, score: 0, note: "No transcript — requires LLM judge", method: "pending_judge" as const };
    }

    // Try each heuristic rule
    for (const rule of HEURISTIC_RULES) {
      if (rule.trigger.test(desc)) {
        const result = rule.check(transcript);
        if (result) {
          return { name, score: result.score, note: `[heuristic] ${result.note}`, method: "heuristic" as const };
        }
      }
    }

    // No matching heuristic
    return { name, score: 0, note: "No matching heuristic — requires LLM judge", method: "pending_judge" as const };
  });
}

/**
 * Compute average score from behavioral results.
 * Only counts results that were actually scored (method=heuristic).
 * Returns 0 if no scores available.
 */
export function behavioralAverage(results: BehavioralResult[]): number {
  const scored = results.filter((r) => r.method === "heuristic");
  if (scored.length === 0) return 0;
  return scored.reduce((sum, r) => sum + r.score, 0) / scored.length;
}
