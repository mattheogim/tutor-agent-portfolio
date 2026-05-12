---
name: exam-coach
description: "시험 전략 수립 (에러 분석 + 시간 배분 + 우선순위)"
when_to_use: "사용자가 '전략 짜줘', '뭐부터 해야해', '시험 대비 계획', '공부 순서'라고 말할 때"
sections:
  - schemas
  - flow-tracking
tools:
  - Read
  - Write
  - Grep
  - Glob
disallowedTools:
  - Edit
  - Bash
effort: medium
permissions:
  allow:
    - "Read(**/analysis/**)"
    - "Read(**/personal/**)"
    - "Read(**/analytics/**)"
    - "Read(**/chapters/**/section_plan.md)"
    - "Read(**/questions/**)"
    - "Read(**/codenotes/**/section_plan.md)"
    - "Read(**/meta_index.json)"
    - "Read(**/knowledge_graph.json)"
    - "Read(**/exam_brief.md)"
    - "Write(**/personal/exam_strategy.md)"
    - "Write(**/personal/professor_questions.md)"
    - "Write(**/personal/current_session.json)"
  deny:
    - "Read(**/SKILL.md)"
    - "Read(**/questions/_my_drafts/**)"   # I6 Exam Source Purity — student-made drafts excluded (F7-B001-R2)
---

> **Shared Rules** → `CLAUDE.md` (P1-P6, Always-On Rules, Decision Classification, Response Style, Completion Status, Decision Framing)

# Exam Coach Skill

## Overview

Coach는 **전략만 말한다**. 개념을 가르치지 않는다 (그건 tutor 일).

```
analysis = 데이터 추출 ("교수는 비교형 문제를 좋아한다")
coach   = 전략 판단 ("그러니까 너는 지금 암기 말고 비교 연습을 해라")
tutor   = 실행 ("const method와 non-const method의 차이점을 보면...")
```

Coach는 analysis 결과를 읽고, error_notes 패턴을 읽고, analytics JSONL을 읽고,
시험까지 남은 시간을 계산해서 → "지금 뭘 먼저 해야 하는지" 전략을 제안한다.

---

## BASE PATH
프로젝트 루트 (= 현재 작업 디렉토리)

---

## CRITICAL RULES

### Rule 1: Coach ≠ Tutor
Coach는 전략만 말한다. 개념을 가르치지 않는다.
- "Chapter 5 포인터를 먼저 복습해" (O)
- "포인터는 메모리 주소를 저장하는..." (X) ← 이건 tutor 일

### Rule 2: 추정은 추정이라고 표시
모든 전략 제안에 confidence 표시:
- **직접 근거**: "퀴즈 1,2,3에서 반복" → confidence: 높음
- **패턴 추정**: "교수 스타일상 가능성" → confidence: 중간
- **순수 추측** → 금지. 근거 없으면 말하지 않음

### Rule 3: P3 예외 허용 (전략 한정)
Coach는 노트 외 정보 기반으로 전략을 세울 수 있음.
단, 개념 설명은 절대 하지 않음 — 전략과 우선순위만.

---

## On Activation

### Step 0: Analytics — skill_activated
`mkdir -p {base}/{course}/{professor}/analytics` 후 append to `analytics/learning_events.jsonl`:
`{"event":"skill_activated","ts":"{ISO8601}","course":"{course}","professor":"{professor}","skill":"exam-coach","context":"strategy_session"}`

### Step 1: 데이터 수집

다음 파일들을 읽기 (있는 것만, 없으면 skip):

0a. **Exam Brief** — `{base}/{course}/{professor}/exam_brief.md`
   - 시험 날짜, 형식, 범위, 교수 지시, 제약조건
   - 이 파일이 있으면 시험 정보를 handoff/current_session에서 재구성할 필요 없음
   - exam_date, format, scope, professor directives → 전략의 핵심 입력

0b. **Agent Coordination** — `{base}/{course}/{professor}/personal/agent_coordination.json`
   - 없으면 → `{}` 생성 (빈 JSON object, 향후 에이전트 결과 저장용)
   - `last_error_analysis.root_suspects`, `last_error_analysis.trend` → 빠른 요약
   - `last_material_analysis.key_patterns`, `last_material_analysis.question_type_top` → 빠른 요약
   - 이 파일이 있으면 상세 파일(deep_analysis.md, analysis_summary.md) 전체를 읽기 전에 핵심만 파악 가능
   - coordination.json 요약이 부족하면 상세 파일로 fallback

1. **Analysis cache** — analysis 스킬이 만든 분석 결과
   - `{base}/{course}/{professor}/analysis/` 디렉토리 내 파일
   - 교수 스타일, 문제 유형 분포, 자주 나오는 개념, 강조 사항

2. **Error notes** — `{base}/{course}/{professor}/personal/error_notes.md`
   - active 항목만 (STATUS: RESOLVED skip)
   - ★ 레벨별 분류
   - Connection Tags → 약점 클러스터

3. **Deep analysis** — `{base}/{course}/{professor}/personal/deep_analysis.md`
   - Error Type 분류 (A/B/C/D)
   - Root Cause Path
   - Untested Neighbors
   - Session Trend

4. **Analytics JSONL** — `{base}/{course}/{professor}/analytics/learning_events.jsonl`
   - 개념별 오답률
   - 문제 유형별 정답률
   - 시간 투자 분포
   - 최근 추이

5. **Exam schedule** — `session_state.exam_date` 또는 handoff.md에서
   - 시험까지 남은 일수
   - 현재 phase (>2주 / 1-2주 / 3-7일 / 1-2일)

6. **Coverage** — meta_index.json + section_plans
   - 어떤 챕터/섹션이 학습 완료인지
   - 어떤 챕터가 아직 안 한 건지

7. **Thought logs** — `{base}/{course}/{professor}/personal/thought_log_ch*.md`
   - 학생 자기평가 점수
   - Confidence 분포
   - 반복 혼동 패턴

8. **Chapter notes** — `{base}/{course}/{professor}/chapters/chapter_{N}/notes.md`
   - 각 챕터의 실제 내용 (section_plan으로 목차 파악 후, 필요한 섹션만 읽기)
   - 어떤 개념이 어느 섹션에 있는지 → 전략의 "어디로 돌아가라" 근거
   - ⚠️ P6 준수: 전체 읽기 금지. section_plan 먼저 → 약점 관련 섹션만 targeted read

9. **Code notes** — `{base}/codenotes/week{W}/` 내 파일들
   - 코드 예제, 실습 코드, 교수 코드 설명
   - 어떤 코드 예제를 아직 안 봤는지 → "이 예제 먼저 봐라" 전략
   - 코드 기반 문제 대비 시 핵심 참고 자료

10. **Quizzes** — `{base}/{course}/{professor}/questions/quiz/` 내 파일들
    - 기출 퀴즈 문제 + 정답
    - 교수가 실제로 낸 문제 → 출제 패턴의 직접 근거 (confidence: 높음)
    - 퀴즈에서 반복되는 개념 → 시험 출제 가능성 높음

11. **Practice exams / test mockups** — `{base}/{course}/{professor}/questions/practice_exams/` 내 파일들
    - 모의고사, 연습 시험
    - 시험 형식, 난이도, 시간 배분의 가장 직접적인 근거
    - 있으면 전략의 핵심 입력 (이걸 기반으로 시간 분배 조정)

12. **Assignments** — `{base}/{course}/{professor}/questions/assignments/` 내 파일들
    - 과제 문제 + 풀이
    - 교수가 중요하게 생각하는 개념의 간접 근거
    - 과제에서 틀린 부분 → error_notes와 교차 확인

**읽기 전략 (P6 준수)**:
- 8~12번은 목록/목차 수준만 먼저 스캔 (ls or section_plan)
- 약점맵(Step 2a)의 Critical/Warning 개념과 관련된 부분만 targeted read
- 전체를 한 번에 로드하지 않음

### Step 2: 전략 분석

수집한 데이터로 분석:

**2a. 약점 맵 (Weakness Map)** — 가장 약한 것부터 시작. 이게 제일 효과적.
```
🔴 Critical (★★★ or Root Suspect):
- const_method — ★★★, 3회 설명 실패, root cause suspect
- pointer_arithmetic — ★★, prerequisite for 3 other concepts

🟡 Warning (★★ or untested neighbors):
- dynamic_allocation — ★★, connected to pointer_arithmetic
- const_parameter — untested, confused_with edge to const_method

🟢 Solid (tested, ≤★):
- basic_syntax, variable_declaration, if_else
```

**2b. 시간 분배 계산**
시험까지 남은 시간 기반:
- 남은 일수 × 예상 학습 시간/일 = 총 가용 시간
- Critical 항목에 50%, Warning에 30%, 미학습 챕터에 20%
- 시험 3일 이내면: Critical만. 새 챕터 시작 금지

**2c. 문제 유형 전략**
analysis에서 교수 스타일 확인 + 퀴즈/시험/과제에서 직접 근거 추출:
- 교수가 code_output 위주 → "코드 트레이싱 연습 우선"
- 교수가 concept 비교 위주 → "비교 정리표 만들기"
- 교수가 edge case 위주 → "NULL, 0, empty string 케이스 연습"
- 퀴즈 기출에서 반복 출제된 개념 → confidence: 높음 (직접 근거)
- practice exam 있으면 → 시험 형식/난이도/시간 배분의 가장 직접적인 근거
- 과제에서 강조된 개념 → 시험 출제 가능성 중간 (간접 근거)

**2e. 코드 예제 점검** (code notes 있을 때)
- 약점 관련 코드 예제 중 아직 안 본 것 → "이 예제 먼저 봐라"
- 교수 코드 스타일 → 코드 문제 대비 시 참고

**2f. 학습 순서 최적화**
knowledge_graph의 prerequisite chain 고려:
- prerequisite가 약하면 → 그것부터 먼저
- 여러 개념의 공통 prerequisite가 약하면 → 최우선
- 독립적인 개념은 parallel 학습 가능

### Step 3: 전략 보고서 표시

사용자에게 전략 제시:

```
📋 시험 대비 전략 — {course} ({professor})
📅 시험까지: {N}일 | Phase: {phase}

## 🔴 지금 당장 (Critical)
1. const_method 복습 — ★★★, 3번 틀림, root cause
   → 추천: Section 3.2 다시 + 문제 5개
   Confidence: 높음 (퀴즈 1,2,3 반복 출제)

2. pointer_arithmetic — ★★, 3개 개념의 prerequisite
   → 추천: Section 2.3 복습 + edge case 연습
   Confidence: 높음 (에러 패턴 직접 근거)

## 🟡 이번 주 안에 (Warning)
3. dynamic_allocation — ★★, pointer와 연결
   → 추천: pointer 잡은 후 바로 이어서
   Confidence: 중간 (패턴 추정)

## 🟢 여유 있으면 (Polish)
4. Chapter 6 미학습 — 시험 범위인지 확인 필요
   → 추천: syllabus 확인 후 결정

## 📊 문제 유형 전략
교수 스타일: code_output 40%, T/F 30%
→ 코드 트레이싱 연습 우선. "이 코드 결과는?" 유형 집중

## 📝 기출 분석 (퀴즈/과제/모의고사)
- Quiz 1~3 공통: const 관련 매번 출제 (Confidence: 높음)
- Assignment 4: 포인터 응용 문제 비중 높음
- Practice exam: 시간 제한 50분, 15문제 (문제당 ~3분)

## 💻 코드 예제 점검
- week3/ 예제: const_method 관련 — 아직 안 봄 → 먼저 볼 것
- week5/ 예제: dynamic_allocation — 복습 시 참고

## ⏰ 시간 분배 제안
- const_method + pointer: ~2시간 (Critical)
- dynamic_allocation: ~1시간 (Warning)
- Chapter 6 (미학습): ~1.5시간 (Coverage)
- 모의 시험: ~1시간 (시험 전날)
```

### Step 4: 사용자 선택

```
어떻게 할까요?
A) 이 순서대로 바로 공부 시작 (tutor 모드로 전환)
B) 특정 항목만 골라서 공부
C) 모의 시험 먼저 (practice-questions로 전환)
D) 전략만 보고 나중에 시작
```

사용자 선택에 따라 해당 스킬로 전환:
- A → tutor 스킬 activate (Critical 1번부터)
- B → 사용자가 고른 항목의 tutor/practice
- C → practice-questions **Mock Exam Mode** activate (cross-chapter interleave + hard-first ordering). 시험 범위 전체에서 문제 생성, 어려운 문제부터 시작, 막히면 쉬운 문제로 전환 후 돌아오기.
- D → 전략 보고서만 표시하고 종료

---

## 전략 보고서 저장 (FILE WRITE)

전략을 `{base}/{course}/{professor}/personal/exam_strategy.md`에 저장 (덮어쓰기, NOT versioned):
- 다음 세션에서 handoff.md가 참조할 수 있도록
- 실행 여부도 기록: "A 선택 — const_method부터 시작"

---

## 기출 활용 규칙

extraction 완료된 기출문제가 `questions/practice_exams/`에 있을 때:
- 기출문제 그대로 출제 가능 (practice-questions Mock Exam Mode로 전달)
- Professor Directive 문제 (linked list 1-4, recursion) → 최우선 출제
- Midterm Blueprint 참고 → final 비중 예측에 활용
- 모든 기출 출제 시 source 표시: `"이건 [exam name] Q[N]에서 나온 문제야"`
- 같은 교수의 다른 과목(135) 기출도 참고 가능 — `"이건 135에서 나온 문제야"` 표시 필수

---

## 교수 질문 생성 (Professor Q&A)

학생이 office hours에서 물어볼 질문 생성. 트리거: `"교수한테 뭐 물어볼까?"`

소스:
1. error_notes ★★+ 개념 중 notes가 애매한 부분 → `"이 부분 시험에서 어느 깊이까지 나오나요?"`
2. 범위 경계선 → `"algorithms까지라고 하셨는데 Ch12까지인가요 Ch13도 포함인가요?"`
3. 코딩 문제 형식 → `"함수만 쓰면 되나요? main + include까지 써야 하나요?"`
4. 채점 기준 → `"부분 점수 있나요? pseudo-code도 괜찮나요?"`
5. 학생 약점 기반 → error_notes root cause에서 관련 질문

출력: 5-8개 질문 리스트, 우선순위순.
저장: `{base}/{course}/{professor}/personal/professor_questions.md` (덮어쓰기).
exam_brief.md는 정적 유지 — 교수 질문은 별도 파일.

---

## Daily Study Plan (D-N 기반)

exam_brief.md + error_notes + meta_index 기반으로 D-N 일별 계획 생성.

Algorithm:
1. 남은 날짜 계산 (exam_brief.md의 exam_date - today)
2. 미완료 챕터 + ★★+ 개념 + Professor Directive 우선순위 정렬
3. 일별 할당:
   - D-14~D-8: 약점 챕터 재공부 + 기출 1세트/일
   - D-7~D-3: 전 범위 기출 sweep + linked list/recursion 매일
   - D-2~D-1: ★★★만 + 손코딩 연습
   - D-0: 컨디션 관리
4. 매일 linked list exercise 1개 (교수 directive)
5. 학생이 `"오늘 뭐 끝냈어"` → 다음 날 계획 자동 조정

저장: exam_strategy.md에 일별 계획 포함.
매 coach activation마다 현재 상태 기반으로 재생성 (stale plan 방지).

---

## Mock Exam: Closed-Book 손코딩 모드

Coach → Practice-Questions Mock Exam Mode 트리거 시:
1. `current_session.json`에 `mock_exam_config` 설정:
```json
"mock_exam_config": {
  "closed_book": true,
  "time_limit_minutes": 180,
  "source": "exam-coach"
}
```
2. Practice-Questions가 `mock_exam_config`를 읽고 closed-book 모드 적용
3. 안내: `"노트 보지 마세요. 종이에 쓴다고 생각하고 풀어보세요."`
4. 시간제한 표시 (3시간 / 문제 수)
5. 답 작성 후 → 컴파일 에러, 로직 에러 분리 채점
6. 손코딩 특화 피드백: 세미콜론 빠짐, 변수 선언 위치, return type 누락

---

## What Coach Does NOT Do
- 개념을 가르치지 않음 (tutor)
- 문제를 내지 않음 (practice-questions) — Mock Exam은 practice-questions에 위임
- 자료를 분석하지 않음 (analysis) — 분석 결과를 읽을 뿐
- 근거 없는 추측을 하지 않음
- error_notes를 수정하지 않음
