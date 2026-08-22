// term.js — WE run the terminal now. ttyd's own page used to sit in an iframe we
// could not read; xterm.js lives in this page, so its selection is ours.
//
//   keys  ──▶ xterm ──ws "0"+data──▶ ttyd ──▶ tmux ──▶ claude
//   screen ◀── xterm ◀─ws "0"+bytes── ttyd ◀───────────────┘

const term = new Terminal({
  fontSize: 13, fontFamily: 'Menlo, monospace', cursorBlink: true,
  scrollback: 10000, theme: {background: '#000000'},
})
const fit = new FitAddon.FitAddon()
term.loadAddon(fit)
const host = document.getElementById('term')
term.open(host)
// fit whenever the box changes size — the right panel is not in the DOM yet when
// this script runs, so an immediate fit() would size us to the whole window
new ResizeObserver(() => { try { fit.fit() } catch {} }).observe(host)

const enc = new TextEncoder(), dec = new TextDecoder()
let sock = null
const live = () => sock && sock.readyState === 1

// xterm → ttyd: "0" prefix = keystrokes, "1" = "my window is this big now"
term.onData(d => { if (live()) sock.send(enc.encode('0' + d)) })
term.onResize(() => { if (live()) sock.send(
  enc.encode('1' + JSON.stringify({columns: term.cols, rows: term.rows}))) })

function connect(port) {
  sock = new WebSocket(`ws://127.0.0.1:${port}/ws`, ['tty'])  // ttyd insists on this subprotocol
  sock.binaryType = 'arraybuffer'
  sock.onopen = () => sock.send(enc.encode(JSON.stringify(    // ttyd's handshake, always first
    {AuthToken: '', columns: term.cols, rows: term.rows})))
  sock.onmessage = e => {
    const b = new Uint8Array(e.data)
    switch (String.fromCharCode(b[0])) {                      // first byte says what this is
      case '0': term.write(b.slice(1)); break                 //   output → screen
      case '1': document.title = dec.decode(b.slice(1))       //   window title
    }
  }
  sock.onclose = () => term.write('\r\n\x1b[33m[ttyd gone — reload the page]\x1b[0m\r\n')
  term.focus()
}
fetch('/config').then(r => r.json()).then(c => connect(c.ttyd_port)).catch(() => connect(7681))

// ── ⌘⇧L: one shot — terminal selection → input bar → focus, caret at the end ──
// e.code is layout-proof; ⌃⇧L too, in case Safari eats the ⌘ combo. The badge
// says which half fired, so a silent failure is never a mystery.
const hit = e => e.shiftKey && (e.metaKey || e.ctrlKey) &&
                 (e.code === 'KeyL' || (e.key || '').toLowerCase() === 'l')

function badge(text, bad) {
  let b = document.getElementById('sbBadge')
  if (!b) {
    b = document.createElement('div'); b.id = 'sbBadge'
    b.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9;padding:3px 8px;' +
      'border-radius:6px;font:12px system-ui;color:#fff;pointer-events:none'
    document.body.appendChild(b)
  }
  b.textContent = text; b.style.background = bad ? '#c0392b' : '#1e7a40'; b.style.opacity = 1
  clearTimeout(badge.t); badge.t = setTimeout(() => b.style.opacity = 0, 3000)
}

// remember every selection: some browsers drop it the moment focus leaves the
// terminal (clicking the button, or the ⌘ key itself), so live-read + fallback
let lastSel = ''
term.onSelectionChange(() => {
  const s = term.getSelection()
  if (s) { lastSel = s; badge(`selected: ${s.length} chars`) }
})

function grabSelection() {
  const picked = (term.getSelection() || lastSel).replace(/\s+$/, '')
  if (!picked) return badge('⌘⇧L: nothing selected', true)
  const m = document.getElementById('msg')
  m.value = m.value.trim() ? m.value.replace(/\s*$/, '') + '\n' + picked : picked
  m.focus()
  m.setSelectionRange(m.value.length, m.value.length)
  badge(`⌘⇧L: ${picked.length} chars →`)
}

addEventListener('DOMContentLoaded', () => {                // button = the same job, no keys involved
  const b = document.getElementById('grabBtn')
  if (b) b.addEventListener('click', grabSelection)
})
addEventListener('keydown', e => {                          // show modified keys on screen,
  if (e.metaKey || e.ctrlKey || e.altKey)                    // so no Web Inspector needed
    badge(`key: ${e.code} meta=${e.metaKey} ctrl=${e.ctrlKey} alt=${e.altKey} hit=${hit(e)}`)
}, true)
term.attachCustomKeyEventHandler(e => !hit(e))          // don't let xterm eat it
document.addEventListener('keydown', e => {
  if (!hit(e)) return
  e.preventDefault(); e.stopPropagation()
  grabSelection()
}, true)
