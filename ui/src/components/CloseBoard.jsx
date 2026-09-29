import { useEffect, useRef, useState } from 'react'
import { BTN, BTN_SEND, FOCUS, HINT } from '../lib/ui.js'

async function stopBoard() {
  const r = await fetch('/api/stop', { method: 'POST', signal: AbortSignal.timeout(4000) })
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

  const go = () => {
    setState('closing')
    stopBoard().then(() => setState('closed'), e => setState(`failed: ${e.message}`))
  }

  return (
    <dialog ref={ref} onClose={() => { setState(null); onClose() }} aria-labelledby="close-title"
            className="close-board m-auto w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-edge bg-card
                       p-5 text-[13px] text-ink shadow-2xl shadow-black/70 backdrop:bg-black/60">
      <h2 id="close-title" className="text-base font-semibold">Close this StepBoard?</h2>
      <p className={`mt-1.5 ${HINT}`}>
        Closes this tab, the terminal bridge and tmux. Claude keeps running in the background —
        the next <kbd>claude-stepboard</kbd> picks it up again.
      </p>
      {state !== 'closed' && (
        <div className="mt-4 flex items-center gap-2">
          <button className={`close-all ${BTN_SEND} ${FOCUS}`} autoFocus disabled={state === 'closing'}
                  onClick={go}>Close <span className="font-normal opacity-60">⏎</span></button>
          <button className={`close-cancel ml-auto ${BTN}`} onClick={() => ref.current.close()}>
            Cancel <span className="text-muted">esc</span></button>
        </div>
      )}
      {state && (
        <p className={`close-state mt-3 text-[12px] ${state.startsWith('failed') ? 'text-danger' : 'text-good'}`}>
          {state === 'closing' ? 'closing…'
            : state === 'closed' ? 'closed — claude keeps running; this tab will close in a moment'
            : state}
        </p>
      )}
    </dialog>
  )
}
