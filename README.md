# StepBoard — from scratch

The real Claude Code CLI in a browser tab, with my own panel of prompt-buttons
beside it. Rebuilt step by step as a learning project — every line understood
before the next is added. (The previous full version lives in git @ 2a92f3f.)

## Quick start

```sh
ttyd -W -i lo0 -p 7681 tmux new -A -s sb claude   # 1. the terminal, in a browser
python3 serve.py                                  # 2. panel page + /send bridge
open http://localhost:8000                        # 3. the page
```

Requires `brew install ttyd tmux`, the `claude` CLI, and Python 3 (stdlib only).

## How it works

```
you ── click button ──▶ web/index.html ── POST /send {"text": ...} ──▶ serve.py
                                                                          │
                                                                 tmux send-keys
                                                                          ▼
         browser iframe ◀── ttyd :7681 ◀──────── tmux session "sb" ── claude
              (the view door)                     (the typing door lands here)
```

Two doors into one room: the iframe is the *view* door (ttyd streams the real
terminal over a WebSocket); buttons go through the *typing* door
(`serve.py` → `tmux send-keys`). The tmux session survives page refreshes and
server restarts — reattach from any terminal with `tmux attach -t sb`.

## Files

- `serve.py` — one server, two jobs: GET serves `web/`, POST `/send` types into tmux
  (heavily commented — it doubles as the HTTP textbook of this project)
- `web/index.html` — full-height iframe + button panel + one `fetch()` call
- `IDEAS.md` — project notebook: raw ideas → decisions

## Customize

Add a button in `web/index.html`:

```html
<button onclick="send('your canned prompt here')">label</button>
```

## Security

Both servers are localhost-only (`-i lo0` / `127.0.0.1`) — a web terminal is a
full shell. Keep it that way; never expose these ports.
