const BADGE =
  'badge pointer-events-none sticky bottom-0 min-h-6 shrink-0 break-words rounded-md px-2.5 py-1 ' +
  'text-[11px] font-medium ring-1 backdrop-blur-sm transition-opacity duration-200 starting:opacity-0'

const TONE = {
  ok: 'bg-good/15 text-good ring-good/30',
  bad: 'bg-danger/15 text-danger ring-danger/30',
}

// The panel's status line: says what the shortcut or the send saw, so a silent
// failure is never a mystery (no Web Inspector needed).
export default function Badge({ note }) {
  const tone = note?.bad ? 'bad ' + TONE.bad : 'ok ' + TONE.ok
  return (
    <div role="status" aria-live="polite"
         className={`${BADGE} ${tone} ${!note || note.off ? 'opacity-0' : ''}`}>{note?.text}</div>
  )
}
