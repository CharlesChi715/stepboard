# Browser tests

Headless checks that the panel keeps behaving. They drive a real browser, a
real ttyd and a real tmux session — no mocks except `/api/send`, which is
intercepted so nothing is ever typed into your CLI.

| file | what it covers |
| --- | --- |
| `harness.mjs` | shared setup: launch, deterministic `until()`/`load()` waits, PASS/FAIL log, summary, exit code |
| `proxy.mjs` | 6 checks — every path the panel calls is under the one proxied `/api` prefix. No browser, no stack |
| `typed.py` | 6 checks — how `/api/send` types text: trailing `;`, 400-char pieces for long messages. No stack |
| `security.mjs` | 6 checks — foreign Host / Origin are refused on the API and the terminal socket. No browser |
| `parity.mjs` | 83 checks — shortcuts, composer, raw `/cmd`, ⌥1–9, constraints, history, prompts (make · edit · move · delete · restore · the server store · an unreadable store) |
| `regressions.mjs` | 12 checks — one per bug that actually bit, plus the "what's new" popup |
| `drag-select.mjs` | 8 checks — drag selects text even with mouse reporting on; clicks and hover still reach the app |
| `resilience.mjs` | 7 checks — dropped socket reconnects, claude exit waits for ⏎, a failed send keeps the draft |

```sh
# once
npm install && npx playwright install chromium webkit

# 1. a throwaway terminal + panel, so your live claude session is untouched.
# SB_PROMPTS is NOT optional: the harness wipes the prompts store before every
# suite, and refuses to start if the stack is pointed at your real prompts.json.
ttyd -W -i "$TMPDIR/sb-test.sock" -s KILL tmux new -A -s sbtest bash &
SB_TTYD_SOCK="$TMPDIR/sb-test.sock" SB_SESSION=sbtest SB_PROMPTS=/tmp/sb-prompts-test.json \
  uv run uvicorn serve:app --port 8011 &

# 2. lint + build (pretest), then every suite; exit 1 if any check failed (~10 s)
npm test
npm run test:webkit        # the same on WebKit, Safari's engine

# …or one at a time
node tests/parity.mjs
```

`SB_BASE` overrides the panel URL, `SB_BROWSER=webkit` the engine, `CHROME_PATH`
the Chromium binary. The harness refuses to run if the stack is not serving this
folder's `ui/dist`, and prints how long the terminal took to show text.
A failing check exits non-zero, so this is safe to wire into a git hook or CI.
