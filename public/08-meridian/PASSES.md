# MERIDIAN — passes

## Build — 2026-07-08

**Concept.** Site 08 of 25: MERIDIAN, a Swiss International-Style editorial
magazine, issue 04, "On Precision." Müller-Brockmann, air, order. Paper
#F4F1EA, ink #111111, Swiss red #E63329 held to structural accents. Inter
Tight 300–900 does all hierarchy work; Spectral appears once (italic) on the
pull-quote spread as the single planned transgression. Type is the imagery —
no plates beyond geometry.

**Implemented in this pass.**

- Cover spread: 900-weight "04" numeral cropped at the right viewport edge
  with a slow counter-drift on scroll; 300-weight cover statement ("Nothing
  on this page is an accident."), red kicker, tabular meta row, rotating red
  registration mark.
- Truthful grid overlay (the easter egg): GRID button + `G` key toggle a
  fixed overlay whose columns are built from the *same* `.wrap` container,
  the same `repeat(var(--cols),1fr)` grid, and the same gutter token as the
  layout — red hairline borders, tiny column indices, 28px baseline rows via
  repeating-linear-gradient. 12 columns desktop, 6 on mobile (shared
  `--cols`).
- Contents spread with hanging indices in column 2, sliding red underline on
  hover (scaleX transform, custom cubic-bezier), tabular folios.
- Essay spread: an actual 250-word essay on precision, floated 3-baseline
  drop cap, 58ch measure, baseline-seated rules, marginalia notes (a, b).
- Pull-quote spread in Spectral italic with red column-width rule.
- Plate 04: generated SVG rebuild of the *beethoven* poster logic — seven
  concentric bands, widths ~doubling (4→76), arcs via stroke-dasharray on
  circles, per-band rotation at 0.2–0.9°/s, whole system lerping ±5° with
  scroll. Sticky caption column.
- Instruments: red scroll-progress rule (top), right-edge ruler with red
  marker + tabular percentage readout, live Zürich clock (Intl.DateTimeFormat
  with timeZone).
- Colophon in 11.5px tracked caps, six entries, includes a corrections
  notice with a point of view.
- Guide page (technical supplement) sharing the stylesheet; PASSES.md; SVG
  favicon echoing the arc plate; feTurbulence paper grain at 5%.
- Craft: one rAF clock for all motion, paused on document.hidden; full
  prefers-reduced-motion path (static plate, no loop, reveals shown);
  focus-visible in red; og/meta/favicon on both pages; no libraries.

**Why.** The grid overlay had to be honest — an overlay drawn from separate
math would be decoration, and the essay argues against exactly that.

## Pass 2 — 2026-07-08

Audited screenshots at 1440×900 and 390×844 (see below), fixed whatever the
proofs caught: composition of the cover crop, toc register, colophon
density, mobile stacking. Details appended after verification.

## Pass 1 — 2026-07-12 (iteration: art direction)

Fresh-eyes audit at 1440×900 and 390×844, full scroll-throughs both.

- **Killed the TOC italics.** All five contents titles were set in Inter
  Tight italic — directly contradicting the essay ("it refuses … the
  ornamental italic") and the guide's claim that Spectral's pull quote is
  the *only* italic on the site. Titles are now upright, 700, −.03em,
  larger (clamp 26→44px). The `<i class="u">` tags became `<span>`s.
  Spectral is once again the single transgression, truthfully.
- **Red full stop on the cover statement.** "Nothing on this page is an
  accident·" — the colophon says the red never decorates, it points; the
  period is now the point. One glyph, structural.
- **Dimensioned the void above the pull quote.** TOC item 04 promises
  "white is not empty; it is set in twenty-eight-point increments" — the
  page now proves it: a technical dimension line (1px rule, red end
  ticks, exactly 4 × 28px tall) labeled "4 × 28 px — air, measured" sits
  in the air before the quote. Mobile swaps the label to "3 × 26 px"
  because the baseline differs there and a dimension line must not lie.
- **Editorial end-mark.** The essay's final line now closes with the red
  9px square from the cover kicker — classic magazine end sign, closes
  the loop between cover and essay.
- **Ambient life at rest.** The cover numeral breathes ±4px on an ~18s
  sine in addition to its scroll counter-drift, and the cover's down
  arrow ticks downward in discrete `steps(4)` (no easing — it moves in
  register, like everything else). Both disabled under reduced motion.
- Minor: `text-wrap:pretty` on TOC descriptions to kill orphans.

Verified: snap CLEAN (no console/page/request errors), grid overlay
still truthful, late-frame screenshot now visibly differs from the
early frame.

## Pass 2 — 2026-07-12 (iteration: motion & interaction)

Fresh-eyes audit. The desktop early/late frames were nearly identical —
the only visible ambient motion above the fold was the clock. The grid
toggle (the signature) was a plain opacity fade. The pull quote and the
essay arrived as flat blocks. The plate had a crosshair *cursor* but no
instrument behavior behind it.

- **Misregistration numeral (the ambient signature).** A red copy of the
  cover "04" now sits behind the ink plate (`.numeral::before`,
  `mix-blend-mode:multiply`) and hunts around register, driven by two
  beat-frequency sine products (±7px / ±5px) in the shared rAF loop — it
  stays mostly seated, slips, and pulls back in, like a press that never
  settles. Clearly visible in any captured frame; removed entirely under
  reduced motion (`content:none`), where the issue is, at last, forever
  in register.
- **Choreographed grid toggle.** Columns now draw top-down (`scaleY`,
  snap bézier) on a 35 ms stagger, indices fade at .7s, the 28px
  baseline rows develop at .5s, and a red spec chip appears bottom-left:
  "12 columns · 28 px baseline — the same grid the page uses" (6/26 on
  mobile, because the chip must not lie). Toggling off is immediate.
- **Plate becomes an instrument.** On fine pointers, hovering Plate 04
  raises red crosshair hairlines, a registration ring at the
  intersection, and a tabular readout of the position in millimetres of
  the printed page (720 SVG units → 235 mm). `pointermove` mapped
  through `getBoundingClientRect`; caption updated to say so.
- **Pull-quote spread choreography.** The quote is split into word spans
  and sets itself word by word (38 ms stagger); the red rule draws in
  `scaleX`; the dimension line above measures itself in (`scaleY` from
  the top tick) before its label fades. Cite follows last.
- **Essay galley cascade.** The five paragraphs rise on staggered delays
  (.05–.45s) once the spread enters — set like a galley, not dropped as
  a block.
- **Micro-interactions.** TOC hanging index steps 8px into the gutter on
  hover/focus (12px on press); GRID button seats 1px on press.
- All new states covered in the reduced-motion block; verified snap
  CLEAN at 1440×900 and 390×844 plus live-browser proofs of the grid
  cascade mid-flight, the quote mid-reveal, and the crosshair readout.
  Zero console/page errors.
