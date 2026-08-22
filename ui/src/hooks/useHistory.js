import { useCallback, useState } from 'react'

const KEY = 'sb-hist'
const MAX = 5

// Last 5 input-bar texts — sent ✓ or abandoned drafts ✎ — kept in localStorage
// so they survive reloads. Same text twice: dropped and re-inserted at the top.
export function useHistory() {
  const [hist, setHist] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  })

  const save = useCallback((text, kind) => {
    const t = (text || '').trim()
    if (!t) return
    setHist(prev => {
      const next = [{ text: t, kind }, ...prev.filter(h => h.text !== t)].slice(0, MAX)
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ }
      return next
    })
  }, [])

  return { hist, save }
}
