# Scenario: scenario-detection

## Metadata
- **Category**: behavioral
- **Tests**: 6개 입력에 대해 올바른 스킬 라우팅
- **Priority**: P0 (core promise)
- **Skill Under Test**: orchestrator (CLAUDE.md Scenario Detection)

## Setup

### Fixtures Required
- 전체 fixtures (notes, error_notes, quiz, analysis 등)

### Pre-conditions
- Course: test_cs101 / TestProf 설정됨
- Chapter 1 notes 존재, quiz_1 존재, analysis_summary 존재

## Stimulus

6개의 독립 메시지를 각각 테스트 (멀티턴 아님, 각각 별도 시뮬레이션):

### Input 1
```
이 노트 저장해줘
[Chapter 1 노트 첨부]
```
**Expected Skill**: input-processing

### Input 2
```
Chapter 1 Section 1.2 공부하자
```
**Expected Skill**: tutor

### Input 3
```
문제 풀어보자
```
**Expected Skill**: practice-questions

### Input 4
```
퀴즈 분석해줘
[quiz_1.md 참조]
```
**Expected Skill**: analysis

### Input 5
```
전략 짜줘, 뭐부터 해야해?
```
**Expected Skill**: exam-coach

### Input 6
```
오늘 끝
```
**Expected Skill**: end-session

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Grep("skill_activated", .session_activity.jsonl)` — 각 스킬 활성화 이벤트가 activity log에 기록됨

### Behavioral Assertions (LLM judge 채점)
- [ ] "Input 1 → input-processing" — 파일 업로드 → input-processing 스킬 활성화
- [ ] "Input 2 → tutor" — 공부 요청 → tutor 스킬 활성화
- [ ] "Input 3 → practice-questions" — 문제 요청 → practice-questions 활성화
- [ ] "Input 4 → analysis" — 분석 요청 → analysis 스킬 활성화
- [ ] "Input 5 → exam-coach" — 전략 요청 → exam-coach 스킬 활성화
- [ ] "Input 6 → end-session" — 종료 요청 → end-session 스킬 활성화

## Scoring
- **PASS**: 6/6 올바른 라우팅 + behavioral 평균 ≥ 4.0
- **PARTIAL**: 4-5/6 올바른 라우팅
- **FAIL**: 3개 이하 올바른 라우팅
