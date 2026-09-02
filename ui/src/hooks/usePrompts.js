import { useCallback, useEffect, useRef, useState } from 'react'

const OLD_KEY = 'sb-prompts'          // where prompts lived before the server owned them
const MIGRATED = 'sb-prompts-migrated'

// The prompts a fresh install starts with. Nothing more: once seeded they are
// ordinary prompts, editable and deletable like any you make yourself. This
// array is a SEED, not a floor — see `seeded` below for why that distinction
// has to be written down in the store.
export const BUILTIN = [
  { label: 'pro', text: "What's the pro and professional way to do this?" },
  { label: 'socratic', text: "Use socratic way." },
  { label: 'first principles', text: "Use first principles." },
]

const clean = list => (Array.isArray(list) ? list.filter(p => p?.label && p?.text)
                                                 .map(p => ({ label: p.label, text: p.text })) : [])

// Doc shape: { list, seeded }.
//   list   — every prompt, in row order. The whole truth; BUILTIN is not
//            prepended at render time, or a seeded prompt could never be
//            edited, reordered or removed.
//   seeded — the BUILTIN labels this install has already been given. Without
//            it, `list` alone cannot tell "I deleted `pro`" from "`pro` was
//            added to the source after I first loaded", so a new seed could
//            never arrive, or a deleted one would come back on every load.

// Whatever the old per-browser store held, read as a doc. v1 was a bare array
// of only YOUR prompts, with BUILTIN implicit in front of them.
function fromLocalStorage() {
  let raw = null
  try { raw = JSON.parse(localStorage.getItem(OLD_KEY) || 'null') } catch { return null }
  if (Array.isArray(raw)) return { list: [...BUILTIN, ...clean(raw)], seeded: BUILTIN.map(p => p.label) }
  if (raw && typeof raw === 'object') {
    return { list: clean(raw.list),
             seeded: Array.isArray(raw.seeded) ? raw.seeded.filter(l => typeof l === 'string') : [] }
  }
  return null
}

// Hand over any seed this install has never seen. A label already taken by one
// of yours is skipped but still marked seeded, so it is not retried every load.
//
// → NULL when nothing changed, and that is the whole contract. Returning the
// doc "unchanged" is a trap: the caller builds a fresh object to pass in, so an
// identity check against the ORIGINAL is always true and every page load turns
// into a write. Two sessions open then bump `rev` past each other and the next
// real edit dies on a 409.
function withNewSeeds({ list, seeded }) {
  let grew = false
  for (const b of BUILTIN) {
    if (seeded.includes(b.label)) continue
    seeded = [...seeded, b.label]
    grew = true
    if (!list.some(p => p.label.toLowerCase() === b.label.toLowerCase())) list = [...list, b]
  }
  return grew ? { list, seeded } : null
}

// Every prompt is the same kind of thing. The label is the identity — App arms
// by label — so a duplicate is refused rather than shadowing, and a rename has
// to be carried into App's `armed` list.
//
// The store is now the server's `prompts.json`, one file for every session and
// port. `onError` is how a failed write reaches the user: the panel would
// otherwise show a prompt that is not actually saved anywhere.
export function usePrompts(onError) {
  const [doc, setDoc] = useState(null)      // null until the first GET lands
  const revRef = useRef(0)
  const say = useRef(onError)
  say.current = onError                     // no re-subscribing just because App re-rendered

  // One writer. Optimistic, because the panel is talking to a server on
  // localhost and a round-trip of latency on every keystroke-sized edit would
  // be worse than the rare rollback.
  // `rollback` is explicit because the first write happens from inside the load
  // effect, where the captured `doc` is still null — rolling back to that would
  // strand the panel on "loading" for good. Seeding passes the seed itself, so
  // a failed first save shows the prompts and says they are unsaved.
  const commit = useCallback(async (next, rollback = doc) => {
    setDoc(next)
    let r
    try {
      r = await fetch('/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rev: revRef.current, doc: next }),
      })
    } catch {
      setDoc(rollback); say.current?.('prompts: server unreachable, not saved', true)
      return
    }
    const saved = await r.json().catch(() => null)
    if (r.ok) { revRef.current = saved?.rev ?? revRef.current; return }
    if (r.status === 409 && saved?.doc) {      // another session wrote first
      revRef.current = saved.rev
      setDoc(saved.doc)
      say.current?.('prompts changed in another session — reloaded', true)
      return
    }
    setDoc(rollback); say.current?.('prompts: save failed', true)
  }, [doc])

  // First load. Seeding happens HERE and not on the server, so the seed list
  // stays in this file — adding a prompt to the app is still a one-file change.
  useEffect(() => {
    let alive = true
    ;(async () => {
      let got = null
      try { got = await (await fetch('/prompts')).json() } catch { /* handled below */ }
      if (!alive) return
      if (!got) { say.current?.('prompts: could not load', true); setDoc({ list: [], seeded: [] }); return }
      revRef.current = got.rev || 0

      if (got.doc) {
        const base = { list: clean(got.doc.list), seeded: got.doc.seeded || [] }
        const grown = withNewSeeds(base)
        setDoc(grown || base)
        if (grown) commit(grown, grown)          // a new seed arrived — persist it once
        return                                   // otherwise a load NEVER writes
      }

      // No file yet. Adopt whatever this browser was keeping, so moving to the
      // server does not look like losing your prompts; otherwise start clean.
      const adopted = fromLocalStorage()
      const base = adopted || { list: [...BUILTIN], seeded: BUILTIN.map(p => p.label) }
      const seed = withNewSeeds(base) || base
      setDoc(seed)
      await commit(seed, seed)
      // One-time: keep the old copy as a backup but stop it being a source, or
      // deleting prompts.json to reset would quietly resurrect it.
      if (adopted) {
        try {
          localStorage.setItem(MIGRATED, localStorage.getItem(OLD_KEY))
          localStorage.removeItem(OLD_KEY)
        } catch { /* private mode */ }
      }
    })()
    return () => { alive = false }
  }, [])                                    // once — commit's identity must not re-run this

  const list = doc?.list ?? []
  const seeded = doc?.seeded ?? []

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

  // Deleting a seeded prompt used to be impossible, so there was nothing to
  // undo. Now it is, and BUILTIN is the only copy of that text — so putting the
  // missing ones back has to be reachable from the panel.
  const missing = BUILTIN.filter(b =>
    !list.some(p => p.label.toLowerCase() === b.label.toLowerCase()))

  // Appends only what is absent. An edited prompt keeps its edit, because it is
  // still there under that label; delete it first to get the original back.
  const restore = useCallback(() => {
    if (!missing.length) return 'nothing to restore'
    commit({ list: [...list, ...missing], seeded })
    return null
  }, [commit, list, missing, seeded])

  return { prompts: list, ready: doc !== null, add, update, remove, restore, missing: missing.length }
}
