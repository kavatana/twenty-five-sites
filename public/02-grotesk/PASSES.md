# GROTESK™ — build passes

## Build — 2026-07-08

**Concept.** Site 02 of 25: GROTESK™, a brutalist single-family type foundry.
Voice: terse, load-bearing, anti-decoration ("TYPE IS INFRASTRUCTURE." /
"DECORATION IS DEBT."). Palette locked to #0A0A0A / #FAFAFA / #FF2D2D. Zero
border-radius, 8px black borders, underlines as 8px blocks, raw 12-column
grid lines painted on light sections with a repeating-linear-gradient.

**Signature technique — the drag-to-warp headline.** "GROTESK" is set in the
Anybody variable font. A single rAF loop writes `font-variation-settings`
per letter: pointer Y → wght (100–900), pointer X → wdth (50–150), with a
Gaussian falloff field (`exp(−dx²)`) so warp concentrates under the cursor
and decays across the word. Each axis runs through a hand-rolled damped
spring (semi-implicit Euler) so releases wobble once and settle. Idle, the
springs chase a slow sine wave so the word breathes continuously. Pointer
Events + `setPointerCapture` + `touch-action: none` make it work on touch.
Headline is fit to the viewport by measuring a hidden clone at default axes.

**Also implemented this pass.**
- Letters stagger-slam in on load (translateY inside overflow-hidden
  wrappers, `cubic-bezier(.05,.92,.1,1)`, 65ms stagger) behind a red wipe
  that collapses in `steps(4, end)`.
- Relentless glyph marquee driven in the same rAF loop; per-frame scroll
  velocity is smoothed and mapped to `skewX` and a speed boost.
- A–Z + 0–9 specimen grid: hard-snap invert on hover (`transition: none`),
  each hover re-rolls random Anybody axis values and prints them in the
  cell's codepoint label.
- Waterfall: "TYPE IS INFRASTRUCTURE." repeated to full-bleed at 12 sizes
  (128px → 11px), rows invert on hover.
- License table with 4px borders, inverted featured tier, snap-hover
  buttons with a "SET IN CONCRETE." click response (no alert).
- Cropped giant footer wordmark that breathes on the wdth axis while
  visible; custom crosshair cursor (fine pointers only) with DRAG/WARP
  label; live axis readout in the hero.
- Craft: inline SVG favicon, meta/og, focus-visible outlines,
  prefers-reduced-motion path (static word, no marquee motion, no wipe),
  rAF paused on `document.hidden`, guide page in the same aesthetic.

**Why.** The brief's reason to exist is the variable-font warp; everything
else is scaffolding that proves the doctrine — abrupt where decoration
would ease, alive wherever a recording might land.

## Pass 1 — 2026-07-12

Fresh-eyes art-direction pass. Snapped desktop/mobile + scrolled every
section (`tools/snap.mjs` + an ad-hoc scroll-capture script) and cross-
examined against the rubric. Found and fixed five concrete problems:

1. **Specimen grid glyphs were timid.** At `clamp(40px,8.4vw,132px)` each
   letter sat in the middle third of its cell with a moat of dead paper
   around it — the opposite of "displayed huge." Pushed to
   `clamp(64px,12.5vw,188px)` desktop / `clamp(40px,16vw,84px)` mobile so
   the glyph now owns the cell, with the codepoint tag bumped a point for
   presence. This section reads as the specimen wall it's supposed to be.

2. **The footer wordmark wasn't actually cropped.** The brief calls for a
   "giant footer wordmark cropped by overflow," but the math nearly
   matched: the `.crop` box and the `.mark` line-box were within ~13px of
   each other, so the word just sat there fully visible — a contained
   logo, not a brutalist bleed. Rebalanced the ratio (crop height vs.
   font-size, ~13px→180px and 340px→420px at desktop, matching curve on
   mobile) and switched to `align-items:center` so the type is sliced
   top *and* bottom, with G/K also clipped left/right. It now reads as a
   genuine cross-section of the wordmark, and since it still runs the
   `wdth` breathing loop, the crop line itself pulses — free ambient
   motion.

3. **Red-on-paper small text failed contrast.** `.axes` (live wght/wdth
   readout), `.wlab` (waterfall size labels) and `.sno` (section kicker
   numbers) were signal red at 11–15px on `#FAFAFA` — computed ≈3.5:1,
   under the 4.5:1 bar for normal text and not "artistic display type."
   Fixed by design, not by softening the palette: `.axes` and `.wlab` are
   now ink text with a small red ■ glyph as the accent (kept legible on
   both paper and inverted-row states via an explicit hover color), and
   `.sno` was enlarged to 21px bold so it legitimately clears the
   large-text 3:1 threshold while staying red. Signal red still reads
   everywhere; it just no longer sets small type.

4. Verified no regressions: reran `snap.mjs` (CLEAN, zero console errors)
   plus a full section-by-section scroll capture at both breakpoints and
   the guide page. Grid, waterfall, license and footer all hold up at
   1440×900 and 390×844.

**Still worth a look in a later pass:** the marquee/hero motion choreo-
graphy itself wasn't touched this pass (out of scope — this was
composition/hierarchy/color only); a pass-2 motion pass could push the
drag-warp's idle breathing and marquee skew further for richer continuous
motion, and the license table's inner seam between the inverted STUDIO
panel and CITY panel could use a contrast check under real cursor
hover states.

## Pass 2 — 2026-07-12

Motion & interaction pass, plus the mobile fix flagged for a later round.
Verified first with `node tools/snap.mjs` and an isolated Playwright probe
script (the shared MCP browser session turned out to be contended by a
sibling site's pass mid-session, so all interaction testing after that
point ran through one-off `playwright` scripts against the same static
server instead — cleaner signal, no cross-talk).

1. **Mobile hero was ~68% dead space.** Measured it directly: the fitted
   headline was only 84px tall inside a 786px-tall hero, because a single
   `nowrap` line sized to fit mobile's ~358px content width simply has
   nowhere to grow. Added a mobile-only forced break (`<br class="brk">`
   between O/T, `display:none` above 720px) splitting the line into
   GRO / TESK, then rewrote `fit()`'s mobile branch to size against both
   the wider of the two lines *and* the real vertical space between
   `.hero-meta` and `.hero-foot`. Also measures at a condensed `wdth` (94,
   not the neutral 100) since the live warp animation already treats 100
   as a midpoint, not a ceiling — sizing to the neutral axis was wasting
   room a variable-font specimen has no business wasting. Result: the
   headline block grew from 84px to ~306px tall, gaps dropped from 268px
   to ~162px per side, and it now reads as "massive" on mobile too.
   Caught and fixed two bugs on the way: `hw` was computed from
   `hero.clientWidth`, which *includes* the hero's own padding, silently
   overstating available width by ~30px (harmless on desktop's `nowrap`,
   but on mobile's originally-`normal` white-space it caused a genuine
   third-line wrap, orphaning a lone "K"); fixed by measuring
   `.hero-meta`'s rendered width instead, which already sits inside that
   padding. Second, decided to keep the mobile word on `white-space:
   nowrap` (not `normal`) even with the forced `<br>` — nowrap doesn't
   suppress an explicit break, but it does guarantee the live wght/wdth
   animation can never trigger a *second*, unplanned wrap mid-motion;
   any momentary overflow at animation extremes just clips via `.hero`'s
   existing `overflow:hidden`, the same safety net desktop already relies
   on.
2. **Widened the idle ambient wave — the specimen now sells itself.** The
   headline's non-dragged "breathing" wave previously moved wght across
   642–898 and wdth across 83–117: a fifth of the published 100–900 /
   50–150 range. For a site whose whole premise is "one family, nine
   hundred weights," idling near the middle undersells the axes on every
   silent screen-record. Widened the traveling sine wave to wght 130–870
   and (desktop) wdth 56–144 — each letter now visibly reads as a
   different weight/width at any given instant, a proper "wave" rolling
   letter-to-letter. Mobile keeps the full wght swing but a tighter wdth
   band (74–126): the wider band looked great with desktop's room to
   spare, but on a 390px hero it pushed letters into the crop edges
   distractingly often, so it's reined in there specifically (weight
   doesn't affect line width, so that swing stays full everywhere).
3. **Pricing cards had zero hover feedback — only their buttons did.**
   Added the same hard-snap invert language already used by the specimen
   grid and waterfall rows (`transition: none`, background/color flip) to
   `.plan` itself, so the whole card responds, not just the CTA; the
   featured STUDIO card flips the other direction (ink→paper) so it still
   reads as distinct while hovered. One more surface speaking the site's
   "abrupt, not eased" hover dialect instead of sitting inert.
4. **Custom cursor was hero-only; extended it to the two other kinetic
   zones.** The crosshair+label cursor is a strong, on-concept device
   ("DRAG" in the hero) that previously vanished the moment you scrolled
   past it. Generalized the arm/disarm logic into a small `armZone(el,
   label)` helper and wired it to the specimen grid ("INVERT") and the
   waterfall ("SCAN"), with `cursor: none` added for those containers on
   fine pointers. Confirmed via Playwright hover tests that both zones
   correctly relabel and that leaving/re-entering the hero resets the
   label back to "DRAG" (it wasn't, initially — fixed by having every
   zone's `pointerenter` set the label explicitly rather than assuming
   the default).
5. **Marquee ran forever with no way to actually read a glyph.** Added
   hover-to-pause (sets speed to 0 in the rAF loop, skew still settles)
   plus an instant paper/ink invert on `.strip:hover`, matching the same
   invert grammar used everywhere else on the site. Verified with a
   pixel-level cropped screenshot (a full-viewport screenshot at small
   scale made the huge bold glyphs *look* like they'd stayed black-on-
   black; a tight crop confirmed the invert fires correctly).

Reran `snap.mjs` (CLEAN, zero console/page/request errors) after every
step, plus targeted Playwright checks for the drag-warp interaction, all
four hover states, and the `prefers-reduced-motion` path at 390×844 —
static, legible, no motion, no console errors.

**Still worth attention:** a three-line mobile break (rather than two)
could push the hero headline even larger if a future pass wants to chase
that further; the STUDIO/CITY inner-seam contrast question from pass 1
is superseded now that the whole card inverts on hover, but is worth one
more look under real device cursors.

## Pass 3 — 2026-07-12

Craft-and-finish pass: fresh eyes, full rubric audit, both viewports. Ran
`snap.mjs` clean at both sizes, then went past the single-viewport tool
and scrolled every section manually (the tool only captures the initial
fold; a naive `fullPage` screenshot turned out to under-report the page
too, since Playwright's full-page capture never fires the real
`IntersectionObserver` used for `[data-reveal]` — it *looked* like the
DOCTRINE section and pricing table had gone blank, but that was a
screenshot-methodology artifact, not a real bug; real scrolling proved
both sections render exactly as designed). Found and fixed five real
issues:

1. **Mobile horizontal-overflow bug — a genuinely broken line, not a
   nitpick.** At 390px wide, `document.documentElement.scrollWidth` was
   433px against a 390px `clientWidth`: the DOCTRINE line "TYPE IS
   INFRASTRUCTURE." was rendering at its 40px font-size floor
   (`clamp(40px, 6.8vw, 96px)`), which measures ~417px wide — wider than
   the ~358px actually available inside the section's padding. Because
   `.creed` is a CSS grid and grid items default to `min-width: auto`,
   the unbreakable word refused to shrink to fit its track, blew the
   whole grid (and the page) out sideways, and `body{overflow-x:hidden}`
   quietly clipped the trailing "E" off-screen instead of showing a
   scrollbar — so the bug was invisible as a scrollbar but visible as a
   silently truncated headline in the actual screenshot. Fixed at the
   root, not just the symptom: added `min-width: 0` to `.creed` and
   `.line` (so a future long word degrades to clipping *inside* its own
   box instead of blowing out the page), and added a mobile-scoped
   `.line { font-size: clamp(26px, 8vw, 40px) }` override so the actual
   longest word fits with room to spare at widths down to ~320px.
   Verified by re-measuring all three `.creed .line` elements
   post-fix (all now end well inside the viewport) and by re-screenshotting
   the DOCTRINE section at 390×844.
2. **Pricing buttons had no distinguishable accessible name.** All three
   `.btn` elements read "LICENSE IT →" — identical text, so a screen
   reader's or voice-control's "buttons" list showed three indistinguishable
   entries with no way to tell DESK from STUDIO from CITY without
   surrounding context. Added a distinct `aria-label` per button
   ("License the DESK plan, $90", etc.), verified via a `$$eval` accessibility
   check.
3. **Waterfall section was screen-reader spam.** `#wfall` repeats "TYPE IS
   INFRASTRUCTURE." dozens of times per row across 12 rows purely to fill
   line width at each size — a real typographic device visually, but pure
   noise read aloud, since the section heading and kicker ("ONE SENTENCE ·
   TWELVE SIZES · NO MERCY") already say everything an AT user needs.
   Marked the container `aria-hidden="true"` (matching how `.strip`, the
   marquee, was already treated) — the hover/cursor "SCAN" interaction is
   unaffected since `aria-hidden` doesn't touch pointer events.
4. **Idle-loop performance: a forced layout read running every frame for
   no reason most of the time.** The main rAF loop measured all 7 letters'
   `getBoundingClientRect()` every single frame whenever the hero was on
   screen, to feed the Gaussian falloff field — but that field is only
   read inside the `if (dragging)` branch. The measurement was running
   continuously during the (much more common) idle ambient-wave state,
   where it's simply discarded. Gated it behind `if (dragging)` so the
   idle wave — which runs essentially all the time on a still page — no
   longer pays for 7 layout reads per frame. Verified the drag interaction
   still works correctly post-change (screenshotted mid-drag and post-
   release; axes readout and Gaussian falloff both behave identically).
5. **Guide page's "THE PASSES" section only ever described pass one**,
   even after two more passes shipped — a guide page that claims to
   explain "the iteration-pass process" but stops at pass one is stale
   documentation. Rewrote it to name what each of the three passes
   actually did (structure → motion range/hover-invert/cursor-zones →
   this pass's a11y/perf/overflow fixes), in the same terse, technique-
   naming voice as the rest of the guide. Word count checked afterward
   (495 words, still inside the 300–600 target).

**Also added:** `<meta name="theme-color" content="#0A0A0A">` on both
pages — a small, real craft detail (matches the ink black in mobile
browser chrome) that was missing from an otherwise-complete meta set.

**Audited and confirmed already correct, no change needed:** contrast
(display red-on-paper and red-on-ink text checked against WCAG's 3:1
large-text threshold, both pass at ~3.55:1 / ~5.34:1; small mono text
runs at full ink/paper contrast or ~8.8:1 where dimmed via opacity);
`focus-visible` outlines exist on every link and button; the
`prefers-reduced-motion` path (checked with Playwright's
`reducedMotion: 'reduce'` context) correctly freezes the headline at its
default 800/100 axes, freezes the marquee and footer mark, and still
lets a reduced-motion user complete the drag interaction itself — it's
ambient motion that's suppressed, not the user-triggered kind; rAF is
already cancelled on `document.hidden` and restarted on visibility;
devicePixelRatio capping doesn't apply here (the site uses no `<canvas>`
or WebGL); total local code is 48KB across all four files, far under the
400KB budget; meta/og/favicon/lang/charset/viewport were already present
and correct on both pages.

Reran `snap.mjs` (CLEAN) after every fix, plus a full manual scroll-
through of every section at both 1440×900 and 390×844, a live drag-warp
test, and a dedicated overflow scan
(`document.documentElement.scrollWidth` vs. `clientWidth` plus a
per-element right-edge check) confirming zero unintended horizontal
overflow on either page post-fix — the only elements still wider than
their viewport are the marquee and the footer wordmark, both
intentionally cropped by an `overflow: hidden` ancestor.
