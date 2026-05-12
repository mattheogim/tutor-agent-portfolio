# Scenario: star-escalation

## Metadata
- **Category**: skill-practice-questions
- **Tests**: 같은 개념 재오답 시 ★ 레벨 증가 (★→★★)
- **Priority**: P1 (important)
- **Skill Under Test**: practice-questions

## Setup

### Fixtures Required
- Chapter 1 notes.md
- error_notes.md (type_truncation ★ — 1회 오답 기록)
- meta_index.json

### Pre-conditions
- Practice-questions 모드
- 학생이 type_truncation 관련 문제를 다시 틀리는 상황

## Stimulus

### Turn 1 (System — 문제 출제)
```
int x = static_cast<int>(9.99);
cout << x;
```

### Turn 2 (User — 재오답)
```
10
```
(정답: 9 — truncation)

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Grep("type_truncation — ★★", personal/error_notes.md)` — ★→★★ 에스컬레이션
- [ ] `Read(knowledge_graph.json) → type_conversion.star_level == 2` — 그래프 업데이트

### Behavioral Assertions (LLM judge 채점)
- [ ] "Star escalation" — ★에서 ★★로 증가
- [ ] "Previous error referenced" — "전에도 이 부분 헷갈렸었죠" 류 이전 오답 언급
- [ ] "Pattern recognition" — 같은 유형 반복 오답임을 인지
- [ ] "Constructive feedback" — 맞은 부분 먼저 → 틀린 부분 지적

## Scoring
- **PASS**: ★★ 에스컬레이션 + behavioral 평균 ≥ 4.0
- **FAIL**: ★ 그대로 유지하면 structural FAIL
