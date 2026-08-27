# MACHINA — passes

## Build — 2026-07-12

**Concept.** MACHINA is an instrument-grade, infinite-zoom voyage into the
Mandelbrot set, "powers of ten" style. A hand-written canvas renderer
auto-plays a slow, continuous dive (~2 orders of magnitude per 20s) through
five pre-planned, independently-verified waypoints — the whole set, the
coastline boundary, Seahorse Valley, a spiral arm, and a minibrot buried
~10¹¹ deep — each triggering a narrative overlay with real coordinates.
A HUD frame (corner brackets, ticking coordinate/zoom/iteration/render-ms
readouts, a left-edge depth rail with lighting waypoint ticks) frames the
field. Zoom is capped at t=13 to stay inside float64's precision budget,
after which the same path function runs in reverse for a fast "return to
sea level" pull-back before looping.

**Implemented.**
- **Math**: escape-time iteration with renormalized/continuous smooth
  coloring (`n + 1 − log(log|z|)/log2`), bailout radius 256 (r²=65536),
  and periodicity/cycle detection (24-step checkpoint compare) so bounded
  interior orbits bail out early instead of always burning the full
  iteration budget.
- **Renderer**: plain `<canvas>` 2D context, `Float32Array` escape-value
  buffer decoupled from a `Uint8ClampedArray`/`ImageData` colour buffer,
  three precomputed 1,024-entry gradient LUTs (Magma, Instrument, Spectral)
  so palette cycling is a pure recolor pass with zero math recompute.
- **Progressive refinement**: pixels visited in a 3×2 interleaved tile
  order; each frame renders exactly one tile at full res/full iteration
  depth, time-boxed to ~8ms per frame as a safety valve. A full six-tile
  cycle refreshes the whole field — since the camera never stops creeping,
  the image is perpetually a beat behind and catching up: coarse, then
  sharp, continuously. The fast pull-back swaps to a cheap full-frame
  stride-4 block-filled pass instead (detail doesn't matter mid-whoosh).
- **Path**: a single log-zoom clock `t` (zoom = 10^t) drives a piecewise
  smootherstep interpolation of the camera centre between whichever two
  waypoints bracket the current `t` — pan and zoom as one gesture, not a
  cut. Waypoint coordinates were sampled headlessly beforehand (mean/std/
  interior-fraction across a test grid) to confirm genuine visual variance
  before being wired into the UI.
- **Guard + loop**: at t=13 (float64's ~15–17 significant digits stop
  resolving neighbouring pixels at this depth) the dive halts, offset
  resets, and `centerAtT()` is driven backward with an eased cubic,
  retracing the exact path home before a 1.7s hold and a fresh loop.
- **Controls**: pause/resume (freezes the clock and narrative timers but
  leaves ambient HUD motion — brackets, grain, reticle — running); click-
  to-recenter as a temporary offset vector that eases in, holds, and eases
  back out so the scripted path always resumes on schedule; a 3-way
  palette cycle button.
- **Accessibility/perf**: `prefers-reduced-motion` disables autoplay and
  lands on a single fully-sharpened static composition instead; mobile
  scales the internal pixel budget down; devicePixelRatio capped at 2 in
  the budget calculation; heavy work pauses on `document.hidden`; every
  control has a focus-visible state.
