import { useCallback, useEffect, useRef, useState } from 'react'
import { useTtyd, isGrabKey } from './hooks/useTtyd.js'
import { useHistory } from './hooks/useHistory.js'
import { usePrompts } from './hooks/usePrompts.js'
import { compose, send } from './lib/compose.js'
import { BTN, BTN_BIG, TERM } from './lib/ui.js'
import MessageBar from './components/MessageBar.jsx'
import Prompts from './components/Prompts.jsx'
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

  // Defined before usePrompts on purpose: prompts now live in a file on the
  // server, so a save can actually fail, and the badge is how the panel admits
  // it instead of showing a prompt that was never written.
  const flash = useCallback((text, bad) => {
    setNote({ text, bad })
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => setNote(null), 3000)
  }, [])

  const { prompts, ready, error: promptsError, add: addPrompt,
          update, remove, restore, missing } = usePrompts(flash)

  // `armed` holds labels, so a rename has to be carried over to it or an armed
  // prompt would silently stop being appended; a delete has to be swept out of
  // it or re-making that label later would come back pre-armed. Both forward
  // the hook's rejection reason untouched, so the form still shows it inline.
  const editPrompt = useCallback((label, nextLabel, nextText) => {
    const why = update(label, nextLabel, nextText)
    if (!why) setArmed(a => a.map(x => (x === label ? nextLabel.trim() : x)))
    return why
  }, [update])

  const deletePrompt = useCallback(label => {
    const why = remove(label)
    if (!why) setArmed(a => a.filter(x => x !== label))
    return why
  }, [remove])

  const onSelection = useCallback(s => flash(`selected: ${s.length} chars`), [flash])
  const onKeyReport = useCallback(e => flash(
    `key: ${e.code} meta=${e.metaKey} ctrl=${e.ctrlKey} alt=${e.altKey} hit=${isGrabKey(e)}`), [flash])
  const { hostRef, takeSelection, focusTerm } = useTtyd({ onSelection })

  // ⌘⇧L (or the button): terminal selection → input bar → focus, caret at the end
  const grab = useCallback(() => {
    const picked = takeSelection()
    if (!picked) return flash('⌘⇧L: nothing selected', true)
    setMsg(prev => (prev.trim() ? prev.replace(/\s*$/, '') + '\n' + picked + '\n': picked + '\n'))
    const el = inputRef.current
    el?.focus()
    requestAnimationFrame(() => el?.setSelectionRange(el.value.length, el.value.length))
    flash(`⌘⇧L: ${picked.length} chars →`)
  }, [takeSelection, flash])

  // no argument → sends the input bar (and clears it on success);
  // with a canned string → sends that instead, leaving your draft alone
  const sendComposed = useCallback(text => {
    const body = (text ?? msg).trim()
    const armedTexts = prompts.filter(p => armed.includes(p.label)).map(p => p.text)
    if (!body && !armedTexts.length) return
    send(compose({ msg: body, armed: armedTexts, unit, n, chart, lines })).then(r => {
      if (r.ok && text == null && body) { save(body, 'sent'); setMsg('') }
    })
  }, [msg, armed, prompts, unit, n, chart, lines, save])

  useEffect(() => {
    const onKey = e => {
      // badge first, so it reports the combo even when the browser eats the rest
      if (e.metaKey || e.ctrlKey || e.altKey) onKeyReport(e)
      if (isGrabKey(e)) { e.preventDefault(); e.stopPropagation(); grab(); return }
      const inTerminal = hostRef.current?.contains(e.target)   // keys typed at the CLI are the CLI's
      const plain = !e.shiftKey && !e.altKey                   // ⌘K/⌘A only — leave ⌘⇧K, ⌥⌘K alone
      if (plain && e.metaKey && (e.code === 'KeyJ' || e.key === 'j')) {
        e.preventDefault(); focusTerm(); return       // ⌘J ← left pane · ⌘K → panel
      }
      if (plain && e.metaKey && (e.code === 'KeyK' || e.key === 'k')) {
        e.preventDefault(); inputRef.current?.focus(); return
      }
      if (inTerminal) return
      if (plain && e.metaKey && (e.code === 'KeyA' || e.key === 'a')) {
        if (e.target.closest?.('input[type=number], input[type=text], textarea')) return
        e.preventDefault(); inputRef.current?.focus(); inputRef.current?.select(); return
      }
      // Enter sends from anywhere on the page — except the input bar (own handler),
      // buttons, where Enter natively means "click me", and anything that marks
      // itself data-own-enter (the new-prompt form: Enter there submits the form).
      // The check has to live here: this listener is on document in CAPTURE phase,
      // so it runs before any handler the form could attach to itself.
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey &&
          e.target !== inputRef.current && e.target.tagName !== 'BUTTON' &&
          !e.target.closest?.('[data-own-enter]')) {
        e.preventDefault(); sendComposed()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [grab, sendComposed, hostRef, onKeyReport, focusTerm])

  return (
    <>
      <div className={TERM} ref={hostRef} />
      {/* overflow-y matters: without it, `mt-auto` on the last button pushes the
          top of the column off-screen once the panel outgrows the window */}
      <div className="panel flex min-h-0 w-60 flex-col gap-3 overflow-y-auto border-l
                      border-edge-soft bg-bg p-3 text-[13px]">
        <MessageBar value={msg} setValue={setMsg} onSend={() => sendComposed()}
                    hist={hist} onBlurSave={v => save(v, 'draft')} inputRef={inputRef} />
        <Length unit={unit} n={n} onUnit={setUnit} onN={setN} />
        <Format chart={chart} onChart={setChart} />
        <Edits lines={lines} onLines={setLines} />
        <Prompts prompts={prompts} armed={armed} onAdd={addPrompt}
                 onUpdate={editPrompt} onDelete={deletePrompt}
                 onRestore={restore} missing={missing} ready={ready} error={promptsError}
                 onToggle={label => setArmed(a =>
                   a.includes(label) ? a.filter(x => x !== label) : [...a, label])} />

        <button className={`send ${BTN_BIG}`} onClick={() => sendComposed()}>Send</button>
        <button className={BTN} onClick={() => setShowHist(v => !v)}>history</button>
        {showHist && <History hist={hist}
                              onPick={t => { setMsg(t); inputRef.current?.focus() }} />}
        <button className={`summarize ${BTN} mt-auto`}
                onClick={() => sendComposed('Summarize this session.')}>summarize</button>
      </div>
      <Badge note={note} />
    </>
  )
}
