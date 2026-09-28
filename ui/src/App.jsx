import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useTtyd, isGrabKey } from './hooks/useTtyd.js'
import { useHistory } from './hooks/useHistory.js'
import { usePrompts } from './hooks/usePrompts.js'
import { compose, send, tail } from './lib/compose.js'
import { NEWS_ID, NEWS_KEY } from './lib/news.js'
import { BTN, BTN_ACTION, BTN_ACTION_ON, BTN_SEND, HINT, TERM } from './lib/ui.js'
import MessageBar from './components/MessageBar.jsx'
import Prompts from './components/Prompts.jsx'
import History from './components/History.jsx'
import Badge from './components/Badge.jsx'
import LinkPill from './components/LinkPill.jsx'
import WhatsNew from './components/WhatsNew.jsx'
import Shortcuts from './components/Shortcuts.jsx'
import { Length, Format, Edits } from './components/Constraints.jsx'

const KEY_REPORT = new URLSearchParams(location.search).has('keys')
const keep = e => e.preventDefault()

const newsSeen = () => { try { return localStorage.getItem(NEWS_KEY) === NEWS_ID } catch { return true } }

export default function App() {
  const [msg, setMsg] = useState('')
  const [unit, setUnit] = useState('words')
  const [n, setN] = useState('200')
  const [chart, setChart] = useState(false)
  const [lines, setLines] = useState('')
  const [armed, setArmed] = useState([])
  const [showHist, setShowHist] = useState(false)
  const [note, setNote] = useState(null)
  const [news, setNews] = useState(() => !newsSeen())
  const inputRef = useRef(null)
  const noteTimer = useRef(0)
  const sending = useRef(false)
  const { hist, save } = useHistory()

  // Defined before usePrompts on purpose: prompts now live in a file on the
  // server, so a save can actually fail, and the badge is how the panel admits
  // it instead of showing a prompt that was never written.
  const flash = useCallback((text, bad) => {
    setNote({ text, bad })
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => setNote(n => n && { ...n, off: true }), bad ? 6000 : 3000)
  }, [])

  const { prompts, ready, error: promptsError, add: addPrompt,
          update, remove, move, restore, missing } = usePrompts(flash)

  const toggle = useCallback(label => setArmed(a =>
    a.includes(label) ? a.filter(x => x !== label) : [...a, label]), [])

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

  const onSelection = useCallback(s => {
    const n = `selected: ${s.length} chars`
    flash(n)
    navigator.clipboard.writeText(s).then(
      () => flash(`${n} · copied`),
      () => flash(`${n} · clipboard blocked`, true))
  }, [flash])
  const { hostRef, takeSelection, focusTerm, link, restart } = useTtyd({ onSelection })

  useEffect(() => {
    if (news) try { localStorage.setItem(NEWS_KEY, NEWS_ID) } catch { /* private mode */ }
  }, [news])

  // ⌘⇧L: terminal selection → input bar → focus, caret and view at the end
  const grab = () => {
    const picked = takeSelection()
    if (!picked) return flash('⌘⇧L: nothing selected', true)
    setMsg(prev => (prev.trim() ? prev.replace(/\s*$/, '') + '\n' + picked + '\n' : picked + '\n'))
    const el = inputRef.current
    el?.focus()
    requestAnimationFrame(() => {
      el?.setSelectionRange(el.value.length, el.value.length)
      if (el) el.scrollTop = el.scrollHeight
    })
    flash(`⌘⇧L: ${picked.length} chars →`)
  }

  // no argument → sends the input bar (and clears it on success);
  // with a canned string → sends that instead, leaving your draft alone
  const sendComposed = text => {
    const body = (text ?? msg).trim()
    const armedTexts = prompts.filter(p => armed.includes(p.label)).map(p => p.text)
    if ((!body && !armedTexts.length) || sending.current) return
    sending.current = true
    send(compose({ msg: body, armed: armedTexts, unit, n, chart, lines }))
      .then(() => {
        if (text != null || !body) return
        save(body, 'sent')
        setMsg(cur => (cur.trim() === body ? '' : cur))
      })
      .catch(e => flash(`not sent — ${e.message}${text == null ? ' · draft kept' : ''}`, true))
      .finally(() => { sending.current = false })
  }

  const onKey = useEffectEvent(e => {
    if (KEY_REPORT && (e.metaKey || e.ctrlKey || e.altKey)) flash(
      `key: ${e.code} meta=${e.metaKey} ctrl=${e.ctrlKey} alt=${e.altKey} hit=${isGrabKey(e)}`)
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
    if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.isComposing &&
        /^Digit[1-9]$/.test(e.code)) {
      e.preventDefault()
      const d = e.code.slice(5), p = prompts[d - 1]
      if (p) { toggle(p.label); flash(`⌥${d} ${p.label} ${armed.includes(p.label) ? 'off' : 'armed'}`) }
      return
    }
    if (plain && e.metaKey && (e.code === 'KeyA' || e.key === 'a')) {
      if (e.target.closest?.('input[type=number], input[type=text], textarea')) return
      e.preventDefault(); inputRef.current?.focus(); inputRef.current?.select(); return
    }
    // Enter sends from anywhere on the page — except the input bar (own handler),
    // buttons, where Enter natively means "click me", and anything that marks
    // itself data-own-enter (the new-prompt form: Enter there submits the form).
    // The check has to live here: this listener is on document in CAPTURE phase,
    // so it runs before any handler the form could attach to itself.
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.isComposing &&
        e.target !== inputRef.current && e.target.tagName !== 'BUTTON' &&
        !e.target.closest?.('[data-own-enter], dialog')) {
      e.preventDefault(); sendComposed()
    }
  })

  useEffect(() => {
    const h = e => onKey(e)
    document.addEventListener('keydown', h, true)
    return () => document.removeEventListener('keydown', h, true)
  }, [])

  const armedLabels = prompts.filter(p => armed.includes(p.label)).map(p => p.label)
  const appended = tail({ msg, armed: armedLabels, unit, n, chart, lines })

  return (
    <>
      <div className="relative flex min-w-0 flex-1">
        <div className={TERM} ref={hostRef} />
        <LinkPill link={link} onRestart={restart} />
      </div>
      {/* overflow-y matters: without it, `mt-auto` on the footer pushes the top
          of the column off-screen once the panel outgrows the window */}
      <aside className="panel flex min-h-0 w-panel shrink-0 flex-col gap-3 overflow-y-auto border-l
                        border-edge-soft bg-bg p-3 text-[13px]">
        <div className="composer flex flex-col rounded-lg border border-edge bg-control
                        focus-within:border-armed/70">
          <MessageBar value={msg} setValue={setMsg} onSend={() => sendComposed()}
                      hist={hist} onBlurSave={v => save(v, 'draft')} inputRef={inputRef} />
          <div className="flex items-center gap-1 px-1.5 pb-1.5">
            <button className={`hist-toggle ${showHist ? BTN_ACTION_ON : BTN_ACTION}`}
                    aria-expanded={showHist} onMouseDown={keep}
                    onClick={() => setShowHist(v => !v)}>history</button>
            <button className={`send ml-auto ${BTN_SEND}`} onMouseDown={keep}
                    title="Enter sends · Shift+Enter = newline"
                    onClick={() => sendComposed()}>Send <span className="font-normal opacity-60">⏎</span></button>
          </div>
        </div>
        {appended && <p className={`tail -mt-2 truncate px-1 ${HINT}`} title={appended}>{appended}</p>}
        {showHist && <History hist={hist}
                              onPick={t => { setMsg(t); inputRef.current?.focus() }} />}
        <Length unit={unit} n={n} onUnit={setUnit} onN={setN} />
        <Format chart={chart} onChart={setChart} />
        <Edits lines={lines} onLines={setLines} />
        <Prompts prompts={prompts} armed={armed} onAdd={addPrompt}
                 onUpdate={editPrompt} onDelete={deletePrompt} onMove={move}
                 onRestore={restore} missing={missing} ready={ready} error={promptsError}
                 onToggle={toggle} />

        <div className="mt-auto flex flex-col gap-2">
          <button className={`summarize ${BTN}`} onMouseDown={keep}
                  onClick={() => sendComposed('Summarize this session.')}>summarize</button>
          <Shortcuts onNews={() => setNews(true)} />
          <Badge note={note} />
        </div>
      </aside>
      <WhatsNew open={news} onClose={() => setNews(false)} />
    </>
  )
}
