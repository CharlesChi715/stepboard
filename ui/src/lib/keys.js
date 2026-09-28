export const SHORTCUTS = [
  {
    where: 'anywhere',
    keys: [
      ['⌘J', 'jump to the terminal'],
      ['⌘K', 'jump to the composer'],
      ['⌘⇧L', 'grab the terminal selection (⌃⇧L too)'],
      ['⌥1–9', 'arm / disarm prompt 1–9'],
      ['⏎', 'send, from anywhere outside the terminal'],
      ['⌃⇧Q', 'close this StepBoard; claude keeps running (asks first)'],
    ],
  },
  {
    where: 'composer',
    keys: [
      ['⇧⏎', 'new line'],
      ['↑ ↓', 'walk history, once the caret hits the edge'],
      ['⌘A', 'select all of the draft'],
    ],
  },
  {
    where: 'terminal',
    keys: [
      ['drag', 'select text — copied to the clipboard'],
      ['⇧⏎', 'new line in Claude'],
      ['⏎', 'restart claude after it exits'],
    ],
  },
  {
    where: 'prompt editor',
    keys: [
      ['esc', 'back out: confirm → form → edit mode'],
    ],
  },
]
