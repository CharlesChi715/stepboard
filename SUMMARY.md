# StepBoard — SUMMARY

## Files

```
stepboard/
├── bin/
│   └── stepboard-web   # Launcher: ttyd + tmux serve the real Claude Code CLI to the browser
├── docs/
│   └── DESIGN.md       # Full design (context bar + tickable step board) — reference, not yet built
├── .ai/
│   └── WORKLOG.md      # Dated work log
├── README.md           # Usage
└── SUMMARY.md          # This file
```

## Goal

Custom interaction layer for Claude Code (agent-agnostic). End state per docs/DESIGN.md:
always-fresh context bar + editable/tickable step board replacing plan mode.

## Current state

- 2026-07-28: **MVP shipped** — `stepboard-web` opens a webpage with the real Claude Code
  CLI in it (ttyd + tmux, localhost:4870). Symlinked into ~/Documents/bin.

## Constraints

- MVP = chat-in-webpage only. Board/statusline/hooks come later, incrementally, from
  docs/DESIGN.md.
- ttyd binds 127.0.0.1 only (web terminal = full shell).

## Next potential steps

- P1 from DESIGN.md: `stepboard` CLI + `.ai/stepboard.json` state + statusline + hooks.
- P2: dashboard page (tick/edit/notes) beside the embedded terminal; input bar via
  `tmux send-keys` bridge.
- Keyboard layers: ~/.claude/keybindings.json (native), tmux keys.conf macros (regenerate).
