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

## 2026-08-22 — drop the "take terminal selection" button
- Removed the `⤵ take terminal selection` button from the panel (App.jsx);
  ⌘⇧L keeps working — it calls the same `grab` via the global keydown handler.
- parity.mjs: dropped the button-path check (23 → 22); npm test 31/31 green.
- Docs: SUMMARY + tests/README counts updated.
