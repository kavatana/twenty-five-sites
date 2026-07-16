/* MERIDIAN — issue 04 · on precision
   Hand-rolled: arc plate generator, scroll instruments, grid overlay. */
(() => {
  'use strict';

  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => rm.matches;

  /* ————— Zürich clock ————— */
  const clockEl = document.getElementById('clock');
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const tick = () => { clockEl.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 1000);

  /* ————— grid overlay: 12 truthful columns ————— */
  const cells = document.getElementById('gridcells');
  for (let i = 1; i <= 12; i++) {
    const c = document.createElement('i');
    c.setAttribute('data-n', String(i).padStart(2, '0'));
    cells.appendChild(c);
  }
  const gridbtn = document.getElementById('gridbtn');
  const setGrid = (on) => {
    document.documentElement.classList.toggle('grid-on', on);
    gridbtn.setAttribute('aria-pressed', String(on));
  };
  gridbtn.addEventListener('click', () =>
    setGrid(!document.documentElement.classList.contains('grid-on')));
  addEventListener('keydown', (e) => {
    if ((e.key === 'g' || e.key === 'G') && !e.metaKey && !e.ctrlKey && !e.altKey) {
      setGrid(!document.documentElement.classList.contains('grid-on'));
    }
  });

  /* ————— arc plate: after 'beethoven', 1955 ————— */
  const NS = 'http://www.w3.org/2000/svg';
  const sys = document.getElementById('arcsys');
  const CX = 250, CY = 470;
  const bands = [
    // width, sweep°, start°, deg/sec
    { w: 4,  sweep: 318, start: 205, v:  0.9  },
    { w: 7,  sweep: 262, start:  80, v: -0.65 },
    { w: 11, sweep: 226, start: 310, v:  0.5,  red: true },
    { w: 18, sweep: 331, start: 150, v: -0.42 },
    { w: 29, sweep: 197, start:  20, v:  0.34 },
    { w: 47, sweep: 283, start: 250, v: -0.27 },
    { w: 76, sweep: 238, start: 115, v:  0.21 },
  ];
  const GAP = 14;
  let r = 54;
  const arcs = bands.map((b) => {
    const rc = r + b.w / 2;
    r += b.w + GAP;
    const g = document.createElementNS(NS, 'g');
    const c = document.createElementNS(NS, 'circle');
    const circ = 2 * Math.PI * rc;
    const dash = (b.sweep / 360) * circ;
    c.setAttribute('cx', CX); c.setAttribute('cy', CY); c.setAttribute('r', rc);
    c.setAttribute('fill', 'none');
    c.setAttribute('stroke', b.red ? '#E63329' : '#F4F1EA');
    c.setAttribute('stroke-width', b.w);
    c.setAttribute('stroke-dasharray', `${dash} ${circ - dash}`);
    g.appendChild(c);
    sys.appendChild(g);
    return { g, angle: b.start, v: b.v };
  });
  const setArcAngles = () => {
    for (const a of arcs) a.g.setAttribute('transform', `rotate(${a.angle} ${CX} ${CY})`);
  };
  setArcAngles();

  /* ————— scroll instruments ————— */
  const bar = document.getElementById('progressBar');
  const marker = document.getElementById('rulerMarker');
  const readout = document.getElementById('rulerReadout');
  const numeral = document.getElementById('numeral');
  const regmark = document.getElementById('regmark');

  let target = scrollY, cur = scrollY, maxScroll = 1;
  const measure = () => {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  };
  measure();
  addEventListener('resize', measure);
  addEventListener('scroll', () => { target = scrollY; }, { passive: true });

  const applyScroll = (y) => {
    const f = Math.min(1, Math.max(0, y / maxScroll));
    bar.style.transform = `scaleX(${f})`;
    marker.style.top = `${(f * (innerHeight - 30)).toFixed(1)}px`;
    readout.textContent = String(Math.round(f * 100)).padStart(3, '0');
    return f;
  };

  /* ————— reveals ————— */
  const rvs = document.querySelectorAll('.rv');
  if (reduced() || !('IntersectionObserver' in window)) {
    rvs.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((ents) => {
      for (const en of ents) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    rvs.forEach((el) => io.observe(el));
  }

  /* ————— main loop ————— */
  let raf = null, last = performance.now(), deflect = 0, regAngle = 0;
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    cur += (target - cur) * 0.09;
    if (Math.abs(target - cur) < 0.1) cur = target;
    const f = applyScroll(cur);

    // arcs: extremely slow rotation + ±5° scroll deflection
    const dTarget = (f * 2 - 1) * 5;
    deflect += (dTarget - deflect) * 0.06;
    for (const a of arcs) a.angle = (a.angle + a.v * dt) % 360;
    setArcAngles();
    sys.setAttribute('transform', `rotate(${deflect.toFixed(3)} ${CX} ${CY})`);

    // cover numeral drifts against the scroll; registration mark keeps time
    numeral.style.setProperty('--drift', `${(cur * 0.06).toFixed(1)}px`);
    regAngle = (regAngle + 4 * dt) % 360;
    regmark.style.transform = `rotate(${regAngle.toFixed(2)}deg)`;

    raf = requestAnimationFrame(loop);
  };

  const start = () => {
    if (raf === null && !reduced()) { last = performance.now(); raf = requestAnimationFrame(loop); }
  };
  const stop = () => { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } };

  if (reduced()) {
    // static composition: instruments still truthful, no continuous motion
    applyScroll(scrollY);
    addEventListener('scroll', () => applyScroll(scrollY), { passive: true });
  } else {
    start();
  }
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : start();
  });
  rm.addEventListener?.('change', () => {
    if (reduced()) { stop(); applyScroll(scrollY); }
    else start();
  });
})();
