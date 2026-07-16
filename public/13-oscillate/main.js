// main.js — OSCILLATE UI: knobs, keyboard, arpeggiator, visualizers, boot sequence.
import { SynthEngine } from './audio.js';

const engine = new SynthEngine();
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reduceQuery.matches;
reduceQuery.addEventListener?.('change', (e) => { reduced = e.matches; });

/* ---------------------------------------------------------------------- */
/* Note table — 1.5 octaves, C4 to F#5 (19 keys). First 13 (C4..C5) map   */
/* to QWERTY row A W S E D F T G Y H U J K; the rest are click/touch only. */
/* ---------------------------------------------------------------------- */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KEY_LETTERS = ['A', 'W', 'S', 'E', 'D', 'F', 'T', 'G', 'Y', 'H', 'U', 'J', 'K'];
const A4 = 440;

function freqOf(semitoneFromC4) {
  // C4 is 9 semitones below A4.
  return A4 * Math.pow(2, (semitoneFromC4 - 9) / 12);
}

const NOTES = [];
for (let s = 0; s <= 18; s++) {
  const name = NOTE_NAMES[s % 12];
  const octave = 4 + Math.floor(s / 12);
  NOTES.push({
    semitone: s,
    name: `${name}${octave}`,
    isBlack: name.includes('#'),
    letter: s < KEY_LETTERS.length ? KEY_LETTERS[s] : null,
    freq: freqOf(s),
    el: null,
  });
}
const letterToSemitone = new Map();
NOTES.forEach(n => { if (n.letter) letterToSemitone.set(n.letter, n.semitone); });

/* ---------------------------------------------------------------------- */
/* Knob component — drag vertically (mouse/touch/pointer), arrow keys,    */
/* wheel. Value space is normalized t in [0,1]; `map` converts to the     */
/* real parameter, `format` renders the readout text.                    */
/* ---------------------------------------------------------------------- */
let knobSeq = 0;

function buildKnobEl(id, label) {
  const wrap = document.createElement('div');
  wrap.className = 'knob';
  wrap.id = id;
  wrap.tabIndex = 0;
  wrap.setAttribute('role', 'slider');
  wrap.setAttribute('aria-label', label);
  wrap.setAttribute('aria-valuemin', '0');
  wrap.setAttribute('aria-valuemax', '1');
  wrap.innerHTML = `
    <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#FF3CAC"/>
          <stop offset=".55" stop-color="#784BA0"/>
          <stop offset="1" stop-color="#2B86C5"/>
        </linearGradient>
        <radialGradient id="${id}-cap" cx=".35" cy=".28" r=".85">
          <stop offset="0" stop-color="#443a66"/>
          <stop offset=".6" stop-color="#241c3c"/>
          <stop offset="1" stop-color="#120d20"/>
        </radialGradient>
      </defs>
      <path class="knob-arc-bg" d="M17.62 54.38 A26 26 0 1 1 54.38 54.38" fill="none" stroke="rgba(237,231,246,.12)" stroke-width="3.5" stroke-linecap="round"/>
      <path class="knob-arc-fill" d="M17.62 54.38 A26 26 0 1 1 54.38 54.38" fill="none" stroke="url(#${id}-grad)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="122.52" stroke-dashoffset="122.52"/>
      <circle class="knob-cap" cx="36" cy="36" r="17.5" fill="url(#${id}-cap)" stroke="rgba(0,240,181,.28)" stroke-width="1"/>
      <line class="knob-indicator" x1="36" y1="20" x2="36" y2="9" stroke="#00F0B5" stroke-width="2.5" stroke-linecap="round" transform="rotate(-135 36 36)"/>
    </svg>
    <p class="knob-label">${label}</p>
    <p class="knob-value">&#8211;</p>
  `;
  return wrap;
}

class Knob {
  constructor(container, { id, label, t0 = 0.5, map, format, onChange }) {
    this.id = id || `knob-${knobSeq++}`;
    this.el = buildKnobEl(this.id, label);
    container.appendChild(this.el);
    this.map = map || (t => t);
    this.format = format || (v => `${v}`);
    this.onChange = onChange || (() => {});
    this.indicator = this.el.querySelector('.knob-indicator');
    this.fill = this.el.querySelector('.knob-arc-fill');
    this.valueEl = this.el.querySelector('.knob-value');
    this.t = t0;
    this._bind();
    this._render(false);
  }

  set(t, emit = true) {
    this.t = Math.min(1, Math.max(0, t));
    this._render(emit);
  }

  _render(emit) {
    const angle = -135 + this.t * 270;
    this.indicator.setAttribute('transform', `rotate(${angle.toFixed(2)} 36 36)`);
    const ARC = 122.52;
    this.fill.setAttribute('stroke-dashoffset', String(ARC * (1 - this.t)));
    const value = this.map(this.t);
    this.valueEl.textContent = this.format(value);
    this.el.setAttribute('aria-valuenow', this.t.toFixed(3));
    this.el.setAttribute('aria-valuetext', this.format(value));
    if (emit) this.onChange(value);
  }

  _bind() {
    let dragging = false;
    let startY = 0;
    let startT = 0;

    const move = (clientY) => {
      const dt = (startY - clientY) / 130;
      this.set(startT + dt);
    };

    this.el.addEventListener('pointerdown', (e) => {
      dragging = true;
      startY = e.clientY;
      startT = this.t;
      this.el.setPointerCapture(e.pointerId);
      this.el.classList.add('is-dragging');
      e.preventDefault();
    });
    this.el.addEventListener('pointermove', (e) => { if (dragging) move(e.clientY); });
    const release = () => { dragging = false; this.el.classList.remove('is-dragging'); };
    this.el.addEventListener('pointerup', release);
    this.el.addEventListener('pointercancel', release);
    this.el.addEventListener('lostpointercapture', release);

    this.el.addEventListener('keydown', (e) => {
      const step = 0.02;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { this.set(this.t + step); e.preventDefault(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { this.set(this.t - step); e.preventDefault(); }
      else if (e.key === 'Home') { this.set(0); e.preventDefault(); }
      else if (e.key === 'End') { this.set(1); e.preventDefault(); }
    });

    this.el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.set(this.t + (e.deltaY < 0 ? 0.02 : -0.02));
    }, { passive: false });
  }
}

/* ---------------------------------------------------------------------- */
/* Voice knobs                                                            */
/* ---------------------------------------------------------------------- */
const voiceRack = document.getElementById('voiceKnobs');
const hzFmt = v => v >= 1000 ? `${(v / 1000).toFixed(2)}kHz` : `${Math.round(v)}Hz`;

const cutoffKnob = new Knob(voiceRack, {
  id: 'knob-cutoff', label: 'CUTOFF', t0: 0.7,
  map: t => 70 * Math.pow(9200 / 70, t),
  format: hzFmt,
  onChange: v => engine.setParam('cutoff', v),
});
const resonanceKnob = new Knob(voiceRack, {
  id: 'knob-resonance', label: 'RESONANCE', t0: 0.22,
  map: t => 0.3 + t * 17.7,
  format: v => v.toFixed(1),
  onChange: v => engine.setParam('resonance', v),
});
const detuneKnob = new Knob(voiceRack, {
  id: 'knob-detune', label: 'DETUNE', t0: 0.2,
  map: t => Math.round(t * 46),
  format: v => `${v}¢`,
  onChange: v => engine.setParam('detune', v),
});
const delayKnob = new Knob(voiceRack, {
  id: 'knob-delay', label: 'DELAY', t0: 0.35,
  map: t => t * 0.85,
  format: v => `${Math.round(v * 100)}%`,
  onChange: v => engine.setParam('delayMix', v),
});

/* ---------------------------------------------------------------------- */
/* Arp rate knob                                                          */
/* ---------------------------------------------------------------------- */
const arpRack = document.getElementById('arpKnobs');
const rateKnob = new Knob(arpRack, {
  id: 'knob-rate', label: 'RATE', t0: 0.5,
  map: t => Math.round(340 - t * 270),
  format: v => `${v}ms`,
  onChange: v => arp.setRate(v),
});

/* ---------------------------------------------------------------------- */
/* Waveform segmented switch                                              */
/* ---------------------------------------------------------------------- */
const waveSwitch = document.getElementById('waveSwitch');
const waveButtons = Array.from(waveSwitch.querySelectorAll('.seg-btn'));
const waveHighlight = waveSwitch.querySelector('.seg-highlight');

function placeHighlight(btn) {
  waveHighlight.style.width = `${btn.offsetWidth}px`;
  waveHighlight.style.transform = `translateX(${btn.offsetLeft}px)`;
}
function selectWave(btn) {
  waveButtons.forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-checked', b === btn ? 'true' : 'false'); });
  placeHighlight(btn);
  engine.setWaveform(btn.dataset.wave);
}
waveButtons.forEach(btn => btn.addEventListener('click', () => selectWave(btn)));
window.addEventListener('resize', () => placeHighlight(waveSwitch.querySelector('.seg-btn.is-active')));
requestAnimationFrame(() => placeHighlight(waveSwitch.querySelector('.seg-btn.is-active')));

/* ---------------------------------------------------------------------- */
/* Keyboard                                                                */
/* ---------------------------------------------------------------------- */
const keyboardEl = document.getElementById('keyboard');
const WHITE_W = 52; // matched in CSS via --key-w
let whiteIndex = 0;
NOTES.forEach(note => {
  const key = document.createElement('button');
  key.type = 'button';
  key.className = note.isBlack ? 'key key-black' : 'key key-white';
  key.dataset.semitone = String(note.semitone);
  key.setAttribute('aria-label', note.letter ? `${note.name}, key ${note.letter}` : note.name);
  key.tabIndex = -1;
  if (!note.isBlack) {
    key.style.setProperty('--wi', String(whiteIndex));
    whiteIndex++;
  } else {
    // black key sits between semitone-1 (white) and semitone+1
    const prevWhiteCount = NOTES.slice(0, note.semitone).filter(n => !n.isBlack).length;
    key.style.setProperty('--wi', String(prevWhiteCount));
  }
  const label = document.createElement('span');
  label.className = 'key-note';
  label.textContent = note.name;
  key.appendChild(label);
  if (note.letter) {
    const letter = document.createElement('span');
    letter.className = 'key-letter';
    letter.textContent = note.letter;
    key.appendChild(letter);
  }
  keyboardEl.appendChild(key);
  note.el = key;
});
keyboardEl.style.setProperty('--white-count', String(whiteIndex));

const manualHeld = new Set();

function pressNote(semitone, source) {
  const note = NOTES[semitone];
  if (!note || !powered) return;
  engine.noteOn(source === 'arp' ? 'arp' : `k${semitone}`, note.freq);
  note.el.classList.add('is-active');
  if (source === 'arp') note.el.classList.add('is-arp');
}
function releaseNote(semitone, source) {
  const note = NOTES[semitone];
  if (!note) return;
  engine.noteOff(source === 'arp' ? 'arp' : `k${semitone}`);
  note.el.classList.remove('is-active');
  if (source === 'arp') note.el.classList.remove('is-arp');
}

keyboardEl.addEventListener('pointerdown', (e) => {
  const key = e.target.closest('.key');
  if (!key || !powered) return;
  const s = Number(key.dataset.semitone);
  manualHeld.add(e.pointerId);
  key.setPointerCapture(e.pointerId);
  pressNote(s, 'key');
  key.addEventListener('pointerup', () => { releaseNote(s, 'key'); }, { once: true });
  key.addEventListener('pointercancel', () => { releaseNote(s, 'key'); }, { once: true });
  key.addEventListener('lostpointercapture', () => { releaseNote(s, 'key'); }, { once: true });
});

const heldLetters = new Set();
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const letter = e.key.toUpperCase();
  if (!letterToSemitone.has(letter) || heldLetters.has(letter)) return;
  heldLetters.add(letter);
  pressNote(letterToSemitone.get(letter), 'key');
});
window.addEventListener('keyup', (e) => {
  const letter = e.key.toUpperCase();
  if (!letterToSemitone.has(letter)) return;
  heldLetters.delete(letter);
  releaseNote(letterToSemitone.get(letter), 'key');
});
window.addEventListener('blur', () => {
  heldLetters.forEach(l => releaseNote(letterToSemitone.get(l), 'key'));
  heldLetters.clear();
});

/* ---------------------------------------------------------------------- */
/* Arpeggiator — preset pattern, demos the instrument on its own.         */
/* ---------------------------------------------------------------------- */
function buildPattern() {
  const chords = [
    { root: 0, shape: [0, 4, 7, 11, 7, 4] },   // Cmaj7
    { root: 7, shape: [0, 4, 7, 10, 7, 4] },   // G7
    { root: 9, shape: [0, 3, 7, 10, 7, 3] },   // Am7
    { root: 5, shape: [0, 4, 7, 11, 7, 4] },   // Fmaj7
  ];
  const steps = [];
  chords.forEach(c => c.shape.forEach(s => steps.push(Math.min(18, c.root + s))));
  return steps;
}
const ARP_PATTERN = buildPattern();

class Arpeggiator {
  constructor(pattern) {
    this.pattern = pattern;
    this.step = 0;
    this.rate = 210;
    this.playing = false;
    this.timer = null;
    this.current = null;
  }
  setRate(ms) { this.rate = ms; }
  start() {
    if (this.playing || !powered) return;
    this.playing = true;
    this._tick();
  }
  stop() {
    this.playing = false;
    clearTimeout(this.timer);
    if (this.current != null) { releaseNote(this.current, 'arp'); this.current = null; }
  }
  _tick() {
    if (!this.playing) return;
    if (this.current != null) releaseNote(this.current, 'arp');
    const semitone = this.pattern[this.step % this.pattern.length];
    pressNote(semitone, 'arp');
    this.current = semitone;
    this.step++;
    this.timer = setTimeout(() => this._tick(), this.rate);
  }
}
const arp = new Arpeggiator(ARP_PATTERN);

const arpToggle = document.getElementById('arpToggle');
function setArpUI(on) {
  arpToggle.classList.toggle('is-on', on);
  arpToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
}
arpToggle.addEventListener('click', () => {
  if (!powered) return;
  if (arp.playing) { arp.stop(); setArpUI(false); }
  else { arp.start(); setArpUI(true); }
});

/* ---------------------------------------------------------------------- */
/* Power switch + LED boot sequence                                       */
/* ---------------------------------------------------------------------- */
const powerSwitch = document.getElementById('powerSwitch');
const powerLed = document.getElementById('powerLed');
const faceplate = document.getElementById('faceplate');
const leds = Array.from(document.querySelectorAll('.led'));
let powered = false;
let bootTimer = null;

function bootLeds() {
  leds.forEach(l => l.classList.remove('is-on'));
  leds.forEach((l, i) => {
    const t = setTimeout(() => l.classList.add('is-on'), reduced ? 0 : 110 * (i + 1));
    bootTimers.push(t);
  });
}
let bootTimers = [];
function clearBoot() {
  bootTimers.forEach(clearTimeout);
  bootTimers = [];
  leds.forEach(l => l.classList.remove('is-on'));
}

powerSwitch.addEventListener('click', async () => {
  powered = !powered;
  powerSwitch.setAttribute('aria-pressed', powered ? 'true' : 'false');
  faceplate.classList.toggle('is-powered', powered);
  powerLed.classList.toggle('is-lit', powered);

  if (powered) {
    engine.resume(); // must fire synchronously within this gesture handler
    bootLeds();
    clearTimeout(bootTimer);
    bootTimer = setTimeout(() => {
      if (powered && !reduced) { arp.start(); setArpUI(true); }
    }, 760);
  } else {
    clearTimeout(bootTimer);
    clearBoot();
    arp.stop();
    setArpUI(false);
    Array.from(manualHeld);
    NOTES.forEach(n => n.el.classList.remove('is-active', 'is-arp'));
    engine.allNotesOff();
    engine.suspend();
  }
});

/* ---------------------------------------------------------------------- */
/* Visualizers — hero oscilloscope + spectrum bar field. Real analyser    */
/* data when powered; a gentle synthetic idle signal otherwise, so the    */
/* faceplate always reads as alive.                                      */
/* ---------------------------------------------------------------------- */
const scopeCanvas = document.getElementById('scopeCanvas');
const scopeCtx = scopeCanvas.getContext('2d');
const specCanvas = document.getElementById('spectrumCanvas');
const specCtx = specCanvas.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 2);

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * DPR));
  canvas.height = Math.max(1, Math.round(rect.height * DPR));
}
function fitAll() { fitCanvas(scopeCanvas); fitCanvas(specCanvas); }
fitAll();
let resizeT = null;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(fitAll, 120); });

let timeData = new Uint8Array(512);
let freqData = new Uint8Array(512);

function drawScope(t) {
  const w = scopeCanvas.width, h = scopeCanvas.height;
  const ctx = scopeCtx;
  ctx.clearRect(0, 0, w, h);
  const mid = h / 2;

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#FF3CAC');
  grad.addColorStop(0.5, '#B25FD3');
  grad.addColorStop(1, '#2B86C5');

  ctx.lineWidth = Math.max(2, h * 0.012);
  ctx.strokeStyle = grad;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0,240,181,0.55)';
  ctx.shadowBlur = reduced ? 6 : 16;
  ctx.globalAlpha = engine.running ? 0.95 : 0.55;

  ctx.beginPath();
  const N = 200;
  if (engine.running) {
    engine.analyser.getByteTimeDomainData(timeData);
    const len = timeData.length;
    for (let i = 0; i < N; i++) {
      const idx = Math.floor((i / N) * len);
      const v = (timeData[idx] - 128) / 128;
      const x = (i / (N - 1)) * w;
      const y = mid + v * (h * 0.38);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
  } else {
    const speed = reduced ? 0.15 : 0.55;
    const breathe = reduced ? 0.08 : (0.16 + 0.09 * Math.sin(t * 0.0006));
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * w;
      const phase = (i / N) * Math.PI * 4 + t * 0.001 * speed;
      const y = mid + Math.sin(phase) * h * breathe;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawSpectrum(t) {
  const w = specCanvas.width, h = specCanvas.height;
  const ctx = specCtx;
  ctx.clearRect(0, 0, w, h);
  const bars = 56;
  const gap = w * 0.006;
  const barW = (w - gap * (bars - 1)) / bars;

  let values = new Array(bars).fill(0);
  if (engine.running) {
    engine.analyser.getByteFrequencyData(freqData);
    const usable = Math.floor(freqData.length * 0.65);
    for (let i = 0; i < bars; i++) {
      const lo = Math.floor(Math.pow(i / bars, 1.5) * usable);
      const hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / bars, 1.5) * usable));
      let sum = 0, n = 0;
      for (let j = lo; j < hi; j++) { sum += freqData[j]; n++; }
      values[i] = n ? sum / n / 255 : 0;
    }
  } else {
    for (let i = 0; i < bars; i++) {
      const speed = reduced ? 0.0002 : 0.0009;
      const a = Math.sin(t * speed + i * 0.37);
      const b = Math.sin(t * speed * 0.4 + i * 1.1);
      values[i] = reduced ? 0.06 + 0.03 * a : Math.max(0, 0.10 + 0.10 * a + 0.05 * b);
    }
  }

  for (let i = 0; i < bars; i++) {
    const v = values[i];
    const barH = Math.max(h * 0.02, v * h * 0.92);
    const x = i * (barW + gap);
    const y = h - barH;
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, '#2B86C5');
    grad.addColorStop(0.55, '#784BA0');
    grad.addColorStop(1, '#00F0B5');
    ctx.fillStyle = grad;
    ctx.globalAlpha = engine.running ? 0.92 : 0.5;
    ctx.fillRect(x, y, barW, barH);
  }
  ctx.globalAlpha = 1;
}

let rafId = null;
function loop(t) {
  drawScope(t);
  drawSpectrum(t);
  rafId = requestAnimationFrame(loop);
}
function startLoop() { if (rafId == null) rafId = requestAnimationFrame(loop); }
function stopLoop() { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLoop(); else startLoop();
});
startLoop();
