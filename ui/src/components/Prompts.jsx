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
    // `relative` here, and NOT on the wrapper below, is deliberate: it makes the
    // fieldset the popup's containing block, so the popup spans this card's width
    // instead of hanging off a button and getting clipped by the panel's
    // overflow-y-auto (which makes overflow-x non-visible too).
    <fieldset className={`prompts ${FIELDSET_ROW} relative`}>
      <legend className={LEGEND}>prompts</legend>
      {PROMPTS.map(p => (
        <div className="group" key={p.label}>
          <button className={armed.includes(p.label) ? BTN_ON : BTN}
                  onClick={() => onToggle(p.label)}>{p.label}</button>
          {/* A floating preview of what gets appended — absolute, so opening it
              never pushes a button around. Armed state is the button's own tint.
              focus-VISIBLE, not focus-within: clicking a prompt focuses it, and
              focus-within would then pin its popup open for good. It has to be
              group-HAS-, not group-focus-visible: the group is this div, which
              can't take focus — the button inside it does. */}
          <div className="snippet pointer-events-none absolute bottom-full right-3 left-3 z-20
                          mb-1.5 hidden rounded-md border border-edge bg-control px-2.5 py-1.5
                          text-[11px] leading-snug text-ink shadow-lg
                          group-hover:block group-has-[:focus-visible]:block">
            {p.text}
          </div>
        </div>
      ))}
    </fieldset>
  )
}
