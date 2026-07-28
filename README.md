# StepBoard

Talk to Claude Code in a webpage you fully own — the **real** CLI on the left
(nothing re-implemented: spinners, colors, permission prompts are exact by
construction), your own customizable controls on the right.

## Quick start

```sh
STEPBOARD_NO_OPEN=1 stepboard-term ~/my/project &   # 1. terminal server (ttyd + tmux)
stepboard-view                                      # 2. the page → opens localhost:4871
```

Left pane: the live Claude Code CLI (text selects like a normal editor: drag,
double-click a word, triple-click a line). Right panel: help-level modes, your
input bar, quick-action buttons, the pace panel, and a tickable step list —
everything types into the same real session.

## Pace panel

Click "Ask Claude to publish answers here" once, then every substantive answer
also appears in the panel as numbered paragraphs (Claude writes them to a
digest file; no terminal parsing). Each paragraph has **🐢 simpler** (re-explain
one level easier) and **⚡ deeper** (skip ahead, next level) — per-paragraph
pace control for learning.

## Keys

| Key | Where | Does |
|---|---|---|
| `↵` | input bar | send to Claude (queued mode instruction rides along once) |
| `⇧↵` | input bar | newline |
| `⇧Tab` | anywhere outside the CLI pane | cycle help level (Autopilot → Copilot → Advisor → Mentor) |
| `⇧⌘↵` | both panes | toggle focus: CLI pane ⇄ input bar |

Focus has two states: the CLI pane, or everything else — clicking anywhere
outside the terminal puts the cursor back in the input bar.

## Help levels

Selecting a mode queues its instruction (shown above the input bar) to be sent
with your next message — once per mode; switching back to an already-sent mode
queues nothing. Re-click the active mode to force a resend, **✎ edit** to
change the wording (saved per mode, re-queued on save).

## Customize

The UI is three plain files, no build step — edit and reload:

- `web/app.js` — behavior: `MODES` (names + instructions), `QUICK_ACTIONS`
  (label → text typed into Claude), keys, step list.
- `web/style.css` — all looks.
- `web/view.html` — layout/structure.

Config via env: `STEPBOARD_PORT` (terminal, 4870) · `STEPBOARD_VIEW_PORT`
(page, 4871) · `STEPBOARD_SESSION` (tmux name) · `STEPBOARD_AGENT`
(e.g. `codex`) · `STEPBOARD_NO_OPEN` / `--no-open` (don't open a browser tab).

## How it works

browser → `stepboard-view` (serves the page; proxies `/term/*` same-origin,
including a raw WebSocket tunnel; `POST /send` → `tmux send-keys`) →
`stepboard-term` (ttyd) → tmux → `claude`. The tmux session survives everything:
close tabs, kill servers, reattach anytime (`tmux attach -t stepboard`).

## Troubleshoot

- Terminal shows "reconnecting" → is `stepboard-term` running? (`scripts/smoke.sh` tells you in 10s.)
- A change to the web files doesn't show → reload; the server sends no-store, so a plain reload is enough.
- Everything: run `./scripts/smoke.sh` — 14 checks, isolated from your real session.

## Requirements & security

`brew install ttyd tmux`, plus the `claude` CLI. Both servers bind
127.0.0.1 **only** — a web terminal is a full shell; never expose these ports.

## Roadmap

This is the interactive-view stage of a larger design (always-fresh context
bar + a tickable step board that replaces plan mode) — see `docs/DESIGN.md`.
