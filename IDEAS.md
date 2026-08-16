# IDEAS — project notebook

> How this works: brain-dump into section 1 whenever, messy is fine.
> When you want feedback, tell Claude "polish" — we distill upward together:
> raw ideas → pitch → requirements. Nothing gets deleted; git keeps history.

## 1. Raw ideas  (brain-dump — write freely here)

- I'm thinking of the Claude Code learning step, which that Claude Code CLI appears in the webpage, I think through TTYD, right? And well, that TTYD part is like a very developed product,
 I can just keep learning it and take it as granted and next part is I want to build like my own pane, like my own panel where I can customize my input and customize the prompt like there's some buttons in the panel where I can click them to automatically
 add some prompts or make some prompts to fix some prompts to fix some tests at the end of the prompt which I think is like very feasible I can just make that direct button like add a function of that like on click or something like that
 - and next part is I can click that and check the function of append the text which is the part I know how to do and the next is whenever I type some input in the customized input area and append that text and next steps, oh, the key, the core steps
 I have no idea how to do is how to send that text into the TTYDD CLI input area

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
