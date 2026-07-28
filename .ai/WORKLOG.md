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
- Active mode's instruction text now always shown (slightly dimmed when already sent).
- Shift+Tab mode cycling now works anywhere outside the terminal pane (was input-only).
- Two-state focus model: any click outside the CLI pane (not on a text field, not while
  selecting text) auto-focuses the input bar; Shift+Tab cycles modes in that whole state.
- Likely cause of "features not working after reload": no cache headers → browser served
  stale page. Server now sends Cache-Control: no-store on everything; page errors now
  flash visibly (window error trap) instead of silently killing later features.
- Tidy pass (applied, 4 commits): renamed stepboard-web → stepboard-term (+symlink);
  split web/view.html into view.html/style.css/app.js with whitelisted static routes;
  added scripts/smoke.sh (14 checks, all green); rewrote README (user manual) and
  SUMMARY (chart, rules, compressed state).
- Normal text selection in the CLI pane: Claude Code's mouse reporting was eating clicks;
  app.js now re-dispatches trusted mouse events as shiftKey clones (xterm's force-selection),
  so drag/double-click(word)/triple-click(line) select like a text editor. Clicks no longer
  reach the CLI app itself.
- Pace panel: Claude (asked once from the page) writes each answer as numbered paragraphs
  to a digest file; GET /digest polled by the page renders per-paragraph cards with
  🐢 simpler / ⚡ deeper follow-up buttons. No terminal parsing.
- Terminal text-selection fix for macOS: xterm.js only force-selects via Option-click with
  macOptionClickForcesSelection=true (now set by stepboard-term, altClickMovesCursor off);
  app.js clones now carry altKey+shiftKey and preventDefault the real event (the "page
  drifts while dragging" was native drag leaking through).
- Pace instruction relaxed: numbered paragraphs stay, the 2-4-sentence cap dropped
  (one idea per paragraph, natural length).
- Real cause of selection still failing: iframe load race — on fast localhost the terminal
  iframe finishes loading before app.js runs, so the load-event hooks (selection
  interception, ⇧⌘↵) never attached. hookTerminal() now runs immediately AND on load,
  guarded against double-attach. Verified server side separately: ttyd delivers
  macOptionClickForcesSelection:true in SET_PREFERENCES over the WS.
- Deeper selection fix: mousemove was never intercepted, so drag motions were reported to
  Claude Code (all-motion tracking) which panned its view — the "page drifts" symptom.
  Drag moves/release now re-targeted at the iframe document only (selection tracker hears
  them, app reporting doesn't). Hook attachment now flashes "CLI hooks active ✓" on load.
