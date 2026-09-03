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

## 2026-09-01 — edit and delete a custom prompt
- Closed the last open item under "Prompts": you could make one, never change
  or remove one.
- Interaction design, the part that took the thinking. The obvious move is a
  ✎/× pair revealed on hover inside each chip. Rejected: the panel is 15rem, so
  a chip is already a small target — icons inside one shrink the arm target AND
  put an irreversible action one slip away from the thing you press constantly.
  Right-click and long-press are undiscoverable. So: a mode.
- `edit` sits beside `+ new` and toggles the row. Off, the row is byte-for-byte
  what it always was — no new chrome for people who never edit a prompt. On,
  your prompts become dashed-green targets (`BTN_TARGET`) and the built-ins
  recede to the card's own colour (`BTN_LOCKED`). The mode pays for itself
  twice: it is also the only place the panel has ever said which prompts are
  fixed in the source and which are yours.
- `aria-disabled`, not `disabled`, on the built-ins. A truly disabled button
  swallows pointer events, and the hover snippet — the thing that shows what a
  prompt actually appends — would stop working on exactly the prompts whose
  text you cannot read anywhere else. Playwright refuses to click an
  aria-disabled button, which is the correct semantic; the test forces it to
  prove the press still opens nothing.
- Pressing a target reopens the SAME form `+ new` uses, prefilled, with save /
  cancel / delete. Delete is two presses (second reads `sure?`, `BTN_DANGER`)
  and gets no dialog: the form already shows the full text you are about to
  lose, which is the confirmation that matters.
- Escape unwinds one layer per press — confirm → form → mode. The middle step
  only works because closing the form focuses its chip again; without that the
  form unmounts under the caret, focus falls to <body>, and Escape never
  reaches the fieldset handler. A delete uses `reset()` instead of
  `closeForm()`, since that chip is on its way out.
- `usePrompts` is now add/update/remove over one `commit()` — one writer, so no
  path can update the buttons and forget localStorage. `update` edits in place;
  remove-then-append would send a prompt to the end of the row for a typo fix.
  A shared `check()` gates add and update, with a `keep` label that is allowed
  to collide with itself so "fix only the text" is not a duplicate.
- App wraps update/remove because `armed` holds LABELS: a rename has to be
  carried into it or an armed prompt silently stops being appended, and a
  delete has to be swept out or re-making that label later comes back
  pre-armed. Both forward the hook's rejection string untouched.
- Bug caught by screenshotting the panel, not by a test: `HINT` had
  `basis-full`. flex-basis is the MAIN axis — full width in the wrapping
  prompts row, full HEIGHT in the flex-col form. It opened a ~100px hole
  between "editing X" and the label field. Moved to the row's call site.
- The mode is hidden when you own no prompts, so deleting your last one cannot
  strand you in an empty edit mode.
- 58/58 green (47 parity + 5 regressions + 6 drag-select) on a throwaway stack
  (ttyd 7695 / uvicorn 8015, `ui/dist` built first). 15 of the parity checks
  are new: prefill, rename, rename-collision refused, armed survives a rename,
  reload, both delete presses, the Escape chain, and the mode retiring.
- Note: the worktree branched from a stale origin/main and was rebased onto
  local main before merging.
- Branch: worktree-prompt-edit-delete → merged to main.

## 2026-09-01 — every prompt is the same prompt
- Charles: "make every prompts same editable." The built-in/custom split went
  away entirely rather than growing a second set of rules.
- The split existed only because localStorage held the TAIL (your prompts) and
  BUILTIN was prepended at render time. Anything prepended at render can never
  be edited, reordered or removed. So the store now holds the whole list.
- Which raises the two questions that split was hiding, and both had to be
  answered on disk, not in code:
  1. If `list` is everything, a BUILTIN added to the source later can never
     reach a browser that already seeded — `list` alone cannot tell "I deleted
     `pro`" from "`pro` is new".
  2. Built-ins become deletable, and the seed is the only copy of their text.
- (1) → store `seeded`: the seed labels this browser has been handed. A BUILTIN
  label absent from it is new and gets appended once; one present in it was
  retired and stays gone. Two parity checks pin exactly this pair.
- (2) → `restore N`, which appears only while a seed is missing and appends
  only what is absent. An edited prompt keeps its edit (it is still there under
  that label); delete it first to get the original text back.
- Hole found while writing the test for it: delete EVERY prompt and a
  `prompts.length > 0` guard hid the edit button — and `restore` lives inside
  edit mode, so the one control that undoes it became unreachable. Guard is now
  `prompts.length || missing`, and the empty row's hint says how to recover.
- v1 store (a bare array of only your prompts) migrates on read, in load(),
  without writing back — a page load stays read-only, and the migration is
  idempotent so nothing is lost if you never mutate.
- Charles, mid-turn: "put +new and edit btn one level up (rn its easy to mix up
  with prompts)." Correct — they sat in the SAME wrap row with the SAME `BTN`
  chrome as the chips, so a control read as a prompt. The card is now two
  levels: an actions row (`BTN_ACTION` — smaller, muted, transparent until
  hovered) above a `CHIP_ROW`. `FIELDSET_ROW` is gone; the card is `FIELDSET`
  (flex-col) and the chips are a row inside it.
- Knock-on: actions now come FIRST in DOM order, so `.prompts button` no longer
  lands on a prompt. Every chip lookup in parity.mjs is scoped to
  `.prompts .chips button`, which says what it means anyway.
- Knock-on 2: with the card flex-col, `basis-full` is wrong everywhere in it
  (flex-basis is the main axis → full HEIGHT). Removed from the hint and the
  form; only the chips row is flex-row now.
- `BTN_LOCKED` deleted — nothing is locked any more.
- 71/71 green (60 parity + 5 regressions + 6 drag-select) on a throwaway stack
  (ttyd 7696 / uvicorn 8017). 13 new parity checks: a shipped prompt edits and
  deletes, restore appears/counts/retires, delete-everything stays recoverable,
  v1 migration, and the new-seed-arrives / retired-seed-stays-gone pair.
- Note: the worktree branched from a stale origin/main again and was rebased
  onto local main before merging. Worth watching if it keeps happening.
- Branch: worktree-prompts-all-editable → merged to main.

## 2026-09-02 — prompts move to prompts.json on the server
- Charles asked where an edited/added prompt actually gets written. Answer at
  the time: browser localStorage, nowhere else. He picked the server store.
- The real motivation is not durability, it is ORIGIN. localStorage is scoped
  to scheme+host+port, and claude-s hands every session its own vite port —
  so :5173, :5174 and :8001 each kept a private, invisible set of prompts.
- serve.py grows GET/PUT/DELETE /prompts over one JSON file, default
  `prompts.json` beside it, `SB_PROMPTS` to override. The file is gitignored.
- The server does NOT know the shape of a prompts doc — `doc: Any`. The seed
  list stays in usePrompts.js, so adding a prompt to the app is still a
  one-file change, and the store stays a dumb blob.
- `doc: null` means "no file yet" and is distinct from an empty `list`, which
  is a real state (you deleted every prompt). Collapsing them would have made
  "delete everything" un-persistable.
- PUT carries the rev it read; a stale one gets 409 + the current doc instead of
  clobbering. Last-write-wins would be fine for one client, but the whole point
  of this change is that several sessions share the file — so a lost prompt goes
  from exotic to routine. Writes are tmp + os.replace so a crash cannot leave a
  half-written file.
- Client writes optimistically (localhost round-trip per edit would be worse
  than a rare rollback) and reports failures through App's existing badge, which
  is why `flash` had to move above usePrompts in App.
- `commit(next, rollback)` takes the rollback explicitly: the first write comes
  from inside the load effect where the captured doc is still null, and rolling
  back to that would strand the panel on "loading" for ever.
- `ready` gates the actions row. Before the fetch lands the list is empty, which
  without the gate reads as "everything is deleted" and flashes `restore 3`.
- BUG, caught by an end-to-end two-port check rather than by any unit-ish test:
  withNewSeeds returned the doc "unchanged" when nothing grew, but the caller
  builds a fresh object to pass in, so `grown !== got.doc` was ALWAYS true. Every
  page load wrote. With two sessions open they bumped rev past each other and the
  next real edit died on a 409 — which is exactly what the cross-port script hit.
  Now it returns null when nothing changed, and a parity check pins "a plain load
  does not write to the store".
- Old localStorage stores (both shapes) are adopted ONCE when the server has no
  file, then the key is renamed sb-prompts-migrated — otherwise deleting
  prompts.json to reset would quietly resurrect them.
- Safety interlock: /config reports `prompts` + `prompts_default`, and the
  harness wipes the store before every suite, so it REFUSES to run unless
  SB_PROMPTS was set. Verified by pointing a suite at a default-path server:
  it failed with the path named and created no file. Without this, `npm test`
  would have eaten Charles's real prompts.
- useHistory stays on localStorage. It is scratch, and per-browser is right.
- 77/77 green (66 parity + 5 regressions + 6 drag-select) on a throwaway stack
  (ttyd 7697 / uvicorn 8019, SB_PROMPTS in the job tmp). 9 new parity checks:
  cross-session visibility, no-write-on-load, the 409 pair, the seeded pair, and
  the three adoption checks.
- Cross-port sharing proved by hand too: prompt made through the UI on :8019,
  present on :8021 after reload.
- Branch: worktree-prompts-server-store → merged to main.

## 2026-09-03 — /prompts was never proxied in dev, so the panel looked empty
- Charles: "So why disappeared?" His prompts had not disappeared. The panel he
  browses is Vite (:5173), and ui/vite.config.js proxied only /config and /send.
  A route that is NOT proxied does not 404 — Vite falls through to index.html
  and answers 200 text/html, so `res.json()` threw, the load failed, and the
  panel rendered an empty list.
- Nothing was lost: the failed load never wrote, so GET /prompts still reported
  `doc: null` and the localStorage adopt path had never run.
- Why every test missed it: the browser suites drive the BUILT panel served by
  serve.py, where the API and the page share one origin and no proxy exists.
  Nothing in the suite ever crossed Vite. Testing through the artifact you do
  not actually use is a hole, not a coincidence.
- Fix 1: `API_ROUTES` in vite.config.js is now the single list, and the proxy is
  built from it. Fix 2: tests/proxy.mjs greps ui/src for fetch('/...') paths and
  fails if one is not in that list. No browser, no stack, runs first in
  `npm test`. Negative control: removing /prompts from the list makes it FAIL,
  so the check has teeth.
- Fix 3, the one that made this look like data loss: a failed LOAD used to fall
  back to `{list: [], seeded: []}`, i.e. a normal, editable, empty row. That
  reads as "everything was deleted" — and worse, adding a prompt from that
  state would have PUT a store with the real prompts missing. Now `doc` stays
  null, the card says "prompts: could not load", and no control that writes is
  rendered at all.
- Three parity checks pin it, and they fulfil the request with 200 text/html —
  the exact shape of the bug — rather than aborting, which also keeps the
  console-error list clean for real errors.
- Verified the real path, not just the tests: a Vite dev server (:5199) against
  a throwaway FastAPI (:8023); /prompts through Vite returns JSON; a prompt
  typed into the dev panel landed in prompts.json on disk.
- 85/85 green (5 proxy + 69 parity + 5 regressions + 6 drag-select).
- Branch: worktree-fix-vite-prompts-proxy → merged to main.
