#!/usr/bin/env bash
# smoke.sh — 10-second regression check for StepBoard.
# Checks the RUNNING servers (stepboard-term + stepboard-view) plus an isolated
# /send test against a throwaway tmux session (never touches your real one).
set -u
VIEW="http://127.0.0.1:${STEPBOARD_VIEW_PORT:-4871}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); echo "  ✓ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✗ $1"; }
check() { # check <description> <command...>
  local desc="$1"; shift
  if "$@" > /dev/null 2>&1; then ok "$desc"; else bad "$desc"; fi
}

echo "— live servers —"
check "view /health responds"        curl -sf "$VIEW/health"
curl -s "$VIEW/" | grep -q StepBoard          && ok "page serves"        || bad "page serves"
curl -s -D - -o /dev/null "$VIEW/" | grep -qi "cache-control: no-store" && ok "no-store header" || bad "no-store header"
check "style.css serves"             curl -sf "$VIEW/style.css"
check "app.js serves"                curl -sf "$VIEW/app.js"
curl -s "$VIEW/digest" | grep -q '"path"'     && ok "digest endpoint"     || bad "digest endpoint"
curl -s "$VIEW/term/" | grep -q ttyd          && ok "terminal proxied"   || bad "terminal proxied (is stepboard-term running?)"

echo "— WebSocket tunnel —"
WS=$(python3 - "$VIEW" << 'EOF'
import base64, os, socket, sys, time
host, port = sys.argv[1].split("//")[1].split(":")
s = socket.create_connection((host, int(port)), timeout=5)
key = base64.b64encode(os.urandom(16)).decode()
s.sendall((f"GET /term/ws HTTP/1.1\r\nHost: {host}:{port}\r\nConnection: Upgrade\r\n"
           f"Upgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: {key}\r\n"
           f"Sec-WebSocket-Protocol: tty\r\n\r\n").encode())
time.sleep(0.5)
print("101" if b"101" in s.recv(1024) else "no")
s.close()
EOF
)
[ "$WS" = "101" ] && ok "WS handshake 101 via proxy" || bad "WS handshake via proxy"

echo "— isolated /send test (throwaway session) —"
TEST_PORT=4897
tmux new-session -d -s sbsmoke 'cat' 2>/dev/null
STEPBOARD_SESSION=sbsmoke STEPBOARD_VIEW_PORT=$TEST_PORT \
  "$REPO/bin/stepboard-view" --no-open > /dev/null 2>&1 &
SRV=$!
sleep 1
T="http://127.0.0.1:$TEST_PORT"
curl -s -X POST "$T/send" -d '{"text":"smoke -- with -- dashes"}' | grep -q '"ok"' \
  && ok "/send accepted" || bad "/send accepted"
sleep 1
tmux capture-pane -t sbsmoke -p 2>/dev/null | grep -q "smoke -- with -- dashes" \
  && ok "text reached the tmux session" || bad "text reached the tmux session"
curl -s -X POST "$T/send" -d '{"text":"  "}'      | grep -q error && ok "empty text rejected" || bad "empty text rejected"
curl -s -X POST "$T/key"  -d '{"key":"C-c"}'      | grep -q error && ok "bad key rejected"    || bad "bad key rejected"
{ kill $SRV && wait $SRV; } 2>/dev/null
tmux kill-session -t sbsmoke 2>/dev/null

echo "— code health —"
if command -v node > /dev/null; then
  check "app.js parses (node --check)" node --check "$REPO/web/app.js"
else
  echo "  - node not found, JS check skipped"
fi
check "stepboard-view compiles"      python3 -m py_compile "$REPO/bin/stepboard-view"
check "stepboard-term bash syntax"   bash -n "$REPO/bin/stepboard-term"

echo
echo "passed $PASS, failed $FAIL"
[ $FAIL -eq 0 ]
