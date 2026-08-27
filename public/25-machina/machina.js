/* MACHINA — hand-written Mandelbrot renderer + pre-planned cinematic zoom path.
 * No dependencies. Plain <canvas> 2D context, typed arrays, requestAnimationFrame.
 */
(function () {
  'use strict';

  var LN2 = Math.LN2;
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pointerFine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  // ---------------------------------------------------------------------
  // 1. THE PATH — five pre-planned waypoints, each a real, verified location.
  //    t is a "log-zoom" clock: zoom = 10^t. Centers interpolate smoothly
  //    between waypoints with smootherstep easing, so the camera both pans
  //    and dives at once, exactly as a real deep-zoom sequence would.
  // ---------------------------------------------------------------------
  var WAYPOINTS = [
    { t: 0,  re: -0.5,             im: 0,              exp: '×10⁰',  title: 'THE WHOLE TERRITORY',
      copy: 'One rule, iterated on itself: z ↦ z² + c. Colour marks time — how many steps before a point flees to infinity. Black marks patience: the points that never leave. Everything ahead is drawn from nothing but this.' },
    { t: 2,  re: -0.7453,          im: 0.1127,         exp: '×10²',  title: 'THE COASTLINE PRINCIPLE',
      copy: 'In 1967, Mandelbrot showed a coastline’s length depends on the ruler — the finer the measure, the longer the coast. The boundary ahead obeys the same law. No ruler is fine enough to finish measuring it.' },
    { t: 5,  re: -0.7436499,       im: 0.1318259,      exp: '×10⁵',  title: 'SEAHORSE VALLEY',
      copy: 'This strait is named for the curled filaments massed along it — each a distant cousin of the main cardioid, rotated and rescaled but never quite repeated. Kinship without duplication is the rule down here.' },
    { t: 8,  re: -0.7436439,       im: 0.1318259,      exp: '×10⁸',  title: 'SPIRAL ARM',
      copy: 'Colour the escape time and the orbits show their hand: a logarithmic spiral, the same curve a nautilus shell grows by — arising here from nothing more than a number, squared and added, over and over.' },
    { t: 11, re: -0.743643887037,  im: 0.131825904205, exp: '×10¹¹', title: 'THE MINIBROT',
      copy: 'A near-perfect copy of the whole set, one hundred billion times smaller, buried inside its own ancestor. Self-similar, never self-identical — this one keeps the scars of the exact path that found it.' }
  ];
  var CAP_T = 13;              // guard: float64 breaks down near here
  var ZOOM_RATE = 2 / 20;      // log10 units per second (~2 orders / 20s)
  var CARD_DURATION = 8.2;     // seconds a narrative card stays up
  var PULLBACK_DURATION = 5.6; // seconds for the reverse whoosh
  var HOLD_DURATION = 1.7;     // breath at sea level before the next loop

  function smootherstep(x) { return x * x * x * (x * (x * 6 - 15) + 10); }

  function centerAtT(t) {
    if (t <= WAYPOINTS[0].t) return { re: WAYPOINTS[0].re, im: WAYPOINTS[0].im };
    for (var i = 0; i < WAYPOINTS.length - 1; i++) {
      var a = WAYPOINTS[i], b = WAYPOINTS[i + 1];
      if (t <= b.t) {
        var e = smootherstep((t - a.t) / (b.t - a.t));
        return { re: a.re + (b.re - a.re) * e, im: a.im + (b.im - a.im) * e };
      }
    }
    var last = WAYPOINTS[WAYPOINTS.length - 1];
    return { re: last.re, im: last.im };
  }

  function maxIterAtT(t) {
    return Math.max(120, Math.min(1800, Math.round(120 + t * 62)));
  }

  // ---------------------------------------------------------------------
  // 2. PALETTES — hand-rolled 1024-entry gradient LUTs (cosine/lerp stops).
  //    Escape values are stored separately from colour, so cycling a
  //    palette is a pure lookup pass: no math is recomputed.
  // ---------------------------------------------------------------------
  var LUT_SIZE = 1024;
  var PALETTE_DEFS = [
    { name: 'MAGMA', freq: 0.0115,
      stops: [[0, '#0A0714'], [0.22, '#1B0F2E'], [0.48, '#7A2E8F'], [0.74, '#F2A03D'], [0.9, '#F7E8C8'], [1, '#0A0714']],
      interior: '#0A0714' },
    { name: 'INSTRUMENT', freq: 0.014,
      stops: [[0, '#020706'], [0.3, '#0C6E68'], [0.56, '#59F2E8'], [0.78, '#EAFFFC'], [1, '#020706']],
      interior: '#020706' },
    { name: 'SPECTRAL', freq: 0.0105,
      stops: [[0, '#06070A'], [0.2, '#1B0F2E'], [0.42, '#59F2E8'], [0.63, '#9FB3A8'], [0.82, '#F2A03D'], [1, '#06070A']],
      interior: '#06070A' }
  ];

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  var PALETTE_COUNT = PALETTE_DEFS.length;
  var LUT = new Uint8ClampedArray(PALETTE_COUNT * LUT_SIZE * 3);
  var INTERIOR = PALETTE_DEFS.map(function (p) { return hexToRgb(p.interior); });
  var FREQ = PALETTE_DEFS.map(function (p) { return p.freq; });

  (function buildLUTs() {
    PALETTE_DEFS.forEach(function (pal, pIdx) {
      var stops = pal.stops.map(function (s) { return [s[0]].concat(hexToRgb(s[1])); });
      for (var i = 0; i < LUT_SIZE; i++) {
        var t = i / (LUT_SIZE - 1);
        var s0 = stops[0], s1 = stops[stops.length - 1];
        for (var k = 0; k < stops.length - 1; k++) {
          if (t >= stops[k][0] && t <= stops[k + 1][0]) { s0 = stops[k]; s1 = stops[k + 1]; break; }
        }
        var span = (s1[0] - s0[0]) || 1;
        var lt = (t - s0[0]) / span;
        var base = (pIdx * LUT_SIZE + i) * 3;
        LUT[base]     = s0[1] + (s1[1] - s0[1]) * lt;
        LUT[base + 1] = s0[2] + (s1[2] - s0[2]) * lt;
        LUT[base + 2] = s0[3] + (s1[3] - s0[3]) * lt;
      }
    });
  })();

  // ---------------------------------------------------------------------
  // 3. THE MATH — escape-time with continuous (renormalized) coloring and
  //    periodicity detection so bounded/interior orbits bail out early.
  // ---------------------------------------------------------------------
  function escapeValue(cr, ci, maxIter) {
    var zr = 0, zi = 0, zr2 = 0, zi2 = 0;
    var checkR = 0, checkI = 0, period = 0;
    for (var i = 0; i < maxIter; i++) {
      zi = 2 * zr * zi + ci;
      zr = zr2 - zi2 + cr;
      zr2 = zr * zr; zi2 = zi * zi;
      if (zr2 + zi2 > 65536) {
        var logZn = Math.log(zr2 + zi2) * 0.5;
        var nu = Math.log(logZn / LN2) / LN2;
        return i + 1 - nu;
      }
      if (zr === checkR && zi === checkI) return -1; // exact cycle -> interior
      if (++period > 24) { period = 0; checkR = zr; checkI = zi; }
    }
    return -1;
  }

  // ---------------------------------------------------------------------
  // 4. DOM + canvas setup
  // ---------------------------------------------------------------------
  var canvas = document.getElementById('field');
  var ctx = canvas.getContext('2d', { alpha: false });
  var reticle = document.getElementById('reticle');
  reticle.innerHTML = '<span class="ring"></span><span class="pulse"></span>';

  var roRe = document.getElementById('roRe');
  var roIm = document.getElementById('roIm');
  var roZoom = document.getElementById('roZoom');
  var roIter = document.getElementById('roIter');
  var roMs = document.getElementById('roMs');
  var roStatus = document.getElementById('roStatus');
  var railIndicator = document.getElementById('railIndicator');
  var railTicks = Array.prototype.slice.call(document.querySelectorAll('.rail-tick'));
  var narrativeCard = document.getElementById('narrativeCard');
  var ncExp = document.getElementById('ncExp');
  var ncTitle = document.getElementById('ncTitle');
  var ncCoords = document.getElementById('ncCoords');
  var ncCopy = document.getElementById('ncCopy');
  var pullbackFlag = document.getElementById('pullbackFlag');
  var btnPause = document.getElementById('btnPause');
  var pauseIcon = document.getElementById('pauseIcon');
  var pauseLabel = document.getElementById('pauseLabel');
  var btnPalette = document.getElementById('btnPalette');
  var paletteLabel = document.getElementById('paletteLabel');

  var BASE_SPAN = 3.2; // complex-plane width shown at t = 0

  var bufW = 0, bufH = 0, values = null, colorBuffer = null, imageData = null;

  function targetPixelBudget() {
    var narrow = window.innerWidth < 720;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var base = narrow ? 85000 : 230000;
    return Math.round(base * (0.78 + 0.22 * (dpr / 2)));
  }

  function setupBuffers() {
    var cssW = window.innerWidth, cssH = window.innerHeight;
    var aspect = cssW / cssH;
    var budget = targetPixelBudget();
    bufH = Math.max(120, Math.round(Math.sqrt(budget / aspect)));
    bufW = Math.max(160, Math.round(bufH * aspect));
    canvas.width = bufW; canvas.height = bufH;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    values = new Float32Array(bufW * bufH).fill(-2);
    colorBuffer = new Uint8ClampedArray(bufW * bufH * 4);
    for (var i = 3; i < colorBuffer.length; i += 4) colorBuffer[i] = 255;
    imageData = new ImageData(colorBuffer, bufW, bufH);
    cycle = 0; resumeX = 0; resumeY = 0; cycleSnapshot = null;
  }

  // ---------------------------------------------------------------------
  // 5. Progressive refinement — a 3×2 interleaved tile order. Each frame
  //    renders one tile (time-boxed for safety) at full resolution/full
  //    iteration budget; a complete cycle (6 tiles) refreshes every pixel.
  //    Because the camera is always creeping forward, the picture is
  //    perpetually a beat behind and catching up: coarse, then sharp.
  // ---------------------------------------------------------------------
  var TILE_X = 3, TILE_Y = 2, TILE_TOTAL = TILE_X * TILE_Y;
  var cycle = 0, resumeX = 0, resumeY = 0, cycleSnapshot = null;
  var FRAME_BUDGET_MS = 8;

  function writeColor(x, y, v, paletteIdx) {
    var idx = (y * bufW + x) * 4;
    if (v === -2) {
      colorBuffer[idx] = 5; colorBuffer[idx + 1] = 6; colorBuffer[idx + 2] = 10;
      return;
    }
    if (v < 0) {
      var ic = INTERIOR[paletteIdx];
      colorBuffer[idx] = ic[0]; colorBuffer[idx + 1] = ic[1]; colorBuffer[idx + 2] = ic[2];
      return;
    }
    var f = (v * FREQ[paletteIdx]) % 1; if (f < 0) f += 1;
    var fp = f * (LUT_SIZE - 1);
    var li = fp | 0;
    var lt = fp - li;
    var li2 = li + 1 < LUT_SIZE ? li + 1 : 0;
    var b0 = (paletteIdx * LUT_SIZE + li) * 3, b1 = (paletteIdx * LUT_SIZE + li2) * 3;
    colorBuffer[idx]     = LUT[b0]     + (LUT[b1]     - LUT[b0])     * lt;
    colorBuffer[idx + 1] = LUT[b0 + 1] + (LUT[b1 + 1] - LUT[b0 + 1]) * lt;
    colorBuffer[idx + 2] = LUT[b0 + 2] + (LUT[b1 + 2] - LUT[b0 + 2]) * lt;
  }

  function snapshotCamera() {
    var c = centerAtT(t);
    var cx = c.re + offset.re, cy = c.im + offset.im;
    var zoom = Math.pow(10, Math.min(t, CAP_T));
    var spanRe = BASE_SPAN / zoom;
    var spanIm = spanRe * (bufH / bufW);
    return { cx: cx, cy: cy, spanRe: spanRe, spanIm: spanIm, maxIter: maxIterAtT(t) };
  }

  function renderFine() {
    if (!cycleSnapshot) cycleSnapshot = snapshotCamera();
    var cam = cycleSnapshot, pal = paletteIdx;
    var bx = cycle % TILE_X, by = (cycle / TILE_X) | 0;
    var start = performance.now();
    var n = 0;
    var yStart = resumeY || by;
    var xFirstRow = resumeX || bx;
    for (var y = yStart; y < bufH; y += TILE_Y) {
      for (var x = (y === yStart ? xFirstRow : bx); x < bufW; x += TILE_X) {
        var re = cam.cx + (x / bufW - 0.5) * cam.spanRe;
        var im = cam.cy + (y / bufH - 0.5) * cam.spanIm;
        var v = escapeValue(re, im, cam.maxIter);
        values[y * bufW + x] = v;
        writeColor(x, y, v, pal);
        n++;
        if ((n & 511) === 0 && performance.now() - start > FRAME_BUDGET_MS) {
          resumeX = x + TILE_X; resumeY = y;
          return;
        }
      }
    }
    resumeX = 0; resumeY = 0;
    cycle = (cycle + 1) % TILE_TOTAL;
    cycleSnapshot = null;
  }

  function renderCoarse(cam) {
    var STRIDE = 4, pal = paletteIdx, maxIter = 130;
    for (var y = 0; y < bufH; y += STRIDE) {
      for (var x = 0; x < bufW; x += STRIDE) {
        var re = cam.cx + (x / bufW - 0.5) * cam.spanRe;
        var im = cam.cy + (y / bufH - 0.5) * cam.spanIm;
        var v = escapeValue(re, im, maxIter);
        var yMax = Math.min(y + STRIDE, bufH), xMax = Math.min(x + STRIDE, bufW);
        for (var yy = y; yy < yMax; yy++) {
          for (var xx = x; xx < xMax; xx++) { values[yy * bufW + xx] = v; writeColor(xx, yy, v, pal); }
        }
      }
    }
  }

  function recolorAll() {
    var total = bufW * bufH;
    for (var i = 0; i < total; i++) {
      writeColor(i % bufW, (i / bufW) | 0, values[i], paletteIdx);
    }
  }

  // ---------------------------------------------------------------------
  // 6. Clock / state machine
  // ---------------------------------------------------------------------
  var t = prefersReduced ? 0 : 0;
  var phase = 'diving';        // 'diving' | 'pulling-back' | 'holding'
  var paused = prefersReduced; // user (or reduced-motion default) pause
  var holdTimer = 0;
  var pullbackFrom = 0;
  var pullbackP = 0;
  var waypointTriggered = WAYPOINTS.map(function () { return false; });
  var activeCardIdx = -1;
  var cardElapsed = 0;
  var paletteIdx = 0;
  var offset = { re: 0, im: 0 };
  var offsetAnim = null;
  var lastRenderMs = 0;
  var lastNow = performance.now();

  function showCard(wp) {
    ncExp.textContent = wp.exp;
    ncTitle.textContent = wp.title;
    ncCoords.textContent = 'c = ' + formatCoord(wp.re) + ' + ' + formatCoord(wp.im) + 'i';
    ncCopy.textContent = wp.copy;
    narrativeCard.classList.add('visible');
  }
  function hideCard() { narrativeCard.classList.remove('visible'); }

  function updateRailActive(i) { if (railTicks[i]) railTicks[i].classList.add('active'); }
  function resetRailTicks() { railTicks.forEach(function (el) { el.classList.remove('active'); }); }

  function checkWaypointTriggers() {
    for (var i = 0; i < WAYPOINTS.length; i++) {
      if (!waypointTriggered[i] && t >= WAYPOINTS[i].t) {
        waypointTriggered[i] = true;
        activeCardIdx = i; cardElapsed = 0;
        showCard(WAYPOINTS[i]);
        updateRailActive(i);
      }
    }
  }

  function beginPullback() {
    phase = 'pulling-back';
    pullbackFrom = t; pullbackP = 0;
    offset.re = 0; offset.im = 0; offsetAnim = null;
    hideCard(); activeCardIdx = -1;
    pullbackFlag.classList.add('visible');
    roStatus.textContent = 'RETURNING';
  }

  function finishPullback() {
    t = 0; pullbackP = 0;
    waypointTriggered = WAYPOINTS.map(function () { return false; });
    resetRailTicks();
    pullbackFlag.classList.remove('visible');
    phase = 'holding'; holdTimer = 0;
    roStatus.textContent = 'SEA LEVEL';
  }

  function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }
  function easeInOutCubic(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

  function triggerRecenter(targetRe, targetIm) {
    var scripted = centerAtT(t);
    var toRe = targetRe - scripted.re, toIm = targetIm - scripted.im;
    offsetAnim = {
      phase: 'to', fromRe: offset.re, fromIm: offset.im, toRe: toRe, toIm: toIm,
      start: performance.now(), toDur: 1100, holdDur: 1200, backDur: 2400
    };
  }

  function updateOffsetAnim(now) {
    if (!offsetAnim) return;
    var a = offsetAnim, elapsed = now - a.start;
    if (a.phase === 'to') {
      var p = Math.min(elapsed / a.toDur, 1), e = easeOutCubic(p);
      offset.re = a.fromRe + (a.toRe - a.fromRe) * e;
      offset.im = a.fromIm + (a.toIm - a.fromIm) * e;
      if (p >= 1) { a.phase = 'hold'; a.holdStart = now; offset.re = a.toRe; offset.im = a.toIm; }
    } else if (a.phase === 'hold') {
      if (now - a.holdStart >= a.holdDur) { a.phase = 'back'; a.backStart = now; a.backFromRe = offset.re; a.backFromIm = offset.im; }
    } else if (a.phase === 'back') {
      var pb = Math.min((now - a.backStart) / a.backDur, 1), eb = easeInOutCubic(pb);
      offset.re = a.backFromRe * (1 - eb);
      offset.im = a.backFromIm * (1 - eb);
      if (pb >= 1) { offset.re = 0; offset.im = 0; offsetAnim = null; }
    }
  }

  function formatCoord(v) {
    var sign = v < 0 ? '−' : ' ';
    return sign + Math.abs(v).toFixed(12);
  }

  function updateHUD() {
    var cam = snapshotCamera();
    roRe.textContent = formatCoord(cam.cx);
    roIm.textContent = formatCoord(cam.cy);
    roZoom.textContent = '10^' + Math.min(t, CAP_T).toFixed(2) + '×';
    roIter.textContent = String(maxIterAtT(t));
    roMs.textContent = lastRenderMs.toFixed(1) + ' ms';
    if (phase === 'diving' && !paused) roStatus.textContent = 'DIVING';
    else if (paused) roStatus.textContent = 'PAUSED';
    else if (phase === 'holding') roStatus.textContent = 'SEA LEVEL';
    var pct = Math.min(t, CAP_T) / CAP_T * 100;
    railIndicator.style.top = pct + '%';
  }

  // ---------------------------------------------------------------------
  // 7. Main loop
  // ---------------------------------------------------------------------
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { lastNow = now; return; }
    var dt = Math.min((now - lastNow) / 1000, 0.05);
    lastNow = now;

    if (!paused) {
      if (phase === 'diving') {
        t += ZOOM_RATE * dt;
        updateOffsetAnim(now);
        checkWaypointTriggers();
        if (activeCardIdx >= 0) {
          cardElapsed += dt;
          if (cardElapsed > CARD_DURATION) { hideCard(); activeCardIdx = -1; }
        }
        if (t >= CAP_T) beginPullback();
      } else if (phase === 'pulling-back') {
        pullbackP += dt / PULLBACK_DURATION;
        if (pullbackP >= 1) { finishPullback(); }
        else { t = pullbackFrom - (pullbackFrom - 0) * easeOutCubic(pullbackP); }
      } else if (phase === 'holding') {
        holdTimer += dt;
        if (holdTimer >= HOLD_DURATION) { phase = 'diving'; roStatus.textContent = 'DIVING'; }
      }
    }

    var rStart = performance.now();
    if (phase === 'pulling-back') {
      renderCoarse(snapshotCamera());
    } else {
      renderFine();
    }
    ctx.putImageData(imageData, 0, 0);
    lastRenderMs = performance.now() - rStart;

    updateHUD();
  }

  // ---------------------------------------------------------------------
  // 8. Controls
  // ---------------------------------------------------------------------
  function setPaused(p) {
    paused = p;
    btnPause.setAttribute('aria-pressed', String(p));
    pauseIcon.textContent = p ? '▶' : '❊';
    pauseLabel.textContent = p ? 'RESUME' : 'PAUSE';
  }
  btnPause.addEventListener('click', function () { setPaused(!paused); });
  setPaused(paused);

  btnPalette.addEventListener('click', function () {
    paletteIdx = (paletteIdx + 1) % PALETTE_COUNT;
    paletteLabel.textContent = PALETTE_DEFS[paletteIdx].name;
    recolorAll();
    ctx.putImageData(imageData, 0, 0);
  });
  paletteLabel.textContent = PALETTE_DEFS[paletteIdx].name;

  function handlePointerDown(e) {
    if (phase === 'pulling-back') return;
    var rect = canvas.getBoundingClientRect();
    var px = (e.clientX - rect.left) / rect.width * bufW;
    var py = (e.clientY - rect.top) / rect.height * bufH;
    var cam = snapshotCamera();
    var re = cam.cx + (px / bufW - 0.5) * cam.spanRe;
    var im = cam.cy + (py / bufH - 0.5) * cam.spanIm;
    triggerRecenter(re, im);
    spawnPulse(e.clientX, e.clientY);
  }
  canvas.addEventListener('pointerdown', handlePointerDown);

  function spawnPulse(x, y) {
    reticle.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%)';
    reticle.classList.remove('pulsing');
    void reticle.offsetWidth;
    reticle.classList.add('pulsing');
  }

  if (pointerFine) {
    window.addEventListener('pointermove', function (e) {
      reticle.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px) translate(-50%,-50%)';
    }, { passive: true });
    canvas.addEventListener('pointerenter', function () { reticle.classList.add('visible'); });
    canvas.addEventListener('pointerleave', function () { reticle.classList.remove('visible'); });
  }

  // ---------------------------------------------------------------------
  // 9. Boot
  // ---------------------------------------------------------------------
  setupBuffers();
  if (prefersReduced) {
    // gentle/static fallback: land on the coastline view, fully sharpened,
    // narrative card present, no continuous motion until the user opts in.
    t = WAYPOINTS[0].t;
    checkWaypointTriggers();
    roStatus.textContent = 'PAUSED';
  } else {
    checkWaypointTriggers();
    roStatus.textContent = 'CALIBRATING';
    setTimeout(function () { if (!paused) roStatus.textContent = 'DIVING'; }, 900);
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setupBuffers, 220);
  });

  requestAnimationFrame(function (now) { lastNow = now; frame(now); });
})();
