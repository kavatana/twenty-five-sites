# RELIC — passes

## Build — 2026-07-12

**Concept.** RELIC is a museum wing for six everyday sounds the world quietly
deleted: the rotary phone dial, the typewriter carriage bell, the dial-up
modem handshake, the CRT degauss thunk, the film projector flutter, and the
telegraph sounder. Each is reconstructed live from raw Web Audio synthesis —
no samples, no `<audio>` tags — while a museum placard gives it an accession
number, service dates, and a curatorial line with a bit of dry wit. The
gallery itself is a horizontal, scroll-snapped sequence of spotlit rooms: an
entrance hall, six exhibit plinths, and an exit through the gift shop.

**Implemented.**
- `relic-audio.js` — a self-contained synthesis engine: shared `AudioContext`
  + `AnalyserNode`, a reusable noise buffer, and `burst()` / `tone()` /
  `amOsc()` helpers wrapping `BiquadFilterNode` + `GainNode` envelopes and
  `exponentialRampToValueAtTime` decays. Six generator functions, one per
  exhibit, each returning `{duration, events}` so the DOM layer can drive
  visuals off the exact same timeline the audio uses:
  - **Rotary dial** — release thunk + 9 bandpass clicks with a geometrically
    widening gap (deceleration), settle thud.
  - **Typewriter** — 12 layered noise-transient keystrokes, a swept-bandpass
    "zip" for the carriage return, a triangle-wave bell.
  - **Modem handshake** — DTMF dial digits, rising carrier, AM-modulated
    ANSam warble, four sawtooth frequency sweeps paired with noise bursts,
    a staccato data burst, settle hush — abridged to ~6 seconds, with a
    `Dialing → Ringing → Handshaking → Negotiating → Synchronizing →
    Connected` status schedule.
  - **CRT degauss** — sine + noise thunk, then a frequency-and-LFO-decaying
    sawtooth (hand-rolled AM) for the classic descending buzz, settling into
    a 60Hz/120Hz hum.
  - **Film projector** — filtered sawtooth motor bed under ~30 flutter
    clicks that run steady then decelerate to a stop.
  - **Telegraph sounder** — deliberately *not* a tone: paired down-clack /
    up-clack noise bursts, dot = short gap, dash = long gap, spelling SOS
    exactly as a real sounder would render it.
- `index.html` / `relic.css` — exhibition-dark palette (`#121110` /
  `#E5DFD3` bone / `#B08D57` brass / `#6E2B25` oxblood), Prata + Assistant.
  Horizontal `scroll-snap-type: x` gallery with a wheel-to-horizontal
  converter on desktop and a vertical-stack fallback under 860px. Fixed
  floor-plan strip nav with a brass dot that measures the active room
  button's live position and slides to it. Six hand-drawn inline SVG line
  illustrations (dial, typewriter, acoustic-coupler modem, CRT, projector,
  telegraph key) sitting on CSS-clip-path plinths under blurred, clipped
  radial-gradient spotlight cones that bloom on `IntersectionObserver`
  activation. Placards carry accession numbers, service dates, curatorial
  copy, a brass LISTEN button, and a live `AnalyserNode` waveform canvas.
- `relic.js` — `IntersectionObserver` room activation, exhibit playback
  wiring (one exhibit at a time; a second LISTEN click stops whichever is
  playing), per-exhibit visual reaction functions synced off the same
  `events` timeline the audio scheduled (dial rotates and decelerates via a
  single eased transition; typewriter keys bounce per keystroke and the
  carriage zips; modem LEDs chase and the status readout updates; the CRT
  screen flashes then wobbles via a keyframe transform; the projector reels
  spin and are frozen mid-turn by reading their live computed transform
  matrix rather than snapping to zero; the telegraph key and sounder clapper
  tap on the same down/up schedule as the clacks). Gift-shop postcards get a
  pointer-driven 3D tilt. `prefers-reduced-motion` swaps every continuous
  loop and eased transform for an instant, static equivalent while keeping
  the reconstructions themselves fully functional.
- Footer, guide page, favicon, meta/OG tags per spec.

**Verification.** Ran the snap harness at both viewports, read every
screenshot, and iterated on spacing, contrast, and console cleanliness
before calling it done (see below for what each pass actually changed).
