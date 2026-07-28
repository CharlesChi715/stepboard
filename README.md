# StepBoard

Talk to Claude Code in a browser tab. That's the MVP.

No re-implemented chat UI: the page shows the **real** Claude Code CLI (served by
[ttyd](https://tsl0922.github.io/ttyd/) inside tmux), so input and output are exact by
construction — spinners, colors, permission prompts, everything.

## Use

```sh
stepboard-web              # serve Claude Code in the current directory
stepboard-web ~/my/project # ...or in a specific project
```

A tab opens at http://127.0.0.1:4870. Type there like you would in the terminal.
`Ctrl+C` in the launching terminal stops the server (the tmux session — and your
conversation — survives; rerun to reattach).

- Different agent: `STEPBOARD_AGENT=codex stepboard-web`
- Different port: `STEPBOARD_PORT=4999 stepboard-web`
- Attach from a normal terminal too: `tmux attach -t stepboard`

## Requirements

`brew install ttyd tmux` (and the `claude` CLI on PATH).

## Security

Bound to 127.0.0.1 only. A web terminal is a full shell — never expose the port.

## Roadmap

This is Phase 0 of a larger design (live context bar + tickable step board that replaces
plan mode) — see `docs/DESIGN.md`.
