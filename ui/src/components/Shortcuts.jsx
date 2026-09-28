import { useState } from 'react'
import { SHORTCUTS } from '../lib/keys.js'
import { FIELD_CARD, LEGEND } from '../lib/ui.js'

const OPEN_KEY = 'sb-keys-open'
const startOpen = () => { try { return localStorage.getItem(OPEN_KEY) !== '0' } catch { return true } }
const remember = open => { try { localStorage.setItem(OPEN_KEY, open ? '1' : '0') } catch { /* private mode */ } }

export default function Shortcuts({ onNews }) {
  const [initiallyOpen] = useState(startOpen)
  return (
    <details className={`shortcuts group ${FIELD_CARD}`} open={initiallyOpen}
             onToggle={e => remember(e.currentTarget.open)}>
      <summary className={`${LEGEND} flex cursor-pointer list-none items-center justify-between
                           rounded-sm select-none [&::-webkit-details-marker]:hidden`}>
        shortcuts
        <span className="text-[10px] transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {SHORTCUTS.map(g => (
          <section key={g.where}>
            <h3 className="mb-1 text-[10px] text-muted">{g.where}</h3>
            <dl className="grid grid-cols-[3.25rem_1fr] items-baseline gap-x-2.5 gap-y-1 text-[11px] leading-snug">
              {g.keys.map(([k, what]) => (
                <div key={k + what} className="contents">
                  <dt><kbd className="inline-block min-w-7 rounded border border-edge bg-control px-1.5
                                      text-center font-medium whitespace-nowrap text-ink">{k}</kbd></dt>
                  <dd className="text-muted">{what}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <button className="whats-new self-start cursor-pointer px-0.5 text-[11px] text-armed
                           underline-offset-2 hover:underline" onClick={onNews}>what's new</button>
      </div>
    </details>
  )
}
