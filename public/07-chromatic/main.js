/* CHROMATIC.SYS — runtime. Hand-rolled motion; no libraries. */
'use strict';

const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
const SMALL = window.matchMedia('(max-width: 720px)');

/* ============ liquid chrome metaballs ============ */
const gooField = document.getElementById('gooField');
let blobCircles = Array.from(gooField.querySelectorAll('circle[data-blob]'));

if (SMALL.matches) {
  // lighter scene on phones: fewer balls, softer blur
  blobCircles = blobCircles.filter((c) => {
    if (c.hasAttribute('data-desk')) { c.remove(); return false; }
    return true;
  });
  const blur = document.getElementById('gooBlur');
  if (blur) blur.setAttribute('stdDeviation', '15');
}

// sum-of-sines drift: each ball orbits on two incommensurate frequencies
const blobs = blobCircles.map((el, i) => ({
  el,
  bx: +el.getAttribute('cx'),
  by: +el.getAttribute('cy'),
  r0: +el.getAttribute('r'),
  ax: 55 + ((i * 37) % 80),
  ay: 38 + ((i * 53) % 60),
  s1: 0.00030 + (i % 5) * 0.00006,
  s2: 0.00047 + (i % 3) * 0.00008,
  p1: i * 1.73,
  p2: i * 2.91,
  rs: 0.00022 + (i % 4) * 0.00005,
  pr: i * 0.94,
}));

function drawBlobs(t) {
  for (const b of blobs) {
    const x = b.bx + Math.sin(t * b.s1 + b.p1) * b.ax + Math.sin(t * b.s2 * 1.618 + b.p2) * b.ax * 0.35;
    const y = b.by + Math.cos(t * b.s2 + b.p2) * b.ay + Math.sin(t * b.s1 * 1.31 + b.p1) * b.ay * 0.45;
    const r = b.r0 * (1 + Math.sin(t * b.rs + b.pr) * 0.11);
    b.el.setAttribute('cx', x.toFixed(1));
    b.el.setAttribute('cy', y.toFixed(1));
    b.el.setAttribute('r', r.toFixed(1));
  }
}

/* ============ holographic foil card ============ */
const scene = document.getElementById('cardScene');
const card = document.getElementById('foilCard');
const tilt = {
  rx: 0, ry: 0, mx: 50, my: 38, sh: 0.55,
  trx: 0, try_: 0, tmx: 50, tmy: 38, tsh: 0.55,
  hover: false,
};

scene.addEventListener('pointermove', (e) => {
  const r = card.getBoundingClientRect();
  const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  tilt.try_ = (px - 0.5) * 22;
  tilt.trx = (0.5 - py) * 16;
  tilt.tmx = px * 100;
  tilt.tmy = py * 100;
  tilt.tsh = 0.85;
  tilt.hover = true;
});
scene.addEventListener('pointerleave', () => { tilt.hover = false; });

function tickCard(t) {
  if (!tilt.hover) {
    // autonomous sway so the foil breathes even without a pointer
    tilt.try_ = Math.sin(t * 0.00038) * 9;
    tilt.trx = Math.cos(t * 0.00029) * 6;
    tilt.tmx = 50 + Math.sin(t * 0.00033) * 34;
    tilt.tmy = 40 + Math.cos(t * 0.00026) * 26;
    tilt.tsh = 0.5;
  }
  const k = tilt.hover ? 0.14 : 0.045;
  tilt.rx += (tilt.trx - tilt.rx) * k;
  tilt.ry += (tilt.try_ - tilt.ry) * k;
  tilt.mx += (tilt.tmx - tilt.mx) * k;
  tilt.my += (tilt.tmy - tilt.my) * k;
  tilt.sh += (tilt.tsh - tilt.sh) * 0.06;
  card.style.setProperty('--rx', tilt.rx.toFixed(2) + 'deg');
  card.style.setProperty('--ry', tilt.ry.toFixed(2) + 'deg');
  card.style.setProperty('--mx', tilt.mx.toFixed(2) + '%');
  card.style.setProperty('--my', tilt.my.toFixed(2) + '%');
  card.style.setProperty('--sheen', tilt.sh.toFixed(3));
}

/* ============ master loop (rAF, pauses when hidden) ============ */
let rafId = 0;
function loop(t) {
  drawBlobs(t);
  tickCard(t);
  rafId = requestAnimationFrame(loop);
}
function startLoop() {
  if (!rafId && !RM.matches) rafId = requestAnimationFrame(loop);
}
function stopLoop() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLoop(); else startLoop();
});
startLoop();
if (RM.matches) {
  // composed static pose for reduced motion
  card.style.setProperty('--ry', '-7deg');
  card.style.setProperty('--rx', '5deg');
  card.style.setProperty('--mx', '62%');
  card.style.setProperty('--my', '30%');
}

/* ============ scroll reveals ============ */
const revealEls = document.querySelectorAll('.reveal');
if (RM.matches || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  let stagger = 0;
  revealEls.forEach((el) => {
    el.style.setProperty('--d', ((stagger++ % 5) * 90) + 'ms');
    io.observe(el);
  });
}

/* ============ download theatre ============ */
const dlBtn = document.getElementById('dlBtn');
const dlWin = document.getElementById('dlWin');
const dlBar = document.getElementById('dlBar');
const dlMsg = document.getElementById('dlMsg');
const DL_LINES = [
  'Negotiating with the sandman…',
  'Unpacking liquid metal (14.2 MB)…',
  'Hooking visual cortex at ring 0…',
  'Calibrating precognitive vsync…',
  'Polishing the moon…',
];
let downloading = false;

dlBtn.addEventListener('click', () => {
  if (downloading) return;
  downloading = true;
  dlWin.hidden = false;
  dlBar.style.width = '0%';
  const dur = RM.matches ? 400 : 3400;
  const t0 = performance.now();
  function step(now) {
    const p = Math.min(1, (now - t0) / dur);
    // chunky Win98 fill: quantize to 14 blocks
    const q = Math.floor(p * 14) / 14 * 100;
    dlBar.style.width = q.toFixed(1) + '%';
    if (p < 1) {
      dlMsg.textContent = DL_LINES[Math.min(DL_LINES.length - 1, Math.floor(p * DL_LINES.length))];
      requestAnimationFrame(step);
    } else {
      dlBar.style.width = '100%';
      dlMsg.textContent = 'INSTALL COMPLETE — takes effect at next REM cycle. Sleep well.';
      downloading = false;
    }
  }
  requestAnimationFrame(step);
});
