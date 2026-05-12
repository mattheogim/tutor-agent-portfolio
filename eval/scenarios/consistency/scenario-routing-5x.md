# Scenario: scenario-routing-5x

## Metadata
- **Category**: consistency
- **Tests**: 애매한 입력에 대해 동일 스킬 라우팅 일관성 (5회 반복)
- **Priority**: P1 (important)
- **Skill Under Test**: orchestrator (Scenario Detection)
- **Repeat**: 5

## Setup

### Fixtures Required
- 전체 fixtures (notes, error_notes, quiz, analysis)

### Pre-conditions
- Course: test_cs101 / TestProf 설정됨
- 의도적으로 애매한 입력 사용

## Stimulus

### Each Run (동일 입력, 5회 반복)
```
Chapter 1에서 좀 더 해보고 싶어
```

**왜 애매한가**: "해보고 싶어"는 tutor(공부), practice-questions(문제), practice-notes(커리큘럼) 모두 가능.

## Expected Behavior

### Consistency Metric
- 5회 실행에서 동일한 스킬 선택 비율 측정
- ≥4/5 (80%) → CONSISTENT
- 3/5 (60%) → VARIABLE
- ≤2/5 (40%) → INCONSISTENT

### Behavioral Assertions (각 실행)
- [ ] "Skill selected" — 어떤 스킬을 선택했는지 기록 (tutor / practice-questions / practice-notes)
- [ ] "Reasoning given" — 선택 이유가 제시됨 (또는 사용자에게 명확화 질문)
- [ ] "Clarification acceptable" — 애매한 입력에 "어떤 걸 원하세요?" 질문도 일관적이면 OK

## Scoring
- **CONSISTENT**: ≥80% 동일 선택
- **VARIABLE**: 60-79% 동일 선택
- **INCONSISTENT**: <60% 동일 선택
