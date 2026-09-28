import { useEffect, useRef } from 'react'
import { KEYS, NEWS } from '../lib/news.js'
import { BTN_SEND, FOCUS } from '../lib/ui.js'

export default function WhatsNew({ open, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const d = ref.current
    if (open && !d.open) { d.showModal(); d.scrollTop = 0 }
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="news-title"
            className="news m-auto max-h-[85vh] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-xl
                       border border-edge bg-card p-0 text-[13px] text-ink shadow-2xl shadow-black/70
                       backdrop:bg-black/60 backdrop:backdrop-blur-[2px]">
      <div className="flex flex-col gap-4 p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 id="news-title" className="text-base font-semibold">What's new in StepBoard</h2>
          <span className="text-[11px] text-muted">faster · lighter · safer · easier</span>
        </header>

        {NEWS.map(s => (
          <section key={s.title} className="flex flex-col gap-1.5">
            <h3 className="text-[10px] font-medium tracking-[0.08em] text-muted uppercase">{s.title}</h3>
            <ul className="flex flex-col gap-1.5">
              {s.items.map(([what, tryIt]) => (
                <li key={what} className="rounded-md bg-control px-3 py-2 leading-snug">
                  {what}
                  {tryIt && <span className="mt-0.5 block text-[12px] text-armed">Try it: {tryIt}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="flex flex-col gap-1.5">
          <h3 className="text-[10px] font-medium tracking-[0.08em] text-muted uppercase">Keys</h3>
          <div className="flex flex-wrap gap-2">
            {KEYS.map(([k, what]) => (
              <span key={k} className="rounded-md border border-edge px-2 py-1 text-[12px]">
                <kbd className="font-semibold">{k}</kbd> <span className="text-muted">{what}</span>
              </span>
            ))}
          </div>
        </section>

        <footer className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted">Reopen any time with "what's new" under the panel.</span>
          <button className={`news-close ${BTN_SEND} ${FOCUS}`} autoFocus onClick={onClose}>Got it</button>
        </footer>
      </div>
    </dialog>
  )
}
