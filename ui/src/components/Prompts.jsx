import { useState } from 'react'
import { BTN, BTN_ON, FIELDSET_ROW, LEGEND, TEXT_IN } from '../lib/ui.js'

// Armed prompts are appended at SEND time, not typed into the box.
// The list itself (built-ins + yours) comes from usePrompts.
export default function Prompts({ prompts, armed, onToggle, onAdd }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [text, setText] = useState('')
  const [err, setErr] = useState(null)

  const close = () => { setOpen(false); setLabel(''); setText(''); setErr(null) }

  const submit = e => {
    e.preventDefault()
    const why = onAdd(label, text)          // null = added, string = rejected
    if (why) return setErr(why)
    close()
  }

  return (
    // `relative` here, and NOT on the wrapper below, is deliberate: it makes the
    // fieldset the popup's containing block, so the popup spans this card's width
    // instead of hanging off a button and getting clipped by the panel's
    // overflow-y-auto (which makes overflow-x non-visible too).
    <fieldset className={`prompts ${FIELDSET_ROW} relative`}>
      <legend className={LEGEND}>prompts</legend>
      {prompts.map(p => (
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

      {/* Last in the row on purpose: the prompts keep their positions, and a
          test that reaches for `.prompts button` first still lands on a prompt. */}
      <button className={`new-prompt ${open ? BTN_ON : BTN}`} aria-expanded={open}
              onClick={() => (open ? close() : setOpen(true))}>+ new</button>

      {/* basis-full breaks the wrap row, so the form gets the card's full width —
          the panel is only 15rem, too narrow to put fields beside each other.
          data-own-enter tells App's global handler that Enter in here submits
          this form instead of sending the message. */}
      {open && (
        <form data-own-enter className="basis-full flex flex-col gap-2" onSubmit={submit}
              onKeyDown={e => { if (e.key === 'Escape') close() }}>
          {/* type="text" is load-bearing: App's ⌘A guard selects on
              `input[type=text]`, which does not match an input with no type */}
          <input className={TEXT_IN} type="text" value={label} autoFocus placeholder="label (button text)"
                 onChange={e => { setLabel(e.target.value); setErr(null) }} />
          <textarea className={`${TEXT_IN} resize-none`} value={text} rows={3}
                    placeholder="text appended when armed"
                    onChange={e => { setText(e.target.value); setErr(null) }} />
          {err && <span className="text-[11px] leading-snug text-danger">{err}</span>}
          <div className="flex gap-2">
            <button className={BTN} type="submit">add</button>
            <button className={BTN} type="button" onClick={close}>cancel</button>
          </div>
        </form>
      )}
    </fieldset>
  )
}
