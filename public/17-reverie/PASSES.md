# REVERIE — passes

## Build — 2026-07-12

**Concept.** REVERIE is a dreamcore hotel that exists only while you sleep —
soft surrealism in the key of Magritte, pastel fog by day, twilight deep by
night, nothing ever fully still. The whole site is CSS and inline SVG: no
photographs, no canvas, no external libraries beyond two Google Fonts
(Italiana for display, Mulish for body).

**Implemented.**
- **Hero doorframe** — genuine CSS 3D: a `perspective` container holding a
  `transform-style: preserve-3d` frame, with `::before`/`::after`
  pseudo-elements rotated on `rotateX`/`rotateY` to fake a casing with real
  thickness. The frame sways `rotateY(±7deg)` on a sine-shaped
  `cubic-bezier(.445,.05,.55,.95)` loop. The opening holds a dark starfield
  (layered `radial-gradient` dots) so the sky reads as night through the door
  and pastel dusk around it. A separate blurred ellipse casts the door's
  shadow up and sideways instead of down — the "impossible" cue — animated
  independently of the door's own sway.
- **Giant moon** — fixed to the viewport, radial-gradient sphere with soft
  craters. A scroll listener accumulates a velocity "kick" that decays each
  animation frame via `requestAnimationFrame`, so the moon visibly lags
  behind fast scrolling and eases back to its parallax baseline.
- **Escher-nod staircase** — generated at runtime in `reverie.js`: a 24-step
  square ring is projected through a hand-rolled isometric basis (two 30°
  axes + height), producing top/riser/front polygons appended straight into
  an inline `<svg>`. Step fill interpolates cream → fog → sky → blush →
  twilight across the loop; a corner pillar hides the seam where the last
  step's floor doesn't reconcile with the first step's ceiling. A glowing
  orb rides a closed CSS `offset-path` loop — because the path is truly
  closed, the animation has no jump-cut, so it reads as endlessly
  descending.
- **Lost & Found** — hand-drawn line-art SVGs (key, chair, umbrella), each
  bobbing on its own sine timing while a separate blurred shadow drifts on
  a different timing — object and shadow slowly fall out of sync.
- **Drifting clouds** — layered, multi-lobe `radial-gradient` blobs (cool
  lavender undersides for depth) drifting at varied speeds; two are scoped
  to the hero specifically so they pass in front of the doorframe without
  ever crossing readable body copy elsewhere.
- **Rooms** — three cards (000 / π / Yesterday), each with a one-line
  surreal amenity list, tinted lavender/sky/blush.
- **Check-in dial** — a hand-rolled `role="slider"`: pointer drags compute
  an angle via `atan2` against the dial's center, arrow/Home/End/PageUp/
  PageDown keys work natively, and an SVG `stroke-dashoffset` arc plus a
  rotated tick stay in sync with one source of truth. Submitting shows a
  local confirmation string — no network call, nothing stored.
- **Craft** — scroll-reveal via `IntersectionObserver`, a soft cursor halo
  on fine pointers only, a scroll-progress hairline, full
  `prefers-reduced-motion` fallback (static tilt, frozen orb, no cursor
  halo, no parallax loop), DPR-agnostic (no canvas), RAF loops gated on
  `document.hidden`.

**Iteration pass (same day).** Visual QA against `tools/snap.mjs` surfaced
three issues, all fixed: (1) the door's shadow was trapped inside the
`preserve-3d` stacking context and rendered as a near-invisible thin sliver
— moved it to a plain sibling layer and reshaped it into a soft blob; (2)
front-layer clouds were `position: fixed` across the whole page and drifted
over the dark night section, reading as a lighting glitch — rescoped them to
the hero only; (3) background clouds were nearly invisible (white blur on an
already-light pastel sky) — rebuilt as multi-lobe shapes with a cool
lavender undertone for contrast, and toned down the competing ambient sky
glow. Also swapped the dial's numeric readout from Italiana to Mulish
after "00m" rendered ambiguously close to "oom" in the display serif.
