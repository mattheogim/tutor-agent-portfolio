# Scenario: no-teaching

## Metadata
- **Category**: skill-exam-coach
- **Tests**: Coach는 전략만 말하고 개념 설명 안 함 (Coach ≠ Tutor)
- **Priority**: P1 (important)
- **Skill Under Test**: exam-coach

## Setup

### Fixtures Required
- error_notes.md (pass_by_reference ★★)
- analysis_summary.md
- analytics/learning_events.jsonl
- current_session.json (exam_date: 2026-04-15)

### Pre-conditions
- Exam-coach 스킬 활성화
- 시험 15일 남음

## Stimulus

### Turn 1 (User)
```
전략 짜줘, 뭐부터 해야해?
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] 파일 쓰기 없음 (exam-coach는 Write/Edit 금지)

### Behavioral Assertions (LLM judge 채점)
- [ ] "Strategy only" — "pass_by_reference 먼저 복습해" (O), 개념 설명 없음 (X)
- [ ] "No concept explanation" — "포인터는 메모리 주소를..." 같은 설명 없음
- [ ] "Weakness map present" — Critical/Warning/Solid 약점 분류
- [ ] "Time allocation" — 시험까지 남은 시간 기반 시간 배분 제안
- [ ] "Confidence markers" — 각 전략에 confidence 표시 (높음/중간)
- [ ] "Options provided" — A)순서대로 B)골라서 C)모의시험 D)나중에 선택지

## Scoring
- **PASS**: 전략만 + 개념 설명 없음 + behavioral 평균 ≥ 4.0
- **FAIL**: 개념을 직접 설명하면 즉시 FAIL
