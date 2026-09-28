import { useRef } from 'react'

// The input bar. Enter sends, Shift+Enter makes a newline, and ↑/↓ walk history
// only once the caret has HIT the boundary — otherwise the arrows move normally.
export default function MessageBar({ value, setValue, onSend, hist, onBlurSave, inputRef }) {
  const idx = useRef(-1)          // -1 = you are on your own live text
  const draft = useRef('')        // what you were typing before browsing history

  const onKeyDown = e => {
    const el = e.currentTarget
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); onSend(); return }

    if (e.key === 'ArrowUp' && (el.selectionStart === 0 || idx.current !== -1)
        && idx.current + 1 < hist.length) {
      e.preventDefault()
      if (idx.current === -1) draft.current = value
      idx.current += 1
      setValue(hist[idx.current].text)
    } else if (e.key === 'ArrowDown' && (el.selectionEnd === value.length || idx.current !== -1)
               && idx.current >= 0) {
      e.preventDefault()
      idx.current -= 1
      setValue(idx.current === -1 ? draft.current : hist[idx.current].text)
    }
  }

  return (
    <textarea
      ref={inputRef}
      className="field-sizing-content max-h-[45vh] min-h-[150px] resize-none touch-manipulation
                 bg-transparent px-2.5 py-2 text-ink outline-none placeholder:text-muted"
      value={value}
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      autoComplete="off"
      aria-label="message to Claude"
      placeholder="Type to Claude… Enter sends · ⇧Enter newline · ↑ history"
      onChange={e => { idx.current = -1; setValue(e.target.value) }}  // editing = it's yours now
      onKeyDown={onKeyDown}
      onBlur={() => onBlurSave(value)}
    />
  )
}
