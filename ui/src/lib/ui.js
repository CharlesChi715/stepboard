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

// A prompt while the row is in `edit` mode. It is no longer a toggle but a
// target, so it drops the armed blue entirely — dashed says "not a switch",
// green says "safe to press". A whole alternative to BTN/BTN_ON, never appended.
export const BTN_TARGET =
  'cursor-pointer touch-manipulation rounded-md border border-dashed border-good/60 ' +
  'bg-good/10 px-2.5 py-1.5 text-good transition-colors hover:bg-good/20 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-good/60'

// A control that acts ON the prompts (+ new · edit · restore) rather than
// being one. It sits in its own row above the chips AND is smaller and quieter
// than any chip: same row plus same chrome made the two too easy to confuse.
// Bordered but transparent, so it takes no ink until you reach for it.
export const BTN_ACTION =
  'cursor-pointer touch-manipulation rounded-md border border-transparent bg-transparent px-2 py-1 ' +
  'text-[11px] text-muted transition-colors hover:bg-control hover:text-ink ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-armed/60'

// …the same control while its mode is on. Tinted, not solid — it is still a
// secondary control, so it must not out-shout an armed prompt or Send.
export const BTN_ACTION_ON =
  'cursor-pointer touch-manipulation rounded-md border border-armed/50 bg-armed/15 px-2 py-1 ' +
  'text-[11px] text-armed transition-colors hover:bg-armed/25 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-armed/60'

// The second press of a two-press delete. Red is spent here and nowhere else,
// so it only ever appears on the one control that destroys something.
export const BTN_DANGER =
  'cursor-pointer touch-manipulation rounded-md border border-danger bg-danger/15 px-2.5 py-1.5 ' +
  'text-danger transition-colors hover:bg-danger/25 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/60'

// A line of explanation inside a card — quieter than its controls. No basis
// here: flex-basis is the MAIN axis, so `basis-full` reads as full WIDTH in the
// wrapping prompts row but as full HEIGHT inside a flex-col form. The row adds
// it at the call site; the form must not.
export const HINT = 'text-[11px] leading-snug text-muted'

// A fieldset is a card, not a box: the raised background already separates it
// from the panel, so an outline on top of that is a second edge doing the same
// job. Only `edits` draws one, because there it carries meaning (the mood).
const FIELD = 'rounded-lg border bg-card px-3 pt-2 pb-3'   // the frame, minus its colour
export const FIELDSET = `${FIELD} flex flex-col gap-2 border-transparent`
// The prompt chips, which wrap into rows. A row INSIDE the prompts card now,
// not the card itself: the card stacks an actions row above the chips, and the
// two must not share a direction or a control ever reads as a prompt.
export const CHIP_ROW = 'chips flex flex-row flex-wrap gap-2'
// edits supplies its own border colour every time, transparent included, so the
// mood frame appears in place — the width is always there, nothing reflows
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

// Free text — same chrome as NUM, but it fills the width it is given instead of
// sitting mid-sentence. The panel is 15rem wide, so these fields always stack.
export const TEXT_IN =
  'w-full rounded-md border border-edge bg-control px-2 py-1 text-ink touch-manipulation ' +
  'placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-armed/60'

// The terminal host. xterm.js builds its own DOM inside, so those elements are
// only reachable with descendant variants from out here.
//   cursor-text — I-beam, never the drag-a-thing circle: xterm switches to
//   `default` while an app has mouse reporting on, and macOS shows "no drop"
//   for a native drag.
//   The scrollbar rules earn their keep: xterm.css sets `overflow-y: scroll`
//   (not auto) on .xterm-viewport, so a ~15px gutter is ALWAYS reserved at the
//   terminal's right edge. On a Mac set to "show scroll bars: always" that
//   gutter is painted by the OS as a light bar — a white strip between the two
//   panes. Styling ::-webkit-scrollbar makes Chromium draw our own instead.
export const TERM =
  'term min-w-0 flex-1 overflow-hidden bg-black py-1 pl-1.5 ' +
  '[&_.xterm]:h-full ' +
  '[&_.xterm-viewport::-webkit-scrollbar]:w-2.5 ' +
  '[&_.xterm-viewport::-webkit-scrollbar]:bg-black ' +
  '[&_.xterm-viewport::-webkit-scrollbar-thumb]:rounded-full ' +
  '[&_.xterm-viewport::-webkit-scrollbar-thumb]:bg-edge ' +
  '[&_.xterm-screen]:cursor-text [&_.xterm-rows]:cursor-text ' +
  '[&_canvas]:select-none [&_.xterm-rows]:select-none ' +
  '[&_canvas]:[-webkit-user-drag:none] [&_.xterm-rows]:[-webkit-user-drag:none]'
