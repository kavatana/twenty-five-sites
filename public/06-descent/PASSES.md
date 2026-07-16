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
