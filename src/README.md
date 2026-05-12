# src/ — TypeScript Infrastructure

Runtime layer for hooks, stores, eval, and agents. All code runs via `bun`.

```
src/
├── hooks/       # Claude Code hook handlers (session, boundary, backup, logging)
├── storage/     # File I/O utilities + path resolution
├── state/       # JSON-backed stores (meta, graph, session, memory)
├── skills/      # Skill router + validator
├── agents/      # Agent scripts (gc.ts)
├── eval/        # Eval runner, fixtures, behavioral checks
├── types/       # Shared TypeScript types
├── utils/       # Markdown parser, graph CLI
└── __tests__/   # bun:test suite (97 tests)
```
