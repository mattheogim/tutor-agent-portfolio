# TutorAgent

A personalized learning management agent for university exam preparation, built on Claude Code.

Tutors through uploaded notes section by section, generates practice questions, tracks errors with ★ escalation, builds a knowledge graph, runs mock exams — all persisted across sessions.

---

## The Story

This project started on **March 11, 2026** as a single system prompt — one file telling Claude how to tutor me through my CMPT 125 notes.

**Week 1 (Mar 11)**: Built the core in a day. Phase 1 (system prompt + 6 skills + file persistence), Phase 2 (versioning, meta index, temp system, knowledge graph), and Phase 3 (deep error analysis with AI) all landed on day one. The idea was simple: upload my lecture notes, get Socratic tutoring section by section, answer practice questions, and have every mistake tracked to a file so nothing falls through the cracks.

**Week 2 (Mar 12-20)**: The system grew fast. Merged improvements from a parallel experiment (`antigravity` branch), added search scope constraints so Claude wouldn't read every file at once, built thought logs for the tutor to track recurring confusion patterns, and formalized ★ escalation rules for error notes. The agent was becoming genuinely useful for daily study.

**Week 3 (Mar 20-30)**: Added the exam coach skill — a strategic planner that reads error notes, analytics, and analysis results to recommend what to study first. Formalized core principles as `ETHOS.md` (P1-P6: zero data loss, no hallucination, note-based only, etc.). Built a knowledge graph connecting concepts with prerequisite/confused_with edges. Started tracking learning analytics.

**Week 4 (Apr 1-4)**: The big architecture upgrade. Migrated from a standalone system prompt to Claude Code's native features — hooks, agents, settings.json. Built a full TypeScript infrastructure layer: Zod schemas for type safety, state stores (session, meta, graph, memory), 7 hooks for automated backup/logging/boundary checking, a GC agent with 10 health checks, and an eval framework with 30+ behavioral test scenarios. Added Learning Science features inspired by Barbara Oakley's *Learning How to Learn*: chunk compression (students summarize before AI does), overconfidence detection (proxy checks on "I already know this"), and a Mock Exam Mode with cross-chapter interleaving and hard-start ordering. Ran a 5-agent parallel analysis (security, architecture, strategy, code quality, deep scan), fixed every critical issue found, and merged to main.

**Today**: 39 TypeScript source files, 10 skills, 7 agents, 7 hooks, 30+ eval scenarios, 92 passing tests. One student, one CLI, zero data loss.

---

## Getting Started

### Prerequisites
- **Claude Code** (`npm install -g @anthropic-ai/claude-code`) + Claude Pro/Max subscription
- **Bun** (for TypeScript hooks/tests: `curl -fsSL https://bun.sh/install | bash`)

### Setup

```bash
git clone https://github.com/mattheogim/TutorAgent.git
cd TutorAgent
bun install
```

### Run

```bash
claude
```
→ Reads `CLAUDE.md` automatically. Hooks fire on session start, every write, and session end.

### Start Studying

1. Upload your course notes (images, PDFs, or text)
2. Say `start studying` or `give me practice questions`
3. The agent handles the rest — tutoring, questions, error tracking, all persisted to files

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   CLAUDE.md                      │
│            Orchestrator + Core Rules             │
├─────────────┬─────────────┬─────────────────────┤
│   Skills    │   Agents    │       Hooks          │
│  (10 .md)   │  (7 .md)    │   (7 .ts scripts)   │
├─────────────┴─────────────┴─────────────────────┤
│            TypeScript Infrastructure             │
│   schemas · stores · router · GC · eval          │
├─────────────────────────────────────────────────┤
│              Disk Persistence                    │
│  notes · errors · graph · analytics · sessions   │
└─────────────────────────────────────────────────┘
```

### 10 Skills (in `skills/`)

| Skill | Description | Trigger |
|-------|-------------|---------|
| `tutor` | Socratic note tutoring, section by section | "explain this", "what is this" |
| `practice-questions` | Chapter-level questions + error tracking + Mock Exam Mode | "give me questions", "exam simulation" |
| `practice-notes` | Full chapter study flow (tutor → quiz → questions) | "start studying", "study chapter" |
| `analysis` | Reference material analysis for question generation | Has ref materials + wants questions |
| `exam-coach` | Strategic study planning with weakness-first ordering | "make a strategy", "what should I start with" |
| `input-processing` | File upload handling (OCR, type detection) | File upload |
| `note-organization` | Note formatting, section plan creation | After upload |
| `end-session` | Session wrap-up, error analysis, handoff note | "done for today" |
| `dev` | System debugging tools, coverage dashboard, rollback | `/dev status` |
| `eval` | Behavioral test runner for system verification | `/eval run` |

### 7 Agents (in `.claude/agents/`)

| Agent | Model | Purpose |
|-------|-------|---------|
| `error-analyzer` | sonnet | Background error pattern analysis (Root Cause Tracing, A/B/C/D classification) |
| `analysis` | sonnet | Reference material analysis — professor style, question types |
| `note-scanner` | haiku | Fast read-only concept search across notes and knowledge graph |
| `verification-quiz` | sonnet | Adversarial understanding verification after section completion |
| `gc` | sonnet | System health audit — 10 checks (dead refs, schema drift, stale sessions) |
| `gc-fix` | opus | Auto-fix critical/warning issues found by GC |
| `eval-judge` | sonnet | Score eval scenario outputs against rubrics |

### 7 Hooks (in `src/hooks/`)

| Hook | Trigger | What it does |
|------|---------|-------------|
| `session-lifecycle.ts start` | SessionStart | Validate JSON files, check stale sessions, verify memory index |
| `session-lifecycle.ts stop` | Stop | Write session analytics, log summary |
| `on-user-message.ts` | UserPromptSubmit | Log user activity to session timeline |
| `auto-backup.ts` | PostToolUse (Write) | Version managed files before overwrite |
| `boundary-check.ts` | PreToolUse (Read) | Block agents from reading SKILL.md/CLAUDE.md |
| `on-write-failure.ts` | PostToolUseFailure | Log write failures for debugging |
| `activity-log.ts` | CLI utility | Append events to `.session_activity.jsonl` |

### TypeScript Infrastructure (in `src/`)

| Layer | Files | Purpose |
|-------|-------|---------|
| `types/` | 10 Zod schemas | Type-safe validation for session, meta, graph, analytics, errors |
| `state/` | 5 stores | Read/write state (session, meta, graph, memory) with base store pattern |
| `storage/` | 2 modules | Path resolution (canonical `discoverCourses`), file operations |
| `skills/` | 3 modules | Skill router, registry, prerequisite validator |
| `eval/` | 4 modules | Behavioral test runner, fixtures, report generator |
| `agents/` | 1 module | GC agent — 10 system health checks (1,094 lines) |
| `utils/` | 2 modules | Markdown/frontmatter parser, knowledge graph CLI |

---

## Features

### Learning
- **Socratic tutoring** — section by section, strictly note-based (P3), no hallucination (P2)
- **Practice questions** — professor-style via reference material analysis, one at a time
- **Mock Exam Mode** — cross-chapter interleaving + hard-start ordering + signal-based jump-to-easy
- **Error tracking** — immediate file write on every wrong answer, ★ escalation on repeats
- **Chunk compression** — students summarize sections before AI recap (active recall)
- **Overconfidence detection** — proxy checks when student signals "I already know this"
- **Exam coach** — strategic planner: reads errors + analytics → weakness-first recommendations
- **Knowledge graph** — concept nodes + edges (prerequisite, confused_with, connection_tag, builds_on)
- **Code notes integration** — `codenotes/` read alongside regular notes

### Infrastructure
- **Session persistence** — `current_session.json` for machine recovery, `handoff.md` for human context
- **Versioning** — every managed file write creates a `.versions/` backup + change log entry
- **Auto-backup hooks** — PostToolUse hooks automatically version managed files
- **Learning analytics** — append-only JSONL event log per course
- **GC agent** — 10 health checks: dead refs, schema drift, stale sessions, hook health, memory integrity
- **Eval framework** — 30+ behavioral scenarios testing all 6 core principles and 10 skills
- **92 unit tests** — schemas, stores, router, GC, behavioral tests

### AI Analysis
- **Deep analysis** — auto-runs at session end when error count ≥ 2
  - Error Type A/B/C/D classification
  - Root Cause Tracing via prerequisite graph
  - Untested Neighbors prediction
  - Personalized Action Plan

---

## File Structure

```
CLAUDE.md                          ← orchestrator (auto-loaded every turn)
ETHOS.md                           ← core principles P1-P6 (canonical source)
skills/                            ← 10 skill definitions
  tutor/ practice-questions/ practice-notes/ analysis/
  exam-coach/ input-processing/ note-organization/
  end-session/ dev/ eval/
.claude/
  settings.json                    ← hook configuration
  agents/                          ← 7 agent definitions
  sections/                        ← on-demand CLAUDE.md sections
  commands/                        ← slash command definitions
src/
  types/                           ← Zod schemas
  state/                           ← state stores
  storage/                         ← paths, file ops
  hooks/                           ← 7 hook scripts
  skills/                          ← router, registry, validator
  eval/                            ← behavioral test framework
  agents/                          ← GC agent
  utils/                           ← markdown parser, graph CLI
  __tests__/                       ← 92 tests
eval/
  scenarios/                       ← 30+ behavioral test scenarios
  fixtures/                        ← test course data

{course}/{professor}/              ← per-course student data
  chapters/chapter_N/notes.md
  personal/error_notes.md
  knowledge_graph.json
  analytics/learning_events.jsonl
  meta_index.json
```

---

## Dev Commands

| Command | Description |
|---|---|
| `/dev status` | State of all persistent files |
| `/dev coverage` | Per-chapter coverage dashboard |
| `/dev rollback [file]` | List versions → restore with safety backup |
| `/dev meta` | meta_index summary + missing file check |
| `/dev graph` | Knowledge graph stats |
| `/dev analyze` | Deep analysis (manual trigger) |
| `/dev resolve [concept]` | Move error to temp manually |
| `/dev compress` | Compress old session summaries |
| `/dev analytics` | Learning analytics dashboard |
| `/dev timeline` | Current session activity timeline |
| `/eval list` | List eval scenarios |
| `/eval run <name>` | Run eval scenario |

---

## Core Principles

| # | Principle | Rule |
|---|-----------|------|
| P1 | Zero Data Loss | Originals preserved word-for-word, never summarized |
| P2 | No Hallucination | Every factual claim cites source file and section |
| P3 | Note-Based Only | Tutor explains what's in the notes, nothing external |
| P4 | Analysis ≠ Teaching | Reference analysis only affects question generation |
| P5 | Language Policy | English internally, Korean to user, terms preserved |
| P6 | On-Demand | Heavy processes activate only when needed |

---

## Adapting for Other Use Cases

This system is built for CS university courses, but the teaching methodology works for anything. Here's what to change:

| Use Case | What to Change |
|----------|---------------|
| **Non-CS university course** | Nothing. Upload your notes and go. `codenotes/` is optional. |
| **Certification exam** (AWS, CPA, etc.) | In `meta_index.json`: chapters → domains/topics. In SKILL.md rules: remove `codenotes/` references. Practice questions format: add multiple choice support. Directory: `{cert_name}/` instead of `{course}/{professor}/`. |
| **Language learning** | Student Tier T1-T4 maps to CEFR A1-C2. Error tracking: vocabulary + grammar errors instead of concept errors. |
| **Non-Korean users** | In `CLAUDE.md`: change P5 Language Policy to your language. In Response Style: replace the forbidden-expressions list with your language equivalents. |
| **Without Claude Code** (ChatGPT, Gemini, Codex) | Use `AGENTS.md` (included) — contains core teaching rules without Claude-specific features. Paste into system instructions. Hooks won't work, but Socratic method + error tracking + tiers still function via prompt. |

**What never changes**: Socratic method, 3-Strike escalation, Student Tiers, error tracking with ★, Decision Classification (Mechanical/Taste/User Challenge).

---

## Tech Stack

- **Runtime**: [Claude Code](https://claude.com/claude-code) CLI
- **Language**: TypeScript (Bun)
- **Validation**: Zod
- **Testing**: Bun test (92 tests)
- **Dependencies**: 3 packages (zod, @types/bun, typescript) — intentionally minimal
