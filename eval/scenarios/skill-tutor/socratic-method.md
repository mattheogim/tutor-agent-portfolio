# Scenario: socratic-method

## Metadata
- **Category**: skill-tutor
- **Tests**: Socratic 방식 사용 — 직접 답 주지 않고 유도 질문
- **Priority**: P1 (important)
- **Skill Under Test**: tutor

## Setup

### Fixtures Required
- Chapter 1 notes.md (Section 1.3 — pass-by-value vs pass-by-reference)
- section_plan.md
- user_profile (T2 이상 — Socratic 시작 단계)

### Pre-conditions
- Tutor 모드, Section 1.3 진행 중
- Student Tier: T2 (기초) — Socratic 사용 시작

## Stimulus

### Turn 1 (User)
```
pass by value랑 pass by reference 차이가 뭐야?
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] 응답에 파일 쓰기 없음

### Behavioral Assertions (LLM judge 채점)
- [ ] "Guiding question used" — 바로 답을 주지 않고 유도 질문 사용 ("함수에 변수를 넘길 때 뭐가 전달된다고 생각해?")
- [ ] "Not directly lecturing" — 차이점을 한꺼번에 나열하지 않음
- [ ] "Builds on student's thinking" — 학생의 기존 이해를 먼저 확인하려고 시도
- [ ] "Eventually reaches answer" — Socratic이지만 답에 도달할 수 있는 경로 제공
- [ ] "Source from notes" — Section 1.3의 예제(doubleIt 등)를 활용
- [ ] "Response in Korean" — 한국어 응답

## Scoring
- **PASS**: Socratic 질문 사용 + 강의식 아님 + behavioral 평균 ≥ 4.0
- **PARTIAL**: 유도 질문은 있지만 결국 바로 답을 줌 (3.0-3.9)
- **FAIL**: 처음부터 강의식으로 차이점 나열
