import { BTN, BTN_ON, FIELDSET_ROW, LEGEND } from '../lib/ui.js'

// Pre-built prompts — add yours here as {label, text}.
export const PROMPTS = [
  { label: 'pro', text: "What's the pro and professional way to do this?" },
  { label: 'socratic', text: "Use socratic way." },
  { label: 'first principles', text: "Use first principles." },
]

// Armed prompts are appended at SEND time, not typed into the box.
export default function Prompts({ armed, onToggle }) {
  return (
    <fieldset className={`prompts ${FIELDSET_ROW}`}>
      <legend className={LEGEND}>prompts</legend>
      {PROMPTS.map(p => (
        // items-start: without it the button stretches to the snippet's width
        // when the preview opens, so the thing under your cursor resizes.
        <div className="group flex flex-col items-start gap-0.5" key={p.label}>
          <button className={armed.includes(p.label) ? BTN_ON : BTN}
                  onClick={() => onToggle(p.label)}>{p.label}</button>
          {/* A preview of what gets appended, not a status line — armed state is
              the button's own tint. focus-VISIBLE, not focus-within: clicking a
              prompt focuses it, and focus-within would then pin its snippet open
              for good. focus-visible fires for Tab and stays quiet for the mouse.
              It has to be group-HAS-, not group-focus-visible: the group is this
              div, which can't take focus — the button inside it does. */}
          <div className="snippet hidden max-w-[180px] text-[11px] leading-snug text-muted
                          group-hover:block group-has-[:focus-visible]:block">
            {p.text}
          </div>
        </div>
      ))}
    </fieldset>
  )
}
