---
name: end-session
description: "세션 종료: 에러 분석, 프로필 업데이트, 세션 요약, 핸드오프"
when_to_use: "사용자가 '오늘 끝', '종료', '그만'이라고 말할 때"
sections:
  - error-system
  - session-state
  - resume-protocol
  - data-storage
  - schemas
  - analytics
  - deep-analysis
  - flow-tracking
  - restore-point
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
    - "Write(**/personal/**)"
    - "Write(**/analytics/**)"
    - "Write(**/conversation_history/**)"
    - "Write(**/user_profile/**)"
    - "Write(**/knowledge_graph.json)"
    - "Write(**/meta_index.json)"
  deny:
    - "Write(**/chapters/**/notes.md)"
    - "Read(**/SKILL.md)"
---

> **Shared Rules** → `CLAUDE.md` (P1-P6, Always-On Rules, Decision Classification, Response Style, Completion Status, Restore Point)

# End Session Skill

## When to Activate
- "오늘 끝", "종료", "그만할래", "여기까지"

## BASE PATH
프로젝트 루트 (= 현재 작업 디렉토리)
Error notes: `{base}/{course}/{professor}/personal/error_notes.md`
Profile: `{base}/user_profile/current.md`
Pending profile: `{base}/user_profile/pending_changes.md`
Directives: `{base}/{course}/{professor}/course_directives.md`
Session summary: `{base}/conversation_history/session_summaries/{YYYY-MM-DD}_summary.md`
Meta index: `{base}/{course}/{professor}/meta_index.json`
Knowledge graph: `{base}/{course}/{professor}/knowledge_graph.json`
Change log: `{base}/{course}/{professor}/analysis/change_log.md`

---

## PRE-WRITE VERSIONING PROTOCOL

> **Note**: PostToolUse 훅(`auto_backup.py`)이 error_notes.md와 user_profile/current.md의 백업을 자동 처리합니다.
> 훅이 실패하거나 없는 환경에서는 아래 수동 프로토콜을 따르세요.

Before writing/overwriting any MANAGED FILE, do:
1. Check if file already exists
2. If exists: write current content to `{same_dir}/.versions/{filename}_{YYYY-MM-DD_HHMMSS}.{ext}`
3. Append to change_log.md:
```markdown
## {YYYY-MM-DD HH:MM:SS} — {filename} updated
- **Trigger**: end-session ({brief description})
- **Change**: {what changed, 1 line}
- **Backup**: {backup path}
```
4. Then proceed with the write

**Managed files** (use protocol): `error_notes.md`, `user_profile/current.md`
**Not versioned**: `change_log.md`, `session_summaries/`, `course_directives.md`

---

## Execution Order

### Step 0: Session State 최종 저장

`{base}/{course}/{professor}/personal/current_session.json` 덮어쓰기.
current_mode를 "end_session"으로 설정. 나머지 session_state 그대로 저장.
이후 step에서 상태가 변해도 이 파일은 다시 쓰지 않음 (handoff.md가 더 풍부한 인수인계 역할).

### Step 1: Session Summary (display)
```
📚 오늘의 학습 요약:
- 공부한 내용: [chapters/sections covered today]
- 문제: [N]문제 ([X] 맞음, [Y] 틀림)
- 새로 올린 자료: [files uploaded today, or "없음"]
```

### Step 2: Error Review Status (display)
Show ★★+ concepts from error_notes that haven't been recently reviewed:
"우선 복습 대상:
- [concept 1] ★★
- [concept 2] ★★★
다음에 먼저 복습하면 좋겠어요."

If no ★★+ active concepts → skip this step.

### Step 3: Error Notes Summary (display + FILE WRITE)

> **역할**: 누락 보충 전용. practice 스킬이 세션 중 이미 기록한 에러는 건드리지 않음 (idempotency check).

Display:
```
📝 오답노트:
- [concept]: ★[N] — [short context]
- [총 active: N개]
```
Highlight any ★★+ items: "[concept] ★★ — 다음에 집중해요."

**FILE WRITE** (use PRE-WRITE VERSIONING PROTOCOL):
- Read `{base}/{course}/{professor}/personal/error_notes.md` (create if missing)
- Skip any entries with `**STATUS**: RESOLVED` when counting/displaying active errors
- For each error in `errors_this_session`:
  - **Idempotency check**: concept의 **Error History**에서 같은 날짜(YYYY-MM-DD) + 같은 source(e.g. "Practice Q")의 occurrence가 이미 있는지 확인
    - 이미 있으면 → skip (practice skill이 세션 중 이미 기록)
    - 없으면 → append new occurrence entry under that concept, increment ★ if repeat
  - If concept is new → append full new entry block
- Entry format:
```markdown
## [Concept Name] — ★[count]

**Error History**:
- {YYYY-MM-DD}: [source, e.g. "Practice Q"] — wrong
  - Context: [confused with what]
  - Thought process: [what user thought]

**User's Understanding**: [what they thought]
**Correct Understanding**: [what's right]
**Connection Tags**: [related concepts]
```

### Step 3b: Error Notes Analysis (tool-based FILE WRITE)

> **Note**: Incremental save가 세션 중 partial version을 이미 썼을 수 있음. 이 step이 최종 버전으로 덮어씀. 충돌 없음.

After writing error_notes.md, READ it using the Read tool and analyze patterns.
Skip any `**STATUS**: RESOLVED` entries.

1. Count total active `## ` entries → total active errors
2. Count ★ per entry → find ★★+ items (priority)
3. Collect all **Connection Tags** → find recurring tags (weak area clusters)
4. Collect all error sources (Practice Q / Practice Notes / tutor) → distribution
5. Find concepts that appear together in Connection Tags → "A causes confusion with B"

Write analysis to `{base}/{course}/{professor}/personal/error_notes_analysis.md`:

```markdown
# Error Notes Analysis — {course}/{professor}
Last updated: {YYYY-MM-DD}

## Summary
- Total active errors: {N}
- High priority (★★+): {list}
- New this session: {list}

## Weak Area Clusters
{group concepts by recurring Connection Tags}

## Error Source Distribution
- Practice Q: {N} errors
- Practice Notes: {N} errors
- Tutor (lightweight): {N} flags

## Recommendations
1. {highest ★ concept} — review immediately (★{count})
2. Cluster: "{tag group}" — {N} concepts confused together
3. {if any} Repeated in different contexts → core misunderstanding, needs tutor session
```

If error_notes.md has 0 active entries → skip analysis.
Always overwrite (not append) — analysis is regenerated fresh each time.

### Step 3b2: Deep Analysis (에이전트 위임 — 자동)

**조건**: active error_count >= 2 AND (knowledge_graph.json 존재 OR error_notes에 Connection Tags 있음)
조건 미충족 시 → skip silently.

**실행**: `error-analyzer` 에이전트를 **백그라운드**로 스폰:

```
Agent 도구 호출:
- subagent_type: "error-analyzer"
- run_in_background: true
- prompt: "base={base}, course={course}, professor={professor}. error_notes.md에 active {N}개. deep_analysis.md 생성."
```

에이전트가 자동으로 수행하는 것:
1. Error Type A/B/C/D 분류
2. Root Cause Tracing (prerequisite 역추적)
3. Untested Neighbors 탐색
4. Session Trend 분석
5. Personalized Action Plan 생성

**출력**: `{base}/{course}/{professor}/personal/deep_analysis.md` (overwrite, NOT versioned)

에이전트 완료를 기다리지 않고 Step 3c로 진행.
Step 6 (Next Session Suggestion)에서 deep_analysis.md가 존재하면 참조.

### Step 3c: Temp Movements Summary (display)

If `session_state.temp_movements` is non-empty, display:
```
🔄 오답 이동:
- [RESOLVED]: [concept] → temp로 이동 (이해 완료)
- [REACTIVATED]: [concept] → active로 복귀 ★★ (재등장)
```
If empty → skip.

### Step 3c2: Analytics — Error Resolved Events (FILE APPEND)

For each entry in `session_state.temp_movements` where direction = "resolved":
1. Calculate `days_active` from the error's first date (in error history) to today
2. Count sessions where this concept appeared (from error history dates)
3. Append to `{base}/{course}/{professor}/analytics/learning_events.jsonl`:
   `{"event":"error_resolved","ts":"{ISO8601}","course":"{course}","professor":"{professor}","concept":"{concept}","days_active":{N},"sessions_to_resolve":{N},"trigger":"end_session_review"}`

If no resolved items → skip.

### Step 3d: Meta Index Update (FILE WRITE)

> **Note**: Incremental save가 세션 중 meta_index를 이미 업데이트했을 수 있음. 이 step이 최종 counts로 덮어씀. 충돌 없음.

After error notes written, update `{base}/{course}/{professor}/meta_index.json`:
1. Read current meta_index.json (create skeleton if missing — see schema in system_prompt.md)
2. Count active entries in error_notes.md (skip RESOLVED) → update `personal.error_count_active`
3. Count entries across `personal/temp/resolved_*.md` → update `personal.error_count_temp`
4. Collect all ★★+ concept names → update `personal.high_star_concepts`
5. Set `personal.last_error_session` = today (YYYY-MM-DD)
6. Set `last_updated` = now
7. Write back (overwrite entire file — meta_index is NOT versioned)

### Step 3e: Knowledge Graph Sync (FILE WRITE)

After meta_index update, sync star_levels in knowledge_graph.json:
1. Read knowledge_graph.json (skip if doesn't exist yet)
2. Read current error_notes.md
3. For each node in graph: find matching concept in error_notes.md → update `star_level` and `error_count`
4. Matching: normalize concept name (lowercase, spaces→`_`, strip punctuation) → match to node ID
5. Set `last_updated` = now
6. Write back (overwrite — knowledge_graph is NOT versioned)

### Step 4: Profile Update (display + FILE WRITE if approved)

If profile_hints detected this session, display:
"오늘 느낀 점:
- [hint 1]
- [hint 2]
기억해둘까요? (네/아니요/수정)"

If user says YES:
**FILE WRITE** (use PRE-WRITE VERSIONING PROTOCOL for user_profile/current.md):
Append to `{base}/user_profile/current.md`:
```markdown
## Update — {YYYY-MM-DD}
- [approved hint 1]
- [approved hint 2]
```
Clear `pending_changes.md` entries that were approved.

If user says NO → skip. If user modifies → write their modified version.

### Step 5: Directives Review (display + FILE WRITE if confirmed)

If new directives stored this session:
"오늘 기억해둔 것:
- '[directive 1]'
- '[directive 2]'
맞죠?"

If confirmed:
**FILE WRITE** (not versioned): Append to `{base}/{course}/{professor}/course_directives.md`:
```markdown
## {YYYY-MM-DD}
- [directive 1]
- [directive 2]
```

### Step 6: Next Session Suggestion

"다음에 이어서:
1. [next section from section_plan, or "섹션 플랜 확인 필요"]
2. [top 1-2 high-★ error note concepts]
3. [any unfinished items from today]"

If exam countdown active → prepend priority strategy based on days remaining.

### Step 6.5: Handoff Note (FILE WRITE)

> **Note**: Incremental save가 세션 중 partial handoff(mood="mid-session", duration="진행 중")를 썼을 수 있음. 이 step이 완전한 handoff(mood, duration, key moment 포함)로 update-in-place 최종 갱신. 충돌 없음.

다음 세션 재개를 위한 구조화된 인수인계 메모 작성.
Path: `{base}/{course}/{professor}/personal/handoff.md` (update-in-place, NOT versioned)

**데이터 소스** (모두 이전 step에서 이미 메모리에 있음):
- `tutor_state` → last chapter/section, mode
- error_notes ★★+ → 우선 복습 대상
- Step 6 출력 → next session suggestion
- `session_state.errors_today` → 오늘 오류 요약
- `session_state.temp_movements` → resolved/reactivated
- `session_state.exam_date` → countdown info
- Deep analysis (Step 3b2에서 작성됐으면) → `personal/deep_analysis.md` action plan 섹션만
- Error notes analysis (Step 3b) → high ★ items
- `user_profile/pending_changes.md` → 미승인 프로필 변경

**Handoff 고정 구조** (incremental-save.md Trigger 3b와 동일, 단 full data):
```markdown
# Handoff Note — {course} / {professor}
Updated: {YYYY-MM-DD HH:MM}

## Current State
- Chapter/Section: Chapter {N}, Section {N.X} ({section_name})
- Stopped at: {구체적 — "Section 8.3 끝, 8.4 안 시작"}
- Mode: {tutor | practice_q | practice_n | idle}
- Exam: {YYYY-MM-DD} (D-{N}) or "미설정"
- Mood: {confident | neutral | frustrated | rushing}
- Duration: {approx}
- Questions: {total} ({correct}맞음, {wrong}틀림)
- Key moment: {한 줄 — "pointer 드디어 이해" or "const에서 막힘"}

## Priority
- Review: {★★+ concepts or "없음"}
- Deep analysis: {action plan top 1-2 or "분석 없음"}
- Next: {Step 6 출력}
- Pending profile: {pending_changes.md 내용 or "없음"}
- Unfinished: {시작했지만 안 끝난 섹션 or "없음"}

## Recent Saves (max 10)
- {YYYY-MM-DD HH:MM} | end-session | {session summary 1-line}
```

**Update 규칙**:
1. 기존 handoff.md Read (있으면)
2. Current State, Priority 섹션 내용 교체
3. Recent Saves에 end-session 줄 prepend
4. 10줄 초과 → 가장 오래된 줄을 `personal/handoff_archive_{YYYY-MM}.md`에 append
5. Write back

**Mood 추론 규칙**:
- frustrated: 혼란 신호 3회+ or "어려워/힘들어/모르겠어" 반복
- rushing: 세션 <30min + 스킵 많음
- confident: 정답률 >85% + 설명 잘함
- neutral: default

`mkdir -p` 필요시 생성. 사용자에게 표시하지 않음 (silent background persistence).

### Step 7: Session Summary FILE WRITE

Write to `{base}/conversation_history/session_summaries/{YYYY-MM-DD}_summary.md`
(session summaries are NOT versioned — append-only, each date is unique):
```markdown
# Session Summary — {YYYY-MM-DD}

## Course: {course} / {professor}
## Duration: {approx, based on messages}

## Covered Today
{chapters and sections studied}

## Questions
- Total: {N} | Correct: {X} | Wrong: {Y}

## Errors This Session
{list of concepts with ★ count}

## High ★ Items (priority for next session)
{★★+ items}

## Profile Updates
{approved hints, or "없음"}

## Next Session
{suggestion from Step 6}
```

Create parent directories if they don't exist.

### Step 7b: Conversation Blackbox Check

After writing session summary, check for eligible old summaries to compress:
1. List all files in `{base}/conversation_history/session_summaries/`
2. For each file: compute age from filename date (YYYY-MM-DD)
3. Collect files older than 14 days
4. Group by YYYY-MM month
5. For each month group: only proceed if ALL sessions in that month are >14 days old
6. For eligible months:
   a. Generate monthly rollup at `{base}/conversation_history/monthly_rollups/{YYYY-MM}_rollup.md`
   b. If rollup already exists → append a new section (don't overwrite)
   c. Move original summary files to `{base}/conversation_history/archive/`
   d. Log: "{N}개 세션 요약 압축됨 → {YYYY-MM}_rollup.md"
7. If no eligible months → skip silently

**Monthly rollup format**:
```markdown
# Monthly Rollup — {YYYY-MM}
## Course: {course} / {professor}
## Sessions: {N} ({date1}, {date2}, ...)

## Chapters Studied
{list}

## Questions Summary
- Total: {N} | Correct: {X} ({Y}%)

## Errors This Month
### New errors: {list with ★}
### Resolved (moved to temp): {list or 없음}
### Escalated (reactivated): {list or 없음}

## Profile Updates
{list or 없음}

## Directives Confirmed
{list or 없음}

## Sessions Compressed
{list of original filenames}
```

### Step 7c: Analytics Summary (optional display)

If `{base}/{course}/{professor}/analytics/learning_events.jsonl` exists AND has > 20 events:
- Count today's events by type (filter by today's date in `ts` field)
- Display brief inline: `"📊 오늘: {N}개 개념 학습, {M}문제 ({X}% correct)"`
- Do NOT read the full file for analysis — only count today's events
- If < 20 total events → skip silently

### Step 8: Farewell
"오늘 수고했어요! 다음에 말해주세요. 👋"
