# Scenario: section-completion

## Metadata
- **Category**: skill-tutor
- **Tests**: 섹션 완료 시 Decision Framing + 상태 업데이트 + session_state 저장
- **Priority**: P1 (important)
- **Skill Under Test**: tutor

## Setup

### Fixtures Required
- Chapter 1 notes.md, section_plan.md
- current_session.json (sections_completed: ["1.1"])

### Pre-conditions
- Tutor 모드, Section 1.2 완료 직후
- 학생이 잘 이해한 상태 (혼란 없음)

## Stimulus

### Turn 1 (시뮬레이션)
Section 1.2 설명 완료 시점 — 튜터가 자동으로 완료 처리

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Read(current_session.json) → sections_completed includes "1.2"` — 섹션 완료 기록
- [ ] `Grep("concept_studied", analytics/learning_events.jsonl)` — analytics 이벤트 기록

### Behavioral Assertions (LLM judge 채점)
- [ ] "Completion status correct" — DONE 사용 (혼란 없었으므로 CONCERNS 아님)
- [ ] "Decision Framing used" — 상황요약 + 추천 + 선택지 포맷
- [ ] "Options provided" — 다음 섹션 / 퀴즈 / 복습 등 선택지 제시
- [ ] "Recommendation given" — AI가 추천 + 이유 제시
- [ ] "Natural Korean" — 자연스러운 한국어 전달

## Scoring
- **PASS**: Decision Framing + 상태 저장 + behavioral 평균 ≥ 4.0
- **FAIL**: 물어보지 않고 자동으로 다음 섹션 시작하면 FAIL (User Challenge 위반)
