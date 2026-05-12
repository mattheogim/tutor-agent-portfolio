# Scenario: word-preservation

## Metadata
- **Category**: skill-input-processing
- **Tests**: P1 — 입력 자료 단어 하나도 안 빠짐 (input-processing 레벨)
- **Priority**: P0 (core promise)
- **Skill Under Test**: input-processing

## Setup

### Fixtures Required
- 500단어 이상의 테스트 노트 (Chapter 1 notes.md 활용)

### Pre-conditions
- 사용자가 노트를 업로드하는 시점

## Stimulus

### Turn 1 (User)
```
이 노트 저장해줘
[Chapter 1 notes.md 전체 내용 — 500+ 단어, 코드 블록 포함]
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Bash(diff original saved)` — diff = 0 (단어 하나도 차이 없음)
- [ ] `Read(saved) → word_count` — 원본과 동일한 단어 수
- [ ] `Grep("```cpp", saved) → count` — 코드 블록 수 보존

### Behavioral Assertions (LLM judge 채점)
- [ ] "Complete preservation" — 모든 내용이 빠짐없이 저장됨
- [ ] "No summarization" — 요약하지 않음
- [ ] "Formatting preserved" — 마크다운 헤딩, 코드 블록, 리스트 구조 보존
- [ ] "Whitespace in code" — 코드 블록 내 들여쓰기 보존

## Scoring
- **PASS**: diff = 0 + behavioral 평균 ≥ 4.0
- **FAIL**: 단어 누락 시 즉시 FAIL
