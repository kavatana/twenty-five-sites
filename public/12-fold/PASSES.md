# FOLD — The Smallest Mountain · build passes

## Build — 2026-07-12
Concept: a hand-cut paper pop-up storybook in five full-viewport "spreads",
telling a 10-sentence story about Pip, the smallest mountain ever measured.
Everything is cut from code — zero image assets.

Implemented:
- Signature pop-up hinge: every scenery piece bases on the spread's fold line
  (`transform-origin: 50% 100%`, resting at `rotateX(-91deg)`); an
  IntersectionObserver adds `.in` per spread and CSS transitions raise pieces
  through an overshoot bezier `cubic-bezier(.30,1.52,.42,1)`, staggered via
  `--i` custom properties in `transition-delay: calc()`. Scrolling away folds
  the scene flat again so it replays.
- Paper language: torn clip-path polygons (script-generated jitter), scalloped
  mask-image edges (radial + linear layers, default add compositing), 2–3
  stacked hard box-shadows for lift, hard-stop gradient center creases.
- Five spreads: (I) valley with layered hill cutouts + rotating clip-path sun
  on a swaying stick; (II) cloud bobbing on a visible kraft tab with a paper
  brad; (III) navy overlay sheet with torn top, punched-hole radial-gradient
  stars (inset rim shadow) and a mask-cut crescent; (IV) six-petal flowers
  unfurling petal-by-petal with per-petal transition delays + a flitting
  butterfly; (V) "THE END" pennant banner swaying on an SVG string, end plate,
  Pip cameo, colophon footer.
- Interactions: page-corner curl (315° gradient fold) advances spreads and
  loops; side page tabs jump to spreads (aria-current tracks the open page);
  dangling pieces (sun, cloud, moon, banner) get a damped swing on hover;
  "Read it again" returns to spread I.
- Craft: Baloo 2 + Nunito, SVG-data-URI favicon, og/meta, focus-visible
  dashed outlines, prefers-reduced-motion flattens all motion and presents
  the book open, visibilitychange pauses all CSS animation, feTurbulence
  grain + lamplight vignette overlays, mobile layout at 390×844 (tabs hidden,
  cards full-width above the curl, flower count reduced).

## Pass 1 — 2026-07-12
Focus: art direction — composition, hierarchy, contrast, dead space.
Screenshotted all five spreads at 1440×900 and 390×844 (snap.mjs only
captures spread I, so a small helper script scrolled each spread into
view for a full visual audit) and found four real problems to fix:

- **Spread II's cloud tab looked broken, not "handmade".** The kraft strip
  that holds the cloud ran from the cloud straight to the very top pixel
  row of the viewport with no terminus — it read as a pole sliced off by
  the screen edge, not a paper mechanism. Added a stapled-on anchor
  bracket (`.tab-strip::before` + two rivet dots via `box-shadow`) with a
  rounded underside and its own drop shadow, and nudged the whole rig
  down 3% so the bracket sits inside the frame with breathing room. Now
  it reads as "tab pinned to the top of the page," which is what the
  brief actually asked for.
- **The night spread's story card had a floating, disconnected tape.**
  `.card-s3`'s kraft tape was 38%-opacity kraft over a navy card — the
  overlap portion nearly vanished into the background, so only the part
  hanging in open air was visible, reading as an unrelated gray chip.
  Repainted it as an opaque kraft gradient with its own hard shadow and
  increased the overlap, so it now visibly pins the card down like every
  other spread's tape.
- **Contrast**: the `.spread-no` kicker (coral on paper) measured ~3:1,
  under AA for text that size. Added `--coral-ink`, a darkened coral
  (~4.8:1 on paper) used for the kicker; the night card's kicker moved to
  a lighter gold that clears 5:1 on its navy card.
- **Dead sky.** Spreads II and IV had 40–45% of empty upper canvas with
  nothing to look at — reads as empty/cheap on a still frame. Added a
  second drift-cloud layer and a three-bird flock (simple clip-path
  chevrons, staggered scale/opacity/speed for parallax) to spread II's
  sky; added a soft pale-sage distant hill silhouette and seven rising
  "pollen" motes (radial-gradient dots on a slow upward drift-and-fade
  keyframe, tying into the spring/dandelion motif) to spread IV. Both
  sets are trimmed on mobile to avoid clutter and respect
  prefers-reduced-motion via the existing blanket animation kill-switch.

Verified with a fresh `snap.mjs` pass plus the manual per-spread capture:
zero console errors, all five spreads re-screenshotted at both
viewports, mobile layouts unaffected by the new elements.
