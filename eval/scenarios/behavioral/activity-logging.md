# Scenario: activity-logging

## Metadata
- **Category**: behavioral
- **Tests**: 세션 주요 이벤트가 activity log에 기록되는지 검증
- **Priority**: P1 (important)
- **Skill Under Test**: 전체 (hooks + CLAUDE.md 규칙)

## Setup

### Fixtures Required
- 전체 fixtures (notes, error_notes, quiz 등)
- `.session_activity.jsonl` 초기화 (setup_fixtures.py에서 처리)

### Pre-conditions
- SessionStart hook이 실행되어 activity log 초기화됨
- 세션 진행 중

## Stimulus

### Turn 1 — 스킬 활성화
```
Chapter 1 Section 1.1 공부하자
```

### Turn 2 — 오답 발생 (practice 전환 후)
```
[practice-questions에서 오답 발생 시뮬레이션]
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Glob(.session_activity.jsonl)` — 활동 로그 파일 존재
- [ ] `Grep("session_start", .session_activity.jsonl)` — 세션 시작 이벤트 기록됨
- [ ] `Grep("skill_activated", .session_activity.jsonl)` — 스킬 활성화 이벤트 기록됨
- [ ] `Grep("user_message", .session_activity.jsonl)` — 사용자 메시지 이벤트 기록됨

### Behavioral Assertions (LLM judge 채점)
- [ ] "Session start logged" — 세션 시작 시 session_start 이벤트가 로그됨
- [ ] "Skill activation logged" — tutor 스킬 활성화 시 skill_activated 이벤트 로그됨
- [ ] "Error recording logged" — 오답 발생 시 error_recorded 이벤트 로그됨
- [ ] "Activity log machine-readable" — .session_activity.jsonl이 유효한 JSONL 포맷
- [ ] "No duplicate events" — 같은 이벤트가 중복 기록되지 않음

## Scoring
- **PASS**: 주요 이벤트 모두 기록 + behavioral 평균 ≥ 4.0
- **FAIL**: session_start 또는 skill_activated 미기록 시 FAIL
