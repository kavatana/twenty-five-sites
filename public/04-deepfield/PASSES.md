# DEEPFIELD STATION — iteration log

## Build — 2026-07-08

Concept: a 1978 phosphor-CRT mission console for DSS-4 "LONGWAIT", a fictional
2.4 m deep-space photon telescope. The visitor is the operator: the page runs a
power-on self-test (typewriter boot with checksums), then hands over a live
console — ticking telemetry, a glyph-based ASCII survey map with a slewing
target reticle, an air-ground event log, and a working command line. A
transient source (DF-1978A) trips MASTER ALARM ~26 s in: the whole palette
shifts green→amber, a klaxon banner blinks, the reticle auto-slews to the
anomaly, and the station auto-ACKs if the operator doesn't.

Implemented this pass:

- CRT chrome in pure CSS: repeating-linear-gradient scanlines + vertical
  grille, radial vignette + inset shadow for tube curvature, steps() flicker
  overlay with mix-blend-mode, text-shadow phosphor bloom, crt-on scaleY
  entrance after boot.
- Canvas starfield drawing VT323 glyphs on a character grid (seeded
  mulberry32), per-star sine twinkle, slow sidereal field drift, box-drawing
  reticle (┌┐└┘ + crosshair rails) eased with easeInOutCubic; RA/DEC readout
  interpolates real catalog coordinates during slews.
- Single rAF engine with accumulated console time: typewriter job queue
  (boot, command responses, in-place SCAN progress bar), telemetry noise
  (photon count, rate sparkline in block glyphs, gimbal AZ/EL derived from the
  reticle, drift random-walk), ambient log chatter, idle auto-demo that types
  preset commands, alarm scheduler. Loop cancels on document.hidden;
  devicePixelRatio capped at 2.
- Command set: HELP, SCAN, TARGET ANDROMEDA/CRAB/VEGA, DIAGNOSTICS (amber
  CHECK line during alarm), ACK, CLEAR; preset buttons; input mirrored into a
  block-cursor terminal line.
- Alarm mode as a body class swapping the CSS custom-property palette; canvas
  chases it with a lerped color mix.
- prefers-reduced-motion: boot renders complete instantly, flicker/klaxon/
  cursor blink stilled, slews snap, telemetry polls at 1 Hz.
- Guide page in the same chrome; footer, favicon, meta/og on both pages.

## Pass 1 — 2026-07-12

Art-direction pass. Screenshots at 1440×900 and 390×844 (plus a +3s late
frame) turned up one real bug and several composition problems; fixed all of
them.

- **Bug: mobile grid blowout.** `.trow`, `.panel` and the grid-area
  containers had no `min-width`, so CSS Grid's default `min-width:auto`
  sized `main.console`'s single mobile column to its widest *content*
  (nowrap telemetry values), not the viewport. `document.documentElement
  .scrollWidth` measured 601px inside a 390px viewport — the page was
  silently overflowing sideways. Because the reticle is positioned at a
  fraction of canvas width, this pushed it clean off the right edge: the
  slewing target reticle, the console's signature move, was invisible on
  every phone. Fixed with `min-width:0` on `main.console > *, .panel,
  .trow`; verified scrollWidth === innerWidth at both viewports afterward.
- **Starfield read as empty.** At the old density (`cols·rows/20`) the
  survey map was mostly black with a dozen scattered glyphs — cheap, not
  "deep field." Rebuilt as a 4-tier pyramid (dense unresolved haze →
  occasional catalogued point → rare bright source → the odd landmark),
  ~3× denser, plus a faint drawn RA/DEC graticule under the field so it
  reads as a surveyed instrument, not a random scatter. The reticle's
  brackets/label sit well above this now-busier field so it stays the clear
  focal point.
- **Empty COMMAND panel.** Right after boot the terminal panel was ~70%
  dead black — the single biggest "looks unfinished" spot on the page.
  Added a live `.cmdstatus` ticker (session uptime, channel state, seconds
  to the next auto-demo command, all updating continuously) as a permanent
  top strip, added a third boot-handoff line, and trimmed the panel's
  reserved height (`232px max → 204px`) so the remaining void is smaller
  and always has something ticking in it — directly serves the "must feel
  ALIVE" brief for a screen recording.
- **Boot→console handoff was a single flat flash.** `#stage.on` triggered
  one `crt-on` keyframe for the whole page at once. Panels now stagger in
  (`col-left → map → log → command`, 80–440ms offsets) after the tube
  snaps on, reading as subsystems powering up in sequence rather than one
  cut. Respects `prefers-reduced-motion` (panels render at full opacity,
  no stagger).
- **Mobile header wrapped awkwardly** into three uneven lines. Wrapped the
  elevation clause in `.mast-elev` and hid it under 980px, so the subtitle
  breaks cleanly to two lines instead of three.
- **Contrast regression caught before shipping:** the new ticker's label
  text was drafted in `--ink-faint` (2.4:1 against the background — fails
  the 4.5:1 body-text bar). Moved labels to `--ink-dim` (6.2:1) and live
  values to `--ink-hi`, matching the existing `.mapfoot` pattern.
- Minor: guide page footer had a pointless self-link ("How it's made" while
  already on that page); removed it, kept Index + Back to console.

Verified: `node tools/snap.mjs /04-deepfield/ ...` clean (no console/page
errors, no failed requests) on index and guide, at both viewports, before
and after; `document.documentElement.scrollWidth === innerWidth` confirmed
on mobile and desktop; alarm/amber palette spot-checked by forcing `.alert`
— canvas tint and DOM custom properties still shift together correctly.

## Pass 2 — 2026-07-12

Focus: motion & interaction. Screenshot pass (1440×900 + 390×844, plus a
forced-alert render and a temporarily-shortened alarm timer to actually see
the amber sequence fire) turned up a real easing-quality violation and a
console that, once tracking, went dead still between commands. Fixed both,
then added the pass's signature move: the survey map is now genuinely
clickable.

- **Default `ease` in four places.** The brief for this pass explicitly
  bars the lazy default curve. `.panel`/header/footer color transitions,
  the boot overlay's opacity fade, and its reduced-motion fallback were all
  `ease`. Added a second named curve, `--ease-snap:
  cubic-bezier(.16,1,.3,1)` (quick UI punches — alarm color-shift, hover,
  focus) alongside the existing `--ease-console` (the slow power-on move),
  and applied it everywhere `ease` had been used as a placeholder.
- **Reticle went dead still while tracking.** Between slews the crosshair
  only had a pulsing center dot — everything else (rails, brackets, label)
  was frozen, which undercuts the "must feel ALIVE for video" brief on the
  site's own signature element. Added a continuous summed-sine idle dither
  (a couple of pixels, never more) to the whole reticle assembly whenever
  it isn't actively slewing, deliberately textured to match the existing
  GUIDE DRIFT telemetry reading — the crosshair now visibly represents the
  same guide noise the numbers already claim to have. Disabled under
  `prefers-reduced-motion`.
- **New interaction: click-to-point.** The map was previously look-only —
  targets only changed via the command line or the auto-demo. The canvas
  now tracks the pointer: hovering shows a dashed ghost box with a "CLICK
  TO SLEW" label (cursor set to `crosshair`), and clicking converts the
  cursor position to a synthetic RA/DEC, commands a real slew, updates
  TGT/MODE, and writes an "OPERATOR SLEW" line to the event log — the
  console gains real operator agency instead of only ever narrating itself
  at you. Ghost preview is suppressed when it would sit on top of the live
  reticle (e.g. right after the slew lands under the cursor), and is a
  no-op during MASTER ALARM so it can't fight the alarm's own slew to the
  anomaly. Verified with a scripted Playwright hover+click: ghost box
  renders, click produces the log line and a visible slew, zero console
  errors.
- **Command-line focus state was invisible.** `#cmdinput` is a fully
  transparent (`opacity:0`) overlay covering the whole `.cmdline` row, so
  the global `:focus-visible` outline rule had nothing to actually show —
  keyboard-tabbing into the terminal gave zero visual feedback beyond a
  prompt-color change. Replaced the JS `focus`/`blur` → `.live` class
  toggle with a CSS `.cmdline:focus-within` rule carrying a real glow
  (`box-shadow`), which is simpler (two fewer JS listeners) and reacts to
  both keyboard and mouse focus reliably.
- **Panel hover micro-interaction.** Added a gated (`hover:hover and
  pointer:fine`, so it can't get stuck on touch) border-brighten + soft
  glow on `.panel:hover` — the module under the cursor now reads as
  "armed," cheap console tactility that was previously absent everywhere
  except the preset buttons.
- **Mobile header wrap regression re-checked.** Pass 1 hid the elevation
  clause to force two lines, but at 390px the remaining string still broke
  as "…PHOTON" / "TELESCOPE" — an orphaned single word. Joined
  `PHOTON&nbsp;TELESCOPE` so the break lands after "2.4 M" instead,
  producing a balanced two-line subtitle.
- **Boot skip affordance.** `#boot` already had a click-to-skip handler
  with no visual hint; added `cursor:pointer` and updated the hint copy to
  "ANY KEY OR CLICK SKIPS SELF-TEST."
- **Contrast regression caught before shipping, again:** the new map hint
  ("CLICK FIELD TO POINT DISH") was drafted in `--ink-faint` (2.4:1,
  measured — same trap pass 1 flagged for the ticker). Moved to
  `--ink-dim` (6.2:1).

Verified: `node tools/snap.mjs /04-deepfield/ ...` and the guide page both
clean at both viewports before and after every change; alarm sequence
re-confirmed by temporarily shortening the alarm timer end-to-end (not just
forcing the CSS class) — reticle slews to the anomaly, klaxon flashes,
PCA flag flips to RATE HIGH, log fills, ACK clears it, all still correct
under the new `--ease-snap` transitions; reduced-motion path re-screenshot
(dither off, panels static, still fully composed).

## Pass 3 — 2026-07-12

Focus: craft & finish — accessibility, performance hygiene, copy, guide
quality, and a final zero-error gate. Re-screenshotted clean at both
viewports first, then read every source file end-to-end looking for gaps
the first two passes' motion/art focus wouldn't have caught. Found real
ones.

- **MASTER ALARM was invisible to screen readers.** The klaxon banner had
  `role="status"` with its text hardcoded in HTML — visibility was toggled
  by a CSS `transform`, and the text content never changed, so no DOM
  mutation ever fired for assistive tech to announce. A sighted operator
  gets a flashing amber banner; a screen-reader operator got nothing, for
  the site's single biggest event. Fixed by moving the banner text into
  `startAlert()` (now built from live state — target designation, rate
  spike), switching to `role="alert"`, and toggling `aria-hidden` in step
  with `.on` so the element enters/leaves the accessibility tree on a real
  mutation. Verified end-to-end by letting the alarm scheduler fire
  naturally (not forcing the class): `aria-hidden` lifts and the correct
  banner text lands the instant `.alert` is added, and resets to hidden
  when the station auto-ACKs — no console errors at any point.
- **Command responses were silent for assistive tech.** `#cmdout` runs a
  character-by-character typewriter with no live region — wiring
  `aria-live` straight to it would announce every partial string as it
  typed (worse than nothing). Added a visually-hidden `#cmdout-sr`
  (`.sr-only`, `aria-live="polite"`) that receives each finished response
  line — and only the finished scan-progress line, not every frame of the
  bar — once the typewriter settles it, so a keyboard/screen-reader
  operator gets the same answer a sighted one reads, without the noise.
  Echoed input lines are skipped (the operator already knows what they
  typed). Verified via scripted input: `HELP` correctly surfaces its final
  reference line through the live region.
- **Bug: panel content could overlap its neighbor below ~800px viewport
  height.** The TELEMETRY and SUBSYSTEMS panels had no overflow
  containment on their row lists — fine at the two screenshot-harness
  sizes (900px / 844px tall), but `node`-scripted checks at shorter
  heights (1280×650, a real 13"-laptop-with-chrome scenario the harness
  never tests) showed `scrollHeight` exceeding `clientHeight` by 60–80px
  with no clipping, so rows visually spilled past the panel border into
  whatever sat below — measured and confirmed via `getBoundingClientRect`,
  not just eyeballed. Wrapped each panel's row list in a `.panel-body`
  (`flex:1; min-height:0; overflow-y:auto`) so a too-tall panel scrolls
  internally instead of bleeding into its neighbor; styled the scrollbar
  thin and phosphor-tinted so it reads as instrument chrome, not a browser
  default. Invisible at both target viewports (confirmed no scrollbar
  appears, layout pixel-identical to before); at 1280×650 it now clips
  cleanly with zero overlap, verified both numerically and by screenshot.
- **Decorative/redundant elements weren't marked for assistive tech.** The
  survey-map canvas and the SNR ASCII gauge duplicate data already spoken
  by adjacent text (`RA`/`DEC`/`TGT` readout, the numeric `SNR` value) but
  had no `aria-hidden`, inconsistent with the sparkline next to them which
  already had it. Added `aria-hidden="true"` to both for parity.
- **Copy: "CLICK FIELD" read wrong under a thumb.** The map hint now checks
  `matchMedia('(pointer: coarse)')` and swaps to "TAP FIELD TO POINT DISH"
  on touch-primary devices, "CLICK" everywhere else — small, but a console
  this literal about NASA-transcript precision shouldn't say "click" to
  someone tapping glass.
- **Guide page:** rewrote the "Iteration Passes" section to cover this
  pass's fixes in the site's own voice; confirmed word count still lands
  in the 300–600 target (588 words).
- Added `theme-color` meta to both pages (`#050805`) so mobile browser
  chrome doesn't flash white against a phosphor console mid-load.
- Re-audited contrast on every `--ink-dim`/`--ink-faint` pairing already in
  use (6.17:1 and up against `--bg` in both palettes) — no regressions
  introduced this pass; grepped for stray default `ease` keywords — none
  found, pass 2's fix held.

Verified: `node tools/snap.mjs` clean (index + guide, both viewports)
before and after every change. Full MASTER ALARM lifecycle re-tested by
letting the real scheduler fire (not forcing `.alert`) — klaxon
`aria-hidden`/text/role correct at trigger and at auto-ACK clear, zero
console errors throughout. Reduced-motion path re-verified via
`page.emulateMedia({reducedMotion:'reduce'})` — clean, fully composed,
zero errors. The panel-overflow fix was verified three ways: DOM
measurement (`scrollHeight` vs `clientHeight`) at 1280×650 showing zero
overflow post-fix, a full-page screenshot at that size showing clean
containment with no overlap, and pixel-identical re-screenshots at the two
canonical viewports showing no visible regression from the change.
