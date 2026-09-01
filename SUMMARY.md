# StepBoard (from scratch) — SUMMARY

## Files

```
stepboard/
├── serve.py            # FastAPI: GET /config (pairing), POST /send → tmux, serves ui/dist
├── ui/                 # React + Vite + Tailwind v4 (npm run dev :5173 · build → ui/dist)
│   └── src/
│       ├── App.jsx     # state, composer, global shortcuts
│       ├── styles.css  # Tailwind import + @theme palette — no hand-written rules
│       ├── components/ # MessageBar · Constraints · Prompts · History · Badge
│       ├── hooks/      # useTtyd (xterm.js + ttyd protocol) · useHistory · usePrompts (localStorage)
│       └── lib/        # compose.js — message + constraints → text · ui.js — class strings
├── bin/claude-s        # launcher — session N: ttyd :768N + uvicorn :800N + vite :5172+N
├── tests/              # headless checks: harness · parity · regressions · drag-select
├── package.json        # test deps (Playwright) + `npm test`
├── pyproject.toml      # deps: fastapi, uvicorn (run via uv)
├── IDEAS.md            # Charles's idea notebook — raw dump → pitch → decisions
├── README.md           # quick start, pipeline chart, ports table, keys, customization
└── .ai/WORKLOG.md      # dated work history (ask Charles before reading)
```

## Goal

- Charles learns by building: his own web panel beside the real Claude Code CLI.
- Mentor mode: Claude gives ≤2-line steps; Charles does the work himself and
  Claude only writes code when explicitly asked.

## Current state (2026-08-29)

- Styling is Tailwind v4 (`@tailwindcss/vite`). `styles.css` is just the Tailwind
  import + an `@theme` palette; shared class strings live in `ui/src/lib/ui.js`.
- The panel is dark, sitting a hair above the terminal's hardcoded #000 so the
  window reads as one tool. Palette: `bg`/`card`/`control*` surfaces, `edge*`
  lines, `ink`/`muted` text, `armed`/`danger`/`good` state. State colours are
  lifted from the old light values, which went muddy on a near-black ground.
- `scheme-dark` on `<body>` is what darkens the NATIVE bits — radio/checkbox
  ticks, number spinners, scrollbars; `accent-armed` tints the ticks themselves.
- Send is the only solid-accent control (it is the primary action); an armed
  prompt is tinted, so the two never compete. Focus rings are explicit
  (`focus-visible:ring`) because the native ring is invisible on dark.
- Every text/background pair clears WCAG AA (lowest is armed-on-tinted, 4.99:1).
- Preflight is ON, so it strips native button/input chrome and `ui.js` rebuilds
  it. Same-kind utilities on one element are resolved by stylesheet order, not
  className order — so `BTN`/`BTN_ON` and the fieldset frames are mutually
  exclusive, never appended.
- `xterm.css` is imported unlayered on purpose: preflight sits in `@layer base`,
  and unlayered rules outrank every layered one. Rules reaching into xterm's own
  DOM survive as descendant variants on the host div (`[&_.xterm]:h-full`).
- `.prompts` no longer needs `!important` — a fieldset carries its own classes.
- Stack: `./bin/claude-s` → ttyd+tmux (`sbN`, :768N) + FastAPI (:800N, `--reload`)
  + vite dev server (:5172+N, HMR) — browser opens vite; everything hot-reloads.
- claude-s tags each child's output with a colored `label │` prefix (ttyd/api/
  vite), strips timestamp+N:/INFO: noise, keeps W:/E:, prints a ports banner.
  Vite's stream is visible (was >/dev/null); ⌘⇧L leaves the caret on a fresh line.
- The panel draws the terminal itself with xterm.js (no iframe), so the terminal
  selection is readable — that is what ⌘⇧L needs.
- Selection → input is keyboard-only: the "take terminal selection" button is
  gone, ⌘⇧L remains. Grabbing consumes the selection — `takeSelection` calls
  `term.clearSelection()`, so the highlight strip disappears once the text is in
  the input. `lastSel` still holds it, so a repeat ⌘⇧L pastes the same text.
- Focus flips both ways: ⌘J → CLI, ⌘K → input bar (J/K in screen order). ⌘ is
  safe because xterm emits no bytes for it; a ⌃ combo would need the
  `attachCustomKeyEventHandler` guard, like ⌃⇧L has.
- UI is React + Vite + Tailwind; 58 headless checks pass (47 parity + 5
  regression + 6 drag-select), run via `npm test`, non-zero exit on failure.
  They need a live stack on `SB_BASE` (default :8011) serving a built `ui/dist`.
- Prompts come from `usePrompts`: `BUILTIN` ships in the file, yours are made
  with the `+ new` button and kept in localStorage (`sb-prompts`). Labels are
  the identity — App arms by label — so a duplicate is refused, not shadowed.
  The form carries `data-own-enter`: App's Enter-sends handler is a document
  CAPTURE listener, so only App can decline it.
- Editing/deleting a prompt sits behind an `edit` mode button beside `+ new`,
  not a ✎/× pair per chip: the panel is 15rem, so icons inside a chip would
  shrink the arm target and put "delete" one slip from "arm". In the mode your
  prompts are dashed-green targets (`BTN_TARGET`) and built-ins recede
  (`BTN_LOCKED`) — `aria-disabled`, never `disabled`, because a real disabled
  button eats the hover that shows a prompt's text. Pressing one reopens the
  `+ new` form with save/cancel/delete; delete takes two presses (`sure?`,
  `BTN_DANGER`) and needs no dialog since the form shows what you would lose.
  Escape unwinds confirm → form → mode, which only works because closing the
  form focuses its chip again. The mode is hidden when you own no prompts.
- `usePrompts` is add/update/remove over one `commit`; update edits in place, so
  fixing a typo never sends a prompt to the end of the row. App wraps
  update/remove to carry a rename into `armed` and sweep a delete out of it.
- `HINT` carries no `basis-full`: flex-basis is the MAIN axis, so it means full
  width in the wrapping prompts row but full HEIGHT in the flex-col form. The
  row adds it at the call site.
- Drag in the terminal selects text even while Claude Code has mouse reporting
  on: mouse events are re-dispatched as alt-carrying clones (force selection).
  Never force shift too — that makes xterm extend a selection instead of
  starting one. Cost: mouse clicks never reach the CLI app itself.
- Idle mousemoves over the terminal are swallowed too: with all-motion
  reporting on, xterm counts each outgoing motion report as user input and
  clears the selection — so the highlight used to vanish on the first twitch
  after mouseup.
- Multi-session: env pair `SB_SESSION`/`SB_TTYD_PORT`; panel asks GET /config.
- 2026-08-22 tidy-up: `web/` (vanilla page + /legacy route) deleted — history
  has it at `git show 49f09b0:web/index.html`; tests share `tests/harness.mjs`;
  serve.py fails fast when `ui/dist` is missing.

## Next potential steps

- Charles: confirm drag-select + ⌘⇧L in Safari (only Chromium is covered).
- Later: auto-reconnect when ttyd drops · error handling (dead tmux) ·
  reorder prompts (edit/delete now exist; order is still fixed).
