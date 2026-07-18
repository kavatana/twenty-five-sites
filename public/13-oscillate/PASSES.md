# OSCILLATE — OSC-13 · passes

## Build — 2026-07-12

**Concept.** A playable polyphonic web synthesizer styled as a 1984 polysynth faceplate against a Miami-dusk sunset grid. The instrument is real: two detuned `OscillatorNode`s per voice → resonant `BiquadFilterNode` lowpass → dark-regeneration `DelayNode` loop → `DynamicsCompressorNode`, all monitored by a single `AnalyserNode` that drives both the hero oscilloscope and the bottom spectrum field.

**Implemented this pass:**
- Full audio graph with per-voice envelopes (`linearRampToValueAtTime` + `setTargetAtTime`), detune spread knob applied live to sounding voices, feedback-loop lowpass for BBD character.
- 1.5-octave keyboard (C4–F5) built in JS; pointer play with glissando via `pointerover` + released implicit capture; computer-key map A W S E D F T G Y H U J K (C4–C5); Enter/Space blip for accessibility.
- Five SVG knobs (cutoff log-scaled, resonance, detune, delay mix, arp rate) — vertical drag with pointer capture, shift for fine, double-click reset, full `role="slider"` keyboard support, value arc via `stroke-dasharray`.
- Glowing segmented waveform switch (saw/square/tri) that retypes live oscillators.
- Lookahead arpeggiator (25 ms timer, 120 ms horizon against `AudioContext.currentTime`) playing a Cm7 up-down pattern; pre-armed so flipping POWER demos the unit; implicit power-on from playing a key deliberately disarms it.
- Power switch resumes the AudioContext inside the gesture, plays a synthesized thunk, boots six LEDs sequentially; LEDs then become an RMS VU meter.
- Canvas sunset: slatted sun composited once per resize with `destination-out`, perspective grid (verticals to vanishing point, horizontals scrolling on a z^2.6 curve), twinkling stars, mint horizon line.
- Oscilloscope with rising zero-cross trigger so the trace is stable; idle "standby carrier" wave keeps the page alive before power-on; ambient spectrum ripple when off.
- Faceplate: brushed texture (SVG turbulence + hairline gradients), four rotated screws, silkscreen labels, spec-sheet copy, footer, guide page in the same aesthetic.
- Craft: DPR capped at 2, rAF loop paused on `document.hidden`, `prefers-reduced-motion` freezes ambient motion to a composed still (instrument stays playable), focus-visible styles, inline SVG favicon, meta/og.

**Why.** The site must demo itself in a screen recording without interaction: scrolling grid + idle scope + ambient spectrum provide continuous motion; the arp provides the sound story once powered.

## Pass 1 — 2026-07-12
Art-direction pass on the faceplate composition.

- **Module rhythm.** The five control blocks had ragged density: WAVE had dead air under the switch, SPREAD and DELAY were lone knobs adrift in wide boxes, and only two modules carried sub-captions. Every module now has a silkscreened index (01–05, mint when powered), a label framed by hairline rules, and a bottom spec caption ("LP · 24 dB/OCT", "A +¢ · B −¢", "340 MS · REGEN 42%") pinned with margin-auto so all baselines align. Groups get proportional flex widths instead of space-between drift; the waveform switch is vertically centered and slightly enlarged.
- **The void below the panel.** At 1440×900 there was ~150px of empty grid between panel and footer. Added an etched signal-path strip — "OSC A ⌁ OSC B → LP-24 → ANALOG-TYPE DELAY → LINE OUT" — with softly pulsing mint arrows (staggered delays), which reads as spec-sheet copy and gives the dead zone a purpose.
- **Spectrum bezel.** Was a bare black box. Added scope-style graticule lines in the canvas draw and a silkscreened frequency scale (20 Hz → 14 kHz) under the bezel.
- **Hints & contrast.** The panel-foot instruction line was one undifferentiated run-on; now discrete hint segments with mint interpuncts that wrap cleanly on mobile. Bumped `.silk-dim` from .44 to .60 alpha and `.silk-sub` from .34 to .46 for legibility.

Verified at both viewports via snap harness; zero console errors, reduced-motion covered by the global animation override.

## Pass 2 — 2026-07-12

Focus: motion & interaction.

- **Entrance choreography**: the page now assembles itself — brand wordmark, tag, spec list (per-line stagger), panel rise-and-settle, the five modules in silkscreen order 01→05, then keybed, spectrum, hints, signal path, footer. All on a custom `cubic-bezier(.16,1,.3,1)` ease-out with `both` fill; reduced-motion collapses every entrance to final state.
- **Boot choreography (the WOW beat)**: pressing POWER now runs a full self-test — LEDs cascade, each control module flashes a mint illumination in sequence (`.boot-flash`), a key-light chase sweeps the entire keybed left to right, and the spectrum analyser draws a one-shot mint calibration sweep before the arpeggiator demo enters (delayed to 1050 ms so the choreography lands first). Verified live via scripted power-on screenshots (shots/13-p2v2-boot-mid.png, shots/13-p2v2-powered.png).
- **Fixed a real rendering bug**: `.k-body{fill:url(#knobBody)}` referenced a gradient that never existed — knob bodies rendered flat black. Added a shared `<radialGradient id="knobBody">` defs block; knobs now read as machined caps with an off-axis highlight.
- **Micro-interactions**: knobs get a `.dragging` state (arc at full glow, value readout scales 1.22× in mint, body ring highlights, page-wide ns-resize cursor); waveform buttons compress on press and settle at 1.06× when active on the snap ease; module frames brighten on hover; the unpowered power cap breathes a slow mint invitation so first-time visitors know where to start.
- **Ambient life for capture**: a subtle specular sheen sweeps the brushed faceplate every 12 s, and meteors streak the dusk sky every 6–13 s (canvas, dt-integrated, killed above the horizon, skipped under reduced motion) on top of the existing star twinkle / grid scroll / idle scope.
- **Mobile fix**: black keys narrowed (0.6→0.52 of a white-key unit) and shortened (58%→54%) per the pass-1 flag.

Still open for pass 3: the guide page copy hasn't been updated to mention the boot choreography / entrance system, and the powered-state desktop shot suggests the live scope trace could modulate its amplitude with output level for extra drama.

## Pass 3 — 2026-07-18

Focus: craft & finish — accessibility, the flagged scope enhancement, copy, and a real interaction pass with a live browser (not just static screenshots).

- **Contrast audit, fixed for real.** Measured every silkscreen tone against its actual background with the WCAG formula instead of eyeballing it. Five combinations failed 4.5:1: the spectrum frequency scale (2.45:1), the signal-path caption (3.53:1), module sub-captions like "OSC A + B" (4.03:1), the guide page's service-manual stamp (3.97:1), and the printed note names on white keys (1.99:1). Raised `.spec-scale`, `.sigpath` and `.silk-sub` to ~.5–.56 alpha and the guide `.stamp` to .58 — all now clear 4.5:1+ on their real panel backgrounds. The white-key `.k-note` and `.k-tag` engravings went from .34/.62 to .5/.72 — the computer-key letter (the one thing you actually need to read to play) now clears 4.5:1; the note name stays a shade more discreet by design but is meaningfully easier to read than before.
- **The flagged scope enhancement, built.** Pass 2 ended by noting the live oscilloscope could modulate with output level for more drama. It now does: a smoothed RMS (`S.levelSmooth`, one-pole toward the analyser's per-frame RMS) drives the trace's vertical swell (up to +150%), its stroke weight, and a `shadowBlur` glow that blooms mint when a note is loud and settles to a thin line at rest — so the scope visibly *performs* what's being played rather than just tracing it, which matters most in exactly the screen-recording moments the brief cares about. Clamped the excursion so a loud sawtooth can't overshoot into the panel below.
- **Real ARIA pass.** Knobs now declare `aria-orientation="vertical"` (the drag axis is vertical; screen-reader users shouldn't have to guess), and the arpeggiator toggle's label was sharpened from the generic "Arpeggiator" to "Arpeggiator run/stop" so its `aria-pressed` state reads as a meaningful sentence.
- **Copy.** Rewrote the guide's "Passes" section, which had gone stale — it described pass 1 twice and never mentioned pass 2's choreography or this pass's service work. It now accurately summarizes all three passes in the manual's own voice.
- **Verification, properly this time.** Loaded the live site in an actual browser (not just the static snap harness): clicked POWER, played notes by dispatching a real keydown, watched the arpeggiator run its pattern with the new scope drama — zero console errors, zero page errors, at both the moment of power-on and mid-arpeggio. Re-ran the snap harness at both viewports after every change; confirmed the contrast fixes render as intended and the scope swell reads as an effect, not a bug, at 1440×900 and 390×844.

Net effect: the instrument sounds and looks the same at rest, reads measurably better under an accessibility check, and rewards the one interaction the whole site is built around — playing it — with a visualizer that finally reacts to how hard you're playing.
