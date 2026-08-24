const BADGE =
  'badge pointer-events-none fixed bottom-2 left-2 z-[9] rounded-md px-2 py-[3px] ' +
  'text-xs text-white transition-opacity duration-200'

// Bottom-left status flash: says what the shortcut saw, so a silent failure
// is never a mystery (no Web Inspector needed).
export default function Badge({ note }) {
  if (!note) return null
  return <div className={`${BADGE} ${note.bad ? 'bad bg-danger' : 'ok bg-good'}`}>{note.text}</div>
}
