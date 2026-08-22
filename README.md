# StepBoard — from scratch

The real Claude Code CLI in a browser tab, with my own panel of prompt-buttons
beside it. Rebuilt step by step as a learning project — every line understood
before the next is added. (The previous full version lives in git @ 2a92f3f.)

## Quick start

```sh
cd ui && npm install && npm run build   # build the panel (first time only)
./bin/claude-s                          # terminal + panel + browser tab, one command
                                        # run again → session 2, 3, … own ports each
```

Manual equivalent for session 1:

```sh
ttyd -W -i lo0 -p 7681 tmux new -A -s sb1 claude
SB_SESSION=sb1 SB_TTYD_PORT=7681 uv run uvicorn serve:app --port 8001
```

Requires `brew install ttyd tmux`, the `claude` CLI, `uv` (pulls FastAPI +
uvicorn), and Node. While editing the UI, `cd ui && SB_PORT=8001 npm run dev`
serves it on :5173 with hot reload and proxies `/config` + `/send` through.

## How it works

```
you ── type + constraints ──▶ React panel ── POST /send {"text": …} ──▶ serve.py
                                  │                                     (FastAPI)
                     GET /config  │  {ttyd_port, session} — pairs the pane    │
                                  ▼                                  tmux send-keys
        xterm.js ◀── WebSocket "tty" ──▶ ttyd :768N ◀── tmux "sbN" ── claude
```

Two doors into one room. The panel draws the terminal **itself** with xterm.js —
no iframe — so the selection belongs to our page; that is what makes ⌘⇧L
possible. The composer goes through the typing door (`serve.py` → `tmux
send-keys`). The tmux session survives reloads and restarts: `tmux attach -t sb1`.

Each `claude-s` run adds an independent session — its own tmux, ttyd, and panel:

| session | tmux | ttyd (view) | panel (typing) |
|--------:|------|-------------|----------------|
|       1 | sb1  | 7681        | 8001           |
|       2 | sb2  | 7682        | 8002           |
|       N | sbN  | 7680+N      | 8000+N         |

## Keys

| key | does |
| --- | --- |
| ⌘⇧L | terminal selection → input bar, focused (⌃⇧L works too) |
| ⌘K | jump to the input bar |
| ⌘A | select the input bar's text |
| Enter | send · Shift+Enter = newline |
| ↑ / ↓ | walk the last 5 messages, once the caret hits the edge |

## Files

- `serve.py` — FastAPI app, three jobs: `GET /config` says which ttyd/tmux pair,
  `POST /send` types into tmux, and `/` serves the built panel (heavily
  commented — it doubles as the HTTP textbook of this project)
- `ui/src/App.jsx` — panel wiring: state, composer, global shortcuts
- `ui/src/hooks/useTtyd.js` — xterm.js + ttyd's wire protocol in ~60 lines
- `ui/src/lib/compose.js` — message + constraints → the text Claude receives
- `bin/claude-s` — launcher: finds free slot N, starts ttyd + uvicorn, opens panel
- `tests/` — headless browser checks (see `tests/README.md`)
- `web/` — the original vanilla page, kept as reference, served at `/legacy`
- `pyproject.toml` + `uv.lock` — Python deps (FastAPI, uvicorn) for `uv run`
- `IDEAS.md` — project notebook: raw ideas → decisions

## Customize

Add a prompt button in `ui/src/components/Prompts.jsx`:

```js
export const PROMPTS = [
  { label: 'pro',   text: "What's the pro and professional way to do this?" },
  { label: 'yours', text: 'your canned prompt here' },          // ← add like this
]
```

Click a button to *arm* it (turns blue); armed texts ride along with the next
send. Rebuild with `npm run build`.

## Security

Every server here is localhost-only (`-i lo0` / uvicorn's `127.0.0.1` default) —
a web terminal is a full shell. Keep it that way; never expose the 768N/800N ports.
