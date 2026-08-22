// message + armed prompts + constraint clauses → the text that reaches Claude.
// Pure on purpose: no DOM, so it is the one piece that can be unit-tested.
export function compose({ msg = '', armed = [], unit = 'auto', n = '', chart = true, lines = '' }) {
  const base = [msg, ...armed].filter(Boolean).join('\n\n')
  const clauses = []
  if (unit !== 'auto' && n) clauses.push(`Reply in at most ${n} ${unit}.`)
  if (chart) clauses.push('Use an ASCII chart or table where it helps.')
  if (lines !== '') clauses.push(                    // "" = say nothing about edits
    Number(lines) <= 0                               // 0 or less = read-only mode
      ? 'Do not edit any files — answer and explain only.'
      : `When editing files, change at most ${lines} lines at a time, then pause so I can review.`)
  return clauses.length ? base + '\n\n' + clauses.join('\n') : base
}

// the other door into tmux: serve.py turns this into `tmux send-keys`
export const send = text =>
  fetch('/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
