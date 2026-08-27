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

## Pass 1 — 2026-07-12

Art-direction pass. `snap.mjs` only captures the hero viewport, so this pass
first built a section-by-section Playwright harness to screenshot each of
the four movements directly (`#m1`–`#m4`) at both viewports — the earlier
snapshot had never actually been looked at past the fold. Five problems
turned up under that scrutiny; four were fixed:

1. **Contrast.** Computed luminance on the palette showed several
   supposedly-secondary text roles failing legibility badly: the gold
   eyebrow/numerals (`--gold-70` solid or alpha) measured ~1.9–2.6:1 against
   ivory, and `--ink-50` captions (whisper instructions, TOC descriptions,
   movement labels, footer) measured ~3.2:1 — both well under the 4.5:1 body
   floor, and these are functional reading copy, not decoration. Added
   `--gold-ink` (#8A6B28, solid, ~4.7:1) for gold text and `--ink-60`
   (~4.6:1) for secondary captions; kept the original lighter `--gold` /
   `--ink-50` for backgrounds, borders, fills and hover states where
   contrast doesn't apply. Re-verified the new ratios by hand before wiring
   them in.
2. **Dead space.** Every movement centers a 760px column in a 1440px
   viewport, and because poem lines don't fill their own measure, the whole
   right half of the screen was bare ivory with nothing but a stray dust
   mote — read as unfinished rather than spacious. Added a `.m-watermark`:
   a huge, near-invisible outlined roman numeral (matching the movement)
   bleeding off the right edge behind the text at `z-index:-1`, on a slow
   19s breathing drift (paused under reduced motion, hidden under 980px
   where there's no margin to spend). It answers the small engraved numeral
   in the header with a giant ghost of the same mark — a considered
   asymmetric balance instead of empty margin, and free continuous ambient
   motion for the screen-recording test.
3. **Gravity's floor was invisible.** `.floor` was a 1px line at 13% ink —
   effectively imperceptible until you'd already dropped a word onto it, so
   the empty canvas gave no hint that Windfall has a ground at all. Raised
   it to 28% ink and scattered four tiny motionless "leaf" flecks (gold/ink,
   varied rotation) along it — cheap, static, and it reads as orchard-floor
   litter, which also happens to be exactly on-theme for a poem about
   windfall apples. (First attempt added a soft drop-shadow gradient above
   the line too; screenshotted, it rendered as a visible pill-shaped bar —
   looked like a stray UI element, not a shelf — so it was cut back to just
   the line and the leaves.)
4. **Assembly had no thematic backdrop.** "Constellation" scattered letters
   into a plain ivory field with the same generic grain+motes as every other
   movement — no visual echo of the poem's own subject. Added a `.starfield`
   of nine faint gold points at varied size/position/delay, each twinkling
   on its own slow cycle, `z-index:-1`, hidden at mobile widths — a quiet
   scene-setting detail rather than a new mechanic.
5. **Not fixed, flagged for a later pass:** the four movement layouts (I–III)
   are still structurally identical templates (numeral → label → italic
   title → poem → whisper, left-aligned, same measure) differentiated only
   by their physics; a future pass could vary composition per movement
   (e.g. centering Magnet, or a different title treatment for Erosion)
   without breaking the shared wayfinding system.

Re-shot every movement at both viewports after each change (a custom
section-scroll Playwright script, since `snap.mjs` only sees the hero) and
confirmed zero console errors throughout. Also swept the guide page's inline
styles with the same `--gold-ink` / `--ink-60` swap so the "How it's made"
page doesn't regress the fix made on the main page.
