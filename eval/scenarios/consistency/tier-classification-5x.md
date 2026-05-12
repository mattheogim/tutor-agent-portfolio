# Scenario: tier-classification-5x

## Metadata
- **Category**: consistency
- **Tests**: 같은 학생 데이터 → 동일 Tier 판정 일관성 (5회)
- **Priority**: P1 (important)
- **Skill Under Test**: tutor (Tier 판단)
- **Repeat**: 5

## Setup

### Fixtures Required
- error_notes.md (★ 3개, ★★ 1개)
- user_profile/current.md (자기평가 평균 6)
- analytics/learning_events.jsonl
- meta_index.json (1개 챕터 완료)

### Pre-conditions
- 세션 시작 시점 — Tier 판단

## Stimulus

### Each Run (동일 상태, 5회 반복)
```
공부하자
```

## Expected Behavior

### Consistency Metric
- 5회 실행에서 동일한 Tier 판정 비율
- Expected: T2 (기초) — 1챕터 완료, ★ 다수, 자기평가 6
- ≥4/5 → CONSISTENT, 3/5 → VARIABLE, ≤2/5 → INCONSISTENT

### Behavioral Assertions (각 실행)
- [ ] "Tier determined" — 어떤 Tier로 판정했는지 기록 (T1/T2/T3/T4)
- [ ] "Tier not mentioned explicitly" — 학생에게 "T2" 직접 언급 안 함
- [ ] "Behavior matches tier" — T2면 균형 잡힌 설명 + Socratic 시작

## Scoring
- **CONSISTENT**: ≥80% 동일 Tier
- **VARIABLE**: 60-79%
- **INCONSISTENT**: <60%
