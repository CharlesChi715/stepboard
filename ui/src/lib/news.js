export const NEWS_ID = '2026-09-29.2'
export const NEWS_KEY = 'sb-news-seen'

export const KEYS = [
  ['⌘J', 'terminal'],
  ['⌘K', 'composer'],
  ['⌘⇧L', 'grab selection'],
  ['⌥1–9', 'arm prompt'],
  ['⇧⏎', 'newline'],
]

export const NEWS = [
  {
    title: 'Faster',
    items: [
      ['Reloading shows the terminal in ~40 ms instead of ~640 ms.', 'Press ⌘R.'],
      ['The launcher opens Safari as soon as the stack answers, and claude boots meanwhile.', 'Run claude-stepboard.'],
      ['The dev reloader watches file events instead of polling 1,700 files — about 30% of a core back.', null],
    ],
  },
  {
    title: 'Lighter',
    items: [
      ['claude-stepboard stop closes a board cleanly: its servers, its Safari tab and its tmux session — nothing else. Add --keep to leave claude running; claude-stepboard ls shows what is up.', 'Run claude-stepboard ls.'],
      ['claude-stepboard now runs "use" mode: the built panel on :800N, no Vite, no reloader (~80 MB instead of ~480 MB).', 'Run claude-stepboard dev for the old hot-reload setup.'],
    ],
  },
  {
    title: 'Safer',
    items: [
      ['Other websites can no longer reach your terminal: ttyd listens on a private socket and the panel talks to it through /api/ws with Host and Origin checks.', null],
    ],
  },
  {
    title: 'Sending',
    items: [
      ['/commands and !shell lines are sent exactly as typed, with no clauses or prompts appended.', 'Type /cost and look at the line under the composer.'],
      ['The line under the composer shows what will be appended.', 'Arm a prompt and watch it change.'],
      ['Long messages arrive whole — no more [Pasted text] or a lost beginning.', 'Grab a big block with ⌘⇧L and send it.'],
      ['A failed send says so in the status line and keeps your draft; a trailing ";" is no longer eaten.', null],
    ],
  },
  {
    title: 'Terminal',
    items: [
      ['The terminal reconnects by itself after a drop. When claude exits, press ⏎ in the terminal (or click the pill) to restart it.', null],
      ['Shift+Enter inserts a newline in Claude, like in a native terminal.', 'Press ⌘J, then ⇧⏎.'],
      ['Emoji and symbol widths now match tmux, so rows no longer garble.', null],
      ['The tab title follows Claude\'s conversation, and a ● appears when Claude rings the bell in a background tab.', null],
      ['The selection highlight is readable, and the last row is no longer clipped.', 'Drag across a grey line.'],
    ],
  },
  {
    title: 'Panel',
    items: [
      ['Every shortcut is listed in the SHORTCUTS card at the bottom of the panel. Click its title to fold it away.', null],
      ['Send lives in the composer, the composer grows with its text, and the panel widens on big screens.', null],
      ['⌥1–9 arm and disarm prompts; hover a chip to see its number.', 'Press ⌥1.'],
      ['Clicking a chip, Send or a history row keeps your caret in the composer.', null],
      ['Reorder prompts with ◀ ▶ in edit mode. Edits from another session show up when you return to the tab.', 'Click edit, then a prompt.'],
      ['History keeps what you sent instead of filling with half-typed drafts.', null],
      ['Messages moved to a status line at the bottom of the panel, off Claude\'s footer. The key diagnostic is now behind ?keys.', null],
    ],
  },
]
