# serve.py — the bridge between the panel page and the claude session.
# One process, two jobs:
#   GET  → serve files from web/  (the panel page itself)
#   POST → take {"text": ...} sent by the page and TYPE it into tmux
import json, subprocess
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# SimpleHTTPRequestHandler already implements do_GET (serving files);
# we only add the one thing it lacks — a POST handler.
class H(SimpleHTTPRequestHandler):
    def do_POST(self):  # http.server parses each POST, then calls this method
        # the body arrives as raw bytes; Content-Length says how many to read
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        print("------------------------")
        print(f"POST {self.path} → {body['text']!r}")
        # THE key line — the browser can't run programs, but this server can:
        # -t sb = target session · -l = type literally · -- = end of options
        subprocess.run(["tmux", "send-keys", "-t", "sb", "-l", "--", body["text"]])
        subprocess.run(["tmux", "send-keys", "-t", "sb", "Enter"])  # press ⏎
        # reply so the page's fetch() knows the click worked
        self.send_response(200); self.end_headers(); self.wfile.write(b"ok")

# Read the last line inside-out, in 4 pieces:
#
#   ThreadingHTTPServer( ("127.0.0.1", 8000), partial(H, directory="web") ).serve_forever()
#                        ─────────1─────────  ────────────2─────────────   ───────4───────
#                        ──────────────────────3───────────────────────
#
# 1. ("127.0.0.1", 8000) — a tuple: the address to listen on (host, port);
#      127.0.0.1 = this Mac only, same safety rule as ttyd's -i lo0
# 2. partial(H, directory="web") — the server needs a handler FACTORY that it
#      calls to build one fresh H per request; plain H wouldn't know where the
#      files live, so functools.partial pre-fills an argument: calling this
#      wrapper later runs exactly H(<request args>, directory="web")
# 3. ThreadingHTTPServer(1, 2) — builds the server object and binds the port;
#      "Threading" = every request gets its own thread, so requests can overlap
# 4. .serve_forever() — the program now blocks in an endless loop:
#      wait for a request → build an H via 2 → dispatch to do_GET or do_POST;
#      only Ctrl+C ends it (that's why the terminal running it looks "stuck")
ThreadingHTTPServer(("127.0.0.1", 8000), partial(H, directory="web")).serve_forever()
