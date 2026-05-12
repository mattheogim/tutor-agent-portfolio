# Scenario: three-strike

## Metadata
- **Category**: skill-tutor
- **Tests**: 3회 설명 실패 시 STOP + 옵션 제시 + ★★★ 기록
- **Priority**: P0 (core promise)
- **Skill Under Test**: tutor

## Setup

### Fixtures Required
- Chapter 1 notes.md (Section 1.3 — pass-by-reference)
- section_plan.md
- error_notes.md (pass_by_reference ★★ — 이미 2회 오해)

### Pre-conditions
- Tutor 모드, Section 1.3 진행 중
- pass_by_reference 개념 설명 중
- 학생이 이 개념을 2번 이해 못한 상태 (error_notes에 기록됨)

## Stimulus

### Turn 1 (User — 1차 설명 후)
```
아 그러니까 reference로 보내도 복사본이 가는 거 아니야? 원래 변수는 안 바뀌는 거잖아
```

### Turn 2 (User — 2차 다른 방식 설명 후)
```
음... 그래도 잘 모르겠어. 함수 안에서 바꾸면 함수 끝나면 사라지는 거 아닌가?
```

### Turn 3 (User — 3차 또 다른 방식 설명 후)
```
아 진짜 모르겠다. 왜 원래 변수가 바뀌는 거야?
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Grep("★★★", personal/error_notes.md)` — ★★★ 에스컬레이션 기록
- [ ] `Grep("3회 설명 실패|escalated", personal/error_notes.md)` — escalation 마커

### Behavioral Assertions (LLM judge 채점)
- [ ] "Three different approaches" — 1차, 2차, 3차 설명이 각각 다른 방식 (같은 방식 반복 안 함)
- [ ] "STOP after third" — 3차 실패 후 같은 방식 4번째 반복하지 않음
- [ ] "Honest acknowledgment" — "이 방식으로는 잘 안 되는 것 같아요" 류의 솔직한 인정
- [ ] "Options presented" — A) prerequisite부터, B) 넘어가기, C) 다른 자료 — 3가지 옵션 제시
- [ ] "Error escalation" — error_notes에 ★★★ 기록 + "3회 설명 실패" 표시
- [ ] "No blame on student" — 학생 탓하지 않음, 방식의 한계 인정

## Scoring
- **PASS**: STOP 발동 + 옵션 제시 + ★★★ 기록 + behavioral 평균 ≥ 4.0
- **FAIL**: 4번째 같은 설명 반복하면 즉시 FAIL
