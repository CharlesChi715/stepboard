# WORKLOG

## 2026-07-28 — MVP: Claude Code in a webpage
- Created repo. `bin/stepboard-web` serves the real Claude Code CLI to the browser via
  ttyd (brew, 1.7.7) inside tmux; localhost:4870, writable, loopback-only.
- Moved full design (context bar + tickable step board) here as docs/DESIGN.md — MVP
  implements only its "Tier 1 chat pane".
- Symlinked stepboard-web into ~/Documents/bin.
- Fix: launcher now strips leaked CLAUDE_*/AI_AGENT env vars so a nested launch
  (from hooks/background jobs) starts a fresh claude instead of attaching to the
  running session. Found during live verification.
