# VERDANT — passes

## Build — 2026-07-12

**Concept.** Botanical atelier & seed archive. Greenhouse-morning palette (cream / moss / deep pine / terracotta / chartreuse), EB Garamond + Karla. The signature move: SVG vines that *grow along the page as you scroll* — long bézier paths revealed via `stroke-dasharray`/`stroke-dashoffset`, with leaves procedurally placed by `getPointAtLength()` that sprout (ease-out-back scale from their nodes) as the growing tip passes them, and 8-petal blooms that unfurl with staggered rotate+scale at declared path fractions.

**Implemented this pass:**
- Hero with a generated *Digitalis purpurea* botanical plate: ~40 stroke paths (stem, bells with throat spots, veined basal leaves, buds, roots) drawn in via the `pathLength="1"` dash trick with per-path delays; terracotta/moss washes fade in after the ink.
- Vine engine: four vines (two horizontal dividers, two section flanks), monotonic scroll-driven growth lerped in a single rAF master loop; leaves/petals animated by transform-attribute updates (no CSS transform-origin ambiguity in nested SVG).
- Seed catalog: four vintage packet cards (double border, stamp, latin binomials, germ. rates) that flip on hover/focus, tap-to-flip on touch (`hover: none`), Enter/Space toggle for keyboard.
- Growth calendar: fully generated radial season wheel — polar arc helper, season bands with `<textPath>` labels (reversed arcs below the equator so text stays upright), month ticks/labels, sow/harvest/rest inner bands, and a hand that starts at today's day-of-year angle and sweeps 360° / 140 s.
- Herbarium: three hand-built specimens (yarrow with feathered leaves + corymb, field poppy with crêpe petals + nodding bud, spleenwort fern with procedurally tapered pinnae) on paper cards with tape corners and italic annotations; dash-drawn on IntersectionObserver.
- Ambient canvas: pollen motes on sine drift + occasional falling leaf; DPR capped at 2; paused on `document.hidden`; removed under `prefers-reduced-motion` (vines render fully grown, hand static at today).
- Craft: inline SVG favicon, meta/og, grain overlay via feTurbulence data URI, focus-visible dashes, reduced-motion fallbacks, footer + styled guide page.

**Why.** The brief's reason to exist is the growing-vine system; everything else (plate, wheel, presses) reuses the same "drawn by hand, revealed by time" language so the page feels like one instrument.

## Pass 1 — 2026-07-12 · Art direction

**What the screenshots showed.** The bones were good but the page read "good codepen": the packet stamps clipped their own text into garbled glyphs, packet fronts had a dead void between note and footer, the cream→pine calendar edge was a hard cheap line, the vines were sparse (a handful of small leaves), the closing section was limp, and the yarrow specimen looked like a stick with barbs.

**Changed:**
- **Seed packets rebuilt as objects.** The broken CSS-span stamp is now a generated SVG rubber stamp — text on a circular `<textPath>` ("TESTED 2026 · GLASSHOUSE №3"), dashed outer ring, leaf mark in the center, `mix-blend-mode: multiply` so it sits *on* the paper. Added a vintage oval keyline vignette behind each botanical mark (radial chartreuse tint), an inner dashed tick-frame on both faces, and a sprig divider that fills the former void between note and footer.
- **Organic section transitions.** The pine calendar block now meets the cream with a repeating SVG scalloped garden-bed edge (`::before`/`::after`, data-URI wave, `scaleY(-1)` at the bottom) instead of a hard line.
- **Richer signature vines.** Leaf step density ~35% higher, larger leaves, ~1-in-5 nodes now sprout a curling tendril, ~1-in-5 leaves flush chartreuse, and each vine carries three blooms instead of one or two. The closing vine got real wave amplitude.
- **Hero editorializing.** Greenhouse-arch hairline rising behind the plate, and a small tracked meta row (Est. MMXXI · 214 varieties…) under the CTAs; h1 scale/tracking tuned, `text-wrap: balance` on display type.
- **Yarrow redrawn.** Curved, doubled barbs with secondary spurs (actually reads *millefolium*), six leaves, and a 12-head flat-topped corymb on curved pedicels.
- **Closing as colophon.** Terracotta small-caps meta line under the closing couplet; sprig ornaments introduced above every centered section eyebrow for a consistent editorial device.

**Why.** Every fix pushes the same idea — a printed seed-house ephemera kit — into the places where the page previously defaulted to generic card/section layout. Verified at 1440×900 and 390×844; snap clean, no console errors.

## Pass 2 — 2026-07-18 · Motion & interaction

**What the screenshots and code review showed.** The bones and choreography were strong, but a cross-examination against the pass focus turned up a real bug and several missed opportunities: (1) the JS already tagged every sprouted leaf with a `.swayg` class and per-node `--swd`/`--swdel` custom properties clearly meant to drive a continuous breeze animation, but no CSS rule ever consumed them — every leaf on a fully-grown vine was completely dead/static, which undercuts the signature technique's "living plant" premise and the brief's explicit call for continuous ambient motion. (2) `#ambient` (the pollen-mote/falling-leaf canvas) sat at `z-index:55`, above the header (`z-index:20`), so drifting motes visibly crossed over the nav wordmark and links on both viewports — most noticeable on the cramped mobile header. (3) No cursor treatment existed anywhere despite the brief calling for one "where fitting." (4) Several transitions (`.btn` background/color/box-shadow, `.site-nav a` color, `.specimen` box-shadow, `.site-foot a` border-color, both hero-plate/specimen wash fades) fell back to the CSS-default `ease` instead of the site's own custom cubic-béziers. (5) The vine growth itself, while nicely lerped, had no visible "leading edge" — it read as a generic stroke-reveal rather than something actively growing right now.

**Changed:**
- **Fixed the breeze-sway bug.** Added the missing `@keyframes leafSway` + `.swayg{animation:leafSway var(--swd) var(--ease-soft) infinite; animation-delay:var(--swdel)}` rule, pivoting at each leaf's true attachment point (`transform-origin:0 0`, matching its local path origin). Every one of the ~100 sprouted leaves/tendrils now sways independently and continuously once grown — verified live via computed-style inspection (`animationName:"leafSway"`, `animationPlayState:"running"`).
- **Growing tip.** Each vine now carries a small blurred+pulsing chartreuse bud (`.tip-glow` + `.tip-core`, the latter with a `budPulse` scale keyframe) that tracks `path.getPointAtLength(grown)` every frame while the vine is actively drawing, and fades out via CSS transition the instant a vine settles. This turns the core signature move from "a line reveals itself" into "something is growing right now" — the pass's requested jaw-dropping beat. Removed entirely (no DOM node) under `prefers-reduced-motion`.
- **Fixed the header/ambient z-index bug.** Dropped `#ambient` from `z-index:55` to `15`, below the header's `20`, so pollen motes and falling leaves no longer drift across the nav — the concrete mobile-screenshot defect (a mote sitting on top of "CALENDAR"), also present on desktop.
- **Custom cursor.** A small moss loupe-ring (`#cursor-dot`) trails the pointer at a 22%-per-frame lerp (patient, not snappy — on-brand for "grown slowly"), widening and warming to terracotta over packets/buttons/links/wordmark/specimens. `mix-blend-mode:multiply` keeps it feeling like ink rather than UI chrome. Fully disabled via `@media (hover:none),(pointer:coarse)` and under reduced motion, and never replaces the OS pointer.
- **Removed default easing.** Every transition audited; bare `ease` and un-declared timing functions now use `var(--ease-soft)`, consistent with the rest of the system. Added a quick `.btn:active` press-state (scale down, faster duration) that was previously missing.
- **Idle header motion.** The wordmark's leaf mark now holds a very subtle perpetual rotate breathe, so there is visible motion even before any scroll or mouse input — relevant for a cold-open screen recording.
- **Guide page updated** to document the growing-tip, the continuous sway fix, and the cursor, keeping the "what's under the hood" claims accurate; trimmed elsewhere to stay inside the 300–600 word budget (595 words).

**Verified:** `node tools/snap.mjs /10-verdant/ ...` clean (no console/page/request errors) at both viewports; a scripted mid-scroll capture confirms the tip bud is visible and travelling while a vine is growing and fades once settled; a `reducedMotion:'reduce'` Playwright run confirms the ambient canvas is removed, `#cursor-dot` is `display:none`, all vine paths report `strokeDashoffset:0`, and no `.vine-tip` nodes exist — the static fallback stays composed. No console errors introduced.
