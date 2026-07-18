// ============================================================
// ALMANAC — main.js
// Orrery · star chart · moon counts · eclipse timeline · light rings
// ============================================================
(() => {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, ns) => {
    const n = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  // ---------------------------------------------------------
  // ambient starfield (canvas, cheap, capped DPR)
  // ---------------------------------------------------------
  (function starfield() {
    const canvas = document.getElementById('stars');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(devicePixelRatio || 1, 2);
    let w, h, stars = [];

    function seedRand(seed) {
      let s = seed;
      return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const rnd = seedRand(20260712);

    function resize() {
      w = canvas.width = innerWidth * DPR;
      h = canvas.height = innerHeight * DPR;
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
      const count = Math.round((innerWidth * innerHeight) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: rnd() * w,
        y: rnd() * h,
        r: (rnd() * 1.1 + 0.3) * DPR,
        phase: rnd() * Math.PI * 2,
        speed: 0.4 + rnd() * 0.8,
      }));
    }
    resize();
    addEventListener('resize', resize);

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = REDUCED ? 0.75 : 0.55 + 0.45 * Math.sin(t * 0.001 * s.speed + s.phase);
        ctx.globalAlpha = tw * 0.8;
        ctx.fillStyle = '#E8E4D8';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!REDUCED && !document.hidden) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    if (REDUCED) draw(0);
  })();

  // ---------------------------------------------------------
  // masthead clock — sidereal-flavoured, real local time
  // ---------------------------------------------------------
  (function clock() {
    const node = document.getElementById('clock');
    if (!node) return;
    function tick() {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      node.textContent = `${hh}:${mm}:${ss} local`;
    }
    tick();
    setInterval(tick, 1000);
  })();

  // ---------------------------------------------------------
  // reveal-on-scroll for .rv elements
  // ---------------------------------------------------------
  (function reveal() {
    const targets = document.querySelectorAll('.rv');
    if (!targets.length) return;
    if (REDUCED) { targets.forEach(t => t.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(t => io.observe(t));
  })();

  // ===========================================================
  // FIGURE 0 — HERO ORRERY
  // ===========================================================
  (function orrery() {
    const svg = document.getElementById('orrerySvg');
    if (!svg) return;
    const legend = document.getElementById('orreryLegend');
    const CX = 320, CY = 320;

    // true relative periods (Earth years) compressed so Mercury completes
    // one revolution every 4 seconds — ratios are exact, only the clock is fast.
    const MULT = 4 / 0.2408; // seconds per Earth-year-equivalent
    const PLANETS = [
      { name: 'Mercury', yrs: 0.2408, r: 92,  size: 3.1 },
      { name: 'Venus',   yrs: 0.6152, r: 124, size: 4.6 },
      { name: 'Earth',   yrs: 1.0000, r: 156, size: 4.8 },
      { name: 'Mars',    yrs: 1.8809, r: 188, size: 3.6 },
      { name: 'Jupiter', yrs: 11.862, r: 232, size: 8.4 },
      { name: 'Saturn',  yrs: 29.457, r: 274, size: 7.4 },
    ];

    const sun = el('circle', { cx: CX, cy: CY, r: 12, class: 'sunmark-glow' }, SVGNS);
    const sun2 = el('circle', { cx: CX, cy: CY, r: 6, class: 'sunmark' }, SVGNS);

    const rings = el('g', {}, SVGNS);
    const carriers = [];

    PLANETS.forEach((p, i) => {
      const ring = el('circle', { cx: CX, cy: CY, r: p.r, class: 'orbit-ring' }, SVGNS);
      rings.appendChild(ring);

      const carrier = el('g', {}, SVGNS);
      carrier.style.transformOrigin = `${CX}px ${CY}px`;
      const dot = el('circle', {
        cx: CX + p.r, cy: CY, r: p.size,
        class: 'planet-dot',
        fill: i === 0 ? 'var(--paper)' : (i % 2 === 0 ? 'var(--gold)' : 'var(--gold-soft)')
      }, SVGNS);
      carrier.appendChild(dot);
      rings.appendChild(carrier);
      carriers.push({ carrier, periodSec: p.yrs * MULT, angle: (i / PLANETS.length) * 360 });
    });

    svg.appendChild(rings);
    svg.appendChild(sun);
    svg.appendChild(sun2);

    // legend
    if (legend) {
      PLANETS.forEach((p) => {
        const li = el('div', { class: 'li' });
        const periodDays = Math.round(p.yrs * 365.25);
        const periodLabel = p.yrs < 1 ? `${periodDays} d / orbit` : `${p.yrs.toFixed(2)} yr / orbit`;
        li.innerHTML = `<span class="sw"></span><span class="nm">${p.name}</span><span class="pd">${periodLabel}</span>`;
        legend.appendChild(li);
      });
    }

    let start = performance.now();
    function frame(t) {
      const elapsed = (t - start) / 1000;
      for (const c of carriers) {
        const deg = c.angle + (elapsed / c.periodSec) * 360;
        c.carrier.style.transform = `rotate(${deg}deg)`;
      }
      if (!document.hidden) requestAnimationFrame(frame);
    }
    if (REDUCED) {
      // static, elegantly staggered positions — no motion, still composed
      for (const c of carriers) c.carrier.style.transform = `rotate(${c.angle}deg)`;
    } else {
      requestAnimationFrame(frame);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) { start = performance.now() - (start ? 0 : 0); requestAnimationFrame(frame); }
      });
    }
  })();

  // ===========================================================
  // FIGURE I — BRIGHTNESS OF STARS (horizon-arc scatter)
  // ===========================================================
  (function starChart() {
    const svg = document.getElementById('starSvg');
    if (!svg) return;
    const tooltip = document.getElementById('starTooltip');
    const wrapEl = svg.closest('.starchart-fig');

    const STARS = [
      { name: 'Sirius',           mag: -1.46, ly: 8.6 },
      { name: 'Canopus',          mag: -0.74, ly: 310 },
      { name: 'Rigil Kentaurus',  mag: -0.27, ly: 4.37 },
      { name: 'Arcturus',         mag: -0.05, ly: 37 },
      { name: 'Vega',             mag: 0.03,  ly: 25 },
      { name: 'Capella',          mag: 0.08,  ly: 43 },
      { name: 'Rigel',            mag: 0.13,  ly: 860 },
      { name: 'Procyon',          mag: 0.34,  ly: 11.5 },
      { name: 'Achernar',         mag: 0.46,  ly: 139 },
      { name: 'Betelgeuse',       mag: 0.50,  ly: 548 },
      { name: 'Hadar',            mag: 0.61,  ly: 390 },
      { name: 'Altair',           mag: 0.76,  ly: 16.7 },
      { name: 'Acrux',            mag: 0.77,  ly: 320 },
      { name: 'Aldebaran',        mag: 0.85,  ly: 65 },
      { name: 'Antares',          mag: 0.96,  ly: 550 },
      { name: 'Spica',            mag: 0.97,  ly: 250 },
      { name: 'Pollux',           mag: 1.14,  ly: 34 },
      { name: 'Fomalhaut',        mag: 1.16,  ly: 25 },
      { name: 'Deneb',            mag: 1.25,  ly: 2600 },
      { name: 'Mimosa',           mag: 1.25,  ly: 280 },
    ];
    // fixed shuffle so brightest stars aren't a monotonic left-right ramp
    const ORDER = [3,17,0,11,7,15,19,2,9,13,5,18,1,10,16,4,12,8,14,6];

    function hash(str) {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
      return (h >>> 0) / 4294967295;
    }

    const VBW = 1000, VBH = 440, HORIZON = 388;
    const map = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);

    STARS.forEach((s, i) => {
      const slot = ORDER.indexOf(i);
      const xJit = (hash(s.name + 'x') - 0.5) * 7;
      const yJit = (hash(s.name + 'y') - 0.5) * 34;
      s.x = map(slot + 0.5, 0, 20, 3, 97) + xJit;
      s.y = map(s.mag, -1.46, 1.25, 62, 330) + yJit;
      s.r = map(s.mag, -1.46, 1.25, 9.4, 3.0);
    });

    const horizon = el('path', {
      d: `M0,${HORIZON} Q${VBW/2},${HORIZON - 46} ${VBW},${HORIZON}`,
      class: 'horizon-line'
    }, SVGNS);
    svg.appendChild(horizon);

    STARS.forEach((s) => {
      const px = (s.x / 100) * VBW;
      const py = s.y;
      const g = el('g', { tabindex: '0', role: 'img', 'aria-label': `${s.name}, ${s.ly} light-years away` }, SVGNS);
      const hit = el('circle', { cx: px, cy: py, r: Math.max(s.r + 8, 12), class: 'star-hit' }, SVGNS);
      const dot = el('circle', { cx: px, cy: py, r: s.r, class: 'star-dot' }, SVGNS);
      dot.style.animationDelay = `${(hash(s.name + 'd') * 4.5).toFixed(2)}s`;
      g.appendChild(hit);
      g.appendChild(dot);
      svg.appendChild(g);

      function show(clientX, clientY) {
        if (!tooltip || !wrapEl) return;
        const box = wrapEl.getBoundingClientRect();
        tooltip.innerHTML = `<div class="t-name">${s.name}</div><div class="t-dist">${s.ly.toLocaleString()} ly &middot; mag ${s.mag.toFixed(2)}</div>`;
        tooltip.style.left = (clientX - box.left) + 'px';
        tooltip.style.top = (clientY - box.top) + 'px';
        tooltip.classList.add('show');
      }
      function hide() { tooltip && tooltip.classList.remove('show'); }

      g.addEventListener('pointerenter', (e) => show(e.clientX, e.clientY));
      g.addEventListener('pointermove', (e) => show(e.clientX, e.clientY));
      g.addEventListener('pointerleave', hide);
      g.addEventListener('focus', () => {
        const r = hit.getBoundingClientRect();
        show(r.left + r.width / 2, r.top);
      });
      g.addEventListener('blur', hide);
    });
  })();

  // ===========================================================
  // FIGURE II — MOONS OF THE GIANTS (dot-strip + ticking numeral)
  // ===========================================================
  (function moons() {
    const rows = document.querySelectorAll('.moon-row');
    if (!rows.length) return;

    rows.forEach((row) => {
      const count = parseInt(row.dataset.count, 10);
      const strip = row.querySelector('.dot-strip');
      const numeral = row.querySelector('.moon-count .n');
      const totalDuration = Math.min(1500, Math.max(600, count * 9));
      strip.style.setProperty('--stagger', `${(totalDuration / count).toFixed(2)}ms`);

      for (let i = 0; i < count; i++) {
        const d = document.createElement('span');
        d.className = 'moon-dot';
        d.style.setProperty('--i', i);
        strip.appendChild(d);
      }

      let done = false;
      function run() {
        if (done) return;
        done = true;
        if (REDUCED) { numeral.textContent = count; return; }
        const t0 = performance.now();
        function step(t) {
          const p = Math.min(1, (t - t0) / totalDuration);
          const eased = 1 - Math.pow(1 - p, 3);
          numeral.textContent = Math.round(eased * count);
          if (p < 1) requestAnimationFrame(step);
          else numeral.textContent = count;
        }
        requestAnimationFrame(step);
      }

      if (REDUCED) { run(); return; }
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { run(); io.unobserve(e.target); } });
      }, { threshold: 0.35 });
      io.observe(row);
    });
  })();

  // ===========================================================
  // FIGURE III — ECLIPSE TIMELINE 2026–2040
  // ===========================================================
  (function eclipses() {
    const wrap = document.getElementById('eclipseTrack');
    if (!wrap) return;

    const ECLIPSES = [
      { date: '2026-02-17', type: 'annular', path: 'Antarctica · S. Pacific' },
      { date: '2026-08-12', type: 'total',   path: 'Greenland · Iceland · Spain', dur: '2m18s' },
      { date: '2027-02-06', type: 'annular', path: 'S. America · Antarctica' },
      { date: '2027-08-02', type: 'total',   path: 'N. Africa · Arabia', dur: '6m23s' },
      { date: '2028-01-26', type: 'annular', path: 'S. America · Atlantic' },
      { date: '2028-07-22', type: 'total',   path: 'Australia · New Zealand', dur: '5m10s' },
      { date: '2030-06-01', type: 'annular', path: 'N. Africa · C. Asia' },
      { date: '2030-11-25', type: 'total',   path: 'S. Africa · Australia', dur: '3m44s' },
      { date: '2031-05-21', type: 'annular', path: 'Africa · Asia' },
      { date: '2033-03-30', type: 'total',   path: 'Alaska · Arctic', dur: '2m37s' },
      { date: '2035-09-02', type: 'total',   path: 'China · Japan · Pacific', dur: '2m54s' },
      { date: '2037-07-13', type: 'total',   path: 'Australia · S. Pacific', dur: '3m58s' },
      { date: '2038-12-26', type: 'annular', path: 'Antarctica' },
      { date: '2040-05-11', type: 'total',   path: 'Asia · Pacific', dur: '2m50s' },
    ];

    const START = 2026, END = 2040.6;
    const TRACK_W = 2100;      // fixed px width — predictable spacing math
    const BASE_STEM = 34;      // px from axis to first row's mark
    const ROW_H = 62;          // px added per additional collision row
    const CARD_ZONE = 82;      // px reserved for mark+card above the stem
    const MIN_GAP = 118;       // px — minimum x-separation within one row

    function yearFrac(dstr) {
      const d = new Date(dstr + 'T00:00:00Z');
      const y = d.getUTCFullYear();
      const start = Date.UTC(y, 0, 1), end = Date.UTC(y + 1, 0, 1);
      return y + (d.getTime() - start) / (end - start);
    }
    function pct(yf) { return ((yf - START) / (END - START)) * 100; }
    function px(yf) { return (pct(yf) / 100) * TRACK_W; }

    const track = document.createElement('div');
    track.className = 'eclipse-track-wrap';
    track.style.width = TRACK_W + 'px';
    const axis = document.createElement('div');
    axis.className = 'eclipse-axis';
    track.appendChild(axis);

    for (let y = START; y <= 2040; y++) {
      const tick = document.createElement('div');
      tick.className = 'eclipse-tick';
      tick.style.left = pct(y) + '%';
      if (y % 2 === 0) tick.innerHTML = `<span class="yr">${y}</span>`;
      axis.appendChild(tick);
    }

    // collision-avoiding row assignment: alternate above/below by index,
    // then push into the next parallel row whenever two entries on the
    // same side would land closer than MIN_GAP apart.
    const laid = ECLIPSES.map((e, i) => ({ e, i, x: px(yearFrac(e.date)), side: i % 2 === 0 ? 'above' : 'below' }));
    const lastX = { above: [], below: [] };
    let maxRow = { above: 0, below: 0 };
    laid.forEach((item) => {
      const arr = lastX[item.side];
      let row = 0;
      while (row < arr.length && (item.x - arr[row]) < MIN_GAP) row++;
      arr[row] = item.x;
      item.row = row;
      maxRow[item.side] = Math.max(maxRow[item.side], row);
    });

    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    laid.forEach(({ e, x, side, row }) => {
      const stemLen = BASE_STEM + row * ROW_H;
      const entry = document.createElement('div');
      entry.className = `eclipse-entry ${e.type} ${side}`;
      entry.style.left = (x / TRACK_W * 100) + '%';
      const [Y, M, D] = e.date.split('-');
      const label = `${D} ${MONTHS[parseInt(M,10)-1]} ${Y}`;
      const card = `<div class="card"><div class="e-date">${label}</div><div class="e-type">${e.type}${e.dur ? ' · ' + e.dur : ''}</div><div class="e-path">${e.path}</div></div>`;
      const mark = `<div class="mark"></div>`;
      const stem = `<div class="stem" style="height:${stemLen}px"></div>`;
      entry.innerHTML = side === 'above' ? (card + mark + stem) : (stem + mark + card);
      axis.appendChild(entry);
    });

    const topPad = BASE_STEM + maxRow.above * ROW_H + CARD_ZONE;
    const botPad = BASE_STEM + maxRow.below * ROW_H + CARD_ZONE;
    track.style.paddingTop = topPad + 'px';
    track.style.paddingBottom = botPad + 'px';

    // now hairline — computed live from the visitor's clock
    const now = new Date();
    const nowYf = now.getUTCFullYear() + (now - Date.UTC(now.getUTCFullYear(),0,1)) / (Date.UTC(now.getUTCFullYear()+1,0,1) - Date.UTC(now.getUTCFullYear(),0,1));
    if (nowYf >= START && nowYf <= END) {
      const leftPct = pct(nowYf) + '%';
      const hairline = document.createElement('div');
      hairline.className = 'now-hairline';
      hairline.style.left = leftPct;
      hairline.style.top = -topPad + 'px';
      hairline.style.height = (topPad + botPad) + 'px';
      axis.appendChild(hairline);

      const next = ECLIPSES.find(e => new Date(e.date + 'T00:00:00Z') >= now);
      let cap = '';
      if (next) {
        const days = Math.max(0, Math.round((new Date(next.date + 'T00:00:00Z') - now) / 86400000));
        cap = `next in ${days}d`;
      }
      const tag = document.createElement('span');
      tag.className = 'now-tag';
      tag.style.left = leftPct;
      tag.textContent = 'NOW';
      axis.appendChild(tag);
      const capEl = document.createElement('span');
      capEl.className = 'now-cap';
      capEl.style.left = leftPct;
      capEl.textContent = cap;
      axis.appendChild(capEl);
    }

    wrap.appendChild(track);

    // scroll affordance — fade masks + hint, driven by real scroll position
    const figwrap = document.getElementById('eclipseFigwrap');
    const scroller = document.getElementById('eclipseScroll');
    if (figwrap && scroller) {
      function syncScrollState() {
        const overflow = scroller.scrollWidth - scroller.clientWidth > 4;
        figwrap.classList.toggle('has-overflow', overflow);
        figwrap.classList.toggle('at-start', scroller.scrollLeft <= 2);
        figwrap.classList.toggle('at-end', scroller.scrollLeft >= scroller.scrollWidth - scroller.clientWidth - 2);
      }
      syncScrollState();
      scroller.addEventListener('scroll', syncScrollState, { passive: true });
      addEventListener('resize', syncScrollState);
      // if the "now" hairline lands off-screen, scroll to it so the visitor
      // starts on the relevant slice of the band rather than always at 2026
      const hairline = axis.querySelector('.now-hairline');
      if (hairline) {
        const hx = parseFloat(hairline.style.left) / 100 * TRACK_W;
        const target = Math.max(0, hx - scroller.clientWidth * 0.4);
        scroller.scrollLeft = Math.min(target, scroller.scrollWidth);
        syncScrollState();
      }
    }
  })();

  // ===========================================================
  // FIGURE IV — LIGHT TRAVEL TIME (concentric rings + photon)
  // ===========================================================
  (function lightRings() {
    const svg = document.getElementById('ringsSvg');
    if (!svg) return;
    const legend = document.getElementById('ringsLegend');
    const CX = 300, CY = 300;

    const RINGS = [
      { name: 'Moon',    label: '1.3 s',    r: 58,  frac: 0.10 },
      { name: 'Sun',     label: '8 m 20 s', r: 128, frac: 0.32 },
      { name: 'Mars',    label: '12 m 40 s (avg.)', r: 182, frac: 0.50 },
      { name: 'Jupiter', label: '43 m (avg.)', r: 232, frac: 0.72 },
      { name: 'Neptune', label: '4 h 10 m',  r: 276, frac: 0.94 },
    ];

    RINGS.forEach((rg) => {
      rg.node = el('circle', { cx: CX, cy: CY, r: rg.r, class: 'tring' }, SVGNS);
      svg.appendChild(rg.node);
    });

    const ray = el('line', { x1: CX, y1: CY, x2: CX, y2: CY - 276, class: 'photon-ray' }, SVGNS);
    svg.appendChild(ray);
    const photon = el('circle', { cx: CX, cy: CY, r: 4, class: 'photon' }, SVGNS);
    svg.appendChild(photon);

    if (legend) {
      RINGS.forEach((rg) => {
        const li = el('div', { class: 'li', 'data-name': rg.name });
        li.innerHTML = `<span class="nm">${rg.name}</span><span class="tm">${rg.label}</span>`;
        legend.appendChild(li);
      });
    }
    const legendLis = legend ? Array.from(legend.querySelectorAll('.li')) : [];

    const LOOP = 7000;
    function frame(t) {
      const p = (t % LOOP) / LOOP; // 0..1
      const eased = p; // linear sweep, choreographed via ring fracs
      const dist = eased * 276;
      photon.setAttribute('cy', CY - dist);
      ray.setAttribute('y2', CY - dist);

      RINGS.forEach((rg, i) => {
        const lit = eased >= rg.frac - 0.015 && eased < rg.frac + 0.10;
        rg.node.classList.toggle('lit', lit || eased > rg.frac + 0.9);
        if (legendLis[i]) legendLis[i].style.opacity = (eased >= rg.frac - 0.015) ? '1' : '.45';
      });

      if (!document.hidden) requestAnimationFrame(frame);
    }

    if (REDUCED) {
      RINGS.forEach((rg, i) => { rg.node.classList.add('lit'); if (legendLis[i]) legendLis[i].style.opacity = '1'; });
      photon.setAttribute('cy', CY - 276);
      ray.setAttribute('y2', CY - 276);
    } else {
      requestAnimationFrame(frame);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) requestAnimationFrame(frame); });
    }
  })();

})();
