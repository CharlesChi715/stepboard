# Browser tests

Headless checks that the panel keeps behaving. They drive a real Chromium, a
real ttyd and a real tmux session — no mocks except `/send`, which is
intercepted so nothing is ever typed into your CLI.

| file | what it covers |
| --- | --- |
| `harness.mjs` | shared setup: launch, PASS/FAIL log, summary, exit code |
| `parity.mjs` | 47 checks — shortcuts, composer, constraints, history, prompts (making, editing, deleting) |
| `regressions.mjs` | 5 checks — one per bug that actually bit |
| `drag-select.mjs` | 6 checks — drag selects text even with mouse reporting on |

```sh
# once
npm install && npx playwright install chromium

# 1. a throwaway terminal + panel, so your live claude session is untouched
ttyd -W -i lo0 -p 7691 tmux new -A -s sbtest bash &
SB_TTYD_PORT=7691 SB_SESSION=sbtest uv run uvicorn serve:app --port 8011 &

# 2. all three suites (stops at the first failing suite)
npm test

# …or one at a time
node tests/parity.mjs
```

`SB_BASE` overrides the panel URL, `CHROME_PATH` the Chromium binary.
A failing check exits non-zero, so this is safe to wire into a git hook or CI.
