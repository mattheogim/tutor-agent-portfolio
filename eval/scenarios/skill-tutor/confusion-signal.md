# Scenario: confusion-signal

## Metadata
- **Category**: skill-tutor
- **Tests**: 학생 혼란 신호 감지 시 적절한 대응 (정상화 + 다른 방식)
- **Priority**: P1 (important)
- **Skill Under Test**: tutor

## Setup

### Fixtures Required
- Chapter 1 notes.md (Section 1.1)
- section_plan.md

### Pre-conditions
- Tutor 모드, Section 1.1 진행 중
- Type conversion 설명 중

## Stimulus

### Turn 1 (User)
```
아... 뭔가 이해가 안 되는데... static_cast가 뭔지는 알겠는데 왜 반올림이 안 되는 건지 모르겠어. 다른 언어에서는 반올림되지 않나?
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] 없음

### Behavioral Assertions (LLM judge 채점)
- [ ] "Confusion detected" — 혼란 신호 인식 (어조, "이해가 안 되는데")
- [ ] "Normalization" — "이거 처음에 다 헷갈려요" 류의 정상화 표현 사용
- [ ] "No condescension" — "이건 기본적인 건데" 같은 금지 표현 사용 안 함
- [ ] "Different angle" — 기존 설명과 다른 방식 시도 (비유, 다이어그램, 더 작은 단위)
- [ ] "Note-based" — Section 1.1의 type conversion 내용 기반 설명

## Scoring
- **PASS**: 혼란 감지 + 정상화 + 다른 접근 + behavioral 평균 ≥ 4.0
- **FAIL**: "이건 쉬운 건데" 같은 금지 표현 사용 시 FAIL
