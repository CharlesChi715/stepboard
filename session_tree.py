"""Pull the branch structure out of a Claude Code session transcript.

A session is a JSONL file — one record per line — and every record carries a
`uuid` plus the `parentUuid` it answers, so the whole conversation is a tree.
Nearly always it is a straight line. A branch appears when you interrupt or
edit a prompt and send a different one: the abandoned prompt keeps its place in
the file forever, and the new one becomes a second child of the same parent.

THE TRAP: raw uuid/parentUuid forks are not branches. When the CLI issues
parallel tool calls, the assistant's `tool_use` record and the user's
`tool_result` record both claim the same parentUuid — so a naive fork count
finds 11 "branches" in a session that really has 1. A branch only counts when
two *human prompts* share the same nearest prompt-ancestor, which is what
`anchor()` below is for.
"""

import glob
import json
import os
import re

PROJECTS = os.path.expanduser("~/.claude/projects")

# A slash command arrives wrapped in tags; show "/ascii", not the whole envelope.
CMD = re.compile(r"<command-name>([^<]+)</command-name>")
# Injected context the user never typed — reminders, hook output, command stdout.
NOISE = re.compile(r"<(system-reminder|local-command-[a-z]+|command-[a-z-]+)>.*?</\1>", re.S)


def find_transcript(cwd, session_id=None, explicit=None):
    """Locate the session file, most exact source first.

    Returns (path, source). `source` is how sure we are:
      fixture — an explicit path (SB_TRANSCRIPT); the tests use this
      exact   — claude-s told us the session id, so this IS the left pane
      pending — we know the id, but the CLI has not written a line yet
      newest  — best guess by mtime; wrong if two CLIs share one project dir
      none    — nothing to show
    """
    if explicit:
        return (explicit, "fixture") if os.path.isfile(explicit) else (None, "none")
    if session_id:
        # glob every project dir, not just this cwd's: the CLI may be running in
        # a worktree, which Claude Code files under a different slug entirely
        hits = glob.glob(os.path.join(PROJECTS, "*", session_id + ".jsonl"))
        if hits:
            return hits[0], "exact"
        # The file only appears once you send the first prompt. Say so, rather
        # than falling through — "newest" here would show a STRANGER's session.
        return None, "pending"
    hits = glob.glob(os.path.join(PROJECTS, cwd.replace("/", "-"), "*.jsonl"))
    if hits:
        return max(hits, key=os.path.getmtime), "newest"
    return None, "none"


def _load(path):
    recs = []
    with open(path, errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                recs.append(json.loads(line))
            except ValueError:
                continue          # a half-written last line while the CLI is live
    return recs


def _text(rec):
    """The human-readable gist of one prompt."""
    content = (rec.get("message") or {}).get("content")
    if isinstance(content, str):
        raw = content
    elif isinstance(content, list):
        raw = " ".join(b.get("text", "") for b in content
                       if isinstance(b, dict) and b.get("type") == "text")
    else:
        raw = ""
    hit = CMD.search(raw)
    if hit:
        return "/" + hit.group(1).strip().lstrip("/")
    return " ".join(NOISE.sub("", raw).split())[:120]


def _is_prompt(rec):
    """A turn you actually typed — not a tool result, not a subagent's chatter."""
    if rec.get("type") != "user" or rec.get("isSidechain") or "uuid" not in rec:
        return False
    content = (rec.get("message") or {}).get("content")
    if isinstance(content, str):
        return bool(content.strip())
    if isinstance(content, list):
        # a user record holding only tool_result blocks has no text block
        return any(isinstance(b, dict) and b.get("type") == "text" for b in content)
    return False


def branch_tree(path):
    recs = _load(path)
    by_uuid = {r["uuid"]: r for r in recs if "uuid" in r}
    prompts = [r for r in recs if _is_prompt(r)]
    real = {r["uuid"] for r in prompts}

    def anchor(rec):
        """Nearest ancestor that is itself a prompt — skipping the tool traffic."""
        seen, p = set(), rec.get("parentUuid")
        while p and p not in real and p not in seen:
            seen.add(p)                       # a corrupt file must not spin forever
            p = (by_uuid.get(p) or {}).get("parentUuid")
        return p

    kids = {}
    for r in prompts:
        kids.setdefault(anchor(r), []).append(r)

    # Which way did the conversation actually go? Walk up from the newest record;
    # everything on that chain is the surviving path, everything else was dropped.
    live, seen = set(), set()
    node = next((r for r in reversed(recs) if "uuid" in r), None)
    while node and node["uuid"] not in seen:
        seen.add(node["uuid"])
        live.add(node["uuid"])
        node = by_uuid.get(node.get("parentUuid"))

    children = {}
    for r in recs:
        if "uuid" in r:
            children.setdefault(r.get("parentUuid"), []).append(r["uuid"])

    def turns(uuid):
        """How many human turns this branch got before it was abandoned."""
        n, stack, been = 0, [uuid], set()
        while stack:
            u = stack.pop()
            if u in been:
                continue
            been.add(u)
            if u in real:
                n += 1
            stack.extend(children.get(u, []))
        return n

    points = []
    for at, group in kids.items():
        if len(group) < 2:
            continue
        group.sort(key=lambda r: r.get("timestamp", ""))
        points.append({
            "at": (at or "root")[:8],
            "children": [{
                "id": r["uuid"][:8],
                "text": _text(r),
                "time": (r.get("timestamp") or "")[11:16],
                "live": r["uuid"] in live,
                "turns": turns(r["uuid"]),
            } for r in group],
        })
    points.sort(key=lambda p: p["children"][0]["time"])

    return {
        "prompts": len(prompts),
        "branches": len(points),
        "root": {"text": _text(prompts[0]), "time": (prompts[0].get("timestamp") or "")[11:16]}
                if prompts else None,
        "points": points,
    }
