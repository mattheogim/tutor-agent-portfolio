# Scenario: [이름]

## Metadata
- **Category**: skill-tutor | skill-practice-questions | skill-practice-notes | skill-analysis | skill-exam-coach | skill-input-processing | skill-note-organization | skill-end-session | behavioral | consistency
- **Tests**: [어떤 규칙/행동을 검증하는지]
- **Priority**: P0 (core promise) | P1 (important) | P2 (nice-to-have)
- **Skill Under Test**: [어떤 스킬이 활성화되어야 하는지]

## Setup

### Fixtures Required
- [필요한 픽스처 파일 목록]
- [특수 상태 설정 (예: error_notes에 특정 항목 추가)]

### Pre-conditions
- [시나리오 시작 전 충족되어야 할 조건]
- [예: "Chapter 1 notes.md 존재", "error_notes에 active 항목 3개"]

## Stimulus

### Turn 1 (User)
```
[시뮬레이션할 사용자 메시지]
```

### Turn 2 (User) — optional
```
[두 번째 사용자 메시지 (멀티턴 시나리오)]
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `assertion_type(target)` — 설명
- [ ] 예: `Glob(personal/error_notes.md)` — error_notes 파일 존재
- [ ] 예: `Grep("^### .* — ★", personal/error_notes.md)` — ★ 포맷 헤딩 존재
- [ ] 예: `Read(file) → value_check` — 특정 값 확인

### Behavioral Assertions (LLM judge 채점, 각 1-5점)
- [ ] [assertion 이름] — [무엇을 검증하는지 구체적으로]
- [ ] 예: "Response in Korean" — 응답이 한국어로 작성됨
- [ ] 예: "Socratic questioning used" — 직접 답을 주지 않고 유도 질문 사용
- [ ] 예: "Source citation present" — 노트 출처 명시

## Rubric (optional)
[세부 채점 기준이 필요하면 eval/rubrics/{name}.md 참조]

## Scoring
- **PASS**: 모든 structural PASS + behavioral 평균 ≥ 4.0
- **PARTIAL**: 모든 structural PASS + behavioral 평균 3.0-3.9
- **FAIL**: structural FAIL 있음 또는 behavioral 평균 < 3.0
