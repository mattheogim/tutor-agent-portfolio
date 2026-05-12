---
name: dev
description: "개발자 모드 — 시스템 상태 확인, 디버깅, 롤백, 분석 도구"
when_to_use: "사용자가 '/dev' 접두어로 시작하는 명령어를 입력할 때"
sections:
  - session-state
  - data-storage
  - schemas
  - analytics
  - dev-mode
tools:
  - Read
  - Grep
  - Glob
  - "Bash(python3 scripts/*)"
  - "Bash(bun src/agents/gc.ts*)"
  - "Bash(ls *)"
  - "Bash(diff *)"
disallowedTools:
  - Write
  - Edit
  - Skill
effort: medium
permissions:
  allow:
    - "Read(**)"
    - "Glob(**)"
    - "Grep(**)"
  deny:
    - "Read(**/SKILL.md)"
    - "Read(**/ETHOS.md)"
---

> **Shared Rules** → `CLAUDE.md` (P5: Language Policy만 적용)

# Dev Mode Skill — 개발자 도구

## BASE PATH
프로젝트 루트 (= 현재 작업 디렉토리)

## 명령어

### `/dev gc`
시스템 건강 감사. 죽은 참조, 스키마 불일치, 고아 파일, 설정 불일치 탐지.

**실행**:
```bash
bun src/agents/gc.ts
```

`--report` 플래그 추가 시 `eval/results/gc_report_{timestamp}.md`에 저장.

**검사 항목**: Dead References, Schema Drift, Permission Gaps, Orphan Files, Stale Data, Config Consistency

### `/dev gc --fix`
GC 감사 실행 후 발견된 이슈를 Opus 에이전트(`gc-fix`)에게 위임하여 자동 수정.

**워크플로우**:
1. `bun src/agents/gc.ts --json` 실행 → 이슈 목록 획득
2. critical/warning 이슈가 있으면 → `gc-fix` 에이전트(Opus) spawn
3. 에이전트에게 JSON 결과 전달 → 에이전트가 각 이슈 수정
4. 수정 후 GC 재실행하여 검증

---

### `/dev status`
모든 영구 파일의 상태를 한눈에 확인.

**실행**:
1. 모든 course 디렉토리 스캔 (`{base}/{course}/{professor}/`)
2. 각 course에서 확인:
   - `meta_index.json` — 존재 여부 + 마지막 업데이트
   - `knowledge_graph.json` — 노드 수, 엣지 수
   - `personal/error_notes.md` — active 에러 수, ★★+ 수
   - `personal/handoff.md` — 마지막 세션 날짜
   - `personal/current_session.json` — 마지막 모드, 진행 상태
   - `analytics/learning_events.jsonl` — 총 이벤트 수
3. 표시:

```
📋 System Status — {date}
━━━━━━━━━━━━━━━━━━━━━━━━

📁 cmpt125/Donaldson
  meta_index.json    ✅ (2026-03-30)
  knowledge_graph    ✅ 11 nodes, 8 edges
  error_notes        ⚠️ 3 active (1 ★★)
  handoff            ✅ (2026-03-30)
  current_session    ✅ idle
  analytics          ✅ 13 events
```

---

### `/dev coverage`
챕터별 커버리지 대시보드.

**실행**:
1. `meta_index.json` 읽기 → 챕터 목록
2. 각 챕터: section_plan 읽기 → 총 섹션 수
3. `current_session.json` → sections_completed
4. `error_notes.md` → 챕터별 active 에러 수
5. 표시:

```
📊 Coverage — cmpt125/Donaldson
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Chapter 1: ████████████████████░░ 90%  ← 2 concepts shaky
Chapter 2: ████████░░░░░░░░░░░░░ 40%  ← 3 sections remaining
Error Notes: 3 active, 1 ★★+ item
{if exam_date}: Exam in: 13 days
```

---

### `/dev meta`
meta_index.json 테이블 뷰 + 누락 파일 플래그.

**실행**:
1. `meta_index.json` 읽기
2. 각 경로가 실제로 존재하는지 Glob로 확인
3. 표시 — 존재하지 않는 파일에 `[!]` 마크

---

### `/dev graph`
knowledge_graph.json 통계.

**실행**:
1. `python3 scripts/graph_utils.py --stats {graph_path}`
2. 또는 직접 Read → 파싱:
   - 노드 수, 엣지 수
   - Top confusion pairs (`confused_with` 엣지)
   - High-risk nodes (★1+)
   - Weak clusters (연결된 ★ 노드 그룹)

---

### `/dev rollback [file]`
파일 버전 히스토리 + 복원.

**실행**:
1. `{file_dir}/.versions/` 스캔
2. 버전 목록 표시 (번호, 날짜, 크기)
3. 사용자 선택 대기
4. 선택 시 — 현재 파일 안전 백업 → 선택 버전 복원
5. change_log.md에 롤백 기록

**주의**: 이 명령은 Write가 필요하므로 dev 스킬에서 직접 실행 불가.
→ 사용자에게 목록 보여주고, 복원은 별도 승인 후 orchestrator가 실행.

---

### `/dev resolve [concept]`
에러를 수동으로 temp로 이동.

**실행**:
1. `error_notes.md`에서 concept 검색
2. 매칭 항목 표시
3. 사용자 확인 → `STATUS: RESOLVED` 마킹 + temp 파일 생성
4. knowledge_graph 업데이트

**주의**: Write 필요 → 목록 보여주고 사용자 확인 후 orchestrator가 실행.

---

### `/dev analyze`
deep analysis 즉시 실행 (error_count 조건 무시).

**실행**:
1. error-analyzer 에이전트 즉시 spawn
2. 결과 표시

---

### `/dev compress`
오래된 session summaries 압축.

**실행**:
1. `conversation_history/session_summaries/` 스캔
2. 14일 이상 된 요약 표시
3. 사용자 확인 → monthly rollup 생성

---

### `/dev analytics`
학습 이벤트 분석 대시보드.

**실행**:
1. `analytics/learning_events.jsonl` 읽기
2. 집계: 개념별 오답률, 문제 유형별 정답률, 시간 투자, 최근 추이
3. 대시보드 표시

---

### `/dev timeline`
현재 세션 활동 타임라인.

**실행**:
```
bun src/hooks/session-timeline.ts [--compact] [--filter X] [--last N] [--summary]
```

---

### `/dev token`
현재 세션 예상 토큰 사용량 (approximation).

---

### `/dev edit`
수동 파일 편집 + downstream 영향 미리보기.

**실행**:
1. 사용자가 편집할 파일 지정
2. 현재 내용 표시
3. downstream 영향 분석 (이 파일을 참조하는 다른 파일 목록)
4. 편집은 사용자가 직접 지시

---

### `/dev export`
모든 데이터 파일 경로 목록.

**실행**:
1. 모든 course 디렉토리 스캔
2. 파일별 경로 + 크기 + 마지막 수정일 표시

---

## 규칙

1. **Read-only by default** — dev 스킬은 파일을 읽기만 함. 수정이 필요한 명령(rollback, resolve, compress)은 사용자 확인 후 orchestrator가 실행.
2. **P5 준수** — 한국어 출력 + 영어 용어 보존.
3. **Activity log 기록** — 각 `/dev` 명령 실행 시 activity log에 기록:
   `bun src/hooks/activity-log.ts skill_activated "dev — {command}"`
