# StepBoard — from scratch

The real Claude Code CLI in a browser tab, with my own panel of prompt-buttons
beside it. Rebuilt step by step as a learning project — every line understood
before the next is added. (The previous full version lives in git @ 2a92f3f.)

## Quick start

```sh
./bin/claude-s   # the launcher: terminal + panel + browser tab, one command
                 # run it again → offers session 2, 3, … each with its own ports
# manual equivalent for session 1:
ttyd -W -i lo0 -p 7681 tmux new -A -s sb1 claude
SB_SESSION=sb1 SB_TTYD_PORT=7681 uv run uvicorn serve:app --port 8001
```

Requires `brew install ttyd tmux`, the `claude` CLI, and `uv` (pulls FastAPI + uvicorn).

## How it works

```
you ── type + constraints ──▶ web/index.html ── POST /send {"text": …} ──▶ serve.py
                                  │                                        (FastAPI)
                     GET /config  │  {ttyd_port, session} — pairs the pane     │
                                  ▼                                   tmux send-keys
         browser iframe ◀── ttyd :768N ◀──────── tmux session "sbN" ── claude
              (the view door)                     (the typing door lands here)
```

Two doors into one room: the iframe is the *view* door (ttyd streams the real
terminal over a WebSocket); the composer goes through the *typing* door
(`serve.py` → `tmux send-keys`). The tmux session survives page refreshes and
server restarts — reattach from any terminal with `tmux attach -t sb1`.

Each `claude-s` run adds an independent session — its own tmux, ttyd, and panel:

| session | tmux | ttyd (view) | panel (typing) |
|--------:|------|-------------|----------------|
|       1 | sb1  | 7681        | 8001           |
|       2 | sb2  | 7682        | 8002           |
|       N | sbN  | 7680+N      | 8000+N         |

## Files

- `serve.py` — FastAPI app, three jobs: `GET /config` says which ttyd/tmux pair,
  `POST /send` types into tmux, and `/` serves `web/` (heavily commented — it
  doubles as the HTTP textbook of this project)
- `web/index.html` — iframe + prompt composer (length / format / edits clauses),
  input history (↑/↓, localStorage), toggleable template buttons
- `bin/claude-s` — launcher: finds free slot N, starts ttyd + uvicorn, opens panel
- `pyproject.toml` + `uv.lock` — Python deps (FastAPI, uvicorn) for `uv run`
- `IDEAS.md` — project notebook: raw ideas → decisions

## Customize

Add a template button in `web/index.html` — one line in the `PROMPTS` array:

```js
const PROMPTS = [
  {label: "pro",   text: "What's the pro and professional way to do this?"},
  {label: "yours", text: "your canned prompt here"},          // ← add like this
]
```

Click a button to *arm* it (turns blue); armed texts ride along with the next send.

## Security

Every server here is localhost-only (`-i lo0` / uvicorn's `127.0.0.1` default) —
a web terminal is a full shell. Keep it that way; never expose the 768N/800N ports.
