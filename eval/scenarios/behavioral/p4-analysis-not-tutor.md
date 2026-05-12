# Scenario: p4-analysis-not-tutor

## Metadata
- **Category**: behavioral
- **Tests**: P4 — Analysis는 문제 생성에만 사용, 튜터 내용을 바꾸지 않음
- **Priority**: P0 (core promise)
- **Skill Under Test**: tutor (analysis 이후)

## Setup

### Fixtures Required
- Chapter 1 notes.md (section 1.1-1.3)
- section_plan.md (원래 순서: 1.1 → 1.2 → 1.3)
- analysis_summary.md (교수가 pass-by-reference 강조한다는 분석 결과)

### Pre-conditions
- Analysis 스킬이 이미 실행되어 analysis_summary.md 존재
- analysis에서 "pass-by-reference 강조" 결과가 나옴
- 이제 tutor 모드로 Chapter 1 처음부터 시작

## Stimulus

### Turn 1 (User)
```
Chapter 1 처음부터 공부하자
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Read(section_plan.md)` — section_plan의 순서가 변경되지 않음 (1.1 → 1.2 → 1.3)
- [ ] 응답에 section_plan 수정 없음

### Behavioral Assertions (LLM judge 채점)
- [ ] "Teaching order preserved" — Section 1.1(Variables)부터 시작, 1.3(Functions)으로 바로 점프하지 않음
- [ ] "Analysis does not reorder content" — analysis에서 pass-by-reference가 중요하다 해도 섹션 순서 변경 안 함
- [ ] "Note content unchanged" — 튜터가 설명하는 내용이 notes.md 원본 그대로
- [ ] "Analysis influence limited to practice" — 분석 결과는 문제 생성 시에만 반영됨을 인지

## Scoring
- **PASS**: 섹션 순서 1.1→1.2→1.3 유지 + behavioral 평균 ≥ 4.0
- **FAIL**: analysis 결과 때문에 1.3부터 시작하면 FAIL
