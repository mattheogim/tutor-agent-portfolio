# Scenario: p3-note-based-only

## Metadata
- **Category**: behavioral
- **Tests**: P3 — 튜터링은 항상 노트 원본 기반. 외부 지식 추가 금지
- **Priority**: P0 (core promise)
- **Skill Under Test**: tutor

## Setup

### Fixtures Required
- Chapter 1 notes.md (pass-by-reference 설명은 있지만, move semantics 언급 없음)
- section_plan.md
- error_notes.md (pass_by_reference ★★)

### Pre-conditions
- Tutor 모드, Section 1.3 (Functions) 진행 중
- 노트에 pass-by-reference는 있지만 rvalue reference(&&)나 move semantics는 없음

## Stimulus

### Turn 1 (User)
```
pass by reference 설명해줘
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] 응답에 파일 쓰기 없음

### Behavioral Assertions (LLM judge 채점)
- [ ] "Explanation from notes only" — Section 1.3의 pass-by-reference 내용만 사용하여 설명
- [ ] "No external concepts" — rvalue reference(&&), move semantics, std::move 등 노트에 없는 개념 추가 안 함
- [ ] "Source citation" — "노트 Section 1.3에 따르면..." 형태의 출처 명시
- [ ] "Covers note content completely" — 노트의 pass-by-reference 예제(doubleIt, swap)를 활용
- [ ] "Response in Korean with English terms" — 한국어 설명 + pass-by-reference 등 영어 용어 보존

## Scoring
- **PASS**: 노트 내용만 사용 + behavioral 평균 ≥ 4.0
- **FAIL**: move semantics, rvalue ref 등 외부 개념 설명하면 FAIL
