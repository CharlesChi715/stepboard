from fastapi import FastAPI, Response            # the framework
from fastapi.staticfiles import StaticFiles      # its static-file server (your old do_GET)
from pydantic import BaseModel                   # JSON-contract library FastAPI uses
from typing import Any                           # the prompts doc is opaque to this file
import subprocess                                # unchanged — the tmux door
import os                                        # to read the env vars claude-s passes down
import sys                                       # for the single-write log line in /send
import json                                      # the prompts store is one JSON file

app = FastAPI()                                  # THE app — what "serve:app" points at

HERE = os.path.dirname(os.path.abspath(__file__))
SESSION = os.environ.get("SB_SESSION", "sb")     # which tmux session /send targets
TTYD_PORT = os.environ.get("SB_TTYD_PORT", "7681")  # which port the terminal should talk to

# The prompts store. One file, shared by every session and every port — which is
# the whole point of moving it off localStorage, where each origin
# (localhost:5173, localhost:5174, 127.0.0.1:8001 …) had its own private copy.
# SB_PROMPTS overrides the path; the tests MUST set it, or a test run would
# rewrite your real prompts.
PROMPTS = os.environ.get("SB_PROMPTS") or os.path.join(HERE, "prompts.json")
PROMPTS_IS_DEFAULT = not os.environ.get("SB_PROMPTS")

@app.get("/config")                              # the browser asks: "which ttyd am I paired with?"
def config():
    # `prompts_default` is a safety interlock, not decoration: the test harness
    # wipes the store before every suite, and refuses to run against the real
    # one. Without this it could only find out by guessing at the path.
    return {"ttyd_port": TTYD_PORT, "session": SESSION,
            "prompts": PROMPTS, "prompts_default": PROMPTS_IS_DEFAULT}

# The panel owns the SHAPE of a prompts doc; this file only stores it. That is
# deliberate — the seed list still lives in ui/src/hooks/usePrompts.js, so
# adding a prompt to the app stays a one-file change.
def read_prompts():
    """→ (rev, doc). doc is None when there is no usable file yet, which the
    panel reads as 'never initialised' and answers by seeding. An empty list is
    a real state (you deleted every prompt), so it must not collapse to None."""
    try:
        with open(PROMPTS) as f:
            saved = json.load(f)
        return int(saved.get("rev", 0)), saved.get("doc")
    except (OSError, ValueError, AttributeError):
        return 0, None                           # absent, unreadable, or garbage

@app.get("/prompts")
def get_prompts():
    rev, doc = read_prompts()
    return {"rev": rev, "doc": doc}

class Prompts(BaseModel):
    rev: int                                     # the rev the panel believes it is editing
    doc: Any                                     # opaque: {list, seeded}, checked by the panel

@app.put("/prompts")
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
    # tmp + rename: a crash mid-write leaves the old file intact instead of a
    # half-written one. os.replace is atomic within a filesystem.
    tmp = PROMPTS + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"rev": nxt, "doc": body.doc}, f, indent=2)
    os.replace(tmp, PROMPTS)
    return {"rev": nxt}

@app.delete("/prompts")
def delete_prompts():
    """Reset: drop the file and the next load seeds from BUILTIN again."""
    try:
        os.remove(PROMPTS)
    except OSError:
        pass                                     # already gone is the state we wanted
    return {"ok": True}

@app.middleware("http")                          # dev panel: never serve a stale page
async def no_cache(request, call_next):          # (Safari loves to keep old JS around)
    resp = await call_next(request)
    resp.headers["Cache-Control"] = "no-store"
    return resp

class Send(BaseModel):                           # declares what /send's body must be:
    text: str                                    #   {"text": "some string"}

@app.post("/send")                               # route: POST /send → the function below
def send(body: Send):                            # body arrives already parsed + validated
    # one write, not print(): under claude-s stdout is an unbuffered pipe shared
    # with uvicorn's access log, and print()'s separate '\n' write lets a
    # concurrent log record splice into the middle of this line
    sys.stdout.write(f"POST /send  {body.text!r}\n")
    subprocess.run(["tmux", "send-keys", "-t", SESSION, "-l", "--", body.text])
    subprocess.run(["tmux", "send-keys", "-t", SESSION, "Enter"])
    return {"ok": True}                          # auto-JSON, status 200

# must stay LAST: "/" catches everything, so /config, /send and /prompts have to
# be registered first.
# Absolute path, so the panel is found whichever directory uvicorn was started from.
UI = os.path.join(HERE, "ui", "dist")
if not os.path.isdir(UI):                        # a missing build is a setup mistake, not a 404 —
    raise SystemExit(f"no panel build at {UI}\nrun: cd ui && npm install && npm run build")
app.mount("/", StaticFiles(directory=UI, html=True))
