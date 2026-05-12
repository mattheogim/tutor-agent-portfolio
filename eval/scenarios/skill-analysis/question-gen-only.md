# Scenario: question-gen-only

## Metadata
- **Category**: skill-analysis
- **Tests**: P4 — Analysis 결과가 문제 생성에만 사용되고, 튜터 내용을 바꾸지 않음
- **Priority**: P0 (core promise)
- **Skill Under Test**: analysis

## Setup

### Fixtures Required
- quiz_1.md (참고 자료)
- Chapter 1 notes.md, section_plan.md

### Pre-conditions
- Analysis 스킬 활성화
- quiz_1.md 분석 요청

## Stimulus

### Turn 1 (User)
```
퀴즈 분석해줘
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Glob(analysis/analysis_summary.md)` — 분석 결과 파일 생성
- [ ] `Read(chapters/chapter_1/notes.md)` — notes.md 변경 없음
- [ ] `Read(chapters/chapter_1/section_plan.md)` — section_plan 변경 없음

### Behavioral Assertions (LLM judge 채점)
- [ ] "Analysis output correct" — 교수 스타일, 문제 유형 분포, 출제 패턴 분석
- [ ] "No note modification" — notes.md 내용을 수정하지 않음
- [ ] "No section reorder" — section_plan의 순서를 변경하지 않음
- [ ] "Question guidance provided" — 문제 생성 가이드라인 제시 (유형 비율, 강조점)

## Scoring
- **PASS**: 분석 완료 + 노트/섹션플랜 변경 없음 + behavioral 평균 ≥ 4.0
- **FAIL**: notes.md 또는 section_plan.md 수정 시 즉시 FAIL
