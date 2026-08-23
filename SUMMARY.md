# StepBoard (from scratch) — SUMMARY

## Files

```
stepboard/
├── serve.py            # FastAPI: GET /config (pairing), POST /send → tmux, serves ui/dist
├── ui/                 # React + Vite panel (npm run dev :5173 · npm run build → ui/dist)
│   └── src/
│       ├── App.jsx     # state, composer, global shortcuts
│       ├── components/ # MessageBar · Constraints · Prompts · History · Badge
│       ├── hooks/      # useTtyd (xterm.js + ttyd protocol) · useHistory (localStorage)
│       └── lib/        # compose.js — message + constraints → text sent to Claude
├── bin/claude-s        # launcher — session N: ttyd :768N + uvicorn :800N + vite :5172+N
├── tests/              # headless checks: harness · parity · regressions · drag-select
├── package.json        # test deps (Playwright) + `npm test`
├── pyproject.toml      # deps: fastapi, uvicorn (run via uv)
├── IDEAS.md            # Charles's idea notebook — raw dump → pitch → decisions
├── README.md           # quick start, pipeline chart, ports table, keys, customization
└── .ai/WORKLOG.md      # dated work history (ask Charles before reading)
```

## Goal

- Charles learns by building: his own web panel beside the real Claude Code CLI.
- Mentor mode: Claude gives ≤2-line steps; Charles does the work himself and
  Claude only writes code when explicitly asked.

## Current state (2026-08-22)

- Stack: `./bin/claude-s` → ttyd+tmux (`sbN`, :768N) + FastAPI (:800N, `--reload`)
  + vite dev server (:5172+N, HMR) — browser opens vite; everything hot-reloads.
- The panel draws the terminal itself with xterm.js (no iframe), so the terminal
  selection is readable — that is what ⌘⇧L needs.
- Selection → input is keyboard-only: the "take terminal selection" button is
  gone, ⌘⇧L remains.
- UI is React + Vite; 31 headless checks pass (22 parity + 5 regression +
  4 drag-select), run via `npm test`, non-zero exit on failure.
- Drag in the terminal selects text even while Claude Code has mouse reporting
  on: mouse events are re-dispatched as alt-carrying clones (force selection).
  Never force shift too — that makes xterm extend a selection instead of
  starting one. Cost: mouse clicks never reach the CLI app itself.
- Multi-session: env pair `SB_SESSION`/`SB_TTYD_PORT`; panel asks GET /config.
- 2026-08-22 tidy-up: `web/` (vanilla page + /legacy route) deleted — history
  has it at `git show 49f09b0:web/index.html`; tests share `tests/harness.mjs`;
  serve.py fails fast when `ui/dist` is missing.

## Next potential steps

- Charles: confirm drag-select + ⌘⇧L in Safari (only Chromium is covered).
- Later: auto-reconnect when ttyd drops · error handling (dead tmux) · more prompts.
