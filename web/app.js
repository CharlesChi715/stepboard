/* ── Help levels: most-auto → you-as-master. Edit names/prompts freely. ── */
const MODES = [
  { name: "✈️ Autopilot",
    prompt: "MODE: Autopilot. From now on work autonomously end-to-end: plan briefly, then execute the whole series of tasks without waiting for me. Make small decisions yourself and note them in one line each. Only stop for destructive/irreversible actions or genuinely major direction choices. Finish with a concise summary of what you did and decided." },
  { name: "🤝 Copilot",
    prompt: "MODE: Copilot. From now on work in meaningful chunks. After each chunk, stop: report what you did and what you propose next in 2-3 bullets, then wait for my go. Decide trivial things yourself; ask me about anything that shapes the outcome." },
  { name: "🧭 Advisor",
    prompt: "MODE: Advisor. From now on, before doing anything, propose the 2-4 possible next steps, each with one-line pros and cons, and mark which you recommend. Wait for my choice. Execute ONLY the step I pick, then stop and propose again. Never chain steps without asking." },
  { name: "🎓 Mentor",
    prompt: "MODE: Mentor. From now on do NOT do the work for me — I do everything myself; you are a senior engineer mentoring me. Go slowly, one small step at a time: explain what to do next and why, show me exactly what to run or write, give options with pros and cons, then wait for me to do it and report back before continuing. Ask me questions and make me decide. Never edit files or run commands yourself unless I explicitly ask." },
];

/* ── Customize me: label → what gets typed into Claude ─────────────────── */
const QUICK_ACTIONS = [
  { label: "▶ go",           text: "go" },
  { label: "↻ regenerate",   text: "Regenerate your last answer — improve it." },
  { label: "✋ interrupt",    key: "Escape" },
  { label: "🧾 summarize",   text: "Summarize what you've done so far in 5 bullets." },
];

const $ = (id) => document.getElementById(id);

async function api(path, body) {
  const r = await fetch(path, { method: "POST",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  flash(r.ok ? "sent ✓" : "error: " + (j.error || r.status), r.ok);
  return r.ok;
}
function flash(msg, ok = true) {
  const s = $("status");
  s.textContent = msg; s.style.color = ok ? "var(--ok)" : "#c03a2e";
  setTimeout(() => (s.textContent = ""), 2000);
}
/* surface page errors instead of silently losing features */
window.addEventListener("error", (e) => flash("page error: " + e.message, false));

function sendPrompt() {
  const t = $("prompt").value.trim();
  if (!t && !modePending) return;
  const text = withMode(t || "Acknowledge the mode above.");
  api("/send", { text }).then((ok) => ok && ($("prompt").value = ""));
}
$("prompt").addEventListener("keydown", (e) => {
  /* Enter sends; Shift+Enter makes a newline (default behavior) */
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPrompt(); }
});
/* Shift+Tab cycles help levels — anywhere on the page outside the terminal
   pane (the terminal keeps its own Shift+Tab for Claude Code's mode cycling) */
document.addEventListener("keydown", (e) => {
  if (e.key === "Tab" && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    const i = MODES.findIndex((m) => m.name === activeMode);
    const next = MODES[(i + 1) % MODES.length];
    editing = false; activeMode = next.name; modePending = !sentModes[next.name];
    saveModeState(); renderModes(); flash(next.name + " selected");
  }
}, true);

/* help-level bar — selecting a mode shows ONLY the instruction that will be
   sent (with your next message). Each mode's instruction is sent at most once:
   switching away and back does NOT queue it again (Claude already knows it).
   Click the active mode again to force a resend; ✎ edits the instruction. */
let activeMode = localStorage.getItem("sb-mode") || "";
let modePending = localStorage.getItem("sb-mode-pending") === "1";
let sentModes = JSON.parse(localStorage.getItem("sb-mode-sent") || "{}");
let overrides = JSON.parse(localStorage.getItem("sb-mode-overrides") || "{}");
let editing = false;
const modePrompt = (name) => overrides[name] || (MODES.find((m) => m.name === name) || {}).prompt || "";
function saveModeState() {
  localStorage.setItem("sb-mode", activeMode);
  localStorage.setItem("sb-mode-pending", modePending ? "1" : "0");
  localStorage.setItem("sb-mode-sent", JSON.stringify(sentModes));
  localStorage.setItem("sb-mode-overrides", JSON.stringify(overrides));
}
function renderModes() {
  const bar = $("modes"); bar.innerHTML = "";
  for (const m of MODES) {
    const b = document.createElement("button");
    b.textContent = m.name;
    if (m.name === activeMode) b.classList.add("active");
    b.onclick = () => {
      editing = false;
      if (activeMode === m.name) modePending = !modePending;      // re-click: toggle resend
      else { activeMode = m.name; modePending = !sentModes[m.name]; } // sent before? don't queue
      saveModeState(); renderModes();
    };
    bar.appendChild(b);
  }
  const box = $("modedesc"); box.innerHTML = "";
  if (!activeMode) { box.textContent = "No mode set — click one to choose how much Claude takes over."; return; }
  if (editing) {
    const ta = document.createElement("textarea"); ta.value = modePrompt(activeMode);
    ta.style.minHeight = "90px";
    const save = document.createElement("button"); save.textContent = "Save & queue"; save.className = "primary";
    save.onclick = () => { overrides[activeMode] = ta.value.trim(); delete sentModes[activeMode];
                           modePending = true; editing = false; saveModeState(); renderModes(); };
    const cancel = document.createElement("button"); cancel.textContent = "Cancel";
    cancel.onclick = () => { editing = false; renderModes(); };
    const row = document.createElement("div"); row.className = "row"; row.style.marginTop = "6px";
    row.append(save, cancel); box.append(ta, row);
    return;
  }
  /* ✎ edit is always available while a mode is active — saving an edit queues
     the new instruction to go out with your next message */
  const label = document.createElement("div");
  label.innerHTML = modePending
    ? `<span style="color:var(--accent)">will be sent with your next message</span> `
    : `instruction already sent — click the mode again to resend `;
  const edit = document.createElement("button"); edit.textContent = "✎ edit";
  edit.style.cssText = "padding:1px 8px;font-size:11px";
  edit.onclick = () => { editing = true; renderModes(); };
  label.appendChild(edit);
  box.appendChild(label);
  /* the instruction text is always visible for the active mode */
  const text = document.createElement("div"); text.textContent = modePrompt(activeMode);
  text.style.cssText = "margin-top:4px;font-style:italic" + (modePending ? "" : ";opacity:.7");
  box.appendChild(text);
}
/* prepend the mode instruction once, on the first send after switching */
function withMode(text) {
  if (activeMode && modePending) {
    modePending = false; sentModes[activeMode] = 1; saveModeState(); renderModes();
    return modePrompt(activeMode) + "\n\n" + text;
  }
  return text;
}
renderModes();

/* quick action buttons */
for (const a of QUICK_ACTIONS) {
  const b = document.createElement("button");
  b.textContent = a.label;
  b.onclick = () => (a.key ? api("/key", { key: a.key }) : api("/send", { text: a.text }));
  $("actions").appendChild(b);
}

/* mini step list — persists in your browser (localStorage) */
let steps = JSON.parse(localStorage.getItem("sb-steps") || "[]");
function saveSteps() { localStorage.setItem("sb-steps", JSON.stringify(steps)); }
function renderSteps() {
  const box = $("steps"); box.innerHTML = "";
  steps.forEach((s, i) => {
    const row = document.createElement("div"); row.className = "step";
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = s.ticked;
    cb.onchange = () => { s.ticked = cb.checked; saveSteps(); };
    const t = document.createElement("input"); t.type = "text"; t.value = s.title;
    t.onchange = () => { s.title = t.value; saveSteps(); };
    const del = document.createElement("button"); del.className = "del"; del.textContent = "✕";
    del.onclick = () => { steps.splice(i, 1); saveSteps(); renderSteps(); };
    row.append(cb, t, del); box.appendChild(row);
  });
}
$("addStep").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.value.trim()) {
    steps.push({ title: e.target.value.trim(), ticked: false });
    e.target.value = ""; saveSteps(); renderSteps();
  }
});
function sendTicked() {
  const t = steps.filter((s) => s.ticked).map((s) => "- " + s.title);
  if (!t.length) return flash("no steps ticked", false);
  api("/send", { text: withMode("Please do exactly these steps, in order:\n" + t.join("\n")) });
}
renderSteps();

/* ── ⇧⌘↵ toggles focus: CLI pane ⇄ sidebar input ───────────────────────── */
const termFrame = $("term");
function focusTerminal() {
  const d = termFrame.contentDocument;
  const x = d && d.querySelector(".xterm-helper-textarea");
  (x || termFrame.contentWindow).focus();
}
function isToggleKey(e) {
  return e.key === "Enter" && e.metaKey && e.shiftKey && !e.ctrlKey && !e.altKey;
}
document.addEventListener("keydown", (e) => {
  if (!isToggleKey(e)) return;
  e.preventDefault(); e.stopPropagation();
  if (document.activeElement === termFrame) $("prompt").focus();
  else focusTerminal();
}, true);
/* terminal side (same-origin via /term/ proxy): same key jumps back out */
function hookTerminal() {
  try {
    const d = termFrame.contentDocument;
    // only the real terminal document (not the transient about:blank), once
    if (!d || !d.location.pathname.startsWith("/term") || d.__sbHooked) return;
    d.__sbHooked = true;
    d.addEventListener("keydown", (e) => {
      if (isToggleKey(e)) { e.preventDefault(); e.stopImmediatePropagation(); $("prompt").focus(); }
    }, true);
    /* Normal text selection in the terminal. Claude Code turns on mouse
       reporting, so xterm.js sends clicks to the app instead of selecting.
       xterm treats Shift as "force selection" — re-dispatch every trusted
       mouse event as a shiftKey clone: click-drag, double-click (word) and
       triple-click (line) all select like a normal text editor.
       Trade-off: mouse clicks never reach the CLI app itself. */
    const forceSelect = (e) => {
      if (!e.isTrusted) return;                             // clones pass through
      if (!e.target.closest || !e.target.closest(".xterm")) return;
      e.stopImmediatePropagation();
      e.preventDefault();  // kill native drag/select — xterm's handlers get the clone
      // Shift forces selection on Linux/Windows; on macOS it's Option-click
      // (with macOptionClickForcesSelection=true, set by stepboard-term)
      e.target.dispatchEvent(new MouseEvent(e.type, {
        bubbles: true, cancelable: true, composed: true,
        clientX: e.clientX, clientY: e.clientY,
        screenX: e.screenX, screenY: e.screenY,
        button: e.button, buttons: e.buttons, detail: e.detail,
        shiftKey: true, altKey: true, metaKey: e.metaKey, ctrlKey: e.ctrlKey,
      }));
    };
    for (const t of ["mousedown", "mouseup", "click", "dblclick"])
      d.addEventListener(t, forceSelect, true);
  } catch (err) { console.log("terminal hooks unavailable:", err); }
}
/* the iframe often finishes loading BEFORE this script runs (fast localhost),
   so hook immediately as well as on every (re)load */
termFrame.addEventListener("load", hookTerminal);
hookTerminal();
/* ── Pace panel ─────────────────────────────────────────────────────────
   Claude (once asked via the button) saves each answer as numbered
   paragraphs to a digest file; we poll it and render each paragraph as a
   card with 🐢 simpler / ⚡ deeper follow-up buttons. No terminal parsing —
   the agent itself publishes structured text. */
let digestPath = "", digestMtime = -1;
function paceInstruction() {
  return "From now on in this session, whenever you give me a substantive answer or " +
    "explanation, ALSO save it to " + digestPath + " (overwrite the whole file each time) " +
    "as plain markdown of numbered paragraphs (1., 2., 3. — one idea per paragraph, " +
    "). Use your Write tool for that silently right " +
    "after answering; don't mention doing it. Keep your chat answer itself unchanged.";
}
$("paceEnable").onclick = () => api("/send", { text: paceInstruction() });
function renderPace(text) {
  const box = $("pace"); box.innerHTML = "";
  const blocks = !text.trim() ? [] : text.trim()
    .split(/\n\s*\n+/)
    .flatMap((b) => b.split(/\n(?=\d+[.)]\s)/))
    .map((b) => b.trim()).filter(Boolean);
  if (!blocks.length) {
    const empty = document.createElement("div");
    empty.style.cssText = "color:var(--muted);font-size:12px";
    empty.textContent = "Nothing here yet — click the button below, then ask Claude something.";
    box.appendChild(empty);
    return;
  }
  for (const b of blocks) {
    const card = document.createElement("div"); card.className = "pace-card";
    const t = document.createElement("div"); t.textContent = b;
    const row = document.createElement("div"); row.className = "row";
    const ref = b.replace(/\s+/g, " ").slice(0, 110);
    const slow = document.createElement("button"); slow.textContent = "🐢 simpler";
    slow.onclick = () => api("/send", { text:
      `About this part of your last answer: "${ref}…" — I don't fully get it. ` +
      "Re-explain just this part one level simpler (one step earlier), with a tiny example." });
    const fast = document.createElement("button"); fast.textContent = "⚡ deeper";
    fast.onclick = () => api("/send", { text:
      `This part of your last answer I already understand well: "${ref}…" — ` +
      "skip ahead on just this part: give me the next-level, more advanced version." });
    row.append(slow, fast); card.append(t, row); box.appendChild(card);
  }
}
async function pollDigest() {
  try {
    const r = await fetch("/digest"); const j = await r.json();
    digestPath = j.path;
    if (j.mtime !== digestMtime) { digestMtime = j.mtime; renderPace(j.text || ""); }
  } catch (err) { /* server briefly away — next poll retries */ }
}
setInterval(pollDigest, 2000); pollDigest();

/* Two focus states: the CLI pane, or everything else → the input bar.
   Clicking anywhere outside the terminal that isn't a text field puts the
   cursor back in the input (skipped while you're selecting text to copy). */
document.addEventListener("click", (e) => {
  if (e.target.closest('textarea, select, [contenteditable], input:not([type="checkbox"])')) return;
  if (String(window.getSelection())) return;
  $("prompt").focus();
});
$("prompt").focus();
