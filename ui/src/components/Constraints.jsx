import { useRef } from 'react'

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
    <fieldset>
      <legend>length</legend>
      <label>
        <input type="radio" name="unit" value="auto"
               checked={unit === 'auto'} onChange={() => pick('auto')} /> auto
      </label>
      <label>at most <input type="number" min="1" ref={nRef}
                            value={n} onChange={e => onN(e.target.value)} 
                            onFocus={() => { if (unit === 'auto') pick('words') }} /></label>
      <label>
        <input type="radio" name="unit" value="sentences"
               checked={unit === 'sentences'} onChange={() => pick('sentences')} /> sentences
      </label>
      <label>
        <input type="radio" name="unit" value="words"
               checked={unit === 'words'} onChange={() => pick('words')} /> words
      </label>
    </fieldset>
  )
}

export function Format({ chart, onChart }) {
  return (
    <fieldset>
      <legend>format</legend>
      <label>
        <input type="checkbox" checked={chart}
               onChange={e => onChart(e.target.checked)} /> ASCII diagram/chart/table
      </label>
    </fieldset>
  )
}

// frame colour = the mode you are in: red 0/no-edits, green capped, grey off
export function Edits({ lines, onLines }) {
  const mood = lines === '' ? '' : (Number(lines) <= 0 ? 'danger' : 'ok')
  return (
    <fieldset className={mood}>
      <legend>edits</legend>
      <label>≤ <input type="number" min="0" value={lines}
                      onChange={e => onLines(e.target.value)} /> lines per step (0 = no edits)</label>
    </fieldset>
  )
}
