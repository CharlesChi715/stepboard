# StepBoard (from scratch) — SUMMARY

## Files

```
stepboard/
├── serve.py         # one server: GET serves web/, POST /send → tmux send-keys
├── web/
│   └── index.html   # panel page: iframe (ttyd :7681) + prompt buttons
├── IDEAS.md         # Charles's idea notebook — raw dump → pitch → decisions
├── README.md        # quick start, pipeline chart, customization, security
└── .ai/WORKLOG.md   # dated work history (ask Charles before reading)
```

## Goal

- Charles learns by building: his own web panel beside the real Claude Code CLI.
- Mentor mode: Claude gives ≤2-line steps; Charles does the work himself and
  Claude only writes code when explicitly asked.

## Current state (2026-08-15)

- Working minimum: ttyd+tmux CLI in an iframe + buttons → POST /send → tmux.
- Stack: `ttyd -W -i lo0 -p 7681 tmux new -A -s sb claude` + `python3 serve.py`.
- Old full StepBoard: git @ 2a92f3f. Post-wipe work is still UNCOMMITTED.

## Next potential steps

- Charles: run the stack, teach-back the click journey, make the first commit.
- Later: free-text input box · more buttons · error handling · FastAPI translation.
