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
- Fixed "reconnecting" loop: proxy_ws rebuilt the handshake with str(headers), whose
  trailing blank line + our terminator left 2 stray bytes that ttyd parsed as a bogus
  WS frame → drop. Now byte-exact reconstruction; verified 45s idle survival with
  ping/pong. Also removed read timeout on the tunnel (connect-timeout only).
- Mode bar rework: shows only the outgoing instruction above the input bar (descriptions
  removed), ✎ edit button with per-mode overrides, per-mode sent-memory (switching back
  to an already-sent mode doesn't re-queue; re-click active mode to force resend).
- Pane switching remapped: Tab restored to normal behavior; ⌘← focuses the CLI pane,
  ⌘→ focuses the sidebar input (both intercepted in page and terminal, blocking
  browser history navigation).
- Shift+Tab (input-focused only) cycles help-level modes, mirroring Claude Code's own
  Shift+Tab mode cycling; respects per-mode sent-memory.
- Input bar: Enter sends, Shift+Enter inserts a newline (matches the CLI's convention).
- Removed ⌘←/⌘→ pane switching (shortcut TBD later); input still auto-focuses on load.
- ⇧⌘↵ now toggles focus between the CLI pane and the sidebar input (both directions,
  intercepted on both sides of the iframe).
- Fix: ✎ edit is now available in every mode state (was unreachable once an instruction
  had been sent); saving an edit queues the new instruction with the next message.
