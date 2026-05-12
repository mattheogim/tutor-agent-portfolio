---
name: eval
description: "시스템 행동 검증 — 스킬 워크플로우, 행동 규칙, 일관성 테스트"
when_to_use: "'/eval' 또는 '평가 실행', '테스트 돌려줘'라고 말할 때"
sections: []
tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - "Bash(python3 *)"
  - "Bash(mkdir *)"
  - "Bash(ls *)"
  - "Bash(cp *)"
  - "Bash(diff *)"
effort: high
permissions:
  allow:
    - "Read(**)"
    - "Write(**/eval/**)"
    - "Glob(**)"
    - "Grep(**)"
  deny:
    - "Write(**/personal/**)"
    - "Write(**/chapters/**)"
    - "Write(**/analytics/**)"
---

> **Shared Rules** → `CLAUDE.md` (P5: Language Policy만 적용. 다른 규칙은 eval 대상이지 eval 자체에 적용되지 않음.)

# Eval Skill — 시스템 행동 검증

## BASE PATH
프로젝트 루트 (= 현재 작업 디렉토리)

## 명령어

### `/eval list`
`eval/scenarios/` 디렉토리를 스캔하여 카테고리별로 시나리오 목록 표시.

```
📋 Eval Scenarios (25)
─────────────────────
skill-tutor (4):
  socratic-method.md — 소크라틱 질문 사용 검증
  three-strike.md — 3회 실패 시 STOP 검증
  ...
behavioral (9):
  p1-zero-data-loss.md — 원본 보존 검증
  ...
consistency (4):
  scenario-routing-5x.md — 라우팅 일관성 (5회)
  ...
```

### `/eval run <scenario>`
단일 시나리오 실행.

**워크플로우:**
1. 시나리오 파일 읽기 (`eval/scenarios/{category}/{name}.md`)
2. 픽스처 초기화: `python3 eval/scripts/setup_fixtures.py`
3. Setup 섹션의 지시 실행 (파일 복사, 상태 세팅)
4. Stimulus 섹션의 사용자 메시지를 **시뮬레이션 컨텍스트**에서 실행
   - 해당 스킬의 SKILL.md 규칙을 읽음
   - 픽스처 데이터를 기반으로 응답 생성
   - 파일 변경 사항 캡처
5. **Structural Assertions** 실행:
   - 파일 존재 확인 (Glob)
   - 포맷 확인 (Grep — 필수 헤딩, 필드, 구조)
   - 값 확인 (Read — 특정 값이 올바른지)
   - diff 확인 (Bash diff — 원본 보존 검증)
6. **Behavioral Assertions** — eval-judge 에이전트 스폰:
   - 시나리오의 Expected Behavior 전달
   - 해당 rubric 파일 전달
   - 실제 응답 텍스트 전달
   - judge가 각 assertion을 1-5점으로 채점
7. 결과를 `eval/results/{timestamp}/scenario_results/{name}.json`에 저장
8. 요약 표시:
   ```
   ✅ socratic-method — PASS
     Structural: 3/3
     Behavioral: 4.25/5.0
     Notes: "Source citation could be more specific"
   ```

### `/eval run-all`
모든 시나리오를 순차 실행 → 전체 리포트 생성.

1. `eval/scenarios/` 내 모든 `.md` 파일 수집 (_template 제외)
2. 각 시나리오에 대해 `/eval run` 실행
3. 결과 수집 → `eval/results/{timestamp}/run_manifest.json` 저장
4. `python3 eval/scripts/collect_results.py` → `report.md` 생성
5. 리포트 표시

### `/eval consistency <scenario> [N=5]`
같은 시나리오를 N번 반복 실행하여 일관성 측정.

1. 시나리오를 N번 실행 (매번 픽스처 초기화)
2. 각 실행의 핵심 판단을 추출 (어떤 스킬 선택? 어떤 Tier? Socratic or Direct?)
3. `python3 eval/scripts/consistency_scorer.py` → 일관성 점수 산출
4. 결과:
   ```
   🔄 scenario-routing-5x — 4/5 일치 (80%) — CONSISTENT
     Run 1: practice-questions
     Run 2: practice-questions
     Run 3: practice-questions
     Run 4: tutor (outlier)
     Run 5: practice-questions
   ```

### `/eval report`
가장 최근 결과에서 리포트 표시.

### `/eval fixtures reset`
`python3 eval/scripts/setup_fixtures.py` 실행하여 픽스처 초기 상태로 복원.

---

## Structural Assertion 패턴

각 시나리오의 structural assertion은 다음 패턴으로 검증:

| Assertion Type | Method | Example |
|---|---|---|
| File exists | `Glob(path)` | error_notes.md가 생성됐는지 |
| Contains heading | `Grep("^### .* — ★", file)` | ★ 포맷 헤딩 존재 |
| Contains field | `Grep("\\*\\*Thought process\\*\\*:", file)` | 필수 필드 존재 |
| Value check | `Read(file)` + 파싱 | star_level == 2 |
| Content preserved | `Bash(diff original saved)` | 단어 하나도 안 빠짐 |
| Event logged | `Grep("error_created", jsonl)` | analytics 이벤트 기록 |
| JSON valid | `python3 -c "import json; json.load(open(f))"` | JSON 파싱 가능 |

---

## Behavioral Assertion 채점 기준

eval-judge 에이전트가 각 behavioral assertion을 1-5점으로 채점:

| Score | Meaning |
|-------|---------|
| 5 | 완벽히 충족 |
| 4 | 충족하나 사소한 이슈 |
| 3 | 부분 충족 — 핵심은 맞으나 일부 누락 |
| 2 | 미흡 — 핵심 요소 누락 |
| 1 | 완전 실패 — 규칙 위반 |

**Verdict 결정:**
- **PASS**: 모든 structural PASS + behavioral 평균 ≥ 4.0
- **PARTIAL**: 모든 structural PASS + behavioral 평균 3.0-3.9
- **FAIL**: 어떤 structural FAIL 또는 behavioral 평균 < 3.0

---

## 결과 JSON 스키마

```json
{
  "scenario": "socratic-method",
  "category": "skill-tutor",
  "timestamp": "2026-04-02T15:00:00",
  "structural": {
    "total": 3,
    "passed": 3,
    "assertions": [
      {"name": "No file writes during tutor", "result": "PASS"}
    ]
  },
  "behavioral": {
    "total": 4,
    "assertions": [
      {"name": "Response in Korean", "score": 5, "max": 5, "note": ""},
      {"name": "Socratic questioning", "score": 4, "max": 5, "note": "Slightly leading"}
    ],
    "average": 4.25
  },
  "verdict": "PASS",
  "notes": ""
}
```
