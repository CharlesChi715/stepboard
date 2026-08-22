# StepBoard — from scratch

The real Claude Code CLI in a browser tab, with my own panel of prompt-buttons
beside it. Rebuilt step by step as a learning project — every line understood
before the next is added. (The previous full version lives in git @ 2a92f3f.)

## Quick start

```sh
ttyd -W -i lo0 -p 7681 tmux new -A -s sb claude   # 1. the terminal, over a WebSocket
cd ui && npm install && npm run build             # 2. build the panel (first time only)
uv run uvicorn serve:app --port 8000              # 3. panel page + /send bridge
open http://localhost:8000                        # 4. the page
```

Requires `brew install ttyd tmux`, the `claude` CLI, Python 3 + `uv`, and Node.
While editing the UI, `cd ui && npm run dev` serves it on :5173 with hot reload
and proxies `/config` and `/send` through to the FastAPI server.

## How it works

```
you ── type / click ──▶ React panel ── POST /send {"text": ...} ──▶ serve.py
                             │                                         │
                             │                                  tmux send-keys
                             │                                         ▼
        xterm.js ◀── WebSocket "tty" ──▶ ttyd :7681 ◀── tmux "sb" ── claude
```

Two doors into one room. The panel draws the terminal **itself** with xterm.js —
no iframe — so the selection belongs to our page; that is what makes ⌘⇧L
possible. Buttons go through the typing door (`serve.py` → `tmux send-keys`).
The tmux session survives reloads and server restarts: `tmux attach -t sb`.

## Keys

| key | does |
| --- | --- |
| ⌘⇧L | terminal selection → input bar, focused (⌃⇧L works too) |
| ⌘K | jump to the input bar |
| ⌘A | select the input bar's text |
| Enter | send · Shift+Enter = newline |
| ↑ / ↓ | walk the last 5 messages, once the caret hits the edge |

## Files

- `serve.py` — one server, two jobs: GET serves the built panel, POST `/send`
  types into tmux (heavily commented — the HTTP textbook of this project)
- `ui/src/App.jsx` — panel wiring: state, composer, global shortcuts
- `ui/src/hooks/useTtyd.js` — xterm.js + ttyd's wire protocol in ~60 lines
- `ui/src/lib/compose.js` — message + constraints → the text Claude receives
- `web/` — the original vanilla page, kept as reference, served at `/legacy`
- `IDEAS.md` — project notebook: raw ideas → decisions

## Customize

Add a prompt button in `ui/src/components/Prompts.jsx`:

```js
export const PROMPTS = [
  { label: 'pro', text: "What's the pro and professional way to do this?" },
]
```

## Security

Both servers are localhost-only (`-i lo0` / `127.0.0.1`) — a web terminal is a
full shell. Keep it that way; never expose these ports.
