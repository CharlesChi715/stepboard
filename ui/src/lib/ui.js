// Shared Tailwind class strings.
//
// Preflight strips native chrome — border, background, padding — off every
// button and input, so the panel rebuilds it once here instead of repeating a
// dozen utilities at each call site.
//
// Two utilities of the same kind on one element (`border-edge border-danger`,
// `text-muted text-danger`, `px-2 p-3`) are decided by stylesheet order, NOT
// className order. So every pairing below is mutually exclusive, never additive.

// Everything clickable shares this: chrome, motion, and a focus ring. The ring
// matters more here than on the old light theme — the native one is invisible
// against a near-black panel.
const CTRL =
  'cursor-pointer touch-manipulation rounded-md border border-edge bg-control text-ink ' +
  'transition-colors hover:bg-control-hi active:bg-control-on ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-armed/60'

export const BTN = `${CTRL} px-2.5 py-1.5`

// Send is the panel's primary action but used to look exactly like `history`
// and `summarize`. It is the only solid-accent control on the page.
export const BTN_BIG =
  'cursor-pointer touch-manipulation rounded-lg border border-armed bg-armed px-3 py-3 ' +
  'text-base font-semibold text-bg transition-colors hover:bg-armed-hi active:bg-armed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-armed/60'

// An armed prompt — a whole alternative to BTN, never appended to it. Tinted
// rather than solid, so it reads as "on" without competing with Send.
export const BTN_ON =
  'cursor-pointer touch-manipulation rounded-md border border-armed bg-armed/15 px-2.5 py-1.5 ' +
  'text-armed transition-colors hover:bg-armed/25 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-armed/60'

const FIELD = 'rounded-lg border bg-card px-3 pt-1.5 pb-3'   // the frame, minus its colour
export const FIELDSET = `${FIELD} flex flex-col gap-2 border-edge-soft`
// prompts wrap into rows — its own direction, and no `!important` to win it
export const FIELDSET_ROW = `${FIELD} flex flex-row flex-wrap gap-2 border-edge-soft`
// edits picks its own frame colour, so it starts from the uncoloured base
export const FIELDSET_BARE = `${FIELD} flex flex-col gap-2`

// A legend is a section label, not prose — small, spaced, and quiet.
const LEGEND_BASE = 'px-1.5 text-[10px] font-medium tracking-[0.08em] uppercase'
export const LEGEND = `${LEGEND_BASE} text-muted`
export const LEGEND_BARE = LEGEND_BASE                       // edits tints its own

// Labels stay inline flow, not flex: "at most [42]" and "≤ [20] lines per step"
// mix text and inputs mid-sentence and must wrap like a sentence.
export const LABEL = 'touch-manipulation'
export const NUM =
  'mx-1.5 w-14 rounded-md border border-edge bg-control px-1.5 py-1 text-ink touch-manipulation ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-armed/60'
// accent-armed tints the native tick itself; without it macOS draws its own blue
export const TICK = 'mr-2 accent-armed align-middle touch-manipulation'

// The terminal host. xterm.js builds its own DOM inside, so those elements are
// only reachable with descendant variants from out here.
//   cursor-text — I-beam, never the drag-a-thing circle: xterm switches to
//   `default` while an app has mouse reporting on, and macOS shows "no drop"
//   for a native drag.
export const TERM =
  'term min-w-0 flex-1 overflow-hidden bg-black py-1 pl-1.5 ' +
  '[&_.xterm]:h-full ' +
  '[&_.xterm-screen]:cursor-text [&_.xterm-rows]:cursor-text ' +
  '[&_canvas]:select-none [&_.xterm-rows]:select-none ' +
  '[&_canvas]:[-webkit-user-drag:none] [&_.xterm-rows]:[-webkit-user-drag:none]'
