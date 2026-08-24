// Tinted rather than solid: a bright fill would need dark text to stay legible,
// and this is a transient flash, not a call to action.
const BADGE =
  'badge pointer-events-none fixed bottom-3 left-3 z-[9] rounded-md px-2.5 py-1 ' +
  'text-[11px] font-medium ring-1 backdrop-blur-sm transition-opacity duration-200'

const TONE = {
  ok: 'bg-good/15 text-good ring-good/30',
  bad: 'bg-danger/15 text-danger ring-danger/30',
}

// Bottom-left status flash: says what the shortcut saw, so a silent failure
// is never a mystery (no Web Inspector needed).
export default function Badge({ note }) {
  if (!note) return null
  return (
    <div className={`${BADGE} ${note.bad ? 'bad ' + TONE.bad : 'ok ' + TONE.ok}`}>{note.text}</div>
  )
}
