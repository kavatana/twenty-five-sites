# ALMANAC — passes

## Build — 2026-07-12

**Concept.** ALMANAC is an astronomical data-observatory built as a
nineteenth-century atlas: engraved double-rule plates, corner rosettes,
figure numbers, footnote asterisks — wrapped around genuinely live,
data-driven SVG/canvas charts on midnight (#0B1026), star-paper (#E8E4D8),
celestial gold (#D9A441), nebula teal (#3E8989), and mars (#C2543A).
Newsreader carries every display and annotation line; IBM Plex Mono carries
every measured one.

**Implemented.**
- **Hero orrery.** Six `<g>` carriers rotated every frame via a single
  `requestAnimationFrame` loop; each planet's angular speed is its true
  ratio to Earth's orbital period (Mercury 0.2408 yr … Saturn 29.457 yr),
  scaled by one shared multiplier so Mercury completes a full lap every
  four seconds — visibly fast — while Saturn creeps, exactly as the real
  sky behaves, just compressed roughly 1.94 million times (the multiplier
  is printed under the diagram, not hidden). A small-caps legend lists
  each planet's true period.
- **Fig. I — Brightness of Stars.** Twenty real bright stars (name,
  apparent magnitude, distance in light-years) plotted on a horizon-arc
  SVG; magnitude drives both dot radius and height above the horizon line,
  with a deterministic name-hash providing reproducible scatter jitter.
  Each star twinkles on its own CSS `animation-delay`. A hand-built
  tooltip (no library) follows `pointermove`/`focus` and reads out name +
  distance + magnitude.
- **Fig. II — Moons of the Giants.** Real satellite counts (Jupiter 95,
  Saturn 146, Uranus 28, Neptune 16 — 285 total) rendered as dot-strips.
  An `IntersectionObserver` triggers, on first appearance, a staggered
  dot reveal (`--i` custom property driving `animation-delay`) synced to
  a `requestAnimationFrame` numeral counter eased with cubic ease-out.
- **Fig. III — Eclipses 2026–2040.** Fourteen real long-range solar
  eclipse dates mapped onto a year axis by plain date arithmetic, laid
  out in a horizontally-scrolling track (its own `overflow-x`, so the
  page body never scrolls sideways). A "now" hairline computed from the
  visitor's live `Date` shows real days-to-next-eclipse.
- **Fig. IV — Light Travel Time.** Five concentric rings (Moon 1.3 s, Sun
  8 m 20 s, Mars ~12 m 40 s avg., Jupiter ~43 m avg., Neptune 4 h 10 m)
  with a photon dot travelling outward on a 7-second loop; each ring
  lights up as the pulse's progress crosses its assigned threshold,
  choreographed rather than literally to scale (a schematic, and labelled
  as one).
- **Atlas details.** One inline `<symbol id="rosette">` reused via `<use>`
  at all four corners of every plate; double rules via a bordered `.plate`
  plus an inset `::before`; figure numbers and footnote asterisks set in
  mono small-caps. An ambient canvas starfield (seeded PRNG, per-star sine
  twinkle) runs behind the whole page at low cost.
- **Craft.** DPR capped at 2; every rAF loop checks `document.hidden`;
  full `prefers-reduced-motion` fallback (static orrery pose, resting
  stars/dots, no sweep shimmer) that stays fully composed; focus-visible
  outlines in gold; real og/meta tags and inline SVG favicon; guide page
  at `guide/index.html` styled in the site's own aesthetic.

## Pass 2 — 2026-07-12

**Visual verification.** Ran the snap harness at 1440×900, +3s-later, and
390×844 (hero only in frame at scroll-top), then did a second pass with a
manual Playwright script that scrolled incrementally through the full
page — reveal-on-scroll content lives below the fold, so the mandated
top-of-page screenshots alone don't exercise it.

- Confirmed zero console/page errors and no failed requests on the main
  page and the guide page throughout.
- Checked the orrery: Mercury visibly advances between the two desktop
  captures while Saturn is imperceptibly moved, confirming true relative
  speed is legible within a short recording window.
- **Found and fixed a real layout bug** in Fig. III: eclipse entries were
  positioned by literal date on a track only ~1160px wide with a simple
  above/below alternation. Several dates fall within months of each
  other (e.g. two eclipses per year), so their 120px label cards
  overlapped into unreadable stacked text. Rewrote the placement as a
  greedy collision-avoidance layout — entries sorted chronologically,
  alternated above/below, then pushed into additional parallel rows
  (longer stems) whenever same-side neighbours would land closer than
  118px apart — on a fixed 2100px track, with padding sized to the
  tallest row actually used. The "now" hairline and its tag/caption were
  detached from the old nested-stem markup so their height matches the
  new dynamic padding exactly.
- Verified the Fig. II counters land on the exact source values (Jupiter
  95, Saturn 146, Uranus 28, Neptune 16) once their reveal animation
  completes, not just mid-animation roundoff.
- Checked contrast: accent colours (teal, mars) are reserved for large
  display text, rules, and marks — never small body copy on midnight,
  keeping body text at gold/star-paper on midnight or ink on star-paper
  throughout, comfortably above 4.5:1.
- Confirmed the eclipse band scrolls horizontally inside its own
  container at 390px without moving the page itself, and that dot-strips
  wrap into legible blocks rather than overflowing on mobile.
- Re-ran the full snap suite after the fix: still zero console errors,
  both viewports composed, eclipse band now legible at every cluster of
  close dates.

## Pass 1 — 2026-07-12

Fresh-eyes art-direction pass. Ran `snap.mjs` plus custom scroll-through and
per-figure screenshot harnesses (top-of-page snaps alone don't reach the
plates) and cross-examined every section against the rubric. Found and fixed:

- **Eclipse band read as broken, not scrollable.** `.eclipse-scroll`'s fixed
  2100px track is wider than the plate, so the last entries (`30 …`, `TOTA…`,
  `Alas…`) were hard-clipped at the card's right edge with zero affordance —
  looked like a layout bug, not an intentional pannable band. Fixed with a
  non-scrolling `.eclipse-figwrap` wrapper holding two edge-fade overlays
  (linear-gradient to paper, opacity driven by real `scrollLeft`/`scrollWidth`
  via a `scroll` listener) plus a small mono "→ drag to see the full band"
  caption that dims once you reach the end. Also added a one-time
  scroll-to-now on load so the visible slice defaults to whatever's
  chronologically relevant instead of always parking at 2026.
- **Corner "rosettes" were barely there.** The reusable `#rosette` `<symbol>`
  was just an L-bracket, a 2px dot, and one diagonal tick — the brief calls
  for corner rosettes and this didn't read as one at any zoom. Replaced it
  with an actual compass-rosette motif (register bracket + ringed circle +
  cardinal/diagonal radiating ticks + center point) and resized `.corner`
  from 22px to 29px so the detail survives at plate scale. Immediately reads
  as an engraved instrument mark instead of a registration crop-mark.
- **Flat, airless background.** Midnight was one flat hex across the entire
  page — no depth behind the starfield canvas. Added four low-opacity,
  fixed radial gradients (teal/gold/mars) to `body`'s background stack for
  a subtle nebula glow, and gave every `.plate` a second background-image
  layer of inline SVG `feTurbulence` noise under the paper color for a
  faint paper-grain tactility — both hand-coded, no images, negligible
  weight, and inherited for free by the guide page since it shares
  `almanac.css`.
- **Mobile masthead and orrery legend both wrapped mid-word.** At 390px,
  "VOL. I — SKY & INSTRUMENT" broke across "SKY &" / "INSTRUMENT" next to a
  clock that also split onto its own "local" line, and the orrery legend's
  2-column grid forced entries like "11.86 yr /" / "orbit" onto two lines
  inconsistently with their neighbours. Fixed the masthead with a
  `display:contents` reflow (brand + clock share a row, the volume label
  drops to its own full-width row below) and switched the legend to a
  single, right-aligned column under 560px so every line reads whole.
  Caught and fixed a regression from the first fix along the way: the
  guide page's `← Back to the atlas` link (which also lives in
  `.mast-right`) had no explicit flex `order`, so it jumped in front of
  the brandmark on mobile — gave it the same order as the clock.
- Re-ran `snap.mjs` on both the main page and the guide page after each
  change: zero console/page errors throughout, both viewports composed,
  regression caught by re-screenshotting the guide's mobile masthead
  specifically rather than assuming a shared-CSS fix was risk-free.

**Still worth a look:** Fig. IV's rings diagram has a legend column that's
much shorter than the diagram itself — currently vertically centered
against the ring stack, which reads as intentional negative space in this
pass's screenshots, but it's the plate with the most unclaimed area and a
future pass should sanity-check it still feels considered rather than
sparse once real content review happens on a wider range of displays.
