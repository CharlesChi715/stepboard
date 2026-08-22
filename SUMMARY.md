# StepBoard (from scratch) — SUMMARY

## Files

```
stepboard/
├── serve.py            # FastAPI: GET serves ui/dist (falls back to web/), POST /send → tmux
├── ui/                 # React + Vite panel (npm run dev :5173 · npm run build → ui/dist)
│   └── src/
│       ├── App.jsx     # state, composer, global shortcuts
│       ├── components/ # MessageBar · Constraints · Prompts · History · Badge
│       ├── hooks/      # useTtyd (xterm.js + ttyd protocol) · useHistory (localStorage)
│       └── lib/        # compose.js — message + constraints → text sent to Claude
├── web/                # the original vanilla page, kept as reference, served at /legacy
├── IDEAS.md            # Charles's idea notebook — raw dump → pitch → decisions
├── README.md           # quick start, pipeline chart, keys, customization, security
└── .ai/WORKLOG.md      # dated work history (ask Charles before reading)
```

## Goal

- Charles learns by building: his own web panel beside the real Claude Code CLI.
- Mentor mode: Claude gives ≤2-line steps; Charles does the work himself and
  Claude only writes code when explicitly asked.

## Current state (2026-08-22)

- The panel draws the terminal itself with xterm.js (no iframe), so the terminal
  selection is readable — that is what ⌘⇧L needs.
- UI is React + Vite (branch `react-ui`); 23/23 headless parity tests pass.
- ⌘⇧L works in headless Chromium; **unconfirmed in Charles's Safari** — an
  on-screen badge reports selection length, the key that arrived, and the match.
- Stack: `ttyd -W -i lo0 -p 7681 tmux new -A -s sb claude` + `uv run uvicorn serve:app`.

## Next potential steps

- Charles: confirm ⌘⇧L in Safari via the badge; if the key never arrives, rebind.
- Later: auto-reconnect when ttyd drops · more prompt buttons · merge to main.
