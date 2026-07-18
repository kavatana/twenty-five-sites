# NOIR — passes

## Build — 2026-07-12

**Concept.** Site 14 of 25: NOIR, a monochrome luxury fashion house, presenting
Collection Nº14, "Absence." Strict two-tone palette — `#0A0A0A` ink,
`#F5F5F3` paper, every gray produced by opacity, nothing else. Bodoni Moda
(variable, `font-optical-sizing: auto`) carries the huge display sizes;
Figtree whispers everything small. No photographs anywhere — six garments
exist only as hand-authored SVG paths with gradient fills and turbulence
grain.

**Implemented in this pass.**

- **Cover.** "Absence" set at `clamp(4.2rem, 20vw, 15.5rem)` in the outline-
  to-fill "wipe" technique: the real glyphs are `color:transparent` with
  `-webkit-text-stroke`, a `::after` duplicate (`content: attr(data-text)`)
  sits behind a collapsed `clip-path` polygon and sweeps in on hover, or once
  via `IntersectionObserver` on load. A slow `-webkit-text-stroke-width`
  breathing keyframe keeps the hero alive at rest. Cover meta row, italic
  Bodoni dek, and a vertical "Scroll" tick with a looping travel animation.
- **Corner registration marks.** Four fixed corners — wordmark, a running
  catalog folio ("P. 01 — Cover" → "P. 09 — Index") driven by one
  `IntersectionObserver` over `[data-page]` sections, the collection line,
  and the year — replace a conventional header/footer nav and read as
  margin notes on a printed lookbook.
- **Lookbook.** Six looks in a `scroll-snap-type: x mandatory` shelf. Each
  look is a ghost outlined number, a hand-drawn silhouette (coat, column,
  a literal void cut via `fill-rule="evenodd"`, a sheath, an asymmetric
  drape with layered fold strokes, and a nearly-empty final study), and a
  short caption. Grain is one shared SVG `<filter>`
  (`feTurbulence` → `feColorMatrix` → `feComposite operator="in"` against
  `SourceAlpha` → `feBlend overlay`), so texture exists only inside each
  garment's own silhouette. A `requestAnimationFrame`-throttled scroll
  handler reads every look's bounding rect and writes `--blur/--scale/--op`
  as a continuous function of distance from center — sharpening is gradual,
  not a snap-toggle. A `wheel` listener remaps vertical intent to
  `scrollLeft` and releases at the shelf's edges so it never traps page
  scroll; arrow keys and two hairline nav buttons cover keyboard/no-trackpad
  access; a hairline progress rule tracks position.
- **Ticker.** A slow infinite marquee of collection keywords between the
  lookbook and the manifesto — the one purely ambient, always-on motion
  that keeps a screen recording alive even if nobody touches the page.
- **Manifesto.** Single 58ch justified column, paper-on-ink inverted to
  ink-on-paper for the section, with "Absence" pulled out at ~8x scale in
  italic Bodoni using the same wipe mechanic (stroke inverted to ink).
  Real copy, no lorem ipsum, five words where twenty would do.
- **Cursor & link inversion, one physics.** Both use
  `mix-blend-mode: difference` against a near-white source: a crosshair
  reticle (four corner ticks + a dot) lerps toward the pointer each frame
  and stays legible over both the ink cover and the paper manifesto without
  any conditional recoloring; links wrap their text in a `::after` that
  grows from `scaleX(0)` on hover, painting *above* the glyphs so background
  and letterforms invert together inside one precise rectangle.
- **Craft.** Cursor hidden on coarse/no-hover pointers (`hover:hover) and
  (pointer:fine)`), one shared `requestAnimationFrame` loop paused via
  `visibilitychange`, full `prefers-reduced-motion` path (grain drift,
  ticker, wipe transitions, and cursor lerp all disabled; blur interpolation
  forced off so the lookbook holds sharp and static), `<noscript>` fallback
  that fills all wipes solid and unblurs the lookbook, inline SVG crosshair
  favicon, meta/og on both pages, focus-visible outlines tuned per section,
  guide page sharing the exact stylesheet and fonts.

**Why.** The brief asked for severe elegance built from almost nothing —
two colors, two typefaces, no imagery. The constraint is the design: every
technique above (turbulence clipped to alpha, difference-blend inversion,
continuous scroll interpolation) exists to make "restraint" legible as
craft rather than as an empty page.

## Pass 2 — 2026-07-12 (visual verification)

Ran `tools/snap.mjs` at 1440×900 and 390×844, plus custom scroll-through and
`prefers-reduced-motion` harnesses, and read the actual screenshots rather
than trusting the code. Three real problems surfaced and were fixed:

- **The hero was filling on load, not on hover.** The `IntersectionObserver`
  that reveals `.wipe` headlines was attached to every headline, including
  the cover — so "Absence" arrived already solid-filled in the very first
  screenshot, silently deleting the brief's core interaction (outlined by
  default, fills on hover). Scoped the auto-reveal to just the manifesto's
  pulled-out "Absence" (which has no hover partner on touch devices); the
  cover and lookbook headline now stay outlined until a pointer or focus
  finds them, exactly as specified.
- **Fixed corner marks collided with scrolling content.** The four corner
  registration marks are `position:fixed` for the full page height; against
  plain text they had no backdrop, so at several scroll positions a look
  caption or heading scrolled directly under a corner label and the two
  type systems overlapped into noise. Gave each corner a small opaque
  ink chip (`background + backdrop-filter`, tight padding) so it now reads
  as a stamp glued to the page corner — legible over any content or section
  color, never fighting it.
- **Look 06 didn't read as "almost nothing."** The intended finale — the
  sparsest silhouette, echoing the manifesto's "nothing left to remove" —
  was rendered nearly as large and opaque as the earlier, fuller looks,
  undercutting the six-look narrative arc toward absence. Shrunk and
  lightened its one small fabric fragment so the single hairline is now
  the dominant mark and the composition genuinely thins out toward Look 06.

Verified CLEAN console/page/request output on the final render at both
viewports, and confirmed the `prefers-reduced-motion` path independently:
lookbook holds fully sharp (no blur interpolation), the manifesto pull-word
still resolves to filled (state change, no transition), and the corner
chips remain legible with no animation.

## Pass 1 — 2026-07-12

Fresh-eyes art-direction pass. Ran the snap harness, then scrolled the full
page by hand (the harness only captures the first viewport, and this site's
real content — lookbook, manifesto, footer — lives below it) to see every
section that matters. Found and fixed four real problems:

- **The fixed corner marks collided with the footer.** At the true bottom of
  the page the "stamp" chips (fixed for the whole document) sat directly on
  top of the footer's own colophon — on mobile the bottom-right chip
  ("MMXXVI") physically covered the "How it's made" link down to a single
  stray "E" poking out from behind it, and the bottom-left chip duplicated
  the footer's own "Collection Nº14 — Absence" line on top of itself. Added
  a `footer-in-view` `IntersectionObserver` (threshold `.12`) that fades the
  corner marks to `opacity:0` once the real printed colophon is on screen —
  the running header's job is to orient a reader mid-page, and it has
  nothing left to say once the actual footer is showing the same
  information without a collision.
- **The six silhouettes didn't read as six garments — they read as one
  shape, six times.** Every look past 01 shared the same rounded-top,
  tapering-to-a-point outline; at lookbook scale this collapsed into a
  generic bullet/capsule silhouette, and Look 03's circular void cut into
  that exact shape landed closer to a beauty-gadget icon than a dress
  cutout — actively working against "severe elegance." Rebuilt the top
  third (the neckline/shoulder, the part that actually carries a garment's
  identity) of Looks 02–05 with four distinct treatments: 02 a flat boat
  neckline (architectural, square-shouldered column), 03 a V-neck notch
  with the void changed from a circle to a vertical keyhole lozenge
  (reads as an intentional bodice cut, not a hole), 04 a raised, squared
  turtleneck collar (boxier than the others, "second skin" fitted), and 05
  a fully asymmetric one-shoulder cut — rebuilt as a single long diagonal
  from a high right-shoulder strap down to a bare left shoulder, with the
  diagonal itself retraced as a visible seam line so the asymmetry survives
  the lookbook's blur-at-the-edges treatment. Looks 01 and 06 were already
  distinct (coat lapel notch; deliberately "almost nothing") and were left
  alone.
- **The site's central interaction — outline wipes to fill — never once
  played for touch users outside the manifesto.** Hover-only reveals are
  correct restraint for the cover (it's on screen at first paint; an
  intersection trigger there would just be the pre-fill bug the last pass
  already fixed), but the lookbook's "Six looks." heading is always below
  the fold at load, so gating it to `:hover` only meant phones and tablets
  — most real traffic — saw it permanently outlined and never once watched
  it resolve. Generalized the manifesto's reveal-once `IntersectionObserver`
  to every `.wipe` outside `.cover-h1`, so "Six looks." now fills
  cinematically as the lookbook arrives on any input type, while the hero
  keeps its hover-only austerity.
- **The cover and lookbook read as flat and empty in the screenshots**,
  more like a dark placeholder than a considered composition. Added a
  fixed, `z-index:-1` column-grid layer (`.gridlines`) — the same seven-line
  column structure as the content `.wrap`, hairline-thin, at 4.5% opacity —
  behind everything. It reads as the kind of grid a garment pattern is
  drafted on, gives the huge negative space some quiet architecture instead
  of plain black, and — because it's paper-colored lines under a paper
  background — it disappears entirely on its own inside the manifesto,
  never needing a special case. Also gave each corner chip a single hairline
  edge (matching the site's own "hairline rules structure everything" rule)
  so it reads a touch more like a printed registration mark and a touch
  less like a generic UI toast.

Re-ran the snap harness plus a full hand-scroll pass (hero, all six looks at
their focused/blurred states, manifesto, footer) at both viewports, and a
`prefers-reduced-motion: reduce` pass — zero console/page/request errors
throughout. Remaining soft spot for a future pass: the ambient grid is
tuned very conservatively (4.5% opacity) to stay out of the way; a future
pass could consider a second, larger-scale structural mark (e.g. a single
faint diagonal or center crosshair) if the cover still reads as under-
composed at a glance.
