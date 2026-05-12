# Scenario: agent-delegation

## Metadata
- **Category**: skill-analysis
- **Tests**: 분석 작업을 analysis 에이전트에 위임하는 패턴
- **Priority**: P2 (nice-to-have)
- **Skill Under Test**: analysis

## Setup

### Fixtures Required
- quiz_1.md
- Chapter 1 notes.md

### Pre-conditions
- Analysis 스킬 활성화
- 분석할 참고 자료 존재

## Stimulus

### Turn 1 (User)
```
퀴즈 분석해줘
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] 없음 (에이전트 위임은 행동 검증)

### Behavioral Assertions (LLM judge 채점)
- [ ] "Agent used for heavy work" — 무거운 분석 작업은 analysis 에이전트에 위임
- [ ] "Background execution" — 에이전트가 백그라운드에서 실행됨을 인지
- [ ] "Result integration" — 에이전트 결과를 분석 파일에 통합
- [ ] "BOUNDARY respected" — 에이전트가 SKILL.md/CLAUDE.md를 읽지 않음

## Scoring
- **PASS**: 에이전트 위임 + BOUNDARY 준수 + behavioral 평균 ≥ 4.0
- **PARTIAL**: 에이전트 없이 직접 분석하지만 결과는 정확
