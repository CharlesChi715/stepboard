# StepBoard — from scratch

The real Claude Code CLI in a browser tab, with my own panel of prompt-buttons
beside it. Rebuilt step by step as a learning project — every line understood
before the next is added. (The previous full version lives in git @ 2a92f3f.)

## Quick start

```sh
cd ui && npm install && cd .. && uv sync      # first time only
claude-stepboard                              # start a board: terminal + panel + Safari
claude-stepboard start --dev                  # the same, plus hot reload
                                              # run again → session 2, 3, … own ports each
claude-stepboard list                         # what is running (--json for scripts; alias ls)
claude-stepboard stop [N...] [-a|--all]
                                              # close boards: servers, Safari tab, tmux viewer
claude-stepboard help [command] · --version   # help · `claude-stepboard man` = full manual
```

claude runs as a **background session in the Claude daemon** (`claude --bg`),
one per board slot, named "StepBoard N"; its id lives in
`~/.local/state/stepboard/claude-N.id`. The board only views it — tmux `sbN` runs
`claude attach <id>` — so closing the board (the tab, Ctrl-C in the launcher,
`stop`, or ⌃⇧Q in the panel) never stops claude, and the next launch of that slot
re-attaches to the same session, draft included. StepBoard never stops claude;
to stop one yourself, `claude stop <id>` (the chat is kept; `claude attach <id>` reopens it).

Closing is scoped to what the launcher recorded in `$TMPDIR/stepboard-N.run`
(its own PID and its children's PIDs), the exact tmux session `sbN` and the slot's
own claude id — never a name pattern, never the tmux server, never another claude.
A bare `stop` only acts when exactly one board is running. When a slot is
already taken, the launcher asks `[Y/n]` — Enter means yes; `-y` answers up front,
and without a terminal (or with `--no-input`) it never asks. `list` also shows
leftovers (an API server still holding :800N with no board); `stop N` removes them.
The interface follows clig.dev and the POSIX/GNU option rules: `-h/--help` and
`--version` everywhere, long names for every flag, exit 0 ok · 1 failed · 2 usage. The first ⌃⇧Q close asks
whether your terminal may control Safari — that is the tab-closing step.

(`claude-stepboard` is a symlink in `~/.local/bin` → `bin/claude-stepboard`.)

Two modes:

```
use  (default)  uvicorn serves the built ui/dist on :800N — no Node, no reloader, ~80 MB
                claude-stepboard rebuilds ui/dist first if anything in ui/ is newer than it
dev             Vite on :5172+N (HMR) + uvicorn --reload (watchfiles) on :800N, ~480 MB
                edit ui/src → the tab patches itself; edit serve.py → uvicorn restarts
```

Manual equivalent for session 1 (use mode):

```sh
tmux new -d -s sb1 -c ~ claude
ttyd -W -i "$TMPDIR/stepboard-1.sock" -s KILL tmux new -A -s sb1 -c ~ claude
SB_SESSION=sb1 SB_TTYD_SOCK="$TMPDIR/stepboard-1.sock" uv run uvicorn serve:app --port 8001
```

Requires `brew install ttyd tmux`, the `claude` CLI, `uv` (pulls FastAPI,
uvicorn, websockets, watchfiles), and Node.

## How it works

```
you ── type + constraints ──▶ React panel ── POST /api/send {"text": …} ──▶ serve.py ── tmux send-keys ──┐
                                   │                                          (FastAPI)                   │
        xterm.js ◀── WebSocket /api/ws ──▶ serve.py ◀── unix socket ──▶ ttyd ◀── tmux "sbN" ── claude ◀──┘
```

Two doors into one room. The panel draws the terminal **itself** with xterm.js —
no iframe — so the selection belongs to our page; that is what makes ⌘⇧L
possible. The composer goes through the typing door (`serve.py` → `tmux
send-keys`). The tmux session survives reloads and restarts: `tmux attach -t sb1`.
Claude starts in `~` (`-c ~`), not the repo — only the servers need the repo
root. `-A` re-attaches a surviving session, which keeps the folder it started in.

Everything the page talks to lives under **`/api`** — `/api/config`, `/api/send`,
`/api/prompts` and the terminal socket `/api/ws` — so dev mode needs exactly one
Vite proxy entry, and the page never learns a ttyd port.

Each `claude-stepboard` run adds an independent session — its own tmux, ttyd, and panel:

| session | tmux | ttyd (unix socket)          | panel + API (uvicorn) | dev panel (vite) |
|--------:|------|-----------------------------|-----------------------|------------------|
|       1 | sb1  | `$TMPDIR/stepboard-1.sock`  | 8001                  | 5173             |
|       2 | sb2  | `$TMPDIR/stepboard-2.sock`  | 8002                  | 5174             |
|       N | sbN  | `$TMPDIR/stepboard-N.sock`  | 8000+N                | 5172+N           |

The terminal reconnects by itself when the socket drops (backoff 100 ms → 5 s).
When claude exits, press ⏎ in the terminal (or click the pill) to start it again.

## Keys

| key | does |
| --- | --- |
| ⌘⇧L | terminal selection → input bar, focused (⌃⇧L works too) |
| ⌘J | jump to the CLI — J and K sit in screen order, left pane then panel |
| ⌘K | jump to the input bar |
| ⌘A | select the input bar's text |
| ⌥1 … ⌥9 | arm / disarm prompt N (hover a chip to see its number) |
| ⌃⇧Q | close this StepBoard, claude keeps running — asks first: ⏎ close · esc cancel |
| Enter | send · Shift+Enter = newline (in the terminal too) |
| ↑ / ↓ | walk the last 5 messages, once the caret hits the edge |

`/commands` and `!shell` lines are sent exactly as typed; the line under the
composer shows whatever else will be appended. `?keys` in the URL turns on a
key-report diagnostic in the status line. The SHORTCUTS card at the bottom of
the panel lists all of this (click its title to fold it), and its "what's new" link lists
the latest changes.

## Files

- `serve.py` — FastAPI app: `/api/send` types into tmux, `/api/prompts` is the
  prompts store, `/api/ws` proxies the terminal to ttyd's socket, and `/` serves
  the built panel
- `ui/src/App.jsx` — panel wiring: state, composer, global shortcuts
- `ui/src/hooks/useTtyd.js` — xterm.js + ttyd's wire protocol + the reconnect policy
- `ui/src/lib/compose.js` — message + constraints → the text Claude receives
- `ui/src/lib/news.js` — the "what's new" popup's content; bump `NEWS_ID` to show it again
- `man/claude-stepboard.1` — the manual (mdoc); `claude-stepboard man` opens it
- `bin/claude-stepboard` — launcher: finds free slot N, starts ttyd + uvicorn (+ vite in dev), opens panel
- `tests/` — headless browser checks, `npm test` (see `tests/README.md`)
- `pyproject.toml` + `uv.lock` — Python deps (FastAPI, uvicorn, websockets, watchfiles) for `uv run`
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
curl localhost:8001/api/prompts             # read the store
curl -X DELETE localhost:8001/api/prompts   # reset to the BUILTIN seed
```

It used to live in browser `localStorage`, which is scoped per ORIGIN — so
`localhost:5173`, `localhost:5174` and `localhost:8001` each kept a private,
invisible copy, and clearing site data lost the lot. One file fixes all three.
Two panels open at once is now the normal case, so a write carries the revision
it read: if the other session got there first the panel says so and reloads
rather than silently overwriting. The other tab catches up when you return to
it (it re-reads the store on focus) — there is no live push.

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
- In the form, **◀ ▶** move the prompt one place; the order is saved.
- **restore N** only appears when one of the shipped prompts is missing, and
  puts back exactly the missing ones. It leaves an edited prompt alone — delete
  it first if you want the original text back.

A mode rather than a ✎/× per chip is deliberate: the panel is at least 15rem wide, so
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

A web terminal is a full shell, so:

- ttyd listens on a **unix socket** in your private `$TMPDIR` — no TCP port, so no
  web page can open a WebSocket to it.
- The page reaches the terminal only through `/api/ws`, which refuses any
  `Origin` that is not localhost (cross-site WebSocket hijacking).
- uvicorn stays on `127.0.0.1`, and `TrustedHostMiddleware` refuses any `Host`
  but `localhost` / `127.0.0.1` (DNS rebinding); non-GET requests from a foreign
  `Origin` get 403.
- `tests/security.mjs` checks all of it. Never expose the 800N ports.
