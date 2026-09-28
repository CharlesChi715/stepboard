import { BTN } from '../lib/ui.js'

const LIST = 'hist flex flex-col gap-1 text-[12px]'
const ROW = `${BTN} overflow-hidden text-left text-ellipsis whitespace-nowrap`

// mouseDown with its default cancelled: the composer keeps focus, so no blur
// saves a draft that could evict this very row before the pick lands.
export default function History({ hist, onPick }) {
  if (!hist.length) return <div className={`${LIST} px-1 text-muted`}>no history yet</div>
  return (
    <div className={LIST}>
      {hist.map(h => (
        <button key={h.text} className={ROW} title={h.text}
                onMouseDown={e => { e.preventDefault(); onPick(h.text) }}>
          {(h.kind === 'sent' ? '✓ ' : '✎ ') + h.text}
        </button>
      ))}
    </div>
  )
}
