export default function History({ hist, onPick }) {
  if (!hist.length) return <div className="hist">no history yet</div>
  return (
    <div className="hist">
      {hist.map(h => (
        <button key={h.text} title={h.text} onClick={() => onPick(h.text)}>
          {(h.kind === 'sent' ? '✓ ' : '✎ ') + h.text}
        </button>
      ))}
    </div>
  )
}
