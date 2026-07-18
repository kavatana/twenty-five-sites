/* AURELIA — liquid-light silk, hand-rolled interactions ------------------- */
import * as THREE from 'three';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;

/* ------------------------------------------------------------------ SILK */
const SNOISE = /* glsl */`
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const VERT = /* glsl */`
uniform float uTime;
uniform vec2  uScale;
uniform float uFreq;
uniform float uAmp;
uniform vec2  uPointer;
uniform float uPointerZ;
uniform vec3  uRipple0;
uniform vec3  uRipple1;
uniform vec3  uRipple2;
uniform vec3  uRipple3;
varying vec3  vNormal;
varying vec3  vView;
varying float vH;
varying vec2  vUv;
${SNOISE}
/* a stone dropped in liquid silk: an expanding, decaying ring of wavefront */
float rippleH(vec2 w, vec3 r, float t){
  float age = t - r.z;
  if (r.z < -5.0 || age < 0.0 || age > 2.6) return 0.0;
  float dist = length(w - r.xy);
  float radius = age * 0.85;
  float ring = exp(-pow(dist - radius, 2.0) * 12.0);
  float decay = exp(-age * 1.15);
  float wave = sin(dist * 13.0 - age * 6.5);
  return ring * decay * wave;
}
float heightAt(vec2 w){
  vec2 p = w * uFreq;
  float t = uTime;
  float h = 0.0;
  /* fewer, larger folds read as flowing silk instead of turbulent camo */
  h += 0.46 * snoise(vec3(p * 0.32, t * 0.045));
  h += 0.20 * snoise(vec3(p * 0.85 + 7.3, t * 0.068));
  h += 0.07 * snoise(vec3(p * 2.0 - 3.1, t * 0.095));
  h += 0.56 * sin(p.x * 0.40 - p.y * 0.25 + t * 0.19);
  float d = length(w - uPointer);
  h += uPointerZ * exp(-d * d * 2.2);
  h += 0.55 * (rippleH(w, uRipple0, t) + rippleH(w, uRipple1, t)
             + rippleH(w, uRipple2, t) + rippleH(w, uRipple3, t));
  return h;
}
void main(){
  vUv = uv;
  vec2 w = position.xy * uScale;
  float e  = 0.045;
  float h  = heightAt(w);
  float hx = heightAt(w + vec2(e, 0.0));
  float hy = heightAt(w + vec2(0.0, e));
  vec3 pos = vec3(w, h * uAmp);
  vNormal = normalize(vec3(-(hx - h) * uAmp / e, -(hy - h) * uAmp / e, 1.0));
  vH = h;
  vView = cameraPosition - pos;
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}`;

const FRAG = /* glsl */`
uniform float uTime;
uniform vec3 uInk;
uniform vec3 uPearl;
uniform vec3 uGold;
uniform vec3 uRose;
uniform vec3 uTeal;
uniform float uIrid;
varying vec3  vNormal;
varying vec3  vView;
varying float vH;
varying vec2  vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec3 N = normalize(vNormal);
  /* silk thread micro-grain: faint anisotropic ripple in the weave —
     kept far below the amplitude/frequency that aliases into visible
     scanline moiré at 1x DPR */
  N.x += 0.006 * sin(vUv.y * 260.0 + vH * 24.0);
  N = normalize(N);
  vec3 V = normalize(vView);
  float cosT = clamp(dot(N, V), 0.0, 1.0);

  /* thin-film interference: optical path 2 n d cos(theta) per wavelength */
  float thickness = 340.0 + 185.0 * vH + 80.0 * sin(vUv.x * 6.0 + uTime * 0.10);
  vec3 lambda = vec3(650.0, 545.0, 450.0);
  vec3 phase = 6.2831853 * (2.0 * 1.38 * thickness * cosT) / lambda;
  vec3 film = 0.5 + 0.5 * cos(phase);
  /* rose-biased duotone: unlit teal over the warm base was reading as an
     off-palette olive, and dawn should lean rose first, teal as the cool
     counter-note */
  vec3 duo = mix(uTeal, uRose, 0.24 + 0.76 * film.r);
  /* keep the shimmer inside the brand's rose–teal register: only a whisper
     of the raw rainbow (whose green band sat nowhere in the palette) */
  vec3 irid = mix(duo, film, 0.2);

  /* silk base: troughs pool into ink, raised folds catch pearl/champagne
     light — real tonal range instead of a flat dark mid-grey */
  float fres = pow(1.0 - cosT, 1.6);
  float lum = smoothstep(-1.05, 1.15, vH);
  vec3 lit = mix(uPearl, uGold, 0.22);
  vec3 col = mix(uInk * 0.7, lit, lum * (0.5 + 0.16 * fres));

  col += irid * (0.22 + 0.85 * fres) * uIrid * (0.5 + 0.5 * lum);

  /* champagne key light, upper left */
  vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
  float diff = max(dot(N, L), 0.0);
  col += uGold * pow(diff, 3.0) * 0.24;
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 40.0);
  col += mix(uGold, uPearl, 0.5) * spec * 0.42;

  /* a soft, wide dark pool at centre keeps the wordmark legible whatever
     the surface is doing beneath it */
  float centre = 1.0 - smoothstep(0.0, 0.62, length(vUv - vec2(0.5, 0.46)));
  col = mix(col, col * 0.62, centre * 0.5);

  /* fold into ink at the frame */
  float vig = smoothstep(0.0, 0.30, vUv.x) * smoothstep(1.0, 0.70, vUv.x)
            * smoothstep(0.0, 0.26, vUv.y) * smoothstep(1.0, 0.74, vUv.y);
  col = mix(uInk * 0.58, col, 0.44 + 0.56 * vig);

  /* dither against banding */
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 140.0;

  gl_FragColor = vec4(col, 1.0);
}`;

function initSilk(canvas) {
  THREE.ColorManagement.enabled = false;
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x14121c, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
  camera.position.set(0, 0, 2);

  const mobile = innerWidth < 720;
  const geo = new THREE.PlaneGeometry(1, 1, mobile ? 120 : 230, mobile ? 84 : 156);
  const uniforms = {
    uTime:     { value: 0 },
    uScale:    { value: new THREE.Vector2(3, 2) },
    uFreq:     { value: mobile ? 1.5 : 1.1 },
    uAmp:      { value: mobile ? 0.3 : 0.34 },
    uPointer:  { value: new THREE.Vector2(9, 9) },
    uPointerZ: { value: 0 },
    uRipple0:  { value: new THREE.Vector3(9, 9, -10) },
    uRipple1:  { value: new THREE.Vector3(9, 9, -10) },
    uRipple2:  { value: new THREE.Vector3(9, 9, -10) },
    uRipple3:  { value: new THREE.Vector3(9, 9, -10) },
    uInk:      { value: new THREE.Color('#14121C') },
    uPearl:    { value: new THREE.Color('#F6F2EC') },
    uGold:     { value: new THREE.Color('#C9A96A') },
    uRose:     { value: new THREE.Color('#E8A0B4') },
    uTeal:     { value: new THREE.Color('#7FD4C1') },
    uIrid:     { value: 0.94 },
  };
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, uniforms
  }));
  mesh.frustumCulled = false;
  scene.add(mesh);

  let visW = 1, visH = 1;
  function resize() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    visW = visH * camera.aspect;
    uniforms.uScale.value.set(visW * 1.3, visH * 1.3);
  }
  resize();

  /* pointer: a fingertip pressed gently into the silk */
  const cur = { x: 9, y: 9, z: 0 };
  const tgt = { x: 9, y: 9, z: 0 };
  let lastMove = -1e4;
  addEventListener('pointermove', (e) => {
    lastMove = performance.now();
    tgt.x = (e.clientX / innerWidth - 0.5) * visW;
    tgt.y = -(e.clientY / innerHeight - 0.5) * visH;
    tgt.z = -0.52;
  }, { passive: true });

  /* a stone dropped in liquid silk — click/tap sends a ring of light outward */
  const ripples = [
    { x: 9, y: 9, t: -10 }, { x: 9, y: 9, t: -10 },
    { x: 9, y: 9, t: -10 }, { x: 9, y: 9, t: -10 },
  ];
  const rippleUniforms = [uniforms.uRipple0, uniforms.uRipple1, uniforms.uRipple2, uniforms.uRipple3];
  let rippleIdx = 0;
  function addRipple(clientX, clientY) {
    const r = ripples[rippleIdx];
    r.x = (clientX / innerWidth - 0.5) * visW;
    r.y = -(clientY / innerHeight - 0.5) * visH;
    r.t = performance.now() * 0.001;
    rippleIdx = (rippleIdx + 1) % ripples.length;
  }

  function render(t) {
    /* phantom breeze when idle / touch devices, so the silk never sleeps */
    if (performance.now() - lastMove > 5000) {
      tgt.x = Math.sin(t * 0.21) * visW * 0.3;
      tgt.y = Math.cos(t * 0.16) * visH * 0.24;
      tgt.z = -0.34;
    }
    cur.x = lerp(cur.x, tgt.x, 0.045);
    cur.y = lerp(cur.y, tgt.y, 0.045);
    cur.z = lerp(cur.z, tgt.z, 0.03);
    uniforms.uPointer.value.set(cur.x, cur.y);
    uniforms.uPointerZ.value = cur.z;
    uniforms.uTime.value = t;
    for (let i = 0; i < ripples.length; i++) {
      rippleUniforms[i].value.set(ripples[i].x, ripples[i].y, ripples[i].t);
    }
    /* view drifts a breath with the pointer — iridescence follows the eye */
    camera.position.x = cur.x * 0.045;
    camera.position.y = cur.y * 0.045;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  return { render, resize, addRipple };
}

const heroEl = document.querySelector('.hero');
const silkCanvas = document.getElementById('silk');
let silk = null;
try {
  silk = initSilk(silkCanvas);
} catch (err) {
  heroEl.classList.add('no-gl');
}

/* -------------------------------------------------------- SIGNATURE MOMENT
   Press the silk — a stone dropped in liquid light. Click or tap the hero
   and a ring of wavefront runs outward through the shader while a matching
   ink-and-gold ring blooms in the DOM, so the gesture reads instantly even
   before the GPU catches up. The whole point of a liquid-light maison: it
   should feel touchable. */
if (!RM) {
  heroEl.addEventListener('pointerdown', (e) => {
    if (silk) silk.addRipple(e.clientX, e.clientY);
    const ring = document.createElement('span');
    ring.className = 'click-ripple';
    ring.style.left = e.clientX + 'px';
    ring.style.top = e.clientY + 'px';
    document.body.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove());
  });
}

/* -------------------------------------------------- SCENT CANVAS LOOPS */
const SCENTS = {
  aube: {
    base: '#f2e4e0',
    blend: 'source-over',
    blobs: [
      { c: 'rgba(238,172,190,0.9)',  r: .52, x: .30, y: .72, ax: .16, ay: .10, sx: .21, sy: .17, ph: 0.0 },
      { c: 'rgba(214,182,120,0.75)', r: .40, x: .72, y: .30, ax: .12, ay: .14, sx: .16, sy: .23, ph: 2.1 },
      { c: 'rgba(250,247,240,0.95)', r: .46, x: .52, y: .16, ax: .10, ay: .08, sx: .26, sy: .19, ph: 4.2 },
      { c: 'rgba(150,205,214,0.4)',  r: .34, x: .78, y: .82, ax: .13, ay: .11, sx: .19, sy: .27, ph: 1.2 },
    ],
  },
  meridien: {
    base: '#f3e9cf',
    blend: 'source-over',
    blobs: [
      { c: 'rgba(226,190,120,0.9)',  r: .55, x: .50, y: .34, ax: .13, ay: .11, sx: .18, sy: .22, ph: 0.7 },
      { c: 'rgba(252,248,238,0.95)', r: .42, x: .26, y: .70, ax: .12, ay: .10, sx: .24, sy: .16, ph: 2.9 },
      { c: 'rgba(158,210,196,0.5)',  r: .36, x: .80, y: .76, ax: .14, ay: .12, sx: .17, sy: .25, ph: 5.0 },
      { c: 'rgba(233,196,168,0.55)', r: .30, x: .68, y: .14, ax: .10, ay: .09, sx: .28, sy: .20, ph: 3.6 },
    ],
  },
  minuit: {
    base: '#171428',
    blend: 'lighter',
    blobs: [
      { c: 'rgba(93,74,134,0.5)',   r: .55, x: .34, y: .34, ax: .15, ay: .12, sx: .17, sy: .21, ph: 0.3 },
      { c: 'rgba(62,143,138,0.4)',  r: .44, x: .72, y: .66, ax: .13, ay: .13, sx: .22, sy: .16, ph: 2.4 },
      { c: 'rgba(160,85,119,0.4)',  r: .38, x: .30, y: .82, ax: .12, ay: .10, sx: .19, sy: .26, ph: 4.5 },
      { c: 'rgba(201,169,106,0.22)',r: .26, x: .66, y: .16, ax: .10, ay: .09, sx: .27, sy: .18, ph: 1.7 },
    ],
  },
};

const cardLoops = [...document.querySelectorAll('.card')].map((card) => {
  const canvas = card.querySelector('canvas');
  const conf = SCENTS[card.dataset.scent];
  return { canvas, ctx: canvas.getContext('2d'), conf, visible: false };
});

function fade(color) { return color.replace(/[\d.]+\)$/, '0)'); }

function drawCard(loop, t) {
  const { ctx, conf, canvas } = loop;
  const w = canvas.width, h = canvas.height;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = conf.base;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = conf.blend;
  for (const b of conf.blobs) {
    const x = w * (b.x + b.ax * Math.sin(t * b.sx + b.ph));
    const y = h * (b.y + b.ay * Math.cos(t * b.sy + b.ph * 1.7));
    const r = w * b.r * (1 + 0.1 * Math.sin(t * 0.31 + b.ph));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, b.c);
    g.addColorStop(1, fade(b.c));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  const sheen = ctx.createLinearGradient(0, 0, 0, h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.14)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
}

/* ------------------------------------------------------- MAGNETIC NAV */
const magnets = [...document.querySelectorAll('.magnetic')].map((el) => ({
  el, tx: 0, ty: 0, cx: 0, cy: 0,
}));
if (!RM) {
  addEventListener('pointermove', (e) => {
    for (const m of magnets) {
      const r = m.el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d < 90) { const f = (1 - d / 90) * 0.42; m.tx = dx * f; m.ty = dy * f; }
      else { m.tx = 0; m.ty = 0; }
    }
  }, { passive: true });
}
function updateMagnets() {
  for (const m of magnets) {
    m.cx = lerp(m.cx, m.tx, 0.14);
    m.cy = lerp(m.cy, m.ty, 0.14);
    if (Math.abs(m.cx) + Math.abs(m.cy) > 0.05) {
      m.el.style.transform = `translate(${m.cx.toFixed(2)}px, ${m.cy.toFixed(2)}px)`;
    } else if (m.el.style.transform) { m.el.style.transform = ''; }
  }
}

/* ----------------------------------------------------------- CARD TILT */
const tilts = [...document.querySelectorAll('.card')].map((card) => {
  const inner = card.querySelector('.card-inner');
  const s = { inner, rx: 0, ry: 0, trx: 0, try: 0, hov: 0, thov: 0, press: 0, tpress: 0 };
  if (!RM) {
    const sheen = card.querySelector('.card-sheen');
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      s.try = nx * 7; s.trx = -ny * 7; s.thov = 1;
      /* liquid-light sheen tracks the real cursor instead of a fixed sweep */
      sheen.style.setProperty('--mx', `${((nx + 0.5) * 100).toFixed(1)}%`);
      sheen.style.setProperty('--my', `${((ny + 0.5) * 100).toFixed(1)}%`);
    });
    card.addEventListener('pointerleave', () => { s.trx = 0; s.try = 0; s.thov = 0; s.tpress = 0; });
    card.addEventListener('pointerdown', () => { s.tpress = 1; });
    card.addEventListener('pointerup', () => { s.tpress = 0; });
  }
  return s;
});
function updateTilts() {
  for (const s of tilts) {
    s.rx = lerp(s.rx, s.trx, 0.1);
    s.ry = lerp(s.ry, s.try, 0.1);
    s.hov = lerp(s.hov, s.thov, 0.1);
    s.press = lerp(s.press, s.tpress, 0.22);
    if (Math.abs(s.rx) + Math.abs(s.ry) + s.hov + s.press > 0.02) {
      const scale = 1 - 0.018 * s.press;
      s.inner.style.transform =
        `rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg) translateY(${(-5 * s.hov).toFixed(2)}px) scale(${scale.toFixed(3)})`;
    } else if (s.inner.style.transform) { s.inner.style.transform = ''; }
  }
}

/* ------------------------------------------------------------ PARALLAX */
const plxEls = [...document.querySelectorAll('[data-plx]')].map((el) => ({
  el, f: parseFloat(el.dataset.plx), top: 0, h: 0,
}));
let plxScroll = 0;
function measurePlx() {
  for (const p of plxEls) {
    p.el.style.transform = '';
    const r = p.el.getBoundingClientRect();
    p.top = r.top + scrollY;
    p.h = r.height;
  }
}
measurePlx();
/* section tops shift when Cormorant/Outfit swap in — re-measure once the
   fonts land (and again on full load) so parallax anchors aren't stale */
if (document.fonts && document.fonts.ready) document.fonts.ready.then(measurePlx);
addEventListener('load', measurePlx);
function updateParallax() {
  plxScroll = lerp(plxScroll, scrollY, 0.09);
  const mid = plxScroll + innerHeight / 2;
  for (const p of plxEls) {
    const off = (mid - (p.top + p.h / 2)) * p.f;
    p.el.style.transform = `translate3d(0, ${off.toFixed(2)}px, 0)`;
  }
}

/* ---------------------------------------------------------- VISIBILITY */
let heroVisible = true;
const visIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.target === heroEl) heroVisible = e.isIntersecting;
    for (const l of cardLoops) if (l.canvas === e.target) l.visible = e.isIntersecting;
  }
});
visIO.observe(heroEl);
for (const l of cardLoops) visIO.observe(l.canvas);

/* -------------------------------------------------------------- REVEAL */
const revIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('in'); revIO.unobserve(e.target); }
  }
}, { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
document.querySelectorAll('.reveal').forEach((el) => revIO.observe(el));

/* ------------------------------------------------------ ACCORD PYRAMID */
const pyramid = document.getElementById('pyramid');
document.querySelectorAll('.tier').forEach((tier) => {
  tier.addEventListener('mouseenter', () => { pyramid.dataset.active = tier.dataset.tier; });
  tier.addEventListener('mouseleave', () => { delete pyramid.dataset.active; });
  /* keyboard parity: tabbing to a register highlights its orbs the same
     way hovering does, and Enter/Space drops the same stone */
  tier.addEventListener('focus', () => { pyramid.dataset.active = tier.dataset.tier; });
  tier.addEventListener('blur', () => { delete pyramid.dataset.active; });
  /* touch the register and its orbs answer — the same "stone in liquid
     light" idea as the hero ripple, carried into the accords section */
  if (!RM) {
    const pulse = () => {
      pyramid.querySelectorAll(`.orb-${tier.dataset.tier}`).forEach((orb) => {
        orb.classList.remove('pulse');
        void orb.offsetWidth;
        orb.classList.add('pulse');
        setTimeout(() => orb.classList.remove('pulse'), 1200);
      });
    };
    tier.addEventListener('click', pulse);
    tier.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pulse(); }
    });
  }
});

/* ------------------------------------------------------------- CURSOR */
const cursorEnabled = !RM && matchMedia('(pointer: fine)').matches;
let updateCursor = () => {};
if (cursorEnabled) {
  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);
  const cp = { x: innerWidth / 2, y: innerHeight / 2 };
  const rp = { x: cp.x, y: cp.y };
  let seen = false;
  addEventListener('pointermove', (e) => {
    cp.x = e.clientX; cp.y = e.clientY;
    dot.style.transform = `translate(${cp.x}px, ${cp.y}px)`;
    /* keep the system arrow until we actually know where the pointer is,
       so the cursor never appears to vanish on load */
    if (!seen) {
      seen = true; rp.x = cp.x; rp.y = cp.y;
      dot.style.opacity = ring.style.opacity = '1';
      document.body.classList.add('custom-cursor');
    }
  }, { passive: true });
  addEventListener('pointerdown', () => ring.classList.add('press'), { passive: true });
  addEventListener('pointerup', () => ring.classList.remove('press'), { passive: true });
  document.addEventListener('mouseover', (e) => {
    ring.classList.toggle('big', !!e.target.closest('a, .card, .tier'));
  });
  document.addEventListener('mouseleave', () => { dot.style.opacity = ring.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { if (seen) dot.style.opacity = ring.style.opacity = '1'; });
  updateCursor = () => {
    rp.x = lerp(rp.x, cp.x, 0.2);
    rp.y = lerp(rp.y, cp.y, 0.2);
    ring.style.transform = `translate(${rp.x}px, ${rp.y}px)`;
  };
}

/* ------------------------------------------------------------ NAV TINT */
const nav = document.getElementById('nav');
addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', scrollY > 40);
}, { passive: true });

/* ----------------------------------------------------------- MAIN LOOP */
let raf = 0, running = false;
function frame(now) {
  raf = requestAnimationFrame(frame);
  const t = now * 0.001;
  if (silk && heroVisible) silk.render(t);
  for (const l of cardLoops) if (l.visible) drawCard(l, t);
  updateMagnets();
  updateTilts();
  updateParallax();
  updateCursor();
}
function start() { if (!running && !RM) { running = true; raf = requestAnimationFrame(frame); } }
function stop() { running = false; cancelAnimationFrame(raf); }
document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

addEventListener('resize', () => {
  if (silk) silk.resize();
  measurePlx();
  if (RM) renderStill();
});

/* reduced motion: render one considered frame of everything, then rest */
function renderStill() {
  if (silk) {
    silk.render(3.4);
  }
  for (const l of cardLoops) drawCard(l, 8.3);
}
if (RM) { renderStill(); } else { start(); }
