import { FOCUS } from '../lib/ui.js'

const SAY = {
  retrying: ['reconnecting…', 'text-armed ring-armed/40 bg-armed/15'],
  ended: ['claude exited — ⏎ or click to restart', 'text-ink ring-edge bg-control-hi'],
  unreachable: ['terminal unreachable — click to retry', 'text-danger ring-danger/40 bg-danger/15'],
}

export default function LinkPill({ link, onRestart }) {
  const say = SAY[link]
  if (!say) return null
  return (
    <button className={`link-pill absolute top-2 right-4 z-10 cursor-pointer rounded-full px-3 py-1
                        text-[11px] font-medium ring-1 backdrop-blur-sm ${say[1]} ${FOCUS}`}
            data-link={link} disabled={link === 'retrying'}
            onClick={onRestart}>{say[0]}</button>
  )
}
