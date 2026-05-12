# Scenario: completion-status

## Metadata
- **Category**: behavioral
- **Tests**: DONE/DONE_WITH_CONCERNS/BLOCKED 올바른 사용
- **Priority**: P1 (important)
- **Skill Under Test**: tutor

## Setup

### Fixtures Required
- Chapter 1 notes.md, section_plan.md
- error_notes.md (pass_by_reference ★★)

### Pre-conditions
- Tutor 모드, Section 1.3 진행 중
- 학생이 pass-by-reference에서 혼란 보임

## Stimulus

### Turn 1 (User)
```
[Section 1.3 설명 완료 시점 — 학생이 pass-by-reference에서 흔들림을 보인 상태]
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] 없음

### Behavioral Assertions (LLM judge 채점)
- [ ] "Correct status used" — pass-by-reference 흔들림이 있으므로 DONE_WITH_CONCERNS 사용 (DONE 아님)
- [ ] "Concerns specified" — 어떤 개념이 흔들렸는지 구체적으로 명시
- [ ] "Natural language delivery" — 딱딱한 코드가 아닌 자연스러운 한국어로 전달 ("끝났는데 [X]이 좀 흔들려요")
- [ ] "Next action suggested" — 다음 행동 제안 (복습, 퀴즈, 다음 섹션 등)

## Scoring
- **PASS**: 올바른 상태 코드 + 자연스러운 전달 + behavioral 평균 ≥ 4.0
- **FAIL**: 흔들림 있는데 DONE으로 보고하면 FAIL
