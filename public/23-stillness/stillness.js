/* STILLNESS — a breathing instrument
   Raw WebGL fragment-shader gradient (hand-rolled simplex/fbm noise, no library)
   + a choreographed 4-7-8 breathing ring driven by a single requestAnimationFrame clock. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * Palettes — each set runs light/warm (index 0) toward deep (index 3),
   * which also drives the adaptive-ink luminance read.
   * ------------------------------------------------------------------ */
  var PALETTES_HEX = {
    dawn: ['#F6E7D8', '#F0C2C6', '#D3B2E3', '#D9C1E8'],
    sea:  ['#CFE8E0', '#9ED2C4', '#7FB5A6', '#173935'],
    dusk: ['#E8C1B0', '#C48CA6', '#8E7CC3', '#2E2A4F']
  };
  var PALETTE_ORDER = ['dawn', 'sea', 'dusk'];
  var AUTO_CYCLE_MS = 40000;
  var CROSSFADE_MS = 7000;

  var PHASE_MS = { inhale: 4000, hold: 7000, exhale: 8000 };
  var PHASE_WORD = { inhale: 'inhale', hold: 'hold', exhale: 'exhale' };

  var RING_MIN = 58, RING_MAX = 126, ARC_R = 134, TRACK_R = 140;
  var ARC_C = 2 * Math.PI * ARC_R;
  var IDLE_BASE = 64, IDLE_AMP = 7, IDLE_PERIOD = 6.4;
  var SHIMMER_AMP = 2.4, SHIMMER_PERIOD = 1.9;
  var DISSOLVE_MS = 900, SETTLE_MS = 460, COMPLETE_PAUSE_MS = 2800;

  function hexToRgb01(hex) {
    var h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16) / 255,
      parseInt(h.substring(2, 4), 16) / 255,
      parseInt(h.substring(4, 6), 16) / 255
    ];
  }
  var PALETTES = {};
  PALETTE_ORDER.forEach(function (name) {
    PALETTES[name] = PALETTES_HEX[name].map(hexToRgb01);
  });

  function relLuma(c) { return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpColors(from, to, t, out) {
    for (var i = 0; i < 4; i++) {
      out[i][0] = lerp(from[i][0], to[i][0], t);
      out[i][1] = lerp(from[i][1], to[i][1], t);
      out[i][2] = lerp(from[i][2], to[i][2], t);
    }
    return out;
  }
  function cloneSet(set) { return set.map(function (c) { return c.slice(); }); }

  /* ---------------------------------------------------------------------
   * Hand-rolled cubic-bezier easing (Newton-Raphson solve, CSS-style).
   * ------------------------------------------------------------------ */
  function makeBezier(x1, y1, x2, y2) {
    function A(a1, a2) { return 1 - 3 * a2 + 3 * a1; }
    function B(a1, a2) { return 3 * a2 - 6 * a1; }
    function C(a1) { return 3 * a1; }
    function calc(t, a1, a2) { return ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t; }
    function slope(t, a1, a2) { return 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1); }
    function solveT(x) {
      var t = x;
      for (var i = 0; i < 8; i++) {
        var s = slope(t, x1, x2);
        if (Math.abs(s) < 1e-6) break;
        t -= (calc(t, x1, x2) - x) / s;
      }
      return t;
    }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      return calc(solveT(x), y1, y2);
    };
  }
  var easeBreath = makeBezier(0.37, 0.0, 0.63, 1.0);
  var easePalette = makeBezier(0.45, 0.0, 0.2, 1.0);

  /* ---------------------------------------------------------------------
   * WebGL — raw context, no library.
   * ------------------------------------------------------------------ */
  var VERT_SRC = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG_SRC = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'varying vec2 vUv;',
    'uniform vec2 uResolution;',
    'uniform float uTime;',
    'uniform float uStatic;',
    'uniform vec3 uColor0;',
    'uniform vec3 uColor1;',
    'uniform vec3 uColor2;',
    'uniform vec3 uColor3;',

    'vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }',
    'vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }',
    'vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }',
    'vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }',

    'float snoise(vec3 v){',
    '  const vec2 C = vec2(1.0/6.0, 1.0/3.0);',
    '  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);',
    '  vec3 i  = floor(v + dot(v, C.yyy));',
    '  vec3 x0 = v - i + dot(i, C.xxx);',
    '  vec3 g = step(x0.yzx, x0.xyz);',
    '  vec3 l = 1.0 - g;',
    '  vec3 i1 = min(g.xyz, l.zxy);',
    '  vec3 i2 = max(g.xyz, l.zxy);',
    '  vec3 x1 = x0 - i1 + C.xxx;',
    '  vec3 x2 = x0 - i2 + C.yyy;',
    '  vec3 x3 = x0 - D.yyy;',
    '  i = mod289(i);',
    '  vec4 p = permute(permute(permute(',
    '            i.z + vec4(0.0, i1.z, i2.z, 1.0))',
    '          + i.y + vec4(0.0, i1.y, i2.y, 1.0))',
    '          + i.x + vec4(0.0, i1.x, i2.x, 1.0));',
    '  float n_ = 0.142857142857;',
    '  vec3 ns = n_ * D.wyz - D.xzx;',
    '  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);',
    '  vec4 x_ = floor(j * ns.z);',
    '  vec4 y_ = floor(j - 7.0 * x_);',
    '  vec4 x = x_ * ns.x + ns.yyyy;',
    '  vec4 y = y_ * ns.x + ns.yyyy;',
    '  vec4 h = 1.0 - abs(x) - abs(y);',
    '  vec4 b0 = vec4(x.xy, y.xy);',
    '  vec4 b1 = vec4(x.zw, y.zw);',
    '  vec4 s0 = floor(b0) * 2.0 + 1.0;',
    '  vec4 s1 = floor(b1) * 2.0 + 1.0;',
    '  vec4 sh = -step(h, vec4(0.0));',
    '  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;',
    '  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;',
    '  vec3 p0 = vec3(a0.xy, h.x);',
    '  vec3 p1 = vec3(a0.zw, h.y);',
    '  vec3 p2 = vec3(a1.xy, h.z);',
    '  vec3 p3 = vec3(a1.zw, h.w);',
    '  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));',
    '  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;',
    '  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);',
    '  m = m * m;',
    '  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));',
    '}',

    'float fbm(vec3 p){',
    '  float sum = 0.0;',
    '  float amp = 0.5;',
    '  for(int i = 0; i < 4; i++){',
    '    sum += amp * snoise(p);',
    '    p *= 2.02;',
    '    amp *= 0.55;',
    '  }',
    '  return sum;',
    '}',

    'float hash(vec2 p){',
    '  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);',
    '}',

    'void main(){',
    '  vec2 res = uResolution;',
    '  vec2 uv = gl_FragCoord.xy / res.xy;',
    '  vec2 p = (uv - 0.5) * vec2(res.x/res.y, 1.0) + 0.5;',
    '  float t = uTime * 0.018;',

    '  vec2 warp = vec2(',
    '    fbm(vec3(p * 1.4, t * 0.55)),',
    '    fbm(vec3(p * 1.4 + 19.0, t * 0.55))',
    '  );',
    '  vec3 samplePos = vec3(p * 1.1 + warp * 0.4, t);',

    '  float n1 = fbm(samplePos);',
    '  float n2 = fbm(samplePos * 1.7 + 8.0);',
    '  float band = clamp(n1 * 0.5 + 0.5, 0.0, 1.0);',

    '  vec3 col = mix(uColor0, uColor1, smoothstep(0.0, 0.5, band));',
    '  col = mix(col, uColor2, smoothstep(0.32, 0.72, band));',
    '  col = mix(col, uColor3, smoothstep(0.58, 1.0, band + n2 * 0.12));',

    '  col += 0.025 * (1.0 - uv.y) * vec3(1.0, 0.97, 0.92);',

    '  float d = length(uv - 0.5) * 1.15;',
    '  float vig = smoothstep(1.15, 0.25, d);',
    '  col *= mix(0.9, 1.02, vig);',

    '  float seed = uStatic > 0.5 ? 0.0 : uTime * 55.0;',
    '  float g = hash(gl_FragCoord.xy + seed) - 0.5;',
    '  col += g * 0.018;',

    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  var gl = null, glProgram = null, glUniforms = {}, canvas = null;

  function compileShader(src, type) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function initGL() {
    canvas = document.getElementById('glcanvas');
    if (!canvas || !window.WebGLRenderingContext) return false;
    try {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' }) ||
           canvas.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) return false;

    var vs = compileShader(VERT_SRC, gl.VERTEX_SHADER);
    var fs = compileShader(FRAG_SRC, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return false;

    glProgram = gl.createProgram();
    gl.attachShader(glProgram, vs);
    gl.attachShader(glProgram, fs);
    gl.linkProgram(glProgram);
    if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) return false;

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(glProgram, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    glUniforms.uResolution = gl.getUniformLocation(glProgram, 'uResolution');
    glUniforms.uTime = gl.getUniformLocation(glProgram, 'uTime');
    glUniforms.uStatic = gl.getUniformLocation(glProgram, 'uStatic');
    glUniforms.uColor0 = gl.getUniformLocation(glProgram, 'uColor0');
    glUniforms.uColor1 = gl.getUniformLocation(glProgram, 'uColor1');
    glUniforms.uColor2 = gl.getUniformLocation(glProgram, 'uColor2');
    glUniforms.uColor3 = gl.getUniformLocation(glProgram, 'uColor3');

    gl.useProgram(glProgram);
    return true;
  }

  function resizeCanvas() {
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.floor(window.innerWidth * dpr));
    var h = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      if (gl) gl.viewport(0, 0, w, h);
    }
  }

  function drawGradient(colors, timeVal, isStatic) {
    if (!gl) return;
    gl.uniform2f(glUniforms.uResolution, canvas.width, canvas.height);
    gl.uniform1f(glUniforms.uTime, timeVal);
    gl.uniform1f(glUniforms.uStatic, isStatic ? 1 : 0);
    gl.uniform3f(glUniforms.uColor0, colors[0][0], colors[0][1], colors[0][2]);
    gl.uniform3f(glUniforms.uColor1, colors[1][0], colors[1][1], colors[1][2]);
    gl.uniform3f(glUniforms.uColor2, colors[2][0], colors[2][1], colors[2][2]);
    gl.uniform3f(glUniforms.uColor3, colors[3][0], colors[3][1], colors[3][2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ---------------------------------------------------------------------
   * DOM refs
   * ------------------------------------------------------------------ */
  var els = {};
  function cacheEls() {
    els.body = document.body;
    els.ringSvg = document.getElementById('ringSvg');
    els.ringArc = document.getElementById('ringArc');
    els.ringCore = document.getElementById('ringCore');
    els.phaseWord = document.getElementById('phaseWord');
    els.breathCount = document.getElementById('breathCount');
    els.reducedCount = document.getElementById('reducedCount');
    els.sessionPicker = document.getElementById('sessionPicker');
    els.endSession = document.getElementById('endSession');
    els.completionLine = document.getElementById('completionLine');
    els.particleField = document.getElementById('particleField');
    els.reducedNote = document.getElementById('reducedNote');
    els.chimeToggle = document.getElementById('chimeToggle');
    els.palDots = Array.prototype.slice.call(document.querySelectorAll('.pal-dot'));
    els.pickerButtons = Array.prototype.slice.call(document.querySelectorAll('.picker-row button'));
  }

  /* ---------------------------------------------------------------------
   * Audio — WebAudio-synthesized bell, off by default.
   * ------------------------------------------------------------------ */
  var audioCtx = null;
  var chimeEnabled = false;
  function ensureAudio() {
    if (audioCtx) return audioCtx;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }
  var CHIME_FREQ = { inhale: 587.33, hold: 440.0, exhale: 329.63 };
  function playChime(kind) {
    if (!chimeEnabled) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var now = ctx.currentTime;
    var base = CHIME_FREQ[kind] || 440;
    var partials = [
      { ratio: 1.0, gain: 0.5 },
      { ratio: 2.02, gain: 0.26 },
      { ratio: 2.76, gain: 0.14 },
      { ratio: 4.1, gain: 0.07 }
    ];
    var master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.42, now + 0.025);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2600;
    master.connect(filter).connect(ctx.destination);
    partials.forEach(function (p) {
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = base * p.ratio;
      var g = ctx.createGain();
      g.gain.value = p.gain;
      osc.connect(g).connect(master);
      osc.start(now);
      osc.stop(now + 2.7);
    });
  }

  /* ---------------------------------------------------------------------
   * State
   * ------------------------------------------------------------------ */
  var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reducedMotionQuery.matches;

  var state = {
    phase: 'idle',
    phaseElapsed: 0,
    breathIndex: 0,
    totalBreaths: 0,
    sessionActive: false,
    dissolveElapsed: 0,
    settleElapsed: 0,
    settleFrom: IDLE_BASE,
    completeElapsed: 0,
    clock: 0,
    lastReducedSecond: -1,
    currentR: IDLE_BASE
  };

  var activeSetName = 'dawn';
  var fromPalette = cloneSet(PALETTES.dawn);
  var toPalette = cloneSet(PALETTES.dawn);
  var blended = cloneSet(PALETTES.dawn);
  var crossfading = false;
  var crossfadeElapsed = 0;
  var paletteTimer = 0;
  var ink = 'dark';

  function currentBlended() { return blended.map(function (c) { return c.slice(); }); }

  function startCrossfadeTo(name, instant) {
    if (name === activeSetName && !crossfading && !instant) return;
    fromPalette = currentBlended();
    toPalette = cloneSet(PALETTES[name]);
    activeSetName = name;
    crossfadeElapsed = instant ? CROSSFADE_MS : 0;
    crossfading = !instant;
    if (instant) blended = cloneSet(PALETTES[name]);
    paletteTimer = 0;
    els.palDots.forEach(function (d) {
      var on = d.getAttribute('data-set') === name;
      d.classList.toggle('is-active', on);
      d.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function updatePalette(dtMs) {
    if (crossfading) {
      crossfadeElapsed += dtMs;
      var ct = Math.min(1, crossfadeElapsed / CROSSFADE_MS);
      lerpColors(fromPalette, toPalette, easePalette(ct), blended);
      if (ct >= 1) crossfading = false;
    }
    if (!reduced) {
      paletteTimer += dtMs;
      if (paletteTimer >= AUTO_CYCLE_MS && !crossfading) {
        var idx = PALETTE_ORDER.indexOf(activeSetName);
        var next = PALETTE_ORDER[(idx + 1) % PALETTE_ORDER.length];
        startCrossfadeTo(next, false);
      }
    }
    computeInk();
  }

  function computeInk() {
    var avg = (relLuma(blended[0]) + relLuma(blended[1]) + relLuma(blended[2]) + relLuma(blended[3])) / 4;
    var nextInk = ink;
    if (avg > 0.6) nextInk = 'dark';
    else if (avg < 0.42) nextInk = 'light';
    if (nextInk !== ink) {
      ink = nextInk;
      els.body.setAttribute('data-ink', ink);
    }
  }

  /* ---------------------------------------------------------------------
   * Breathing ring
   * ------------------------------------------------------------------ */
  function setRingR(r) {
    state.currentR = r;
    els.ringCore.setAttribute('r', r.toFixed(2));
  }
  function setArcProgress(t, visible) {
    els.ringArc.style.opacity = visible ? '1' : '0';
    var offset = ARC_C * (1 - Math.max(0, Math.min(1, t)));
    els.ringArc.style.strokeDasharray = ARC_C + ' ' + ARC_C;
    els.ringArc.style.strokeDashoffset = offset.toFixed(2);
  }

  var wordTimer = null;
  function setWord(text) {
    if (els.phaseWord.textContent === text) return;
    els.phaseWord.classList.add('is-out');
    if (wordTimer) clearTimeout(wordTimer);
    wordTimer = setTimeout(function () {
      els.phaseWord.textContent = text;
      els.phaseWord.classList.remove('is-out');
    }, reduced ? 60 : 260);
  }

  function updateBreathCount() {
    if (state.totalBreaths > 0 && (state.phase === 'inhale' || state.phase === 'hold' || state.phase === 'exhale')) {
      els.breathCount.textContent = 'breath ' + (state.breathIndex + 1) + ' of ' + state.totalBreaths;
    } else {
      els.breathCount.textContent = '';
    }
  }

  function spawnParticles() {
    if (reduced) return;
    var field = els.particleField;
    field.innerHTML = '';
    var n = 26;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('span');
      p.className = 'particle';
      var angle = (Math.PI * 2 * i) / n + (Math.random() * 0.5 - 0.25);
      var dist = 85 + Math.random() * 75;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist;
      p.style.setProperty('--dx', dx.toFixed(1) + 'px');
      p.style.setProperty('--dy', dy.toFixed(1) + 'px');
      p.style.animationDelay = Math.round(Math.random() * 260) + 'ms';
      p.style.animationDuration = (1300 + Math.random() * 900).toFixed(0) + 'ms';
      (function (el) {
        el.addEventListener('animationend', function () { el.remove(); });
      })(p);
      field.appendChild(p);
    }
  }

  function beginPhase(phase) {
    state.phase = phase;
    state.phaseElapsed = 0;
    if (phase === 'inhale' || phase === 'hold' || phase === 'exhale') {
      playChime(phase);
      setWord(PHASE_WORD[phase]);
      updateBreathCount();
    }
  }

  function startSession(minutes) {
    var totalMs = minutes * 60000;
    state.totalBreaths = Math.max(1, Math.round(totalMs / (PHASE_MS.inhale + PHASE_MS.hold + PHASE_MS.exhale)));
    state.breathIndex = 0;
    state.sessionActive = true;
    els.sessionPicker.setAttribute('hidden', '');
    els.completionLine.classList.remove('is-visible');
    els.completionLine.setAttribute('hidden', '');
    els.endSession.removeAttribute('hidden');
    els.ringSvg.style.opacity = '1';
    beginPhase('inhale');
  }

  function endSessionToIdle() {
    state.sessionActive = false;
    state.settleFrom = state.currentR;
    state.settleElapsed = 0;
    state.phase = 'settle';
    els.endSession.setAttribute('hidden', '');
    els.breathCount.textContent = '';
    els.reducedCount.textContent = '';
    setWord('settle in');
    els.sessionPicker.removeAttribute('hidden');
  }

  function startCompletion() {
    state.sessionActive = false;
    state.dissolveElapsed = 0;
    state.phase = 'dissolve';
    els.endSession.setAttribute('hidden', '');
    setWord('');
  }

  function finishCompletion() {
    state.phase = 'complete';
    state.completeElapsed = 0;
    els.breathCount.textContent = '';
    els.reducedCount.textContent = '';
    setWord('');
    spawnParticles();
    els.completionLine.removeAttribute('hidden');
    requestAnimationFrame(function () {
      els.completionLine.classList.add('is-visible');
    });
  }

  /* ---------------------------------------------------------------------
   * Master loop
   * ------------------------------------------------------------------ */
  var lastTime = null;
  var rafId = null;
  var gradientTime = 0;

  function tickBreath(dtMs) {
    var dtSec = dtMs / 1000;
    state.clock += dtSec;

    if (state.phase === 'idle') {
      var r = IDLE_BASE + Math.sin((state.clock * Math.PI * 2) / IDLE_PERIOD) * IDLE_AMP;
      setRingR(r);
      setArcProgress(0, false);
      els.ringCore.style.opacity = '0.55';
      return;
    }

    if (state.phase === 'settle') {
      state.settleElapsed += dtMs;
      var st = Math.min(1, state.settleElapsed / SETTLE_MS);
      setRingR(lerp(state.settleFrom, IDLE_BASE, st));
      setArcProgress(0, false);
      els.ringCore.style.opacity = String(lerp(1, 0.55, st));
      if (st >= 1) state.phase = 'idle';
      return;
    }

    if (state.phase === 'inhale' || state.phase === 'hold' || state.phase === 'exhale') {
      state.phaseElapsed += dtMs;
      var dur = PHASE_MS[state.phase];
      var t = Math.min(1, state.phaseElapsed / dur);

      if (!reduced) {
        if (state.phase === 'inhale') {
          setRingR(lerp(RING_MIN, RING_MAX, easeBreath(t)));
          els.ringCore.style.opacity = '1';
        } else if (state.phase === 'exhale') {
          setRingR(lerp(RING_MAX, RING_MIN, easeBreath(t)));
          els.ringCore.style.opacity = '1';
        } else {
          var shimmer = Math.sin((state.clock * Math.PI * 2) / SHIMMER_PERIOD) * SHIMMER_AMP;
          setRingR(RING_MAX + shimmer);
          els.ringCore.style.opacity = String(0.86 + Math.sin((state.clock * Math.PI * 2) / SHIMMER_PERIOD) * 0.1);
        }
        setArcProgress(t, true);
      } else {
        var secLeft = Math.max(0, Math.ceil((dur - state.phaseElapsed) / 1000));
        if (secLeft !== state.lastReducedSecond) {
          state.lastReducedSecond = secLeft;
          els.reducedCount.textContent = secLeft > 0 ? String(secLeft) : '';
        }
      }

      if (t >= 1) {
        if (state.phase === 'inhale') beginPhase('hold');
        else if (state.phase === 'hold') beginPhase('exhale');
        else {
          state.breathIndex++;
          if (state.breathIndex >= state.totalBreaths) {
            if (reduced) { finishCompletion(); }
            else startCompletion();
          } else {
            beginPhase('inhale');
          }
        }
        state.lastReducedSecond = -1;
      }
      return;
    }

    if (state.phase === 'dissolve') {
      state.dissolveElapsed += dtMs;
      var dt2 = Math.min(1, state.dissolveElapsed / DISSOLVE_MS);
      setRingR(lerp(RING_MIN, 0, dt2));
      els.ringSvg.style.opacity = String(1 - dt2);
      setArcProgress(0, false);
      if (dt2 >= 1) finishCompletion();
      return;
    }

    if (state.phase === 'complete') {
      state.completeElapsed += dtMs;
      if (state.completeElapsed >= COMPLETE_PAUSE_MS) {
        state.phase = 'idle';
        els.ringSvg.style.opacity = '1';
        setRingR(IDLE_BASE);
        els.sessionPicker.removeAttribute('hidden');
      }
      return;
    }
  }

  function loop(now) {
    if (lastTime === null) lastTime = now;
    var dt = Math.min(80, now - lastTime);
    lastTime = now;

    if (!reduced) {
      gradientTime += dt * 0.001;
      updatePalette(dt);
      resizeCanvas();
      drawGradient(blended, gradientTime, false);
    }

    tickBreath(dt);
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (rafId) return;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }
  function stopLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  /* ---------------------------------------------------------------------
   * Wiring
   * ------------------------------------------------------------------ */
  function wire() {
    els.pickerButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mins = parseFloat(btn.getAttribute('data-mins'));
        startSession(mins);
      });
    });

    els.endSession.addEventListener('click', endSessionToIdle);

    els.palDots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var name = dot.getAttribute('data-set');
        startCrossfadeTo(name, reduced);
        computeInk();
        if (reduced) drawGradient(blended, gradientTime, true);
      });
    });

    els.chimeToggle.addEventListener('click', function () {
      chimeEnabled = !chimeEnabled;
      els.chimeToggle.setAttribute('aria-pressed', chimeEnabled ? 'true' : 'false');
      if (chimeEnabled) {
        ensureAudio();
        playChime('inhale');
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopLoop();
      else if (!reduced) startLoop();
    });

    var resizeRaf = null;
    window.addEventListener('resize', function () {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(function () {
        resizeRaf = null;
        resizeCanvas();
        if (reduced) drawGradient(blended, gradientTime, true);
      });
    });
  }

  /* ---------------------------------------------------------------------
   * Init
   * ------------------------------------------------------------------ */
  function init() {
    cacheEls();
    var ok = initGL();
    resizeCanvas();

    ink = 'dark';
    els.body.setAttribute('data-ink', ink);
    computeInk();

    setRingR(IDLE_BASE);
    setArcProgress(0, false);
    els.reducedNote.toggleAttribute('hidden', !reduced);

    if (reduced) {
      els.ringSvg.style.display = 'none';
      if (ok) drawGradient(blended, 6.0, true);
      startLoop(); /* still runs the breath state machine + palette-timer skip */
    } else {
      if (ok) startLoop();
      else startLoop(); /* keep breathing choreography alive even if WebGL failed; CSS fallback gradient shows */
    }

    wire();

    reducedMotionQuery.addEventListener ? reducedMotionQuery.addEventListener('change', function (e) {
      reduced = e.matches;
      els.reducedNote.toggleAttribute('hidden', !reduced);
      els.ringSvg.style.display = reduced ? 'none' : '';
    }) : null;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
