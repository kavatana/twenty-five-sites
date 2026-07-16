# CORPUS — passes

## Build — 2026-07-08

**Concept.** A single 45,000-particle body that remembers four shapes: a (2,3)
torus knot, a spiral galaxy, a 36³ lattice, and the word CORPUS sampled from
an offscreen canvas. It cycles on a timed loop, obeys the nav, and scatters
under a pressed pointer — then remembers.

**Implemented.**
- `THREE.Points` + custom `ShaderMaterial`, one draw call. All four formations
  stored as vertex attributes (`aT0…aT3`); morphs are pure GPU: uniform-branched
  target pick, quintic-eased per-particle stagger via `aDelay`, sine-arc detour
  mid-flight so travel curls.
- Golden-ratio structural coordinate `u = fract(i·φ)` shared by delay AND every
  generator — ripples travel along the knot, out of the galaxy, left-to-right
  through the word; also makes `setDrawRange` truncation uniform (adaptive
  quality floor 30k desktop / 14k mobile).
- Word target: waits on `document.fonts.load` for Syne, rasterises to canvas,
  harvests `getImageData` alpha; two stacked lines (COR / PUS) on narrow
  screens.
- Gravity well: closest point on pointer ray to origin → `uWellPos`; inverse-
  square shove in vertex shader; power eases 4 (idle) → 34 (pressed).
- Soft sprites: `gl_PointCoord` discard + squared smoothstep, additive
  blending, no depth test; hand-rolled exp² fog; 700-star background shell.
- DPR capped at 2, RAF paused on `visibilitychange`, FPS + particle count in
  the stats line, reduced-motion path (static orbit, no auto-cycle, no drift).
- UI: crossfading Syne headlines + decks per formation, accent-colored nav
  dots, custom ring cursor (fine pointers only), grain + vignette overlays,
  entrance stagger, keyboard 1–4 / arrows.
