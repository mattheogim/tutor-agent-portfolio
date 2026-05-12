---
name: practice-notes
description: "챕터 전체 학습 흐름 (튜터 → 섹션 퀴즈 → 챕터 문제)"
when_to_use: "사용자가 '공부 시작', '챕터 공부'라고 말하거나 체계적 학습을 원할 때"
sections:
  - escalation
  - error-system
  - session-state
  - skill-chaining
  - flow-tracking
  - incremental-save
tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Skill
  - "Bash(mkdir *)"
effort: high
permissions:
  allow:
    - "Skill(tutor)"
    - "Skill(practice-questions)"
    - "Write(**/personal/**)"
    - "Write(**/analytics/**)"
    - "Write(**/knowledge_graph.json)"
    - "Write(**/meta_index.json)"
  deny:
    - "Write(**/chapters/**)"
    - "Read(**/SKILL.md)"
---

> **Shared Rules** → `CLAUDE.md` (P1-P6, Always-On Rules, Decision Classification, Response Style, Completion Status, Decision Framing, Phase-Transition)

# Practice Notes Skill

## Overview: Curriculum Mode

Practice Notes is NOT just a quiz tool. It orchestrates a full chapter/week study session:

1. **Load the curriculum** — read section_plan.md for the chapter/week
2. **Section study** — teach each section using Tutor skill (section by section, with code notes)
3. **Section check** (optional) — 2-3 quick questions after each section
4. **Record thought process** — log user's thinking during study (thought_log_ch{N}.md 파일)
5. **Coverage check** — confirm all sections + all code examples covered
6. **Chapter-end questions** — when ALL sections done, trigger full chapter Practice Questions

---

## 🔴 ERROR NOTES ARE ACTIVE during section checks and chapter-end questions
## ⚪ ERROR NOTES ARE OFF during tutor explanation phases

---

## On Activation

1. **Analytics: skill_activated** — `mkdir -p {base}/{course}/{professor}/analytics` 후 append to `analytics/learning_events.jsonl`:
   `{"event":"skill_activated","ts":"{ISO8601}","course":"{course}","professor":"{professor}","skill":"practice-notes","context":"chapter_{N}"}`

2. Ask: `"몇 챕터 (또는 몇 주차) 공부할까요?"`
2. Load `{base}/{course}/{professor}/chapters/chapter_{N}/section_plan.md`
3. Display the curriculum to the user:
```
📚 Chapter [N] — [Title] 커리큘럼:

Section [N.1]: [name]
Section [N.2]: [name]
Section [N.3]: [name]
...

총 [N]개 섹션. 다 끝나면 챕터 전체 문제 풀게요!
시작할까요?
```
4. If user says yes → begin Section Study Flow.

---

## Section Study Flow (Per Section)

### Step 1: Tutor Phase
- Activate Tutor skill for this section.
- Follow all Tutor skill rules: Socratic method, note-based only, section scope, code notes integration.
- During tutor, record user's thought process in `thought_log_ch{N}.md` (파일 — Tutor가 섹션 끝에 기록):
  - User explains something → note what they said and whether it was correct/partial/incorrect
  - Confusion signal detected → note which concept triggered it
  - This log informs section check emphasis and chapter-end question targeting.

### Step 2: Section Check (Optional, after tutor phase)

After each section completes, ask:
`"간단히 확인 문제 풀어볼까요? (1-2개) (네/아니요)"`

If **yes**:
- Generate 2-3 questions scoped ONLY to the just-studied section.
- Error notes 🔴 ACTIVE during this check.
- Thought process: record + show immediate feedback (same format as Practice Questions).
- On wrong answers: ALWAYS record confused concepts AND user's thought process to error_notes.
- Review rule: section check 오답은 error_notes에 기록되며, 이후 섹션 check나 chapter-end에서 error_notes 기반으로 review됨.

If **no**:
- Skip the check, advance to next section.

### Step 3: Advance
`"다음 섹션으로 갈까요? [N.X: name]"`

---

## Section Check: Question Types

- Concept recall: `"What is [term]?"`
- Application: `"What would happen if...?"`
- Code (CS): blank-page style — `"노트 보지 않고 [function] 작성해보세요"`
  - Same concept, different variable names. NOT a harder concept.
- T/F on key points

With analysis_summary: slightly match professor style, but stay section-scoped.

---

## Coverage Check (Before Chapter-End Questions)

When all sections of the chapter/week are studied:

1. **Section coverage** — confirm every section in the section_plan was covered.
   - If any skipped → cover it now + small quiz.

2. **Code notes coverage** — confirm every code example in `codenotes/weekX/` was covered.
   - Map each code note subdirectory to a note section.
   - If any missed → cover them before moving on.

3. **Chapter Synthesis** — 전체 챕터 종합 linking:
   - `"이 챕터 전체를 관통하는 핵심 아이디어가 뭘까?"`
   - knowledge_graph edges로 학생 답변 검증
   - 이건 Tutor의 Chunk Linking 확장판 — 챕터 스케일에서 개념 연결 확인

4. **End-of-note Questions** — if the note has a "Questions" or "Exercises" section:
   - Go through ALL of them. Don't skip.
   - Error notes 🔴 ACTIVE.

Only after coverage check passes → proceed to Chapter-End Questions.

---

## Chapter/Week Completion → Chapter-End Questions

When ALL sections are covered AND coverage check is passed, display:
```
✅ [Chapter N / Week N] 완료!
모든 섹션 다 봤어요. 이제 챕터 전체 문제 풀까요?
```

Trigger **Practice Questions** skill for the full chapter:
- Error notes 🔴 ACTIVE
- Read thought_log_ch{N}.md to weight questions toward concepts the user struggled with during study
- All Practice Questions rules apply (error-based review, error resolution, etc.)

---

## Tutor Thought Log (FILE WRITE — via Tutor skill)

During tutor phases, Tutor skill writes to `{base}/{course}/{professor}/personal/thought_log_ch{N}.md` at the end of each section.

This file is shared between tutor and practice-questions — both append to the same file.

Used for:
- Deciding which concepts to emphasize in section checks
- Informing chapter-end question selection
- Profile hints for end-session
- Long-term review of how the user's understanding evolved

---

## Review Rule Summary

| Context | Review 방식 |
|---|---|
| Section check errors | error_notes에 기록 → 이후 섹션에서 review 가능 |
| Chapter-end questions | Error-Based Review (practice-questions 규칙) |

---

## Error Notes FILE WRITE (🔴 during checks and chapter-end questions)

On every wrong or confused answer, write to file immediately.
Path: `{base}/{course}/{professor}/personal/error_notes.md`

**PRE-WRITE VERSIONING** (on every write):
1. If file exists: write current to `personal/.versions/error_notes_{YYYY-MM-DD_HHMMSS}.md`
2. Append to `{base}/{course}/{professor}/analysis/change_log.md`:
```markdown
## {timestamp} — error_notes.md updated
- **Trigger**: practice-notes (wrong answer on "{concept}")
- **Change**: appended new error entry or incremented ★
- **Backup**: {backup path}
```

Write rules:
- If file exists: find existing entry → append new occurrence + increment ★ if repeat
- If file doesn't exist: create it
- ALWAYS include confused concepts AND user's thought process in the entry
- **Group under chapter/source headings** (same structure as Practice Questions — see grouping rule there)
- Also add to `practice_state.errors_this_session` for end-session summary
- **Recurrence check**: Before writing, search `personal/temp/resolved_*.md` for concept name. If found → mark as RECURRENCE, set ★★ minimum
- **★ escalation**: ★(1st) → ★★(2nd) → ★★★(3rd). Recurrence = ★★ minimum. Never decreases.

**Analytics events** (append to `{base}/{course}/{professor}/analytics/learning_events.jsonl`):

On every answer (section check or chapter-end):
`{"event":"question_answered","ts":"{ISO8601}","course":"{course}","professor":"{professor}","concept":"{concept}","correct":{true|false},"question_type":"{type}","source":"practice_notes","chapter":"chapter_{N}"}`

On wrong answer (after error_notes write):
`{"event":"error_created","ts":"{ISO8601}","course":"{course}","professor":"{professor}","concept":"{concept}","star_level":{N},"is_recurrence":{true|false},"chapter":"chapter_{N}"}`

**Session state 저장** (매 답변 후): `{base}/{course}/{professor}/personal/current_session.json` 덮어쓰기
- `practice_state.questions_asked_count` 증가
- 오답 시 `practice_state.errors_this_session`에 concept 추가

Entry format:
```markdown
### [Concept Name] — ★[count]

**Error History**:
- {YYYY-MM-DD}: Practice Notes — wrong
  - Context: [confused with what]
  - Thought process: [what user thought]

**User's Understanding**: [what they thought]
**Correct Understanding**: [what's right]
**Connection Tags**: [related concepts]
**Source**: [section name]
**Last Reviewed**: {YYYY-MM-DD}
```

For RECURRENCE:
```markdown
## [Concept Name] — ★★

**RECURRENCE** — Previously resolved on {resolved_date}, re-activated {today}
[...new error + original history preserved...]
```
Add to `session_state.temp_movements`: `{concept, direction: "reactivated"}`.

---

## Knowledge Graph Update (FILE WRITE, after error_notes write)

After every error_notes FILE WRITE:
1. Read `{base}/{course}/{professor}/knowledge_graph.json` (skip if doesn't exist)
2. For the errored concept: normalize name → node ID, increment error_count, update star_level
3. Connection Tags → add/update `connection_tag` edges (weight +1 if edge exists)
4. "confused X with Y" context → add/update `confused_with` edge
5. Set `last_updated` = now, write back (overwrite)

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
알림: `💾 meta_index 저장됨`

---

## Auto-Resolve Check (after CORRECT remind answer)

After a CORRECT answer on a REMIND concept:
1. Check if concept is in active error_notes (not RESOLVED)
2. Analyze thought process — genuinely correct, not a lucky guess?
3. If both met → display: "이 개념 이해됐어요! temp로 이동할까요? (네/나중에)"
4. If user says 네:
   a. Read full entry from error_notes.md
   b. Append to `personal/temp/resolved_{YYYY-MM-DD}.md` (RESOLVED format)
   c. Add `**STATUS**: RESOLVED — moved to temp/resolved_{date}.md` at top of entry in error_notes.md
   d. Apply PRE-WRITE VERSIONING before modifying error_notes.md
   e. Add to `session_state.temp_movements`: `{concept, direction: "resolved"}`
   f. **Analytics: error_resolved** — append to `analytics/learning_events.jsonl`:
      `{"event":"error_resolved","ts":"{ISO8601}","course":"{course}","professor":"{professor}","concept":"{concept}","days_active":{first_date to today},"sessions_to_resolve":{error history count},"trigger":"auto_remind"}`

---

## Redirect to Tutor (Mid-Session)

If user is fundamentally confused during a section check:
`"이 부분 다시 노트 볼까요? Section [N.X]로 돌아갈게요."`
→ Re-activate Tutor for that section, then return to the curriculum flow.

---

## Module-End Error Review

Before ending the session (if chapter-end questions aren't reached):
1. Check error_notes.md for untested ★ concepts from this session's section checks.
2. If any → `"아직 확인 못 한 개념이 있어요"` → quick review (1-2문제).

---

## End of Chapter Session

1. Error notes → OFF
2. Summary: `"[Chapter N] 완료! [N]섹션, [X]문제, [Y]개 맞음, [Z]개 틀림"`
3. List concepts from error notes recorded this session
4. `"다음엔 [Chapter N+1]로 넘어갈까요?"`
5. **Incremental save** (incremental-save.md Trigger 3):
   a. error_notes.md의 analysis hash 변경 시 (incremental-save.md Trigger 3a 참조):
      - Read error_notes.md → active 개념+★ hash 계산 → meta_index의 last_analysis_hash와 비교
      - 변경됐으면 → error_notes_analysis.md 재생성 + hash 갱신
      - 동일하면 → skip
   b. Write partial `handoff.md`:
      - Last Studied = current chapter, Mode = practice_n
      - Priority = ★★+ concepts from meta_index
      - Questions = practice_state counts
      - Mood = "mid-session", Duration = "진행 중"
   c. 알림: `💾 error_notes_analysis, handoff 저장됨` (analysis 안 썼으면 `💾 handoff 저장됨`)
