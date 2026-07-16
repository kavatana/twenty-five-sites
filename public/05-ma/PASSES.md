# 間 MA — iteration passes

## Build — 2026-07-08

**Concept.** 間 (ma): the interval as material. A fictional Kyoto paper-and-ink
studio rendered as a meditation on negative space — content holds ~30% of any
viewport, the rest is washi. Vermillion appears once per view, tiny, like a
seal on a sumi-e painting.

**Implemented.**
- Hero: seven-layer self-drawing sumi-e brushstroke (per-path `getTotalLength()`
  → `stroke-dasharray`/`stroke-dashoffset` release, staggered on a custom
  draw bezier). Dry-brush edge via `feTurbulence` + `feDisplacementMap`; ink
  bleed via a blurred fat duplicate; kasure (flying white) via washi-colored
  strokes painted over the tail. 間 fades in at 2.3s, then breathes on a 9s loop.
- Sections separated by 150vh of emptiness, one small element each:
  morphing border-radius stone (Ryōan-ji koan), winter-paper koan, seasonal
  haiku crossfading through 春夏秋冬 with a masked background-color tint pool,
  ensō drawing itself on scroll-into-view (same stroke rig, arc paths).
- Hanko seal stamps the footer: scale 2.4 → 1 on an overshoot bezier
  (`cubic-bezier(.3,1.4,.45,1)`), settling at −3°, stamp-rough edges via
  displacement filter on the SVG rect.
- Vertical-rl for Japanese headings and all haiku; Noto Serif JP + Zen Kaku
  Gothic New; bilingual koan copy written in-voice.
- Ambient motion for recordings: ink-wash drift (42s), stone morph (16s),
  season cycle (9s), 間 breath, scroll-cue line, laggy ink-dot cursor
  (fine pointers only, rAF, paused on document.hidden).
- prefers-reduced-motion: strokes pre-drawn, no cycling/breathing, hanko
  pre-stamped, cursor native — page composed and legible while still.
- Guide page in-aesthetic at guide/; meta/og/favicon on both pages.

## Pass 1 — 2026-07-12

**Focus: art direction.** Fresh-eyes review against screenshots (desktop,
desktop+3s, mobile, plus a full scroll-through of every section and the
guide page) surfaced one serious composition fault and a few smaller
refinements.

**Fixed — hero brushstroke vs. 間 collision (the big one).** In the build,
`.hero-art` centered the SVG brushstroke and the `間` glyph in the same grid
cell, both vertically centered on the same axis. The stroke's mid-band
(y≈170–266 of a 0–400 viewBox) landed almost exactly across the character's
horizontal crossbar, at nearly the same ink weight — in every screenshot it
reads as a strikethrough scribbled over the wordmark, not a deliberate
brush gesture. This was the single biggest "looks broken" problem on the
page's most important view.
  - Restructured `.hero-art` to two explicit grid rows: `間` on top (now the
    unambiguous focal point, bumped from `12.5rem`→`13.4rem` max since it no
    longer has to fight the stroke for room), the brushstroke below it as a
    grounding accent/underline, separated by a `clamp(1.2rem, 4.4vh, 2.7rem)`
    gap — a small joke worth keeping: the empty interval *between* the mark
    and the character is itself an enactment of 間.
  - Cropped the stroke SVG's `viewBox` from `0 0 1200 400` to `0 108 1200 188`
    so the rendered box hugs the ink instead of carrying ~150px of dead
    padding above and below it — the accent now reads as a taut, considered
    line rather than a loose full-height artboard.
  - Added an eighth, faint dry-brush flick past the stroke's tail (kasure),
    now that the stroke stands alone as a compositional element and can
    carry a bit more textural incident.
  - Re-centered `.ink-wash` explicitly (`inset:0; margin:auto`) instead of
    relying on the old single-cell grid's implicit centering, which no
    longer applied once the grid gained a second row.

**Also fixed.**
  - `.ink-wash` opacity nudged .045→.055 — at the old value it was essentially
    inert in every screenshot; now it reads as a faint bloom behind the
    glyph, adding a hair of depth without breaking the restraint.

**Verified unaffected.** Stone, paper, seasons, ensō, visit, footer and the
guide page were re-screenshotted (full scroll pass, both viewports) after
the hero change and are untouched — they were already well-composed:
tuned vertical rhythm, correct contrast (ink-soft 6.97:1, ink-faint 4.95:1
against washi), no console errors, reduced-motion path composed and legible.

**Still worth watching in a later pass:** the hero's top/bottom margins
breathe a little differently now that `.hero-art` is taller (character +
gap + stroke vs. the old overlapped block) — worth an eye on very short
viewports (<760px tall) to confirm the scroll cue never crowds the copy.

## Pass 2 — 2026-07-12

**Focus: motion & interaction.** Confirmed pass 1's hero fix holds, then
cross-examined the site against the pass-1 "still worth watching" note and
the motion/choreography rubric specifically. Found and fixed a real mobile
bug and four interaction gaps.

**Fixed — scroll cue colliding with copy on short viewports (the mobile
composition bug).** The pass-1 note turned out to be real: at ~390×640
(a common phone-in-browser-chrome height, not just an edge case), `.cue`'s
fixed `bottom: 4.5vh` didn't scale down with `.hero-art`'s content height,
and the falling ink-drip line landed directly on top of "We work inside
it." — visually a strikethrough on the closing line, the second time this
exact failure mode (accidental line-through) has shown up in this hero.
Added a `@media (max-height: 720px)` pass that tightens `.hero-art`'s
row-gap, caps `.hero-char` smaller, trims `.hero-copy`'s margins and pulls
`.cue` closer to the edge — verified clean at both 390×640 and 375×667 with
real headroom between the cue and the last line of copy now.

**Fixed — the brushstroke went dead the instant it finished drawing.**
Diffing two screenshots 3s apart showed 間 breathing and the background
ink-wash drifting, but the brushstroke itself was pixel-identical — once
`stroke-dashoffset` hit 0 it never moved again, so on a screen recording
the hero's own signature gesture was the one static thing in the frame.
Gave the blurred bleed-underlay path its own slow, offset opacity breath
(`ink-breathe`, 12.5s, delayed to start after the draw-in) so the ink now
reads as still faintly sinking into the paper — confirmed via amplified
frame-diff that the stroke now visibly participates in the hero's ambient
motion instead of sitting inert beneath a breathing glyph.

**Elevated — the hanko stamp is now the site's actual wow-moment.** The
stamp itself (scale/rotate overshoot bezier) was already good, but landed
with no sense of impact — a mark just appeared. Added a `.hanko-ring`:
a soft vermillion bloom that expands and fades right on contact (delayed
~560ms into the stamp, peaking ~0.4 opacity at 2.6× scale before dissolving
over 1.2s), reusing the hanko's own accent color so the "vermillion once
per view" rule isn't broken — it reads as the seal's own ink bleeding into
the paper, not a second accent color. Paired it with a 3px `translate`
"settle" on the footer name/credit/nav lines, staggered ~60ms apart so the
page appears to absorb the impact in sequence rather than all at once.
Verified frame-by-frame (opacity/transform sampled every 150ms) that the
bloom actually animates through its full arc and isn't just theoretically
present in the CSS.

**Added — real micro-interactions where there were none.** `:active` press
states on the season buttons and footer links (previously hover-only, no
tactile feedback on click/tap); hover response on the stone and ensō
(subtle scale, respecting the "opacity/translate only" spirit by using
`transform`/`translate` exclusively) with the ink-dot cursor now also
"growing" near them, extending the existing `a, button` grow logic so the
cursor treats anything touchable the same way; and a click/tap ink-ripple
(`pointerdown` → a small radial bloom at the pointer, self-removing on
`animationend` with a `setTimeout` safety net) so pressing the page itself
now leaves a drop of ink — reinforcing the "ink" cursor concept beyond just
the trailing dot. All gated behind the existing `reduced` check.

**Added — scroll-linked parallax.** `.sec-label` (the vertical numeral
headings) now drift via `animation-timeline: view()` under
`@supports`, composing with `.reveal`'s existing `transform` since
`translate` is a separate CSS property — pure progressive enhancement,
silently inert where unsupported, automatically disabled under
`* { animation: none }` in the reduced-motion query.

**Verified.** `snap.mjs` clean (zero console/page/request errors) across
three iterations; amplified frame-diffs at t and t+3s confirm continuous
ambient motion now touches glyph, stroke, wash, and cue together; hanko
bloom sampled through its full timing curve; ripple confirmed to spawn and
clean itself up (0 stray nodes after animation); reduced-motion pass
re-verified clean with the hero pre-drawn, hanko pre-stamped and the new
ring hidden entirely (`display: none`) rather than left to jump-cut.

Files touched: `index.html`, `style.css`, `main.js`, `PASSES.md`.

## Pass 3 — 2026-07-12

**Focus: craft & finish.** Fresh-eyes pass against the accessibility,
performance, and copy/guide-quality parts of the rubric specifically —
pass 1 fixed composition, pass 2 fixed motion, so this pass hunted for
what a harsh accessibility/perf audit would still flag. Full scroll-through
at both viewports plus a reduced-motion pass and a tab-through of every
control, all screenshotted and re-verified rather than assumed from the
code.

**Fixed — a real WCAG contrast failure.** Ran the actual palette through
the sRGB relative-luminance formula rather than eyeballing it:
`--vermillion` (#C73E2E) on `--washi` measures 4.48:1 — under AA's 4.5:1
floor for sub-large text. It's used exactly where that matters: the
active season toggle (`.season-btn.on`), real interactive text, not
decorative seal ink. Added `--vermillion-text` (#A9331F, 5.86:1 — verified
with the same formula, not guessed) for that one use, and stopped the
"selected" state from resting on color alone by adding a weight bump
(300→400, chosen because only 300/400/600 are loaded for Noto Serif JP —
checked the `@import` rather than reaching for an arbitrary 500 that the
browser would've had to synthesize). The hanko's own washi-on-vermillion
seal text stays as-is; a stamp is a logotype, which WCAG exempts, and
darkening the seal itself would blunt the one deliberate saturated moment
in the whole site.

**Fixed — the ink-dot cursor's rAF loop never stopped.** It ran every
frame from first mousemove until `document.hidden`, even while the
pointer sat perfectly still — the exact "rAF hygiene" gap this pass was
briefed to hunt for. Rewrote the chase loop to detect when it's caught up
to the pointer (within 0.06px) and go idle — zero scheduled frames — until
the next `mousemove` wakes it. Verified with a scripted mouse move +
1.2s settle that the dot lands within a fraction of a pixel of the target
and stays there without further frames; hover-grow behavior on links,
buttons, the stone and the ensō re-confirmed unaffected.

**Added — aria-labels on the season toggle.** The four buttons carried
only a bare kanji (春/夏/秋/冬) as their accessible name — fine for a
Japanese screen reader, opaque otherwise. Added `aria-label="Spring — 春"`
etc. (English name first, kanji retained, satisfying WCAG's Label-in-Name
since the visible glyph still appears in the computed name) so the control
reads clearly regardless of voice.

**Rewritten — the guide's Process section had gone stale.** It still
described only the build's single iteration loop, even though the site
had since been through two full dated passes (art direction, then motion)
— the guide's own "iteration-pass process" section was the one place on
the site that hadn't been revisited since the build. Rewrote it to
name what pass 1 and pass 2 actually fixed (the hero strikethrough, the
short-viewport cue collision, the inert stroke, the hanko's missing
impact) and folded this pass's contrast/cursor work in as the close,
so the essay now matches `PASSES.md` instead of undercutting it. Checked
word count against the brief's 300–600 range by parsing only `<main>`
(an earlier pass-over-pass count had mistakenly included the `<style>`
block's CSS as "words," which would have shown a false 690+); the real
body count is 458.

**Added — `theme-color` meta on both pages**, matching washi (#F5F1E8),
so browser chrome doesn't clash with the site the instant it loads.

**Verified.** `snap.mjs` clean across two iterations (05-p3, 05-p3v2);
full scroll-through at 1440×900 re-screenshotted section by section —
stone, paper, seasons (contrast fix visibly darker on 春 without reading
as a different color), ensō, visit, footer — all still composed;
reduced-motion context (`page.emulateMedia`) re-verified: hero pre-drawn
and static, hanko pre-stamped and at rest, no console errors; guide page
re-screenshotted full-page at both viewports.

Files touched: `index.html`, `style.css`, `main.js`, `guide/index.html`,
`PASSES.md`.
