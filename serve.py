from fastapi import APIRouter, FastAPI, HTTPException, Response, WebSocket
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel
from typing import Any
from urllib.parse import urlsplit
from websockets.asyncio.client import unix_connect
from websockets.exceptions import ConnectionClosed
import asyncio
import subprocess
import tempfile
import os
import sys
import json

app = FastAPI()
api = APIRouter(prefix="/api")

HERE = os.path.dirname(os.path.abspath(__file__))
SESSION = os.environ.get("SB_SESSION", "sb")
TTYD_SOCK = os.environ.get("SB_TTYD_SOCK") or os.path.join(tempfile.gettempdir(), "stepboard-1.sock")

PROMPTS = os.environ.get("SB_PROMPTS") or os.path.join(HERE, "prompts.json")
PROMPTS_IS_DEFAULT = not os.environ.get("SB_PROMPTS")

LOCAL = {"localhost", "127.0.0.1", "::1"}


def local_origin(origin):
    return origin is None or urlsplit(origin).hostname in LOCAL


app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1"])


@api.get("/config")
def config():
    # `prompts_default` is a safety interlock, not decoration: the test harness
    # wipes the store before every suite, and refuses to run against the real
    # one. Without this it could only find out by guessing at the path.
    return {"session": SESSION, "ttyd_sock": TTYD_SOCK,
            "prompts": PROMPTS, "prompts_default": PROMPTS_IS_DEFAULT}


def read_prompts():
    """→ (rev, doc). doc is None when there is no usable file yet, which the
    panel reads as 'never initialised' and answers by seeding. An empty list is
    a real state (you deleted every prompt), so it must not collapse to None."""
    try:
        with open(PROMPTS) as f:
            saved = json.load(f)
        return int(saved.get("rev", 0)), saved.get("doc")
    except (OSError, ValueError, AttributeError):
        return 0, None


@api.get("/prompts")
def get_prompts():
    rev, doc = read_prompts()
    return {"rev": rev, "doc": doc}


class Prompts(BaseModel):
    rev: int
    doc: Any


@api.put("/prompts")
def put_prompts(body: Prompts, response: Response):
    """Last-write-wins would silently eat a prompt whenever two sessions are
    open — which is now the expected case, since they share one file. So a PUT
    carries the rev it read, and a stale one is refused with the current doc
    rather than overwriting it."""
    rev, doc = read_prompts()
    if body.rev != rev:
        response.status_code = 409
        return {"rev": rev, "doc": doc}
    nxt = rev + 1
    tmp = PROMPTS + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"rev": nxt, "doc": body.doc}, f, indent=2)
    os.replace(tmp, PROMPTS)
    return {"rev": nxt}


@api.delete("/prompts")
def delete_prompts():
    """Reset: drop the file and the next load seeds from BUILTIN again."""
    try:
        os.remove(PROMPTS)
    except OSError:
        pass
    return {"ok": True}


class Send(BaseModel):
    text: str


PIECE = 400
FOCUS_IN = "\x1b[I"


def typed(text):
    if len(text) <= PIECE:
        return text[:-1] + "\\;" if text.endswith(";") else text
    parts = [text[i:i + PIECE] for i in range(0, len(text), PIECE)]
    return FOCUS_IN.join(parts) + FOCUS_IN


def tmux_keys(*keys):
    try:
        r = subprocess.run(["tmux", "send-keys", "-t", SESSION, *keys],
                           capture_output=True, text=True, timeout=5)
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "tmux did not answer")
    if r.returncode:
        raise HTTPException(503, r.stderr.strip() or "tmux send-keys failed")


@api.post("/send")
def send(body: Send):
    sys.stdout.write(f"POST /send  {body.text!r}\n")
    tmux_keys("-l", "--", typed(body.text))
    tmux_keys("Enter")
    return {"ok": True}


@api.websocket("/ws")
async def terminal(ws: WebSocket):
    if not local_origin(ws.headers.get("origin")):
        await ws.close(code=1008)
        return
    await ws.accept(subprotocol="tty")
    try:
        upstream = await unix_connect(TTYD_SOCK, "ws://localhost/ws", subprotocols=["tty"],
                                      compression=None, max_size=None, ping_interval=None)
    except OSError:
        await ws.close(code=4001, reason="ttyd unreachable")
        return

    async def browser_to_ttyd():
        while True:
            m = await ws.receive()
            if m["type"] == "websocket.disconnect":
                return
            await upstream.send(m["bytes"] if m.get("bytes") is not None else m["text"])

    async def ttyd_to_browser():
        try:
            async for m in upstream:
                await (ws.send_bytes(m) if isinstance(m, bytes) else ws.send_text(m))
        except ConnectionClosed:
            pass

    up = asyncio.create_task(browser_to_ttyd())
    down = asyncio.create_task(ttyd_to_browser())
    done, pending = await asyncio.wait({up, down}, return_when=asyncio.FIRST_COMPLETED)
    for t in pending:
        t.cancel()
    await upstream.close()
    if down in done:
        try:
            await ws.close(code=1000 if upstream.close_code == 1000 else 4000)
        except RuntimeError:
            pass


@app.middleware("http")
async def guard_and_cache(request, call_next):
    if request.method not in ("GET", "HEAD") and not local_origin(request.headers.get("origin")):
        return JSONResponse({"detail": "cross-site request refused"}, status_code=403)
    resp = await call_next(request)
    hashed = request.url.path.startswith("/assets/") and resp.status_code in (200, 304)
    resp.headers["Cache-Control"] = "max-age=31536000, immutable" if hashed else "no-store"
    return resp


app.include_router(api)

# must stay LAST: "/" catches everything, so the /api router has to be
# included first.
UI = os.path.join(HERE, "ui", "dist")
if not os.path.isdir(UI):
    raise SystemExit(f"no panel build at {UI}\nrun: cd ui && npm install && npm run build")
app.mount("/", StaticFiles(directory=UI, html=True))
