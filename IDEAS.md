# IDEAS — project notebook

> How this works: brain-dump into section 1 whenever, messy is fine.
> When you want feedback, tell Claude "polish" — we distill upward together:
> raw ideas → pitch → requirements. Nothing gets deleted; git keeps history.

## 1. Raw ideas  (brain-dump — write freely here)

- Right pane is for customize prompts. it should contain:
- 1. input bar for sending the text to claude
- 2. sections (the content of them appends after prompt)
    S1: Reply in at most {n} sentences.
    S2: Reply in at most {n} words.
    S3: Use an ASCII chart or table where it helps.
    S4: When editing files, change at most {n} lines at a time, then pause so I can review.

## 2. ASCII Workflow map

```
       TYPING DOOR (input flow)          VIEW DOOR (output flow)
you ─▶ [buttons]                         [iframe]  ◀── what you see
        │ POST /send {"text": …}             ▲
        ▼   HTTP request + JSON              │ WebSocket: screen bytes
    [serve.py]                           [ttyd :7681]
     = ThreadingHTTPServer                   ▲
        │ subprocess call:                   │ mirrors the live screen
        ▼   tmux send-keys -t sb …           │
    [tmux "sb"] ─────────────────────────────┘
        │ injects keystrokes       one real session — both doors meet here
        ▼
    [claude] ── prints output onto the tmux screen ──▶ up the view door
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

## 4. Open questions  (things you haven't decided yet)

-

## 5. Parked  (ideas set aside — kept, never deleted)

-
