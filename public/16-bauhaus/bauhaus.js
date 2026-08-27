/* BAUHAUS SPIELPLATZ — bauhaus.js
   Hand-rolled drag physics (velocity + friction + elastic boundary bounce),
   a spring-stagger reset/scatter system, CSS-driven "form follows function"
   demos, and a small generative poster engine. No external libraries. */
(() => {
  'use strict';

  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = reducedMQ.matches;
  document.documentElement.classList.toggle('reduced', reduced);
  reducedMQ.addEventListener('change', (e) => {
    reduced = e.matches;
    document.documentElement.classList.toggle('reduced', reduced);
    if (reduced) {
      const mh = document.querySelector('.manifest-huge');
      if (mh) mh.style.transform = '';
    }
  });

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    t = clamp(t, 0, 1);
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function easeOutQuad(t) { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t); }

  /* ---------------------------------------------------------------
     THE KOMPOSITION — 13 shapes: circles, a ring, triangles,
     rectangles/bars, arcs and rules. Positions/sizes are fractions
     (0..1) of the stage so the layout is identical in spirit at
     1440px and at 390px.
  --------------------------------------------------------------- */
  const SHAPES = [
    { id: 'c1', type: 'circle', color: 'yellow', wf: .32, xf: .20, yf: .27, rot: 0, spin: .0009, label: 'large yellow circle' },
    { id: 'ring1', type: 'ring', color: 'black', wf: .19, xf: .79, yf: .17, rot: 0, bw: .11, spin: -.0006, label: 'black ring' },
    { id: 'c2', type: 'circle', color: 'red', wf: .065, xf: .50, yf: .63, rot: 0, spin: .0018, label: 'small red circle' },
    { id: 't1', type: 'triangle', color: 'blue', wf: .30, hf: .27, xf: .66, yf: .56, rot: 8, spin: .0007, label: 'large blue triangle' },
    { id: 't2', type: 'triangle', color: 'red', wf: .13, hf: .12, xf: .27, yf: .74, rot: -16, spin: -.0012, label: 'small red triangle' },
    { id: 'rect1', type: 'rect', color: 'black', wf: .045, hf: .32, xf: .47, yf: .32, rot: 9, spin: .0005, label: 'black bar' },
    { id: 'rect2', type: 'rect', color: 'blue', wf: .17, hf: .17, xf: .86, yf: .68, rot: -7, spin: -.0008, label: 'blue square' },
    { id: 'rect3', type: 'rect', color: 'yellow', wf: .24, hf: .036, xf: .14, yf: .53, rot: -17, spin: .0006, label: 'yellow bar' },
    { id: 'arc1', type: 'arc', color: 'black', wf: .27, xf: .58, yf: .82, rot: 0, startDeg: -30, sweepDeg: 150, sw: 15, spin: .0004, label: 'thick black arc' },
    { id: 'arc2', type: 'arc', color: 'red', wf: .19, xf: .11, yf: .15, rot: 0, startDeg: 190, sweepDeg: 210, sw: 7, spin: -.0009, label: 'thin red arc' },
    { id: 'rule1', type: 'rule', color: 'black', wf: .30, hf: .013, xf: .63, yf: .10, rot: 33, spin: .0003, label: 'black diagonal rule' },
    { id: 'rule2', type: 'rule', color: 'red', wf: .22, hf: .011, xf: .40, yf: .90, rot: -19, spin: -.0005, label: 'red diagonal rule' },
    { id: 't3', type: 'triangle', color: 'yellow', wf: .09, hf: .09, xf: .93, yf: .60, rot: 20, spin: .0015, label: 'small yellow triangle' },
  ];

  function polar(cx, cy, r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function arcPathD(cx, cy, r, startDeg, sweepDeg) {
    const p1 = polar(cx, cy, r, startDeg);
    const p2 = polar(cx, cy, r, startDeg + sweepDeg);
    const large = sweepDeg > 180 ? 1 : 0;
    return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  const stage = document.getElementById('stage');
  let zTop = 10;
  const shapes = [];

  function buildShape(cfg) {
    const el = document.createElement('div');
    el.className = 'shape';
    el.dataset.shape = cfg.type;
    el.dataset.color = cfg.color;
    el.tabIndex = 0;
    el.setAttribute('aria-label', `${cfg.label}, draggable — arrow keys move it, enter gives it a flick`);

    if (cfg.type === 'arc') {
      const r = 34, sw = cfg.sw || 12;
      const d = arcPathD(50, 50, r, cfg.startDeg, cfg.sweepDeg);
      el.innerHTML = `<svg class="fill" viewBox="0 0 100 100" aria-hidden="true"><path d="${d}" fill="none" stroke-width="${sw}" stroke-linecap="butt"/></svg>`;
    } else {
      el.innerHTML = `<span class="fill"></span>`;
    }
    stage.appendChild(el);

    const s = {
      cfg, el,
      w: 0, h: 0,
      x: 0, y: 0, rot: cfg.rot,
      homeX: 0, homeY: 0, homeRot: cfg.rot,
      vx: 0, vy: 0,
      dragging: false, tween: null,
      spin: cfg.spin,
      // ambient idle drift — deliberately punchy (not a subtle wobble) so the
      // stage reads as visibly alive within a couple of seconds on camera
      bf: 0.0008 + Math.random() * 0.0009,
      bpx: Math.random() * 10,
      bpy: Math.random() * 10,
      bamp: 9 + Math.random() * 10,
      bsf: 0.0011 + Math.random() * 0.0007,
      bsp: Math.random() * 10,
      history: [],
    };
    shapes.push(s);
    wireDrag(s);
    wireKeys(s);
    return s;
  }

  function applySize(s) {
    s.el.style.width = s.w + 'px';
    s.el.style.height = s.h + 'px';
    if (s.cfg.type === 'ring') {
      const fill = s.el.querySelector('.fill');
      fill.style.borderWidth = Math.max(2, (s.cfg.bw || .12) * s.w) + 'px';
    }
  }

  let stageW = 0, stageH = 0;
  function relayout(isInit) {
    const rect = stage.getBoundingClientRect();
    const newW = rect.width, newH = rect.height;
    const unit = Math.min(newW, newH);
    shapes.forEach((s) => {
      const cfg = s.cfg;
      s.w = cfg.wf * unit;
      s.h = (cfg.hf != null ? cfg.hf : cfg.wf) * unit;
      if (isInit || stageW === 0) {
        s.x = cfg.xf * newW;
        s.y = cfg.yf * newH;
        s.rot = cfg.rot;
      } else {
        s.x *= newW / stageW;
        s.y *= newH / stageH;
      }
      s.homeX = cfg.xf * newW;
      s.homeY = cfg.yf * newH;
      s.homeRot = cfg.rot;
      applySize(s);
    });
    stageW = newW; stageH = newH;
  }

  /* ------------------------- drag physics ------------------------- */
  const FRICTION = 0.986;   // per ~16.7ms frame, applied frame-rate-adjusted
  const RESTITUTION = 0.68;
  const MAX_FLING = 2.4;    // px/ms

  function wireDrag(s) {
    s.el.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      s.el.setPointerCapture(e.pointerId);
      s.dragging = true;
      s.el.classList.add('dragging');
      s.tween = null;
      s.vx = 0; s.vy = 0;
      s.el.style.zIndex = String(++zTop);
      s.startX = s.x; s.startY = s.y;
      s.startPX = e.clientX; s.startPY = e.clientY;
      s.history = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
      e.preventDefault();
    });
    s.el.addEventListener('pointermove', (e) => {
      if (!s.dragging) return;
      const dxp = e.clientX - s.startPX, dyp = e.clientY - s.startPY;
      let nx = s.startX + dxp, ny = s.startY + dyp;
      nx = clamp(nx, s.w / 2, stageW - s.w / 2);
      ny = clamp(ny, s.h / 2, stageH - s.h / 2);
      s.x = nx; s.y = ny;
      s.history.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (s.history.length > 6) s.history.shift();
    });
    function release(e) {
      if (!s.dragging) return;
      s.dragging = false;
      s.el.classList.remove('dragging');
      const h = s.history;
      if (h.length >= 2) {
        const a = h[0], b = h[h.length - 1];
        const dt = Math.max(b.t - a.t, 1);
        s.vx = clamp((b.x - a.x) / dt, -MAX_FLING, MAX_FLING);
        s.vy = clamp((b.y - a.y) / dt, -MAX_FLING, MAX_FLING);
      }
      try { s.el.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    s.el.addEventListener('pointerup', release);
    s.el.addEventListener('pointercancel', release);
  }

  function wireKeys(s) {
    s.el.addEventListener('keydown', (e) => {
      const step = 16;
      if (e.key === 'ArrowLeft') { s.tween = null; s.x = clamp(s.x - step, s.w / 2, stageW - s.w / 2); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { s.tween = null; s.x = clamp(s.x + step, s.w / 2, stageW - s.w / 2); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { s.tween = null; s.y = clamp(s.y - step, s.h / 2, stageH - s.h / 2); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { s.tween = null; s.y = clamp(s.y + step, s.h / 2, stageH - s.h / 2); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') {
        s.tween = null;
        s.vx = (Math.random() * 2 - 1) * 0.9;
        s.vy = (Math.random() * 2 - 1) * 0.9;
        e.preventDefault();
      }
    });
  }

  /* ------------------------- reset / zufall ------------------------- */
  const STAGGER_MS = 45;

  function startTween(s, tx, ty, tr, i, opts) {
    const stagger = (opts && opts.stagger != null) ? opts.stagger : STAGGER_MS;
    const dur = (opts && opts.dur != null) ? opts.dur : 620;
    s.dragging = false;
    s.el.classList.remove('dragging');
    s.vx = 0; s.vy = 0;
    s.tween = {
      start: performance.now() + (reduced ? 0 : i * stagger),
      fx: s.x, fy: s.y, fr: s.rot,
      tx, ty, tr,
      dur: reduced ? 220 : dur,
    };
  }

  function resetKomposition() {
    shuffle(shapes).forEach((s, i) => startTween(s, s.homeX, s.homeY, s.homeRot, i));
  }

  /* ---------------------------------------------------------------
     ENTRANCE — the Komposition assembles itself on first load: every
     shape starts flung out beyond the stage edge (in the direction of
     its home position, so the motion always reads as "arriving") and
     springs into place in a shuffled cascade. The signature first
     beat of the page — geometry snapping into balance out of chaos,
     which is the whole thesis of the site made physical.
  --------------------------------------------------------------- */
  function entranceAssemble() {
    if (reduced) return; // shapes already sit at their home position — a static, composed first paint
    const order = shuffle(shapes);
    const cx = stageW / 2, cy = stageH / 2;
    order.forEach((s, i) => {
      let dx = s.homeX - cx, dy = s.homeY - cy;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const outDist = Math.max(stageW, stageH) * 0.6 + 140;
      s.x = cx + dx * outDist;
      s.y = cy + dy * outDist;
      s.rot = s.homeRot + (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 180);
      startTween(s, s.homeX, s.homeY, s.homeRot, i, { stagger: 60, dur: 820 });
    });
  }

  function balancedCells(n) {
    const cols = 5, rows = 4;
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ c, r });
    return shuffle(cells).slice(0, n).map(({ c, r }) => ({
      xf: (c + 0.5 + (Math.random() - 0.5) * 0.72) / cols,
      yf: (r + 0.5 + (Math.random() - 0.5) * 0.72) / rows,
    }));
  }

  function zufall() {
    const cells = balancedCells(shapes.length);
    shuffle(shapes).forEach((s, i) => {
      const cell = cells[i];
      const tx = clamp(cell.xf * stageW, s.w / 2, stageW - s.w / 2);
      const ty = clamp(cell.yf * stageH, s.h / 2, stageH - s.h / 2);
      const tr = s.homeRot + (Math.random() * 76 - 38);
      startTween(s, tx, ty, tr, i);
    });
  }

  function thud(btn) {
    if (reduced) return;
    btn.classList.remove('thud');
    void btn.offsetWidth; // restart the keyframe
    btn.classList.add('thud');
  }
  const resetBtn = document.getElementById('resetBtn');
  const zufallBtn = document.getElementById('zufallBtn');
  resetBtn.addEventListener('click', () => { resetKomposition(); thud(resetBtn); });
  zufallBtn.addEventListener('click', () => { zufall(); thud(zufallBtn); });

  /* ------------------------- animation loop ------------------------- */
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(now - lastT, 48);
    lastT = now;
    if (!document.hidden) {
      const frameRatio = dt / 16.6667;
      for (const s of shapes) {
        if (s.dragging) {
          // position already owned by pointermove
        } else if (s.tween) {
          const t = (now - s.tween.start) / s.tween.dur;
          if (t >= 1) {
            s.x = s.tween.tx; s.y = s.tween.ty; s.rot = s.tween.tr;
            s.tween = null;
          } else {
            const e = reduced ? easeOutQuad(t) : easeOutBack(t);
            s.x = lerp(s.tween.fx, s.tween.tx, e);
            s.y = lerp(s.tween.fy, s.tween.ty, e);
            s.rot = lerp(s.tween.fr, s.tween.tr, e);
          }
        } else {
          const f = Math.pow(FRICTION, frameRatio);
          s.vx *= f; s.vy *= f;
          if (Math.abs(s.vx) < 0.002) s.vx = 0;
          if (Math.abs(s.vy) < 0.002) s.vy = 0;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          const hw = s.w / 2, hh = s.h / 2;
          if (s.x - hw < 0) { s.x = hw; s.vx = Math.abs(s.vx) * RESTITUTION; }
          else if (s.x + hw > stageW) { s.x = stageW - hw; s.vx = -Math.abs(s.vx) * RESTITUTION; }
          if (s.y - hh < 0) { s.y = hh; s.vy = Math.abs(s.vy) * RESTITUTION; }
          else if (s.y + hh > stageH) { s.y = stageH - hh; s.vy = -Math.abs(s.vy) * RESTITUTION; }
          if (!reduced) s.rot += s.spin * dt;
        }

        let rx = s.x, ry = s.y, sc = 1;
        if (!reduced && !s.dragging && !s.tween) {
          rx += Math.sin(now * s.bf + s.bpx) * s.bamp;
          ry += Math.cos(now * s.bf * 0.86 + s.bpy) * s.bamp;
          sc = 1 + Math.sin(now * s.bsf + s.bsp) * 0.045;
        }
        s.el.style.transform = `translate(${(rx - s.w / 2).toFixed(2)}px, ${(ry - s.h / 2).toFixed(2)}px) rotate(${s.rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      }
    }
    requestAnimationFrame(frame);
  }

  SHAPES.forEach(buildShape);
  relayout(true);
  entranceAssemble();
  requestAnimationFrame(frame);

  let resizePending = false;
  window.addEventListener('resize', () => {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => { relayout(false); resizePending = false; });
  });

  /* ---------------------------------------------------------------
     FORM FOLGT FUNKTION — toggle cards, animation is pure CSS,
     JS only flips aria-pressed.
  --------------------------------------------------------------- */
  document.querySelectorAll('.toggle-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const active = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!active));
    });
  });

  /* ---------------------------------------------------------------
     DIE PLAKATE — a tiny generative poster engine. Real exhibition
     type in a fictional 1923 Weimar programme, geometry from the
     same three-form vocabulary as the hero.
  --------------------------------------------------------------- */
  const EVENTS = ['Ausstellung', 'Werkschau', 'Vortragsabend', 'Fest der Form', 'Bauhaus-Bühne', 'Farbkurs'];
  const VENUES = ['Staatliches Bauhaus, Weimar', 'Haus am Horn', 'Großes Atelierhaus', 'Am Theaterplatz', 'Kunstgewerbeschule'];
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const BG_HEX = { canvas: '#F2E8DC', black: '#141414', red: '#D93829', blue: '#2350A8' };
  const ACC_HEX = { red: '#D93829', blue: '#2350A8', yellow: '#F2B705', black: '#141414', canvas: '#F2E8DC' };

  function posterArc(cx, cy, r, startDeg, sweepDeg) { return arcPathD(cx, cy, r, startDeg, sweepDeg); }

  function buildPoster(svgEl) {
    const bgKey = pick(['canvas', 'black', 'red', 'blue']);
    const bgHex = BG_HEX[bgKey];
    const ink = bgKey === 'black' ? '#F2E8DC' : (bgKey === 'canvas' ? '#141414' : '#FFFFFF');
    const accentPool = Object.keys(ACC_HEX).filter((c) => c !== bgKey);

    const event = pick(EVENTS).toUpperCase();
    const venue = pick(VENUES).toUpperCase();
    const day1 = 1 + Math.floor(Math.random() * 22);
    const day2 = Math.min(28, day1 + 3 + Math.floor(Math.random() * 10));
    const month = pick(MONTHS);
    const ticket = String(10 + Math.floor(Math.random() * 89));

    let shapesSVG = '';
    const n = 4 + Math.floor(Math.random() * 2); // 4–5 forms — every poster reads equally full
    const placed = [];
    for (let i = 0; i < n; i++) {
      const hex = ACC_HEX[pick(accentPool)];
      const kind = pick(['circle', 'triangle', 'rect', 'arc', 'rule']);
      const sz = 30 + Math.random() * 66;
      // light minimum-distance retry so compositions stay balanced rather than clumping
      let cx, cy, tries = 0;
      do {
        cx = 46 + Math.random() * 208;
        cy = 108 + Math.random() * 168;
        tries++;
      } while (tries < 7 && placed.some((p) => Math.hypot(p.cx - cx, p.cy - cy) < (p.sz + sz) * 0.34));
      placed.push({ cx, cy, sz });
      const rot = Math.floor(Math.random() * 360);
      if (kind === 'circle') {
        shapesSVG += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(sz / 2).toFixed(1)}" fill="${hex}"/>`;
      } else if (kind === 'rect') {
        shapesSVG += `<rect x="${(cx - sz / 2).toFixed(1)}" y="${(cy - sz / 2).toFixed(1)}" width="${sz.toFixed(1)}" height="${sz.toFixed(1)}" fill="${hex}" transform="rotate(${rot} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
      } else if (kind === 'triangle') {
        const pts = `${cx.toFixed(1)},${(cy - sz / 2).toFixed(1)} ${(cx + sz / 2).toFixed(1)},${(cy + sz / 2).toFixed(1)} ${(cx - sz / 2).toFixed(1)},${(cy + sz / 2).toFixed(1)}`;
        shapesSVG += `<polygon points="${pts}" fill="${hex}" transform="rotate(${rot} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
      } else if (kind === 'rule') {
        const len = sz * 1.5, sw = Math.max(5, sz * 0.16);
        shapesSVG += `<rect x="${(cx - len / 2).toFixed(1)}" y="${(cy - sw / 2).toFixed(1)}" width="${len.toFixed(1)}" height="${sw.toFixed(1)}" rx="${(sw / 2).toFixed(1)}" fill="${hex}" transform="rotate(${rot} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
      } else {
        const r = sz / 2, sw = Math.max(6, sz * 0.2);
        shapesSVG += `<path d="${posterArc(cx, cy, r, Math.random() * 360, 90 + Math.random() * 180)}" fill="none" stroke="${hex}" stroke-width="${sw.toFixed(1)}"/>`;
      }
    }

    svgEl.innerHTML = `
      <rect width="300" height="400" fill="${bgHex}"/>
      <g opacity="0.94">${shapesSVG}</g>
      <text x="24" y="44" font-family="Jost" font-weight="800" font-size="25" letter-spacing="0.5" fill="${ink}">${event}</text>
      <line x1="24" y1="56" x2="150" y2="56" stroke="${ink}" stroke-width="2"/>
      <text x="24" y="350" font-family="Jost" font-weight="600" font-size="11.5" letter-spacing="1.1" fill="${ink}">${venue}</text>
      <text x="24" y="368" font-family="Jost" font-weight="400" font-size="11" letter-spacing="1" fill="${ink}" opacity="0.85">${day1}.–${day2}. ${month} 1923</text>
      <text x="24" y="386" font-family="Jost" font-weight="400" font-size="9.5" letter-spacing="1.3" fill="${ink}" opacity="0.7">EINTRITT · KARTE NR. ${ticket}</text>
      <text x="278" y="392" font-family="Jost" font-weight="800" font-size="14" fill="${ink}" opacity="0.5" text-anchor="end">23</text>
    `;
  }

  ['poster1', 'poster2', 'poster3'].forEach((id) => {
    const btn = document.getElementById(id);
    const svg = btn.querySelector('svg');
    buildPoster(svg);
    btn.addEventListener('click', () => {
      buildPoster(svg);
      btn.classList.remove('regen');
      void btn.offsetWidth;
      btn.classList.add('regen');
    });
  });

  /* ---------------------------------------------------------------
     SCROLL-LINKED PARALLAX — the red manifesto band's huge type
     tightens its rotation as it crosses the viewport, so the poster
     line visibly "unfolds" under the reader's own scroll rather than
     just fading in once. Cheap: one element, rAF-gated scroll listener.
  --------------------------------------------------------------- */
  const manifestBand = document.querySelector('.manifest-band');
  const manifestHuge = document.querySelector('.manifest-huge');
  let scrollTicking = false;
  function updateManifestParallax() {
    scrollTicking = false;
    if (reduced || !manifestBand || !manifestHuge) return;
    const rect = manifestBand.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const center = rect.top + rect.height / 2;
    const progress = clamp((vh / 2 - center) / (vh / 2 + rect.height / 2), -1, 1);
    const rot = -3.2 + progress * 5.2;
    const shift = progress * 20;
    manifestHuge.style.transform = `rotate(${rot.toFixed(2)}deg) translateX(${shift.toFixed(1)}px)`;
  }
  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateManifestParallax);
  }, { passive: true });
  updateManifestParallax();

  /* ------------------------- reveal on scroll ------------------------- */
  const rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    rv.forEach((el) => io.observe(el));
  } else {
    rv.forEach((el) => el.classList.add('in'));
  }
})();
