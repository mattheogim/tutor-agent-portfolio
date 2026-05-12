---
name: note-organization
description: "노트 포맷팅, 섹션 플랜 생성, 지식 그래프 구축"
when_to_use: "노트 업로드 후 정리가 필요하거나, '노트 다시 정리해줘'라고 말할 때"
effort: medium
sections:
  - data-storage
  - schemas
tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - "Bash(mkdir *)"
permissions:
  allow:
    - "Write(**/chapters/**/section_plan.md)"
    - "Write(**/codenotes/**/section_plan.md)"
    - "Write(**/knowledge_graph.json)"
    - "Write(**/meta_index.json)"
  deny:
    - "Write(**/chapters/**/notes.md)"
    - "Read(**/SKILL.md)"
---

> **Shared Rules** → `CLAUDE.md` (P1-P6, Always-On Rules, Completion Status)

# Note Organization Skill

## When to Activate
- After input processing saves a note
- User says "노트 다시 정리해줘"
- PPT needs flow analysis

## Rule 1: Word-for-Word Preservation

EVERY word must be preserved. You are formatting, NOT summarizing.
- Do NOT rephrase
- Do NOT skip "obvious" parts
- Do NOT combine sentences
- Preserve original English exactly

## Rule 2: Question Extraction

If note contains questions (practice problems, review questions):
- Extract to separate section: "Questions found in Chapter [N] Notes"
- Keep questions word-for-word
- Note location: "From Section 2, after pointer explanation"
- Some notes have NO questions — that's fine

## Rule 3: PPT Flow Analysis

For PPT materials:
- Record slide by slide, every word
- Add flow notation: → continues, → new topic, → builds on slide [N], → example of concept
- If flow unclear, record everything as-is

## Rule 4: Section Plan + FILE WRITE

### 4a. Regular Notes Section Plan

Per section note: key concepts, potential confusion points, prerequisites, suggested teaching approach.

**PRE-WRITE VERSIONING** (if section_plan.md already exists):
1. Write current to `chapters/chapter_{N}/.versions/section_plan_{YYYY-MM-DD_HHMMSS}.md`
2. Append to `{base}/{course}/{professor}/analysis/change_log.md`:
```markdown
## {timestamp} — section_plan.md updated
- **Trigger**: note-organization (section plan regenerated for chapter {N})
- **Change**: section plan updated
- **Backup**: {backup path}
```

**FILE WRITE**: Save section plan to `{base}/{course}/{professor}/chapters/chapter_{N}/section_plan.md`

Format:
```markdown
# Section Plan — Chapter {N}: {title}

## Teaching Order:
1. Section {N}.1: {name} — {why first}
2. Section {N}.2: {name} — builds on {N}.1
...

## Per-Section Notes:
### Section {N}.1
- Key concepts: [list]
- Estimated difficulty: Easy / Medium / Hard
- Potential confusion points: [list]
- Prerequisites: [chapters/sections needed]
- Teaching approach: [e.g. "use code example, compare with Java"]
```

If section_plan.md already exists → ask user: "기존 플랜이 있어요. 덮어쓸까요?"

### 4b-code. Code Notes Section Plan

Code notes도 week/chapter별로 section_plan 생성.

**PRE-WRITE VERSIONING** (if section_plan.md already exists):
1. Write current to `codenotes/week{W}/.versions/section_plan_{YYYY-MM-DD_HHMMSS}.md`
2. Append to `{base}/{course}/{professor}/analysis/change_log.md` (동일 형식)

**FILE WRITE**: Save to `{base}/codenotes/week{W}/section_plan.md`

Format:
```markdown
# Code Notes Section Plan — Week {W}

## Chapter Mapping: Chapter {N} ({chapter_title})

## Topics (Teaching Order):
1. {topic_dir}/ — {what it demonstrates} — {why first}
2. {topic_dir}/ — builds on topic 1
...

## Per-Topic Notes:
### {topic_dir}/
- Files: [{file1.cpp}, {file2.h}, ...]
- Key code concepts: [what this code teaches]
- Related note section: Chapter {N}, Section {N.X}
- Prebaked version: {prebaked/{topic_dir}/ 있으면 경로, 없으면 "없음"}
- Estimated difficulty: Easy / Medium / Hard
- What to focus on: [e.g. "line 15-30 핵심 로직", "makefile 구조 설명"]
- Potential confusion: [e.g. "포인터 vs 레퍼런스 혼동 가능"]
```

**Chapter Mapping 규칙**:
- week ↔ chapter 매핑이 명확하면 기록 (예: week8 = Chapter 8)
- 불명확하면 사용자에게 질문: "Week {W}는 어떤 챕터에 해당해요?"
- 매핑 결과를 meta_index.json의 `codenotes["week_W"].chapter_mapping`에 저장

If section_plan.md already exists → ask user: "기존 플랜이 있어요. 덮어쓸까요?"

## Rule 5: Meta Index Update (FILE WRITE)

After any section_plan.md is written (regular or code), update `{base}/{course}/{professor}/meta_index.json`:

**Regular notes section_plan**:
1. Read current meta_index.json (create skeleton if missing)
2. Parse section_plan.md to extract section IDs (e.g., "3.1", "3.2", "3.3" from headings)
3. Set `chapters["chapter_N"].sections` = [list of section IDs]
4. Set `chapters["chapter_N"].section_plan_path` = relative path
5. Set `last_updated` = now
6. Write back (overwrite)

**Code notes section_plan**:
1. Read current meta_index.json
2. Parse code section_plan.md to extract topic list
3. Set `codenotes["week_W"].section_plan_path` = relative path
4. Set `codenotes["week_W"].topics` = [list of topic directories]
5. Set `codenotes["week_W"].chapter_mapping` = "chapter_N" (if known)
6. Set `last_updated` = now
7. Write back (overwrite)

## Rule 6: Knowledge Graph Build (FILE WRITE)

After section_plan.md is written, update `{base}/{course}/{professor}/knowledge_graph.json`:
1. Read current knowledge_graph.json (create skeleton if missing):
```json
{"nodes": {}, "edges": [], "last_updated": "..."}
```
2. For each section in the plan:
   a. Extract "Key concepts" list → create/update nodes
   b. Extract "Prerequisites" → add `prerequisite` edges (prereq concepts → current section concepts)
   c. Extract "Potential confusion points" → add `confused_with` edges between listed pairs
   d. Use section order in Teaching Order → add `builds_on` edges (earlier section → later section)
3. Node format for new concepts:
```json
{
  "label": "[original concept name]",
  "source": "chapter_{N}/section_{N.X}",
  "chapter": N, "section": "N.X",
  "difficulty": "[from section plan difficulty]",
  "error_count": 0, "star_level": 0
}
```
4. Node ID normalization: lowercase, spaces→`_`, strip punctuation
5. Merge with existing nodes (don't reset error_count or star_level for existing nodes)
6. Set `last_updated` = now
7. Write back (overwrite)
