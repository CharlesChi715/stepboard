# StepBoard — SUMMARY

## Files

```
stepboard/
├── bin/
│   ├── stepboard-web   # Launcher: ttyd + tmux serve the real Claude Code CLI to the browser
│   └── stepboard-view  # Tiny Python server: serves web/view.html + POST /send → tmux send-keys
├── web/
│   └── view.html       # The customizable UI (edit freely): terminal iframe + input bar,
│                       #   quick actions, tickable step list
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
- 2026-07-28: **Custom web view shipped** — `stepboard-view` (localhost:4871) proves full
  customizability: our own page (web/view.html) with the terminal iframed plus an input
  bar, quick-action buttons, and a tickable step list, all typing into the real CLI via
  /send → tmux send-keys. Requires stepboard-web running.

## Constraints

- MVP = chat-in-webpage only. Board/statusline/hooks come later, incrementally, from
  docs/DESIGN.md.
- ttyd binds 127.0.0.1 only (web terminal = full shell).

## Next potential steps

- P1 from DESIGN.md: `stepboard` CLI + `.ai/stepboard.json` state + statusline + hooks.
- P2: dashboard page (tick/edit/notes) beside the embedded terminal; input bar via
  `tmux send-keys` bridge.
- Keyboard layers: ~/.claude/keybindings.json (native), tmux keys.conf macros (regenerate).
