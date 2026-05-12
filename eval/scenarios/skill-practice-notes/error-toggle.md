# Scenario: error-toggle

## Metadata
- **Category**: skill-practice-notes
- **Tests**: 튜터링=OFF, 퀴즈=ON (error notes 토글 정확성)
- **Priority**: P1 (important)
- **Skill Under Test**: practice-notes

## Setup

### Fixtures Required
- Chapter 1 notes.md, section_plan.md
- error_notes.md (기존 항목)

### Pre-conditions
- Practice-notes 모드
- Section 1.1 튜터링 → Section 1.1 퀴즈 전환 시점

## Stimulus

### Turn 1 (시뮬레이션 — 튜터링 중)
튜터 설명 중 학생이 약간 혼란 → error notes에 기록하면 안 됨

### Turn 2 (시뮬레이션 — 퀴즈 중)
학생이 문제를 틀림 → error notes에 기록해야 함

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] 튜터링 중 error_notes 변경 없음 (또는 최소한의 메모만)
- [ ] 퀴즈 중 오답 시 error_notes에 새 항목 추가

### Behavioral Assertions (LLM judge 채점)
- [ ] "Tutor mode = error OFF" — 튜터링 중에는 error_notes 상세 기록 안 함
- [ ] "Quiz mode = error ON" — 퀴즈 중 오답 시 즉시 error_notes 기록
- [ ] "Toggle timing correct" — 모드 전환 시점에서 정확히 토글
- [ ] "Error format correct" — 퀴즈 오답 기록 시 ★ 포맷 준수

## Scoring
- **PASS**: 토글 정확 + behavioral 평균 ≥ 4.0
- **FAIL**: 튜터링 중 상세 error 기록하면 FAIL
