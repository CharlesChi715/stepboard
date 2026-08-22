import { useCallback, useEffect, useRef, useState } from 'react'
import { useTtyd, isGrabKey } from './hooks/useTtyd.js'
import { useHistory } from './hooks/useHistory.js'
import { compose, send } from './lib/compose.js'
import MessageBar from './components/MessageBar.jsx'
import Prompts, { PROMPTS } from './components/Prompts.jsx'
import History from './components/History.jsx'
import Badge from './components/Badge.jsx'
import { Length, Format, Edits } from './components/Constraints.jsx'

export default function App() {
  const [msg, setMsg] = useState('')
  const [unit, setUnit] = useState('auto')
  const [n, setN] = useState('')
  const [chart, setChart] = useState(true)
  const [lines, setLines] = useState('')
  const [armed, setArmed] = useState([])
  const [showHist, setShowHist] = useState(false)
  const [note, setNote] = useState(null)
  const inputRef = useRef(null)
  const noteTimer = useRef(0)
  const { hist, save } = useHistory()

  const flash = useCallback((text, bad) => {
    setNote({ text, bad })
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => setNote(null), 3000)
  }, [])

  const onSelection = useCallback(s => flash(`selected: ${s.length} chars`), [flash])
  const onKeyReport = useCallback(e => flash(
    `key: ${e.code} meta=${e.metaKey} ctrl=${e.ctrlKey} alt=${e.altKey} hit=${isGrabKey(e)}`), [flash])
  const { hostRef, takeSelection } = useTtyd({ onSelection })

  // ⌘⇧L (or the button): terminal selection → input bar → focus, caret at the end
  const grab = useCallback(() => {
    const picked = takeSelection()
    if (!picked) return flash('⌘⇧L: nothing selected', true)
    setMsg(prev => (prev.trim() ? prev.replace(/\s*$/, '') + '\n' + picked : picked))
    const el = inputRef.current
    el?.focus()
    requestAnimationFrame(() => el?.setSelectionRange(el.value.length, el.value.length))
    flash(`⌘⇧L: ${picked.length} chars →`)
  }, [takeSelection, flash])

  // no argument → sends the input bar (and clears it on success);
  // with a canned string → sends that instead, leaving your draft alone
  const sendComposed = useCallback(text => {
    const body = (text ?? msg).trim()
    const armedTexts = PROMPTS.filter(p => armed.includes(p.label)).map(p => p.text)
    if (!body && !armedTexts.length) return
    send(compose({ msg: body, armed: armedTexts, unit, n, chart, lines })).then(r => {
      if (r.ok && text == null && body) { save(body, 'sent'); setMsg('') }
    })
  }, [msg, armed, unit, n, chart, lines, save])

  useEffect(() => {
    const onKey = e => {
      // badge first, so it reports the combo even when the browser eats the rest
      if (e.metaKey || e.ctrlKey || e.altKey) onKeyReport(e)
      if (isGrabKey(e)) { e.preventDefault(); e.stopPropagation(); grab(); return }
      const inTerminal = hostRef.current?.contains(e.target)   // keys typed at the CLI are the CLI's
      const plain = !e.shiftKey && !e.altKey                   // ⌘K/⌘A only — leave ⌘⇧K, ⌥⌘K alone
      if (plain && e.metaKey && (e.code === 'KeyK' || e.key === 'k')) {
        e.preventDefault(); inputRef.current?.focus(); return
      }
      if (inTerminal) return
      if (plain && e.metaKey && (e.code === 'KeyA' || e.key === 'a')) {
        if (e.target.closest?.('input[type=number], input[type=text], textarea')) return
        e.preventDefault(); inputRef.current?.focus(); inputRef.current?.select(); return
      }
      // Enter sends from anywhere on the page — except the input bar (own handler)
      // and buttons, where Enter natively means "click me"
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey &&
          e.target !== inputRef.current && e.target.tagName !== 'BUTTON') {
        e.preventDefault(); sendComposed()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [grab, sendComposed, hostRef, onKeyReport])

  return (
    <>
      <div className="term" ref={hostRef} />
      <div className="panel">
        <MessageBar value={msg} setValue={setMsg} onSend={() => sendComposed()}
                    hist={hist} onBlurSave={v => save(v, 'draft')} inputRef={inputRef} />
        <Length unit={unit} n={n} onUnit={setUnit} onN={setN} />
        <Format chart={chart} onChart={setChart} />
        <Edits lines={lines} onLines={setLines} />
        <Prompts armed={armed}
                 onToggle={label => setArmed(a =>
                   a.includes(label) ? a.filter(x => x !== label) : [...a, label])} />

        <button className="send" onClick={() => sendComposed()}>Send</button>
        <button onClick={() => setShowHist(v => !v)}>history</button>
        {showHist && <History hist={hist}
                              onPick={t => { setMsg(t); inputRef.current?.focus() }} />}
        <button className="summarize"
                onClick={() => sendComposed('Summarize this session.')}>summarize</button>
      </div>
      <Badge note={note} />
    </>
  )
}
