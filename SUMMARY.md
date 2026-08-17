# StepBoard (from scratch) — SUMMARY

## Files

```
stepboard/
├── serve.py         # FastAPI: GET /config (pairing), POST /send → tmux, serves web/
├── web/
│   └── index.html   # panel: iframe + composer + history + prompt buttons (+ = add your own)
├── bin/
│   └── claude-s     # launcher — session N: ttyd :768N + uvicorn :800N + browser
├── pyproject.toml   # deps: fastapi, uvicorn (run via uv)
├── IDEAS.md         # Charles's idea notebook — raw dump → pitch → decisions
├── README.md        # quick start, pipeline chart, ports table, customization
└── .ai/WORKLOG.md   # dated work history (ask Charles before reading)
```

## Goal

- Charles learns by building: his own web panel beside the real Claude Code CLI.
- Mentor mode: Claude gives ≤2-line steps; Charles does the work himself and
  Claude only writes code when explicitly asked.

## Current state (2026-08-17)

- Stack: `./bin/claude-s` → ttyd+tmux (`sbN`, :768N) + FastAPI panel (:800N).
- Panel v2: composer (length/format/edits clauses) · input history · templates.
- Prompt buttons: built-ins in `PROMPTS[]` + your own via `+` (sessionStorage,
  per browser tab; `×` removes). Toggling arms a prompt; text appends at send.
- Multi-session: env pair `SB_SESSION`/`SB_TTYD_PORT`; panel asks GET /config.
- All committed on main. Old full StepBoard: git @ 2a92f3f.

## Next potential steps

- Error handling (dead tmux → clear message) · more templates · smoke tests.
- Custom prompts are per-tab only — move to localStorage or the server if they
  should outlive the tab.
