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

## Pass 1 — 2026-07-12

Art-direction pass. Ran the full snap harness at 1440×900 / 390×844 plus a
manual scroll-through (the standard harness only captures the first fold, so
I additionally scripted a step-through of the whole page to see every
section post-reveal) and found the hero's signature door moment was
undermining itself, plus a few rhythm and clutter problems:

- **Door shadow decluttered.** The "impossible shadow" previously sat as a
  soft blob directly beside the door's internal moon-glow *and* the real
  moon in the sky — three overlapping glows in one quadrant read as noise,
  not as a shadow. Rebuilt it to share the door's own silhouette (same
  `border-radius` formula), laid near-flat via `rotate(-72deg) scale(.82,.5)`
  and cast up-and-left into empty sky — away from the moon, clearly
  door-shaped, clearly wrong (a shadow with nothing to land on).
- **Fixed a stray hairline artifact.** The door's 3D side panel
  (`::after`, `rotateY(90deg)`) is a plain rectangle, but the door's own
  silhouette rounds heavily at the bottom — the rectangle's straight edge
  was poking out past the curve as a thin vertical line at every rotation
  phase, reading as a rendering bug. Stopped the panel short of the curved
  region (`bottom: 22%`) and rounded its own base so it tapers with the
  frame instead of overhanging it.
- **Clouds rebuilt for volume, not smudge.** The previous gradient mixed a
  muted gray-purple base with hard-edged white circles inside a
  hard-cornered `blur(13px)` box; at rest it read as dirty smudges rather
  than cloud. Rebuilt as four soft white lobes plus a faint lavender
  undertone only at the base, `border-radius: 50%` on the container,
  heavier `blur(20px)`, lower opacity — now reads as soft drifting fog.
- **Hero headline rhythm fixed.** The forced `<br>` plus a narrow 46rem
  measure was producing an orphan line ("address," alone) at the largest
  clamp size. Removed the manual break, widened the measure to 54rem, and
  trimmed the top of the `--fs-hero` clamp so the line lengths balance
  (desktop: two clean lines above the fold; mobile: a punchy one-word close
  instead of a stranded fragment).
- **Staircase section de-sparsed.** The Escher-nod staircase read as a
  small, isolated graphic adrift in a large flat void. Added a slow-pulsing
  radial glow behind it (`glowPulse`, 8s sine) to ground the piece in its
  section and give the dark panel some ambient depth instead of empty
  twilight.
- **Small polish.** Moon craters switched from flat opacity circles to soft
  radial-gradient shading (less "sticker," more lunar). Room Yesterday's
  number swapped from a lone "Y" (weak next to 000/π) to "Day -1" — keeps
  the numeric-riddle motif the other two rooms establish and reads
  unambiguously (an earlier "−1" attempt rendered too close to "— l" in
  Italiana and was reverted).

Verified clean via `node tools/snap.mjs /17-reverie/ shots/17-p1-final 3500`
(no console/page errors) plus a scripted full-page scroll-through to confirm
every `.reveal` section still animates in correctly. Still worth a look in a
later pass: the object-card shadows (key/chair/umbrella) could detach a
touch further to sell the "wrongness" more; the check-in column still has
noticeable empty space beneath the button on wide desktop viewports.
