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

## Pass 1 — 2026-07-12

**Focus: art direction.** Screenshots showed the signature visual failing: the
knot's core summed to pure white under additive blending — an amorphous cotton
ball, no palette, no topology.

- **Exposure & sprite rebalance.** New `uExposure` uniform (0.56 desktop /
  0.72 mobile) tames the additive sum so hue survives into the core; point-size
  clamp 90→64, size distribution tightened (pow 3.0), tube radius 1.15→0.85.
  The (2,3) knot is now legible as a knot.
- **Designed color flow.** Colors were random per particle (confetti). Now a
  smoothstepped ice→violet→pink gradient rides the shared structural
  coordinate `u`, with ~30% random sparkle — hue travels along the thread,
  out of the galaxy, across the word, and morph ripples read as color bands.
- **Typography.** Headline measure widened (620→700px / 50vw), size clamp
  retuned (max 3.4rem), tracking −.02em — the ragged 4-line stack ("tied"
  orphaned) is now two balanced lines per formation.
- **Cycle bar.** New 2px track under the kicker fills over the 9s dwell and
  drains during the morph — makes the auto-loop legible and fills the left
  rail with quiet ambient motion. Hidden under prefers-reduced-motion (no
  auto-cycle there).
- **Nav contrast.** Inactive labels .45→.68 opacity, index numerals faint→dim,
  dots 9→10px.
- **Honest stats.** FPS sampler skips cold-start frames (was flashing "16 fps"
  during spawn).

## Pass 2 — 2026-07-12

**Focus: motion & interaction.** (Consolidates work from an interrupted earlier
session — shock system, wheel nav, morph flare, cursor states, lens-shift
framing — plus this session's additions below.)

- **Signature beat, completed.** Hold-to-scatter → release fires a recall
  shockwave (luminous ring racing through the body). This pass made the camera
  feel it too: a decaying recoil impulse — small dolly-in, rig shake, +30%
  exposure bloom — so the release lands physically, not just in the particles.
  Morph-arrival pulses get a half-strength kick.
- **Wall-clock choreography.** Spawn, morph progress, auto-cycle and shock
  clocks now advance on real elapsed time (`cdt`, clamp 0.34s) instead of the
  0.05s-clamped noise clock — on a slow GPU the intro used to take ~50s
  (the snap harness caught it mid-condensation at 8s); now the entrance always
  completes on schedule. Drift/twinkle keep the tight clamp so they never jump.
- **The galaxy turns.** Formation targets were static; a galaxy that doesn't
  rotate is a dead prop. New `swirl()` in the vertex shader: solid-body spin
  + an oscillating differential shear (stronger toward the core) so the arms
  wind and unwind on a ~57s breath — continuous ambient motion that can't
  smear itself away. Gated off under reduced motion.
- **Touch swipe nav.** Phones could only tap the small dots; a quick flick
  (<600ms, >70px, touch pointers only) now walks the formations in either
  axis, and the hint says so on coarse pointers. Swipes are excluded from the
  held-scatter shock so the two gestures never double-fire.
- **UI wears the formation.** Kicker + cycle bar re-tint to the active
  formation's accent (ice/violet/pink/white) on a .9s ease — the left rail
  answers the scene.
- **Pointer parallax.** Copy block, form nav and meta drift a few px against
  the sprung cursor via the CSS `translate` property (never fights the
  entrance-transform animations). Fine pointers only; off under reduced
  motion.
- Verified: knot/galaxy/sigil screenshots at both viewports, fresh-load late
  shot now fully formed, zero console errors (only the benign
  `GPU stall due to ReadPixels` driver-perf warning from the screenshot
  readback itself, as documented on earlier sites).

## Pass 3 — 2026-07-18

**Focus: craft & finish.** A fresh look, one formation at a time (not just
the fresh-load frame previous passes graded on) — navigated to all four via
keyboard and screenshotted each in its settled state. That surfaced two real
problems the fresh-load shot never shows.

- **Galaxy was crowding the copy.** The spiral's outer arm sat directly under
  the headline — a crop confirmed the "n" of "billion" sitting inside a
  cluster of magenta particles, not beside it. Rather than shrink the galaxy
  (it should read as the widest, most sprawling body) the camera rig now
  eases to a per-formation clearance — `CLEARANCE = [1, 1.22, 1, 1.05]`,
  blended by the same quintic morph progress that drives the shader — so the
  rig quietly pulls back for the wide shot and returns for the others. Every
  formation now keeps a clean gap from the text column, mid-morph included
  (checked at t+0.5s and t+1.7s into a knot→galaxy transition).
- **The sigil undersold its own punchline.** "The body spells its own name"
  is the concept's payoff line, but CORPUS rendered as a thin flat ribbon —
  roughly a 7:1 width-to-height sliver next to the round, voluminous knot and
  galaxy. World width 30→32.5 (desktop), 13.5→14.5 (mobile) for straightforward
  scale, plus a shader-side `wordAmt` term (blends on `uFrom`/`uTo` == 3,
  cross-fading with the same per-particle `e` used for the morph) that swells
  point size +34% and lifts brightness +22% only while the word is on screen.
  The letters now read as bold and lit, not sampled dust. Desktop xBias
  pushed −0.9 → −1.55 to keep the wider word clear of the nav dots.
- **Accessibility audit.** Confirmed (didn't need to add): inactive
  headline/deck slides carry `visibility: hidden` so a screen reader hears
  one formation, not four stacked; `:focus-visible` gives every button a
  1.5px ice outline (verified live — tabbed to the third formation button
  and read its computed `outlineColor` back, not just the CSS rule); the
  formation nav has `aria-label="Formations"` and each button's visible text
  ("01 Knot") is its accessible name; cosmetic layers (`bg`, `canvas`,
  `vignette`, cycle bar) are `aria-hidden`. Contrast-checked the dimmest
  running text (`--faint` `#727BB5` on `--void` `#060614`) at ≈5:1, clear of
  the 4.5:1 floor.
- **Reduced motion, re-verified.** Emulated `prefers-reduced-motion: reduce`
  and diffed two screenshots 4s apart — pixel-identical: static orbit, no
  auto-cycle, no drift, the knot still fully composed and legible. Console
  clean.
- **Guide page brought up to what actually shipped.** The "Three passes"
  closing section previously described this pass's intentions before they
  were true; rewrote it to match the real diff (galaxy clearance, sigil
  scale-up) instead of the plan for it.
- Verified: all four formations screenshotted individually (not just the
  fresh-load knot), a knot→galaxy transition sampled mid-flight, reduced-
  motion path, live keyboard-focus check, both viewports. Zero console
  errors or warnings outside the benign screenshot-readback GPU-stall
  message seen on every WebGL site in this project.
