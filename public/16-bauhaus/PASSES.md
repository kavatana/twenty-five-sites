# BAUHAUS SPIELPLATZ — passes

## Build — 2026-07-18

**Concept.** Site 16 of 25: BAUHAUS SPIELPLATZ, a Bauhaus playground where
composition is interactive — the 1923 Weimar poster, come alive. Palette:
canvas #F2E8DC, red #D93829, blue #2350A8, yellow #F2B705, black #141414.
Jost, weights 100–900, does every job (display, body, labels) — the Futura
homage the brief asks for. Copy is German-titled, English-bodied,
era-accented ("Ornament ist Verbrechen," a nod to Adolf Loos, anchors the
manifesto band).

**Implemented in this pass.**

- **Hero / Spielplatz** — 13 hand-built shapes (2 circles, 1 ring, 3
  triangles, 3 rectangles/bars, 2 arcs, 2 rules) laid out in a curated
  Kandinsky-esque composition, positioned as fractions of the stage so the
  layout scales cleanly from 1440px to 390px. Each shape is draggable via
  Pointer Events with a hand-rolled physics loop: velocity, frame-rate-
  normalized friction, and an elastic boundary bounce (restitution
  coefficient) off all four stage edges. A short pointer-history buffer
  gives a released drag real fling velocity. Continuous ambient motion (a
  slow per-shape rotation drift plus a tiny sinusoidal position bob, each
  desynced by a random phase) keeps the stage visibly alive even when no
  one is touching it, so a screen recording never looks static.
- **Flat offset shadows** — every shape shadow is one CSS declaration,
  `filter: drop-shadow(9px 9px 0 #141414)`, silhouetting whatever alpha
  shape (circle, ring, triangle clip-path, or stroked SVG arc) sits inside
  it — the classic hard-edged Bauhaus poster shadow, no duplicate DOM
  needed.
- **RESET KOMPOSITION / ZUFALL** — a shared tween system (`{from, to,
  start, duration}` per shape) drives both: Reset returns every shape to
  its curated home position through a shuffled stagger order and a
  hand-written `easeOutBack` cubic (springy overshoot-then-settle); Zufall
  regenerates a new "balanced" scatter by shuffling a 5×4 grid of stage
  cells, jittering within each cell, and tweening there with the same
  spring stagger. Neither ever produces heavy overlap.
- **Manifesto band** — a full-bleed red diagonal (`clip-path: polygon(...)`)
  carrying huge rotated (-3.2deg) canvas-colored type, with an actual
  120-word manifesto paragraph beneath it in body copy.
- **Form folgt Funktion** — three toggle cards (Kreis/Quadrat/Dreieck), each
  proving its own function on click via pure CSS keyframes: the wheel
  rolls and rotates along a baseline, the window pane swings open on a 3D
  `rotateY`, the arrow slides and points. JS only flips `aria-pressed`.
- **Die Plakate** — a ~60-line generative poster engine: three SVG posters
  built from small data pools (fictional 1923 Weimar venues, months,
  ticket numbers) plus 3–4 freshly placed shapes from the same five-type
  vocabulary, regenerated on click with a quick pop-in transition.
- **Footer** — a diagonal outline/fill wordmark ("SPIELPLATZ") on black,
  plus the standard site index bar.
- Keyboard access: every shape is `tabindex="0"` with a descriptive
  `aria-label`; arrow keys nudge it, Enter/Space gives it a random flick.
  Focus-visible outlines throughout. `prefers-reduced-motion` mutes ambient
  bob/spin, shortens tweens, and disables the toggle-card/poster loop
  animations without removing any interaction.
- Ran a numeric WCAG contrast audit (see guide) across all five palette
  pairings before writing button/text CSS — informs every foreground/
  background choice on the site (e.g. white/canvas type on red or blue,
  never black; yellow only as a fill, never as text on canvas).

**Bugs found & fixed during visual verification.**

- The wheel/window/arrow demo icons in Form Folgt Funktion rendered as
  tiny illegible slivers: their wrapper `<span>`s had explicit
  `width`/`height` in CSS, but inline elements silently ignore sizing
  unless `display` is changed. Fixed by setting `display:inline-block` on
  `.demo-wheel`, `.demo-window`, and `.demo-arrow`.
- Verified `RESET KOMPOSITION`, `ZUFALL`, drag, and keyboard-nudge paths
  directly via automated pointer/keyboard interaction — zero console
  errors across all of them.
- Confirmed reveal-on-scroll sections (`IntersectionObserver`) render
  correctly once scrolled into view; a full-page screenshot without
  scrolling shows them pre-reveal (opacity 0), which is expected behaviour,
  not a bug.

## Pass 1 — 2026-07-12

Fresh-eyes pass focused on art direction: composition, spacing rhythm,
typographic tuning, color balance, and anything reading as empty, cheap,
or template-like. Full-page scroll captures at 1440×900 and 390×844
(the standard viewport-only snap only shows the first screen, which was
hiding real problems below the fold) surfaced four concrete issues, all
fixed:

- **Sparse, gappy hero composition.** The 13-shape Kandinsky stage was
  `min(74vh,760px)` tall — far taller than the 13 curated shapes could
  fill, so scrolling past the hero revealed large dead patches of bare
  canvas (worst in the upper-middle and lower-right thirds), reading as
  "unfinished" rather than "asymmetric." Shrank the stage to
  `min(58vh,600px)` desktop / `min(52vh,460px)` mobile and nudged two
  shapes (`rect1` up into the upper-middle gap, `t3` down into the
  lower-right gap) so the same composition now reads dense and confident
  at every scroll position — confirmed by re-shooting both the initial
  and t+3s states.
- **Manifesto read as a generic centered pull-quote.** Centered body text
  under a centered `h2` is the single most template-looking pattern on
  the web and undercuts a Bauhaus manifesto's point of view. Rebuilt
  `.manifest-body` as an asymmetric two-column grid — a stacked "DAS /
  MANIFEST" heading with a small red "01 / Grundsatz" index number on the
  left, the manifesto paragraph left-aligned behind a 3px black rule on
  the right (collapsing to a stacked, border-top layout under 720px).
  Reads as an editorial spread now, not a hero-pattern quote block.
- **Form Folgt Funktion icons drowning in empty card space.** The
  wheel/window/arrow icons occupied roughly a third of their 104px demo
  stage, leaving a flat, textureless void around each one. Enlarged all
  three icons ~20–25%, grew the stage to 136px, and added a subtle
  Bauhaus dot-grid background (`radial-gradient` dots at 14px pitch,
  inverting to canvas-on-black when a card is active) so the icon area
  now carries its own texture instead of reading as unstyled whitespace.
- **Poster generator was inconsistent and prone to clustering.** Some
  generated posters had only 3 shapes against others' 4, and the known
  overlap risk from the build pass was real — the middle poster
  regularly looked sparser than its neighbors. Raised the floor to 4–5
  shapes, added a fifth shape type (`rule`, a rounded diagonal bar) for
  vocabulary variety, and added a lightweight minimum-distance retry
  (up to 7 attempts) so freshly placed shapes avoid landing on top of
  each other. All three posters now read as equally rich compositions
  across repeated regenerations.
- **Mobile navigation vanished entirely.** `.topnav{display:none}` under
  720px meant phone visitors had no way to jump to a section — just a
  logo and a badge. Replaced with a visible, horizontally-scrollable nav
  row wrapped onto its own line under the header, so Spiel/Manifest/
  Form/Plakate stay reachable on mobile.

Re-verified with `node tools/snap.mjs /16-bauhaus/ shots/16-p1v2 3500` —
clean, zero console/page/request errors — plus full-page scroll captures
at both viewports to confirm every section, not just the first screen.
