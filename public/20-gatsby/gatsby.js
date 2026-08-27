(() => {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- stepped chevron generator ---------------- */
  function buildChevron(svg) {
    const path = svg.querySelector('.chevron-line');
    if (!path) return;
    const w = 340, blocks = 7, amp = 9, baseY = 18;
    const seg = w / blocks;
    let d = `M0,${baseY}`;
    let x = 0;
    for (let i = 0; i < blocks; i++) {
      const s = seg / 3;
      x += s; d += ` L${x.toFixed(1)},${baseY}`;
      x += 0.01; d += ` L${x.toFixed(1)},${(baseY - amp).toFixed(1)}`;
      x += s; d += ` L${x.toFixed(1)},${(baseY - amp).toFixed(1)}`;
      x += 0.01; d += ` L${x.toFixed(1)},${baseY}`;
      x += s; d += ` L${x.toFixed(1)},${baseY}`;
    }
    path.setAttribute('d', d);
  }
  document.querySelectorAll('.chevron').forEach(buildChevron);

  /* ---------------- radial ray-fan generator (sunbursts) ---------------- */
  function buildRayFan(g) {
    const cx = parseFloat(g.dataset.cx), cy = parseFloat(g.dataset.cy);
    const count = parseInt(g.dataset.count, 10);
    const minLen = parseFloat(g.dataset.min), maxLen = parseFloat(g.dataset.max);
    const spread = parseFloat(g.dataset.spread);
    const half = spread / 2;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = (-half + t * spread) * Math.PI / 180;
      const lenT = 1 - Math.abs(t - 0.5) * 2;
      const len = minLen + lenT * (maxLen - minLen);
      const x2 = cx + Math.sin(angle) * len;
      const y2 = cy - Math.cos(angle) * len;
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', `M${cx},${cy} L${x2.toFixed(1)},${y2.toFixed(1)}`);
      p.setAttribute('class', 'draw-path ray');
      g.appendChild(p);
    }
  }
  document.querySelectorAll('.sunburst[data-count]').forEach(buildRayFan);

  /* ---------------- prepare stroke-draw paths ---------------- */
  function prepareDrawPaths(root) {
    const paths = root.querySelectorAll('.draw-path');
    paths.forEach((p, i) => {
      let len = 100;
      try { len = p.getTotalLength(); } catch (e) { /* not a measurable shape */ }
      if (p.closest('.illus')) {
        // hover-triggered illustrations: drive purely via CSS custom properties
        p.style.setProperty('--len', len);
        p.style.setProperty('--i', i);
        if (reduceMotion) { p.style.transitionDuration = '.2s'; }
      } else {
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = reduceMotion ? 0 : len;
      }
    });
  }
  document.querySelectorAll('.reveal, .suite-card').forEach(prepareDrawPaths);

  /* ---------------- scroll reveal ---------------- */
  const revealTargets = document.querySelectorAll('.reveal, .suite-card');
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('in-view');
      el.querySelectorAll('.draw-path').forEach((p, i) => {
        if (p.closest('.illus')) return; // hover-driven, leave to CSS
        p.style.transitionDelay = reduceMotion ? '0s' : `${i * 65}ms`;
        p.style.strokeDashoffset = '0';
      });
      revealIO.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  revealTargets.forEach((el) => revealIO.observe(el));

  /* ---------------- elevator dial ---------------- */
  const floorAngles = { L: 0, '2': 90, '3': 180, P: 270 };
  const floorNames = { L: 'Lobby', '2': 'The Suites', '3': 'The Ballroom', P: 'The Promenade Room' };
  const needle = document.querySelector('.dial-needle');
  const caption = document.querySelector('.dial-caption');
  const dialButtons = document.querySelectorAll('.dial-btn');
  const floors = document.querySelectorAll('.floor');

  function setFloor(floor) {
    if (needle) needle.style.transform = `translate(-50%, -100%) rotate(${floorAngles[floor]}deg)`;
    if (caption) caption.textContent = floorNames[floor];
    dialButtons.forEach((b) => b.setAttribute('aria-current', b.dataset.floor === floor ? 'true' : 'false'));
  }

  const dialIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setFloor(entry.target.dataset.floor);
    });
  }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' });
  floors.forEach((f) => dialIO.observe(f));

  dialButtons.forEach((b) => {
    b.addEventListener('click', () => {
      const target = document.getElementById(b.dataset.target);
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* fade the dial out as the footer approaches so it never sits on top of it */
  const dialEl = document.querySelector('.dial');
  const footEl = document.querySelector('.site-foot');
  if (dialEl && footEl) {
    const footIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => dialEl.classList.toggle('dial-hide', entry.isIntersecting));
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
    footIO.observe(footEl);
  }

  /* ---------------- champagne bubbles (canvas) ---------------- */
  (function initBubbles() {
    const canvas = document.getElementById('bubbles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, bubbles = [], rafId = null, last = 0;
    const count = window.innerWidth < 640 ? 14 : 26;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeBubble(fresh) {
      return {
        x: Math.random() * w,
        y: fresh ? h + 10 + Math.random() * 40 : Math.random() * h,
        r: 1 + Math.random() * 2.4,
        speed: 5 + Math.random() * 11,
        drift: (Math.random() - 0.5) * 14,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.12 + Math.random() * 0.28,
      };
    }

    function seed() { bubbles = Array.from({ length: count }, () => makeBubble(false)); }

    function paintFrame(dt) {
      ctx.clearRect(0, 0, w, h);
      bubbles.forEach((b) => {
        b.y -= b.speed * dt;
        b.phase += dt * 1.1;
        if (b.y < -12) Object.assign(b, makeBubble(true));
        const x = b.x + Math.sin(b.phase) * b.drift;
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(243,227,195,${b.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x - b.r * 0.35, b.y - b.r * 0.35, Math.max(0.4, b.r * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,251,240,${b.alpha * 0.7})`;
        ctx.fill();
      });
    }

    function loop(t) {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      paintFrame(dt);
      rafId = requestAnimationFrame(loop);
    }

    resize(); seed();
    window.addEventListener('resize', resize);

    if (reduceMotion) {
      paintFrame(0);
    } else {
      last = performance.now();
      rafId = requestAnimationFrame(loop);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (rafId) cancelAnimationFrame(rafId);
          rafId = null;
        } else if (!rafId) {
          last = performance.now();
          rafId = requestAnimationFrame(loop);
        }
      });
    }
  })();

  /* ---------------- custom cursor ---------------- */
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    const cursor = document.querySelector('.cursor-ring');
    if (cursor) {
      let mx = window.innerWidth / 2, my = window.innerHeight / 2, cx = mx, cy = my;
      let cursorRaf = null;
      window.addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        cursor.classList.add('active');
      });
      function tick() {
        cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
        cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
        cursorRaf = requestAnimationFrame(tick);
      }
      cursorRaf = requestAnimationFrame(tick);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { if (cursorRaf) cancelAnimationFrame(cursorRaf); cursorRaf = null; }
        else if (!cursorRaf) { cursorRaf = requestAnimationFrame(tick); }
      });
      document.querySelectorAll('a, button, .suite-card').forEach((el) => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
      });
    }
  }
})();
