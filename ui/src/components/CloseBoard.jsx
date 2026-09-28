import { useEffect, useRef, useState } from 'react'
import { BTN, BTN_SEND, FOCUS, HINT } from '../lib/ui.js'

async function stopBoard(keep) {
  const r = await fetch('/api/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keep }),
    signal: AbortSignal.timeout(4000),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail || `HTTP ${r.status}`)
}

export default function CloseBoard({ open, onClose }) {
  const ref = useRef(null)
  const [state, setState] = useState(null)

  useEffect(() => {
    const d = ref.current
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const go = keep => {
    setState('closing')
    stopBoard(keep).then(() => setState(keep ? 'kept' : 'closed'), e => setState(`failed: ${e.message}`))
  }

  const onKeyDown = e => {
    if (e.key === 'Enter' && e.altKey) { e.preventDefault(); go(true) }
  }

  const done = state === 'closed' || state === 'kept'
  return (
    <dialog ref={ref} onClose={() => { setState(null); onClose() }} onKeyDown={onKeyDown}
            aria-labelledby="close-title"
            className="close-board m-auto w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-edge bg-card
                       p-5 text-[13px] text-ink shadow-2xl shadow-black/70 backdrop:bg-black/60">
      <h2 id="close-title" className="text-base font-semibold">Close this StepBoard?</h2>
      <p className={`mt-1.5 ${HINT}`}>
        Stops its servers and closes this tab. Your chat is saved — <kbd>/resume</kbd> brings it back.
      </p>
      {!done && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className={`close-all ${BTN_SEND} ${FOCUS}`} autoFocus disabled={state === 'closing'}
                  onClick={() => go(false)}>Close <span className="font-normal opacity-60">⏎</span></button>
          <button className={`close-keep ${BTN}`} disabled={state === 'closing'}
                  onClick={() => go(true)}>Keep claude running <span className="text-muted">⌥⏎</span></button>
          <button className={`close-cancel ml-auto ${BTN}`} onClick={() => ref.current.close()}>
            Cancel <span className="text-muted">esc</span></button>
        </div>
      )}
      {state && (
        <p className={`close-state mt-3 text-[12px] ${state.startsWith('failed') ? 'text-danger' : 'text-good'}`}>
          {state === 'closing' ? 'closing…'
            : state === 'closed' ? 'closed — this tab will close in a moment'
            : state === 'kept' ? 'board closed — claude is still running in tmux'
            : state}
        </p>
      )}
    </dialog>
  )
}
