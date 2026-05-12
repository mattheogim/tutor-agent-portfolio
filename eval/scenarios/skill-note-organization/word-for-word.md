# Scenario: word-for-word

## Metadata
- **Category**: skill-note-organization
- **Tests**: P1 — note-organization이 notes.md 원본 내용을 수정하지 않음
- **Priority**: P0 (core promise)
- **Skill Under Test**: note-organization

## Setup

### Fixtures Required
- Chapter 1 notes.md (이미 저장된 상태)

### Pre-conditions
- note-organization 스킬 활성화
- notes.md가 이미 존재하고 section_plan 생성/수정 중

## Stimulus

### Turn 1 (시뮬레이션)
note-organization이 section_plan을 생성하는 과정

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Bash(diff original_notes.md current_notes.md)` — notes.md 변경 없음 (diff = 0)
- [ ] note-organization의 Write 호출이 section_plan.md에만 해당 (notes.md Write 없음)

### Behavioral Assertions (LLM judge 채점)
- [ ] "Notes untouched" — notes.md 원본이 수정되지 않음
- [ ] "Only section_plan written" — 생성/수정 파일이 section_plan.md뿐
- [ ] "No content reorganization" — 노트 내용의 순서나 구조를 변경하지 않음

## Scoring
- **PASS**: notes.md 변경 없음 + behavioral 평균 ≥ 4.0
- **FAIL**: notes.md 수정 시 즉시 FAIL
