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
      macOptionClickForcesSelection: true,   // xterm's force-selection lever on macOS…
      altClickMovesCursor: false,            // …without Option-click typing arrow keys
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(hostRef.current)
    termRef.current = term

    // the right panel is laid out after us, so fit on every size change, not once
    const ro = new ResizeObserver(() => { try { fit.fit() } catch { /* pre-layout */ } })
    ro.observe(hostRef.current)

    // Drag = select text, like any editor. Claude Code turns on all-motion mouse
    // reporting, so without this a drag is forwarded to the app, which pans its
    // own view (the "page drifts, cursor goes circle" symptom) and no text is
    // selected. Fix, ported from the 2026-07 StepBoard: swallow the real mouse
    // event and re-dispatch a clone carrying alt, which xterm reads as "force
    // selection". Do NOT force shift as well: with reporting OFF, xterm's
    // SelectionService reads shift+mousedown as "extend the existing selection",
    // so the first drag would select nothing at all.
    // Trade-off: mouse clicks never reach the CLI app itself.
    const clone = e => new MouseEvent(e.type, {
      bubbles: true, cancelable: true, composed: true,
      clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
      button: e.button, buttons: e.buttons, detail: e.detail,
      shiftKey: e.shiftKey, altKey: true, metaKey: e.metaKey, ctrlKey: e.ctrlKey,
    })
    let dragging = false
    const forceSelect = e => {
      if (!e.isTrusted) return                              // our own clones pass through
      if (e.type === 'mousemove' || e.type === 'mouseup') { // mid-drag: re-target at the
        if (!dragging) {                                    // document, where xterm's
          // Idle moves over the terminal must die here too: with all-motion
          // reporting on, xterm counts each outgoing report as user input and
          // clears the selection — one twitch after mouseup and it's gone.
          if (e.target.closest?.('.xterm')) e.stopImmediatePropagation()
          return
        }
        if (e.type === 'mouseup') { dragging = false; e.preventDefault() }
        e.stopImmediatePropagation()                        // selection tracker listens —
        document.dispatchEvent(clone(e))                    // the app's reporting does not
        return
      }
      if (!e.target.closest?.('.xterm')) return
      if (e.type === 'mousedown' && e.button === 0) dragging = true
      e.stopImmediatePropagation()
      e.preventDefault()                                    // kills the native drag too
      e.target.dispatchEvent(clone(e))
    }
    const MOUSE = ['mousedown', 'mousemove', 'mouseup', 'click', 'dblclick']
    MOUSE.forEach(t => document.addEventListener(t, forceSelect, true))

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
      MOUSE.forEach(t => document.removeEventListener(t, forceSelect, true))
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
    // A take is a consume: the text now lives in the input bar, so drop BOTH the
    // highlight and the remembered copy. Clearing only the highlight would leave
    // lastSel armed — a second ⌘⇧L would paste it again with nothing selected.
    // clearSelection() fires onSelectionChange with '', which the `if (s)` above
    // already ignores, so the badge does not flicker.
    term?.clearSelection()
    lastSel.current = ''
    return picked
  }, [])

  // ⌘J: the left pane has exactly one focus target — xterm's hidden textarea
  const focusTerm = useCallback(() => termRef.current?.focus(), [])

  return { hostRef, takeSelection, focusTerm }
}

// ⌘⇧L, plus ⌃⇧L as a spare in case a browser reserves the ⌘ combo.
// e.code is keyboard-layout proof; e.key is the fallback for odd browsers.
export const isGrabKey = e =>
  e.shiftKey && (e.metaKey || e.ctrlKey) &&
  (e.code === 'KeyL' || (e.key || '').toLowerCase() === 'l')
