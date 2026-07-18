/* CHROMATIC.SYS — runtime. Hand-rolled motion; no libraries. */
'use strict';

const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
const SMALL = window.matchMedia('(max-width: 720px)');
const FINE = window.matchMedia('(pointer: fine)');

/* ============ liquid chrome metaballs ============ */
const gooField = document.getElementById('gooField');
let blobCircles = Array.from(gooField.querySelectorAll('circle[data-blob]'));

if (SMALL.matches) {
  // lighter scene on phones: fewer balls, softer blur, mobile-composed layout
  blobCircles = blobCircles.filter((c) => {
    if (c.hasAttribute('data-desk')) { c.remove(); return false; }
    return true;
  });
  blobCircles.forEach((c) => {
    const m = c.getAttribute('data-m');
    if (!m) return;
    const [x, y, r] = m.split(',').map(Number);
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', r);
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
  ax: 24 + ((i * 37) % 34),
  ay: 18 + ((i * 53) % 26),
  s1: 0.00030 + (i % 5) * 0.00006,
  s2: 0.00047 + (i % 3) * 0.00008,
  p1: i * 1.73,
  p2: i * 2.91,
  rs: 0.00022 + (i % 4) * 0.00005,
  pr: i * 0.94,
  ox: 0, oy: 0, // spring offset from cursor repulsion
}));

/* pointer repulsion: the chrome parts around your cursor like real liquid */
const hero = document.querySelector('.hero');
const gooGroup = gooField.querySelector('g');
const ptr = { x: -9999, y: -9999, active: false };

function toSvg(clientX, clientY) {
  const m = gooField.getScreenCTM();
  if (!m) return null;
  const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
  return p;
}

if (FINE.matches && !RM.matches) {
  hero.addEventListener('pointermove', (e) => {
    const p = toSvg(e.clientX, e.clientY);
    if (!p) return;
    ptr.x = p.x; ptr.y = p.y; ptr.active = true;
  });
  hero.addEventListener('pointerleave', () => { ptr.active = false; });
}

/* click the hero: spit a chrome droplet into the field, let it melt back in */
const droplets = [];
if (!RM.matches) {
  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    if (droplets.length >= 6) return;
    const p = toSvg(e.clientX, e.clientY);
    if (!p) return;
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    el.setAttribute('fill', Math.random() < 0.3 ? '#ffffff' : 'url(#chromeA)');
    el.setAttribute('cx', p.x); el.setAttribute('cy', p.y); el.setAttribute('r', 0);
    gooGroup.appendChild(el);
    droplets.push({
      el, x: p.x, y: p.y,
      rmax: 30 + Math.random() * 26,
      born: performance.now(),
      life: 3600 + Math.random() * 800,
      drift: (Math.random() - 0.5) * 0.02,
    });
  });
}

function easeOutBack(p) { const c = 1.70158; const q = p - 1; return 1 + (c + 1) * q * q * q + c * q * q; }

function drawDroplets(t) {
  for (let i = droplets.length - 1; i >= 0; i--) {
    const d = droplets[i];
    const age = t - d.born;
    let r;
    if (age < 520) r = d.rmax * easeOutBack(age / 520);            // pop in, overshoot
    else if (age < d.life - 700) r = d.rmax * (1 + Math.sin(age * 0.004) * 0.06); // wobble
    else r = d.rmax * Math.max(0, (d.life - age) / 700);           // sink back in
    if (age >= d.life) { d.el.remove(); droplets.splice(i, 1); continue; }
    d.x += d.drift * 16;
    d.y -= 0.28; // slow buoyant rise
    d.el.setAttribute('cx', d.x.toFixed(1));
    d.el.setAttribute('cy', d.y.toFixed(1));
    d.el.setAttribute('r', Math.max(0, r).toFixed(1));
  }
}

function drawBlobs(t) {
  for (const b of blobs) {
    let x = b.bx + Math.sin(t * b.s1 + b.p1) * b.ax + Math.sin(t * b.s2 * 1.618 + b.p2) * b.ax * 0.35;
    let y = b.by + Math.cos(t * b.s2 + b.p2) * b.ay + Math.sin(t * b.s1 * 1.31 + b.p1) * b.ay * 0.45;
    const r = b.r0 * (1 + Math.sin(t * b.rs + b.pr) * 0.11);
    // repulsion spring: push away from cursor, spring back when it leaves
    let tox = 0, toy = 0;
    if (ptr.active) {
      const dx = x - ptr.x, dy = y - ptr.y;
      const dist = Math.hypot(dx, dy) || 1;
      const R = 200 + b.r0 * 0.6;
      if (dist < R) {
        const f = Math.pow(1 - dist / R, 2) * 95;
        tox = (dx / dist) * f;
        toy = (dy / dist) * f;
      }
    }
    b.ox += (tox - b.ox) * 0.085;
    b.oy += (toy - b.oy) * 0.085;
    x += b.ox; y += b.oy;
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

/* ============ scroll choreography ============ */
const nav = document.querySelector('.nav');
const scanline = document.getElementById('scanline');
const heroInner = document.querySelector('.hero-inner');
const scrollState = { y: 0, target: 0 };
let heroH = hero.offsetHeight || 1;

function onScroll() {
  scrollState.target = window.scrollY;
  nav.classList.toggle('scrolled', window.scrollY > 30);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scanline.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0).toFixed(4) + ')';
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => { heroH = hero.offsetHeight || 1; }, { passive: true });
onScroll();

function tickScroll() {
  scrollState.y += (scrollState.target - scrollState.y) * 0.12;
  const sy = scrollState.y;
  if (sy < heroH * 1.2) {
    gooField.style.transform = 'translate3d(0,' + (sy * 0.28).toFixed(1) + 'px,0)';
    heroInner.style.transform = 'translate3d(0,' + (sy * 0.16).toFixed(1) + 'px,0)';
    heroInner.style.opacity = Math.max(0, 1 - sy / (heroH * 0.72)).toFixed(3);
  }
}

/* ============ cursor droplet: a bead of chrome trails the pointer ============ */
let cursorTick = null;
if (FINE.matches && !RM.matches) {
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);
  const cur = { x: -100, y: -100, tx: -100, ty: -100, seen: false };
  window.addEventListener('pointermove', (e) => {
    cur.tx = e.clientX; cur.ty = e.clientY;
    if (!cur.seen) { cur.x = cur.tx; cur.y = cur.ty; cur.seen = true; dot.style.opacity = '1'; }
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { dot.style.opacity = '0'; });
  document.documentElement.addEventListener('mouseenter', () => { if (cur.seen) dot.style.opacity = '1'; });
  cursorTick = function () {
    const vx = cur.tx - cur.x, vy = cur.ty - cur.y;
    cur.x += vx * 0.22; cur.y += vy * 0.22;
    const v = Math.hypot(vx, vy);
    const s = Math.min(0.55, v * 0.016);
    const a = Math.atan2(vy, vx);
    dot.style.transform =
      'translate3d(' + cur.x.toFixed(1) + 'px,' + cur.y.toFixed(1) + 'px,0) ' +
      'rotate(' + a.toFixed(3) + 'rad) scale(' + (1 + s).toFixed(3) + ',' + (1 - s * 0.55).toFixed(3) + ')';
  };
}

/* ============ master loop (rAF, pauses when hidden) ============ */
let rafId = 0;
function loop(t) {
  drawBlobs(t);
  drawDroplets(t);
  tickCard(t);
  tickScroll();
  if (cursorTick) cursorTick();
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
let installed = false;

function holoFlash() {
  if (RM.matches) return;
  const f = document.createElement('div');
  f.className = 'holo-flash';
  f.setAttribute('aria-hidden', 'true');
  document.body.appendChild(f);
  f.addEventListener('animationend', () => f.remove(), { once: true });
}

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
      if (!installed) {
        installed = true;
        holoFlash();
        dlBtn.classList.add('installed');
        dlBtn.querySelector('.btn-mega-label').textContent = 'INSTALLED — SWEET DREAMS';
        dlBtn.querySelector('.btn-mega-sub').textContent = 'ACTIVE AT NEXT REM CYCLE · 0 ERRORS';
      }
    }
  }
  requestAnimationFrame(step);
});
