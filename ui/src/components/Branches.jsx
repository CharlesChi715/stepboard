import { useEffect, useState } from 'react'

// Where the session forked — not git branches, the conversation's own tree.
// Only branch points are drawn: a session is 50 prompts of straight line and
// two or three forks, and the forks are the part a scrollback cannot show you.
// No fork at all is the normal case, so the root alone is a real answer.

// Fixed area, as asked: it always occupies this slot and scrolls inside itself
// rather than growing the column. font-mono keeps the ├─ └─ glyphs in line.
// shrink-0 is load-bearing — the panel is a flex column with overflow-y-auto,
// and without it this box gets squeezed to a sliver as soon as the column is
// taller than the window, which is most of the time.
const BOX = 'branches flex max-h-56 shrink-0 flex-col gap-0.5 overflow-y-auto ' +
            'rounded-md border border-edge-soft bg-card px-2 py-1.5 font-mono text-[11px]'
const NOTE = 'px-1 text-muted'
const CLIP = 'overflow-hidden text-ellipsis whitespace-nowrap'
// A dropped branch is dimmed; the surviving one keeps full contrast.
const ROW = `${CLIP} cursor-pointer text-left hover:text-armed`

const SOURCE = {
  exact:   null,                                   // nothing to say — it is the left pane
  fixture: 'fixture transcript',
  newest:  'newest session (restart claude-s for an exact match)',
  pending: 'waiting for this session\'s first prompt',
  none:    'no transcript for this folder yet',
}

export default function Branches({ onPick }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {                                // mounts only while the view is open
    let gone = false
    fetch('/branches')
      .then(r => r.json())
      .then(d => { if (!gone) setData(d) })
      .catch(() => { if (!gone) setErr(true) })
    return () => { gone = true }
  }, [])

  if (err) return <div className={`${BOX} text-danger`}>branches: API unreachable</div>
  if (!data) return <div className={BOX}><span className={NOTE}>reading transcript…</span></div>

  const hint = SOURCE[data.source]
  return (
    <div className={BOX}>
      <div className={`${CLIP} text-muted`}>
        {data.file ? `● ${data.file}` : '○ no session'}
        {data.root ? `  ${data.prompts} prompts` : ''}
      </div>
      {data.root && (
        <button className={`${ROW} text-ink`} title={data.root.text}
                onMouseDown={() => onPick?.(data.root.text)}>
          {'└ ' + data.root.text}
        </button>
      )}
      {data.points.map(p => (
        <div key={p.at} className="mt-1 flex flex-col gap-0.5">
          <div className="text-muted">{`  ┌ fork @ ${p.at}`}</div>
          {p.children.map((c, i) => {
            const last = i === p.children.length - 1
            return (
              <button key={c.id}
                      className={`${ROW} ${c.live ? 'text-ink' : 'text-muted line-through'}`}
                      title={`${c.text}\n${c.turns} turn(s) · ${c.live ? 'the path taken' : 'abandoned'}`}
                      onMouseDown={() => onPick?.(c.text)}>
                {`  ${last ? '└' : '├'}${c.live ? '●' : '○'} ${c.text}`}
              </button>
            )
          })}
        </div>
      ))}
      {data.root && !data.points.length &&
        <div className={NOTE}>no forks — one straight line</div>}
      {hint && <div className={`${NOTE} mt-1`}>{hint}</div>}
    </div>
  )
}
