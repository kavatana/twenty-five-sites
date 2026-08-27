/* STILLNESS — a breathing meditation instrument
   Raw WebGL fragment-shader gradient (hand-rolled 3D simplex noise + fbm +
   domain warp), a 4-7-8 breathing state machine driven off wall-clock time,
   a synthesized bell chime, and a particle dissolve on completion.
   No external JS libraries. */

(() => {
  'use strict';

  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  let REDUCED = reducedMQ.matches;
  document.documentElement.classList.toggle('reduced', REDUCED);

  /* ============================== palettes ============================== */

  const SET_ORDER = ['dawn', 'sea', 'dusk'];
  const PALETTES = {
    dawn: {
      name: 'Dawn',
      colors: ['#F6E7D8', '#F0D0C4', '#D9C1E8', '#B98BD1'],
      ink: '#3B2A44',
      scrim: 'rgba(255,247,238,0.50)',
      scrimStrong: 'rgba(255,247,238,0.76)',
      hairline: 'rgba(59,42,68,0.16)',
      glow: '#F6E2CE'
    },
    sea: {
      name: 'Sea',
      colors: ['#CFE8E0', '#8FCBBD', '#3E7566', '#132C25'],
      ink: '#12332B',
      scrim: 'rgba(238,250,246,0.52)',
      scrimStrong: 'rgba(238,250,246,0.78)',
      hairline: 'rgba(18,51,43,0.16)',
      glow: '#BFE9DD'
    },
    dusk: {
      name: 'Dusk',
      colors: ['#E8C1B0', '#B08CC0', '#8E7CC3', '#2E2A4F'],
      ink: '#241B3A',
      scrim: 'rgba(247,238,245,0.48)',
      scrimStrong: 'rgba(247,238,245,0.76)',
      hairline: 'rgba(36,27,58,0.18)',
      glow: '#E3B9C9'
    }
  };

  const hexToRgb01 = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };

  const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  /* ============================== WebGL ============================== */

  const bgCanvas = document.getElementById('bg');
  let gl = null, glOk = false;
  let uTimeLoc, uResLoc, uColFromLoc, uColToLoc, uMixLoc;
  let startTime = performance.now();

  const VERT_SRC = `
    attribute vec2 aPos;
    void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG_SRC = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec3 uColFrom[4];
    uniform vec3 uColTo[4];
    uniform float uMix;

    vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
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
    }

    float fbm(vec3 p){
      float sum = 0.0; float amp = 0.52; float freq = 1.0;
      for(int i = 0; i < 4; i++){
        sum += amp * snoise(p * freq);
        freq *= 2.02;
        amp *= 0.55;
      }
      return sum;
    }

    vec3 warp(vec3 p){
      vec3 q = vec3(
        fbm(p + vec3(0.0, 0.0, 0.0)),
        fbm(p + vec3(5.2, 1.3, 2.1)),
        fbm(p + vec3(1.7, 9.2, 3.3))
      );
      return p + q * 0.55;
    }

    float hash13(vec3 p3){
      p3 = fract(p3 * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main(){
      vec2 uv = (gl_FragCoord.xy - 0.5 * uRes.xy) / uRes.y;
      vec3 p = vec3(uv * 1.15, uTime * 0.014);
      p.xy += vec2(uTime * 0.004, -uTime * 0.003);

      vec3 wp = warp(p);
      float n = fbm(wp + vec3(0.0, 0.0, uTime * 0.009));
      n = clamp(n * 0.6 + 0.5, 0.0, 1.0);

      vec3 c0 = mix(uColFrom[0], uColTo[0], uMix);
      vec3 c1 = mix(uColFrom[1], uColTo[1], uMix);
      vec3 c2 = mix(uColFrom[2], uColTo[2], uMix);
      vec3 c3 = mix(uColFrom[3], uColTo[3], uMix);

      vec3 col;
      if(n < 0.34){
        col = mix(c0, c1, smoothstep(0.0, 0.34, n));
      } else if(n < 0.67){
        col = mix(c1, c2, smoothstep(0.34, 0.67, n));
      } else {
        col = mix(c2, c3, smoothstep(0.67, 1.0, n));
      }

      float d = length(uv);
      col *= 1.0 - smoothstep(0.85, 1.55, d) * 0.32;
      float focus = smoothstep(0.5, 0.0, d);
      col = mix(col, col * 1.05 + 0.015, focus * 0.45);

      float g = hash13(vec3(gl_FragCoord.xy, uTime * 48.0));
      col += (g - 0.5) * 0.026;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(src, type) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('Shader compile error: ' + log);
    }
    return sh;
  }

  function initGL() {
    gl = bgCanvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: true }) ||
         bgCanvas.getContext('experimental-webgl');
    if (!gl) throw new Error('no webgl');

    const vs = compile(VERT_SRC, gl.VERTEX_SHADER);
    const fs = compile(FRAG_SRC, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    uTimeLoc = gl.getUniformLocation(prog, 'uTime');
    uResLoc = gl.getUniformLocation(prog, 'uRes');
    uColFromLoc = gl.getUniformLocation(prog, 'uColFrom');
    uColToLoc = gl.getUniformLocation(prog, 'uColTo');
    uMixLoc = gl.getUniformLocation(prog, 'uMix');

    glOk = true;
  }

  function resizeGL() {
    if (!glOk) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(window.innerWidth * dpr));
    const h = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (bgCanvas.width !== w || bgCanvas.height !== h) {
      bgCanvas.width = w;
      bgCanvas.height = h;
      bgCanvas.style.width = window.innerWidth + 'px';
      bgCanvas.style.height = window.innerHeight + 'px';
      gl.viewport(0, 0, w, h);
    }
  }

  function flatten(arr3) {
    const out = new Float32Array(arr3.length * 3);
    for (let i = 0; i < arr3.length; i++) {
      out[i * 3] = arr3[i][0];
      out[i * 3 + 1] = arr3[i][1];
      out[i * 3 + 2] = arr3[i][2];
    }
    return out;
  }

  function renderGL(t) {
    if (!glOk) return;
    gl.uniform1f(uTimeLoc, t);
    gl.uniform2f(uResLoc, bgCanvas.width, bgCanvas.height);
    gl.uniform3fv(uColFromLoc, flatten(palette.fromColors));
    gl.uniform3fv(uColToLoc, flatten(palette.toColors));
    gl.uniform1f(uMixLoc, palette.mixT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /* ============================== palette engine ============================== */

  const palette = {
    currentKey: 'dawn',
    fromColors: PALETTES.dawn.colors.map(hexToRgb01),
    toColors: PALETTES.dawn.colors.map(hexToRgb01),
    mixT: 1,
    mixStart: 0,
    mixDur: 4200,
    lastSwitchAt: performance.now(),
    autoMs: 40000
  };

  const root = document.documentElement;

  function applyCSSVars(key) {
    const p = PALETTES[key];
    root.style.setProperty('--ink', p.ink);
    root.style.setProperty('--scrim', p.scrim);
    root.style.setProperty('--scrim-strong', p.scrimStrong);
    root.style.setProperty('--hairline', p.hairline);
    root.style.setProperty('--ring-glow', p.glow);
    root.style.setProperty('--accent', p.colors[2]);
  }

  function setPaletteDotsUI(key) {
    document.querySelectorAll('.pal-dot').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.set === key);
      b.setAttribute('aria-pressed', String(b.dataset.set === key));
    });
  }

  function crossfadeTo(key, now) {
    if (key === palette.currentKey && palette.mixT >= 1) {
      palette.lastSwitchAt = now;
      return;
    }
    const eased = easeInOutSine(clamp01(palette.mixT));
    const displayed = palette.fromColors.map((c, i) => [
      c[0] + (palette.toColors[i][0] - c[0]) * eased,
      c[1] + (palette.toColors[i][1] - c[1]) * eased,
      c[2] + (palette.toColors[i][2] - c[2]) * eased
    ]);
    palette.fromColors = displayed;
    palette.toColors = PALETTES[key].colors.map(hexToRgb01);
    palette.mixStart = now;
    palette.mixT = 0;
    palette.currentKey = key;
    palette.lastSwitchAt = now;
    applyCSSVars(key);
    setPaletteDotsUI(key);
    if (REDUCED) {
      // no animated crossfade under reduced motion — swap instantly
      palette.fromColors = palette.toColors.map((c) => c.slice());
      palette.mixT = 1;
    }
  }

  function updatePalette(now) {
    if (palette.mixT < 1) {
      const raw = clamp01((now - palette.mixStart) / palette.mixDur);
      palette.mixT = raw >= 1 ? 1 : easeInOutSine(raw);
    }
    if (!REDUCED && now - palette.lastSwitchAt > palette.autoMs) {
      const idx = SET_ORDER.indexOf(palette.currentKey);
      crossfadeTo(SET_ORDER[(idx + 1) % SET_ORDER.length], now);
    }
  }

  /* ============================== audio (bell chime) ============================== */

  let audioCtx = null;
  let chimeOn = false;

  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playChime(freq) {
    if (!chimeOn) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.2, t0 + 0.025);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.4);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 2600;
    master.connect(filt);
    filt.connect(ctx.destination);

    const partials = [1, 2.01, 3.42];
    const gains = [1, 0.32, 0.11];
    partials.forEach((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.value = gains[i];
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + 3.5);
    });
  }

  const CHIME_FREQ = { inhale: 349.23, hold: 523.25, exhale: 261.63 };

  const chimeBtn = document.getElementById('chimeToggle');
  const CHIME_KEY = 'stillness-chime';
  try {
    chimeOn = localStorage.getItem(CHIME_KEY) === '1';
  } catch (e) { /* private mode etc — default off */ }
  chimeBtn.setAttribute('aria-pressed', String(chimeOn));
  chimeBtn.classList.toggle('is-on', chimeOn);

  chimeBtn.addEventListener('click', () => {
    chimeOn = !chimeOn;
    chimeBtn.setAttribute('aria-pressed', String(chimeOn));
    try { localStorage.setItem(CHIME_KEY, chimeOn ? '1' : '0'); } catch (e) {}
    if (chimeOn) {
      ensureAudio();
      playChime(523.25);
    }
  });

  document.querySelectorAll('.pal-dot').forEach((btn) => {
    btn.addEventListener('click', () => crossfadeTo(btn.dataset.set, performance.now()));
  });

  /* ============================== breathing state machine ============================== */

  const PHASES = { inhale: 4000, hold: 7000, exhale: 8000 };
  const CYCLE = PHASES.inhale + PHASES.hold + PHASES.exhale;
  const R_MIN = 42, R_MAX = 108;

  const ringSvg = document.querySelector('.ring-svg');
  const ringCore = document.getElementById('ringCore');
  const ringProgress = document.getElementById('ringProgress');
  const ringField = document.getElementById('ringField');
  const ringHalo = document.getElementById('ringHalo');
  const PROG_R = 128;
  const PROG_C = 2 * Math.PI * PROG_R;
  ringProgress.setAttribute('stroke-dasharray', String(PROG_C));

  const stateIdle = document.getElementById('stateIdle');
  const stateActive = document.getElementById('stateActive');
  const stateComplete = document.getElementById('stateComplete');
  const phaseWordEls = document.querySelectorAll('.phase-word-item');
  const phaseCountEl = document.getElementById('phaseCount');
  const breathCountEl = document.getElementById('breathCountNum');
  const completionSub = document.getElementById('completionSub');
  const tgPhase = document.getElementById('tgPhase');
  const tgCount = document.getElementById('tgCount');
  const tgDots = document.getElementById('tgDots');

  let session = { active: false, startAt: 0, endAt: 0, minutes: 3 };
  let lastPhase = null;
  let lastRemaining = null;
  let lastBreathIdx = null;
  let lastCycleIdx = null;
  let dissolving = false;

  function showState(name) {
    [stateIdle, stateActive, stateComplete].forEach((el) => el.classList.remove('is-visible'));
    ({ idle: stateIdle, active: stateActive, complete: stateComplete }[name]).classList.add('is-visible');
  }

  function startSession(minutes) {
    const now = performance.now();
    session.active = true;
    session.minutes = minutes;
    session.startAt = now;
    session.endAt = now + minutes * 60000;
    lastPhase = null;
    lastRemaining = null;
    lastBreathIdx = null;
    lastCycleIdx = null;
    dissolving = false;
    ringField.classList.remove('is-dissolved');
    ringField.style.opacity = '';
    ringField.classList.add('is-session');
    showState('active');
    if (REDUCED) {
      renderTextGuideStatic();
    }
  }

  function endSessionEarly() {
    if (!session.active) return;
    triggerCompletion();
  }

  document.getElementById('endLink').addEventListener('click', endSessionEarly);

  function triggerCompletion() {
    if (dissolving) return;
    dissolving = true;
    session.active = false;
    const breathsDone = lastBreathIdx || 1;
    completionSub.textContent = breathsDone === 1
      ? 'one breath — that was the whole practice.'
      : breathsDone + ' breaths, unhurried.';
    showState('complete');

    if (!REDUCED) {
      const rect = ringSvg.getBoundingClientRect();
      const scale = rect.width / 300;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const curR = Number(ringCore.getAttribute('r')) * scale;
      spawnParticles(cx, cy, curR);
      ringField.classList.add('is-dissolved');
    } else {
      ringField.classList.add('is-dissolved');
    }
  }

  document.getElementById('beginAgain').addEventListener('click', () => {
    dissolving = false;
    ringField.classList.remove('is-session');
    showState('idle');
  });

  document.querySelectorAll('.session-picker button').forEach((btn) => {
    btn.addEventListener('click', () => startSession(Number(btn.dataset.min)));
  });

  function renderTextGuideStatic() {
    tgPhase.textContent = 'Breathe in';
    tgCount.textContent = '4 seconds';
    tgDots.textContent = '● ○ ○';
  }

  function updateBreath(now) {
    if (!session.active) return;

    const elapsedSession = now - session.startAt;
    const cyclePos = elapsedSession % CYCLE;
    const breathIdx = Math.floor(elapsedSession / CYCLE) + 1;

    let phase, phaseElapsed, phaseDur;
    if (cyclePos < PHASES.inhale) {
      phase = 'inhale'; phaseElapsed = cyclePos; phaseDur = PHASES.inhale;
    } else if (cyclePos < PHASES.inhale + PHASES.hold) {
      phase = 'hold'; phaseElapsed = cyclePos - PHASES.inhale; phaseDur = PHASES.hold;
    } else {
      phase = 'exhale'; phaseElapsed = cyclePos - PHASES.inhale - PHASES.hold; phaseDur = PHASES.exhale;
    }
    const t = clamp01(phaseElapsed / phaseDur);

    // graceful stop: only at the inhale boundary of a new cycle, once time's up
    if (phase !== lastPhase) {
      if (phase === 'inhale' && lastPhase === 'exhale' && now >= session.endAt) {
        triggerCompletion();
        return;
      }
      playChime(CHIME_FREQ[phase]);
      phaseWordEls.forEach((el) => el.classList.toggle('is-active', el.dataset.phase === phase));
      lastPhase = phase;
    }

    if (breathIdx !== lastBreathIdx) {
      lastBreathIdx = breathIdx;
      breathCountEl.textContent = String(breathIdx).padStart(2, '0');
    }

    const remaining = Math.max(1, Math.ceil((phaseDur - phaseElapsed) / 1000));
    if (remaining !== lastRemaining) {
      lastRemaining = remaining;
      phaseCountEl.textContent = remaining + 's';
      if (REDUCED) {
        tgPhase.textContent = phase === 'inhale' ? 'Breathe in' : phase === 'hold' ? 'Hold' : 'Breathe out';
        tgCount.textContent = remaining + ' second' + (remaining === 1 ? '' : 's');
        tgDots.textContent = phase === 'inhale' ? '● ○ ○' : phase === 'hold' ? '○ ● ○' : '○ ○ ●';
      }
    }

    if (REDUCED) return; // no ring geometry animation under reduced motion

    let r;
    if (phase === 'inhale') {
      r = R_MIN + (R_MAX - R_MIN) * easeInOutSine(t);
    } else if (phase === 'exhale') {
      r = R_MAX - (R_MAX - R_MIN) * easeInOutCubic(t);
    } else {
      r = R_MAX + Math.sin(now * 0.0018) * 2.4;
    }
    ringCore.setAttribute('r', r.toFixed(2));
    const k = clamp01((r - R_MIN) / (R_MAX - R_MIN));
    ringHalo.style.setProperty('--halo-k', (0.55 + k * 0.85).toFixed(3));

    if (phase === 'hold') {
      const shimmer = 0.5 + Math.sin(now * 0.0018) * 0.5;
      ringCore.style.strokeWidth = (2.8 + shimmer * 1.1).toFixed(2);
    } else {
      ringCore.style.strokeWidth = '3';
    }

    const dashOffset = PROG_C * (1 - t);
    ringProgress.setAttribute('stroke-dashoffset', dashOffset.toFixed(2));
  }

  function idleAmbient(now) {
    if (session.active || REDUCED) return;
    const t = (Math.sin(now * 0.00052) + 1) / 2;
    const r = R_MIN + 14 + (R_MAX - R_MIN - 14) * 0.4 * t;
    ringCore.setAttribute('r', r.toFixed(2));
    const k = clamp01((r - R_MIN) / (R_MAX - R_MIN));
    ringHalo.style.setProperty('--halo-k', (0.5 + k * 0.7).toFixed(3));
    ringProgress.setAttribute('stroke-dashoffset', String(PROG_C * 0.86));
  }

  /* ============================== particle dissolve ============================== */

  const pCanvas = document.getElementById('particles');
  const pCtx = pCanvas.getContext('2d');
  let particles = [];

  function resizeParticles() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    pCanvas.width = Math.floor(window.innerWidth * dpr);
    pCanvas.height = Math.floor(window.innerHeight * dpr);
    pCanvas.style.width = window.innerWidth + 'px';
    pCanvas.style.height = window.innerHeight + 'px';
    pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnParticles(cx, cy, r) {
    const N = window.innerWidth < 640 ? 46 : 76;
    const now = performance.now();
    const glow = PALETTES[palette.currentKey].glow;
    const rgb = hexToRgb01(glow).map((v) => Math.round(v * 255));
    particles = [];
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const speed = 0.012 + Math.random() * 0.028;
      particles.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.006,
        size: 1 + Math.random() * 2.4,
        born: now,
        life: 4600 + Math.random() * 3200,
        seed: Math.random() * 1000,
        rgb
      });
    }
  }

  function updateParticles(now) {
    if (!particles.length) return;
    resizeParticlesIfNeeded();
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    let alive = false;
    for (const pt of particles) {
      const age = now - pt.born;
      if (age >= pt.life) continue;
      alive = true;
      const t = age / pt.life;
      const alpha = Math.pow(1 - t, 1.3) * 0.85;
      const dt = 16;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt + Math.sin(now * 0.0007 + pt.seed) * 0.04;
      pt.vy *= 0.999;
      pCtx.beginPath();
      pCtx.fillStyle = `rgba(${pt.rgb[0]},${pt.rgb[1]},${pt.rgb[2]},${alpha.toFixed(3)})`;
      pCtx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      pCtx.fill();
    }
    if (!alive) {
      particles = [];
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    }
  }

  let lastPW = window.innerWidth, lastPH = window.innerHeight;
  function resizeParticlesIfNeeded() {
    if (window.innerWidth !== lastPW || window.innerHeight !== lastPH) {
      lastPW = window.innerWidth; lastPH = window.innerHeight;
      resizeParticles();
    }
  }

  /* ============================== boot & loop ============================== */

  try {
    initGL();
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    glOk = false;
  }

  resizeGL();
  resizeParticles();
  applyCSSVars('dawn');
  setPaletteDotsUI('dawn');
  window.addEventListener('resize', () => { resizeGL(); resizeParticles(); });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // re-sync particle canvas backing store in case of DPR/orientation change while hidden
      resizeParticles();
    }
  });

  reducedMQ.addEventListener?.('change', (e) => {
    REDUCED = e.matches;
    document.documentElement.classList.toggle('reduced', REDUCED);
  });

  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const now = performance.now();
    updatePalette(now);

    if (REDUCED) {
      if (!glOk) { /* fallback CSS sky handles visuals */ }
      else renderGL(6.0); // single static-ish frame, fixed time
    } else if (glOk) {
      renderGL((now - startTime) / 1000);
    }

    if (session.active) updateBreath(now);
    else idleAmbient(now);

    updateParticles(now);
  }

  showState('idle');
  requestAnimationFrame(frame);
})();
