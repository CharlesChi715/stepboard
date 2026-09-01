import { useCallback, useState } from 'react'

const KEY = 'sb-prompts'

// The prompts that ship with the panel. Custom ones are made from the UI and
// live in localStorage, so they survive a reload without touching this file.
export const BUILTIN = [
  { label: 'pro', text: "What's the pro and professional way to do this?" },
  { label: 'socratic', text: "Use socratic way." },
  { label: 'first principles', text: "Use first principles." },
]

export const isBuiltin = label => BUILTIN.some(p => p.label === label)

// Built-ins first, then yours — a fixed order, so the buttons never reshuffle
// between reloads. The label is the identity (App arms by label), so a new one
// that collides with an existing prompt is refused rather than shadowing it.
// That is also why an edit that renames re-runs the same collision check, and
// why App has to carry a rename over to its `armed` list.
export function usePrompts() {
  const [custom, setCustom] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]')
      return Array.isArray(saved) ? saved.filter(p => p?.label && p?.text) : []
    } catch { return [] }
  })

  const prompts = [...BUILTIN, ...custom]

  // The one place that writes: every mutation goes through here, so no path can
  // update the buttons but forget the disk.
  const commit = useCallback(next => {
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ }
    setCustom(next)
  }, [])

  // Shared gate for add and update. `keep` is the label being renamed, which is
  // allowed to collide with itself — fixing only the text is not a duplicate.
  // → null when the fields are good, or a short reason the form can show inline
  const check = useCallback((l, t, keep) => {
    if (!l || !t) return 'label and text are both required'
    const clash = prompts.some(p =>
      p.label.toLowerCase() === l.toLowerCase() && p.label !== keep)
    return clash ? `"${l}" already exists` : null
  }, [prompts])

  const add = useCallback((label, text) => {
    const l = (label || '').trim()
    const t = (text || '').trim()
    const why = check(l, t)
    if (why) return why
    commit([...custom, { label: l, text: t }])
    return null
  }, [check, commit, custom])

  // Edits in place, never remove-then-append: the row keeps its order, so a
  // prompt does not jump to the end of the list just because you fixed a typo.
  const update = useCallback((label, nextLabel, nextText) => {
    if (isBuiltin(label)) return 'built-in prompts cannot be edited'
    const i = custom.findIndex(p => p.label === label)
    if (i < 0) return 'that prompt is gone'
    const l = (nextLabel || '').trim()
    const t = (nextText || '').trim()
    const why = check(l, t, label)
    if (why) return why
    commit(custom.map((p, j) => (j === i ? { label: l, text: t } : p)))
    return null
  }, [check, commit, custom])

  const remove = useCallback(label => {
    if (isBuiltin(label)) return 'built-in prompts cannot be deleted'
    if (!custom.some(p => p.label === label)) return 'that prompt is gone'
    commit(custom.filter(p => p.label !== label))
    return null
  }, [commit, custom])

  return { prompts, add, update, remove }
}
