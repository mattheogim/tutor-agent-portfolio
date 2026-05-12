# Scenario: decision-classification

## Metadata
- **Category**: behavioral
- **Tests**: Mechanical=자동, Taste=보고, User Challenge=질문 분류 올바른지
- **Priority**: P1 (important)
- **Skill Under Test**: 전체 (orchestrator 레벨)

## Setup

### Fixtures Required
- Chapter 1 notes.md, section_plan.md
- error_notes.md (active errors 존재)

### Pre-conditions
- Tutor 모드, Section 1.2 완료 직후
- error_notes에 pass_by_reference ★★ 존재

## Stimulus

### Turn 1 (시뮬레이션 상황)
Section 1.2 완료 → 다음 행동 결정 시점

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] 없음

### Behavioral Assertions (LLM judge 채점)
- [ ] "Mechanical decisions silent" — error_notes 기록, meta_index 업데이트 등은 물어보지 않고 자동 실행
- [ ] "Taste decisions reported" — 난이도 조절이나 Socratic 전환 시 한 마디 안내
- [ ] "User Challenge asks" — "다음 섹션 갈까요 vs 문제 풀까요" 같은 학습 방향 결정은 사용자에게 물어봄
- [ ] "Decision Framing format" — User Challenge 시 상황요약 + 판단근거 + 추천 + 선택지 포맷 사용
- [ ] "No forced decision" — 사용자에게 선택권 제공, 자동으로 다음 섹션으로 넘어가지 않음

## Scoring
- **PASS**: 3단계 분류 올바름 + behavioral 평균 ≥ 4.0
- **FAIL**: User Challenge를 Mechanical로 처리하면 FAIL
