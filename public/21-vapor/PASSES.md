# VAPOR — passes

## Build — 2026-07-12

**Concept.** Site 21 of 25: VAPOR, a glassmorphic planetary weather console
for a fictional relay on the exoplanet Kepler-1649c. Twilight indigo base
(#1A1B3A → #2E2E5C), four weather regimes each with their own accent —
rain (steel blue #6FA8DC), snow (ice #CFE6F5), aurora (teal #48E5C2 /
violet #9D6FF0), heat (ember #F0885C). Sora for display/readouts, Albert
Sans for body copy. The whole site is one screen: a segmented dial switches
regimes, and everything else — a full-bleed canvas simulation, four glass
instrument panels, and every number on them — morphs together over 1.2s.

**Implemented in this pass.**

- Full-bleed `<canvas>` weather engine, no DOM particles: seeded
  `mulberry32` PRNG-built particle fields for rain streaks + ground
  splashes + a two-pulse lightning-flash envelope that lights the whole
  scene; three-layer parallax snowfall with a bumpy, slowly-advancing
  accumulation line; three sine-summed aurora ribbon bands blended with
  `lighter` compositing over a twinkling starfield; heat mode's rising
  shimmer via a tiny offscreen buffer canvas blitted back one horizontal
  slice at a time with a per-row sine offset (amplitude growing toward the
  ground, phase scrolling with time) — plus drifting ember motes and slow
  sky haze bands.
- Hand-rolled cubic-bezier easing (Newton–Raphson solve) shared by every
  JS-driven value — canvas mode-crossfades, the temperature count-up, the
  trend sparkline — so canvas motion and CSS-transitioned DOM share one
  easing feel.
- Glass instrument shell: topbar (brand, segmented RAIN/SNOW/AURORA/HEAT
  dial with a sliding accent thumb, live mission clock, link-status dot),
  current-conditions panel (animated condition glyph, gradient temp
  numeral that counts to its new value, a 7-sol trend sparkline built from
  the forecast data, wind/pressure/third-stat row whose label itself
  relabels per regime — humidity, ionization, particulate), 7-sol forecast
  strip with mini animated glyphs, an animated composition donut (four
  arcs via `stroke-dasharray`/`stroke-dashoffset` set through
  `element.style` so they're natively transitionable) with a legend whose
  fourth entry is always the regime's "live" trace gas, and a wind-field
  mini-map: a 7×4 arrow grid plus 8 flowing tracer particles driven by a
  hand-rolled three-sine noise field (`noise2`) standing in for gradient
  noise.
- The morph technique: mode switch reassigns two root custom properties
  (`--accent`/`--accent2` + RGB-triplet siblings) once, synchronously;
  every consuming rule declares its own `transition` on the real property
  it uses (`background`, `stroke`, `box-shadow`, …), so the browser
  animates the computed value smoothly with zero per-frame JS color
  writes. Text fields (condition tag, note, stats, forecast cards, legend)
  crossfade via a staggered opacity/translate class-swap timed inside the
  same 1.2s window so the panel reads as a cascade, not a jump cut.
- Real mission-console copy for all four regimes: distinct temps, wind,
  pressure, third-stat, forecast arcs, atmospheric composition, and wind
  tags — no lorem ipsum, no filler adjectives.
- Craft: devicePixelRatio capped at 2 on both canvases; single rAF loop
  paused on `document.hidden`; full `prefers-reduced-motion` path (loop
  never starts, one static frame drawn per regime, mode switches still
  update every value, CSS transitions shortened); focus-visible states;
  dial keyboard support (arrow keys); skip link; inline SVG favicon; og/
  meta on both pages; guide page in the site's own glass aesthetic; no
  external libraries beyond Google Fonts.

**Verification.** `node tools/snap.mjs /21-vapor/ shots/21-build 3500` —
CLEAN (no console/page/request errors) on first run. Live interactive
testing via Playwright caught one real bug: the heat-shimmer offscreen
buffer was never `clearRect`'d between frames, so its translucent fills
accumulated frame over frame until heat mode slowly bled into a solid
orange screen after several seconds — invisible in a single early
screenshot, obvious on a five-second soak test. Fixed with one
`clearRect` call. A dedicated Playwright context with
`reducedMotion: 'reduce'` confirmed the static-fallback path: two
screenshots taken 2.5s apart under heat mode are pixel-identical, and mode
switches still update every readout instantly. Re-verified CLEAN at
1440×900 and 390×844 after the fix.
