import { useCallback, useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'

// The left pane. We run xterm.js ourselves and speak ttyd's tiny protocol, so
// the selection belongs to this page — that is what makes ⌘⇧L possible.
//
//   keys  ──▶ xterm ──ws "0"+data──▶ ttyd ──▶ tmux ──▶ claude
//   screen ◀── xterm ◀─ws "0"+bytes── ttyd ◀───────────────┘
export function useTtyd({ onSelection } = {}) {
  const hostRef = useRef(null)
  const termRef = useRef(null)
  const lastSel = useRef('')                 // survives a selection cleared by focus loss

  useEffect(() => {
    const term = new Terminal({
      fontSize: 13, fontFamily: 'Menlo, monospace', cursorBlink: true,
      scrollback: 10000, theme: { background: '#000000' },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(hostRef.current)
    termRef.current = term

    // the right panel is laid out after us, so fit on every size change, not once
    const ro = new ResizeObserver(() => { try { fit.fit() } catch { /* pre-layout */ } })
    ro.observe(hostRef.current)

    const enc = new TextEncoder(), dec = new TextDecoder()
    let sock = null
    const live = () => sock && sock.readyState === WebSocket.OPEN

    const offData = term.onData(d => { if (live()) sock.send(enc.encode('0' + d)) })
    const offSize = term.onResize(() => { if (live()) sock.send(
      enc.encode('1' + JSON.stringify({ columns: term.cols, rows: term.rows }))) })
    const offSel = term.onSelectionChange(() => {
      const s = term.getSelection()
      if (s) { lastSel.current = s; onSelection?.(s) }
    })

    let dead = false                          // cleanup may run while /config is still in flight
    const connect = port => {
      if (dead) return                        // …in which case never open the socket at all
      sock = new WebSocket(`ws://127.0.0.1:${port}/ws`, ['tty'])   // ttyd insists on this subprotocol
      sock.binaryType = 'arraybuffer'
      sock.onopen = () => sock.send(enc.encode(JSON.stringify(     // ttyd's handshake, always first
        { AuthToken: '', columns: term.cols, rows: term.rows })))
      sock.onmessage = e => {
        const b = new Uint8Array(e.data)
        switch (String.fromCharCode(b[0])) {                       // first byte = what this is
          case '0': term.write(b.slice(1)); break                  //   output → screen
          case '1': document.title = dec.decode(b.slice(1))        //   window title
        }
      }
      sock.onclose = () => term.write('\r\n\x1b[33m[ttyd gone — reload the page]\x1b[0m\r\n')
      term.focus()
    }
    fetch('/config').then(r => r.json())
      .then(c => connect(c.ttyd_port)).catch(() => connect(7681))

    return () => {                          // StrictMode mounts twice in dev: leave nothing behind
      dead = true
      offData.dispose(); offSize.dispose(); offSel.dispose()
      ro.disconnect()
      if (sock) { sock.onclose = null; sock.close() }
      term.dispose()
      termRef.current = null
    }
  }, [])                                    // eslint-disable-line react-hooks/exhaustive-deps

  // xterm must not swallow our shortcut (returning false = "not yours").
  // The key report lives in App's document listener, so it sees panel keys too.
  useEffect(() => {
    termRef.current?.attachCustomKeyEventHandler(e => !isGrabKey(e))
  }, [])

  const takeSelection = useCallback(() => {
    const term = termRef.current
    const picked = ((term && term.getSelection()) || lastSel.current || '').replace(/\s+$/, '')
    return picked
  }, [])

  return { hostRef, takeSelection }
}

// ⌘⇧L, plus ⌃⇧L as a spare in case a browser reserves the ⌘ combo.
// e.code is keyboard-layout proof; e.key is the fallback for odd browsers.
export const isGrabKey = e =>
  e.shiftKey && (e.metaKey || e.ctrlKey) &&
  (e.code === 'KeyL' || (e.key || '').toLowerCase() === 'l')
