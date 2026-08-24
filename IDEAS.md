# IDEAS — project notebook

> Help me complete my ideas step by step by modifying this file. 

## 1. Raw ideas  (brain-dump — write freely here)

> How this works: brain-dump into section 1 whenever, messy is fine.

- Right pane is for customize prompts. it should contain:
- 1. input bar for sending the text to claude
- 2. sections (the content of them appends after prompt)
    S1: Reply in at most {n} sentences.
    S2: Reply in at most {n} words.
    S3: Use ASCII diagram/chart/table where it helps.
    S4: When editing files, change at most {n} lines at a time, then pause so I can review.
  - (a) only one length constraint active at a time (recommended), (b) allow both and let claude reconcile, (c) last-edited wins. Your call.
  - (b). The empty rule: a blank number should mean this section appends nothing.

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

- [ ]

## 4. Open questions  (things you haven't decided yet)

-

## 5. Parked  (ideas set aside — kept, never deleted)

-
