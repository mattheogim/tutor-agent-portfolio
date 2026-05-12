# Scenario: full-pipeline

## Metadata
- **Category**: skill-end-session
- **Tests**: end-session 8단계 파이프라인 순서대로 실행
- **Priority**: P1 (important)
- **Skill Under Test**: end-session

## Setup

### Fixtures Required
- 전체 fixtures (notes, error_notes, analytics, current_session.json, handoff.md)
- 세션 중 발생한 errors_this_session: ["pass_by_reference", "loop_off_by_one"]

### Pre-conditions
- 세션 진행 중 (tutor + practice 완료)
- errors_this_session에 2개 오답 기록

## Stimulus

### Turn 1 (User)
```
오늘 끝
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Glob(personal/handoff.md)` — handoff 파일 생성/업데이트
- [ ] `Grep("concept_studied|question_answered", analytics/learning_events.jsonl)` — analytics 이벤트 존재
- [ ] `Read(personal/current_session.json)` — 세션 상태 저장

### Behavioral Assertions (LLM judge 채점)
- [ ] "Session summary" — 오늘 한 내용 요약 제시
- [ ] "Error summary" — 오답 항목 정리 (pass_by_reference, loop_off_by_one)
- [ ] "Handoff written" — 다음 세션용 인계 노트 생성
- [ ] "Encouraging close" — 따뜻한 마무리 인사
- [ ] "Next session suggestion" — 다음에 뭘 하면 좋을지 제안

## Scoring
- **PASS**: handoff 생성 + 세션 요약 + behavioral 평균 ≥ 4.0
- **FAIL**: handoff 미생성 시 structural FAIL
