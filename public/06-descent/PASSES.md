# DESCENT — iteration log

## Build — 2026-07-08

**Concept.** A single-page cinematic fall from the sunlit Pacific surface to the floor of the
Challenger Deep (10,935 m). The scrollbar is the winch: water colour, light, pressure readout
and a right-hand depth-meter HUD are all functions of scroll position.

**Implemented in this pass:**

- **Depth engine** (`script.js`): piecewise-linear scroll→depth map anchored to the DOM —
  each encounter section carries `data-depth`, its measured centre becomes an interpolation
  stop, so the HUD reads the true depth when a creature is centred. Exponential-decay lerp
  smooths scroll inside one rAF loop; loop cancels on `document.hidden`.
- **Water**: fixed layer with per-frame RGB interpolation across four palette stops
  (#9BD4E4 → #1B3A5C → #0A1428 → #02030F); vignette deepens with progress; conic-gradient
  light rays sway on offset alternate timelines and fade out inside the first two viewports.
- **Marine snow**: one canvas, ~150 particles with per-particle parallax factor, upward
  drift + sine wobble, a few glowing aqua motes; DPR capped at 2; visibility scales with depth.
- **HUD**: altimeter-style moving tape (ticks every 250 m, labels every 1,000 m, pink tick at
  the floor) behind a fixed needle; readout, zone label (sunlight→hadal) and pressure in atm.
  `.is-deep` class flips chrome from dark ink to pale once past ~600 m for surface contrast.
- **Encounters**: five hand-drawn inline SVGs (Atolla, humpback anglerfish, gulper eel,
  dumbo octopus, bathyscaphe Trieste with plaque), each with idle keyframe choreography via
  `transform-box: fill-box` sub-group transforms and irregular flicker timelines; fact cards
  reveal through IntersectionObserver with staggered child delays.
- **Finale**: near-black, one italic line, "return to surface" button running a hand-rolled
  easeInOutCubic scroll ascent (~2.5 s from the bottom).
- **Craft**: Playfair Display + Source Sans 3, clamp() scales, tabular numerals in the HUD;
  reduced-motion path (all animations collapsed, direct scroll updates, instant ascent);
  guide page in the site aesthetic; favicon/meta/og; footer per spec.

**Why**: the DOM-anchored depth map was chosen over hardcoded stops so the meter stays honest
across viewport sizes and font-load reflows.

## Pass 1 — 2026-07-12 · art direction

Fresh-eyes critique of full scroll-through screenshots (desktop + mobile, 8 scroll positions each)
found five problems; all fixed:

- **Dead water.** Long stretches between encounters were pure empty background — many scroll
  positions looked unfinished. Added five "sounding line" interstitials (700 m sperm whale,
  2,000 m no-sunlight, 3,700 m mean ocean depth, 6,500 m *Alvin* limit, 10,000 m Everest),
  each a letterspaced caps annotation hung on a vertical plumb-line gradient, with
  `data-depth` so the HUD stays honest through them. They give the fall a rhythm:
  big encounter → small whispered fact → big encounter.
- **Hidden ghost numerals.** The colossal depth numerals were centred and mostly buried
  behind creature + card. Re-anchored them to the stage-side viewport edge (cropped, editorial),
  gave them a faint fill on top of the stroke, and strengthened per-zone tints. The trench's
  "10,935" now spans the frame behind the Trieste.
- **Static hero.** Early/late screenshots were identical. Added a `caustics` layer (two
  drifting repeating-radial interference patterns, screen-blended, living inside the ray
  container so it dies with the light), stronger ray sway + per-ray opacity breathing via
  a `--op` custom property, rising glassy bubbles in the snow canvas (surface-only, fade out
  by ~1,100 m), a staggered load-in for kicker/title/sub/cue, and a subtle dark-teal
  vertical gradient through the DESCENT wordmark.
- **Creature presence.** Each stage now sits in a faint radial "pressure pocket" of its own
  bioluminescent hue behind the SVG — aqua, pink for gulper/dumbo, lamplight gold for Trieste.
- **Mobile collisions.** Hero kicker overlapped the HUD hatch; tape labels clipped to ",000";
  sub-copy tucked under the readout. Hid the hatch cap on small screens, widened the rail to
  62px, compacted rail height, and re-padded the hero column.

Verified with fresh snaps + full scroll-throughs at both viewports: zero console errors,
reduced-motion path unaffected (caustics damped, bubbles static, hero-in collapsed by the
global reduced-motion rule).

## Pass 2 — 2026-07-12 · motion & interaction

Fresh-eyes pass focused on choreography, scroll-linked motion and the missing signature beat.
Full scroll-throughs at both viewports found the site handsome but *passive* — nothing answered
the visitor, nothing registered scroll speed, and the Atolla card described a light display
that never happened. Changes:

- **Signature beat: touch — it answers in light.** Every creature now responds to
  press/tap/keyboard (SVGs are focusable, Enter/Space fire) with its real documented
  behaviour: the Atolla spins its burglar-alarm pinwheel (three dashed circles
  counter-rotating and flaring through `cubic-bezier(.17,.84,.28,1)`), the angler's lure
  blooms to 3.4×, the gulper's tail lantern strobes in a panic, the dumbo scrambles its fins
  and blushes, and the Trieste porthole blinks *O·K* in Morse on a `steps(1,end)` timeline
  with a searchlight sweep. A whispered caps hint under the first creature teaches the
  mechanic once, then fades after the first burst. `pointerdown` is `preventDefault`ed so the
  focus ring stays keyboard-only.
- **Scroll-velocity streaks.** The snow canvas now receives smoothed scroll velocity and
  stretches non-glowing motes into motion-blur lines (capped ±130 px, weighted per parallax
  layer). Sinking reads as sinking; the "return to surface" ascent turns into a rush of
  upward rain — the capture-worthy moment the finale lacked.
- **Pointer lamp.** A faint aqua radial halo follows the mouse, fading in only past ~10%
  progress (where the sun dies) and gently deflecting nearby motes — the one light you carry
  down. Mouse-only, canvas-drawn, reduced-motion exempt.
- **Ghost-numeral parallax.** The colossal depth numerals now fall at 0.16× relative speed
  via a per-frame `--par` custom property anchored to each section's centre, giving the water
  real depth layers instead of one flat sheet.
- **Instrument character.** The HUD needle quivers with descent speed like a strained
  pressure gauge (rotation clamped ±7°, plus a velocity-scaled tremble); zone changes
  (sunlight → twilight → …) re-trigger a letterspacing/blur flash instead of silently
  swapping text.
- **Micro-interactions.** Cards lift 5 px on hover while their corner brackets reach from
  16 → 28 px and the border/glow warms (plaque warms gold); creatures brighten their
  drop-shadow on hover with `cursor:pointer`, hover states gated behind `(hover:hover)`.

Verified with snap + full mobile scroll-through + a Playwright interaction script (burst,
Morse, parallax var, mid-ascent streaks): zero console errors, reduced-motion path skips
lamp/streaks/quiver/bursts entirely and hides the touch hint.

## Pass 3 — 2026-07-12 · craft & finish

Fresh-eyes pass with the mandated focus on craft, accessibility and performance rather than
new spectacle. Meta/og/favicon/title, footer links, contrast and the reduced-motion path were
all already in good shape from passes 1–2 — but a full scroll-through at 10 evenly-spaced
positions per viewport (not just the top-of-page snap) surfaced two real, measurable mobile
bugs that only show up mid-scroll, plus two smaller correctness fixes:

- **HUD/card collision on mobile (measured, not eyeballed).** Read `getBoundingClientRect()`
  for the fixed HUD and for every card/marker/finale line at 390px width: the HUD's left edge
  sits at x≈319px, but the Trieste plaque card's right border was rendering at x≈328px —
  literally overlapping the "10,000 / 10,935" tape labels — and the depth-marker and finale
  lines were doing the same (up to 13px into HUD territory). Root cause was a **CSS Grid
  blowout**: `.creature{width:min(78vw,360px)}` gave the SVG a definite viewport-relative
  width that, combined with the default `min-width:auto` on grid items and `overflow:visible`,
  forced the single-column `.encounter` track to a fixed ~304px regardless of the container's
  actual padded width — so increasing padding alone did nothing (verified: padding edits had
  zero effect on the measured card edge until the blowout was fixed). Fixed by adding
  `min-width:0` to `.stage`/`.card` (standard grid-blowout guard), switching the creature's
  mobile width from a viewport unit to a container-relative one
  (`min(78vw,360px)` → `min(100%,320px)`), and increasing the mobile right-padding on `.hero`,
  `.marker`, `.encounter` and `.finale` so every text column now clears the HUD by a verified
  ≥19px at 390px width.
- **Wordmark swallowed card text.** Because `.wordmark` is `position:fixed` with no
  background, a card scrolling past the top-left corner on mobile produced an illegible
  letter-soup of "DESCENT" interleaved with the fact-card's first lines (confirmed in a
  screenshot: "D E S C E N Tacteria. When a mate finds her in the…"). A translucent scrim
  wasn't enough — text behind text at 40% opacity still read as noise — so the mark now gets a
  near-opaque blurred pill (`background-color` + `backdrop-filter: blur(8px)`, alpha .88) once
  `.is-deep` is active, reading as an intentional chrome badge rather than a collision. Scoped
  to `.is-deep` only, so the pristine sunlit hero is untouched.
- **Interactive-SVG semantics.** The five creatures had `role="img"` while also carrying
  `tabindex="0"` and a `keydown` handler for Enter/Space — a real ARIA mismatch (assistive tech
  is told "static picture," JS says "activatable control"). Changed to `role="button"`,
  keeping the existing action-worded `aria-label`s ("Touch to trigger…") as the accessible
  name.
- **Resize hygiene.** `sizeCanvas()` was rebuilding all ~150 marine-snow particles and every
  bubble from scratch on *any* `resize` event — including the ones mobile Safari fires when
  its address bar collapses/expands mid-scroll, which changes `innerHeight` but not width, and
  would visibly teleport the whole snow field. It now only re-seeds the particle field when the
  width actually changes, and the `resize` listener is coalesced through one
  `requestAnimationFrame` so a burst of events (drag-resize, toolbar animation) triggers a
  single relayout instead of thrashing `getBoundingClientRect()` on every tick.

Verified: fresh `snap.mjs` run clean at both viewports; a custom 10-step scroll-through script
(desktop + mobile, zero console errors) re-shot after each fix to confirm the HUD/card/wordmark
collisions were gone with no regressions elsewhere; the pass-2 interaction script (jelly burst,
Trieste Morse, ascent streaks) re-run to confirm `role="button"` didn't break pointer/keyboard
activation; reduced-motion emulation checked at hero, an encounter and the finale — still
legible, composed, and static. Guide page word count (540) confirmed within the 300–600 range.
