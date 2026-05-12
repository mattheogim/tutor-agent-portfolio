---
name: analysis
description: "참고 자료 분석 — 교수 스타일, 문제 유형 추출 (문제 생성 전용)"
when_to_use: "참고 자료(퀴즈, 과제, 시험)가 존재하고 사용자가 문제를 원할 때, practice-questions 전에 실행"
sections:
  - data-storage
tools:
  - Read
  - Write
  - Grep
  - Glob
effort: medium
permissions:
  allow:
    - "Read(**/questions/**)"
    - "Read(**/chapters/**)"
    - "Write(**/analysis/**)"
    - "Write(**/professor_questions.md)"
  deny:
    - "Write(**/chapters/**)"
    - "Write(**/personal/**)"
    - "Read(**/SKILL.md)"
    - "Read(**/questions/_my_drafts/**)"   # I6 Exam Source Purity — student-made drafts excluded (renamed from bank/ 2026-04-16)
---

> **Shared Rules** → `CLAUDE.md` (P1-P6, Always-On Rules, Decision Classification, Response Style, Completion Status)

# Analysis Skill

## When to activate
- Reference materials exist (quizzes, assignments, guidelines, practice exams) AND user wants questions or exam prep
- NOT triggered if only notes exist
- NOT triggered for upload-only scenarios

---

## CRITICAL RULE

**Analysis output is for QUESTION GENERATION ONLY.**

It does NOT change:
- What the tutor teaches
- The order of sections
- How concepts are explained

It DOES inform:
- What question TYPES to use
- What concepts to EMPHASIZE in questions
- What the professor's STYLE is
- What the professor specifically HIGHLIGHTED
- What SCOPE to cover
- Whether problems can be solved from notes alone

---

## Analysis Steps

### Agent Delegation (기본 모드)

참고 자료가 2개 이상이거나 문제 수가 10개 이상이면 **analysis 에이전트에 위임**:

1. 사용자에게 알림: "참고 자료 분석 중이에요. 잠시 기다려주세요."
2. Agent 도구로 `analysis` 에이전트를 **백그라운드**로 스폰:
   ```
   subagent_type: "analysis"
   run_in_background: true
   prompt: "BOUNDARY: 스킬 정의 파일을 읽지 마세요. 학습 데이터만 접근하세요.
   base={base}, course={course}, professor={professor}.
   questions/ 디렉토리의 참고 자료를 분석하여 교수 스타일, 문제 유형 분포, 출제 패턴 추출.
   결과를 {base}/{course}/{professor}/analysis/analysis_summary.md에 저장.
   완료 후 agent_coordination.json의 last_material_analysis 필드 업데이트."
   ```
3. 에이전트가 완료되면 `analysis/analysis_summary.md` 확인
4. 결과를 사용자에게 요약 표시 (Step 5 포맷)

### Fallback: 직접 분석 (자료 1개, 문제 ≤ 10개)

자료가 소량이면 에이전트 없이 직접 분석:

#### Step 1: Inventory Reference Materials

List what's available:
- "Quiz 1: 5 questions, chapter 3"
- "Assignment 1: 3 tasks, chapters 2-3"

#### Step 2: Per-Material Analysis

For each reference material, extract:

**Concept Tags**: What concepts are tested?
- List each concept with its location in the material
- Cross-reference: is this concept in the uploaded notes? Which section?

**Question Types**: What formats does the professor use?
- T/F, multiple choice, code output prediction, written explanation, code writing, proof, etc.
- Count the distribution

**Professor Style**: How does the professor phrase questions?
- Tests edge cases? Tests definitions? Tests application?
- Tricky wording? Straightforward?
- Follows note order or jumps around?

**Professor Emphasis**: Any explicit highlights?
- "Focus on sections 3.1 and 3.2"
- "Make sure you understand const correctness"
- Things user has mentioned: "교수가 이건 시험에 나온다고 했어"

#### Step 3: Cross-Material Patterns

If multiple reference materials exist:
- Which concepts appear most frequently across materials?
- Is there a consistent question type preference?
- Does difficulty increase across quizzes?

#### Step 4: Solvability Check

For each question in reference materials:
- Can this be answered using only the uploaded notes?
- If YES → note which section
- If NO → add to professor question list:
  "Q4 requires heap allocation knowledge, but this isn't in any uploaded notes. Ask professor: 'Will heap allocation be on the exam?'"

### Step 5: Create Summary (에이전트/직접 분석 공통)

Present the analysis summary to the user AND store for Practice Questions:

```
분석 결과:

📊 문제 유형 분포:
- T/F: 40%, 코드 출력: 30%, 설명: 20%, 코드 작성: 10%

🔑 자주 나오는 개념:
1. const method (퀴즈1 Q3, 퀴즈2 Q1, 숙제1)
2. pointer arithmetic (퀴즈1 Q5, 숙제1)
3. ...

📝 교수 스타일:
- edge case를 좋아함
- "what happens if..." 유형 자주 사용
- 노트 순서대로 출제하는 경향

⚠️ 교수 강조사항:
- "const correctness 확실히 이해해라"
- [사용자가 말한 것]: "교수가 이건 시험에 나온다고 했어"

❓ 노트만으로 풀 수 없는 문제:
- 퀴즈1 Q4: heap allocation (노트에 없음) → 교수에게 물어보세요
```

---

## Professor Question List FILE WRITE

After Step 4 (Solvability Check), if any questions cannot be solved from notes:

**FILE WRITE**: Append to `{base}/{course}/{professor}/professor_questions.md`

```markdown
# Questions to Ask Professor — {course}

## From {material name} — {YYYY-MM-DD}
- {Q_ID}: "{question text}"
  - Notes coverage: {what notes say / what's missing}
  - Suggested question: "{what to ask professor}"
```

- If file exists → append new section (don't overwrite old ones)
- If no unsolvable questions found → don't write

Confirm to user: "교수 질문 리스트에 {N}개 추가했어요: {path}"

---

## What Analysis Does NOT Do
- Does NOT tutor (that's the Tutor skill)
- Does NOT generate questions (that's Practice Q — but Analysis informs it)
- Does NOT modify notes or section plans
- Does NOT tell user "you should study X instead of Y"
- Does NOT activate error notes
