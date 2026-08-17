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


## 2026-08-17 — custom prompt buttons

- web/index.html: `+` button in the prompts fieldset opens an inline form
  (label + text) that registers a new toggleable prompt button.
- Stored in sessionStorage (`sb-prompts`) → survives reload, per browser tab.
  `×` on your own buttons removes them; built-ins have no `×`.
- Refactored the render loop into `renderPrompt(pr)` so add/restore reuse it.
- Guarded the page-wide Enter and ⌘A handlers so the form keeps its own keys.
- Verified: 21 headless-Chrome DOM assertions + a sessionStorage restore test.
