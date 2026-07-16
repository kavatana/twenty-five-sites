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
