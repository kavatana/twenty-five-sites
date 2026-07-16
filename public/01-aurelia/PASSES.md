# AURELIA — passes

## Build — 2026-07-08

Concept: a maison de haute parfumerie that sells hours of light instead of scents.
The whole site is built around one signature surface — a full-viewport silk of
liquid iridescence — with pearl/champagne/ink typography floating above it.

Implemented in this pass:

- **Hero silk (three.js 0.160.0 via importmap, only external lib).** Single
  `PlaneGeometry(1,1,230,156)` facing the camera. Vertex shader: 3 octaves of
  hand-inlined Ashima simplex noise + a long directional sine drape; normals by
  finite differences (height field sampled 3× per vertex); the cursor is a
  Gaussian dip in the same height field so lighting follows the touch. Fragment
  shader: physical thin-film interference — `2·n·d·cosθ` through a cosine per
  RGB wavelength (650/545/450 nm), thickness keyed to fold height, remapped
  onto a rose–teal duotone, Fresnel-weighted, champagne key light, dither.
  DPR capped at 2; paused on `document.hidden` + IntersectionObserver; phantom
  "breeze" pointer when idle so recordings never show a static frame.
- **Compositions**: three cards (Aube / Méridien / Minuit), each backed by a
  300×380 Canvas 2D gradient loop — radial blobs on lissajous paths, additive
  blending for Minuit. JS tilt + CSS sheen sweep on hover.
- **Accords**: pure-CSS note pyramid — translucent radial-gradient orbs,
  `mix-blend-mode: screen`, offset breathing animations; hovering a tier row
  highlights its register.
- **Maison manifesto**, magnetic nav (shared rAF lerp), lagged parallax,
  IO-staggered reveals, film grain via feTurbulence data-URI.
- Craft: inline SVG favicon, meta/og, skip link, focus-visible styles,
  `prefers-reduced-motion` renders one still frame of everything, mobile
  simplification (120×84 silk grid, higher fold frequency for narrow frames).
- Guide page at `guide/` in the same aesthetic; real copy throughout, voice:
  hushed, French-inflected.

## Pass 1 — 2026-07-12

Art-direction pass. Verified with `tools/snap.mjs` plus manual scroll-position
captures (the mandated snap only shoots the first viewport, and the
compositions/accords/maison sections only reveal on IntersectionObserver, so
I drove Playwright through the full scroll range by hand to actually see
them — they were fine; the earlier full-page CDP screenshot had simply
skipped the reveal triggers, which briefly looked like missing content but
wasn't).

What I found and fixed:

- **The hero silk read as a muddy, blurred brown/purple smear**, not
  "liquid light" — the single biggest problem, since it's the signature
  technique. Root causes: too many small-scale noise octaves at high
  frequency (a turbulent "camo" pattern instead of a drape), and a base
  colour formula (`mix(uInk*0.68, uInk*2.35, lum)`) that only ever produced
  dim ink tones, never real pearl. Rewrote `heightAt()` to weight one long
  low-frequency sine drape + two broad noise octaves over the previous
  three tight ones, lowered `uFreq` (1.55→1.1 desktop, 2.7→1.5 mobile) and
  raised `uAmp` slightly, so folds read as a few large, legible waves
  instead of noise. Rewrote the fragment colour ramp so raised folds
  genuinely reach toward `mix(uPearl, uGold, .22)` while troughs pool into
  ink, widened the Fresnel-driven iridescence band (exponent 2.2→1.6, base
  weight up), and added a soft darkened pool centred under the wordmark so
  text stays legible regardless of what the surface is doing beneath it
  (also added protective `text-shadow` to the eyebrow/tagline/wordmark).
  First attempt overshot into blown-out white highlights; dialed the
  key-light/spec intensity back down to keep the shimmer coloured instead
  of clipping to white.
- **Nav bar on scroll blended into a flavourless mid-grey** (`rgba(ink,.72)`
  averaged against the pearl sections behind it lands near neutral grey,
  neither brand colour). Raised to `rgba(16,14,22,.92)` so it reads as
  unambiguous ink chrome over every section instead of a washed-out
  compromise.
- **Accord "note pyramid" orbs looked like glossy 3D marbles**, not the
  brief's "translucent layered circles" — the off-centre highlight
  (`circle at 36% 32%`) rendered them as lit spheres. Re-centred the
  gradients, softened the falloff, and added a 1.5px blur + hairline
  border so they read as soft diffusing light instead of rendered balls.
- **Contrast**: `--gold-deep`, used for every section eyebrow and the card
  number/price labels on the pearl background, measured ~4.0:1 — under the
  4.5:1 bar for that text size. Darkened it to `#7c5f37` (~5.4:1) without
  touching the lighter `--gold` used on dark sections.

Net effect: the hero now looks like dawn light moving through silk instead
of a stained puddle, chrome and the note-pyramid feel intentional rather
than default, and label text clears AA contrast. Re-verified with
`node tools/snap.mjs /01-aurelia/ shots/01-p1v2 3500` — zero console errors
(only benign `GPU stall due to ReadPixels` driver-perf warnings tied to the
screenshot tool itself) on both 1440×900 and 390×844.

Still worth a look in a future pass: the three composition cards are
staggered/uneven height by design (card two sits 3.6rem lower), which reads
as intentional editorial rhythm but deserves a second opinion; and the
accord pyramid's cluster composition could be pushed further toward an
actual ascending tête→cœur→fond arrangement rather than a loose cloud.

## Pass 2 — 2026-07-12

Motion & interaction pass. Verified with `tools/snap.mjs` plus hand-driven
Playwright scroll/hover/click captures at both viewports (see below);
zero console errors throughout, only the same benign driver `GPU stall due
to ReadPixels` perf warnings from the screenshot tool itself.

What I found and fixed:

- **No signature "wow" beat.** The brief asked for one jaw-dropping moment
  if the site didn't already have it — it didn't. Added a **click/tap
  ripple on the hero silk**: pointerdown reads the world-space position
  (same projection used by the existing cursor dimple) and drops it into a
  4-slot ripple buffer (`uRipple0..3`, packed as `vec3(x, y, startTime)`,
  cycled round-robin so up to four ripples can be in flight). A new
  `rippleH()` in the vertex shader turns each into an expanding, decaying
  Gaussian wavefront (`exp(-(dist-age·speed)²·12) · exp(-age·1.15) ·
  sin(dist·13 - age·6.5)`) added into the height field, so the existing
  thin-film fragment shader automatically colours the ring in shifting
  iridescence (film thickness is already a function of height). A matching
  DOM ring (`.click-ripple`, expanding border + gold glow, `scale(0→20)`
  over 1.15s) fires in sync so the gesture reads instantly even a frame
  before the GPU catches up. Confirmed via Playwright: mid-animation
  screenshots show a genuine expanding rainbow wavefront moving through the
  silk, exactly the "liquid light you can touch" moment the concept wants.
  Gated behind `!RM` (reduced-motion gets no ripple, silk stays still).
- **No cursor treatment at all** on a site literally built around "a
  fingertip pressed into silk." Added a two-part custom cursor (small solid
  dot snapped instantly to the pointer + a lerped trailing ring) that
  dilates and turns gold over links, cards and accord tiers
  (`.cursor-ring.big`) and compresses on press. Scoped to
  `matchMedia('(pointer:fine)')` and `!RM` only (touch/reduced-motion keep
  the system cursor untouched), and the system arrow is kept visible until
  the first real `pointermove` so the cursor never appears to vanish on
  load.
- **Mobile hero eyebrow orphaned "1947" onto its own line** — confirmed in
  the mobile screenshot (`MAISON DE HAUTE PARFUMERIE · GRASSE · DEPUIS` /
  `1947`, a lone four-digit widow). Wrapped `Grasse · depuis 1947` in a
  `white-space:nowrap` span so the line now breaks at a natural phrase
  boundary instead of mid-date.
- **Entrance choreography was flat outside the composition cards** — every
  other `.reveal` block used one identical translateY+fade regardless of
  section, and the accord tier rows and the two-line manifesto weren't
  individually staggered at all (they just appeared as part of their
  parent's single fade). Added `.reveal` + staggered `--d` delays to each
  `<li class="tier">` and split the manifesto's two lines into their own
  staggered `<p class="reveal">`s, so both now step in individually as they
  cross the viewport instead of arriving as one inert block. This surfaced
  a real CSS bug while implementing it: `.reveal.in`'s `transition`
  shorthand (specificity 0-2-0) was silently overriding `.tier`'s own hover
  transition (`border-color`/`background`, 0-1-0) the moment a tier
  finished revealing, since shorthand properties don't merge across
  selectors — only the highest-specificity declaration wins outright. Fixed
  with an explicit `.tier.reveal.in` rule restating all four transitioned
  properties.
- **Micro-interactions had no press/active state** — nav links, the scroll
  cue, footer links and the composition cards had hover but nothing for
  the moment of the click itself. Added `:active` colour/opacity snaps for
  the links (transform-free, so they don't fight the magnetic-hover inline
  transform already applied to the same elements) and a real pointerdown/up
  press state threaded through the card-tilt loop (`s.press`, lerped, a few
  percent `scale()` folded into the same transform string the tilt already
  writes, avoiding a CSS/JS transform conflict).
- Bonus: the reduced-motion static silk frame (`renderStill()`) was frozen
  at an arbitrary `t=21.7` that happened to produce one stark, hard-edged
  dark wedge cutting into the bottom-left corner — a poorly composed single
  frame for anyone with `prefers-reduced-motion`. Re-timestamped to `t=3.4`,
  which reads as a calmer, better-balanced fold arrangement with more of
  the rose/teal shimmer visible.

Verified: `node tools/snap.mjs /01-aurelia/ shots/01-p2v3 3500` clean at
1440×900 and 390×844; hand-driven Playwright captures of the click-ripple
sequence (t+0/250/750ms), cursor default/hover-big states, the accords
mid-stagger-reveal, tier hover, and a `reducedMotion:'reduce'` emulation
pass (confirms no cursor/ripple elements are created and the page stays
static) — all clean, zero console errors.

Still worth a look next pass: the card sheen sweep is a fixed hover
transition rather than tracking pointer position the way the tilt does: a
sheen that follows the cursor would be a nicer match for the "liquid light"
language. The click-ripple currently only listens on the hero; extending a
lighter version to the accord orb cluster (a tap on a tier "drops" a stone
into that orb's colour) could tie the signature interaction to a second
section.

## Pass 3 — 2026-07-12

Craft & finish pass. Verified with `tools/snap.mjs` (1440×900 + 390×844,
plus a delayed frame) and a set of hand-written Playwright scripts driving
scroll position, hover, click, keyboard-tab focus, and a
`reducedMotion:'reduce'` emulation — the mandated snap only shoots the
hero, and the compositions/accords/maison sections and their hover states
only exist after scrolling and pointer interaction, so I scripted those
paths directly rather than judging from static markup. Zero console errors
throughout; only the same benign `GPU stall due to ReadPixels` driver-perf
warning the screenshot tool itself has produced every pass.

The two "worth a look" items pass 2 left behind turned out to be genuinely
worth doing, plus a real bug the reveal-choreography work surfaced under
test:

- **Card sheen now tracks the actual cursor** instead of sweeping on a
  fixed 1.15s timeline. The existing tilt `pointermove` handler already
  computes normalized cursor position per card each frame; it now also
  writes that position into `--mx`/`--my` custom properties consumed by a
  `radial-gradient(...at var(--mx) var(--my))` on `.card-sheen`, blended
  with `mix-blend-mode: soft-light` on the pearl cards and `screen` on
  Minuit's dark card so the light genuinely looks like it's grazing each
  card's own surface rather than sitting on top of it. Confirmed by
  screenshotting the gradient mid-hover at two different cursor positions
  on both a light and the dark card — the highlight visibly follows.
- **The signature "stone in liquid light" gesture now extends to the
  accords section.** Clicking a tier row sends its register's three orbs
  an outward `box-shadow` ring pulse (`orbPulse`, 1.15s) — the same
  expanding-ring language as the hero's WebGL ripple, translated into a
  cheap CSS echo for a section that isn't running a shader. Ties the
  site's one "touchable" idea to a second place instead of leaving it
  hero-only. Gated behind `!RM`, same as the hero ripple.
- **Found and fixed a real hover-mismatch bug while testing the tier
  interaction.** Scripting a hover during the accords entrance transition
  showed the *wrong* tier's orbs lighting up — hovering "Cœur" mid-reveal
  highlighted "Fond" instead. Root cause: `<li class="tier reveal">` rows
  were nested inside a parent `<div class="accords-text reveal">` that
  *also* had its own 30px entrance slide, so a stationary cursor sat over
  a target whose position was compounding two independent transforms at
  once (parent sliding the whole block while each child slid again inside
  it) — the row actually under the cursor when both settled wasn't the
  row that was there when the hover fired. Fixed by giving the eyebrow/
  h2/lede their own `.accords-head.reveal` wrapper and leaving
  `.accords-text` as a plain, non-animated layout container, so each
  `.tier` now moves through exactly one transform instead of two stacked
  ones. (Also trimmed the tier's own pre-reveal offset from the generic
  30px to 12px while in there, belt-and-suspenders.) Re-tested the same
  scripted mid-transition hover afterward: it now either resolves to the
  correct tier or, in the tightest edge case, to no highlight at all —
  never to a *wrong* one.
- **`lang="fr"` on the genuine French sentences** — the hero eyebrow, hero
  tagline, the "Trois compositions…" hero note, and the three card
  pull-quotes — so screen readers switch pronunciation for the sentences
  actually written in French instead of reading them with English
  phonetics. Left the single-word bilingual section labels ("Les
  Compositions", "L'Architecture", "Cœur") unmarked, since those function
  as brand/UI labels rather than passages of running French text.
- Audited focus-visible contrast (gold outline, 1px, offset 5px) against
  every background it can currently land on: nav links and the brand mark
  sit on the fixed nav, which is either the dark hero or its own
  `rgba(16,14,22,.92)` scrolled chrome (8.27:1); the skip link and footer
  links carry their own ink backgrounds regardless of scroll position. No
  focusable element currently rests on the pearl sections, so the
  gold-on-pearl combination (2.01:1, under the 3:1 non-text minimum) never
  actually renders — confirmed rather than assumed, and left alone rather
  than "fixed" for a case that doesn't exist, to avoid churning a rule
  that's already correct everywhere it's used.

Re-verified after all changes: `node tools/snap.mjs /01-aurelia/ shots/01-p3v3 3500`
and the scroll/hover/click/focus/reduced-motion Playwright scripts, all
clean at 1440×900 and 390×844 — zero console errors or failed requests
beyond the one benign driver warning. Guide page re-read end to end (416
words, within the 300–600 brief) and still accurate to the shader and
interaction code after this pass's changes.

Considered and deliberately left alone: the hero silk's soft-focus,
painterly read (versus a crisper "liquid light" surface) — it's been
through two prior passes of deliberate tuning toward exactly this
ethereal, out-of-focus-silk quality, it's consistent with the "dawn/mist"
brief mood, and the click-ripple already proves the shader can produce
sharp, legible structure when the moment calls for it. Re-litigating the
base look without a concrete complaint felt like churn rather than
craft.
