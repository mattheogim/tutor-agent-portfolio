# Scenario: p1-zero-data-loss

## Metadata
- **Category**: behavioral
- **Tests**: P1 — 원본 자료 단어 하나 빠짐없이 보존
- **Priority**: P0 (core promise)
- **Skill Under Test**: input-processing → note-organization

## Setup

### Fixtures Required
- `eval/work/` 초기화 (setup_fixtures.py)
- Chapter 1 notes.md (500+ 단어, 코드 블록 포함)

### Pre-conditions
- Course: test_cs101 / TestProf 설정됨
- Chapter 1 notes.md가 fixtures에서 복사됨

## Stimulus

### Turn 1 (User)
```
[사용자가 Chapter 1 notes.md 내용을 그대로 업로드했다고 시뮬레이션]
이 노트 저장해줘.
```

**시뮬레이션 방법**: input-processing 스킬이 notes.md를 저장하는 과정을 실행.
저장 전 원본 내용을 캡처하고, 저장 후 diff로 비교.

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Glob(eval/work/test_cs101/TestProf/chapters/chapter_1/notes.md)` — 파일 존재
- [ ] `Bash(diff fixture_original saved_file)` — diff 결과가 빈 문자열 (0 differences)
- [ ] `Read(saved_file) → line_count` — 원본과 동일한 줄 수
- [ ] `Grep("```cpp", saved_file) → count` — 코드 블록 수 보존
- [ ] `Grep("backup_created", .session_activity.jsonl)` — 백업 이벤트 activity log에 기록됨

### Behavioral Assertions (LLM judge 채점)
- [ ] "Word-for-word preservation" — 저장된 파일이 원본과 단어 하나도 다르지 않음
- [ ] "No summarization" — 요약이나 축약 없이 전체 내용 보존
- [ ] "Code block integrity" — 코드 블록 내부 공백/들여쓰기까지 보존
- [ ] "Metadata separation" — 메타데이터(section_plan 등)가 원본과 분리되어 저장됨

## Scoring
- **PASS**: diff = 0 + behavioral 평균 ≥ 4.0
- **PARTIAL**: diff ≤ 3줄 + behavioral 평균 ≥ 3.0
- **FAIL**: diff > 3줄 또는 behavioral 평균 < 3.0
