import { useCallback, useState } from 'react'

const KEY = 'sb-prompts'

// The prompts a fresh browser starts with. Nothing more: once seeded they are
// ordinary prompts, editable and deletable like any you make yourself. This
// array is a SEED, not a floor — see `seeded` below for why that distinction
// has to be written down on disk.
export const BUILTIN = [
  { label: 'pro', text: "What's the pro and professional way to do this?" },
  { label: 'socratic', text: "Use socratic way." },
  { label: 'first principles', text: "Use first principles." },
]

const clean = list => (Array.isArray(list) ? list.filter(p => p?.label && p?.text)
                                                 .map(p => ({ label: p.label, text: p.text })) : [])

// Stored shape: { list, seeded }.
//   list   — every prompt, in row order. The whole truth; BUILTIN is not
//            prepended at render time any more, or built-ins could never be
//            reordered, edited or removed.
//   seeded — the BUILTIN labels this browser has already been given. Without
//            it, `list` alone cannot tell "I deleted `pro`" from "`pro` was
//            added to the source after I first loaded", so a new built-in
//            could never reach an existing browser, or a deleted one would
//            come back on every load. With it, both work: a BUILTIN label
//            missing from `seeded` is new and gets appended, once.
function load() {
  let raw = null
  try { raw = JSON.parse(localStorage.getItem(KEY) || 'null') } catch { /* private mode */ }

  // v1 stored a bare array of only YOUR prompts, with BUILTIN implicit in
  // front of them. Read it that way, once, and it becomes the v2 list.
  let list, seeded
  if (Array.isArray(raw)) {
    list = [...BUILTIN, ...clean(raw)]
    seeded = BUILTIN.map(p => p.label)
  } else if (raw && typeof raw === 'object') {
    list = clean(raw.list)
    seeded = Array.isArray(raw.seeded) ? raw.seeded.filter(l => typeof l === 'string') : []
  } else {
    list = [...BUILTIN]
    seeded = BUILTIN.map(p => p.label)
  }

  // Hand over any built-in this browser has never seen. A label already taken
  // by one of yours is skipped but still marked seeded, so it is not retried
  // on every load.
  for (const b of BUILTIN) {
    if (seeded.includes(b.label)) continue
    seeded = [...seeded, b.label]
    if (!list.some(p => p.label.toLowerCase() === b.label.toLowerCase())) list = [...list, b]
  }
  return { list, seeded }
}

// Every prompt is the same kind of thing. The label is the identity — App arms
// by label — so a duplicate is refused rather than shadowing, and a rename has
// to be carried into App's `armed` list.
export function usePrompts() {
  const [{ list, seeded }, setState] = useState(load)

  const commit = useCallback(next => {
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ }
    setState(next)
  }, [])

  // Shared gate for add and update. `keep` is the label being renamed, which is
  // allowed to collide with itself — fixing only the text is not a duplicate.
  // → null when the fields are good, or a short reason the form can show inline
  const check = useCallback((l, t, keep) => {
    if (!l || !t) return 'label and text are both required'
    const clash = list.some(p =>
      p.label.toLowerCase() === l.toLowerCase() && p.label !== keep)
    return clash ? `"${l}" already exists` : null
  }, [list])

  const add = useCallback((label, text) => {
    const l = (label || '').trim()
    const t = (text || '').trim()
    const why = check(l, t)
    if (why) return why
    commit({ list: [...list, { label: l, text: t }], seeded })
    return null
  }, [check, commit, list, seeded])

  // Edits in place, never remove-then-append: the row keeps its order, so a
  // prompt does not jump to the end of the list just because you fixed a typo.
  const update = useCallback((label, nextLabel, nextText) => {
    const i = list.findIndex(p => p.label === label)
    if (i < 0) return 'that prompt is gone'
    const l = (nextLabel || '').trim()
    const t = (nextText || '').trim()
    const why = check(l, t, label)
    if (why) return why
    commit({ list: list.map((p, j) => (j === i ? { label: l, text: t } : p)), seeded })
    return null
  }, [check, commit, list, seeded])

  const remove = useCallback(label => {
    if (!list.some(p => p.label === label)) return 'that prompt is gone'
    commit({ list: list.filter(p => p.label !== label), seeded })
    return null
  }, [commit, list, seeded])

  // Deleting a shipped prompt used to be impossible, so there was nothing to
  // undo. Now it is, and the seed is the only copy of that text — so putting
  // the missing ones back has to be reachable from the panel.
  const missing = BUILTIN.filter(b =>
    !list.some(p => p.label.toLowerCase() === b.label.toLowerCase()))

  // Appends only what is absent. An edited prompt keeps its edit, because it is
  // still there under that label; delete it first to get the original back.
  const restore = useCallback(() => {
    if (!missing.length) return 'nothing to restore'
    commit({ list: [...list, ...missing], seeded })
    return null
  }, [commit, list, missing, seeded])

  return { prompts: list, add, update, remove, restore, missing: missing.length }
}
