# StepBoard — design spec

A control surface for Claude Code (and any CLI agent): an always-fresh context bar plus an
editable, tickable step board. Designed 2026-07-28 by synthesizing 3 competing architectures
(native-only / companion web board / full SDK harness) scored by a 3-lens judge panel.

## The four requirements

- **R1 — context bar**: fixed, always-visible session context (goal, active step, progress,
  blockers) that can never silently go stale.
- **R2 — many steps**: after every turn, a generous menu of 5–10 candidate next steps —
  not one monolithic plan.
- **R3 — edit + notes**: user can rewrite step titles and attach notes/comments per step;
  Claude must read and honor them before acting.
- **R4 — tick to run**: user approves steps by clicking checkboxes; Claude executes ONLY
  ticked steps; unticked steps are held, never deleted.

## Verdict (why this shape)

| Design | UX fidelity | Pragmatism | Longevity | Total |
|---|---|---|---|---|
| **board** (companion web board) | **8.5** | 6.5 | **9** | **24** |
| native (files + hooks only) | 7 | **8** | 7 | 22 |
| harness (full Agent SDK app) | 6.5 | 2 | 3 | 11.5 |

**Synthesis = board architecture, built in native order.** Layered design from "board"
(JSON state → CLI gateway → replaceable views), but Phase 1 ships the serverless core
(CLI + hooks + statusline + markdown mirror — the "native" design's strengths, a weekend
build with no daemon), and the web dashboard arrives in Phase 2 as an *optional* front-end
over the same state. The "harness" design was rejected (replaces the polished CLI with a
homemade app; SDK churn; auth/billing unknown) but its best ideas are grafted in:
start/complete step protocol, per-step note threads, hard tool-gating — done via hooks,
not the SDK.

## Architecture (4 layers, thin coupling at the top)

```
┌─ VIEWS (all replaceable) ──────────────────────────────────────────┐
│ terminal statusLine · web dashboard (P2) · .ai/steps-board.md mirror│
├─ WRITE GATEWAY ────────────────────────────────────────────────────┤
│ `stepboard` CLI — the ONLY writer. fcntl lock → mutate → rev+1 →   │
│ atomic tmp+rename. Enforces field ownership.                        │
├─ STATE (source of truth) ──────────────────────────────────────────┤
│ <project>/.ai/stepboard.json — versioned, append-only log           │
├─ AGENT INTEGRATION (the only Claude-specific layer) ───────────────┤
│ 1 skill (the contract) + hooks: SessionStart / UserPromptSubmit /  │
│ Stop / PostToolUse / PreToolUse(optional) + statusLine wiring       │
└────────────────────────────────────────────────────────────────────┘
```

**Invariants (do not erode these):**

1. **Single write gateway.** Claude never freeform-edits state; it calls `stepboard`
   subcommands (emits canonical format, kills the markdown-drift + clobber-race failure
   modes). The user writes via dashboard/tick-CLI/mirror — always through the same
   lock+atomic path.
2. **Field ownership.** Claude's write path may NEVER touch user-owned fields: `ticked`,
   user notes, user title edits. A user annotation can never be clobbered. Writes are
   `--as-claude` / `--as-user`; every write logs `who`.
3. **Prompt-composer invariant.** Everything Claude must honor (ticks, edits, notes, held
   list) is deterministically serialized by tooling and injected via hooks. Never depend
   on the agent remembering to re-read state.
4. **Agent-agnostic core.** Layers 1–3 work with any agent that can run shell commands
   (Codex-style agents drive it via an AGENTS.md contract). Only layer 4 is Claude-specific
   (~30 lines of wiring).

## Data model — `<project>/.ai/stepboard.json` (gitignored; mirror is committed)

```json
{
  "version": 42,
  "claude_seen_rev": 38,
  "turn_start_rev": 40,
  "context": {
    "goal": "Add CSV export to the report tool",
    "active_step": "s3",
    "progress": {"done": 2, "total": 6},
    "blockers": ["Which delimiter for EU locale?"]
  },
  "steps": [
    {"id": "s3", "title": "Write export_csv() in report/export.py",
     "status": "in_progress", "ticked": true, "origin": "claude",
     "user_edited_title": true, "proposed_turn": 6,
     "paths": ["report/**"],
     "notes": [{"author": "charles", "ts": "2026-07-28T10:42:11Z",
                "text": "use ; delimiter, don't touch export_pdf"},
               {"author": "claude", "ts": "2026-07-28T10:44:02Z",
                "text": "ack — ; delimiter, export_pdf untouched"}]},
    {"id": "s4", "title": "Add --csv flag to CLI",
     "status": "held", "ticked": false, "origin": "claude", "notes": []}
  ],
  "log": [
    {"rev": 41, "who": "user", "what": "ticked s3; note on s3"},
    {"rev": 42, "who": "user", "what": "added s9"}
  ]
}
```

- `status` ∈ `proposed | approved | held | in_progress | done | dropped` (dropped is
  recoverable, nothing is ever hard-deleted).
- Notes are **append-only threads** (author + timestamp), not a single string.
- `paths` (optional) = per-step allowlist checked by the PreToolUse gate.
- Rich schema now: later features become data-only changes, not migrations.

## The `stepboard` CLI (stdlib-only Python 3, one file ~300 lines)

Lives at `~/Documents/utilities/stepboard/`, symlinked into `~/Documents/bin`.

| Subcommand | Caller | Does |
|---|---|---|
| `init` | SessionStart hook | create state + mirror if missing |
| `set-context --goal --active --blockers` | Claude | update R1 fields |
| `propose --stdin` | Claude | append 5–10 candidate steps (JSON in), fuzzy-dedup vs existing titles |
| `start <id>` / `done <id>` / `drop <id>` | Claude | step lifecycle; `start` REFUSES unticked ids |
| `note <id> --text` | Claude | append to the step's thread (author=claude) |
| `tick <id...>` / `untick <id...>` | user (terminal) | user-owned tick writes, origin=user |
| `add --title` | user | user-authored step |
| `render-for-claude` | UserPromptSubmit hook | compact board + diff since `claude_seen_rev` (~2KB cap, done steps 1 line) → additionalContext JSON; advances `claude_seen_rev` |
| `check-turn` | Stop hook | freshness + generosity gate (below) |
| `statusline` | statusLine | 1-line ANSI bar from state |
| `export-md` | every write | regenerate `.ai/steps-board.md` mirror (read-only view) |
| `midturn-check` | PostToolUse hook (P3) | <50ms mtime+hash short-circuit; on user change, inject "MID-TURN USER EDIT: <diff>" |
| `gate` | PreToolUse hook (P3, off by default) | deny Edit/Write/Bash unless an approved step is `in_progress`; check `paths` for Edit/Write |
| `archive` / `doctor` / `serve` | user | archive old done steps / self-check chain / P2 dashboard server |

`doctor` (build in P1, not later): checks settings.json hook entries, statusLine wiring,
state parses, mirror fresh, last hook-fire timestamps — prints plain-English fixes.

## Hook wiring (`~/.claude/settings.json`)

- **SessionStart** — `stepboard init` + print compact board + one-line contract + dashboard
  URL to stdout (stdout-as-context is valid for SessionStart only).
- **UserPromptSubmit** — `stepboard render-for-claude` → `additionalContext`; stamps
  `turn_start_rev`. This is the guaranteed read-back channel: every tick/edit/note reaches
  Claude BEFORE it sees the prompt.
- **Stop** — `stepboard check-turn`, chained AFTER the existing `summary-reminder.sh` entry.
  Exit 2 + stderr reason blocks the stop when: no claude-origin rev since `turn_start_rev`,
  header unparsable, or < 3 pending candidates. **Leniency rules (mandatory):** skip when no
  tools ran this turn (pure Q&A); fire at most once per `prompt_id` (marker file) so it can
  never ping-pong.
- **PostToolUse** (P3) — `stepboard midturn-check` on all tools; must stay <50ms fast-path.
- **PostCompact** (P3) — re-inject the board so state survives compaction.
- **PreToolUse** (P3, opt-in) — `stepboard gate`: `permissionDecision:"deny"` with a reason
  listing approved ids. Ports the harness design's hard enforcement into hooks.

**statusLine** — `{"script": "stepboard statusline", "refreshInterval": 2000}` (no existing
statusline; no conflict). Example render:
`GOAL csv-export | ▸ s3 export_csv() | 2/6 done | 2 unread edits | HELD 3 | STALE turn 7`
"unread edits" = revs > `claude_seen_rev` (tells you whether typing "go" is needed);
STALE badge derived from rev log, not Claude's self-report.

## The skill contract (`~/.claude/skills/stepboard/SKILL.md`)

Claude must: mutate the board ONLY via `stepboard` subcommands · `set-context` after every
meaningful action · `propose` 5–10 candidates after each work chunk (alternatives and
nice-to-haves, not one plan) · execute ONLY ticked steps, in board order, `start` → work →
`done` · treat user notes as binding constraints and quote them when executing · never
delete held steps. Optional in-terminal flow: at decision points, offer top candidates via
AskUserQuestion multiSelect (4 options × 4 questions max) and transcribe answers via the CLI
— Claude-specific, cleanly droppable.

## Dashboard (Phase 2, optional front-end)

- `stepboard serve` — stdlib `http.server.ThreadingHTTPServer`, binds 127.0.0.1 only,
  per-project port hash. Routes: `GET /` (embedded index.html), `GET /state?since=<ver>`,
  `POST /step/<id>`, `POST /board`, `POST /send` (→ `tmux send-keys -t agent`, the input
  bridge into the real CLI). Stateless: rereads the file each request.
- `index.html` — vanilla JS/CSS, no build step: sticky context header (goal, active,
  progress bar, blockers, staleness badge), step rows (checkbox / inline-editable title /
  note thread / claude comment muted / status chip), add-step row, held + done sections,
  1s poll via `?since`.
- Server may die at any time with zero data loss — the file is the truth.

## Chat I/O — how typing and agent output work

The hard-looking problem ("send my typed input to Claude/Codex and display output exactly
as the CLI does") has three tiers. The trick in tier 1: **re-host the CLI, don't re-render it.**

- **Tier 0 (default, P1):** the terminal stays the chat surface; the browser board is a
  side channel. Nothing to build; fidelity is trivially perfect.
- **Tier 1 (recommended when chat-in-browser is wanted, "P2.5", ~1–2h):** embed the *real*
  CLI in the dashboard via a web terminal. Run the agent inside tmux and serve it with
  ttyd (`brew install ttyd`, v1.7.7; tmux already installed):
  `ttyd -W -p 4871 tmux new -A -s agent claude`
  The dashboard adds an `<iframe>` (or side-by-side pane) pointing at `:4871`. Because the
  pane IS a terminal running the actual CLI (ttyd = xterm.js over WebSocket), input goes to
  the real input bar and output is exact by construction — spinners, colors, permission
  prompts, plan mode, everything. Works unchanged for Claude Code and Codex (swap the
  command). Same tmux session is also reachable from iTerm (`tmux attach -t agent`) and —
  via Tailscale — from the iPhone/MacBook.
- **Tier 2 (rejected):** headless piping (`claude -p --output-format stream-json`, Agent
  SDK, `codex exec`) and re-rendering output in custom chat bubbles. This is the harness
  design the judges killed: you own markdown/tool-call/permission rendering forever, and
  "exactly like the CLI" is unreachable. Only revisit if custom chat rendering becomes a
  goal in itself.

Security note for tier 1: bind ttyd to 127.0.0.1 (`-i lo0`); it is a full shell to anyone
who can reach the port.

## Keyboard & input customization — three light layers

Goal: macOS-like input navigation (Cmd/Option/Shift + arrows) and custom "press keys →
action" hotkeys (e.g. regenerate), without heavy machinery.

**Layer A — native Claude Code (zero code).** Verified against current docs:
- `/keybindings` opens `~/.claude/keybindings.json` — 80+ rebindable actions across 22
  contexts (`chat:submit`, `app:toggleTodos`, …), `cmd`/`ctrl`/`alt` modifiers, chords,
  hot-reloaded on save. This IS the "little bit customizable" layer for built-in actions.
  Reserved: Ctrl+C/D/M; avoid Ctrl+B (tmux prefix — we use tmux).
- One-time terminal setup: `/terminal-setup` + iTerm2 "Option as Esc+" gives word-jump
  (Option+B/F), Option+Enter newline; Shift+Enter is native in iTerm2. Built-in editing:
  Ctrl+A/E line start/end, Ctrl+W delete word, Ctrl+K/U kill, Ctrl+Y yank, Ctrl+_ undo.
- Optional: iTerm2 "Natural Text Editing" preset maps Cmd/Option+arrows to the readline
  keys (macOS-feel *navigation*; true Shift+arrow *selection* doesn't exist in a TUI input
  — vim mode's VISUAL is the closest, `editorMode: "vim"`).
- No regenerate action exists in the keybindings action list; no built-in
  regenerate/retry affordance at all (double-Esc on an empty prompt opens the rewind
  menu — the nearest thing). Hence layers B/C.

**Layer B — macro hotkeys via tmux (one user-editable conf).** The agent already runs in
tmux (P2.5), so `~/.config/stepboard/keys.conf` (sourced by the launcher) maps keys to
canned input, working identically in iTerm and the browser pane:
```
bind-key -n F5 send-keys -t agent "Regenerate your last answer; fix what my notes flagged." Enter
bind-key -n F6 send-keys -t agent "go" Enter
bind-key -n F7 send-keys -t agent Escape Escape   # opens the rewind menu
```
Editing this file = adding a hotkey. This is the "press some keys → regenerate" mechanism.

**Layer C — dashboard input bar + keymap.json (P2).** The dashboard gets a real HTML input
box — which means **native macOS text editing for free**: Cmd/Option/Shift+arrows,
selection, dictation, all standard. Enter → `POST /send` → server runs
`tmux send-keys -t agent <text> Enter`, typing it into the real CLI (output still renders
in the embedded exact-CLI pane). Board hotkeys live in a user-editable
`~/.config/stepboard/keymap.json`, e.g. `{"F5": "macro:regenerate", "g": "send:go",
"t": "tick-focused-step"}`. This also removes the "type go in the terminal" friction —
one keystroke or click on the board runs the ticked steps.

Gotcha: inside the embedded browser terminal pane some Cmd combos belong to the browser
(Cmd+Left = back). Heavy text editing happens in the dashboard input box or iTerm; the
embedded pane is for reading and quick keys.

## Build plan

| Phase | Hours | Ships |
|---|---|---|
| **P1 — serverless core** | ~11 | CLI + state + mirror + statusline + skill + 3 hooks (SessionStart/UserPromptSubmit/Stop) + tick/untick + doctor. Full R1–R4 loop works: click checkboxes in the Obsidian-rendered mirror or `stepboard tick`, notes honored, bar live. |
| **P2 — web board** | ~8 | serve + dashboard page. True click-to-tick, inline editing, note threads in the browser. |
| **P2.5 — chat pane (optional)** | ~1–2 | ttyd + tmux embed of the real CLI beside the board — exact CLI I/O in the browser, agent-agnostic. |
| **P3 — hardening** | ~6 | mid-turn edit pickup (PostToolUse), PreToolUse per-step gate + paths, PostCompact re-inject, archive, AskUserQuestion flow tuning. |

Total ≈ 25h with AI pair-programming; usable daily driver after P1.

## Honest limits & risks

- **Turn-boundary latency**: ticks made while Claude is idle reach it on the next message —
  a one-word "go" is required. No push channel into an idle CLI session exists. (Mid-turn
  edits ARE picked up in P3 via PostToolUse.)
- **Compliance drift**: "execute only ticked" is contract + injection + Stop backstop in P1;
  hard enforcement arrives with the P3 gate. Expect 2–3 sessions of wording tuning.
- **Hook debugging is the fiddly part** (Stop-chain ordering with summary-reminder.sh needs
  a live check). `stepboard doctor` + a log file are the antidote.
- **One live session per project** (two sessions would fight over the file) — documented,
  not solved. `session_id` fields exist if this ever needs solving.
- **Token cost**: ~500–800 tokens/turn injected, capped ~2KB; `archive` keeps long
  projects flat.
- **Plan-mode interplay**: this workflow *replaces* plan mode (in plan mode every board
  write would prompt). Don't run both.
- Needs on-machine verification: statusLine multi-line rendering on this CLI version,
  Stop-chain ordering, PostToolUse additionalContext mid-turn delivery.

## Decisions log

- Markdown vs JSON state: **JSON** (schema evolution, no regex grammar to drift) + a
  generated **markdown mirror** for git diffs, grep, Obsidian/mobile viewing, and emergency
  editing when tooling is down.
- Server in v1: **no** (pragmatism judge: daemon triage is the worst failure class for a
  DevOps-1 operator). Dashboard is additive in P2.
- Full SDK harness: **rejected** — loses /rewind, permission modes, skills, updates;
  unresolved subscription-vs-API-billing question; permanent maintenance burden.
- Chat in the browser: **re-host, don't re-render** — embed the real CLI via ttyd+tmux
  (exact output by construction) instead of piping headless output into custom chat bubbles.
- Keyboard customization: **native keybindings.json for built-in actions; tmux macros +
  dashboard keymap.json for everything Claude Code can't bind** (regenerate, canned
  prompts). Native macOS text editing comes from the dashboard's HTML input, not from
  fighting the terminal.
