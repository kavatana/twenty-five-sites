/* OSCILLATE — OSC-13. All sound synthesized, all pixels drawn. */
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const dpr = () => Math.min(2, window.devicePixelRatio || 1);

/* ================= state ================= */
const S = {
  powered: false,
  ctx: null, analyser: null, filter: null, wetGain: null, comp: null,
  wave: 'sawtooth',
  cutoff: 9000, reso: 1.2, detune: 12, delayMix: 0.28, arpRate: 6.5,
  voices: new Map(),
  timeData: null, freqData: null, level: 0, levelSmooth: 0,
};

/* ================= audio graph ================= */
function initAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  S.ctx = ctx;

  S.filter = ctx.createBiquadFilter();
  S.filter.type = 'lowpass';
  S.filter.frequency.value = S.cutoff;
  S.filter.Q.value = S.reso;

  const dry = ctx.createGain(); dry.gain.value = 1;
  const delay = ctx.createDelay(1); delay.delayTime.value = 0.34;
  const fb = ctx.createGain(); fb.gain.value = 0.42;
  const fbTone = ctx.createBiquadFilter();
  fbTone.type = 'lowpass'; fbTone.frequency.value = 2400;
  S.wetGain = ctx.createGain(); S.wetGain.gain.value = S.delayMix;

  S.comp = ctx.createDynamicsCompressor();
  S.comp.threshold.value = -14; S.comp.knee.value = 18;
  S.comp.ratio.value = 8; S.comp.attack.value = 0.004; S.comp.release.value = 0.2;

  const master = ctx.createGain(); master.gain.value = 0.9;
  S.analyser = ctx.createAnalyser();
  S.analyser.fftSize = 2048;
  S.analyser.smoothingTimeConstant = 0.82;

  S.filter.connect(dry); dry.connect(S.comp);
  S.filter.connect(delay);
  delay.connect(fbTone); fbTone.connect(fb); fb.connect(delay);
  delay.connect(S.wetGain); S.wetGain.connect(S.comp);
  S.comp.connect(master); master.connect(S.analyser);
  S.analyser.connect(ctx.destination);

  S.timeData = new Uint8Array(S.analyser.fftSize);
  S.freqData = new Uint8Array(S.analyser.frequencyBinCount);
}

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function noteOn(midi, time) {
  if (!S.powered) return;
  if (S.voices.has(midi)) noteOff(midi, time);
  const ctx = S.ctx;
  const t = time ?? ctx.currentTime;
  const f = midiHz(midi);
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
  o1.type = o2.type = S.wave;
  o1.frequency.value = o2.frequency.value = f;
  o1.detune.value = S.detune;
  o2.detune.value = -S.detune;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.17, t + 0.006);
  g.gain.setTargetAtTime(0.095, t + 0.006, 0.14);
  o1.connect(g); o2.connect(g); g.connect(S.filter);
  o1.start(t); o2.start(t);
  S.voices.set(midi, { o1, o2, g });
}

function noteOff(midi, time) {
  const v = S.voices.get(midi);
  if (!v) return;
  const t = time ?? S.ctx.currentTime;
  v.g.gain.setTargetAtTime(0, t, 0.085);
  v.o1.stop(t + 0.7); v.o2.stop(t + 0.7);
  S.voices.delete(midi);
}

function allNotesOff() {
  [...S.voices.keys()].forEach((m) => noteOff(m));
  $$('.key.held, .key.lit').forEach((k) => k.classList.remove('held', 'lit'));
}

/* ================= knobs ================= */
const svgNS = 'http://www.w3.org/2000/svg';
const A0 = -135, A1 = 135;
const pt = (deg, r) => {
  const a = (deg * Math.PI) / 180;
  return [40 + r * Math.sin(a), 40 - r * Math.cos(a)];
};
const arcPath = (r) => {
  const [x0, y0] = pt(A0, r), [x1, y1] = pt(A1, r);
  return `M ${x0} ${y0} A ${r} ${r} 0 1 1 ${x1} ${y1}`;
};
const ARC_LEN = 34 * ((A1 - A0) * Math.PI / 180); // r=34, 270°

class Knob {
  constructor(el, o) {
    this.el = el; this.o = o;
    this.value = o.value;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-label', el.dataset.label);
    el.setAttribute('aria-orientation', 'vertical');
    el.setAttribute('aria-valuemin', o.min);
    el.setAttribute('aria-valuemax', o.max);

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 80 80');
    let inner = '';
    for (let i = 0; i <= 10; i++) {
      const a = A0 + ((A1 - A0) * i) / 10;
      const [x0, y0] = pt(a, 30.5), [x1, y1] = pt(a, i % 5 ? 33 : 35);
      inner += `<line class="tick" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/>`;
    }
    inner += `<path class="k-arc-bg" d="${arcPath(34)}"/>`;
    inner += `<path class="k-arc" d="${arcPath(34)}" stroke-dasharray="0 ${ARC_LEN + 2}"/>`;
    inner += `<g class="k-rot" style="transform-origin:40px 40px">
        <circle class="k-body" cx="40" cy="40" r="24"/>
        <line class="k-ind" x1="40" y1="24" x2="40" y2="34"/>
        <circle class="k-cap" cx="40" cy="40" r="4.5"/>
      </g>`;
    svg.innerHTML = inner;
    el.appendChild(svg);

    const name = document.createElement('span');
    name.className = 'k-name'; name.textContent = el.dataset.label;
    const val = document.createElement('span');
    val.className = 'k-val';
    el.append(name, val);

    this.rot = svg.querySelector('.k-rot');
    this.arc = svg.querySelector('.k-arc');
    this.valEl = val;

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      this.dragY = e.clientY; this.dragF = this.frac();
      el.classList.add('dragging');
      document.body.classList.add('knob-drag');
    });
    el.addEventListener('pointermove', (e) => {
      if (this.dragY == null) return;
      const range = e.shiftKey ? 900 : 150;
      this.setFrac(this.dragF + (this.dragY - e.clientY) / range);
    });
    const end = () => {
      this.dragY = null;
      el.classList.remove('dragging');
      document.body.classList.remove('knob-drag');
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('dblclick', () => { this.set(o.value); });
    el.addEventListener('keydown', (e) => {
      const step = { ArrowUp: .02, ArrowRight: .02, ArrowDown: -.02, ArrowLeft: -.02, PageUp: .1, PageDown: -.1 }[e.key];
      if (step !== undefined) { e.preventDefault(); this.setFrac(this.frac() + step); }
      else if (e.key === 'Home') { e.preventDefault(); this.setFrac(0); }
      else if (e.key === 'End') { e.preventDefault(); this.setFrac(1); }
    });

    this.render();
  }
  frac() {
    const { min, max, log } = this.o;
    return log ? Math.log(this.value / min) / Math.log(max / min)
      : (this.value - min) / (max - min);
  }
  setFrac(f) {
    f = clamp(f, 0, 1);
    const { min, max, log } = this.o;
    this.set(log ? min * Math.pow(max / min, f) : min + (max - min) * f);
  }
  set(v) {
    this.value = clamp(v, this.o.min, this.o.max);
    this.render();
    this.o.onInput?.(this.value);
  }
  render() {
    const f = this.frac();
    this.rot.style.transform = `rotate(${A0 + (A1 - A0) * f}deg)`;
    this.arc.setAttribute('stroke-dasharray', `${ARC_LEN * f} ${ARC_LEN + 2}`);
    this.valEl.textContent = this.o.fmt(this.value);
    this.el.setAttribute('aria-valuenow', Math.round(this.value * 100) / 100);
    this.el.setAttribute('aria-valuetext', this.o.fmt(this.value));
  }
}

const fmtHz = (v) => v >= 1000 ? (v / 1000).toFixed(1) + ' kHz' : Math.round(v) + ' Hz';

new Knob($('#k-cutoff'), {
  min: 120, max: 14000, value: 9000, log: true, fmt: fmtHz,
  onInput: (v) => { S.cutoff = v; S.filter?.frequency.setTargetAtTime(v, S.ctx.currentTime, 0.02); },
});
new Knob($('#k-reso'), {
  min: 0.5, max: 16, value: 1.2, fmt: (v) => 'Q ' + v.toFixed(1),
  onInput: (v) => { S.reso = v; S.filter?.Q.setTargetAtTime(v, S.ctx.currentTime, 0.02); },
});
new Knob($('#k-detune'), {
  min: 0, max: 45, value: 12, fmt: (v) => '±' + Math.round(v) + ' ¢',
  onInput: (v) => {
    S.detune = v;
    if (!S.ctx) return;
    const t = S.ctx.currentTime;
    S.voices.forEach(({ o1, o2 }) => {
      o1.detune.setTargetAtTime(v, t, 0.02);
      o2.detune.setTargetAtTime(-v, t, 0.02);
    });
  },
});
new Knob($('#k-delay'), {
  min: 0, max: 1, value: 0.28, fmt: (v) => Math.round(v * 100) + ' %',
  onInput: (v) => { S.delayMix = v; S.wetGain?.gain.setTargetAtTime(v, S.ctx.currentTime, 0.02); },
});
new Knob($('#k-rate'), {
  min: 1.5, max: 13, value: 6.5, fmt: (v) => v.toFixed(1) + ' Hz',
  onInput: (v) => { S.arpRate = v; },
});

/* ================= waveform switch ================= */
$$('.wavebtn').forEach((btn) => {
  btn.addEventListener('click', () => {
    S.wave = btn.dataset.wave;
    $$('.wavebtn').forEach((b) => {
      const on = b === btn;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    });
    S.voices.forEach(({ o1, o2 }) => { o1.type = S.wave; o2.type = S.wave; });
  });
});

/* ================= keyboard ================= */
const KEY_LO = 60, KEY_HI = 77; // C4..F5
const BLACK = new Set([1, 3, 6, 8, 10]);
const LETTERS = { 60: 'A', 61: 'W', 62: 'S', 63: 'E', 64: 'D', 65: 'F', 66: 'T', 67: 'G', 68: 'Y', 69: 'H', 70: 'U', 71: 'J', 72: 'K' };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const kbdEl = $('#keyboard');
const keyEls = new Map();
{
  const whites = [];
  for (let m = KEY_LO; m <= KEY_HI; m++) if (!BLACK.has(m % 12)) whites.push(m);
  const wCount = whites.length;
  let wIdx = 0;
  for (let m = KEY_LO; m <= KEY_HI; m++) {
    const pc = m % 12;
    const noteName = NAMES[pc] + (Math.floor(m / 12) - 1);
    const b = document.createElement('button');
    b.dataset.midi = m;
    b.setAttribute('aria-label', 'Key ' + noteName);
    const tag = LETTERS[m] ? `<span class="k-tag">${LETTERS[m]}</span>` : '';
    if (BLACK.has(pc)) {
      b.className = 'key black';
      b.style.left = `calc(${(wIdx / wCount) * 100}% - (100% / ${wCount} * 0.3))`;
      b.innerHTML = tag;
    } else {
      b.className = 'key white';
      b.innerHTML = `<span class="k-note">${noteName}</span>${tag}`;
      wIdx++;
    }
    kbdEl.appendChild(b);
    keyEls.set(m, b);
  }
}

function press(m) { noteOn(m); keyEls.get(m)?.classList.add('held'); }
function release(m) { noteOff(m); keyEls.get(m)?.classList.remove('held'); }
function flashKey(m, ms) {
  const el = keyEls.get(m);
  if (!el) return;
  el.classList.add('lit');
  setTimeout(() => el.classList.remove('lit'), ms);
}

/* pointer play (with glissando) */
const pointerNotes = new Map();
kbdEl.addEventListener('pointerdown', (e) => {
  const k = e.target.closest('.key');
  if (!k) return;
  e.preventDefault();
  k.releasePointerCapture?.(e.pointerId);
  ensurePowered(false);
  const m = +k.dataset.midi;
  pointerNotes.set(e.pointerId, m);
  press(m);
});
kbdEl.addEventListener('pointerover', (e) => {
  if (!pointerNotes.has(e.pointerId)) return;
  const k = e.target.closest('.key');
  if (!k) return;
  const m = +k.dataset.midi;
  const old = pointerNotes.get(e.pointerId);
  if (old === m) return;
  release(old);
  pointerNotes.set(e.pointerId, m);
  press(m);
});
['pointerup', 'pointercancel'].forEach((ev) =>
  window.addEventListener(ev, (e) => {
    const m = pointerNotes.get(e.pointerId);
    if (m != null) { release(m); pointerNotes.delete(e.pointerId); }
  })
);
/* keyboard-activated (Enter/Space) blip for accessibility */
kbdEl.addEventListener('click', (e) => {
  if (e.detail !== 0) return;
  const k = e.target.closest('.key');
  if (!k) return;
  ensurePowered(false);
  const m = +k.dataset.midi;
  press(m);
  setTimeout(() => release(m), 260);
});

/* computer keys */
const CODEMAP = { KeyA: 60, KeyW: 61, KeyS: 62, KeyE: 63, KeyD: 64, KeyF: 65, KeyT: 66, KeyG: 67, KeyY: 68, KeyH: 69, KeyU: 70, KeyJ: 71, KeyK: 72 };
const heldCodes = new Set();
window.addEventListener('keydown', (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  const m = CODEMAP[e.code];
  if (m == null || heldCodes.has(e.code)) return;
  if (e.target.closest('.knob')) return; // knob has focus — let arrows etc. be
  heldCodes.add(e.code);
  ensurePowered(false);
  press(m);
});
window.addEventListener('keyup', (e) => {
  const m = CODEMAP[e.code];
  if (m == null || !heldCodes.has(e.code)) return;
  heldCodes.delete(e.code);
  release(m);
});
window.addEventListener('blur', () => { heldCodes.clear(); pointerNotes.clear(); if (S.ctx) allNotesOff(); });

/* ================= arpeggiator ================= */
const arp = {
  on: true, // toggle pre-armed: power-on demos the unit
  step: 0, nextTime: 0, timer: null,
  pattern: [60, 63, 67, 70, 72, 75, 72, 70],
};
const arpBtn = $('#arpBtn');
function arpStart() {
  if (arp.timer || !S.ctx) return;
  arp.step = 0;
  arp.nextTime = S.ctx.currentTime + 0.08;
  arp.timer = setInterval(arpTick, 25);
}
function arpStop() {
  if (arp.timer) clearInterval(arp.timer);
  arp.timer = null;
}
function arpTick() {
  const ahead = S.ctx.currentTime + 0.12;
  while (arp.nextTime < ahead) {
    const dur = 1 / S.arpRate;
    const note = arp.pattern[arp.step % arp.pattern.length];
    const t0 = arp.nextTime;
    noteOn(note, t0);
    noteOff(note, t0 + dur * 0.55);
    const wait = Math.max(0, (t0 - S.ctx.currentTime) * 1000);
    setTimeout(() => flashKey(note, dur * 520), wait);
    arp.step++;
    arp.nextTime += dur;
  }
}
function setArp(on) {
  arp.on = on;
  arpBtn.classList.toggle('on', on);
  arpBtn.setAttribute('aria-pressed', on);
  if (on && S.powered) arpStart(); else arpStop();
}
arpBtn.addEventListener('click', () => {
  ensurePowered(false);
  setArp(!arp.on);
});

/* ================= power ================= */
const powerBtn = $('#powerBtn');
const ledEls = $$('#leds .led');

function clickSound() {
  const ctx = S.ctx, t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(170, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.28, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  o.connect(g); g.connect(S.comp);
  o.start(t); o.stop(t + 0.14);
}

let booting = false;
let sweepStart = -1; // spectrum calibration sweep, drawn in drawSpectrum

function bootChoreo() {
  if (RM.matches) return;
  // modules illuminate in silkscreen order 01 → 05
  $$('.ctl-group').forEach((g, i) => setTimeout(() => {
    g.classList.add('boot-flash');
    setTimeout(() => g.classList.remove('boot-flash'), 780);
  }, 120 + i * 115));
  // key-light chase runs the length of the keybed
  const midis = [...keyEls.keys()].sort((a, b) => a - b);
  midis.forEach((m, i) => setTimeout(() => flashKey(m, 170), 300 + i * 30));
  // spectrum analyser sweeps once, like a self-test
  sweepStart = performance.now() + 320;
}

function powerOn(withDemo) {
  if (S.powered) return;
  if (!S.ctx) initAudio();
  S.ctx.resume();
  S.powered = true;
  document.body.classList.add('powered');
  powerBtn.classList.add('on');
  powerBtn.setAttribute('aria-pressed', 'true');
  clickSound();
  booting = true;
  const stagger = RM.matches ? 0 : 95;
  ledEls.forEach((led, i) => setTimeout(() => led.classList.add('on'), i * stagger));
  setTimeout(() => { booting = false; }, ledEls.length * stagger + 200);
  if (!withDemo) setArp(false); // implicit power via playing: stay out of the way
  else {
    bootChoreo();
    if (arp.on) setTimeout(arpStart, RM.matches ? 60 : 1050);
  }
}
function powerOff() {
  if (!S.powered) return;
  arpStop();
  allNotesOff();
  S.powered = false;
  S.ctx.suspend();
  document.body.classList.remove('powered');
  powerBtn.classList.remove('on');
  powerBtn.setAttribute('aria-pressed', 'false');
  ledEls.forEach((led) => led.classList.remove('on'));
  S.level = 0;
}
function ensurePowered(withDemo) { if (!S.powered) powerOn(withDemo); }
powerBtn.addEventListener('click', () => { S.powered ? powerOff() : powerOn(true); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    arpStop();
    if (S.ctx) allNotesOff();
    cancelAnimationFrame(raf); raf = 0;
  } else {
    if (S.powered && arp.on) arpStart();
    if (!raf) raf = requestAnimationFrame(frame);
  }
});

/* ================= visuals ================= */
const bg = $('#bg'), bgc = bg.getContext('2d');
const sc = $('#scope'), scc = sc.getContext('2d');
const sp = $('#spectrum'), spc = sp.getContext('2d');

let W = 0, H = 0, horizonY = 0, scopeY = 0, spW = 0, spH = 0;
let stars = [], sunCan = null, scopeGrad = null;

function resize() {
  const d = dpr();
  W = innerWidth; H = innerHeight;
  for (const [cv, cx] of [[bg, bgc], [sc, scc]]) {
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    cx.setTransform(d, 0, 0, d, 0, 0);
  }
  const r = sp.parentElement.getBoundingClientRect();
  spW = Math.max(50, r.width - 16); spH = Math.max(20, r.height - 10);
  sp.width = Math.round(spW * d); sp.height = Math.round(spH * d);
  spc.setTransform(d, 0, 0, d, 0, 0);

  horizonY = clamp(120, H * 0.185, 190);
  scopeY = horizonY * 0.62;

  stars = [];
  const n = W < 700 ? 50 : 110;
  for (let i = 0; i < n; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * horizonY * 0.92,
      r: Math.random() * 1.3 + 0.3,
      p: Math.random() * Math.PI * 2,
      s: 0.4 + Math.random() * 1.2,
    });
  }
  buildSun();
  scopeGrad = scc.createLinearGradient(0, 0, W, 0);
  scopeGrad.addColorStop(0, '#FF3CAC');
  scopeGrad.addColorStop(0.5, '#784BA0');
  scopeGrad.addColorStop(1, '#2B86C5');
  bgDrawn = false;
}

function buildSun() {
  const R = clamp(70, W * 0.09, 130);
  sunCan = document.createElement('canvas');
  const d = dpr();
  sunCan.width = R * 2 * d; sunCan.height = R * 2 * d;
  const c = sunCan.getContext('2d');
  c.setTransform(d, 0, 0, d, 0, 0);
  const g = c.createLinearGradient(0, 0, 0, R * 2);
  g.addColorStop(0, '#FF3CAC');
  g.addColorStop(0.55, '#FF6E8F');
  g.addColorStop(1, '#784BA0');
  c.beginPath(); c.arc(R, R, R, 0, Math.PI * 2); c.fill();
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = g; c.fillRect(0, 0, R * 2, R * 2);
  c.globalCompositeOperation = 'destination-out';
  let y = R * 0.7, t = 1.5;
  while (y < R * 2) {
    c.fillRect(0, y, R * 2, t);
    y += t + Math.max(3, 14 - t * 2.2);
    t *= 1.45;
  }
  sunCan.R = R;
}

let bgDrawn = false;
let meteor = null, nextMeteor = 5;
function drawBG(T, dt) {
  if (RM.matches && bgDrawn) return;
  bgc.clearRect(0, 0, W, H);
  // sky
  const sky = bgc.createLinearGradient(0, 0, 0, horizonY * 1.25);
  sky.addColorStop(0, '#0D0221');
  sky.addColorStop(0.72, '#26093f');
  sky.addColorStop(1, '#4a1150');
  bgc.fillStyle = sky;
  bgc.fillRect(0, 0, W, horizonY);
  // stars
  bgc.fillStyle = '#EDE9FA';
  for (const st of stars) {
    bgc.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(T * st.s + st.p));
    bgc.fillRect(st.x, st.y, st.r, st.r);
  }
  bgc.globalAlpha = 1;
  // occasional meteor across the dusk
  if (!RM.matches) {
    if (!meteor && T > nextMeteor) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      meteor = {
        x: W * (0.15 + Math.random() * 0.7),
        y: 8 + Math.random() * horizonY * 0.3,
        vx: dir * (150 + Math.random() * 130),
        vy: 55 + Math.random() * 55,
        life: 1,
      };
    }
    if (meteor) {
      meteor.x += meteor.vx * dt;
      meteor.y += meteor.vy * dt;
      meteor.life -= dt / 1.1;
      if (meteor.life <= 0 || meteor.y > horizonY * 0.88) {
        meteor = null;
        nextMeteor = T + 6 + Math.random() * 7;
      } else {
        const tx = meteor.x - meteor.vx * 0.16, ty = meteor.y - meteor.vy * 0.16;
        const mg = bgc.createLinearGradient(tx, ty, meteor.x, meteor.y);
        const a = Math.min(1, meteor.life * 2.4);
        mg.addColorStop(0, 'rgba(237,233,250,0)');
        mg.addColorStop(1, `rgba(237,233,250,${(0.85 * a).toFixed(3)})`);
        bgc.strokeStyle = mg;
        bgc.lineWidth = 1.4;
        bgc.beginPath(); bgc.moveTo(tx, ty); bgc.lineTo(meteor.x, meteor.y); bgc.stroke();
      }
    }
  }
  // sun
  if (sunCan) {
    const R = sunCan.R;
    const pulse = RM.matches ? 0 : Math.sin(T * 0.8) * 2;
    bgc.drawImage(sunCan, W / 2 - R - pulse / 2, horizonY - R - 6, R * 2 + pulse, R * 2 + pulse);
  }
  // below-horizon base
  const floor = bgc.createLinearGradient(0, horizonY, 0, H);
  floor.addColorStop(0, '#1b0733');
  floor.addColorStop(0.35, '#0D0221');
  floor.addColorStop(1, '#0D0221');
  bgc.fillStyle = floor;
  bgc.fillRect(0, horizonY, W, H - horizonY);
  // grid — verticals to vanishing point
  const vx = W / 2;
  bgc.lineWidth = 1;
  const nV = 26;
  for (let i = -nV; i <= nV; i++) {
    const xB = vx + (i / nV) * W * 1.6;
    const a = 0.34 * (1 - Math.abs(i) / (nV + 4));
    bgc.strokeStyle = `rgba(255,60,172,${a.toFixed(3)})`;
    bgc.beginPath();
    bgc.moveTo(vx, horizonY);
    bgc.lineTo(xB, H + 40);
    bgc.stroke();
  }
  // horizontals scrolling toward viewer
  const nH = 17, speed = 0.24;
  for (let i = 0; i < nH; i++) {
    let z = (i / nH + T * speed) % 1;
    const y = horizonY + (H + 60 - horizonY) * Math.pow(z, 2.6);
    const a = 0.05 + z * 0.4;
    bgc.strokeStyle = `rgba(255,60,172,${a.toFixed(3)})`;
    bgc.lineWidth = 1 + z * 1.6;
    bgc.beginPath(); bgc.moveTo(0, y); bgc.lineTo(W, y); bgc.stroke();
  }
  bgc.lineWidth = 1;
  // horizon line
  bgc.strokeStyle = 'rgba(0,240,181,.75)';
  bgc.shadowColor = '#00F0B5'; bgc.shadowBlur = 10;
  bgc.beginPath(); bgc.moveTo(0, horizonY); bgc.lineTo(W, horizonY); bgc.stroke();
  bgc.shadowBlur = 0;
  bgDrawn = true;
}

let scopeDrawn = false;
function drawScope(T) {
  const live = S.powered && S.analyser;
  if (RM.matches && !live && scopeDrawn) return;
  scc.clearRect(0, 0, W, H);
  const amp = horizonY * 0.34;
  const N = 240;
  // output level swells the trace and its glow — the scope visibly performs what you play
  const lvl = live ? S.levelSmooth : 0;
  const swell = 1 + lvl * 1.5;
  const yMax = horizonY * 1.05;
  scc.beginPath();
  if (live) {
    const d = S.timeData, len = d.length;
    // rising zero-cross trigger for a stable trace
    let trig = 0;
    for (let i = 1; i < len / 2; i++) {
      if (d[i - 1] < 128 && d[i] >= 128) { trig = i; break; }
    }
    const span = len / 2;
    for (let i = 0; i <= N; i++) {
      const v = d[trig + Math.floor((i / N) * span)] ?? 128;
      const y = clamp(scopeY + ((v - 128) / 128) * amp * 2.2 * swell, -yMax * 0.15, yMax);
      i ? scc.lineTo((i / N) * W, y) : scc.moveTo(0, y);
    }
  } else {
    for (let i = 0; i <= N; i++) {
      const x = i / N;
      const y = scopeY
        + Math.sin(x * 9 + T * 1.3) * amp * 0.32 * (1 + 0.4 * Math.sin(T * 0.43))
        + Math.sin(x * 23 - T * 2.1) * amp * 0.1
        + Math.sin(x * 3.1 + T * 0.7) * amp * 0.18;
      i ? scc.lineTo(x * W, y) : scc.moveTo(0, y);
    }
  }
  scc.lineJoin = 'round';
  scc.strokeStyle = scopeGrad;
  scc.globalAlpha = 0.4; scc.lineWidth = 6 + lvl * 10; scc.stroke();
  scc.globalAlpha = 1; scc.lineWidth = 2 + lvl * 1.6;
  scc.strokeStyle = live ? '#9FFFE4' : scopeGrad;
  if (live && lvl > 0.02) {
    scc.shadowColor = '#00F0B5';
    scc.shadowBlur = 4 + lvl * 26;
  }
  scc.stroke();
  scc.shadowBlur = 0;
  scopeDrawn = true;
}

let specDrawn = false;
const BAR_W = 5, BAR_GAP = 3;
function drawSpectrum(T) {
  const live = S.powered && S.analyser;
  if (RM.matches && !live && specDrawn) return;
  spc.clearRect(0, 0, spW, spH);
  // graticule — faint horizontal reference lines, like a scope screen
  spc.fillStyle = 'rgba(237,233,250,.055)';
  spc.fillRect(0, Math.round(spH * 0.33), spW, 1);
  spc.fillRect(0, Math.round(spH * 0.66), spW, 1);
  spc.fillStyle = 'rgba(237,233,250,.09)';
  spc.fillRect(0, spH - 1, spW, 1);
  const n = Math.floor(spW / (BAR_W + BAR_GAP));
  const maxBin = S.freqData ? S.freqData.length * 0.72 : 0;
  for (let i = 0; i < n; i++) {
    let f;
    if (live) {
      const bin = Math.floor(Math.pow(i / n, 1.7) * maxBin);
      f = S.freqData[bin] / 255;
      f = Math.pow(f, 1.35);
    } else {
      f = 0.08
        + 0.07 * (0.5 + 0.5 * Math.sin(i * 0.31 + T * 1.7))
        + 0.05 * (0.5 + 0.5 * Math.sin(i * 0.11 - T * 0.9));
    }
    const h = Math.max(1.5, f * spH);
    const x = i * (BAR_W + BAR_GAP);
    const mix = i / n;
    const r = Math.round(255 + (43 - 255) * mix);
    const g = Math.round(60 + (134 - 60) * mix);
    const b = Math.round(172 + (197 - 172) * mix);
    spc.fillStyle = `rgba(${r},${g},${b},${live ? 0.9 : 0.55})`;
    spc.fillRect(x, spH - h, BAR_W, h);
    if (f > 0.04) {
      spc.fillStyle = live ? '#00F0B5' : 'rgba(0,240,181,.5)';
      spc.fillRect(x, spH - h - 2, BAR_W, 2);
    }
  }
  // one-shot calibration sweep on power-on
  if (sweepStart > 0) {
    const p = (performance.now() - sweepStart) / 950;
    if (p >= 1) sweepStart = -1;
    else if (p >= 0) {
      const x = p * spW;
      const trail = spc.createLinearGradient(x - 70, 0, x, 0);
      trail.addColorStop(0, 'rgba(0,240,181,0)');
      trail.addColorStop(1, 'rgba(0,240,181,.45)');
      spc.fillStyle = trail;
      spc.fillRect(x - 70, 0, 70, spH);
      spc.fillStyle = '#00F0B5';
      spc.fillRect(x, 0, 2, spH);
    }
  }
  specDrawn = true;
}

function updateLEDs() {
  if (!S.powered || booting) return;
  const lit = Math.round(clamp(S.level * 14, 0, 1) * ledEls.length);
  ledEls.forEach((led, i) => led.classList.toggle('on', i < Math.max(1, lit)));
}

/* ================= main loop ================= */
let raf = 0, last = 0, T = 0;
function frame(ts) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
  last = ts;
  if (!RM.matches) T += dt;
  if (S.powered && S.analyser) {
    S.analyser.getByteTimeDomainData(S.timeData);
    S.analyser.getByteFrequencyData(S.freqData);
    let sum = 0;
    for (let i = 0; i < S.timeData.length; i += 8) {
      const v = (S.timeData[i] - 128) / 128;
      sum += v * v;
    }
    S.level = Math.sqrt(sum / (S.timeData.length / 8));
    S.levelSmooth += (S.level - S.levelSmooth) * Math.min(1, dt * 10);
  } else {
    S.levelSmooth *= 0.9;
  }
  drawBG(T, dt);
  drawScope(T);
  drawSpectrum(T);
  updateLEDs();
}

window.addEventListener('resize', resize);
RM.addEventListener?.('change', () => { bgDrawn = scopeDrawn = specDrawn = false; });
resize();
raf = requestAnimationFrame(frame);
