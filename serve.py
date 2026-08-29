from fastapi import FastAPI                      # the framework
from fastapi.staticfiles import StaticFiles      # its static-file server (your old do_GET)
from pydantic import BaseModel                   # JSON-contract library FastAPI uses
import subprocess                                # unchanged — the tmux door
import os                                        # to read the env vars claude-s passes down
import sys                                       # for the single-write log line in /send
import session_tree                              # transcript → branch structure

app = FastAPI()                                  # THE app — what "serve:app" points at

SESSION = os.environ.get("SB_SESSION", "sb")     # which tmux session /send targets
TTYD_PORT = os.environ.get("SB_TTYD_PORT", "7681")  # which port the terminal should talk to
# The CLI's own session id. claude-s picks it and hands the same value to BOTH
# `claude --session-id` and this server, so the panel reads the exact transcript
# the left pane is writing. Guessing by mtime is not good enough: sb1 and sb2
# both run in the repo root, so they share one project directory.
CLAUDE_SESSION = os.environ.get("SB_CLAUDE_SESSION")
TRANSCRIPT = os.environ.get("SB_TRANSCRIPT")     # explicit override — the tests use it

@app.get("/config")                              # the browser asks: "which ttyd am I paired with?"
def config():
    return {"ttyd_port": TTYD_PORT, "session": SESSION}

@app.get("/branches")                            # the panel asks: "where did this session fork?"
def branches():
    path, source = session_tree.find_transcript(os.getcwd(), CLAUDE_SESSION, TRANSCRIPT)
    if not path:
        return {"source": source, "prompts": 0, "branches": 0, "root": None, "points": []}
    data = session_tree.branch_tree(path)
    data["source"] = source                      # the panel says so when this is a guess
    data["file"] = os.path.basename(path)[:8]
    return data

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

# must stay LAST: "/" catches everything, so /config and /send have to be registered first.
# Absolute path, so the panel is found whichever directory uvicorn was started from.
UI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ui", "dist")
if not os.path.isdir(UI):                        # a missing build is a setup mistake, not a 404 —
    raise SystemExit(f"no panel build at {UI}\nrun: cd ui && npm install && npm run build")
app.mount("/", StaticFiles(directory=UI, html=True))
