/* ============================================================
   STRATA — flow-field minting engine
   Hand-rolled: mulberry32 PRNG, seeded value-noise fBm,
   particle advection with batched stroke rendering.
   ============================================================ */
'use strict';

const TAU = Math.PI * 2;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

/* ---------- seeded randomness ---------- */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fade(t) { return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

/* Seeded 2D value noise + fractal Brownian motion, range ≈ [-1, 1] */
function makeNoise(seed) {
  const rng = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) vals[i] = rng() * 2 - 1;

  function vn(x, y) {
    const X = Math.floor(x), Y = Math.floor(y);
    const u = fade(x - X), v = fade(y - Y);
    const xi = X & 255, yi = Y & 255;
    const a = perm[xi] + yi, b = perm[xi + 1] + yi;
    return lerp(
      lerp(vals[perm[a]], vals[perm[b]], u),
      lerp(vals[perm[a + 1]], vals[perm[b + 1]], u),
      v
    );
  }
  function fbm(x, y, oct) {
    let s = 0, amp = 1, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      s += vn(x * f, y * f) * amp;
      norm += amp; amp *= 0.55; f *= 2.03;
    }
    return s / norm;
  }
  return { vn, fbm };
}

/* ---------- curated palettes (inks ordered dark → light) ---------- */

const PALETTES = [
  { name: 'Ember',   letter: 'A', bg: '#171009',
    inks: ['#4A1B10', '#8C2F1B', '#C05020', '#E07A2E', '#EFA43F', '#F2D3A0'] },
  { name: 'Glacier', letter: 'B', bg: '#0B1014',
    inks: ['#16303C', '#2C5162', '#3F7486', '#6FA7B4', '#A5CCD3', '#E3EEF0'] },
  { name: 'Moss',    letter: 'C', bg: '#0F120A',
    inks: ['#26331C', '#3E5227', '#5C7334', '#82944B', '#ABB878', '#E0E2BE'] },
  { name: 'Dusk',    letter: 'D', bg: '#131019',
    inks: ['#2C2140', '#4C3A63', '#6E5486', '#96678C', '#C08477', '#EBC9A8'] },
];

const WORD_A = ['Sediment', 'Alluvium', 'Stratum', 'Varve', 'Moraine', 'Terrane',
  'Lamina', 'Aquifer', 'Bedding', 'Rift', 'Drift', 'Delta'];
const WORD_B = ['Study', 'Section', 'Survey', 'Fragment', 'Suite', 'Field',
  'Cross-Section', 'Deposition'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function editionMeta(seed, paletteIdx) {
  const rng = mulberry32(seed ^ 0x5F3759DF);
  const title = `${WORD_A[(rng() * WORD_A.length) | 0]} ${WORD_B[(rng() * WORD_B.length) | 0]} ${ROMAN[(rng() * ROMAN.length) | 0]}`;
  const no = 1000 + (seed % 9000);
  const hex = '0x' + (seed >>> 0).toString(16).padStart(8, '0').slice(0, 6).toUpperCase();
  return { title, no: `No. ${no}-${PALETTES[paletteIdx].letter}`, hex };
}

/* ---------- flow painting ---------- */

const WIDTH_BUCKETS = [0.7, 1.35, 2.9];
const BUCKET_ALPHA = [1, 0.82, 0.55];

class FlowPainting {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.count = opts.count || 1500;
    this.developDur = opts.developDur || 16;   // seconds of heavy laying-in
    this.ambient = opts.ambient !== false;      // keep breathing after develop
    this.onProgress = opts.onProgress || null;
    this.done = false;
    this.age = 0;
    this.w = 0; this.h = 0;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return false;
    const w = Math.round(rect.width), h = Math.round(rect.height);
    if (w === this.w && h === this.h) return false;
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * DPR);
    this.canvas.height = Math.round(h * DPR);
    this.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return true;
  }

  mint(seed, forcePalette) {
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed);
    this.noise = makeNoise(this.seed ^ 0x9E3779B9);
    const r = this.rng;

    this.paletteIdx = forcePalette != null ? forcePalette : (r() * PALETTES.length) | 0;
    this.palette = PALETTES[this.paletteIdx];

    const size = Math.min(this.w, this.h) || 1;
    this.p = {
      scale: (1.3 + r() * 1.9) / size,          // field frequency
      oct: 2 + (r() < 0.55 ? 1 : 0),
      swirl: (1.15 + r() * 2.1) * Math.PI,
      base: r() * TAU,
      driftX: (r() - 0.5) * 0.55,
      driftY: (r() - 0.5) * 0.55,
      speed: (1.15 + r() * 0.75) * (size / 760),
      bandScale: (0.55 + r() * 0.75) / size,
      bandAngle: (r() - 0.5) * 0.9 + (r() < 0.18 ? Math.PI / 2 : 0),
      ox: r() * 64, oy: r() * 64,
      bx: r() * 64, by: r() * 64,
    };

    this.age = 0;
    this.done = false;
    this.margin = 14;

    const n = this.count;
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.life = new Float32Array(n);
    this.batch = new Uint8Array(n);   // inkIdx * 3 + widthBucket
    this.segs = [];
    for (let i = 0; i < PALETTES[0].inks.length * 3; i++) this.segs.push([]);
    for (let i = 0; i < n; i++) this.spawn(i, true);

    this.prime();
    if (this.onProgress) this.onProgress(0);
  }

  spawn(i, fresh) {
    const r = this.rng, p = this.p;
    const m = 6;
    const x = m + r() * (this.w - m * 2);
    const y = m + r() * (this.h - m * 2);
    this.px[i] = x; this.py[i] = y;
    this.life[i] = 60 + r() * 190;

    // strata band decides the ink at birth
    const ca = Math.cos(p.bandAngle), sa = Math.sin(p.bandAngle);
    const bx = (x * ca - y * sa) * p.bandScale + p.bx;
    const by = (x * sa + y * ca) * p.bandScale + p.by;
    let v = (this.noise.fbm(bx, by, 2) + 1) / 2;
    v = clamp01(v * 1.2 - 0.1 + (r() - 0.5) * 0.22);
    let ink = Math.min(5, (v * 6) | 0);

    const roll = r();
    let bucket;
    if (roll < 0.07) bucket = 2;            // impasto
    else if (roll < 0.16) bucket = 1;
    else bucket = 0;
    if (roll > 0.955) { ink = 5; bucket = 0; } // light accents
    this.batch[i] = ink * 3 + bucket;
  }

  prime() {
    const ctx = this.ctx, pal = this.palette, r = mulberry32(this.seed ^ 0x1234ABCD);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, this.w, this.h);

    // underpainting washes
    for (let i = 0; i < 3; i++) {
      const gx = r() * this.w, gy = r() * this.h;
      const rad = (0.4 + r() * 0.5) * Math.max(this.w, this.h);
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
      const ink = pal.inks[1 + ((r() * 3) | 0)];
      g.addColorStop(0, ink);
      g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.05 + r() * 0.05;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    // canvas weave
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let y = 0.5; y < this.h; y += 3) { ctx.moveTo(0, y); ctx.lineTo(this.w, y); }
    ctx.stroke();
    ctx.globalAlpha = 0.028;
    ctx.beginPath();
    for (let x = 0.5; x < this.w; x += 3) { ctx.moveTo(x, 0); ctx.lineTo(x, this.h); }
    ctx.stroke();
    // speckle tooth
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 900; i++) ctx.fillRect(r() * this.w, r() * this.h, 1, 1);
    ctx.globalAlpha = 1;
  }

  field(x, y) {
    const p = this.p;
    return this.noise.fbm(x * p.scale + p.ox, y * p.scale + p.oy, p.oct) * p.swirl + p.base;
  }

  stepOnce(alpha) {
    const { px, py, life, batch, segs, p } = this;
    const n = this.count, m = this.margin;
    for (const s of segs) s.length = 0;
    for (let i = 0; i < n; i++) {
      const x = px[i], y = py[i];
      const a = this.field(x, y);
      const nx = x + (Math.cos(a) + p.driftX) * p.speed;
      const ny = y + (Math.sin(a) + p.driftY) * p.speed;
      if (nx < -m || nx > this.w + m || ny < -m || ny > this.h + m || (life[i] -= 1) <= 0) {
        this.spawn(i, false);
        continue;
      }
      const s = segs[batch[i]];
      s.push(x, y, nx, ny);
      px[i] = nx; py[i] = ny;
    }
    // flush batches
    const ctx = this.ctx, inks = this.palette.inks;
    for (let b = 0; b < segs.length; b++) {
      const s = segs[b];
      if (!s.length) continue;
      const ink = (b / 3) | 0, bucket = b % 3;
      ctx.strokeStyle = inks[ink];
      ctx.lineWidth = WIDTH_BUCKETS[bucket];
      ctx.lineCap = bucket === 2 ? 'round' : 'butt';
      ctx.globalAlpha = Math.min(1, alpha * BUCKET_ALPHA[bucket]);
      ctx.beginPath();
      for (let k = 0; k < s.length; k += 4) {
        ctx.moveTo(s[k], s[k + 1]);
        ctx.lineTo(s[k + 2], s[k + 3]);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* advance by dt seconds of wall-clock time */
  frame(dt) {
    if (!this.w) return;
    this.age += dt;
    const t = Math.min(1, this.age / this.developDur);
    if (t >= 1 && !this.ambient) {
      if (!this.done) { this.done = true; if (this.onProgress) this.onProgress(1); }
      return;
    }
    const ease = 1 - (1 - t) * (1 - t);
    const sub = Math.max(1, Math.round(lerp(9, 1, ease)));
    const alpha = t < 1 ? lerp(0.06, 0.028, ease) : 0.013;
    if (t >= 1) {
      // ambient breathing: the field itself drifts, sparsely
      this.p.ox += dt * 0.004;
      this.p.oy -= dt * 0.0025;
      if (!this.done) { this.done = true; if (this.onProgress) this.onProgress(1); }
      this.stepOnce(alpha);
    } else {
      for (let s = 0; s < sub; s++) this.stepOnce(alpha);
      if (this.onProgress) this.onProgress(t);
    }
  }

  /* synchronous-ish fast forward, chunked to avoid one long task */
  fastForward(steps, chunk = 60, then) {
    const self = this;
    let doneSteps = 0;
    (function run() {
      const k = Math.min(chunk, steps - doneSteps);
      for (let i = 0; i < k; i++) self.stepOnce(0.05);
      doneSteps += k;
      if (doneSteps < steps) requestAnimationFrame(run);
      else {
        self.age = self.developDur;
        self.done = true;
        if (self.onProgress) self.onProgress(1);
        if (then) then();
      }
    })();
  }
}

/* ============================================================
   Page wiring
   ============================================================ */

const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

/* ----- the commission (hero painting) ----- */

const heroCanvas = $('#painting');
const isNarrow = matchMedia('(max-width: 720px)').matches;
const hero = new FlowPainting(heroCanvas, {
  count: isNarrow ? 850 : 1600,
  developDur: 16,
  ambient: !REDUCED,
  onProgress: updateStatus,
});

const els = {
  status: $('#lcStatus'),
  statusDot: $('#lcStatusDot'),
  edition: $('#lcEdition'),
  title: $('#lcTitle'),
  medium: $('#lcMedium'),
  palette: $('#lcPalette'),
  chips: $('#lcChips'),
  seed: $('#lcSeed'),
  field: $('#lcField'),
  plaqueNo: $('#plaqueNo'),
  plaqueTitle: $('#plaqueTitle'),
  plaqueSeed: $('#plaqueSeed'),
  frame: $('#heroFrame'),
  plaque: $('#heroPlaque'),
};

let lastPct = -1;
function updateStatus(pct) {
  if (!els.status) return;
  if (pct >= 1) {
    if (lastPct < 1) {
      els.status.textContent = REDUCED ? 'On view' : 'On view · ambient drift';
      lastPct = 1;
    }
    return;
  }
  const shown = Math.round(pct * 100);
  if (shown !== lastPct) {
    els.status.textContent = `Minting · ${shown}%`;
    lastPct = shown;
  }
}

function applyLabels(seed, paletteIdx, count) {
  const meta = editionMeta(seed, paletteIdx);
  const pal = PALETTES[paletteIdx];
  els.edition.textContent = `Edition ${meta.no}`;
  els.title.textContent = meta.title + ', 2026';
  els.medium.textContent = `Curl-noise advection · ${count.toLocaleString('en-US')} particles, pigment on canvas`;
  els.palette.textContent = pal.name;
  els.chips.innerHTML = pal.inks.map(c => `<i style="background:${c}"></i>`).join('');
  els.seed.textContent = `${meta.hex} · mulberry32`;
  els.field.textContent = `ν ${(hero.p.scale * Math.min(hero.w, hero.h)).toFixed(2)} · ω ${(hero.p.swirl / Math.PI).toFixed(2)}π`;
  els.plaqueNo.textContent = `Edition ${meta.no}`;
  els.plaqueTitle.textContent = `${meta.title} — 2026`;
  els.plaqueSeed.textContent = `flow-field advection · seed ${meta.hex}`;
  document.title = `STRATA — ${meta.title}, Edition ${meta.no}`;
  // the accessible name should describe *this* edition, not a generic
  // placeholder — a screen-reader user re-minting should hear what changed
  heroCanvas.setAttribute('aria-label',
    `The commissioned painting: "${meta.title}", ${pal.name} palette, Edition ${meta.no} — a unique generative flow-field artwork minted for this visit`);
}

function freshSeed() { return (Math.random() * 4294967296) >>> 0; }

function mintHero(seed) {
  hero.resize();
  hero.mint(seed);
  lastPct = -1;
  applyLabels(seed, hero.paletteIdx, hero.count);
  if (REDUCED) {
    hero.fastForward(360, 45);
  }
}

let minting = false;
function remint() {
  if (minting) return;
  minting = true;
  $$('.js-remint').forEach(b => b.setAttribute('disabled', ''));
  els.frame.classList.add('dimming');
  setTimeout(() => {
    mintHero(freshSeed());
    els.frame.classList.remove('dimming');
    // the unveiling: a brass-white strobe fires exactly as the black lifts,
    // catching the fresh edition like a photograph of the first brushstroke
    els.frame.classList.remove('flash');
    void els.frame.offsetWidth;
    els.frame.classList.add('flash');
    els.plaque.classList.remove('stamp');
    void els.plaque.offsetWidth;
    els.plaque.classList.add('stamp');
    setTimeout(() => {
      minting = false;
      els.frame.classList.remove('flash');
      $$('.js-remint').forEach(b => b.removeAttribute('disabled'));
    }, 500);
  }, REDUCED ? 60 : 620);
}
$$('.js-remint').forEach(b => b.addEventListener('click', remint));

/* ----- room II : the standing collection ----- */

const MINIS = [
  { seed: 0x2F6B11A7, pal: 0, title: 'Alluvium Study II' },
  { seed: 0x0B44C9E3, pal: 1, title: 'Varve Section IX' },
  { seed: 0x71D08A55, pal: 2, title: 'Moraine Fragment IV' },
  { seed: 0x19A7F3C1, pal: 3, title: 'Terrane Survey VII' },
  { seed: 0x5CE22B99, pal: 1, title: 'Bedding Suite III' },
  { seed: 0x43F19D08, pal: 3, title: 'Lamina Field XI' },
];

const wallEl = $('#wall');
const miniPaintings = [];

MINIS.forEach((m, idx) => {
  const no = 1000 + (m.seed % 9000);
  const hex = '0x' + (m.seed >>> 0).toString(16).padStart(8, '0').slice(0, 6).toUpperCase();
  const pal = PALETTES[m.pal];
  const fig = document.createElement('figure');
  fig.className = 'piece reveal';
  fig.style.setProperty('--d', `${(idx % 3) * 0.12}s`);
  fig.innerHTML = `
    <div class="frame">
      <div class="canvas-mat">
        <canvas role="img" aria-label="${m.title} — generative flow-field painting, ${pal.name} palette"></canvas>
        <div class="canvas-glaze"></div>
      </div>
    </div>
    <figcaption class="plaque">
      <div class="p-no">Edition No. ${no}-${pal.letter}</div>
      <div class="p-title">${m.title} — ${pal.name} palette</div>
      <div class="p-seed">seed ${hex}</div>
    </figcaption>`;
  wallEl.appendChild(fig);
  const painting = new FlowPainting($('canvas', fig), {
    count: 420,
    developDur: 7,
    ambient: !REDUCED,   // keep the wall alive after it finishes developing —
  });                    // a screen capture of Room II should never go still
  miniPaintings.push({ painting, m, started: false });
});

const wallIO = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const rec = miniPaintings.find(r => r.painting.canvas === $('canvas', en.target));
    if (rec && !rec.started) {
      rec.started = true;
      rec.painting.resize();
      rec.painting.mint(rec.m.seed, rec.m.pal);
      if (REDUCED) rec.painting.fastForward(240, 40);
    }
    wallIO.unobserve(en.target);
  });
}, { rootMargin: '160px' });
miniPaintings.forEach(r => wallIO.observe(r.painting.canvas.closest('.piece')));

/* Room II only keeps stepping its ambient drift while the room is actually
   on screen — cheap for 6 canvases either way, but no reason to burn frames
   on a wall scrolled far out of view. */
let wallVisible = false;
new IntersectionObserver((en) => { wallVisible = en[0].isIntersecting; }, { threshold: 0.05 })
  .observe($('#room-ii'));

/* wall scrolling: wheel → horizontal, plus nav buttons */
wallEl.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
  const max = wallEl.scrollWidth - wallEl.clientWidth;
  if ((e.deltaY > 0 && wallEl.scrollLeft < max - 1) || (e.deltaY < 0 && wallEl.scrollLeft > 1)) {
    e.preventDefault();
    wallEl.scrollLeft += e.deltaY;
  }
}, { passive: false });

/* One click = one piece. At wide viewports 70% of the *container* width
   (~1000px) was larger than the wall's entire scrollable range (~860px),
   so a single click silently teleported from the first painting straight
   to the last — "walk the wall" became "leap the wall." Stride by an
   actual piece's rendered width + gap instead, so the collection is
   browsed one edition at a time, same as the wheel does implicitly. */
function pieceStride() {
  const first = $('.piece', wallEl);
  if (!first) return wallEl.clientWidth * 0.7;
  const gap = parseFloat(getComputedStyle(wallEl).columnGap) || 0;
  return first.getBoundingClientRect().width + gap;
}
const wallPrevBtn = $('#wallPrev'), wallNextBtn = $('#wallNext');
wallPrevBtn.addEventListener('click', () => {
  wallEl.scrollBy({ left: -pieceStride(), behavior: REDUCED ? 'auto' : 'smooth' });
});
wallNextBtn.addEventListener('click', () => {
  wallEl.scrollBy({ left: pieceStride(), behavior: REDUCED ? 'auto' : 'smooth' });
});

/* The wall has a hard start and end — a curator's wall does too. Disabling
   (and announcing via aria-disabled) the prev/next button at each edge
   tells a keyboard or screen-reader visitor when they've reached the last
   painting, instead of a silent no-op click. */
function updateWallNavState() {
  const max = wallEl.scrollWidth - wallEl.clientWidth;
  const atStart = wallEl.scrollLeft <= 1;
  const atEnd = wallEl.scrollLeft >= max - 1;
  wallPrevBtn.toggleAttribute('disabled', atStart);
  wallPrevBtn.setAttribute('aria-disabled', String(atStart));
  wallNextBtn.toggleAttribute('disabled', atEnd);
  wallNextBtn.setAttribute('aria-disabled', String(atEnd));
}
let wallNavRaf = null;
wallEl.addEventListener('scroll', () => {
  if (wallNavRaf) return;
  wallNavRaf = requestAnimationFrame(() => { updateWallNavState(); wallNavRaf = null; });
}, { passive: true });
addEventListener('load', updateWallNavState);
addEventListener('resize', () => setTimeout(updateWallNavState, 260));
updateWallNavState();

/* ----- process diagram : the field made visible ----- */

const svg = $('#fieldSvg');
const diagNoise = makeNoise(0x03A7E5);
const ARROWS = [];
const COLS = 13, ROWS = 9, VW = 640, VH = 440, MARGIN = 34;
(function buildArrows() {
  const ns = 'http://www.w3.org/2000/svg';
  const dx = (VW - MARGIN * 2) / (COLS - 1);
  const dy = (VH - MARGIN * 2) / (ROWS - 1);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = MARGIN + c * dx, y = MARGIN + r * dy;
      const g = document.createElementNS(ns, 'g');
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', 'M-8 0H8M8 0L3.8-3.1M8 0L3.8 3.1');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#A6854D');
      path.setAttribute('stroke-width', '1.25');
      path.setAttribute('stroke-linecap', 'round');
      g.appendChild(path);
      svg.appendChild(g);
      ARROWS.push({ g, x, y });
    }
  }
})();

const ns = 'http://www.w3.org/2000/svg';
const walkers = [];
if (!REDUCED) {
  for (let i = 0; i < 2; i++) {
    const line = document.createElementNS(ns, 'polyline');
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#D9B980');
    line.setAttribute('stroke-width', '1.1');
    line.setAttribute('stroke-opacity', '0.5');
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('r', '2.4');
    dot.setAttribute('fill', '#EFE9DD');
    svg.appendChild(line);
    svg.appendChild(dot);
    walkers.push({
      line, dot,
      x: 60 + i * 300, y: 120 + i * 180,
      pts: [],
    });
  }
}

function fieldAngleAt(x, y, t) {
  return diagNoise.fbm(x * 0.0042 + t * 0.05, y * 0.0042 - t * 0.035, 2) * 2.4 * Math.PI;
}

function drawDiagram(t) {
  for (const a of ARROWS) {
    const ang = fieldAngleAt(a.x, a.y, t);
    const deg = (ang * 180) / Math.PI;
    a.g.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${deg.toFixed(1)})`);
    const mag = Math.abs(diagNoise.fbm(a.x * 0.0042 + t * 0.05, a.y * 0.0042 - t * 0.035, 2));
    a.g.setAttribute('opacity', (0.3 + mag * 0.75).toFixed(2));
  }
  for (const w of walkers) {
    const ang = fieldAngleAt(w.x, w.y, t);
    w.x += Math.cos(ang) * 1.5;
    w.y += Math.sin(ang) * 1.5;
    if (w.x < 8 || w.x > VW - 8 || w.y < 8 || w.y > VH - 8) {
      w.x = 30 + Math.random() * (VW - 60);
      w.y = 30 + Math.random() * (VH - 60);
      w.pts.length = 0;
    }
    w.pts.push(w.x.toFixed(1) + ',' + w.y.toFixed(1));
    if (w.pts.length > 70) w.pts.shift();
    w.line.setAttribute('points', w.pts.join(' '));
    w.dot.setAttribute('cx', w.x.toFixed(1));
    w.dot.setAttribute('cy', w.y.toFixed(1));
  }
}

let diagramVisible = false;
new IntersectionObserver((en) => {
  diagramVisible = en[0].isIntersecting;
}, { threshold: 0.1 }).observe(svg);

/* ----- mobile room index (menu toggle) ----- */

const menuToggle = $('#menuToggle');
const siteNav = $('#siteNav');
if (menuToggle && siteNav) {
  const setOpen = (open) => {
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close the room index' : 'Open the room index');
    siteNav.classList.toggle('nav-open', open);
  };
  menuToggle.addEventListener('click', () => {
    setOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
  });
  siteNav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
  matchMedia('(min-width: 721px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}

/* ----- the lamp (cursor as gallery light) ----- */

const lampEl = $('#lamp');
let lampX = innerWidth / 2, lampY = innerHeight / 3;
let lampTX = lampX, lampTY = lampY;
if (!REDUCED && !COARSE) {
  addEventListener('mousemove', (e) => {
    lampTX = e.clientX; lampTY = e.clientY;
    document.body.classList.add('lamp-on');
  }, { passive: true });
}

/* ----- the painting tilts toward the light: cursor-driven parallax on the
   hero frame, so the commissioned piece reads as a physical object hanging
   under a gallery spot rather than a flat image. Signature interaction. ---- */

const frameEl = $('#heroFrame');
let tiltTX = 0, tiltTY = 0, tiltX = 0, tiltY = 0;
let glazeTX = 50, glazeTY = -8, glazeX = 50, glazeY = -8;
if (!REDUCED && !COARSE && frameEl) {
  frameEl.addEventListener('pointermove', (e) => {
    const r = frameEl.getBoundingClientRect();
    const px = clamp01((e.clientX - r.left) / r.width);
    const py = clamp01((e.clientY - r.top) / r.height);
    tiltTY = (px - 0.5) * 15;   // rotateY — left/right
    tiltTX = (0.5 - py) * 11;   // rotateX — up/down
    glazeTX = px * 100; glazeTY = py * 100;
  });
  frameEl.addEventListener('pointerenter', () => lampEl.classList.add('near-art'));
  frameEl.addEventListener('pointerleave', () => {
    lampEl.classList.remove('near-art');
    tiltTX = 0; tiltTY = 0;
    glazeTX = 50; glazeTY = -8;
  });
}

/* ----- reveals ----- */

const revealIO = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
  });
}, { threshold: 0.12 });
$$('.reveal').forEach(el => revealIO.observe(el));

/* ----- master loop ----- */

let rafId = null, lastT = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
  lastT = now;
  const t = now / 1000;

  if (!REDUCED) {
    hero.frame(dt);
    for (const rec of miniPaintings) {
      if (!rec.started) continue;
      if (!rec.painting.done || wallVisible) rec.painting.frame(dt);
    }
    if (diagramVisible) drawDiagram(t);
    lampX = lerp(lampX, lampTX, 0.14);
    lampY = lerp(lampY, lampTY, 0.14);
    lampEl.style.transform = `translate3d(${lampX.toFixed(1)}px, ${lampY.toFixed(1)}px, 0)`;

    if (frameEl) {
      tiltX = lerp(tiltX, tiltTX, 0.09);
      tiltY = lerp(tiltY, tiltTY, 0.09);
      glazeX = lerp(glazeX, glazeTX, 0.09);
      glazeY = lerp(glazeY, glazeTY, 0.09);
      frameEl.style.transform = `perspective(1600px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
      frameEl.style.setProperty('--gx', glazeX.toFixed(1) + '%');
      frameEl.style.setProperty('--gy', glazeY.toFixed(1) + '%');
    }

    // scroll-linked threshold: the header hairline/shadow deepen as the
    // visitor walks down through room one, into the gallery proper
    const frac = clamp01(scrollY / (innerHeight * 0.6));
    document.documentElement.style.setProperty('--hdrA', frac.toFixed(3));
  }
  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (REDUCED) return; // static composition: fastForward chains handle rendering
  if (rafId == null) {
    lastT = performance.now();
    rafId = requestAnimationFrame(loop);
  }
}
function stopLoop() {
  if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLoop(); else startLoop();
});

/* ----- resize: redevelop at new size ----- */

let resizeTimer = null;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (hero.resize()) {
      hero.mint(hero.seed, hero.paletteIdx);
      lastPct = -1;
      if (REDUCED) hero.fastForward(360, 45);
      else hero.age = 0;
    }
    for (const rec of miniPaintings) {
      if (rec.started && rec.painting.resize()) {
        rec.painting.mint(rec.m.seed, rec.m.pal);
        rec.painting.fastForward(240, 40);
      }
    }
  }, 220);
});

/* ----- boot ----- */

mintHero(freshSeed());
if (REDUCED) drawDiagram(0);
startLoop();
