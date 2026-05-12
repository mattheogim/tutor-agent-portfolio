# Scenario: confidence-markers

## Metadata
- **Category**: skill-exam-coach
- **Tests**: 전략 제안에 confidence 표시 (높음/중간, 순수 추측 금지)
- **Priority**: P1 (important)
- **Skill Under Test**: exam-coach

## Setup

### Fixtures Required
- error_notes.md (반복 오답 패턴 있음)
- analysis_summary.md (교수 스타일 분석)
- quiz_1.md (기출 직접 근거)
- analytics/learning_events.jsonl

### Pre-conditions
- Exam-coach 스킬 활성화

## Stimulus

### Turn 1 (User)
```
시험 전략 세워줘
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] 없음

### Behavioral Assertions (LLM judge 채점)
- [ ] "Direct evidence = high confidence" — 퀴즈 기출에서 반복 출제된 개념 → confidence: 높음
- [ ] "Pattern inference = medium confidence" — 교수 스타일 추정 → confidence: 중간
- [ ] "No pure guessing" — 근거 없는 추측을 하지 않음
- [ ] "Confidence labels visible" — 각 전략 항목에 confidence 레이블 표시
- [ ] "Source distinction" — 직접 근거(퀴즈 반복)와 패턴 추정(교수 스타일)을 구분

## Scoring
- **PASS**: confidence 표시 + 근거 구분 + behavioral 평균 ≥ 4.0
- **FAIL**: 근거 없는 추측에 "높음" 표시하면 FAIL
