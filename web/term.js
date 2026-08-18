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
term.open(document.getElementById('term'))
fit.fit()

const enc = new TextEncoder(), dec = new TextDecoder()
let sock = null
const live = () => sock && sock.readyState === 1

// xterm → ttyd: "0" prefix = keystrokes, "1" = "my window is this big now"
term.onData(d => { if (live()) sock.send(enc.encode('0' + d)) })
term.onResize(() => { if (live()) sock.send(
  enc.encode('1' + JSON.stringify({columns: term.cols, rows: term.rows}))) })
addEventListener('resize', () => fit.fit())

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
// xterm grabs keys first, so tell it to ignore this one (returning false = "not yours")
term.attachCustomKeyEventHandler(e => !(e.metaKey && e.shiftKey && e.key.toLowerCase() === 'l'))
document.addEventListener('keydown', e => {
  if (!(e.metaKey && e.shiftKey && e.key.toLowerCase() === 'l')) return
  e.preventDefault()
  const picked = term.getSelection().replace(/\s+$/, '')
  if (!picked) return
  const m = document.getElementById('msg')
  m.value = m.value.trim() ? m.value.replace(/\s*$/, '') + '\n' + picked : picked
  m.focus()
  m.setSelectionRange(m.value.length, m.value.length)
}, true)
