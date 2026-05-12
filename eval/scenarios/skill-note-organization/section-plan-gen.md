# Scenario: section-plan-gen

## Metadata
- **Category**: skill-note-organization
- **Tests**: section_plan.md 생성 시 올바른 포맷 (Key Concepts, Prerequisites, Approach)
- **Priority**: P1 (important)
- **Skill Under Test**: note-organization

## Setup

### Fixtures Required
- Chapter 1 notes.md (저장됨)

### Pre-conditions
- 노트가 저장된 직후
- section_plan 생성 단계

## Stimulus

### Turn 1 (시뮬레이션)
notes.md 저장 완료 → note-organization이 section_plan 생성

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Glob(chapters/chapter_1/section_plan.md)` — 파일 생성됨
- [ ] `Grep("Key Concepts", section_plan.md)` — Key Concepts 필드 존재
- [ ] `Grep("Prerequisites", section_plan.md)` — Prerequisites 필드 존재
- [ ] `Grep("Approach", section_plan.md)` — Approach 필드 존재
- [ ] `Grep("### 1\\.", section_plan.md)` — 섹션 번호 존재

### Behavioral Assertions (LLM judge 채점)
- [ ] "All sections covered" — notes.md의 모든 섹션이 plan에 포함
- [ ] "Prerequisite chain logical" — 1.1은 prerequisite 없음, 1.3은 1.1+1.2 필요
- [ ] "Concepts accurate" — Key Concepts가 실제 노트 내용 반영
- [ ] "Teaching approach sensible" — 각 섹션의 Approach가 합리적

## Scoring
- **PASS**: 포맷 정확 + 내용 합리적 + behavioral 평균 ≥ 4.0
- **FAIL**: 필수 필드 누락 시 structural FAIL
