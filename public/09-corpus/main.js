// CORPUS — 45,000-particle morphing universe.
// Four formations live in vertex attributes; the GPU interpolates between them
// with per-particle staggered delays so every morph ripples through the body.

import * as THREE from 'three';

/* ---------------------------------------------------------------- setup */

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SMALL = Math.min(innerWidth, innerHeight) < 620 || innerWidth < 760;
const N = SMALL ? 22000 : 45000;
const FLOOR = SMALL ? 14000 : 30000; // adaptive-quality floor
const FSCALE = SMALL ? 0.78 : 1; // formation world scale
const PHI = 0.6180339887498949; // golden-ratio low-discrepancy sequence
const FOV = 60;

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: false, alpha: true, powerPreference: 'high-performance',
});
renderer.setClearColor(0x060614, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 500);

// deterministic rng so every visit is the same universe
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0x09C09909);

/* ------------------------------------------------- formation generators */

// shared structural coordinate u ∈ [0,1): drives ripple delay AND geometry,
// so morphs travel along the knot, out the galaxy, across the word.
const uArr = new Float32Array(N);
for (let i = 0; i < N; i++) uArr[i] = (i * PHI) % 1;

function gauss(r) { // Box–Muller, hand-rolled
  const a = Math.max(r(), 1e-6), b = r();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

function genKnot() {
  const out = new Float32Array(N * 3);
  const P = 2, Q = 3, S = 3.1 * FSCALE, TUBE = 0.85 * FSCALE;
  const curve = (t) => {
    const r = Math.cos(Q * t) + 2;
    return [r * Math.cos(P * t), r * Math.sin(P * t), -Math.sin(Q * t)];
  };
  for (let i = 0; i < N; i++) {
    const t = uArr[i] * Math.PI * 2;
    const c = curve(t), c2 = curve(t + 0.001);
    // Frenet-ish frame: tangent, then any perpendicular pair
    let tx = c2[0] - c[0], ty = c2[1] - c[1], tz = c2[2] - c[2];
    const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    let nx = -ty, ny = tx, nz = 0; // cross(tangent, z-axis)
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
    const ang = rng() * Math.PI * 2, rad = Math.sqrt(rng()) * TUBE;
    const ca = Math.cos(ang) * rad, sa = Math.sin(ang) * rad;
    out[i * 3] = (c[0] * S) + (nx * ca + bx * sa) * S * 0.55;
    out[i * 3 + 1] = (c[2] * S * 1.4) + (nz * ca + bz * sa) * S * 0.55;
    out[i * 3 + 2] = (c[1] * S) + (ny * ca + by * sa) * S * 0.55;
  }
  return out;
}

function genGalaxy() {
  const out = new Float32Array(N * 3);
  const R = 13.5 * FSCALE, ARMS = 3, WIND = 0.42;
  for (let i = 0; i < N; i++) {
    const u = uArr[i];
    if (rng() < 0.14) { // central bulge
      const rr = Math.pow(rng(), 1.6) * 2.6 * FSCALE;
      out[i * 3] = gauss(rng) * rr;
      out[i * 3 + 1] = gauss(rng) * rr * 0.62;
      out[i * 3 + 2] = gauss(rng) * rr;
      continue;
    }
    const r = R * Math.pow(u, 0.62);
    const arm = i % ARMS;
    const spread = 0.34 * Math.exp(-r / (R * 0.62)) + 0.05;
    const theta = arm * (Math.PI * 2 / ARMS) + r * WIND / FSCALE
      + gauss(rng) * spread * 2.2
      + Math.sin(r * 1.7 + arm * 9.1) * 0.08; // arm waviness
    const y = gauss(rng) * (1.3 * Math.exp(-r / (R * 0.45)) + 0.14) * FSCALE;
    out[i * 3] = Math.cos(theta) * r + gauss(rng) * 0.22;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = Math.sin(theta) * r + gauss(rng) * 0.22;
  }
  return out;
}

function genLattice() {
  const out = new Float32Array(N * 3);
  const n = Math.ceil(Math.cbrt(N));
  const side = 19 * FSCALE, cells = n * n * n;
  for (let i = 0; i < N; i++) {
    const idx = Math.min(cells - 1, Math.floor(uArr[i] * cells));
    const gx = Math.floor(idx / (n * n));
    const gy = Math.floor(idx / n) % n;
    const gz = idx % n;
    out[i * 3] = (gx / (n - 1) - 0.5) * side + (rng() - 0.5) * 0.1;
    out[i * 3 + 1] = (gy / (n - 1) - 0.5) * side + (rng() - 0.5) * 0.1;
    out[i * 3 + 2] = (gz / (n - 1) - 0.5) * side + (rng() - 0.5) * 0.1;
  }
  return out;
}

// The word: rasterise "CORPUS" on an offscreen canvas, harvest lit pixels.
function genWord() {
  const lines = SMALL ? ['COR', 'PUS'] : ['CORPUS'];
  const worldW = SMALL ? 14.5 : 32.5; // sized to be the largest formation on
                                       // screen — the sigil is the climax, not an afterthought
  const xBias = SMALL ? 0 : -1.55; // shifted clear of the nav dots at the new, wider scale
  const fs = 240;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.font = `800 ${fs}px "Syne", "Arial Black", sans-serif`;
  try { ctx.letterSpacing = `${fs * 0.02}px`; } catch { /* older engines */ }
  const widths = lines.map((l) => ctx.measureText(l).width);
  const maxW = Math.max(...widths);
  const lineH = fs * 1.04;
  cv.width = Math.ceil(maxW + 80);
  cv.height = Math.ceil(lineH * lines.length + 80);
  ctx.font = `800 ${fs}px "Syne", "Arial Black", sans-serif`;
  try { ctx.letterSpacing = `${fs * 0.02}px`; } catch { /* noop */ }
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, li) => {
    ctx.fillText(l, cv.width / 2, 40 + lineH * (li + 0.5));
  });
  const img = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const pts = [];
  for (let x = 0; x < cv.width; x += 2) { // column-major → u sweeps left→right
    for (let y = 0; y < cv.height; y += 2) {
      if (img[(y * cv.width + x) * 4 + 3] > 140) pts.push(x, y);
    }
  }
  const out = new Float32Array(N * 3);
  if (pts.length < 200) { // font failed: dissolve into a calm disc instead
    for (let i = 0; i < N; i++) {
      const a = uArr[i] * Math.PI * 2, r = Math.sqrt(rng()) * 12 * FSCALE;
      out[i * 3] = Math.cos(a) * r;
      out[i * 3 + 1] = gauss(rng) * 0.6;
      out[i * 3 + 2] = Math.sin(a) * r;
    }
    return out;
  }
  const count = pts.length / 2;
  const scale = worldW / maxW;
  const cx = cv.width / 2, cy = cv.height / 2;
  for (let i = 0; i < N; i++) {
    const k = Math.min(count - 1, Math.floor(uArr[i] * count));
    const px = pts[k * 2] + (rng() - 0.5) * 2.4;
    const py = pts[k * 2 + 1] + (rng() - 0.5) * 2.4;
    out[i * 3] = (px - cx) * scale + xBias;
    out[i * 3 + 1] = (cy - py) * scale;
    out[i * 3 + 2] = (rng() - 0.5) * (SMALL ? 1.5 : 2.2) * FSCALE + gauss(rng) * 0.22;
  }
  return out;
}

/* --------------------------------------------------------- geometry */

const geo = new THREE.BufferGeometry();
const knot = genKnot();
geo.setAttribute('position', new THREE.BufferAttribute(knot, 3)); // required by three
geo.setAttribute('aT0', new THREE.BufferAttribute(knot, 3));
geo.setAttribute('aT1', new THREE.BufferAttribute(genGalaxy(), 3));
geo.setAttribute('aT2', new THREE.BufferAttribute(genLattice(), 3));
geo.setAttribute('aT3', new THREE.BufferAttribute(genGalaxy(), 3)); // placeholder until Syne loads

const delays = new Float32Array(N);
const seeds = new Float32Array(N);
const sizes = new Float32Array(N);
const colors = new Float32Array(N * 3);
const HUES = [
  [0.49, 0.976, 1.0],   // electric ice
  [0.702, 0.616, 1.0],  // violet
  [1.0, 0.431, 0.78],   // pink
];
for (let i = 0; i < N; i++) {
  delays[i] = uArr[i] * 0.86 + rng() * 0.14;
  seeds[i] = rng();
  sizes[i] = 0.075 + Math.pow(rng(), 3.0) * 0.36;
  // Designed color flow: a gradient ice → violet → pink rides the structural
  // coordinate u, so hue travels ALONG the knot / out the galaxy / across the
  // word — with a pinch of random sparkle so it never bands flatly.
  const u = uArr[i];
  const g0 = u < 0.5 ? HUES[0] : HUES[1];
  const g1 = u < 0.5 ? HUES[1] : HUES[2];
  let f = u < 0.5 ? u * 2 : (u - 0.5) * 2;
  f = f * f * (3 - 2 * f);
  const spark = HUES[Math.floor(rng() * 3)];
  const m = rng() * 0.3, br = 0.42 + rng() * 0.5;
  for (let c = 0; c < 3; c++) {
    const base = g0[c] + (g1[c] - g0[c]) * f;
    colors[i * 3 + c] = (base + (spark[c] - base) * m) * br;
  }
}
geo.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1));
geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

const uniforms = {
  uTime: { value: 0 },
  uProgress: { value: 1 },
  uFrom: { value: 0 },
  uTo: { value: 0 },
  uSpawn: { value: REDUCED ? 1 : 0 },
  uWellPos: { value: new THREE.Vector3(0, 0, 999) },
  uWell: { value: 0 },
  uPixelScale: { value: 800 },
  uDrift: { value: REDUCED ? 0 : 0.12 },
  uArc: { value: REDUCED ? 0 : 1.5 },
  uTwinkle: { value: REDUCED ? 0.05 : 0.2 },
  uExposure: { value: SMALL ? 0.72 : 0.56 }, // tame additive blow-out so hue survives the core
  uCamAz: { value: 0 }, // current camera azimuth — keeps the flat word sigil face-on
  uSwirl: { value: REDUCED ? 0 : 1 }, // galaxy differential rotation gate
  uShockPos: { value: new THREE.Vector3(0, 0, 0) },
  uShockT: { value: 9 },   // seconds since last shock; 9 ≈ fully decayed
  uShockAmp: { value: 0 },
};
const BASE_EXPOSURE = uniforms.uExposure.value;

const VERT = /* glsl */`
attribute vec3 aT0; attribute vec3 aT1; attribute vec3 aT2; attribute vec3 aT3;
attribute float aDelay; attribute float aSeed; attribute float aSize;
attribute vec3 aColor;
uniform float uTime, uProgress, uSpawn, uWell, uPixelScale, uDrift, uArc, uTwinkle, uCamAz, uExposure, uSwirl;
uniform float uShockT, uShockAmp;
uniform int uFrom, uTo;
uniform vec3 uWellPos, uShockPos;
varying vec3 vColor;

// the word sigil is a flat plane in XY; the camera orbits in azimuth, so
// left un-rotated it goes edge-on (unreadable) for most of every lap.
// Counter-spin it by the camera's current azimuth so it always faces the
// viewer, like a sign that turns to keep looking at you.
vec3 faceCam(vec3 v, float a) {
  float s = sin(a), c = cos(a);
  return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
}

// the galaxy is never still: solid-body spin plus an oscillating differential
// shear (stronger toward the core) so the arms wind and unwind on a ~57s
// breath — alive at any moment of a capture, never smearing itself away.
vec3 swirl(vec3 v) {
  float r = length(v.xz);
  float a = (uTime * 0.07 + sin(uTime * 0.11) * 0.9 / (1.0 + 0.45 * r)) * uSwirl;
  float s = sin(a), c = cos(a);
  return vec3(v.x * c - v.z * s, v.y, v.x * s + v.z * c);
}

vec3 pick(int f) {
  if (f == 0) return aT0;
  if (f == 1) return swirl(aT1);
  if (f == 2) return aT2;
  return faceCam(aT3, uCamAz);
}

void main() {
  // staggered morph: each particle departs on its own delay, quintic-eased
  float STG = 0.62;
  float t = clamp(uProgress * (1.0 + STG) - aDelay * STG, 0.0, 1.0);
  float e = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  vec3 p = mix(pick(uFrom), pick(uTo), e);

  // mid-flight arc so travel curls instead of tracing straight lines
  float arc = sin(e * 3.14159265) * uArc;
  p += vec3(sin(aSeed * 61.0 + e * 7.0),
            cos(aSeed * 47.0 + e * 5.0),
            sin(aSeed * 29.0 - e * 6.0)) * arc;

  // ambient breathing drift
  p += vec3(sin(uTime * 0.62 + aSeed * 37.0),
            sin(uTime * 0.50 + aSeed * 59.0),
            sin(uTime * 0.71 + aSeed * 23.0)) * uDrift;

  // birth: condense from a scattered shell
  float sp = clamp(uSpawn * 1.7 - aDelay * 0.7, 0.0, 1.0);
  sp = sp * sp * (3.0 - 2.0 * sp);
  vec3 sdir = normalize(vec3(sin(aSeed * 127.1), sin(aSeed * 269.5) - 0.4, cos(aSeed * 191.3)) + 0.001);
  p = mix(sdir * (26.0 + fract(aSeed * 7.31) * 34.0), p, sp);

  // shockwave: a luminous ring racing outward through the body — fired when
  // a held scatter is released (from the pointer) and softly on every morph
  // arrival (from the core). Particles the ring passes are shoved and lit.
  vec3 ds = p - uShockPos;
  float sd = length(ds);
  float ring = exp(-pow((sd - uShockT * 24.0) / 2.3, 2.0));
  float shock = ring * exp(-uShockT * 1.7) * uShockAmp;
  p += (ds / max(sd, 0.5)) * shock * 2.1;

  // gravity well: inverse-square shove away from the pointer ray
  vec3 dw = p - uWellPos;
  float d2 = dot(dw, dw);
  p += (dw / sqrt(d2 + 0.01)) * (uWell / (d2 * 0.32 + 3.0));

  // the sigil is the punchline — the body spelling its own name should feel
  // as weighty as a knot or a galaxy, not thinner. Sprites swell and light
  // up while formation 3 is on screen (from *or* to, cross-fading with e)
  // so the boost rides the morph instead of popping in.
  float wIsFrom = 1.0 - min(1.0, abs(float(uFrom) - 3.0));
  float wIsTo = 1.0 - min(1.0, abs(float(uTo) - 3.0));
  float wordAmt = mix(wIsFrom, wIsTo, e);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uPixelScale / dist * (1.0 + 0.34 * wordAmt), 1.0, 78.0);

  float fog = exp(-pow(dist * 0.016, 2.0));
  float tw = 1.0 + uTwinkle * sin(uTime * (1.5 + aSeed * 2.5) + aSeed * 93.0);
  vColor = (aColor * fog * tw * (0.2 + 0.8 * sp) + vec3(0.5, 0.68, 1.0) * shock * 0.5)
           * uExposure * (1.0 + 0.22 * wordAmt);
}
`;

const FRAG = /* glsl */`
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d2 = dot(c, c);
  if (d2 > 0.25) discard;           // soft round sprite via discard
  float a = smoothstep(0.25, 0.0, d2);
  gl_FragColor = vec4(vColor * a * a, 1.0);
}
`;

const mat = new THREE.ShaderMaterial({
  uniforms, vertexShader: VERT, fragmentShader: FRAG,
  transparent: true, depthWrite: false, depthTest: false,
  blending: THREE.AdditiveBlending,
});
const points = new THREE.Points(geo, mat);
points.frustumCulled = false;
scene.add(points);

/* --------------------------------------------------- background stars */

{
  const SN = SMALL ? 350 : 700;
  const sPos = new Float32Array(SN * 3);
  const sSeed = new Float32Array(SN);
  const sSize = new Float32Array(SN);
  for (let i = 0; i < SN; i++) {
    const r = 90 + rng() * 110;
    const th = rng() * Math.PI * 2, ph = Math.acos(rng() * 2 - 1);
    sPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    sPos[i * 3 + 1] = r * Math.cos(ph);
    sPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    sSeed[i] = rng();
    sSize[i] = 0.35 + rng() * 0.8;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sg.setAttribute('aSeed', new THREE.BufferAttribute(sSeed, 1));
  sg.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
  const sm = new THREE.ShaderMaterial({
    uniforms: { uTime: uniforms.uTime, uPixelScale: uniforms.uPixelScale, uTwinkle: uniforms.uTwinkle },
    vertexShader: /* glsl */`
      attribute float aSeed; attribute float aSize;
      uniform float uTime, uPixelScale, uTwinkle;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(aSize * uPixelScale / max(0.1, -mv.z), 1.0, 4.0);
        vA = 0.35 + 0.3 * sin(uTime * (0.3 + aSeed * 0.8) + aSeed * 77.0) * (uTwinkle * 5.0);
      }
    `,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d2 = dot(c, c);
        if (d2 > 0.25) discard;
        float a = smoothstep(0.25, 0.0, d2);
        gl_FragColor = vec4(vec3(0.62, 0.68, 0.9) * a * vA, 1.0);
      }
    `,
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(sg, sm);
  stars.frustumCulled = false;
  stars.renderOrder = -1;
  scene.add(stars);
}

/* --------------------------------------------------------- morph state */

const state = {
  from: 0, to: 0, p: 1,
  speed: 1 / (REDUCED ? 1.4 : 2.8),
  pending: -1,
  auto: 0,
};

// Per-formation camera clearance: the galaxy's disc is wider than the knot's
// tube-radius silhouette and was crowding the copy column (the "n" of
// "billion" sat inside its outer arm). Rather than shrink the galaxy itself,
// the rig eases a touch farther back while it's on screen — a wide shot for
// the widest body — so every formation keeps the same clean margin.
const CLEARANCE = [1, 1.22, 1, 1.05];
function ease5(x) { return x * x * x * (x * (x * 6 - 15) + 10); }

const CYCLE = 9; // seconds each formation holds before the loop moves on
const cycleBar = document.getElementById('cycleBar');
const headlines = [...document.querySelectorAll('.headline')];
const decks = [...document.querySelectorAll('.deck')];
const fbtns = [...document.querySelectorAll('.fbtn')];
const formIndexEl = document.getElementById('formIndex');
const ACCENTS = ['#7DF9FF', '#B39DFF', '#FF6EC7', '#EDEFFF'];

function setActiveUI(i) {
  // the UI wears the active formation's color: kicker + cycle bar re-tint
  document.documentElement.style.setProperty('--fa', ACCENTS[i]);
  headlines.forEach((h) => h.classList.toggle('is-active', +h.dataset.f === i));
  decks.forEach((d) => d.classList.toggle('is-active', +d.dataset.f === i));
  fbtns.forEach((b) => {
    const on = +b.dataset.f === i;
    b.classList.toggle('is-active', on);
    if (on) b.setAttribute('aria-current', 'true');
    else b.removeAttribute('aria-current');
  });
  formIndexEl.textContent = String(i + 1).padStart(2, '0');
}

function startMorph(i) {
  state.from = state.to;
  state.to = i;
  state.p = 0;
  state.speed = 1 / (REDUCED ? 1.4 : 2.8);
  uniforms.uFrom.value = state.from;
  uniforms.uTo.value = state.to;
  setActiveUI(i);
}

function goTo(i) {
  state.auto = 0;
  if (i === state.to) return;
  if (state.p < 1) {
    state.pending = i;
    state.speed = 1 / 0.6; // fast-forward the in-flight morph
  } else {
    startMorph(i);
  }
}

fbtns.forEach((b) => b.addEventListener('click', () => goTo(+b.dataset.f)));
addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '4') goTo(+e.key - 1);
  else if (e.key === 'ArrowRight') goTo((state.to + 1) % 4);
  else if (e.key === 'ArrowLeft') goTo((state.to + 3) % 4);
});

/* -------------------------------------------------------- word target */

(async () => {
  try {
    await Promise.race([
      document.fonts.load('800 240px "Syne"'),
      new Promise((res) => setTimeout(res, 3000)),
    ]);
  } catch { /* offline: fallback font still samples */ }
  geo.getAttribute('aT3').array.set(genWord());
  geo.getAttribute('aT3').needsUpdate = true;
})();

/* ------------------------------------------------------ pointer / well */

const ndc = new THREE.Vector2(0, -2); // offscreen until first move
const ray = new THREE.Raycaster();
const wellTarget = new THREE.Vector3(0, 0, 999);
let wellPower = 0, wellGoal = 0, pressed = false, pressAt = 0;
let pressX = 0, pressY = 0, pressType = 'mouse';
let shockKick = 0; // decaying camera impulse fired with each shockwave

const cursorEl = document.getElementById('cursor');
const stageCopyEl = document.querySelector('.stage-copy');
const formnavEl = document.querySelector('.formnav');
const metaEl = document.querySelector('.meta');
const FINE = matchMedia('(pointer: fine)').matches;
// the ring trails the pointer on a spring — it has weight, not just position
const cur = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };

function triggerShock(amp) {
  uniforms.uShockPos.value.copy(uniforms.uWellPos.value.z > 500
    ? new THREE.Vector3(0, 0, 0) : uniforms.uWellPos.value);
  uniforms.uShockT.value = 0;
  uniforms.uShockAmp.value = REDUCED ? amp * 0.35 : amp;
  shockKick = Math.min(1.4, amp * 0.55); // the camera feels the blast too
}

function onMove(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  wellGoal = pressed ? 34 : 4;
  cur.tx = e.clientX; cur.ty = e.clientY;
  if (FINE) cursorEl.classList.add('is-on');
}
addEventListener('pointermove', onMove, { passive: true });
addEventListener('pointerdown', (e) => {
  pressed = true; wellGoal = 34; pressAt = performance.now(); onMove(e);
  pressX = e.clientX; pressY = e.clientY; pressType = e.pointerType;
  cursorEl.classList.remove('is-shock');
  cursorEl.classList.add('is-down');
});
addEventListener('pointerup', (e) => {
  pressed = false; wellGoal = 4;
  cursorEl.classList.remove('is-down');
  // touch: a quick flick walks the formations (left/up = next, right/down = back)
  const dx = e.clientX - pressX, dy = e.clientY - pressY;
  const dur = performance.now() - pressAt;
  if (pressType === 'touch' && dur < 600 && Math.hypot(dx, dy) > 70) {
    const axis = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    goTo((state.to + (axis < 0 ? 1 : 3)) % 4);
    return; // a swipe, not a held scatter
  }
  // a held scatter earns its payoff: the recall shockwave
  const wasUI = e.target.closest && e.target.closest('a, button');
  if (!wasUI && performance.now() - pressAt > 220 && wellPower > 14) {
    triggerShock(2.6);
    cursorEl.classList.remove('is-shock');
    void cursorEl.offsetWidth; // restart the flash animation
    cursorEl.classList.add('is-shock');
  }
});
document.documentElement.addEventListener('pointerleave', () => {
  wellGoal = 0; ndc.set(0, -2);
  cursorEl.classList.remove('is-on');
});
// cursor knows what it's over: swells into a halo on interactive elements
document.addEventListener('pointerover', (e) => {
  cursorEl.classList.toggle('is-link', !!(e.target.closest && e.target.closest('a, button')));
});

// the page doesn't scroll — so the wheel walks the formations instead
let wheelLock = 0;
addEventListener('wheel', (e) => {
  const now = performance.now();
  if (now - wheelLock < 1000 || Math.abs(e.deltaY) < 10) return;
  wheelLock = now;
  goTo((state.to + (e.deltaY > 0 ? 1 : 3)) % 4);
}, { passive: true });

/* ------------------------------------------------------------- sizing */

let camDist = 34;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); // DPR cap
  renderer.setSize(w, h);
  camera.aspect = w / h;
  const R = (SMALL ? 15.5 : 16.5) * FSCALE;
  const halfFov = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  camDist = Math.max(R / halfFov, R / (halfFov * camera.aspect)) + 8;

  // Off-center framing (a lens-shift, via setViewOffset) so the body sits
  // clear of the copy block instead of dead-center behind it: shifted right
  // on wide screens (text owns the left column), shifted up on narrow ones
  // (text owns the bottom). Also reads as a tighter, less empty composition.
  if (SMALL) {
    const K = 1.34;
    const fullH = h * K;
    camera.setViewOffset(w, fullH, 0, fullH * 0.5 - h * 0.27, w, h);
  } else {
    const K = 1.34;
    camera.setViewOffset(w * K, h, 0, 0, w, h);
  }

  camera.updateProjectionMatrix();
  // read the true vertical scale off the (possibly offset) projection matrix
  // rather than re-deriving it, so the lens-shift above can't desync sizes.
  uniforms.uPixelScale.value = renderer.domElement.height * camera.projectionMatrix.elements[5] / 2;
}
addEventListener('resize', resize);
resize();

/* ----------------------------------------------------- stats & quality */

const statFps = document.getElementById('statFps');
const statCount = document.getElementById('statCount');
let frames = 0, qualityLevel = 0, drawCount = N;
const fpsLog = [];

setInterval(() => {
  if (document.hidden) { frames = 0; return; }
  if (uniforms.uSpawn.value < 1) { frames = 0; return; } // skip cold-start samples
  const fps = frames * 2;
  frames = 0;
  statFps.textContent = String(Math.min(120, fps));
  fpsLog.push(fps);
  if (fpsLog.length > 4) fpsLog.shift();
  const avg = fpsLog.reduce((a, b) => a + b, 0) / fpsLog.length;
  if (fpsLog.length === 4 && avg < 40 && qualityLevel < 2) {
    qualityLevel++;
    drawCount = Math.max(FLOOR, Math.floor(N * (1 - qualityLevel * 0.2)));
    geo.setDrawRange(0, drawCount);
    statCount.textContent = drawCount.toLocaleString('en-US');
    fpsLog.length = 0;
  }
}, 500);
statCount.textContent = N.toLocaleString('en-US');

/* ---------------------------------------------------------- main loop */

const clock = { last: performance.now(), t: 0 };
let raf = 0, running = false;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const rdt = (now - clock.last) / 1000;
  const dt = Math.min(0.05, rdt);   // visual noise clock: never jumps
  const cdt = Math.min(0.34, rdt);  // choreography clock: wall-paced, so the
  clock.last = now;                 // intro, morphs & cycle keep real time
  clock.t += dt;                    // even when a slow GPU drops frames
  const t = clock.t;

  uniforms.uTime.value = t;

  // birth
  if (uniforms.uSpawn.value < 1) {
    uniforms.uSpawn.value = Math.min(1, uniforms.uSpawn.value + cdt / 3.2);
  }

  // morph progress + queued retarget
  if (state.p < 1) {
    state.p = Math.min(1, state.p + cdt * state.speed);
    if (state.p >= 1) {
      if (state.pending >= 0) {
        const q = state.pending; state.pending = -1;
        startMorph(q);
      } else if (!REDUCED && uniforms.uSpawn.value >= 1) {
        // arrival pulse: the settled body rings once, from the core
        uniforms.uShockPos.value.set(0, 0, 0);
        uniforms.uShockT.value = 0;
        uniforms.uShockAmp.value = 1.05;
        shockKick = Math.max(shockKick, 0.45);
      }
    }
  } else if (!REDUCED) {
    state.auto += cdt;
    if (state.auto > CYCLE && uniforms.uSpawn.value >= 1) goTo((state.to + 1) % 4);
  }
  uniforms.uProgress.value = state.p;

  // cycle bar: fills over the dwell, drains during the morph
  if (cycleBar && !REDUCED) {
    const cyc = state.p < 1 ? 0 : Math.min(1, state.auto / CYCLE);
    cycleBar.style.transform = `scaleX(${cyc.toFixed(4)})`;
  }

  // shock clock + decaying camera impulse
  if (uniforms.uShockT.value < 8) uniforms.uShockT.value += cdt;
  shockKick *= Math.exp(-cdt * 2.6);
  const kick = REDUCED ? 0 : shockKick;

  // morph flare: exposure swells and the camera leans in mid-flight,
  // so every transition reads as a breath — inhale, travel, settle.
  // A shockwave adds its own bloom on top: the blast overexposes for a beat.
  const flare = state.p < 1 ? Math.sin(Math.PI * state.p) : 0;
  uniforms.uExposure.value = BASE_EXPOSURE * (1 + (REDUCED ? 0 : 0.22) * flare + 0.3 * kick);

  // camera: slow orbit + gentle bob (+ morph dolly + shock recoil)
  const az = REDUCED ? 0.55 : t * 0.05 + 0.55;
  const el = REDUCED ? 0.28 : 0.26 + Math.sin(t * 0.07) * 0.16;
  const ce = ease5(state.p);
  const clearance = CLEARANCE[state.from] + (CLEARANCE[state.to] - CLEARANCE[state.from]) * ce;
  const cd = camDist * clearance * (1 - (REDUCED ? 0 : 0.055) * flare - 0.04 * Math.min(1.2, kick));
  camera.position.set(
    cd * Math.cos(el) * Math.sin(az),
    cd * Math.sin(el),
    cd * Math.cos(el) * Math.cos(az),
  );
  if (kick > 0.02) { // the blast rattles the rig, then settles
    const s = kick * 0.2;
    camera.position.x += Math.sin(t * 31.0) * s;
    camera.position.y += Math.sin(t * 27.0 + 1.7) * s * 0.7;
  }
  camera.lookAt(0, 0.4, 0);
  uniforms.uCamAz.value = az;

  // gravity well: closest point on the pointer ray to the origin
  if (ndc.y > -1.5) {
    ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    wellTarget.copy(o).addScaledVector(d, -o.dot(d));
    uniforms.uWellPos.value.lerp(wellTarget, 1 - Math.exp(-dt * 10));
  }
  wellPower += (wellGoal - wellPower) * (1 - Math.exp(-dt * (pressed ? 9 : 4)));
  uniforms.uWell.value = wellPower;

  // cursor spring: the ring chases the pointer with a touch of lag
  if (FINE) {
    const k = 1 - Math.exp(-dt * 22);
    cur.x += (cur.tx - cur.x) * k;
    cur.y += (cur.ty - cur.y) * k;
    cursorEl.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0)`;
    // pointer parallax: copy drifts against the cursor, nav & meta with it —
    // the UI floats in the same space as the body. CSS `translate` property,
    // so it never fights the entrance-animation transforms.
    if (!REDUCED) {
      const px = cur.x / innerWidth - 0.5, py = cur.y / innerHeight - 0.5;
      stageCopyEl.style.translate = `${(-px * 10).toFixed(2)}px ${(-py * 7).toFixed(2)}px`;
      formnavEl.style.translate = `${(px * 7).toFixed(2)}px ${(py * 5).toFixed(2)}px`;
      metaEl.style.translate = `${(px * 6).toFixed(2)}px ${(py * 4).toFixed(2)}px`;
    }
  }

  renderer.render(scene, camera);
  frames++;
}

function start() {
  if (running) return;
  running = true;
  clock.last = performance.now();
  raf = requestAnimationFrame(frame);
}
function stop() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(raf);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop(); else start();
});
start();
