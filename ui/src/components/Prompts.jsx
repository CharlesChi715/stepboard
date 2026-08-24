import { BTN, BTN_ON, FIELDSET_ROW, LEGEND } from '../lib/ui.js'

// Pre-built prompts — add yours here as {label, text}.
export const PROMPTS = [
  { label: 'pro', text: "What's the pro and professional way to do this?" },
]

// Armed prompts are appended at SEND time, not typed into the box.
export default function Prompts({ armed, onToggle }) {
  return (
    <fieldset className={`prompts ${FIELDSET_ROW}`}>
      <legend className={LEGEND}>prompts</legend>
      {PROMPTS.map(p => (
        <div className="flex flex-col gap-0.5" key={p.label}>
          <button className={armed.includes(p.label) ? BTN_ON : BTN}
                  onClick={() => onToggle(p.label)}>{p.label}</button>
          {armed.includes(p.label) &&
            <div className="snippet max-w-[180px] text-[11px] text-muted">{p.text}</div>}
        </div>
      ))}
    </fieldset>
  )
}
