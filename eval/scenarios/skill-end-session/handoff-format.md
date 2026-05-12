# Scenario: handoff-format

## Metadata
- **Category**: skill-end-session
- **Tests**: handoff.md 필수 섹션 포함 (What We Did, Current State, Priority, Remind Queue)
- **Priority**: P1 (important)
- **Skill Under Test**: end-session

## Setup

### Fixtures Required
- 전체 fixtures
- 세션 활동 기록 (tutor section 1.1-1.3 + practice 10문제)

### Pre-conditions
- 세션 종료 시점
- 활동 기록이 충분히 있는 상태

## Stimulus

### Turn 1 (User)
```
오늘 끝
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Grep("## What We Did", personal/handoff.md)` — What We Did 섹션 존재
- [ ] `Grep("## Current State", personal/handoff.md)` — Current State 섹션 존재
- [ ] `Grep("## Priority", personal/handoff.md)` — Priority 섹션 존재
- [ ] `Grep("## Remind Queue", personal/handoff.md)` — Remind Queue 섹션 존재
- [ ] `Grep("## Student State", personal/handoff.md)` — Student State 섹션 존재

### Behavioral Assertions (LLM judge 채점)
- [ ] "Complete sections" — 모든 필수 섹션에 의미 있는 내용 포함 (빈 섹션 없음)
- [ ] "Accurate content" — 실제 세션 활동과 일치하는 내용
- [ ] "Priority reflects errors" — ★★ 항목이 우선순위 높게 배치
- [ ] "Remind queue populated" — 오답 개념이 remind queue에 포함

## Scoring
- **PASS**: 모든 structural + behavioral 평균 ≥ 4.0
- **FAIL**: 필수 섹션 누락 시 structural FAIL
