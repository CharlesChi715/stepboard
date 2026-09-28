import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Unicode11Addon } from '@xterm/addon-unicode11'

// The left pane. We run xterm.js ourselves and speak ttyd's tiny protocol, so
// the selection belongs to this page — that is what makes ⌘⇧L possible.
//
//   keys  ──▶ xterm ──ws "0"+data──▶ /api/ws ──▶ ttyd (unix socket) ──▶ tmux ──▶ claude
//   screen ◀── xterm ◀─ws "0"+bytes── /api/ws ◀── ttyd ◀────────────────────────────┘
const EXITED = /\[(exited|server exited|lost server|detached)/
const MAX_TRIES = 8

export function useTtyd({ onSelection } = {}) {
  const hostRef = useRef(null)
  const termRef = useRef(null)
  const restartRef = useRef(null)
  const lastSel = useRef('')                 // survives a selection cleared by focus loss
  const [link, setLink] = useState('connecting')
  const onSel = useEffectEvent(s => onSelection?.(s))

  useEffect(() => {
    const term = new Terminal({
      fontSize: 13, fontFamily: 'Menlo, monospace', cursorBlink: true,
      scrollback: 10000, allowProposedApi: true,
      theme: {
        background: '#000000',
        selectionBackground: 'rgba(107,138,253,0.32)',
        selectionInactiveBackground: 'rgba(107,138,253,0.16)',
      },
      macOptionClickForcesSelection: true,   // xterm's force-selection lever on macOS…
      altClickMovesCursor: false,            // …without Option-click typing arrow keys
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new Unicode11Addon())
    term.unicode.activeVersion = '11'
    term.open(hostRef.current)
    termRef.current = term

    const refit = () => { try { fit.fit() } catch { return } }
    refit()
    let settle = 0
    const ro = new ResizeObserver(() => {
      if (!settle) refit()
      clearTimeout(settle)
      settle = setTimeout(() => { settle = 0; refit() }, 150)
    })
    ro.observe(hostRef.current)

    term.attachCustomKeyEventHandler(e => {
      if (isGrabKey(e)) return false
      if (e.isComposing) return true
      if (e.key === 'Enter' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.type === 'keydown') { e.preventDefault(); term.input('\n') }
        return false
      }
      return true
    })

    // Drag = select text, like any editor. Claude Code turns on all-motion mouse
    // reporting, so without this a drag is forwarded to the app, which pans its
    // own view (the "page drifts, cursor goes circle" symptom) and no text is
    // selected. Fix, ported from the 2026-07 StepBoard: swallow the real mouse
    // event and re-dispatch a clone carrying alt, which xterm reads as "force
    // selection". Do NOT force shift as well: with reporting OFF, xterm's
    // SelectionService reads shift+mousedown as "extend the existing selection",
    // so the first drag would select nothing at all.
    const clone = (e, alt = true) => new MouseEvent(e.type, {
      bubbles: true, cancelable: true, composed: true,
      clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
      button: e.button, buttons: e.buttons, detail: e.detail,
      shiftKey: e.shiftKey, altKey: alt, metaKey: e.metaKey, ctrlKey: e.ctrlKey,
    })
    let dragging = false
    let pending = null
    const forceSelect = e => {
      if (!e.isTrusted) return                              // our own clones pass through
      if (pending && e.type === 'mousemove') {
        e.stopImmediatePropagation()
        if (Math.hypot(e.clientX - pending.clientX, e.clientY - pending.clientY) < 4) return
        pending.target.dispatchEvent(clone(pending))
        pending = null
        dragging = true
      }
      if (pending && e.type === 'mouseup') {
        e.stopImmediatePropagation()
        e.preventDefault()
        pending.target.dispatchEvent(clone(pending, false))
        pending.target.dispatchEvent(clone(e, false))
        pending = null
        return
      }
      if (e.type === 'mousemove' || e.type === 'mouseup') { // mid-drag: re-target at the
        if (!dragging) return                               // document, where xterm's
        if (e.type === 'mouseup') { dragging = false; e.preventDefault() }
        e.stopImmediatePropagation()                        // selection tracker listens —
        document.dispatchEvent(clone(e))                    // the app's reporting does not
        return
      }
      if (!e.target.closest?.('.xterm')) return
      e.stopImmediatePropagation()
      e.preventDefault()                                    // kills the native drag too
      if (e.type === 'mousedown' && e.button === 0) {
        if (e.detail < 2) { pending = e; return }
        dragging = true
      }
      e.target.dispatchEvent(clone(e))
    }
    const MOUSE = ['mousedown', 'mousemove', 'mouseup', 'click', 'dblclick']
    MOUSE.forEach(t => document.addEventListener(t, forceSelect, true))

    let title = 'StepBoard', unread = false
    const show = () => { document.title = (unread ? '● ' : '') + title }
    const offTitle = term.onTitleChange(t => { title = t || 'StepBoard'; show() })
    const offBell = term.onBell(() => { if (!document.hasFocus()) { unread = true; show() } })
    const seen = () => { if (unread) { unread = false; show() } }
    window.addEventListener('focus', seen)

    const enc = new TextEncoder(), dec = new TextDecoder()
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`
    let sock = null, tries = 0, timer = 0, opened = false, ended = false, last = new Uint8Array()
    let dead = false
    const live = () => sock?.readyState === WebSocket.OPEN

    const offData = term.onData(d => {
      if (live()) sock.send(enc.encode('0' + d))
      else if (ended && d === '\r') restart()
    })
    const offSize = term.onResize(() => { if (live()) sock.send(
      enc.encode('1' + JSON.stringify({ columns: term.cols, rows: term.rows }))) })
    const offSel = term.onSelectionChange(() => {
      const s = term.getSelection()
      if (s) { lastSel.current = s; onSel(s) }
    })

    const connect = () => {
      if (dead) return
      clearTimeout(timer)
      const ws = sock = new WebSocket(url, ['tty'])             // ttyd insists on this subprotocol
      ws.binaryType = 'arraybuffer'
      ws.onopen = () => {
        if (opened) term.reset()                                 // tmux redraws the whole screen
        opened = true; tries = 0; ended = false
        ws.send(enc.encode(JSON.stringify({ AuthToken: '', columns: term.cols, rows: term.rows })))
        setLink('live')
      }
      ws.onmessage = e => {
        const b = new Uint8Array(e.data)
        if (b[0] === 48) { last = b.subarray(1); term.write(last) }   // "0" = output → screen
      }
      ws.onclose = e => {
        if (dead || ws !== sock) return
        if (e.code === 1000 || EXITED.test(dec.decode(last))) {
          ended = true
          term.write('\r\n\x1b[2m[claude exited — press ⏎ here to restart]\x1b[0m\r\n')
          return setLink('ended')
        }
        if (tries >= MAX_TRIES) {
          ended = true
          term.write('\r\n\x1b[33m[terminal unreachable — press ⏎ here to retry]\x1b[0m\r\n')
          return setLink('unreachable')
        }
        setLink('retrying')
        timer = setTimeout(connect, Math.min(5000, 100 * 2 ** tries++))
      }
    }
    const restart = () => { ended = false; tries = 0; setLink('connecting'); connect() }
    restartRef.current = restart

    const wake = () => {
      if (dead || document.hidden || ended || live() || sock?.readyState === WebSocket.CONNECTING) return
      tries = 0
      connect()
    }
    window.addEventListener('pageshow', wake)
    document.addEventListener('visibilitychange', wake)

    connect()
    term.focus()

    return () => {                          // StrictMode mounts twice in dev: leave nothing behind
      dead = true
      clearTimeout(timer); clearTimeout(settle)
      MOUSE.forEach(t => document.removeEventListener(t, forceSelect, true))
      window.removeEventListener('focus', seen)
      window.removeEventListener('pageshow', wake)
      document.removeEventListener('visibilitychange', wake)
      offData.dispose(); offSize.dispose(); offSel.dispose(); offTitle.dispose(); offBell.dispose()
      ro.disconnect()
      if (sock) { sock.onclose = null; sock.close() }
      term.dispose()
      termRef.current = null
      restartRef.current = null
    }
  }, [])

  const takeSelection = useCallback(() => {
    const term = termRef.current
    const picked = ((term && term.getSelection()) || lastSel.current || '').replace(/\s+$/, '')
    term?.clearSelection()                    // consumed — drop the highlight (lastSel keeps the text)
    return picked
  }, [])

  // ⌘J: the left pane has exactly one focus target — xterm's hidden textarea
  const focusTerm = useCallback(() => termRef.current?.focus(), [])
  const restart = useCallback(() => { restartRef.current?.(); termRef.current?.focus() }, [])

  return { hostRef, takeSelection, focusTerm, link, restart }
}

// ⌘⇧L, plus ⌃⇧L as a spare in case a browser reserves the ⌘ combo.
// e.code is keyboard-layout proof; e.key is the fallback for odd browsers.
export const isGrabKey = e =>
  e.shiftKey && (e.metaKey || e.ctrlKey) &&
  (e.code === 'KeyL' || (e.key || '').toLowerCase() === 'l')
