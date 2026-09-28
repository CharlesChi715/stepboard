export const isRaw = msg => /^(\/[\w:-]+(\s|$)|!)/.test(msg)

// message + armed prompts + constraint clauses → the text that reaches Claude.
// Pure on purpose: no DOM, so it is the one piece that can be unit-tested.
export function compose({ msg = '', armed = [], unit = 'auto', n = '', chart = true, lines = '' }) {
  if (isRaw(msg)) return msg
  const base = [msg, ...armed].filter(Boolean).join('\n\n')
  const clauses = []
  if (unit !== 'auto' && n) clauses.push(`Reply in at most ${n} ${unit}.`)
  if (chart) clauses.push('Use ASCII diagram/chart/table where it helps.')
  if (lines !== '') clauses.push(                    // "" = say nothing about edits
    Number(lines) <= 0                               // 0 or less = read-only mode
      ? 'Do not edit any files — answer and explain only.'
      : `When editing files, change at most ${lines} lines at a time, then pause so I can review.`)
  return clauses.length ? base + '\n\n' + clauses.join('\n') : base
}

export function tail({ msg = '', armed = [], unit = 'auto', n = '', chart = false, lines = '' }) {
  if (isRaw(msg.trim())) return 'raw — sent exactly as typed'
  const bits = [...armed]
  if (unit !== 'auto' && n) bits.push(`≤${n} ${unit}`)
  if (chart) bits.push('ASCII')
  if (lines !== '') bits.push(Number(lines) <= 0 ? 'no edits' : `≤${lines} lines/step`)
  return bits.length ? '+ ' + bits.join(' · ') : ''
}

export async function send(text) {
  let r
  try {
    r = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (e) {
    throw new Error(e.name === 'TimeoutError' ? 'timed out' : 'API unreachable', { cause: e })
  }
  if (!r.ok) {
    const detail = (await r.json().catch(() => null))?.detail
    throw new Error(typeof detail === 'string' ? detail : `HTTP ${r.status}`)
  }
  return r
}
