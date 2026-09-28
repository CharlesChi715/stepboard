# StepBoard (from scratch) — SUMMARY

## Goal

- Charles learns by building: his own web panel beside the real Claude Code CLI.
- Mentor mode by default: ≤2-line steps, Charles writes the code; Claude writes it only when asked.

## Files

```
stepboard/
├── serve.py            # FastAPI under /api: config · send (tmux) · prompts (prompts.json)
│                       #   · ws (proxy → ttyd unix socket); serves ui/dist at /
├── ui/                 # React 19 + Vite 8 + Tailwind v4 (npm run dev · build → ui/dist · lint)
│   └── src/
│       ├── App.jsx     # state, composer, global keys (useEffectEvent), layout
│       ├── styles.css  # Tailwind import + @theme palette, --width-panel
│       ├── components/ # MessageBar · Constraints · Prompts · History · Badge · LinkPill · WhatsNew · Shortcuts
│       ├── hooks/      # useTtyd (xterm + ttyd protocol + reconnect) · useHistory · usePrompts
│       └── lib/        # compose.js (raw/tail/send) · ui.js (class strings, FOCUS) · news.js · keys.js
├── bin/claude-stepboard  # launcher: [use] · dev · ls · stop [N|all] [--keep]
│                         #   (~/.local/bin/claude-stepboard symlinks here)
├── tests/              # proxy · typed.py · security · parity · regressions · drag-select · resilience
├── package.json        # Playwright + `npm test` (pretest = lint + build)
├── pyproject.toml      # fastapi, uvicorn, websockets, watchfiles (via uv)
├── IDEAS.md            # Charles's idea notebook
└── .ai/WORKLOG.md      # dated history (ask Charles before reading)
```

## Current state (2026-09-29)

- Stack per session N: tmux `sbN` (claude pre-started in `~`) · ttyd on `$TMPDIR/stepboard-N.sock`
  with `-s KILL` · uvicorn :800N · (dev) Vite :5172+N. Safari opens once `/api/config` answers.
- `use` mode serves ui/dist from uvicorn (~80 MB, 0% idle CPU), rebuilding if ui/ is newer.
  `dev` = Vite HMR + `uvicorn --reload` on watchfiles, with absolute `--reload-exclude` paths.
- Close: `claude-stepboard stop [N|all] [--keep]` acts only on `$TMPDIR/stepboard-N.run` (launcher +
  child PIDs) and exact tmux `=sbN`; bare `stop` needs exactly one live board. Never pkill patterns
  or the tmux server (the server's argv looks like `tmux new …`).
- Security: no TCP ttyd; `/api/ws` refuses foreign Origin; TrustedHost refuses foreign Host;
  non-GET from a foreign Origin → 403. `tests/security.mjs` guards it.
- Terminal: page connects to same-origin `/api/ws`. Close 1000 (or tmux `[exited]`) = claude
  ended → ⏎/pill restarts; anything else → backoff 100 ms→5 s, 8 tries, then ⏎ to retry.
- `/api/send`: checks tmux's exit code (503/504 → status line, draft kept); ≤400-char text sent
  as-is with a trailing `;` escaped; longer text in 400-char pieces joined by ESC[I (stays under
  Claude's 800-char paste threshold). Enter is always a SEPARATE tmux call.
- Composer: `/cmd` and `!shell` go raw (no clauses/prompts); the tail line shows what gets appended.
- Keys: ⌘J term · ⌘K composer · ⌘⇧L grab · ⌥1–9 prompts · ⇧⏎ newline (terminal too); all listed in the
  SHORTCUTS card (lib/keys.js is its single source), foldable, fold state per browser.
  Option-as-Meta is OFF on purpose: ⌥O would toggle Claude's fast mode (credits).
- What's new: `lib/news.js`; bump `NEWS_ID` to show the popup once more. Tests pre-mark it seen.

## Invariants (don't break)

- xterm must own the selection (no iframe); drag-select = alt-carrying clone events; never
  force shift; plain click / idle hover pass through to Claude.
- Copy-on-select is synchronous in Safari's mouseup; badge text starts `selected: N chars`.
- Terminal padding lives on `.xterm`, never the host (FitAddon would fit a row too many).
- Safari never focuses a clicked button: Escape in the prompt editor is heard at the document
  (skipping `.term`); panel action buttons cancel mousedown to keep the composer's caret.
- Prompts: one store, labels are identity, `{list, seeded}`, rev + 409, a page load NEVER writes,
  re-read on focus never writes, an unreadable store never renders as empty.
- Every path the page calls starts with `/api` (Vite proxies only that; `tests/proxy.mjs`).
- Tests: `npm test` needs a throwaway stack with `SB_PROMPTS` set (tests/README.md);
  128 checks pass on Chromium and WebKit, ~10 s, no fixed sleeps.

## Decided against (don't re-propose)

- Bun port (2026-09-14) · xterm 6 / WebGL (no visible gain, risks selection) · ui-monospace
  (breaks box edges in Safari's DOM renderer) · React Compiler (crashes Prompts, no gain) ·
  Preact (−53 KB gz ≈ 15 ms on loopback) · gzip in FastAPI · web fonts · bracketed paste.

## Next potential steps

- Charles: try the build in real Safari (⌘⇧L vs Safari's sidebar key, drag-select, bell dot).
- Maybe: one merged settings card / segmented Length control; `tmux status off` if the bar bothers.
