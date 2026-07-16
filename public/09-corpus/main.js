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
  const P = 2, Q = 3, S = 3.1 * FSCALE, TUBE = 1.15 * FSCALE;
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
  const worldW = SMALL ? 13.5 : 26;
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
    out[i * 3] = (px - cx) * scale;
    out[i * 3 + 1] = (cy - py) * scale;
    out[i * 3 + 2] = (rng() - 0.5) * 1.5 * FSCALE + gauss(rng) * 0.18;
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
  sizes[i] = 0.085 + Math.pow(rng(), 2.6) * 0.42;
  const w = rng();
  const a = HUES[w < 0.44 ? 0 : w < 0.78 ? 1 : 2];
  const b = HUES[Math.floor(rng() * 3)];
  const m = rng() * 0.4, br = 0.5 + rng() * 0.55;
  colors[i * 3] = (a[0] + (b[0] - a[0]) * m) * br;
  colors[i * 3 + 1] = (a[1] + (b[1] - a[1]) * m) * br;
  colors[i * 3 + 2] = (a[2] + (b[2] - a[2]) * m) * br;
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
  uCamAz: { value: 0 }, // current camera azimuth — keeps the flat word sigil face-on
};

const VERT = /* glsl */`
attribute vec3 aT0; attribute vec3 aT1; attribute vec3 aT2; attribute vec3 aT3;
attribute float aDelay; attribute float aSeed; attribute float aSize;
attribute vec3 aColor;
uniform float uTime, uProgress, uSpawn, uWell, uPixelScale, uDrift, uArc, uTwinkle, uCamAz;
uniform int uFrom, uTo;
uniform vec3 uWellPos;
varying vec3 vColor;

// the word sigil is a flat plane in XY; the camera orbits in azimuth, so
// left un-rotated it goes edge-on (unreadable) for most of every lap.
// Counter-spin it by the camera's current azimuth so it always faces the
// viewer, like a sign that turns to keep looking at you.
vec3 faceCam(vec3 v, float a) {
  float s = sin(a), c = cos(a);
  return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
}

vec3 pick(int f) {
  if (f == 0) return aT0;
  if (f == 1) return aT1;
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

  // gravity well: inverse-square shove away from the pointer ray
  vec3 dw = p - uWellPos;
  float d2 = dot(dw, dw);
  p += (dw / sqrt(d2 + 0.01)) * (uWell / (d2 * 0.32 + 3.0));

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uPixelScale / dist, 1.0, 90.0);

  float fog = exp(-pow(dist * 0.016, 2.0));
  float tw = 1.0 + uTwinkle * sin(uTime * (1.5 + aSeed * 2.5) + aSeed * 93.0);
  vColor = aColor * fog * tw * (0.2 + 0.8 * sp);
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

const headlines = [...document.querySelectorAll('.headline')];
const decks = [...document.querySelectorAll('.deck')];
const fbtns = [...document.querySelectorAll('.fbtn')];
const formIndexEl = document.getElementById('formIndex');

function setActiveUI(i) {
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
let wellPower = 0, wellGoal = 0, pressed = false;

const cursorEl = document.getElementById('cursor');
const FINE = matchMedia('(pointer: fine)').matches;

function onMove(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  wellGoal = pressed ? 34 : 4;
  if (FINE) {
    cursorEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    cursorEl.classList.add('is-on');
  }
}
addEventListener('pointermove', onMove, { passive: true });
addEventListener('pointerdown', (e) => {
  pressed = true; wellGoal = 34; onMove(e);
  cursorEl.classList.add('is-down');
});
addEventListener('pointerup', () => {
  pressed = false; wellGoal = 4;
  cursorEl.classList.remove('is-down');
});
document.documentElement.addEventListener('pointerleave', () => {
  wellGoal = 0; ndc.set(0, -2);
  cursorEl.classList.remove('is-on');
});

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
  const dt = Math.min(0.05, (now - clock.last) / 1000);
  clock.last = now;
  clock.t += dt;
  const t = clock.t;

  uniforms.uTime.value = t;

  // birth
  if (uniforms.uSpawn.value < 1) {
    uniforms.uSpawn.value = Math.min(1, uniforms.uSpawn.value + dt / 3.2);
  }

  // morph progress + queued retarget
  if (state.p < 1) {
    state.p = Math.min(1, state.p + dt * state.speed);
    if (state.p >= 1 && state.pending >= 0) {
      const q = state.pending; state.pending = -1;
      startMorph(q);
    }
  } else if (!REDUCED) {
    state.auto += dt;
    if (state.auto > 9 && uniforms.uSpawn.value >= 1) goTo((state.to + 1) % 4);
  }
  uniforms.uProgress.value = state.p;

  // camera: slow orbit + gentle bob
  const az = REDUCED ? 0.55 : t * 0.05 + 0.55;
  const el = REDUCED ? 0.28 : 0.26 + Math.sin(t * 0.07) * 0.16;
  camera.position.set(
    camDist * Math.cos(el) * Math.sin(az),
    camDist * Math.sin(el),
    camDist * Math.cos(el) * Math.cos(az),
  );
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
