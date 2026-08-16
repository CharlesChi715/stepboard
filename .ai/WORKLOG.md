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
