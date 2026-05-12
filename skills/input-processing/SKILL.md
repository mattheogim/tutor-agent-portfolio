---
name: input-processing
description: "파일 업로드 처리 — OCR, 타입 감지, 저장, 메타 인덱스 업데이트"
when_to_use: "사용자가 파일을 업로드하거나 이미지를 보낼 때"
effort: medium
sections:
  - data-storage
  - schemas
tools:
  - Read
  - Write
  - Edit
  - Glob
  - "Bash(mkdir *)"
permissions:
  allow:
    - "Write(**/chapters/**/notes.md)"
    - "Write(**/chapters/**/code_notes.md)"
    - "Write(**/questions/**)"
    - "Write(**/meta_index.json)"
    - "Write(**/syllabus.md)"
---

> **Shared Rules** → `CLAUDE.md` (P1-P6, Always-On Rules, Completion Status)

# Input Processing Skill

## When to Activate
- User uploads a file (image, text, document)
- User pastes text saying "이거 노트야" or similar

## Step 1: Detect Type

| Type | Indicators |
|---|---|
| Notes | Lecture content, definitions, examples, theorems |
| Quiz | Numbered questions, answer choices, point values |
| Assignment | Tasks, requirements, rubric |
| Practice Exam | Exam format, time limit, comprehensive questions |
| PPT | Slide indicators, bullet-heavy, visual flow |
| Code | Programming syntax, functions, classes |
| Guidelines | Study guide, topic list, what to prepare |
| Syllabus | Course schedule, grading policy, exam dates |

If ambiguous → ask: "이건 어떤 종류의 자료인가요?"

## Step 2: OCR (if image)

1. Extract all text — preserve every word, every symbol
2. Verify: does extracted text make sense? Flag broken parts
3. If user also provided text → compare, flag mismatches

## Step 3: File Validation

If content mentions different course code than current → ask user.
Store user's response as directive if relevant.

## Step 4: Format by Type

**Notes**: Preserve every word. Structure with sections.
**Quiz**: Number each question. Separate answer section.
**PPT**: Slide by slide with flow notes (→ continues, → new topic, → builds on).
**Assignment**: Task by task with requirements.
**Code**: Preserve exact indentation, syntax, comments.

## Step 5: Section Planning (Notes + Code Notes)

### 5a. Regular Notes
For notes, create a teaching plan:
1. Identify natural section breaks
2. Determine teaching order (usually follows note order)
3. Per section: key concepts, potential confusion, prerequisites

Present to user:
"이 노트를 [N]개 섹션으로 나눌 수 있어요:
1. [Section 1] — 기본 개념
2. [Section 2] — Section 1 기반
어디서부터 시작할까요?"

### 5b. Code Notes
For code files (uploaded as code type OR placed in `codenotes/`):
1. Scan the week directory — list all subdirectories and `.cpp`/`.h` files
2. Group by topic (subdirectory = topic, e.g. `recursion/`, `sep1/`, `exceptions/`)
3. Determine teaching order based on complexity and dependencies
4. Per topic: key code concepts, what it demonstrates, related note sections
5. Identify `prebaked/` vs student-written — prebaked = professor's reference code

Present to user:
"이 코드노트(week{N})를 [N]개 토픽으로 나눌 수 있어요:
1. [Topic 1] — 기본 예제
2. [Topic 2] — Topic 1 응용
어떤 순서로 볼까요?"

## Step 6: Chapter Assignment

Determine chapter. If unclear → ask.

## Step 7: Save to File

**BASE PATH**: 프로젝트 루트 (= 현재 작업 디렉토리)
Save formatted content to disk based on type:

| Type | Path |
|---|---|
| Notes | `{base}/{course}/{professor}/chapters/chapter_{N}/notes.md` |
| Section Plan (Notes) | `{base}/{course}/{professor}/chapters/chapter_{N}/section_plan.md` |
| Code Notes | `{base}/codenotes/week{W}/{topic}/{file}` (원본 위치 유지) |
| Section Plan (Code) | `{base}/codenotes/week{W}/section_plan.md` |
| Quiz | `{base}/{course}/{professor}/questions/quiz/quiz_{N}.md` |
| Assignment | `{base}/{course}/{professor}/questions/assignments/assignment_{N}.md` |
| Practice Exam | `{base}/{course}/{professor}/questions/practice_exams/{name}.md` |
| PPT | `{base}/{course}/{professor}/ppt/chapter_{N}_ppt.md` |
| Syllabus | `{base}/{course}/{professor}/syllabus.md` |
| Guidelines | `{base}/{course}/{professor}/questions/guidelines_{name}.md` |

- Create parent directories as needed before writing
- If file already exists → ask user: "이미 [path]가 있어요. 덮어쓸까요?"

**PRE-WRITE VERSIONING** (for notes.md and section_plan.md overwrites only):
If overwriting an existing notes.md or section_plan.md (regular or code):
1. Write current to `{same_dir}/.versions/{filename}_{YYYY-MM-DD_HHMMSS}.md`
2. Append to `{base}/{course}/{professor}/analysis/change_log.md`:
```markdown
## {timestamp} — {filename} updated
- **Trigger**: input-processing (file overwrite — user confirmed)
- **Change**: replaced with new upload for chapter {N} / week {W}
- **Backup**: {backup path}
```

- Write the formatted content (word-for-word, no summarization)

## Step 7b: Meta Index Update (FILE WRITE)

After saving the file, update `{base}/{course}/{professor}/meta_index.json`:
1. Read current meta_index.json (create skeleton if missing):
```json
{
  "course": "{course}", "professor": "{professor}", "last_updated": "...",
  "chapters": {}, "questions": {"quiz": [], "assignments": [], "practice_exams": []},
  "ppt": [], "syllabus_path": null,
  "personal": {"error_notes_path": "personal/error_notes.md", "error_count_active": 0, "error_count_temp": 0, "high_star_concepts": [], "last_error_session": null},
  "analysis": {"change_log_path": "analysis/change_log.md", "analysis_done": false}
}
```
2. Update based on file type saved:
   - Notes: set `chapters["chapter_N"].notes_path`, infer `title` from first heading
   - Section Plan (Notes): set `chapters["chapter_N"].section_plan_path`
   - Code Notes: set `codenotes["week_W"].path`, `codenotes["week_W"].topics` = [subdirectory list]
   - Section Plan (Code): set `codenotes["week_W"].section_plan_path`
   - Quiz: append path to `questions.quiz` (if not already present)
   - Assignment: append to `questions.assignments`
   - Practice Exam: append to `questions.practice_exams`
   - PPT: append to `ppt`
   - Syllabus: set `syllabus_path`
3. Set `last_updated` = now (YYYY-MM-DDThh:mm)
4. Write back (overwrite entire file)

No user display needed — silent maintenance.

## Step 7c: Exam Brief 연동 (Quiz/Practice Exam/Assignment 저장 후)

Quiz, Practice Exam, Assignment 타입 저장 + meta_index 업데이트 후:

1. **교수 emphasis 감지**: 저장된 자료에서 교수가 강조한 개념/주제 탐색
   - 반복 출제된 개념 (이전 quiz/exam과 비교)
   - 명시적 강조 ("this will be on the exam", "중요", "반드시")
   - 특정 유형 집중 (코딩 문제만 5개 → recursion emphasis)
2. **감지 시 알림**: `"📌 이 자료에서 교수 emphasis 감지: [concept]. exam_brief.md 업데이트 필요할 수 있어요."`
   - exam_brief.md는 정적 파일 → 자동 수정하지 않음, 사용자에게 알림만
3. **meta_index 반영**: quiz/exam 추가는 Step 7b에서 이미 처리됨
   - Coach가 다음 activation 시 meta_index에서 새 자료 자동 감지

## Step 8: Confirm

- "저장했습니다: [type] → [path]"
- If questions found in notes: "노트 안에 질문 [N]개 따로 정리했어요"
- "바로 공부할까요, 더 올릴 자료 있나요?"
