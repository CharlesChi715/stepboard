# WORKLOG

## 2026-08-15
- Cleared the entire repo at Charles's request: fresh start for a mentored,
  from-scratch build of something NEW (not a StepBoard re-implementation;
  Charles will define it). Old StepBoard code: git history @ 2a92f3f.
- Created IDEAS.md (idea notebook: raw dump → pitch → requirements; Claude
  polishes on request). Project function still TBD by Charles.
- Implemented the minimal send path at Charles's request: serve.py (11 lines —
  serves web/, POST /send → tmux send-keys) + web/index.html (iframe + 2 buttons).
  Verified against a throwaway tmux session; cleaned up after.
- Wrote README.md (quick start, two-doors pipeline chart, security) and
  recreated SUMMARY.md per global rules. Repo still uncommitted by Charles.

## 2026-08-16
- Panel v2 at Charles's request: prompt composer in web/index.html — message
  textarea + constraint sections (length radio+number, ASCII-chart toggle,
  max-lines-per-edit) appended as clauses. compose() logic unit-tested via node.

## 2026-08-16 — claude-s launcher
- Created `~/Documents/bin/claude-s`: guards port 7681, starts ttyd+tmux(claude) & `uv run uvicorn serve:app --port 8000`, opens panel, `wait`s so Ctrl-C kills both.
- Added `export PATH="$HOME/Documents/bin:$PATH"` to `~/.zshrc`.
- Tested cold start: both ports listened, panel & ttyd returned HTTP 200; stack torn down after test.

## 2026-08-16 — multi-session claude-s
- `claude-s` now scans 7681+ for a free slot; if session(s) exist, asks "create session N? [y/n]".
- `serve.py`: reads SB_SESSION/SB_TTYD_PORT env, new GET /config; `index.html`: iframe port set via /config fetch.
- Repo changes on branch `worktree-multi-session` (pushed); tested 2 parallel panels → /send routed to correct tmux session.

## 2026-08-16 — IDEAS.md refreshed to match repo state
- §2 ASCII map redrawn: FastAPI serve.py, GET /config handshake, SB_SESSION/SB_TTYD_PORT env pair, multi-session note.
- §3 Must-do: added shipped items (message history, multi-session, prompt template buttons + edits color coding).
- §1 raw batch marked "distilled into §3, shipped" (kept, never deleted).

## 2026-08-16 — docs refresh + launcher in repo
- bin/claude-s: repo copy of the launcher (cd → script-relative repo root; chmod +x).
- README.md: quick start via ./bin/claude-s + uv/uvicorn, /config diagram, session-ports table, PROMPTS customize example, 768N/800N security note.
- SUMMARY.md: files chart + current state brought to 2026-08-16 (FastAPI, panel v2, multi-session, all committed).

## 2026-08-22 — merge react-ui into main + fix the regression it carried
- main was 2 commits behind origin/main; `git merge --ff-only react-ui` fast-forwarded
  8bfcf07 → 49a7d4c (drag-select fix + favicon). No merge commit.
- Verified before/after in throwaway worktrees (ttyd :7691 + tmux `sbtest` + panel :8011):
  pre-merge parity 23/23 but drag-select 0/4; post-merge drag-select 4/4 but parity 20/23.
- Regression: the drag fix cloned mouse events with `shiftKey: true`. xterm's
  SelectionService only ignores shift while an app has mouse reporting ON
  (`_enabled && shiftKey` → _onIncrementalClick). With reporting OFF the first drag
  extended a nonexistent selection and selected nothing — breaking the badge, the
  take-selection button and ⌘⇧L on an idle shell.
- Fix (a1f49ea): pass the real `shiftKey` through; alt alone is what forces selection.
- Full suite green on main: 34/34 (23 parity + 7 regressions + 4 drag-select).
- Not pushed — main is Charles's branch.

## 2026-08-22 — tidy-up (Claude, background job)

- Deleted `web/` (vanilla page + vendored xterm, ~310 KB) and the `/legacy` mount;
  reference lives at `git show 49f09b0:web/index.html`. 2 legacy tests removed.
- serve.py: fails fast when `ui/dist` is missing; one-line send log; no silent web/ fallback.
- tests/: shared `harness.mjs` (launch, PASS/FAIL log, non-zero exit on failure);
  suites keep their checks 1:1. Root `package.json` pins playwright, adds `npm test`.
- Hardcoded Chromium path dropped — CHROME_PATH still overrides.
- vite.config.js dev-proxy default 8000 → 8001 (a real session port).
- .gitignore: + .venv/, generalized node_modules/.
- All 32 checks pass against a throwaway sbtidy stack (:7691/:8011).

- 2026-08-22 · MessageBar textarea: added autoCorrect/autoCapitalize/spellCheck/autoComplete off — kills browser autocorrect in the composer (Claude, on Charles's "u do it").

## 2026-08-23 — selection survives idle mousemove

- Bug: terminal selection highlight vanished on the slightest mouse move after
  release. Chain: idle mousemove reaches xterm → all-motion reporting (1003)
  sends a report → CoreService fires onUserInput → SelectionService clears.
- Fix: forceSelect in useTtyd.js now swallows non-drag mousemove/mouseup over
  .xterm (they carried zero value — the CLI never gets real clicks anyway).
- New drag-select check "highlight survives idle mousemove after release";
  confirmed it FAILs on the unfixed build, then 33/33 pass with the fix.
- Branch: worktree-selection-survives-mousemove.
## 2026-08-22 — drop the "take terminal selection" button
- Removed the `⤵ take terminal selection` button from the panel (App.jsx);
  ⌘⇧L keeps working — it calls the same `grab` via the global keydown handler.
- parity.mjs: dropped the button-path check (23 → 22); npm test 31/31 green.
- Docs: SUMMARY + tests/README counts updated.

## 2026-08-23 — claude-s always launches with hot reload
- bin/claude-s: uvicorn gets `--reload`, vite dev server starts per session
  (:5172+N, --strictPort), browser opens vite (localhost, not 127.0.0.1 —
  vite may bind IPv6 only).
- Verified on a throwaway stack (7692/8012/5199): proxy /config OK, src edit
  visible in served module ~1s, serve.py touch restarts uvicorn, parity 22/22
  through vite.
- README quick start + ports table, SUMMARY stack line updated.

## 2026-08-24 — swap the stylesheet for Tailwind v4
- `ui/src/styles.css` (41 hand-written lines) → `@import "tailwindcss"` + an
  `@theme` palette; every rule now lives on an element as utilities.
- Added `@tailwindcss/vite` to vite.config.js; new `ui/src/lib/ui.js` holds the
  shared class strings (BTN, FIELDSET, TERM, …).
- Preflight ON: it zeroes margin/padding/border globally and makes buttons and
  inputs transparent, so native control chrome is rebuilt in ui.js. Read the
  shipped `node_modules/tailwindcss/preflight.css` rather than trusting docs.
- Same-kind utilities on one element are resolved by STYLESHEET order, not
  className order, so `BTN`/`BTN_ON` and the fieldset frame colours are
  mutually exclusive strings instead of appended ones.
- xterm survived: `xterm.css` is imported unlayered (outranks `@layer base`),
  and no unlayered xterm rule targets `.xterm-screen`'s cursor directly, so the
  layered `[&_.xterm-screen]:cursor-text` still wins — "cursor stays an I-beam"
  and both drag-select checks pass.
- parity.mjs asserted the edits fieldset's class attribute EQUALS 'danger'/'ok';
  that cannot hold beside styling classes, so it now matches the marker as a
  whole word. Intent unchanged.
- Separately: the "chart clause on by default" check had been failing since
  bb00f20 — the clause gained slashes ("ASCII diagram/chart/table") but the
  regex lost them. Fixed in its own commit. 32/32 green after.
- Verified against the built bundle on a throwaway stack (7691/8011), plus a
  before/after screenshot of the panel. Deltas are only what preflight forces:
  slightly roomier line-height and flat rather than native button chrome.
- Branch: worktree-tailwind-migration.

## 2026-08-24 — dark panel, matched to the terminal
- Charles picked "dark, matched to terminal" over refined-light / auto. The
  white panel beside a hardcoded-#000 terminal was the biggest thing hurting
  the look; the terminal can't meet you halfway, so the panel moved.
- New `@theme` palette in styles.css: surfaces bg/card/control(+hi/on), lines
  edge/edge-soft, text ink/muted, state armed/danger/good. The old light values
  (#2b44c4/#c0392b/#1e7a40) all go muddy below ~#1a1a1a, so each was lifted.
- `scheme-dark` on <body> is the load-bearing trick: it darkens the NATIVE
  controls (radio/checkbox ticks, number spinners, scrollbar) that Tailwind
  can't reach. `accent-armed` tints the ticks. Verified `.scheme-dark` and
  `accent-color` both land in the built CSS.
- Three fixes independent of colour: Send is now the only solid-accent control
  (it was visually identical to history/summarize despite being the primary
  action); focus rings are explicit since the native ring vanishes on dark;
  legends are uppercase micro-labels rather than prose.
- Contrast checked numerically, not by eye — all 8 text/bg pairs clear WCAG AA,
  lowest 4.99:1 (armed on its own tinted chip), highest 16.19:1 (ink on panel).
- Opacity modifiers on custom theme colours (`bg-armed/15`, `border-danger/60`)
  work in v4.3.3 — emitted as a hex-alpha rule plus a color-mix override.
- 32/32 checks pass. Branch: worktree-dark-restyle.

## 2026-08-25 — prompt snippet becomes a hover preview
- The snippet used to render only while a prompt was armed; it now previews on
  hover instead, so you can read what a prompt appends before committing to it.
  Armed state is carried by the button's own tint (BTN_ON), which it already was.
- Two traps on the way:
  - `group-focus-within` pinned a snippet open permanently, because clicking a
    prompt focuses its button. `group-focus-visible` is the right idea (Tab yes,
    click no) but is INERT here — that variant needs the `.group` element itself
    focusable, and the group is a plain div. `group-has-[:focus-visible]` is the
    one that works: the group HAS a focus-visible descendant.
  - `items-start` on the wrapper — without it the button stretches to the
    snippet's width when the preview opens, resizing the thing under the cursor.
- Both were caught only by measuring (visible-snippet counts, button bounding
  box across hover), not by looking at a screenshot. A JSX comment placed as a
  bare expression inside .map() also failed the build and served a STALE dist —
  worth re-reading build output rather than trusting an unchanged screenshot.
- parity.mjs section 6 rewritten: every snippet is now always in the DOM, so
  presence no longer proves armed state. Disarm is proven by what gets SENT.
  Parity 22 → 23 checks, suite 32 → 33. tests/README drag-select count was also
  wrong (said 4, is 5) — corrected.
- Branch: worktree-dark-restyle.

## 2026-08-25 — snippet becomes a real popup; the white strip explained
- Snippet preview is now absolutely positioned, so opening it never pushes a
  button around. Verified by measuring: .send y and .prompts height are
  byte-identical across hover, and the popup stays inside the panel's box.
- `relative` sits on the FIELDSET, not the button wrapper. That makes the card
  the containing block, so the popup spans the card's width instead of hanging
  off a button and being clipped — .panel is overflow-y-auto, which makes
  overflow-x non-visible too, so anything overhanging gets cut.
- It opens UPWARD (bottom-full). Downward landed squarely on the bright blue
  Send button and read as a rendering bug; upward it floats over the dark edits
  card and reads as a popup.
- The white strip between the panes: xterm.css sets `overflow-y: scroll` (not
  auto) on .xterm-viewport, and xterm's Viewport computes
  `scrollBarWidth = viewportElement.offsetWidth - scrollArea.offsetWidth || 15`
  — so when the browser reports 0 (macOS overlay scrollbars) it STILL reserves
  15px, which FitAddon subtracts. Measured: .xterm-screen ends at 1023, the
  viewport at 1040. On a Mac set to "show scroll bars: always" the OS paints
  that gutter light → the white strip.
- Fix: style .xterm-viewport::-webkit-scrollbar via arbitrary variants on TERM
  (black track, edge-coloured thumb) so Chromium draws ours. NOT reproducible
  headlessly — headless macOS always reports overlay scrollbars — so this one
  needs Charles to confirm on his screen.
- 33/33 pass. Branch: worktree-dark-restyle.

## 2026-08-25 — ⌘J: focus the CLI pane

- Charles wanted the missing half of the focus pair: ⌘K already jumped to the
  panel input, nothing walked back to the terminal.
- The left pane has exactly one focus target — xterm's `.xterm-helper-textarea`
  — so the whole feature is `term.focus()`. `useTtyd` now returns `focusTerm`.
- Key choice: ⌘ combos are the only safe family. xterm's parser ignores
  `metaKey`, so ⌘J emits no bytes and cannot collide with the CLI; ⌃J would
  emit 0x0A (Enter) and ⌃L 0x0C (clear). J/K sit in screen order under the
  right hand — left pane, then panel. Browser-free in Chrome and Safari
  (Firefox binds ⌘J to Downloads; ⌥⌘J is the spare if that ever matters).
- App's document listener is capture-phase, so it beats xterm's own handler —
  no `attachCustomKeyEventHandler` guard needed, unlike ⌃⇧L.
- Tightened the ⌘K parity check while adding the ⌘J one: it asserted
  `tagName === 'TEXTAREA'`, which xterm's hidden input also satisfies, so a
  failure could have passed vacuously. Now it requires `.closest('.panel')`.
- 33/33 green on a throwaway stack (ttyd 7699 / uvicorn 8011).
- Merged main afterwards (the dark-restyle + snippet-popup run). Only the two
  docs conflicted — both were append-at-the-end collisions, no code overlap.
  34/34 green after the merge, so ⌘J survives the hover-preview rework.
- Branch: worktree-cmd-j-focus-cli.

## 2026-08-26 — make a prompt from the panel

- Ask: a button in PROMPTS that creates a new prompt.
- `+ new` sits last in the wrap row (so the prompts keep their places, and
  `.prompts button` first still lands on `pro`) and toggles an inline form:
  label, text, add/cancel. `basis-full` breaks the flex row so the form gets
  the card's full 15rem — too narrow to put fields side by side.
- New hook `usePrompts`: `BUILTIN` (the three that shipped) + custom ones in
  localStorage under `sb-prompts`. `add()` returns null or a reason, which the
  form shows inline — empty fields and duplicate labels are refused. Labels
  are the identity, since App arms by label; a duplicate would shadow.
- Two capture-phase traps, both in App's global keydown:
  - Enter sends from anywhere, and that listener is on document in CAPTURE
    phase, so nothing the form attaches to itself can stop it first. The form
    marks itself `data-own-enter` and App declines.
  - The ⌘A guard selects on `input[type=text]`, which does NOT match an input
    with no type attribute — so the label field carries `type="text"`.
- PROMPTS moved out of Prompts.jsx into the hook; App imports from there.
- Parity grew 8 checks (24 → 32), appended last on purpose: the block reloads
  the page to prove localStorage survived, and leaves a prompt behind.
- 42/42 green on a throwaway stack (ttyd 7691 / uvicorn 8011).
- Branch: feat/new-prompt-btn.

## 2026-08-29 — ⌘⇧L trailing newline; claude-s learns to label its output

- grab() now appends a trailing \n in both branches, so after ⌘⇧L the caret
  lands on a fresh blank line instead of mid-line (App.jsx:42, 1017fbb).
- bin/claude-s: every child pipes through tag() — colored aligned `label |`
  per line (ttyd/api/vite), timestamps + N:/INFO: stripped, W:/E: kept, and a
  one-line ports banner. Vite is no longer >/dev/null — HMR lines and failures
  (e.g. missing node_modules) are finally visible. PYTHONUNBUFFERED=1 keeps
  POST /send lines live now that stdout is a pipe; serve.py logs /send with a
  single sys.stdout.write so an access-log record cannot splice mid-line.
- Adversarially reviewed (3 lenses, findings verified on BSD awk + zsh):
  survivors are all edge cases — orphaned taggers can outlive Ctrl-C only if a
  producer ignores SIGINT; vite gained terminal backpressure vs /dev/null.
- Mystery solved: stale ui/dist (not broken HMR) was why ⌘⇧L showed no newline
  on the :800N panel — dist rebuilt; it now carries grab-fix + prompt button.
- Branch worktree-claude-s-labeled-output (683cbd0), merged to main.

## 2026-08-29 — ⌘⇧L clears the terminal highlight

- Ask (Charles): the highlighted strip should disappear once the selected text
  has landed in the input box.
- One line in `useTtyd.takeSelection`: `term?.clearSelection()` after `picked`
  is computed. Put there, not in `App.grab`, because that function IS the
  "consume the selection" step and `term` is only in scope inside the hook.
- Safe for the fallback path: `onSelectionChange` only stores non-empty
  selections into `lastSel`, so clearing never wipes the remembered text — a
  second ⌘⇧L still pastes the same string, just without a stale highlight.
- New drag-select check `highlight clears after ⌘⇧L` counts
  `.term .xterm-selection div` and expects 0. Negative control run: with the
  fix commented out it FAILs at 2 divs, so the check has teeth.
- 43/43 green (32 parity + 5 regressions + 6 drag-select) on a throwaway stack
  (ttyd 7691 / uvicorn 8011, `ui/dist` built first).
- Branch: worktree-grab-clears-selection → merged to main.

## 2026-08-29 — /branch: the session's own branch tree

- Ask (Charles): a `/branch` view under the history button, drawn as a tree.
  First read as git branches — corrected: it is the CLAUDE CODE SESSION's
  branch structure, and it must show the same session as the left pane.
- Data source: ~/.claude/projects/<slug>/<uuid>.jsonl. Every record carries
  uuid + parentUuid, so a session is literally a tree.
- The trap, found by probing all 16 local sessions: raw parent/child forks are
  mostly FAKE. Parallel tool calls emit an assistant `tool_use` and a user
  `tool_result` sharing one parentUuid — naive counting reported 11 forks in a
  session with 1. Real rule: ≥2 records that are type=user, non-sidechain, and
  carry a text block, sharing their nearest *prompt* ancestor. That found 7
  real branch points across 4 of 16 sessions — all of them a prompt that was
  interrupted or edited and resent ("fix it and cmd" → "fix it and cmt").
- Which session: NOT newest-by-mtime — sb1 and sb2 both run in the repo root
  and share a project dir, so mtime picks the wrong pane. claude-s now mints a
  UUID, passes it to `claude --session-id` AND to serve.py as
  SB_CLAUDE_SESSION, and /branches globs */\<uuid>.jsonl (glob, not the cwd
  slug, because the CLI may be running inside a worktree). Four honest states:
  exact · pending (id known, no file yet — never fall back here, it would show
  a stranger's session) · newest (pre-change sessions, view says so) · none.
- UI: Branches.jsx, fixed area under the `branch` button, max-h-56 + scroll.
  `shrink-0` is load-bearing — the panel is a flex column with overflow-y-auto,
  so without it the box is squeezed to a sliver. Caught by screenshotting, not
  by the DOM tests, which passed either way.
- /branch typed in the box is intercepted in sendComposed (typed input only, so
  a canned send stays literal) — it opens the view and reaches tmux never.
- 55/55 green (32 parity + 5 regressions + 6 drag-select + 12 new). The new
  suite runs against tests/fixtures/session-branch.jsonl via SB_TRANSCRIPT;
  the fixture deliberately contains the tool_use/tool_result pair and a
  sidechain, so the false-fork rules are actually exercised.
- Verified by eye at 240px against a real 3-branch session (d1406a11), CJK
  prompts included.
- Branch: worktree-session-branch-view.
