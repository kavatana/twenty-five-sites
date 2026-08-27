# THE GATSBY GRAND — passes

## Build — 2026-07-18

**Concept.** A fictional 1928 grand hotel — deep emerald, two golds, champagne
text, Marcellus deco caps over Lora serif body. The signature technique is
line art that draws itself: every ornamental stroke (hero corner brackets,
suite frames, chevron dividers, chandelier arms) is a real SVG `<path>`
animated via `stroke-dasharray`/`stroke-dashoffset`, triggered either by
scroll entry (`IntersectionObserver`) or, for the suite room illustrations,
by hover/focus so the reveal is a genuine interaction rather than a one-shot
animation.

**Implemented.**
- **Self-drawing structural line work.** JS measures every `.draw-path` with
  `getTotalLength()`, sets dash length equal to path length, and an
  `IntersectionObserver` (per section) flips `stroke-dashoffset` to `0` with
  a small per-path stagger. Covers the hero's four mirrored corner brackets
  (one hand-authored stepped path, reused via SVG `transform="scale(-1,1)"`
  etc.), the suite card frames, and the chandelier's rod/arms.
- **Sunburst fans, generated not hand-plotted.** `buildRayFan()` takes a
  center, ray count, min/max length and spread angle and emits symmetric
  radial `<path>` elements at runtime — used for the hero's sunburst above
  the title and again, smaller, inside The Aurora's room illustration.
- **Stepped chevrons, generated.** `buildChevron()` walks a baseline and
  steps up/down at right angles (not diagonals) to build an authentic
  deco ziggurat divider, used above Suites/Ballroom/Promenade headings,
  each with a fill-in diamond glyph at center.
- **Hover-drawn suite illustrations.** The Fitzgerald (champagne coupe),
  The Meridian (sextant/compass), The Aurora (sunrise fan) reveal as gold
  line art on hover or `:focus-within`, driven purely by CSS custom
  properties (`--len`, `--i`) so the interaction needs no JS at trigger time
  and works identically for mouse and keyboard.
- **Gold foil hero type.** `background-clip: text` gradient (dim gold → gold
  → near-white hot spot → gold → dim gold), background twice text width,
  animated `background-position` over 8s for a slow specular sweep.
- **Champagne bubble canvas.** Sparse (14–26, viewport-dependent) rising
  circles with sine drift, DPR capped at 2, full `requestAnimationFrame`
  cancel/resume on `visibilitychange`, static single frame under
  `prefers-reduced-motion: reduce`.
- **The Ballroom chandelier.** Hand-built from a canopy, rod, seven
  symmetric arms (three mirrored pairs + center), seven crystal drops, and
  seven cross-shaped sparkle glints — sways on a 7.5s CSS keyframe
  (`transform-origin` at the ceiling mount) and glints pulse on staggered
  delays. Both disabled under reduced motion.
- **Elevator dial.** Fixed brass-styled circular gauge; a gold needle
  rotates 0/90/180/270° to track L / 2 / 3 / P via an `IntersectionObserver`
  with a −45% top/bottom `rootMargin` so it fires on mid-viewport crossing
  regardless of section height. Buttons are real, labelled, clickable
  (`scrollIntoView`), and reflect state via `aria-current`.
- **Dinner menu.** Centered courses, gold rule top/bottom, dotted leader
  rules plus a diamond (◆) glyph before each price — real period-flavored
  menu copy with prices in period cents/dollars.
- **Craft.** Custom ring cursor (fine pointers only, lerp-smoothed, pauses
  with the tab), full favicon/meta/OG, `:focus-visible` outlines throughout,
  skip link, grain texture overlay, `prefers-reduced-motion` paths for every
  animated system (foil sheen, bubbles, chandelier sway/sparkle, scroll
  reveal duration, hover-draw duration).

**Verification.** Ran `tools/snap.mjs` against `/20-gatsby/` at 1440×900 and
390×844, read both the fresh-load and +3.5s-later desktop screenshots plus
the mobile screenshot, and fixed anything unbalanced or clipped before
signing off. Console clean at both viewports.
