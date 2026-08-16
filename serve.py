from fastapi import FastAPI                      # the framework
from fastapi.staticfiles import StaticFiles      # its static-file server (your old do_GET)
from pydantic import BaseModel                   # JSON-contract library FastAPI uses
import subprocess                                # unchanged — the tmux door

app = FastAPI()                                  # THE app — what "serve:app" points at

class Send(BaseModel):                           # declares what /send's body must be:
    text: str                                    #   {"text": "some string"}

@app.post("/send")                               # route: POST /send → the function below
def send(body: Send):                            # body arrives already parsed + validated
    print('----- POST /send -----')                               # log it to the console
    print(f"body: {body}")                       # log it to the console
    subprocess.run(["tmux", "send-keys", "-t", "sb", "-l", "--", body.text])
    subprocess.run(["tmux", "send-keys", "-t", "sb", "Enter"])
    return {"ok": True}                          # auto-JSON, status 200

# must stay LAST: "/" catches everything, so /send has to be registered first
app.mount("/", StaticFiles(directory="web", html=True))