# StepBoard — SUMMARY

## Files

```
stepboard/
├── bin/
│   ├── stepboard-term   # Terminal server: ttyd + tmux serve the real Claude Code CLI
│   └── stepboard-view   # Page server: serves web/, proxies /term/* same-origin (incl.
│                        #   WS tunnel), POST /send → tmux send-keys
├── web/
│   ├── view.html        # Page structure (left: terminal iframe, right: control panel)
│   ├── style.css        # All looks
│   └── app.js           # All behavior: MODES, QUICK_ACTIONS, keys, step list
├── scripts/
│   └── smoke.sh         # 14-check regression suite (run after any change)
├── docs/
│   └── DESIGN.md        # Full future design (context bar + tickable step board)
├── .ai/
│   └── WORKLOG.md       # Dated work history
├── README.md            # User manual: quick start, keys, customization, troubleshooting
└── SUMMARY.md           # This file
```

## Rules

- Both servers bind 127.0.0.1 only — a web terminal is a full shell.
- Never re-render CLI output; the terminal is always the real CLI, re-hosted.
- No build step; the web/ files are plain and hand-editable.
- After changes, run `scripts/smoke.sh` (14 checks, isolated from the real session).

## Goal

Custom interaction layer for Claude Code (agent-agnostic). End state per
docs/DESIGN.md: always-fresh context bar + editable/tickable step board
replacing plan mode.

## Current state (2026-07-28)

- Working product: webpage = real CLI (left) + owned control panel (right) with
  help-level modes (queued-instruction semantics), input bar, quick actions,
  tickable steps, focus/key scheme. Usage and keys: see README.md.
- Board phases (JSON state, hooks, statusline) not started — see docs/DESIGN.md.
- Change-by-change history: .ai/WORKLOG.md.

## Next potential steps

- P1 from DESIGN.md: `stepboard` CLI + `.ai/stepboard.json` state + hooks.
- Promote the localStorage step list to the DESIGN.md board model.
- Keyboard: native ~/.claude/keybindings.json + tmux keys.conf macros.
- When the repo gets a remote: CI running scripts/smoke.sh.
