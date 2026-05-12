# Scenario: p5-language-policy

## Metadata
- **Category**: behavioral
- **Tests**: P5 — 한국어 응답 + 영어 기술 용어 보존
- **Priority**: P0 (core promise)
- **Skill Under Test**: tutor

## Setup

### Fixtures Required
- Chapter 1 notes.md (영어 원문 — pass-by-reference, static_cast, default parameters 등)
- section_plan.md

### Pre-conditions
- Tutor 모드, Section 1.3 진행 중
- User profile: 한국어 선호

## Stimulus

### Turn 1 (User)
```
pass by reference랑 pass by value 차이 설명해줘
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] 없음 (순수 행동 검증)

### Behavioral Assertions (LLM judge 채점)
- [ ] "Response in Korean" — 설명 본문이 한국어로 작성됨
- [ ] "English terms preserved" — pass-by-reference, pass-by-value, int&, void 등 영어 기술 용어를 번역하지 않고 보존
- [ ] "No Korean translation of terms" — "참조에 의한 전달", "값에 의한 전달" 같은 한국어 번역을 주요 표현으로 사용하지 않음 (보조 설명은 가능)
- [ ] "Code examples in English" — 코드 블록 내용은 원본 영어 그대로
- [ ] "Natural Korean flow" — 영어 용어가 한국어 문장에 자연스럽게 녹아듦 (어색한 코드스위칭 아님)

## Scoring
- **PASS**: 한국어 + 영어 용어 보존 + behavioral 평균 ≥ 4.0
- **FAIL**: 전체 영어 응답 또는 기술 용어 한국어화 시 FAIL
