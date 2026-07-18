# RIOT PRESS — passes

## Build — 2026-07-12

**Concept.** RIOT PRESS / NOISE 013 — an anti-design punk zine landing page.
Photocopier-fume mood on newsprint, xerox black, toxic lime and shock pink.
The whole page runs on a controlled-chaos rule: every element sits on an
invisible grid and rotation stays inside 0.5°–3°, so the mess reads as
production logic (scissors, tape, stapler) rather than randomness.

**Implemented.**
- Ransom-letter typography: hero headline and logo split into per-letter
  `<span>`s, styled via six repeating `nth-of-type(6n±)` variants (bg,
  border, font, rotation, size) instead of hand-classing every glyph —
  chaotic per letter, systematic underneath. Visually-hidden plain-text
  duplicates keep both readable to screen readers.
- Signature technique: a fixed full-viewport `<canvas>` spray-paint cursor
  trail. `pointermove` drops clustered lime dots whose density/count scale
  with pointer speed; a `requestAnimationFrame` loop fades the canvas each
  frame via `globalCompositeOperation = 'destination-out'`, so old paint
  erases faster than new paint lands — that's the trail. `mix-blend-mode:
  multiply` tints rather than flattens the newsprint underneath. A ring
  cursor stands in for the system pointer. Fully gated behind
  `matchMedia('(pointer: fine)')` and `prefers-reduced-motion` — no canvas,
  no listeners, no cost on touch or reduced-motion.
- Two opposite-direction marquee tickers (top/bottom, different speeds) for
  continuous ambient motion; a slow diagonal scanbar sweep; an issue-number
  stamp that flickers/glitches its digits on a randomized interval like a
  dying photocopier — all pause on `document.hidden` and drop to a static
  frame under reduced motion.
- CSS-only halftone "photos": one `radial-gradient` dot tile clipped by a
  second radial `mask-image` for the vignette, taped at angles with
  repeating-gradient "masking tape" strips; hover un-rotates + lifts.
  Table of contents rows sit tilted and snap straight + sweep lime on
  hover/focus via a scaled `::before` and a spring `cubic-bezier`. Stickers
  ("AS SEEN ON NO TV", "100% UNCALIBRATED") with one full peel-corner hover
  via a rotating `::after` fold. Manifesto section mixes struck-through
  "corrections", pink highlight spans, and an inline-SVG squiggle
  `background-image` for hand-edited underlines. Barcode is 30 bars from a
  tiny seeded PRNG (deterministic, no reload jitter).
- Craft: inline SVG favicon, full meta/OG, footer per spec, focus-visible
  outlines, `lang`/viewport/charset, DPR capped at 2 on the canvas, RAF
  paused on `visibilitychange`, guide page in the site's own type system.

**Visual QA.** Snapped at 1440×900 and 390×844 via `tools/snap.mjs`; fixed
marquee/content overlap, tightened sticker and photo rotation ranges on
mobile so nothing clipped the viewport edge, confirmed zero console errors
and a clean reduced-motion path.
