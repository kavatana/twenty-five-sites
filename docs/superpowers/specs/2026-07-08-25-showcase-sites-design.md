# 25 Showcase Websites — Design Spec

**Date:** 2026-07-08 · **Status:** approved-by-directive (user pre-authorized all creative decisions, full autonomy)

## Goal

25 fundamentally distinct, world-class showcase websites demonstrating extreme capability in web design: 3D, animation, color, typography, interaction. Deployed as one Netlify site (one link), hub at `/`, global `/guide`, each site at `/NN-slug/` with its own `/NN-slug/guide/`. Every site gets ≥3 documented iteration passes. Built for video capture: rich ambient motion, not just entrance animations.

## Constraints & decisions

- **All visuals are code.** No stock images, no AI-generated images (no keys available; also cleaner licensing for mass-audience video). GLSL/Three.js/canvas/SVG/CSS only. This is the flex.
- **Static, no build step.** Each site is a self-contained directory: `public/NN-slug/index.html` (+ optional local js/css files) and `public/NN-slug/guide/index.html`. Allowed CDNs: Google Fonts, three.js (pinned `three@0.160.0` via unpkg importmap), nothing else.
- **Quality bar (rubric for every pass):**
  1. Typography: characterful pairing, tuned scale/leading/tracking; never default-looking.
  2. Color: cohesive, intentional, accessible contrast for text.
  3. Motion: 60fps, eased, choreographed; continuous ambient motion for video; `prefers-reduced-motion` respected.
  4. Depth: layered backgrounds, texture, micro-interactions, hover states, custom cursor where fitting.
  5. Craft: favicon (inline SVG data URI), `<title>`, meta description + og tags, no console errors, composed at 1440×900 AND 390×844.
  6. Each pass must *add* something (complexify/refine), and log it in the site's `PASSES.md`.
- **Pipeline:** scaffold → Workflow fan-out: per site [build → pass 1 → pass 2 → pass 3/final-verify], pipelined (no barriers) → hub + global guide (same rigor) → local QA sweep → Netlify deploy → live QA.
- **Tooling:** local static server on :4173; `tools/snap.mjs` (playwright lib) captures desktop/mobile screenshots + console errors; agents Read the PNGs for real visual critique.
- **Git:** repo initialized; checkpoint commits between phases.

## The 25 concepts

| NN | slug | concept |
|----|------|---------|
| 01 | aurelia | Ethereal luxury perfume house — Three.js iridescent silk shader hero |
| 02 | grotesk | Brutalist type foundry — massive kinetic variable-font specimen playground |
| 03 | strata | Generative art gallery — flow-field canvas pieces, unique per visit |
| 04 | deepfield | Retro-terminal deep-space mission control — CRT, phosphor, typewriter |
| 05 | ma | Japanese minimalism — negative space, vertical text, sumi-e ink SVG |
| 06 | descent | Scroll-driven cinematic journey to the ocean floor |
| 07 | chromatic | Y2K liquid-chrome revival — metallic blobs, holographic gradients |
| 08 | meridian | Swiss editorial magazine — strict grid, International Typographic Style |
| 09 | corpus | WebGL particle universe — 40k particles morphing between forms |
| 10 | verdant | Botanical atelier — SVG vines grow and bloom on scroll |
| 11 | kowloon | Neon cyberpunk night market — isometric city, rain, flickering signs |
| 12 | fold | Paper-craft pop-up storybook — layered shadows, origami motion |
| 13 | oscillate | Playable WebAudio synthesizer — synthwave, live visualizer |
| 14 | noir | Monochrome luxury fashion — stark B&W, huge serif, hover reveals |
| 15 | almanac | Data-observatory — animated astronomical data-viz as art |
| 16 | bauhaus | Bauhaus playground — primary geometry with drag physics |
| 17 | reverie | Dreamcore surrealism — floating doors, impossible geometry, pastel fog |
| 18 | verse | Kinetic poetry — words with physics: fall, scatter, magnetize |
| 19 | hearth | Explorable isometric village — CSS/Three 3D, day–night cycle |
| 20 | gatsby | Art-deco grand hotel — gold line-work ornaments drawing themselves |
| 21 | vapor | Glassmorphic weather planet — frosted panels over live canvas weather |
| 22 | riot | Anti-design punk zine — tasteful maximalist chaos, cursor trails |
| 23 | stillness | GLSL gradient meditation — breathing choreography, palette drift |
| 24 | relic | Museum of lost sounds — spotlit exhibit rooms, WebAudio reconstructions |
| 25 | machina | Infinite-zoom fractal voyage — "powers of ten" narrative |

Full per-site briefs (palette, fonts, signature technique, interactions) live in the workflow script; each was authored to avoid overlap across: rendering tech, palette family, type direction, interaction model, mood.

## Deploy

`public/` published to Netlify via CLI (`npx netlify-cli`). Auth: browser OAuth at deploy time (only non-autonomous moment; unavoidable — no stored token). Hub `/` links all 25; `/guide` documents method so others can reproduce.
