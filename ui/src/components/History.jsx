// mouseDown, not click: blurring the textarea saves a draft, which at the
// 5-item cap can evict this very row before a click would ever land on it.
export default function History({ hist, onPick }) {
  if (!hist.length) return <div className="hist">no history yet</div>
  return (
    <div className="hist">
      {hist.map(h => (
        <button key={h.text} title={h.text} onMouseDown={() => onPick(h.text)}>
          {(h.kind === 'sent' ? '✓ ' : '✎ ') + h.text}
        </button>
      ))}
    </div>
  )
}
