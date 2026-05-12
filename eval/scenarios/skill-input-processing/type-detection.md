# Scenario: type-detection

## Metadata
- **Category**: skill-input-processing
- **Tests**: 업로드 자료 유형 자동 감지 (노트 vs 퀴즈 vs 과제)
- **Priority**: P1 (important)
- **Skill Under Test**: input-processing

## Setup

### Fixtures Required
- quiz_1.md (퀴즈 형식: 문제 + Answer)

### Pre-conditions
- 사용자가 파일을 업로드하는 시점

## Stimulus

### Turn 1 (User)
```
이거 저장해줘
[quiz_1.md 내용 — Question/Answer 포맷]
```

## Expected Behavior

### Structural Assertions (자동 검증)
- [ ] `Glob(questions/quiz/*)` — quiz 디렉토리에 저장 (chapters가 아님)

### Behavioral Assertions (LLM judge 채점)
- [ ] "Correct type detection" — 문제+답 형식을 퀴즈로 인식 (노트가 아님)
- [ ] "Correct storage path" — questions/quiz/ 경로에 저장
- [ ] "Acknowledgment" — "퀴즈로 저장했어요" 류의 확인
- [ ] "Next action suggestion" — "분석할까요?" 같은 다음 행동 제안

## Scoring
- **PASS**: 올바른 유형 감지 + 올바른 경로 + behavioral 평균 ≥ 4.0
- **FAIL**: 퀴즈를 노트로 저장하면 FAIL
