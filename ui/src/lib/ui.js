// Shared Tailwind class strings.
//
// Preflight strips native chrome — border, background, padding — off every
// button and input, so the panel rebuilds it once here instead of repeating a
// dozen utilities at each call site.
//
// Two utilities of the same kind on one element (`border-edge border-danger`,
// `px-2 p-3`) are decided by stylesheet order, NOT className order. So every
// pairing below is mutually exclusive rather than additive.

const CHROME =
  'cursor-pointer touch-manipulation rounded border border-edge bg-chrome ' +
  'hover:bg-chrome-hover active:bg-chrome-active'

export const BTN = `${CHROME} px-2 py-1`
export const BTN_BIG = `${CHROME} p-3 text-base font-semibold`

// An armed prompt — a whole alternative to BTN, never appended to it.
export const BTN_ON =
  'cursor-pointer touch-manipulation rounded border border-armed bg-armed px-2 py-1 ' +
  'text-white hover:bg-armed-hover'

const FIELD = 'rounded-lg border px-2.5 pt-1 pb-2'        // the frame, minus its colour
export const FIELDSET = `${FIELD} flex flex-col gap-1.5 border-edge`
// prompts wrap into rows — its own direction, and no `!important` to win it
export const FIELDSET_ROW = `${FIELD} flex flex-row flex-wrap gap-2 border-edge`
// edits picks its own frame colour, so it starts from the uncoloured base
export const FIELDSET_BARE = `${FIELD} flex flex-col gap-1.5`

export const LEGEND = 'px-1'
export const LABEL = 'touch-manipulation'
export const NUM =
  'mx-1 w-14 rounded border border-edge bg-white px-1 py-0.5 touch-manipulation'
export const TICK = 'mr-1 touch-manipulation'             // radio + checkbox

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
