import { useRef } from 'react'
import { FIELDSET, FIELDSET_BARE, LABEL, LEGEND, LEGEND_BARE, NUM, TICK } from '../lib/ui.js'

const UNIT_DEFAULTS = { sentences: 2, words: 100 }

// Each fieldset appends one clause at send time; blank/unticked appends nothing.
export function Length({ unit, n, onUnit, onN }) {
  const nRef = useRef(null)
  const pick = value => {
    onUnit(value)
    if (value in UNIT_DEFAULTS) {          // pop that unit's default in, ready to overwrite
      onN(String(UNIT_DEFAULTS[value]))
      requestAnimationFrame(() => { nRef.current?.focus(); nRef.current?.select() })
    }
  }
  return (
    <fieldset className={FIELDSET}>
      <legend className={LEGEND}>length</legend>
      <label className={LABEL}>
        <input type="radio" name="unit" value="auto" className={TICK}
               checked={unit === 'auto'} onChange={() => pick('auto')} /> auto
      </label>
      <label className={LABEL}>at most <input type="number" min="1" ref={nRef} className={NUM}
                            value={n} onChange={e => { onN(e.target.value); e.target.value.length > 0 && onUnit(e.target.value.length === 1 ? 'sentences' : 'words') }}
                            onFocus={() => { if (unit === 'auto') pick('words') }} /></label>
      <label className={LABEL}>
        <input type="radio" name="unit" value="sentences" className={TICK}
               checked={unit === 'sentences'} onChange={() => pick('sentences')} /> sentences
      </label>
      <label className={LABEL}>
        <input type="radio" name="unit" value="words" className={TICK}
               checked={unit === 'words'} onChange={() => pick('words')} /> words
      </label>
    </fieldset>
  )
}

export function Format({ chart, onChart }) {
  return (
    <fieldset className={FIELDSET}>
      <legend className={LEGEND}>format</legend>
      <label className={LABEL}>
        <input type="checkbox" checked={chart} className={TICK}
               onChange={e => onChart(e.target.checked)} /> ASCII diagram/chart/table
      </label>
    </fieldset>
  )
}

// frame colour = the mode you are in: red 0/no-edits, green capped, grey off
const MOOD = {
  '': { frame: 'border-edge-soft', legend: 'text-muted' },
  danger: { frame: 'border-danger/60', legend: 'text-danger' },
  ok: { frame: 'border-good/60', legend: 'text-good' },
}

export function Edits({ lines, onLines }) {
  const mood = lines === '' ? '' : (Number(lines) <= 0 ? 'danger' : 'ok')
  const tone = MOOD[mood]
  return (
    <fieldset className={[mood, FIELDSET_BARE, tone.frame].filter(Boolean).join(' ')}>
      <legend className={`${LEGEND_BARE} ${tone.legend}`}>edits</legend>
      <label className={LABEL}>≤ <input type="number" min="0" value={lines} className={NUM}
                      onChange={e => onLines(e.target.value)} /> lines per step (0 = no edits)</label>
    </fieldset>
  )
}
