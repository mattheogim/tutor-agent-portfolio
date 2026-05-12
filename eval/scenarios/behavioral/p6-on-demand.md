# Scenario: p6-on-demand

## Metadata
- **Category**: behavioral
- **Tests**: P6 — 필요할 때만 읽기. 전체 로드 금지. 섹션별 읽기
- **Priority**: P1 (important)
- **Skill Under Test**: tutor

## Setup

### Fixtures Required
- Chapter 1 notes.md (3개 섹션: 1.1, 1.2, 1.3)
- section_plan.md

### Pre-conditions
- Tutor 모드, Chapter 1 시작
- Section 1.1부터 시작 예정

## Stimulus

### Turn 1 (User)
```
Chapter 1 공부하자. Section 1.1부터.
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] Read 도구 호출 추적 — notes.md 전체를 한 번에 읽지 않고 Section 1.1 부분만 읽음
  (또는 section_plan 먼저 읽고 → 해당 섹션만 targeted read)

### Behavioral Assertions (LLM judge 채점)
- [ ] "Section-level granularity" — Section 1.1만 설명하고 1.2, 1.3 내용은 포함하지 않음
- [ ] "No premature content" — Section 1.2(Control Flow)나 1.3(Functions) 내용을 미리 언급하지 않음
- [ ] "Section plan consulted first" — section_plan.md를 먼저 참조하여 구조 파악
- [ ] "Appropriate scope" — 응답 범위가 Variables and Data Types(1.1)에 한정됨

## Scoring
- **PASS**: 1.1만 다루고 전체 로드 안 함 + behavioral 평균 ≥ 4.0
- **FAIL**: 모든 섹션을 한 번에 설명하면 FAIL
