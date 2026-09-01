import { useRef, useState } from 'react'
import { BTN, BTN_ACTION, BTN_ACTION_ON, BTN_DANGER, BTN_ON, BTN_TARGET, CHIP_ROW, FIELDSET,
         HINT, LEGEND, TEXT_IN } from '../lib/ui.js'

// Armed prompts are appended at SEND time, not typed into the box.
// The list itself comes from usePrompts — one flat list, no two classes of
// prompt: the ones that ship are seeds, and once seeded they edit and delete
// exactly like the ones you make.
//
// Editing lives behind an `edit` mode rather than a ✎/× pair on every chip.
// The panel is 15rem wide, so a chip is a small target already — putting a
// destructive icon inside one would both shrink the arm target and make
// "delete" a mis-click away from "arm".
export default function Prompts({ prompts, armed, onToggle, onAdd, onUpdate, onDelete,
                                  onRestore, missing }) {
  const [manage, setManage] = useState(false)
  const [form, setForm] = useState(null)    // null · { editing: null } new · { editing: label }
  const [label, setLabel] = useState('')
  const [text, setText] = useState('')
  const [err, setErr] = useState(null)
  const [armDel, setArmDel] = useState(false)   // delete is two presses, never one
  // Where focus goes when the form closes. Without this the form unmounts under
  // the caret, focus falls to <body>, and Escape stops reaching this fieldset —
  // so the second Escape could never leave edit mode.
  const chips = useRef(new Map())

  // `|| missing` is the escape hatch, not a detail: delete every prompt and a
  // `prompts.length > 0` guard would hide the edit button, and `restore` lives
  // inside the mode — so the one control that undoes it would be unreachable.
  const canManage = prompts.length > 0 || missing > 0
  const managing = manage && canManage

  const reset = () => { setForm(null); setLabel(''); setText(''); setErr(null); setArmDel(false) }
  // Closing hands focus back to the chip you opened; deleting must not, since
  // that chip is on its way out — so a delete calls reset() directly.
  const closeForm = () => { const back = form?.editing; reset(); if (back) chips.current.get(back)?.focus() }
  const startNew = () => { setManage(false); setForm({ editing: null }); setLabel(''); setText(''); setErr(null); setArmDel(false) }
  const startEdit = p => { setForm({ editing: p.label }); setLabel(p.label); setText(p.text); setErr(null); setArmDel(false) }
  const toggleManage = () => { reset(); setManage(v => !v) }
  const edited = () => { setErr(null); setArmDel(false) }   // typing walks back a pending delete

  const submit = e => {
    e.preventDefault()
    const why = form.editing                    // null = added/saved, string = rejected
      ? onUpdate(form.editing, label, text)
      : onAdd(label, text)
    if (why) return setErr(why)
    closeForm()
  }

  // First press arms, second removes. No dialog: the form already shows the
  // full text you are about to lose, which is the confirmation that matters.
  const del = () => {
    if (!armDel) return setArmDel(true)
    const why = onDelete(form.editing)
    if (why) { setArmDel(false); return setErr(why) }
    reset()
  }

  const escape = () => (armDel ? setArmDel(false) : closeForm())

  return (
    // `relative` here, and NOT on the chip wrapper below, is deliberate: it makes
    // the fieldset the popup's containing block, so the popup spans this card's
    // width instead of hanging off a button and getting clipped by the panel's
    // overflow-y-auto (which makes overflow-x non-visible too). It also means the
    // chips row must stay unpositioned.
    <fieldset className={`prompts ${FIELDSET} relative`}
              onKeyDown={e => { if (e.key === 'Escape' && managing && !form) setManage(false) }}>
      <legend className={LEGEND}>prompts</legend>

      {/* Controls live one level up from the prompts, in their own row and in
          their own quieter style. Sharing the chips' row and chrome made a
          control read as just another prompt. */}
      <div className="actions flex flex-wrap items-center gap-1">
        <button className={`new-prompt ${form && !form.editing ? BTN_ACTION_ON : BTN_ACTION}`}
                aria-expanded={!!form && !form.editing}
                onClick={() => (form && !form.editing ? closeForm() : startNew())}>+ new</button>
        {canManage && (
          <button className={`edit-prompts ${managing ? BTN_ACTION_ON : BTN_ACTION}`}
                  aria-pressed={managing}
                  onClick={toggleManage}>{managing ? 'done' : 'edit'}</button>
        )}
        {/* Only exists when it can do something. The prompts that ship are now
            deletable, and the seed is the only copy of their text — so this is
            the way back, and it is pointless clutter when nothing is missing. */}
        {managing && missing > 0 && (
          <button className={`restore-prompts ${BTN_ACTION}`} onClick={onRestore}>
            restore {missing}
          </button>
        )}
      </div>

      <div className={CHIP_ROW}>
      {prompts.map(p => {
        const editing = form?.editing === p.label
        // Three mutually exclusive looks, never appended to one another: a
        // toggle (armed or not), or — in edit mode — a target, or the one
        // currently open in the form.
        const look = managing
          ? (editing ? BTN_ON : BTN_TARGET)
          : (armed.includes(p.label) ? BTN_ON : BTN)
        return (
          <div className="group" key={p.label}>
            <button className={look}
                    ref={el => { el ? chips.current.set(p.label, el) : chips.current.delete(p.label) }}
                    onClick={() => (managing ? startEdit(p) : onToggle(p.label))}>{p.label}</button>
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
        )
      })}
      </div>

      {/* Below the chips, so entering the mode never shifts the chip you are
          about to click out from under the cursor. No `basis-full` on either
          this or the form any more: the card is flex-COL now, and flex-basis is
          the main axis — it would read as full HEIGHT and open a hole. */}
      {managing && !form && (
        <p className={`hint ${HINT}`}>
          {prompts.length ? 'pick one to edit' : 'none left — restore, or + new'}
        </p>
      )}

      {/* data-own-enter tells App's global handler that Enter in here submits
          this form instead of sending the message. */}
      {form && (
        <form data-own-enter className="flex flex-col gap-2" onSubmit={submit}
              onKeyDown={e => { if (e.key === 'Escape') escape() }}>
          {form.editing && <p className={`hint ${HINT}`}>editing “{form.editing}”</p>}
          {/* type="text" is load-bearing: App's ⌘A guard selects on
              `input[type=text]`, which does not match an input with no type */}
          <input className={TEXT_IN} type="text" value={label} autoFocus placeholder="label (button text)"
                 onChange={e => { setLabel(e.target.value); edited() }} />
          <textarea className={`${TEXT_IN} resize-none`} value={text} rows={3}
                    placeholder="text appended when armed"
                    onChange={e => { setText(e.target.value); edited() }} />
          {err && <span className="text-[11px] leading-snug text-danger">{err}</span>}
          <div className="flex gap-2">
            <button className={BTN} type="submit">{form.editing ? 'save' : 'add'}</button>
            <button className={BTN} type="button" onClick={closeForm}>cancel</button>
            {form.editing && (
              <button className={`prompt-delete ml-auto ${armDel ? BTN_DANGER : BTN}`}
                      type="button" onClick={del}>{armDel ? 'sure?' : 'delete'}</button>
            )}
          </div>
        </form>
      )}
    </fieldset>
  )
}
