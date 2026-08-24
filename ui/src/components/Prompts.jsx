// Pre-built prompts — add yours here as {label, text}.
export const PROMPTS = [
  { label: 'pro', text: "What's the pro and professional way to do this?" },
  { label: 'socratic', text: "Use socratic way." },
  { label: 'first principles', text: "Use first principles." },
]

// Armed prompts are appended at SEND time, not typed into the box.
export default function Prompts({ armed, onToggle }) {
  return (
    <fieldset className="prompts">
      <legend>prompts</legend>
      {PROMPTS.map(p => (
        <div className="pwrap" key={p.label}>
          <button className={armed.includes(p.label) ? 'active' : ''}
                  onClick={() => onToggle(p.label)}>{p.label}</button>
          {armed.includes(p.label) && <div className="snippet">{p.text}</div>}
        </div>
      ))}
    </fieldset>
  )
}
