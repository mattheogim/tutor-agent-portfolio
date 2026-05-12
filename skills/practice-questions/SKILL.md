---
name: practice-questions
description: "챕터 기반 연습 문제 생성 + 에러 추적 (★ 에스컬레이션)"
when_to_use: "사용자가 '문제 내줘', '연습 문제', '퀴즈'라고 말하거나 문제 풀기를 원할 때"
sections:
  - escalation
  - error-system
  - session-state
  - schemas
  - flow-tracking
  - incremental-save
tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - "Bash(mkdir *)"
effort: high
permissions:
  allow:
    - "Write(**/personal/error_notes.md)"
    - "Write(**/analytics/learning_events.jsonl)"
    - "Write(**/personal/current_session.json)"
    - "Write(**/knowledge_graph.json)"
    - "Write(**/meta_index.json)"
    - "Write(**/personal/handoff.md)"
    - "Write(**/personal/error_notes_analysis.md)"
    - "Read(**/chapters/**)"
    - "Read(**/questions/**)"
    - "Read(**/analysis/**)"
    - "Read(**/personal/**)"
  deny:
    - "Write(**/chapters/**)"
    - "Write(**/questions/**)"
    - "Read(**/SKILL.md)"
    - "Read(**/CLAUDE.md)"
    - "Read(**/questions/_my_drafts/**)"   # I6 Exam Source Purity — student-made drafts excluded (F7-B001-R1)
---

> **Shared Rules** → `CLAUDE.md` (P1-P6, Always-On Rules, Decision Classification, Response Style, Completion Status, Decision Framing, Phase-Transition)

# Practice Questions Skill

## 🔴 ERROR NOTES ARE ACTIVE IN THIS SKILL
Every wrong or confused answer → update error notes immediately.
This is the ONLY skill (along with Practice Notes) where error notes are fully active.

---

## Error Notes Trigger Conditions

Error notes activate whenever the user is answering questions from ANY of the following sources:
- Practice questions (note-based or analysis-informed)
- Section quizzes (Practice Notes)
- In-class quiz re-attempts
- Assignment questions
- Midterm / final exam practice questions
- Practice exam questions
- Code exercise questions
- Question bank items
- Code notes questions

**Two conditions for recording an error**:
1. **Wrong answer** — any incorrect answer, including "아 맞다" hesitations
2. **Repeated wrong** — same concept wrong across multiple sessions (★ increments) → this is the KEY signal that deeper analysis is needed

**Thought process role**:
- Record the user's thought process IMMEDIATELY per question (for feedback and record)
- Deep pattern analysis (Type A/B/C/D, root cause tracing, weak clusters) → END-SESSION ONLY
- Per-question: show feedback + record. Do NOT attempt pattern analysis during the question session.

---

## Question Generation

### Step 0: Analytics — skill_activated

`mkdir -p {base}/{course}/{professor}/analytics` 후 append to `analytics/learning_events.jsonl`:
`{"event":"skill_activated","ts":"{ISO8601}","course":"{course}","professor":"{professor}","skill":"practice-questions","context":"chapter_{N}"}`

### Step 1: Check What's Available

Before generating:
- Which chapter/section notes exist?
- Does `analysis_summary` exist? (from Analysis skill)
  - YES → use professor style, types, emphasis
  - NO → generate from notes only (still good, just not professor-style)
- Any existing error notes? → prepare review questions from error_notes

### Step 2: Generate Questions

**From notes only** (no analysis):
- Read the relevant note section(s)
- Generate questions testing key concepts from those sections
- Mix question types: concept explanation, T/F, code output, code writing
- Difficulty: match user's level (start medium, adjust based on performance)

**With analysis** (analysis_summary exists):
- Same as above, BUT:
- Match professor's question TYPE distribution (e.g., 40% T/F)
- Emphasize frequently-tested concepts
- Use professor's phrasing STYLE
- Focus on professor-highlighted topics

### Step 3: Format

- Present ONE question at a time (unless user asks for a batch)
- For multiple choice: **RANDOMIZE answer positions**
  - NEVER: a, a, a, a or b, b, b, b patterns
  - Distribute answers roughly evenly across a, b, c, d
- Answer key is NOT shown until user answers
- After user answers → show correct answer with explanation

---

## Thought Process Analysis

// 사용자가 답과 함께 생각 과정을 적으면 매우 중요하게 분석.

When user provides their answer WITH their reasoning:

### Step 1: Read Every Word
Analyze the thought process carefully:
- Is the logic correct, even if the answer is wrong?
- Is the logic wrong, even if the answer is right?
- Where exactly does the reasoning break down?
- Is there a misconception hidden in "correct-sounding" reasoning?

### Step 2: Respond — Show Everything Together

// 사용자가 위로 올라갔다 내려갔다 하지 않도록.

Display in ONE response:
```
📋 문제: [the question]

✍️ 당신의 답: [user's answer]
💭 당신의 생각 과정: [user's reasoning - quoted or paraphrased]

✅/❌ 결과: [correct/incorrect]

📝 설명:
- [What was correct in their reasoning]
- [What was incorrect — specific, gentle]
- [The correct reasoning path]
- [Source: notes chapter X, section Y]
```

### Step 3: Even if Correct
If the answer is right BUT the reasoning has issues:
"답은 맞았는데, 생각 과정에서 [specific part]은 좀 위험해요. 왜냐하면..."

---

## Error Notes Update (🔴 ACTIVE)

When user gets something wrong or shows confusion:

Record immediately. ALWAYS include the user's thought process and what they were confused about.

### Grouping Rule
Entries in error_notes.md MUST be grouped under chapter/source headings:
```markdown
# Error Notes — {course} ({professor})

## Chapter 1
### [Concept] — ★
...

## Chapter 3
### [Concept] — ★★
...

## Assignments
### [A4] [Concept] — ★
...

## Warnings (맞았지만 위험한 추론)
### [Concept]
...
```
- If a chapter/source heading doesn't exist yet → create it
- New entries go under the matching heading
- Warnings section is for correct answers with shaky reasoning

### ★ Escalation Rules
| Condition | ★ Level |
|---|---|
| First wrong | ★ |
| Same concept wrong again (same or different session) | ★★ |
| 3rd occurrence | ★★★ |
| Was in temp (resolved), got wrong again | ★★ minimum (RECURRENCE) |
| Correct answer but dangerous reasoning (⚠️) | No ★, goes to Warnings |

★ NEVER decreases. Only goes up or moves to temp when resolved.

### Entry Format
```markdown
### [Concept] — ★[count]

**Error History**:
- {YYYY-MM-DD}: {source: Practice Q / Bank / Quiz / Assignment / Code Exercise / Practice Paper} — wrong
  - Context: [what was confused with what]
  - Thought process: [what user was thinking — MUST record]

> **Source dedup**: practice-paper (백지 연습)에서 튜터가 append할 때는 `source: "Practice Paper"` + 파일 경로 포함. 같은 날 같은 concept + 같은 source 중복 방지 — 기존 엔트리에 occurrence만 추가하고 ★ increment. 자세한 건 `.claude/sections/practice-paper.md` "ERROR NOTES 통합" 참조.

**User's Understanding**: [what they thought]
**Correct Understanding**: [what's actually right]
**Question Type**: [T/F, code output, MC, code writing, etc.]
**Connection Tags**: [related concepts]
**Source**: [which note section / assignment / quiz]
```

Even if user says "아 맞다 그거구나" (slight hesitation) → still record.

---

## Error Notes FILE WRITE

On every wrong or confused answer, ALSO write to file immediately (don't batch).
Path: `{base}/{course}/{professor}/personal/error_notes.md`

**PRE-WRITE VERSIONING** (on every write):
1. If file exists: write current to `personal/.versions/error_notes_{YYYY-MM-DD_HHMMSS}.md`
2. Append to `{base}/{course}/{professor}/analysis/change_log.md`:
```markdown
## {timestamp} — error_notes.md updated
- **Trigger**: practice-questions (wrong answer on "{concept}")
- **Change**: appended new error entry or incremented ★
- **Backup**: {backup path}
```

Write rules:
- If file exists: find existing entry for that concept → append new occurrence + increment ★ if repeat
- If file doesn't exist: create it
- If concept is new: append full entry block
- Also add to `practice_state.errors_this_session` for end-session summary
- **Recurrence check**: Before writing, search `personal/temp/resolved_*.md` for concept name. If found → mark as RECURRENCE, set ★★ minimum

**Analytics events** (append to `{base}/{course}/{professor}/analytics/learning_events.jsonl` after every answer):

On every answer (right or wrong):
`{"event":"question_answered","ts":"{ISO8601}","course":"{course}","professor":"{professor}","concept":"{concept}","correct":{true|false},"question_type":"{type}","source":"practice_q","chapter":"chapter_{N}"}`

On wrong answer (after error_notes write):
`{"event":"error_created","ts":"{ISO8601}","course":"{course}","professor":"{professor}","concept":"{concept}","star_level":{N},"is_recurrence":{true|false},"chapter":"chapter_{N}"}`

**Session state 저장** (매 답변 후): `{base}/{course}/{professor}/personal/current_session.json` 덮어쓰기
- `practice_state.questions_asked_count` 증가
- 오답 시 `practice_state.errors_this_session`에 concept 추가

Entry format:
```markdown
## [Concept Name] — ★[count]

**Error History**:
- {YYYY-MM-DD}: Practice Q — wrong
  - Context: [confused with what]
  - Thought process: [what user thought]

**User's Understanding**: [what they thought]
**Correct Understanding**: [what's right]
**Connection Tags**: [related concepts]
**Source**: [which question / chapter]
**Last Reviewed**: {YYYY-MM-DD}
```

For RECURRENCE (was in temp, re-activated):
```markdown
## [Concept Name] — ★★

**RECURRENCE** — Previously resolved on {resolved_date}, re-activated {today}

**Error History**:
[...new error entry...]
[...original error history preserved...]
```
Add to `session_state.temp_movements`: `{concept, direction: "reactivated"}`.

**RECURRENCE 프레이밍**: 부정적으로 다루지 않음. "전에 맞았던 건데 다시 헷갈리네요. 한 번 더 정리하면 더 단단해질 거예요." — 재학습이 정상적인 과정임을 전달. "뇌가 재구성" 같은 과학적 claim은 쓰지 않음 (P2).

---

## Knowledge Graph Update (FILE WRITE, after error_notes write)

After every error_notes FILE WRITE:
1. Read `{base}/{course}/{professor}/knowledge_graph.json` (skip if doesn't exist)
2. For the concept that errored:
   - Normalize concept name → node ID (lowercase, spaces→`_`, strip punctuation)
   - If node exists: increment `error_count`, set `star_level` from current ★ count
   - If node doesn't exist: create node with available info
3. Extract Connection Tags → for each tag pair, add/update `connection_tag` edge (weight +1 if edge exists)
4. If "Context: confused X with Y" found → add/update `confused_with` edge between X and Y
5. Set `last_updated` = now
6. Write back (overwrite)

---

## Meta Index Update (FILE WRITE, after knowledge_graph — incremental-save.md Trigger 1)

After every knowledge_graph FILE WRITE:
1. Read `{base}/{course}/{professor}/meta_index.json` (create skeleton if missing)
2. Count active entries in error_notes.md (skip RESOLVED) → `personal.error_count_active`
3. Collect ★★+ concept names → `personal.high_star_concepts`
4. Set `personal.last_error_session` = today (YYYY-MM-DD)
5. Set `last_updated` = now
6. Write back (overwrite)

**최적화**: error_notes.md는 오답 기록 시 이미 읽은 상태. 추가 Read 없음.
meta_index.json만 1 Read + 1 Write.

알림: error_notes, knowledge_graph 저장과 같은 턴이므로 응답 끝에 `💾 meta_index 저장됨` 한 줄.

---

## Error-Based Review

// 문제 세트에 기존 오답 개념의 review 문제를 포함.

**세트 시작 시**:
1. Read error_notes.md → active(non-RESOLVED) 항목 수집
2. 우선순위 정렬: ★★★ > ★★ > ★ > 최근 오답순
3. `last_reviewed`가 최근 2일 이내 → 제외
4. 상위 3-5개 선택 → review 대상 세트

**Review 문제 배치**:
- 전체 문제 세트에 걸쳐 분산 (연속 배치 금지)
- 새 문제와 review 문제 교대: 대략 3-4문제마다 1개 review
- 형식: 원래 오답과 다른 형태(variation) 권장

**오답 시**:
- ★ 증가 (기존 error_notes 규칙대로)
- Variation 즉시 1회 출제
- Variation도 틀림 → 3-strike 카운트 (escalation.md 참조)
- 3-strike 도달 → "이 개념 노트 다시 볼까요?" (tutor 복귀 제안)

**정답 시**:
- `last_reviewed` = today로 error_notes에 기록
- 2회 연속 맞춤 (이번 세트 + 이전 세트) → auto-resolve 후보
  - "이 개념 이해됐어요! temp로 이동할까요? (네/나중에)"

---

## Auto-Resolve Check (after CORRECT review answer)

After recording a CORRECT answer on a review question (a concept that appeared in error_notes):
1. Check if concept exists in `personal/error_notes.md` (active, not RESOLVED)
2. Analyze the user's thought process — was it genuinely correct, not a lucky guess?
3. If both conditions met (review question + sound thought process):
   - Display: "이 개념 이해됐어요! temp로 이동할까요? (네/나중에)"
   - If user says 네:
     a. Read the concept's full entry from error_notes.md
     b. Append to `personal/temp/resolved_{YYYY-MM-DD}.md`:
        ```markdown
        ## [Concept Name] — RESOLVED

        **Originally Active**: ★[N] ({first_date} — {today})
        **Resolved**: {YYYY-MM-DD} | **Trigger**: auto — correct review answer (practice-questions)
        [... original entry content preserved word-for-word ...]
        ```
     c. Add `**STATUS**: RESOLVED — moved to temp/resolved_{date}.md` at top of entry in error_notes.md
     d. Apply PRE-WRITE VERSIONING before modifying error_notes.md
     e. Add to `session_state.temp_movements`: `{concept, direction: "resolved"}`
     f. **Analytics: error_resolved** — append to `analytics/learning_events.jsonl`:
        `{"event":"error_resolved","ts":"{ISO8601}","course":"{course}","professor":"{professor}","concept":"{concept}","days_active":{first_date to today},"sessions_to_resolve":{error history count},"trigger":"auto_review"}`

---

## Opposite / Related Concept Check

After user answers (right or wrong), consider:

1. **Opposite concept exists in notes?**
   - YES → test it: "const method를 알겠으면, non-const method는?"
   - NO → mention only: "참고로 반대 개념인 [X]도 있는데, 이건 이 수업 범위 밖이에요"

2. **User's thought process suggests related confusion?**
   - If their reasoning mixed up related concepts → test those too
   - Follow knowledge graph connections (if user confused A, check related B)
   - But depth limit: max 3 related concepts. Don't spiral.

3. **Boundary check**:
   - Is this concept in the notes? → fair game
   - Is this concept NOT in the notes? → mention once, don't test

---

## Problem Variation

Don't always ask the same format:
- T/F → code output prediction
- "What is X?" → "What would happen if X were different?"
- Forward → reverse ("Given output, what was the input?")
- Theory → code ("Write a function that demonstrates this concept")

But STAY within the boundary of uploaded notes and course scope.

---

## Redirect to Tutor

If user is fundamentally confused (not just wrong on details):
"이 부분은 좀 더 공부가 필요할 것 같아요. 노트 Section [X]로 돌아가서 다시 볼까요?"

Let user decide. Don't force.

---

## End of Question Set

When finishing a question session:
1. Error notes active → OFF
2. Brief summary: "오늘 [N]문제 풀었어요. [X]개 맞고, [Y]개 틀렸어요."
3. List concepts that were wrong (from error notes)
4. **학생 자기평가**: "이 챕터 자신감 0-10점으로 몇 점 줄래?"
   - 점수를 thought_log에 기록 (`Practice self-assessment: {N}/10`)
   - ≤4이면: "다시 노트 보고 올까요?" 제안
5. Ask: "다음 섹션 공부할까요, 더 문제 풀까요, 아니면 오늘 끝낼까요?"
6. **Incremental save** (incremental-save.md Trigger 3):
   a. error_notes.md의 analysis hash 변경 시 (incremental-save.md Trigger 3a 참조):
      - Read error_notes.md → active 개념+★ hash 계산 → meta_index의 last_analysis_hash와 비교
      - 변경됐으면 → error_notes_analysis.md 재생성 + hash 갱신
      - 동일하면 → skip
   b. Write partial `handoff.md`:
      - Last Studied = current chapter, Mode = practice_q
      - Priority = ★★+ concepts from current meta_index
      - Questions = practice_state counts
      - Review priority: ★★+ concepts from error_notes
      - Mood = "mid-session", Duration = "진행 중"
   c. 알림: `💾 error_notes_analysis, handoff 저장됨` (analysis 안 썼으면 `💾 handoff 저장됨`)

---

## Mock Exam Mode (시험 시뮬레이션)

트리거: exam-coach Step 4 옵션 C, 또는 "시험 시뮬레이션 해줘", "모의 시험"

일반 practice와 독립된 모드. error_notes review와 독립적이며 자체 mock_exam queue 사용.

### 1. 문제 세트 생성
- exam scope 내 **모든 챕터**에서 concepts 수집 (section_plan만 읽기 — P6)
- 비율: Hard 30% / Medium 50% / Easy 20%
- knowledge_graph의 `confused_with` edges 활용 → 혼동 쌍 포함
- 총 10-15문제 (시험 규모에 맞게 조절)
- analysis_summary 있으면 → 교수 출제 스타일/유형 비율 반영

### 2. 순서: Hard Start
- 처음 2문제: Hard (★★+ 우선, cross-chapter)
- 중간: Medium/Easy 교차 (챕터별로 고르게 분포)
- 마지막 2문제: Hard (앞과 다른 챕터)

### 3. Jump to Easy 트리거 (신호 기반, 시간 기반 아님)
학생 신호 감지:
- `"모르겠어"`, `"넘어가"`, `"힌트 줘"`, 빈 답변, 명확히 막힌 부분적 답변
- → `"이건 넘어가고 쉬운 문제 먼저 풀자. 나중에 다시 올게."`
- `mock_exam.skipped_for_later`에 추가
- 넘어간 사실을 부정적으로 다루지 않음 — "시험에서도 이 전략 쓰면 돼요"

### 4. Return Phase
- Easy/Medium 다 풀고 나면: `"아까 넘긴 문제 다시 해볼래?"`
- 힌트 1개 제공: 관련 개념 리마인드 (답은 아님)
- 재시도. 여전히 못 풀면 정답 + 설명 제공.

### 5. 결과 보고
```
📋 Mock Exam 결과
정답률: X/Y (Z%)
챕터별: Ch3 3/4, Ch8 2/3, Ch12 1/3
Skip 후 재시도: A/B 맞음
가장 약한 영역: [chapter/concept]
```
- error_notes 업데이트 (일반 practice와 동일 규칙)
- analytics: `question_answered` 이벤트에 `"source": "mock_exam"` 추가

### 6. Session State
`current_session.json`의 `practice_state`에 추가:
```json
"mock_exam": {
  "active": true,
  "questions": [
    {"concept": "...", "chapter": "...", "difficulty": "hard", "status": "pending"}
  ],
  "skipped_for_later": ["concept_1"],
  "results": {"correct": 0, "wrong": 0, "skipped": 0}
}
```
Mock exam 종료 시 `"active": false`로 설정.

### Closed-Book 손코딩 모드 (exam-coach에서 트리거)

exam-coach가 Mock Exam Mode를 closed-book으로 트리거할 때:
- `current_session.json`의 `mock_exam.closed_book = true`로 설정됨
- 코드 작성 문제에서: `"IDE 없이 종이에 쓴다고 생각하고 작성해보세요"`
- 채점: 컴파일 에러 (문법) / 로직 에러 (동작) 분리
  - 문법: 세미콜론, include, 변수 선언 위치, return type, 중괄호
  - 로직: 알고리즘 정확성, edge case, 무한루프
- 피드백: 손코딩 특화 — 중요한 문법 에러만 지적 (사소한 건 무시)
- error_notes source: `"Mock Exam (closed-book)"`
- 시간제한 표시: 총 시간 / 문제 수 = 문제당 시간 안내
