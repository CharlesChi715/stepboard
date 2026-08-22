// Bottom-left status flash: says what the shortcut saw, so a silent failure
// is never a mystery (no Web Inspector needed).
export default function Badge({ note }) {
  if (!note) return null
  return <div className={`badge ${note.bad ? 'bad' : 'ok'}`}>{note.text}</div>
}
