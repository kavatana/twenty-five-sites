(() => {
  'use strict';
  document.documentElement.classList.remove('no-js');

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ————— running catalog page number ————— */
  const runningPage = document.getElementById('runningPage');
  const sections = [...document.querySelectorAll('[data-page]')];
  if (runningPage && sections.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) runningPage.textContent = e.target.dataset.page;
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    sections.forEach((s) => io.observe(s));
  }

  /* ————— wipe: headlines stay outlined and fill on hover/focus (pure CSS).
     The cover's "Absence" is the one exception left hover-only — it's on
     screen at first paint, so an intersection trigger would fire immediately
     and fill it before the reader ever sees the outline (the bug the last
     pass caught). Every other wipe — the manifesto pull-out and the lookbook's
     "Six looks." — starts below the fold, so it can fill once, cinematically,
     as it arrives. That also gives touch devices (no hover at all) a chance
     to see the signature fill at least once instead of never. ————— */
  const belowFoldWipes = [...document.querySelectorAll('.wipe')].filter((el) => !el.closest('.cover-h1'));
  if (belowFoldWipes.length) {
    const wio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('seen');
          wio.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    belowFoldWipes.forEach((el) => wio.observe(el));
  }

  /* ————— catalog running-header stands down once the real footer colophon
     is on screen, so the two don't sit on top of one another. ————— */
  const footerEl = document.getElementById('sec-footer');
  if (footerEl) {
    const fio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        document.documentElement.classList.toggle('footer-in-view', e.isIntersecting);
      });
    }, { threshold: 0.12 });
    fio.observe(footerEl);
  }

  /* ————— the two bottom corner stamps only belong on the cover — past it,
     lookbook captions and the manifesto pull-word pass through that same
     fixed band on every scroll, and an opaque chip sitting on top of real
     copy was hiding words rather than framing the page. ————— */
  const coverEl = document.getElementById('sec-cover');
  if (coverEl) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        document.documentElement.classList.toggle('away-from-cover', !e.isIntersecting);
      });
    }, { threshold: 0 });
    cio.observe(coverEl);
  }

  /* ————— custom crosshair cursor (fine pointers only) ————— */
  if (canHover) {
    document.documentElement.classList.add('has-cursor');
    const cursor = document.getElementById('cursor');
    let tx = -100, ty = -100, cx = -100, cy = -100;
    let raf = null;

    const place = (x, y) => { tx = x; ty = y; if (!raf) tick(); };

    function tick() {
      if (prefersReduced) {
        cx = tx; cy = ty;
      } else {
        cx += (tx - cx) * 0.22;
        cy += (ty - cy) * 0.22;
      }
      cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      if (!document.hidden && (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1 || prefersReduced)) {
        raf = prefersReduced ? null : requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    }

    window.addEventListener('pointermove', (e) => place(e.clientX, e.clientY), { passive: true });
    window.addEventListener('pointerdown', (e) => place(e.clientX, e.clientY), { passive: true });

    const interactive = 'a, button, .look, input, textarea, [tabindex]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactive)) cursor.classList.add('is-active');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactive)) cursor.classList.remove('is-active');
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !raf) tick();
    });
  }

  /* ————— lookbook: continuous focus interpolation, wheel remap, keys, nav ————— */
  const lb = document.getElementById('lookbook');
  if (lb) {
    const looks = [...lb.querySelectorAll('.look')];
    const progressBar = document.getElementById('lbProgress');
    let currentIndex = 0;
    let ticking = false;

    function updateLooks() {
      ticking = false;
      const rect = lb.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      let nearest = 0, nearestDist = Infinity;

      looks.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const elCenter = r.left + r.width / 2;
        const dist = Math.abs(elCenter - center);
        if (dist < nearestDist) { nearestDist = dist; nearest = i; }
        const norm = Math.min(1, dist / (rect.width * 0.62));
        el.style.setProperty('--blur', (norm * 2.2).toFixed(2) + 'px');
        el.style.setProperty('--scale', (1 - norm * 0.07).toFixed(3));
        el.style.setProperty('--op', (1 - norm * 0.5).toFixed(3));
      });

      currentIndex = nearest;
      const maxScroll = lb.scrollWidth - lb.clientWidth;
      const frac = maxScroll > 0 ? lb.scrollLeft / maxScroll : 0;
      if (progressBar) progressBar.style.width = (8 + frac * 92) + '%';
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(updateLooks); }
    }

    lb.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateLooks();

    // wheel: remap vertical intent to horizontal scroll, release at edges
    lb.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const atStart = lb.scrollLeft <= 1;
      const atEnd = lb.scrollLeft >= lb.scrollWidth - lb.clientWidth - 1;
      if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return;
      e.preventDefault();
      lb.scrollLeft += e.deltaY;
    }, { passive: false });

    function scrollToIndex(i) {
      const idx = Math.max(0, Math.min(looks.length - 1, i));
      looks[idx].scrollIntoView({
        behavior: prefersReduced ? 'auto' : 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }

    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollToIndex(currentIndex + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); scrollToIndex(currentIndex - 1); }
    });

    document.getElementById('lbPrev')?.addEventListener('click', () => scrollToIndex(currentIndex - 1));
    document.getElementById('lbNext')?.addEventListener('click', () => scrollToIndex(currentIndex + 1));
  }
})();
