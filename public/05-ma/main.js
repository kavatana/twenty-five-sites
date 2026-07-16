/* 間 MA — motion. Everything slow; opacity & translate only. */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── self-drawing strokes ─────────────────────────────────
     Measure each path with getTotalLength(), hide it behind its
     own dash, then release the dashoffset via a CSS transition. */
  function prepDraw(root) {
    root.querySelectorAll('path[data-draw]').forEach((p) => {
      const L = Math.ceil(p.getTotalLength()) + 2;
      p.style.strokeDasharray = `${L}`;
      p.style.strokeDashoffset = `${L}`;
    });
  }

  const heroArt = document.getElementById('heroArt');
  const ensoWrap = document.getElementById('ensoWrap');

  if (!reduced) {
    prepDraw(heroArt);
    prepDraw(ensoWrap);
    // Two frames so the dash state paints before the release.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => heroArt.classList.add('drawn'));
    });
  } else {
    heroArt.classList.add('drawn');
    ensoWrap.classList.add('drawn');
  }

  /* ── scroll reveals ─────────────────────────────────────── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('inview');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.piece').forEach((el) => io.observe(el));

  /* ensō draws itself when seen */
  if (!reduced) {
    const ensoIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          ensoWrap.classList.add('drawn');
          ensoIO.disconnect();
        }
      });
    }, { threshold: 0.45 });
    ensoIO.observe(ensoWrap);
  }

  /* hanko stamps onto the footer */
  const hanko = document.getElementById('hanko');
  const hankoIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        hanko.classList.add('stamped');
        hankoIO.disconnect();
      }
    });
  }, { threshold: 0.6 });
  hankoIO.observe(hanko);

  /* ── seasons: haiku crossfade + tint ────────────────────── */
  const seasonsSec = document.getElementById('seasons');
  const haikus = [...seasonsSec.querySelectorAll('.haiku')];
  const btns = [...seasonsSec.querySelectorAll('.season-btn')];
  const order = ['haru', 'natsu', 'aki', 'fuyu'];
  let idx = 0;
  let timer = null;

  function setSeason(name) {
    idx = order.indexOf(name);
    seasonsSec.dataset.season = name;
    haikus.forEach((h) => h.classList.toggle('on', h.dataset.season === name));
    btns.forEach((b) => {
      const on = b.dataset.season === name;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function startCycle() {
    if (reduced || timer) return;
    timer = setInterval(() => setSeason(order[(idx + 1) % 4]), 9000);
  }
  function stopCycle() {
    clearInterval(timer);
    timer = null;
  }

  btns.forEach((b) =>
    b.addEventListener('click', () => {
      setSeason(b.dataset.season);
      stopCycle();
      startCycle(); // restart the clock from the chosen season
    })
  );

  /* only cycle while the section is near the viewport */
  const cycleIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? startCycle() : stopCycle()));
  }, { threshold: 0.1 });
  cycleIO.observe(seasonsSec);

  /* ── ink-dot cursor (fine pointers only) ────────────────── */
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  let rafId = null;
  let resumeCursor = null;

  if (finePointer && !reduced) {
    const dot = document.createElement('div');
    dot.className = 'ink-dot';
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);

    let tx = -100, ty = -100, x = -100, y = -100;
    let seen = false;

    // Chase the pointer, then go fully idle once caught up — no rAF churn
    // while the mouse sits still. A single mousemove wakes it again.
    const step = () => {
      x += (tx - x) * 0.11;
      y += (ty - y) * 0.11;
      dot.style.left = x + 'px';
      dot.style.top = y + 'px';
      if (Math.abs(tx - x) < 0.06 && Math.abs(ty - y) < 0.06) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(step);
    };
    const wake = () => { if (rafId === null) rafId = requestAnimationFrame(step); };
    resumeCursor = () => { if (seen) wake(); };

    window.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!seen) {
        seen = true;
        x = tx; y = ty;
        dot.style.left = x + 'px';
        dot.style.top = y + 'px';
        dot.style.opacity = '1';
        document.body.classList.add('ink-cursor-live');
      }
      wake();
    }, { passive: true });

    document.addEventListener('mouseover', (e) => {
      dot.classList.toggle('grow', !!e.target.closest('a, button, .stone, .enso-wrap'));
    });
  }

  /* ── ink-drop ripple: a small bloom wherever the page is pressed ── */
  if (!reduced) {
    document.addEventListener('pointerdown', (e) => {
      if (e.button && e.button !== 0) return; // primary input only
      const drop = document.createElement('div');
      drop.className = 'ink-ripple';
      drop.style.left = e.clientX + 'px';
      drop.style.top = e.clientY + 'px';
      document.body.appendChild(drop);
      drop.addEventListener('animationend', () => drop.remove(), { once: true });
      // safety net in case animationend never fires (e.g. tab hidden mid-animation)
      setTimeout(() => drop.remove(), 1400);
    }, { passive: true });
  }

  /* ── pause everything while hidden ──────────────────────── */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopCycle();
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    } else {
      const r = seasonsSec.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) startCycle();
      if (resumeCursor) resumeCursor();
    }
  });
})();
