# IDEAS — project notebook

> How this works: brain-dump into section 1 whenever, messy is fine.
> When you want feedback, tell Claude "polish" — we distill upward together:
> raw ideas → pitch → requirements. Nothing gets deleted; git keeps history.

## 1. Raw ideas  (brain-dump — write freely here)

> ↓ this batch is distilled into §3 and shipped (panel v2) — kept for history

- Right pane is for customize prompts. it should contain:
- 1. input bar for sending the text to claude
- 2. sections (the content of them appends after prompt)
    S1: Reply in at most {n} sentences.
    S2: Reply in at most {n} words.
    S3: Use an ASCII chart or table where it helps.
    S4: When editing files, change at most {n} lines at a time, then pause so I can review.

## 2. ASCII Workflow map

```
       TYPING DOOR (input flow)              VIEW DOOR (output flow)
you ─▶ [input bar + constraint composer]     [iframe]  ◀── what you see
        │ compose(): message + clauses           ▲ src ◀── GET /config
        │ POST /send {"text": …}                 │        {ttyd_port, session}
        ▼   HTTP request + JSON                  │ WebSocket: screen bytes
    [serve.py]                               [ttyd :SB_TTYD_PORT (7681)]
     = FastAPI app  (env picks the target)       ▲
        │ subprocess call:                       │ mirrors the live screen
        ▼   tmux send-keys -t SB_SESSION …       │
    [tmux SB_SESSION ("sb")] ────────────────────┘
        │ injects keystrokes       one real session — both doors meet here
        ▼
    [claude] ── prints output onto the tmux screen ──▶ up the view door

    multi-session: launch N panels, each with its own SB_SESSION + SB_TTYD_PORT
    env pair — every panel asks /config which ttyd/tmux it is paired with.
```

## 3. Must do  (requirements, as they become clear)

- [x] Panel v2 — prompt composer (agreed + built 2026-08-16):
  - input bar sends the MESSAGE; constraint sections append CLAUSES after it
  - one length unit at a time (number + sentences/words radio)   ← decision (a)
  - blank number / unticked box = that section appends nothing   ← empty rule
  - clauses phrased "at most N", one per line
- Example composed prompt:
  "explain serve.py

  Reply in at most 5 sentences.
  Use an ASCII chart or table where it helps.
  When editing files, change at most 20 lines at a time, then pause so I can review."
- [x] Message history — last 5 input-bar texts, ↑/↓ recall, kept in localStorage
- [x] Multi-session — /config endpoint + SB_SESSION / SB_TTYD_PORT envs (serve.py is now FastAPI)
- [x] Prompt template buttons (toggle to arm, appended at send) + edits fieldset color-coded by lines limit

## 4. Open questions  (things you haven't decided yet)

-

## 5. Parked  (ideas set aside — kept, never deleted)

-
