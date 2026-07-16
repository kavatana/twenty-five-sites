# STRATA — iteration log

## Build — 2026-07-08

**Concept.** A dark-gallery site that holds exactly one painting: a flow-field artwork
minted from a fresh 32-bit seed on every visit. The seed is the artwork — shown on a
brass plaque ("Edition No. 4821-C" style) and reproducible on demand. "Re-mint"
destroys the current edition and commissions another, with a museum-label update.

**Implemented.**
- `FlowPainting` engine: mulberry32 PRNG → seeded 2D value-noise fBm → angle field;
  1,600 particles (850 mobile) advected with per-step low-alpha strokes on an
  uncleared Canvas 2D surface. Strokes batched by (ink × width bucket) into ~18
  `stroke()` calls per substep. Development eases 9→1 substeps over 16 s, then an
  ambient phase drifts the field offsets forever at alpha 0.013.
- Color-as-strata: ink chosen at particle birth from a coarser rotated fBm read,
  producing geological bands; 4 curated palettes (Ember, Glacier, Moss, Dusk), inks
  ordered dark→light.
- Room I: ornate-thin frame (layered gradients, corner escutcheons, inner hairlines),
  brass plaque with sheen animation, museum label card with live minting status,
  Re-mint flow (lights dim → new seed → plaque stamp).
- Room II: horizontal-scroll wall of 6 pre-seeded editions built from a JS manifest,
  IntersectionObserver-triggered development, wheel→horizontal conversion with
  scroll-trap escape, prev/next buttons, edge masks.
- Process section: 117 live SVG arrows re-aimed each frame by the same fBm + two
  walker particles with fading polyline trails; only animates while in viewport.
- Ambience: radial-gradient spotlight cones with 9–12 s breathe, feTurbulence grain,
  cursor lamp (radial gradient, mix-blend screen, lerped follow, disabled for
  coarse pointers), staggered entrances (load-in for hero, IO reveals below).
- Craft: DPR cap 2, rAF halted on `document.hidden`, `prefers-reduced-motion` path
  fast-forwards paintings in chunked frames and freezes all ambient motion,
  focus-visible brass outlines, inline SVG favicon, full meta/og, guide page styled
  as "conservation notes," footer per spec.

**Why.** The brief's signature is the minting engine; everything else (lighting,
plaques, copy) exists to make the generative canvas feel curated rather than demoed.

## Pass 1 — 2026-07-12

**Focus.** Art direction — fresh eyes against the live screenshots at 1440×900 and
390×844. The generative engine, copy, and Room II/Process sections were already
strong; this pass found and fixed four things that read as broken, cheap, or
mis-prioritized once actually *seen* rather than read as code.

**Fixed.**
- **Header ghosting.** `.site-head` used a gradient that faded to fully transparent
  by its own bottom edge, so any scrolled content (wall text, the process arrow
  grid, plaques) visibly double-exposed through the fixed nav on every scroll
  position past the hero — confirmed in both desktop and mobile screenshots.
  Replaced with a solid `rgba` fill + `backdrop-filter: blur(16px) saturate(1.15)`,
  a hairline bottom border, and a soft drop shadow — legible at every scroll depth,
  still feels like glass rather than a flat bar.
- **Mobile hero buried the painting.** At 390×844 the entire first viewport was
  eyebrow + headline + prose + buttons + label card; the actual generative artwork
  — the whole point of the site — didn't appear until several screens of scrolling.
  For a gallery whose one job is "show a painting nobody has seen before," that's
  backwards. Swapped the mobile order so the easel/frame leads and the wall text
  follows as a caption, and tightened the hero's top padding (110px → 96px) to
  match. The painting is now the first thing a mobile visitor sees.
- **Dead hamburger.** The decorative three-line "tick" beside the wordmark reads
  exactly like a mobile menu button, but did nothing — and on mobile the nav had
  quietly dropped Room I / Room II / Process, leaving only "How it's made" visible.
  Built a real toggle: an animated hamburger → × button opens an accessible drawer
  (`aria-expanded`, closes on link click, Escape, or resize past the breakpoint)
  containing all four links, styled as a frosted brass-hairline panel matching the
  rest of the chrome. Scoped the drawer CSS to `#siteNav` specifically so the
  guide page's separate, toggle-less nav (a single "Return to the gallery" link)
  was untouched and stayed visible.
- **Flat room-to-room seams.** The three `<hr>` dividers between Room I / Room II /
  Process / the colophon were a bare gradient line — a stylesheet break, not a
  sense of walking into the next room. Replaced with a `.seam` transition: a soft
  overhead radial glow (as if a spot lights the doorway lintel) over the hairline,
  plus a touch more vertical breathing room. Reinforces the "gallery rooms" framing
  the copy already promises.

**Verified.** Re-ran the snap harness (`03-p1v2-*`) at both viewports plus targeted
mid-scroll and mobile-menu-open captures; zero console/page/request errors
throughout. Confirmed the guide page (shares `styles.css`) still renders its nav
correctly after the drawer scoping change.

**Still open for a later pass.** The hero painting is intentionally still
"minting" (≈30–50% developed) during the first few seconds a visitor looks at it —
that's the curatorial conceit, but it's worth another look at whether the initial
alpha/substep curve reads as "in progress" versus "sparse" on first paint. The
Room II wall's programmatic `scrollLeft` didn't register in headless testing
(wheel-driven scroll-jacking may be intercepting it) — worth a functional pass to
confirm keyboard/programmatic scroll parity with the wheel and arrow-button paths.

## Pass 2 — 2026-07-12

**Focus.** Motion & interaction — choreography, easing, continuous ambient motion
for screen capture, micro-interactions, cursor treatment, and a signature "WOW"
beat. The static screenshots already looked composed (Pass 1 covered art
direction), so this pass drove the live page with Playwright — pointer events,
clicks, and scroll — to test what only *moves*, since a still image can't show
motion quality or catch an interaction that's silently broken.

**Added.**
- **Signature interaction: the painting tilts toward the light.** The hero frame
  now carries a subtle cursor-driven 3D parallax (`perspective` + lerped
  `rotateX/rotateY` on `#heroFrame`, ~±11–15°, lerp factor 0.09) so the commission
  reads as a physical canvas hanging under a spotlight, not a flat `<canvas>`. The
  varnish sheen (`.canvas-glaze`'s highlight gradient) now walks toward the cursor
  position too via `--gx/--gy` custom properties, so the glass-glare moves with
  you. The ambient cursor lamp gets a `filter: brightness(1.45)` boost
  specifically while hovering the frame (`.lamp.near-art`) — the brief asked for
  "a soft light that gently brightens what it passes"; previously that was a
  uniform overlay everywhere, now it visibly *notices the art*. Fully gated behind
  `!REDUCED && !COARSE`, so touch devices and reduced-motion users see the frame
  perfectly still (as intended, not as a bug).
- **Room II stopped going static.** The six standing-collection canvases were
  built with `ambient: false`, so once each finished its ~7 s development they
  froze completely — meaning a screen recording that lingers in Room II would go
  dead. Now they carry the same slow ambient drift as the hero (`ambient:
  !REDUCED`), gated by a new `wallVisible` IntersectionObserver on `#room-ii` so
  the six extra canvases only keep stepping while the room is actually on screen
  (perf hygiene, not just correctness). Verified via direct pixel-checksum
  sampling in a live session: canvas content continues to change frame over frame
  after `done === true`.
- **Re-mint became an unveiling, not a cut.** The old transition was a flat
  ~0.6 s fade to black and back — functional but inert for a button whose whole
  job is "a new painting is being commissioned right now." Added a
  `.canvas-flash` overlay (radial brass-white, `mix-blend-mode: screen`) that
  fires in a precise 0.7 s `flash-pop` keyframe exactly as the black lifts and
  the new edition is revealed, synced with the existing plaque-stamp bounce.
  Verified the choreography's exact timing via class-state polling
  (dimming → flash → settle) rather than trusting the code to do what it reads
  like it does.
- **Coin-flip micro-interaction.** `.btn-mint .coin` now does a genuine
  edge-on coin-spin (`scaleX` 1 → 0.12 → 1, four quarter-turns, linear, looping)
  for the duration the button is `disabled` mid-mint — a two-line CSS addition
  that turns a static ring icon into a small joke that pays off exactly when
  "minting" is literally happening.
- **Scroll-linked chrome.** The header's hairline and drop-shadow now scale
  continuously with scroll progress through Room I (`--hdrA`, 0→1, read from
  `scrollY` every rAF tick, applied via `calc()` in the border/shadow alpha) —
  genuinely scroll-*linked* motion rather than a threshold class-toggle, without
  touching the header's background opacity (kept fixed, since Pass 1 fixed a
  legibility bug there and this pass isn't allowed to reopen it). Added
  `:active` press states to the wall-nav buttons and the ghost button, which had
  hover but no tactile down-state.
- **Fixed a real, confirmed bug: the Room II arrow buttons skipped the whole
  collection in one click.** Driving the actual buttons in a live session (not
  reading the code) showed `#wallNext`/`#wallPrev` scrolling by 70% of the
  *wall's* clientWidth — but at a 1440px viewport the wall's entire scrollable
  range (≈857px) is smaller than that single delta (≈1008px), so one click
  jumped straight from the first painting to the last, silently. Replaced the
  delta with a computed "one piece + its gap" stride
  (`getBoundingClientRect().width + column-gap`), confirmed by direct
  `scrollLeft` sampling that two consecutive clicks now land ≈365px apart,
  matching the measured piece stride almost exactly. "Walk the wall" now
  actually walks.

**Verified.** `node tools/snap.mjs` re-run three times (`03-p2v2`, `03-p2v3`, plus
the guide page) — clean at every pass, zero console/page/request errors. Because
this pass's changes are interaction-driven and largely invisible to a static
screenshot, also drove a live Playwright session directly: dispatched synthetic
`pointermove`/`pointerenter` events on the frame and read back the computed
`transform` matrix converging on target; polled `classList` state through a full
re-mint cycle to confirm the flash/dim/stamp timing; ran 500+ synthetic
`painting.frame()` steps past `developDur` and checksummed canvas pixels to prove
ambient drift continues; and clicked the wall's prev/next buttons while sampling
`scrollLeft` to catch (and then verify the fix for) the one-click-skips-everything
bug above.

**Still open for a later pass.** The lamp's `near-art` brightness boost is a
blunt on/off; it could ease in/out proportionally to cursor distance from the
frame's edge for a more physical falloff. The Process section's SVG field
diagram is still purely decorative on scroll — it reorients on a free-running
clock, not tied to scroll position, which would be a natural next choreography
target given the page is themed around "walking through rooms."

## Pass 3 — 2026-07-12

**Focus.** Craft & finish — meta/og/favicon/title, accessibility (contrast,
focus-visible, aria on controls, reduced-motion), performance, copy
sharpening, guide-page quality, and a final zero-error pass at both
viewports. Came in with fresh eyes, re-read every file, measured actual
contrast ratios rather than eyeballing them, and drove the live page with
Playwright to confirm each fix rather than trusting the diff.

**Fixed.**
- **`--faint` failed AA contrast.** Measured every text color against
  `--black` with the real WCAG relative-luminance formula (not a guess):
  `--faint` (`#7E776A`), used for the museum-label field names ("TITLE",
  "MEDIUM", "SEED"), the process figcaption, the colophon citation, and the
  footer line, came out to **4.38:1** — under the 4.5:1 floor for small text,
  on copy that's small and uppercase specifically because it's meant to be
  read as a plaque label. Rebalanced to `#86806F` (same warm-grey hue,
  nudged up in value) for **4.93:1**, comfortably clear while keeping the
  quiet, secondary tone the label hierarchy depends on.
- **Canvases had no accessible role, and the hero's label never updated.**
  The generative `<canvas>` elements (the hero commission and the six wall
  pieces) carried `aria-label` but no `role`, which is unreliable for name
  computation on an element with no implicit ARIA semantics. Added
  `role="img"` to all seven. The hero canvas's label was also static
  boilerplate ("a unique generative flow-field artwork...") that never
  reflected *which* edition was on view — a screen-reader user who re-mints
  would hear the identical sentence every time. `applyLabels()` now sets the
  canvas's `aria-label` to include the live title, palette, and edition
  number on every mint, matching what a sighted visitor reads on the plaque.
- **The wall's prev/next arrows never told you when you'd hit an edge.**
  Room II's "walk the wall" buttons were always enabled, even after
  scrolling past the last painting — a keyboard or screen-reader visitor got
  a silent no-op with no way to know they'd reached the end. Added
  `updateWallNavState()`, driven by a passive `scroll` listener (rAF-
  throttled) plus load/resize hooks, that sets both `disabled` and
  `aria-disabled` on `#wallPrev`/`#wallNext` at each true scroll boundary,
  with a dimmed, inert visual state in CSS. Verified live: at rest
  `prevDisabled` is `true`/`nextDisabled` is `false`; after driving eight
  `next` clicks in-page, `scrollLeft` (942px) exactly equals the wall's
  scroll max (942px) and `nextDisabled` flips to `true`.
- **The mobile menu button's label never changed with its state.** The
  hamburger toggle's `aria-label` stayed "Open the room index" even after
  opening the drawer (`aria-expanded="true"`), which is redundant at best
  and confusing at worst for screen-reader users who don't independently
  track the expanded state. It now reads "Close the room index" while open.
- **Guide page's own history was out of date.** "Iteration passes" described
  only two passes ("Pass one" and "the review pass") — inaccurate now that a
  third exists, and it undersold what pass two actually found (the cursor
  tilt, the ambient-drift fix, the wall-arrow skip bug). Rewrote the section
  to name what each of the three passes actually did, kept it to one
  paragraph, in voice. Guide body is 509 words, inside the 300–600 brief.
- **Craft gaps in `<head>`.** Added `<meta name="theme-color" content="#0E0D0B">`
  to both the gallery and the guide page, and `color-scheme: dark` on `html`,
  so mobile browser chrome and native form/scrollbar rendering match the
  gallery-black palette instead of defaulting to light.

**Verified.** `node tools/snap.mjs` re-run twice (`03-p3`, `03-p3v2`) plus a
dedicated guide-page pass — all three CLEAN, zero console/page/request
errors, across fresh random mints each time (confirming the composition
holds regardless of which of the 4 palettes/seeds lands). Read every
screenshot at both viewports, including a delayed desktop frame, to confirm
nothing regressed visually. Independently re-verified the reduced-motion
path across three repeated navigations with `prefers-reduced-motion: reduce`
emulated: the hero always reaches `done === true` and the status label
always settles on "On view" well within the wait window — the fast-forward
chain is solid. Drove the wall-nav boundary fix and the new `role="img"` /
dynamic-label / theme-color additions directly against the live DOM via
Playwright rather than reading the code and assuming it worked.

**Still open.** The lamp's `near-art` falloff and the Process diagram's
scroll-independence noted in Pass 2 remain open — out of scope for a craft
pass, logged again here so they aren't lost.
