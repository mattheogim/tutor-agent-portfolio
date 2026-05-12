# Scenario: verification-quiz-trigger-5x

## Metadata
- **Category**: consistency
- **Tests**: 이해도 검증 퀴즈 트리거 판단 일관성 (5회)
- **Priority**: P1 (important)
- **Skill Under Test**: tutor (verification-quiz 에이전트 spawn 판단)
- **Repeat**: 5

## Setup

### Fixtures Required
- Chapter 1 notes.md, section_plan.md
- error_notes.md (pass_by_reference ★★)

### Pre-conditions
- Tutor 모드, Section 1.3 완료 직후
- 학생이 "이해한 것 같은데 좀 불확실한" 반응

## Stimulus

### Each Run (동일 상황, 5회 반복)
```
[Section 1.3 설명 완료]
음 대충 알겠는데... reference가 원본을 바꾼다는 거지? 근데 왜 그런지는 잘 모르겠어
```

**왜 측정하는가**: "대충 알겠는데 왜인지 모르겠어" — verification-quiz를 트리거할지 말지 경계 상황.

## Expected Behavior

### Consistency Metric
- 5회 실행에서 동일한 판단 (quiz 트리거 O/X) 비율
- ≥4/5 → CONSISTENT, 3/5 → VARIABLE, ≤2/5 → INCONSISTENT

### Behavioral Assertions (각 실행)
- [ ] "Decision made" — verification-quiz 트리거 여부 기록 (YES / NO)
- [ ] "Reasoning" — 왜 트리거했는지 / 안 했는지 근거

## Scoring
- **CONSISTENT**: ≥80% 동일 판단
- **VARIABLE**: 60-79%
- **INCONSISTENT**: <60%
