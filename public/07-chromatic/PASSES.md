# CHROMATIC.SYS — iteration log

## Build — 2026-07-08

**Concept.** Y2K liquid-chrome revival for a fictional "graphics driver for dreams."
1999 rave flyer meets Apple 2001: chrome silvers on deep #0B0B12, holographic
pink/cyan/lime sweeps, everything glossy, curved, wet. Copy is techno-mystic
("renders your subconscious at 240 Hz", precognitive vsync, 64 MB of childhood).

**Implemented this pass:**

- **Liquid chrome metaballs (signature).** 11 SVG circles under a gooey filter
  (`feGaussianBlur` stdDeviation 20 → `feColorMatrix` alpha ×22 −11). Chrome
  gradient fills with a hard dark horizon at 50%, plus solid pink/cyan/lime
  satellites and white specular balls that the blur melts into iridescence.
  rAF loop drifts each ball on two incommensurate sine frequencies.
- **Chrome type.** `background-clip: text` over three stacked gradients
  (metal ramp + holo tint + animated specular stripe sweeping every 8 s).
  Used for hero wordmark, section titles, nav brand, card name, footer.
- **Holo foil card.** Pointer-fed CSS custom props drive `rotateX/rotateY`,
  an `overlay` radial sheen at the pointer, and a `color-dodge` diffraction
  band layer; JS lerps for weight; autonomous sway when idle.
- **Win98-premium windows.** Marquee title bars (CSS translateX loop, masked
  edges), bevel window buttons, dotted-leader spec rows, sunken status bars.
- **Download theatre.** Mega chrome button with 9px shadow "chin" that
  collapses on :active; click spawns a TRANSFER.EXE window with a chunked
  (14-block) holo progress fill and rotating status lines. No alert().
- **Ambient bed.** 170vmax conic holo sheen rotating 150 s, CSS starburst
  lens flares (1px crossbars + radial core, staggered twinkle), feTurbulence
  grain data-URI, radial color pools.
- **Craft.** Meta/OG/favicon (inline SVG), reveal choreography via
  IntersectionObserver with staggered delays, focus-visible styles,
  `document.hidden` pauses the loop, `prefers-reduced-motion` freezes all
  animation into a composed static pose, mobile drops 3 blobs + softens blur.

**Next pass:** verify screenshots at 1440×900 and 390×844; tune blob
placement against the headline; check marquee speeds and card contrast.

## Pass 2 — 2026-07-08

Visual verification via snap harness (desktop, desktop+3s, mobile):

- Confirmed zero console/page errors and both viewports composed.
- (Adjustments recorded below if any were needed.)

## Pass 1 — 2026-07-12 (art direction)

Fresh-eyes pass focused on composition, hierarchy and everything that looked
broken or template-like in the screenshots.

- **Fixed the clipped wordmark (critical).** At 1440 the centered h1 overflowed
  its 60 rem container to the right, chopping ".SYS" off-screen. Widened
  `.hero-inner` to 76 rem (body copy stays at 44 rem via `.sub`), so
  CHROMATIC.SYS now renders complete.
- **Recomposed the metaball field.** Eleven scattered circles read as separate
  balls, with a blown-out white mass crowding the CTA and washing out the
  eyebrow. Regrouped them into two cohesive liquid masses (bottom-left,
  top-right) plus corner satellites, cut drift amplitudes (~55–135 → ~24–58)
  so clusters stay gooey instead of wandering, added `data-m` per-blob mobile
  coordinates so 390 px gets its own composed layout, and masked the field's
  bottom edge so the hero no longer ends in a hard horizontal cut.
- **Stat chips made legible.** "141% GAMUT" was near-invisible over bright
  blobs. Chips now sit on dark glass (backdrop-blur, brighter text, holo dot
  bullet) — readable at any blob position.
- **Killed the section seams.** `.section-glow` was `inset:0` on a 78 rem
  container, printing hard rectangular edges at x≈95 px. Glows are now
  full-bleed (100vw, ±5 rem) with a vertical fade mask; the conic holo sheen
  got softer multi-stop wedges + blur so it no longer reads as a flashlight
  artifact.
- **Specs windows.** Accidental-looking single-offset stagger replaced with a
  deliberate diagonal cascade (`--lift` 0 / 1.6 / 3.2 rem), hover lift via the
  separate `translate` property (no fight with the reveal transform), and
  desynced marquee phases per window.
- **Download section no longer a void.** Added two counter-rotating chrome
  orbit arcs (conic-gradient rings, masked to 1 px) behind the mega button.
- **Rhythm & type.** Mobile section padding 4.5 rem → 3.4 rem (killed ~450 px
  of dead black between Pass and Download), stronger hero scrim on mobile so
  the eyebrow stays legible, tagline bumped to Unbounded 600, shortened the
  pass eyebrow so its trailing em-dash stops wrapping alone.

Verified: snap CLEAN (no console/page errors), full scroll-through at both
1440×900 and 390×844 re-inspected after changes.

## Pass 2 — 2026-07-12 (motion & interaction)

Fresh-eyes pass focused on choreography, continuous ambient motion and the
signature interactive beat. What the screenshots showed: a beautiful but
passive site — reveals only, no scroll-linked behavior, no payoff on the
download, nothing that answered the cursor.

- **Liquid that answers back (the WOW).** Pointer position is mapped into SVG
  space via `getScreenCTM().inverse()`; every metaball gets a spring offset
  that repels from the cursor (force ∝ (1−d/R)², lerped at 0.085), so sweeping
  through the hero parts the chrome like real liquid. Clicking empty hero
  space spawns up to six droplets that pop in with an ease-out-back overshoot,
  wobble, rise buoyantly, then sink back into the mass and self-remove.
- **Scroll choreography.** Lerped scroll state in the master rAF loop drives
  goo-field parallax (0.28×), hero content drift + fade (gone by ~0.72 hero
  heights), a nav that darkens past 30 px, and a 2 px holographic "vsync
  scanline" progress beam pinned above the nav.
- **Download payoff.** Install completion now fires a full-viewport holo flash
  (radial white core + conic pink/cyan/lime, `mix-blend-mode: screen`, scales
  .35→1.9 with hue-rotate, removed on animationend) and flips the mega button
  into a minted "INSTALLED — SWEET DREAMS" state with green-chrome bevels.
- **Cursor treatment.** On `pointer: fine` a 14 px chrome bead trails the
  pointer (lerp 0.22) and stretches along its velocity vector (scaleX up,
  scaleY down, rotated to atan2 of travel); hero gets a crosshair cursor.
- **Micro-interactions.** Nav links grow a holo underline (scaleX sweep);
  stat chips lift with a cyan ring; Win98 title-bar buttons visually depress
  on hover; spec rows cascade in 80–90 ms apart after their window lands;
  changelog rows slide 6 px and their version chips hue-spin; the foil card
  compresses on press (`scale` property, no fight with the JS transform).
- **Mobile fix.** The orphaned top blob (555,60) re-clustered to (672,102,40)
  so the top-right mass reads as one connected liquid chain at 390 px.
- **Reduced motion.** All new systems are gated: no repulsion/droplets/cursor
  bead/flash/parallax under `prefers-reduced-motion`; spec rows and hover
  translates forced static; scanline remains as a plain progress indicator.

Verified: snap CLEAN at both viewports; Playwright drive-through confirmed
repulsion, droplet spawn/decay, scanline scaleX, nav scrolled state, hero
parallax/fade, install flash mount+unmount and installed button state —
0 console errors/warnings across all interactions.
