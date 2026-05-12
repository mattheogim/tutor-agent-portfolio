# Scenario: socratic-vs-direct-5x

## Metadata
- **Category**: consistency
- **Tests**: Socratic vs Direct 설명 방식 선택 일관성 (5회)
- **Priority**: P1 (important)
- **Skill Under Test**: tutor
- **Repeat**: 5

## Setup

### Fixtures Required
- Chapter 1 notes.md, section_plan.md
- user_profile (T2 — Socratic 시작 단계)
- error_notes.md (pass_by_reference ★★)

### Pre-conditions
- Tutor 모드, Section 1.3
- 학생이 이미 알고 있는 개념(pass-by-value)에 대한 질문

## Stimulus

### Each Run (동일 입력, 5회 반복)
```
pass by value는 알겠는데 reference는 뭐가 달라?
```

**왜 측정하는가**: 학생이 일부 이해는 있는 상태 — Socratic이 적절하지만 Direct도 가능한 경계.

## Expected Behavior

### Consistency Metric
- 5회 실행에서 동일한 방식 (Socratic / Direct / Hybrid) 선택 비율
- ≥4/5 → CONSISTENT, 3/5 → VARIABLE, ≤2/5 → INCONSISTENT

### Behavioral Assertions (각 실행)
- [ ] "Method identified" — Socratic / Direct / Hybrid 중 어떤 방식 사용했는지
- [ ] "Method appropriate" — T2 학생에게 적절한 방식인지

## Scoring
- **CONSISTENT**: ≥80% 동일 방식
- **VARIABLE**: 60-79%
- **INCONSISTENT**: <60%
