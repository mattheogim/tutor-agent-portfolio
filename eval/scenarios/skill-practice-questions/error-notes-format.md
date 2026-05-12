# Scenario: error-notes-format

## Metadata
- **Category**: skill-practice-questions
- **Tests**: 오답 시 error_notes.md 포맷 정확성 (★, 필수 필드, Connection Tags)
- **Priority**: P0 (core promise)
- **Skill Under Test**: practice-questions

## Setup

### Fixtures Required
- Chapter 1 notes.md
- error_notes.md (기존 항목 존재)
- meta_index.json

### Pre-conditions
- Practice-questions 모드, Chapter 1 문제 출제 중
- 학생이 default_parameters 관련 문제를 틀린 상황

## Stimulus

### Turn 1 (System — 문제 출제)
```
다음 코드의 출력은?
void greet(string name = "World") {
    cout << "Hello, " << name << endl;
}
greet("Alice");
greet();
```

### Turn 2 (User — 오답)
```
Hello, Alice
Hello, Alice
```
(정답: Hello, Alice / Hello, World)

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Grep("^### default_parameters — ★", personal/error_notes.md)` — ★ 포맷 헤딩
- [ ] `Grep("\\*\\*When\\*\\*:", personal/error_notes.md)` — When 필드 존재
- [ ] `Grep("\\*\\*What\\*\\*:", personal/error_notes.md)` — What 필드 존재
- [ ] `Grep("\\*\\*Context\\*\\*:", personal/error_notes.md)` — Context 필드 존재
- [ ] `Grep("\\*\\*Thought process\\*\\*:", personal/error_notes.md)` — Thought process 필드 존재
- [ ] `Grep("\\*\\*Connection Tags\\*\\*:", personal/error_notes.md)` — Connection Tags 존재
- [ ] `Grep("\\[functions\\]|\\[default_parameters\\]", personal/error_notes.md)` — 관련 태그 존재

### Behavioral Assertions (LLM judge 채점)
- [ ] "Immediate recording" — 오답 즉시 error_notes에 기록 (다음 문제 전에)
- [ ] "Accurate description" — What 필드가 실제 오류를 정확히 설명
- [ ] "Student thought captured" — Thought process에 학생의 추론 과정 기록
- [ ] "Helpful feedback" — 틀린 부분 설명하되 맞은 부분 먼저 인정

## Scoring
- **PASS**: 모든 structural + behavioral 평균 ≥ 4.0
- **FAIL**: 필수 필드 누락 시 structural FAIL
