# VERSE — passes

## Build — 2026-07-12

**Concept.** VERSE is four original short poems about impermanence — an
orchard, an attention span, a sky, a Tuesday — each staged as a full-viewport
"movement" with its own hand-rolled physics, on ivory paper with ink type and
gold leaf used only for the movement numerals and the erosion residue.

**I — Gravity ("Windfall").** Words hang in place with a subtle idle sway.
Click (or Enter/Space) drops one: it becomes `position:absolute` at a
canonical home coordinate measured once on load, then a per-frame integrator
adds gravity, sine-based flutter (lighter/shorter words flutter more, heavier
ones drop straighter), and mass-scaled bounce restitution off a floor line.
Landed words can knock neighbors they overlap, waking them for a smaller
secondary bounce. A "lift" control reverses everything via a critically-
damped spring per word, staggered so the return reads as slow buoyancy rather
than rewind.

**II — Magnet ("Nearness").** Every letter is an independent spring target.
Within a 96px pointer radius the target offset points away from the cursor,
falloff `(1 − d/r)²`; outside it the target is `(0,0)`. The same spring
integrator chases whichever target is active every frame, so approach and
release feel like one continuous physical gesture. A ring cursor (fine
pointer only) traces the repulsion radius.

**III — Assembly ("Constellation").** Letters scatter on load via a seeded
LCG (polar random offset + rotation), drifting gently while idle. An
`IntersectionObserver` triggers once per session when the poem crosses 30%
into view; each letter's stored scatter distance sets its transition delay
and duration, so the furthest letters travel longest and arrive last —
FLIP-style, without a measured "first" layout pass, since the scatter is
already expressed as a transform.

**IV — Erosion ("Palimpsest").** A 340vh scroll track holds a `position:
sticky` poem. Scroll position maps to 0–1 progress (rAF-throttled); each line
has a reading window, and once progress passes it, non-essential letters fade
/ drift / rotate / blur out on a smoothstep curve while the line's
`data-keep` word stays lit in gold — reversible on scroll-up, since it's a
pure function of position, not a one-shot timeline.

**Shared craft.** Google Fonts only (Crimson Pro + Work Sans); paper grain +
drifting dust motes for continuous ambient life; inline SVG favicon; numbered
side rail with scroll-spy active state; `prefers-reduced-motion` renders all
four poems as static type (Erosion's essential words stay permanently gold);
DPR-independent (no canvas), RAF loops self-park when idle and check
`document.hidden`; every interactive word is a focusable, keyboard-operable
control with `aria-describedby` pointing at its instruction line.

**Verification.** Screenshot pass at 1440×900 and 390×844 via
`tools/snap.mjs`, zero console errors; manual Playwright pass exercising a
gravity click + lift, a magnet pointer sweep, scrolling Assembly into view,
and scrubbing Erosion up and down.
