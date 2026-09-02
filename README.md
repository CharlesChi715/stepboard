# StepBoard — from scratch

The real Claude Code CLI in a browser tab, with my own panel of prompt-buttons
beside it. Rebuilt step by step as a learning project — every line understood
before the next is added. (The previous full version lives in git @ 2a92f3f.)

## Quick start

```sh
cd ui && npm install && npm run build   # panel deps + a dist for serve.py (first time only)
./bin/claude-s                          # terminal + panel + browser tab, one command
                                        # run again → session 2, 3, … own ports each
```

The launcher opens the Vite dev server (:5173), so **everything hot-reloads**:
edit `ui/src` → the open tab patches itself (HMR); edit `serve.py` → uvicorn
restarts itself (`--reload`). No rebuild while developing — `npm run build` only
matters when you want `:800N` (the dist copy uvicorn serves) refreshed.

Manual equivalent for session 1:

```sh
ttyd -W -i lo0 -p 7681 tmux new -A -s sb1 claude
SB_SESSION=sb1 SB_TTYD_PORT=7681 uv run uvicorn serve:app --port 8001 --reload
cd ui && SB_PORT=8001 npm run dev       # :5173, HMR, proxies /config + /send
```

Requires `brew install ttyd tmux`, the `claude` CLI, `uv` (pulls FastAPI +
uvicorn), and Node.

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

| session | tmux | ttyd (view) | API + dist (uvicorn) | dev panel (vite) |
|--------:|------|-------------|----------------------|------------------|
|       1 | sb1  | 7681        | 8001                 | 5173             |
|       2 | sb2  | 7682        | 8002                 | 5174             |
|       N | sbN  | 7680+N      | 8000+N               | 5172+N           |

The browser opens the vite column; the uvicorn column is the API behind it
(and still serves the last-built `dist` if you ever want the no-Node panel).

## Keys

| key | does |
| --- | --- |
| ⌘⇧L | terminal selection → input bar, focused (⌃⇧L works too) |
| ⌘J | jump to the CLI — J and K sit in screen order, left pane then panel |
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
- `tests/` — headless browser checks, `npm test` (see `tests/README.md`)
- `pyproject.toml` + `uv.lock` — Python deps (FastAPI, uvicorn) for `uv run`
- `package.json` — test deps (Playwright); the panel's own deps live in `ui/`
- `IDEAS.md` — project notebook: raw ideas → decisions

The original vanilla-JS page this replaced lives in git history:
`git show 49f09b0:web/index.html`.

## Customize

Every prompt is the same kind of thing — the ones that ship are seeds, not
fixtures, so they edit and delete exactly like the ones you make. No rebuild.

They are stored in **`prompts.json`**, next to `serve.py`:

```
prompts.json          one file, shared by EVERY session and port
  ├── rev             bumped per write; a stale PUT is refused, not applied
  └── doc
      ├── list        every prompt, in row order
      └── seeded      which seed labels this install has been handed
```

That file is the answer to "where do my prompts actually go". It is plain JSON,
safe to read, edit or back up by hand — the panel picks up changes on reload.
`SB_PROMPTS=/some/other.json` moves it. It is gitignored, so it never lands in
a commit.

```sh
curl localhost:8001/prompts             # read the store
curl -X DELETE localhost:8001/prompts   # reset to the BUILTIN seed
```

It used to live in browser `localStorage`, which is scoped per ORIGIN — so
`localhost:5173`, `localhost:5174` and `localhost:8001` each kept a private,
invisible copy, and clearing site data lost the lot. One file fixes all three.
Two panels open at once is now the normal case, so a write carries the revision
it read: if the other session got there first the panel says so and reloads
rather than silently overwriting. Reloading the other tab is how it catches up —
there is no live push.

Your input **history** is still per-browser localStorage. It is scratch.

The PROMPTS card is two levels. The controls sit in their own row above the
chips, quieter and smaller, so a control is never mistaken for a prompt:

```
PROMPTS
  + new   edit   restore 2       ← controls (small, muted)
  [pro] [socratic] [tdd]         ← the prompts themselves
```

- **+ new** opens a label + text form.
- **edit** flips the chips into targets (dashed green); pressing one opens it
  in that same form with **save**, **cancel** and **delete**. Delete takes two
  presses — the second reads `sure?`. `Esc` backs out of the confirm, then the
  form, then the mode; **done** leaves it too.
- **restore N** only appears when one of the shipped prompts is missing, and
  puts back exactly the missing ones. It leaves an edited prompt alone — delete
  it first if you want the original text back.

A mode rather than a ✎/× per chip is deliberate: the panel is 15rem wide, so
icons inside a chip would shrink the arm target and put "delete" one slip away
from "arm".

To change what a *fresh* browser starts with, edit `BUILTIN` in
`ui/src/hooks/usePrompts.js`:

```js
export const BUILTIN = [
  { label: 'pro',   text: "What's the pro and professional way to do this?" },
  { label: 'yours', text: 'your canned prompt here' },          // ← add like this
]
```

Adding one here still reaches an install that has already been seeded: the
store remembers which seed labels it has been handed, so a genuinely new one
arrives once, while one you deleted stays deleted. Rebuild with `npm run build`.

Click a button to *arm* it (turns blue); armed texts ride along with the next
send.

## Security

Every server here is localhost-only (`-i lo0` / uvicorn's `127.0.0.1` default) —
a web terminal is a full shell. Keep it that way; never expose the 768N/800N ports.
