from fastapi import FastAPI                      # the framework
from fastapi.staticfiles import StaticFiles      # its static-file server (your old do_GET)
from pydantic import BaseModel                   # JSON-contract library FastAPI uses
import subprocess                                # unchanged — the tmux door
import os                                        # to read the env vars claude-s passes down

app = FastAPI()                                  # THE app — what "serve:app" points at

SESSION = os.environ.get("SB_SESSION", "sb")     # which tmux session /send targets
TTYD_PORT = os.environ.get("SB_TTYD_PORT", "7681")  # which port the iframe should load

@app.get("/config")                              # the browser asks: "which ttyd am I paired with?"
def config():
    return {"ttyd_port": TTYD_PORT, "session": SESSION}

class Send(BaseModel):                           # declares what /send's body must be:
    text: str                                    #   {"text": "some string"}

@app.post("/send")                               # route: POST /send → the function below
def send(body: Send):                            # body arrives already parsed + validated
    print('----- POST /send -----')                               # log it to the console
    print(f"body: {body}")                       # log it to the console
    subprocess.run(["tmux", "send-keys", "-t", SESSION, "-l", "--", body.text])
    subprocess.run(["tmux", "send-keys", "-t", SESSION, "Enter"])
    return {"ok": True}                          # auto-JSON, status 200

# must stay LAST: "/" catches everything, so /send has to be registered first
app.mount("/", StaticFiles(directory="web", html=True))