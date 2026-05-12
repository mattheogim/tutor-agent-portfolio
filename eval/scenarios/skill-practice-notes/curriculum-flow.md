# Scenario: curriculum-flow

## Metadata
- **Category**: skill-practice-notes
- **Tests**: 섹션 순서대로 tutor → quiz 흐름 (section_plan 순서 준수)
- **Priority**: P1 (important)
- **Skill Under Test**: practice-notes

## Setup

### Fixtures Required
- Chapter 1 notes.md, section_plan.md (1.1 → 1.2 → 1.3 순서)

### Pre-conditions
- Practice-notes 모드, Chapter 1 시작

## Stimulus

### Turn 1 (User)
```
Chapter 1 전체 공부하고 싶어
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] 없음 (흐름 검증은 behavioral)

### Behavioral Assertions (LLM judge 채점)
- [ ] "Section order preserved" — 1.1 → 1.2 → 1.3 순서대로 진행 (section_plan 순서)
- [ ] "Tutor then quiz pattern" — 각 섹션: 설명 → 퀴즈 2-3문제 흐름
- [ ] "No section skip" — 중간 섹션 건너뛰지 않음
- [ ] "Transition announced" — 섹션 전환 시 안내 ("1.1 끝났어요, 1.2로 갈게요")

## Scoring
- **PASS**: 순서 준수 + tutor→quiz 흐름 + behavioral 평균 ≥ 4.0
- **FAIL**: 섹션 순서 어기면 FAIL
