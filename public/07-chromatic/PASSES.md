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
