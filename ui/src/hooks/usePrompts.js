import { useCallback, useState } from 'react'

const KEY = 'sb-prompts'

// The prompts that ship with the panel. Custom ones are made from the UI and
// live in localStorage, so they survive a reload without touching this file.
export const BUILTIN = [
  { label: 'pro', text: "What's the pro and professional way to do this?" },
  { label: 'socratic', text: "Use socratic way." },
  { label: 'first principles', text: "Use first principles." },
]

// Built-ins first, then yours — a fixed order, so the buttons never reshuffle
// between reloads. The label is the identity (App arms by label), so a new one
// that collides with an existing prompt is refused rather than shadowing it.
export function usePrompts() {
  const [custom, setCustom] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]')
      return Array.isArray(saved) ? saved.filter(p => p?.label && p?.text) : []
    } catch { return [] }
  })

  const prompts = [...BUILTIN, ...custom]

  // → null when it was added, or a short reason the form can show inline
  const add = useCallback((label, text) => {
    const l = (label || '').trim()
    const t = (text || '').trim()
    if (!l || !t) return 'label and text are both required'
    if (prompts.some(p => p.label.toLowerCase() === l.toLowerCase())) return `"${l}" already exists`
    setCustom(prev => {
      const next = [...prev, { label: l, text: t }]
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ }
      return next
    })
    return null
  }, [prompts])

  return { prompts, add }
}
