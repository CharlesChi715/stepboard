import { BTN } from '../lib/ui.js'

const LIST = 'hist flex flex-col gap-1 text-[12px]'
const ROW = `${BTN} overflow-hidden text-left text-ellipsis whitespace-nowrap`

// mouseDown, not click: blurring the textarea saves a draft, which at the
// 5-item cap can evict this very row before a click would ever land on it.
export default function History({ hist, onPick }) {
  if (!hist.length) return <div className={`${LIST} px-1 text-muted`}>no history yet</div>
  return (
    <div className={LIST}>
      {hist.map(h => (
        <button key={h.text} className={ROW} title={h.text} onMouseDown={() => onPick(h.text)}>
          {(h.kind === 'sent' ? '✓ ' : '✎ ') + h.text}
        </button>
      ))}
    </div>
  )
}
