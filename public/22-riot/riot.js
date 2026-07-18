(() => {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFine = matchMedia('(pointer: fine)').matches;

  /* ---------- barcode: hand-generated irregular bars, seeded ---------- */
  function buildBarcode() {
    const el = document.getElementById('barcode');
    if (!el) return;
    let seed = 13013;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed % 1000) / 1000;
    };
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 30; i++) {
      const bar = document.createElement('span');
      const w = 1 + Math.floor(rand() * 3.4);
      bar.style.width = w + 'px';
      bar.style.marginRight = (1 + Math.floor(rand() * 2.6)) + 'px';
      frag.appendChild(bar);
    }
    el.appendChild(frag);
  }

  /* ---------- issue counter: broken-copier digit glitch ---------- */
  function glitchCounter() {
    const el = document.getElementById('issueNum');
    if (!el || reduceMotion) return;
    const original = el.textContent;
    const glitchChars = ['0', '1', '3', '8', 'X', '#', '?'];
    setInterval(() => {
      if (document.hidden) return;
      if (Math.random() < 0.22) {
        const glitched = original
          .split('')
          .map((c) => (Math.random() < 0.45 ? glitchChars[(Math.random() * glitchChars.length) | 0] : c))
          .join('');
        el.textContent = glitched;
        setTimeout(() => { el.textContent = original; }, 80 + Math.random() * 140);
      }
    }, 2200);
  }

  /* ---------- spray-paint cursor trail (canvas) ---------- */
  function initSpray() {
    const canvas = document.getElementById('spray');
    const ring = document.getElementById('cursorRing');
    if (!canvas) return;

    if (!isFine || reduceMotion) {
      canvas.style.display = 'none';
      if (ring) ring.style.display = 'none';
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    let lastX = w / 2, lastY = h / 2;
    let has = false;

    function spray(x, y, force) {
      const n = 2 + Math.floor(Math.random() * 3 * force);
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.random() * Math.random() * 15;
        const px = x + Math.cos(ang) * rad;
        const py = y + Math.sin(ang) * rad;
        const r = 0.6 + Math.random() * 1.7;
        const a = 0.08 + Math.random() * 0.2;
        ctx.beginPath();
        ctx.fillStyle = `rgba(182,255,0,${a})`;
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    window.addEventListener('pointermove', (e) => {
      const x = e.clientX, y = e.clientY;
      if (ring) ring.style.transform = `translate(${x}px, ${y}px)`;
      if (!has) { lastX = x; lastY = y; has = true; }
      const dx = x - lastX, dy = y - lastY;
      const dist = Math.hypot(dx, dy);
      const steps = Math.min(8, Math.max(1, Math.floor(dist / 5)));
      const force = Math.min(1.6, 0.4 + dist / 40);
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        spray(lastX + dx * t, lastY + dy * t, force);
      }
      lastX = x; lastY = y;
    }, { passive: true });

    let rafId;
    function frame() {
      if (!document.hidden) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.045)';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(rafId);
      else rafId = requestAnimationFrame(frame);
    });
  }

  buildBarcode();
  glitchCounter();
  initSpray();
})();
