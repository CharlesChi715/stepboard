import { useCallback, useState } from 'react'

const KEY = 'sb-hist'
const MAX = 5

// Last 5 input-bar texts — sent ✓ or abandoned drafts ✎ — kept in localStorage
// so they survive reloads. Same text twice: dropped and re-inserted at the top;
// a draft never replaces a known entry, and a newer text drops the drafts it extends.
export function useHistory() {
  const [hist, setHist] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  })

  const save = useCallback((text, kind) => {
    const t = (text || '').trim()
    if (!t) return
    setHist(prev => {
      if (kind === 'draft' && prev.some(h => h.text === t)) return prev
      const next = [{ text: t, kind },
        ...prev.filter(h => h.text !== t && !(h.kind === 'draft' && t.startsWith(h.text)))].slice(0, MAX)
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ }
      return next
    })
  }, [])

  return { hist, save }
}
