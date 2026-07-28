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
- stepboard-view MVP: custom web view (bin/stepboard-view + web/view.html) — iframes the
  real CLI, adds owned UI (input bar, quick actions, tickable steps) driving Claude via
  POST /send → tmux send-keys. Tested end-to-end against a throwaway tmux session.
- Help-level bar added to web view: Autopilot / Copilot / Advisor / Mentor segmented
  control above the input area; clicking sends the mode's behavior contract into Claude
  via /send; selection persists in localStorage.
- Tab pane-switching + deferred mode sending: ttyd now serves under /term and
  stepboard-view proxies it same-origin (HTTP + raw WebSocket tunnel), so the page can
  intercept plain Tab inside the terminal — Tab toggles terminal ⇄ sidebar input, input
  auto-focused on switch. Mode click no longer types into the CLI: the instruction shows
  above the input bar and is prepended once to the next message sent.
