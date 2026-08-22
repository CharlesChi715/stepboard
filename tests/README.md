# Browser tests

Headless checks that the panel still behaves like the vanilla page it replaced.
They drive a real Chromium, a real ttyd and a real tmux session — no mocks
except `/send`, which is intercepted so nothing is typed into your CLI.

```sh
# 1. a throwaway terminal + panel, so your live claude session is untouched
ttyd -W -i lo0 -p 7691 tmux new -A -s sbtest bash &
SB_TTYD_PORT=7691 SB_SESSION=sbtest uv run uvicorn serve:app --port 8011 &

# 2. run them (needs `npm i playwright` once, browsers via `npx playwright install`)
node tests/parity.mjs        # 23 checks: shortcuts, composer, history, prompts
node tests/regressions.mjs   #  7 checks: bugs found by the parity audit
```

`SB_BASE` overrides the panel URL, `CHROME_PATH` the Chromium binary.
