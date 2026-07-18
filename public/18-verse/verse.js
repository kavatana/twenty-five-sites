/* VERSE — hand-rolled kinetic-poetry physics. No libraries. */
(() => {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /**
   * Splits a line's text into <span class="word"> tokens (optionally further
   * split into <span class="letter"> characters), preserving whitespace as
   * plain text nodes so natural line-wrap still works. If the line carries
   * data-keep="word", the first token matching it (letters/digits/apostrophe
   * only, case-insensitive) is flagged with .keep-word (and .keep on its
   * letters), used by Movement IV to mark the essence that survives erosion.
   */
  function buildLine(lineEl, { letters }) {
    const text = lineEl.textContent;
    const keepWord = lineEl.dataset.keep ? lineEl.dataset.keep.toLowerCase() : null;
    let keepAssigned = false;
    lineEl.textContent = '';
    const tokens = text.split(/(\s+)/);
    tokens.forEach((tok) => {
      if (tok === '') return;
      if (/^\s+$/.test(tok)) { lineEl.appendChild(document.createTextNode(tok)); return; }
      const word = document.createElement('span');
      word.className = 'word';
      word.dataset.word = tok;
      const stripped = tok.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
      const isKeep = keepWord && !keepAssigned && stripped === keepWord;
      if (isKeep) { word.classList.add('keep-word'); keepAssigned = true; }
      if (letters) {
        for (const ch of tok) {
          const l = document.createElement('span');
          l.className = 'letter' + (isKeep ? ' keep' : '');
          l.textContent = ch;
          word.appendChild(l);
        }
      } else {
        word.textContent = tok;
      }
      lineEl.appendChild(word);
    });
  }

  /* ============================= I. GRAVITY ============================= */

  function initGravity() {
    const section = document.getElementById('m1');
    const poem = document.getElementById('poem-gravity');
    const floor = document.getElementById('floor1');
    const liftBtn = document.getElementById('liftBtn');
    const whisper = section.querySelector('.whisper');
    if (whisper && !whisper.id) whisper.id = 'gravity-whisper';
    if (!section || !poem || !floor) return;

    poem.querySelectorAll('.pline').forEach((line) => buildLine(line, { letters: false }));
    const words = Array.from(poem.querySelectorAll('.word'));
    const bodies = [];

    // Canonical home positions, captured once while everything still sits
    // in normal document flow (before any sway animation is attached).
    function measureCanonical(s) {
      const r = s.el.getBoundingClientRect();
      const pr = poem.getBoundingClientRect();
      s.homeLeft = r.left - pr.left;
      s.homeTop = r.top - pr.top;
      s.w = r.width;
      s.h = r.height;
    }

    words.forEach((el) => {
      const s = {
        el,
        mass: clamp((el.dataset.word.replace(/[^\p{L}]/gu, '').length) / 9, 0.25, 1),
        dx: 0, dy: 0, vx: 0, vy: 0, rot: 0, vrot: 0,
        state: 'home', homeLeft: 0, homeTop: 0, w: 0, h: 0,
      };
      measureCanonical(s);
      bodies.push(s);
    });

    words.forEach((el, i) => {
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      if (whisper) el.setAttribute('aria-describedby', whisper.id);
      el.classList.add('sway');
      el.style.setProperty('--sway-dur', (3.6 + Math.random() * 1.8).toFixed(2) + 's');
      el.style.setProperty('--sway-delay', (-(Math.random() * 4)).toFixed(2) + 's');
      const s = bodies[i];
      el.addEventListener('click', () => dropWord(s));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dropWord(s); }
      });
    });

    let settled = [];

    function floorY() {
      const fr = floor.getBoundingClientRect();
      const pr = poem.getBoundingClientRect();
      return fr.top - pr.top;
    }

    function dropWord(s) {
      if (s.state !== 'home') return;
      // Where is it *actually* sitting right now (siblings may already be
      // absolute/missing from flow) vs. its canonical home — start the fall
      // from the true current spot, no visual jump, but "home" for lifting
      // stays the poem's original, undisturbed arrangement.
      const r = s.el.getBoundingClientRect();
      const pr = poem.getBoundingClientRect();
      const curLeft = r.left - pr.left, curTop = r.top - pr.top;
      s.el.classList.remove('sway');
      s.el.style.position = 'absolute';
      s.el.style.left = s.homeLeft + 'px';
      s.el.style.top = s.homeTop + 'px';
      s.el.style.width = s.w + 'px';
      s.el.classList.add('fallen');
      s.el.setAttribute('aria-pressed', 'true');
      s.dx = curLeft - s.homeLeft;
      s.dy = curTop - s.homeTop;
      s.vx = (Math.random() - 0.5) * 60 * (1.2 - s.mass);
      s.vy = 0;
      s.rot = 0;
      s.vrot = (Math.random() - 0.5) * (1.4 - s.mass) * 90;
      s.state = 'falling';
      apply(s);
      wake();
    }

    function knock(landed) {
      const lLeft = landed.homeLeft + landed.dx;
      settled = settled.filter((o) => o.state === 'resting');
      settled.slice().forEach((o) => {
        if (o === landed) return;
        const oLeft = o.homeLeft + o.dx;
        const overlap = Math.min(lLeft + landed.w, oLeft + o.w) - Math.max(lLeft, oLeft);
        if (overlap > 4) {
          const dir = oLeft < lLeft ? -1 : 1;
          o.vx += dir * (90 + landed.mass * 90);
          o.vy -= 90 + Math.random() * 60;
          o.state = 'falling';
          settled = settled.filter((x) => x !== o);
        }
      });
    }

    function apply(s) { s.el.style.transform = `translate(${s.dx.toFixed(1)}px, ${s.dy.toFixed(1)}px) rotate(${s.rot.toFixed(1)}deg)`; }

    function settleHome(s) {
      s.el.style.position = '';
      s.el.style.left = '';
      s.el.style.top = '';
      s.el.style.width = '';
      s.el.style.transform = '';
      s.el.classList.remove('fallen');
      s.el.classList.add('sway');
      s.el.removeAttribute('aria-pressed');
      s.state = 'home';
    }

    let raf = null, lastT = 0;
    function wake() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); } }

    function tick(now) {
      if (document.hidden) { raf = requestAnimationFrame(tick); return; }
      const dt = Math.min((now - lastT) / 1000, 0.032);
      lastT = now;
      let any = false;
      const fY = floorY();
      bodies.forEach((s) => {
        if (s.state === 'falling') {
          any = true;
          const gAcc = 2500 * (0.75 + 0.35 * s.mass);
          s.vy += gAcc * dt;
          const flutter = (1 - s.mass) * 46;
          s.vx += Math.sin(now / 260 + s.homeLeft) * flutter * dt;
          s.dx += s.vx * dt;
          s.dy += s.vy * dt;
          s.rot += s.vrot * dt;
          const maxDy = fY - s.homeTop - s.h;
          if (s.dy >= maxDy) {
            s.dy = maxDy;
            const restitution = 0.55 - s.mass * 0.24;
            s.vy = -s.vy * restitution;
            s.vx *= 0.7; s.vrot *= 0.5;
            if (Math.abs(s.vy) < 55) {
              s.vy = 0; s.vrot = 0; s.state = 'resting';
              if (!settled.includes(s)) settled.push(s);
              knock(s);
            }
          }
          apply(s);
        } else if (s.state === 'lifting') {
          any = true;
          const k = 46, c = 13.2;
          s.vx += (-k * s.dx - c * s.vx) * dt;
          s.vy += (-k * s.dy - c * s.vy) * dt;
          s.dx += s.vx * dt; s.dy += s.vy * dt;
          s.rot += (0 - s.rot) * Math.min(1, dt * 4);
          if (Math.abs(s.dx) < 0.4 && Math.abs(s.dy) < 0.4 && Math.abs(s.vx) < 3 && Math.abs(s.vy) < 3) {
            settleHome(s);
          } else apply(s);
        }
      });
      if (any) raf = requestAnimationFrame(tick); else raf = null;
    }

    if (liftBtn) {
      liftBtn.addEventListener('click', () => {
        settled = [];
        let i = 0;
        bodies.forEach((s) => {
          if (s.state === 'home') return;
          const delay = i * 55 + Math.random() * 90;
          i += 1;
          setTimeout(() => {
            if (s.state === 'home') return;
            s.state = 'lifting';
            s.vx = (Math.random() - 0.5) * 20;
            s.vy = -20 - Math.random() * 20;
            wake();
          }, delay);
        });
      });
    }

    window.addEventListener('resize', debounce(() => {
      bodies.forEach((s) => { if (s.state === 'home') measureCanonical(s); });
    }, 200));
  }

  /* ============================== II. MAGNET ============================= */

  function initMagnet() {
    const section = document.getElementById('m2');
    const poem = document.getElementById('poem-magnet');
    if (!section || !poem) return;
    poem.querySelectorAll('.pline').forEach((line) => buildLine(line, { letters: true }));
    const data = Array.from(poem.querySelectorAll('.letter')).map((el) => ({ el, hx: 0, hy: 0, cx: 0, cy: 0, vx: 0, vy: 0 }));

    function measure() {
      const pr = poem.getBoundingClientRect();
      data.forEach((d) => {
        const r = d.el.getBoundingClientRect();
        d.hx = (r.left - pr.left) - d.cx + r.width / 2;
        d.hy = (r.top - pr.top) - d.cy + r.height / 2;
      });
    }
    measure();
    window.addEventListener('resize', debounce(measure, 200));

    let pointer = null;
    let ring = null;
    if (FINE) {
      ring = document.createElement('div');
      ring.className = 'magnet-ring';
      document.body.appendChild(ring);
      poem.style.cursor = 'none';
    }

    const RADIUS = 96, STRENGTH = 32;
    let raf = null, lastT = 0;
    function wake() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); } }

    poem.addEventListener('pointermove', (e) => {
      const pr = poem.getBoundingClientRect();
      pointer = { x: e.clientX - pr.left, y: e.clientY - pr.top };
      if (ring) { ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; ring.classList.add('on'); }
      wake();
    });
    poem.addEventListener('pointerleave', () => {
      pointer = null;
      if (ring) ring.classList.remove('on');
      wake();
    });

    function tick(now) {
      if (document.hidden) { raf = requestAnimationFrame(tick); return; }
      const dt = Math.min((now - lastT) / 1000, 0.032);
      lastT = now;
      let moving = false;
      data.forEach((d) => {
        let tx = 0, ty = 0;
        if (pointer) {
          const dx = d.hx - pointer.x, dy = d.hy - pointer.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          if (dist < RADIUS) {
            const f = Math.pow(1 - dist / RADIUS, 2) * STRENGTH;
            tx = (dx / dist) * f; ty = (dy / dist) * f;
          }
        }
        const k = 130, c = 17;
        d.vx += ((tx - d.cx) * k - d.vx * c) * dt;
        d.vy += ((ty - d.cy) * k - d.vy * c) * dt;
        d.cx += d.vx * dt; d.cy += d.vy * dt;
        if (Math.abs(d.cx) > 0.05 || Math.abs(d.cy) > 0.05 || Math.abs(d.vx) > 0.5 || Math.abs(d.vy) > 0.5) moving = true;
        d.el.style.transform = `translate(${d.cx.toFixed(2)}px, ${d.cy.toFixed(2)}px)`;
      });
      if (moving || pointer) raf = requestAnimationFrame(tick); else raf = null;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (!en.isIntersecting) pointer = null; });
    }, { threshold: 0 });
    io.observe(section);
  }

  /* ============================= III. ASSEMBLY ============================ */

  function initAssembly() {
    const section = document.getElementById('m3');
    const poem = document.getElementById('poem-assembly');
    if (!section || !poem) return;
    poem.querySelectorAll('.pline').forEach((line) => buildLine(line, { letters: true }));
    const letters = Array.from(poem.querySelectorAll('.letter'));

    let seed = 918273;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed % 10000) / 10000; };

    const scattered = letters.map((el) => {
      const angle = rand() * Math.PI * 2;
      const radius = 40 + rand() * 180;
      const dx = Math.cos(angle) * radius;
      const dy = Math.max(-90, Math.sin(angle) * radius * 0.5 - 8);
      const rot = (rand() - 0.5) * 70;
      el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
      el.style.opacity = (0.16 + rand() * 0.22).toFixed(2);
      el.classList.add('scattered');
      el.style.setProperty('--drift-delay', (-(rand() * 6)).toFixed(2) + 's');
      return { el, dist: Math.hypot(dx, dy) };
    });
    const maxDist = Math.max(1, ...scattered.map((s) => s.dist));

    let played = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && en.intersectionRatio > 0.3 && !played) {
          played = true;
          assemble();
          io.disconnect();
        }
      });
    }, { threshold: [0, 0.3, 0.6] });
    io.observe(section);

    function assemble() {
      scattered.forEach((s) => {
        const t = s.dist / maxDist;
        const delay = 60 + t * 520 + Math.random() * 120;
        const dur = 780 + t * 640;
        s.el.classList.remove('scattered');
        s.el.style.transition = `transform ${dur}ms var(--ease-glide) ${delay}ms, opacity ${(dur * 0.7).toFixed(0)}ms ease-out ${delay}ms`;
        s.el.style.transform = 'translate(0,0) rotate(0deg)';
        s.el.style.opacity = '1';
        setTimeout(() => s.el.classList.add('settled'), delay + dur);
      });
    }
  }

  /* ============================== IV. EROSION ============================= */

  function initErosion() {
    const wrapper = document.getElementById('m4');
    const poem = document.getElementById('poem-erosion');
    const gaugeFill = document.getElementById('erodeFill');
    if (!wrapper || !poem) return;
    const lines = Array.from(poem.querySelectorAll('.pline'));
    lines.forEach((line) => buildLine(line, { letters: true }));
    const N = lines.length;
    const lineData = lines.map((line, i) => ({
      line,
      letters: Array.from(line.querySelectorAll('.letter')).map((el, idx) => ({ el, keep: el.classList.contains('keep'), idx })),
      center: (i + 0.5) / N,
    }));

    let active = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { active = en.isIntersecting; if (active) update(); });
    }, { threshold: 0 });
    io.observe(wrapper);

    let ticking = false;
    function onScroll() {
      if (!active || ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    function update() {
      const rect = wrapper.getBoundingClientRect();
      const total = wrapper.offsetHeight - window.innerHeight;
      const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
      if (gaugeFill) gaugeFill.style.height = (progress * 100).toFixed(1) + '%';

      lineData.forEach((ld) => {
        const focusDist = Math.abs(progress - ld.center) * N * 0.85;
        ld.line.style.opacity = (1 - 0.5 * clamp(focusDist, 0, 1)).toFixed(2);

        const erosion = clamp((progress - ld.center - 0.05) / ((1 / N) * 1.25), 0, 1);
        const eased = erosion * erosion * (3 - 2 * erosion);
        ld.letters.forEach((L) => {
          if (L.keep) return;
          if (eased <= 0.001) {
            L.el.style.opacity = ''; L.el.style.transform = ''; L.el.style.filter = '';
            return;
          }
          const drift = eased * (14 + (L.idx % 5) * 3);
          const side = (L.idx % 2 === 0) ? 1 : -1;
          L.el.style.opacity = (1 - eased).toFixed(2);
          L.el.style.transform = `translate(${(side * eased * 10).toFixed(1)}px, ${(-drift).toFixed(1)}px) rotate(${(side * eased * 24).toFixed(1)}deg)`;
          L.el.style.filter = eased > 0.4 ? `blur(${(eased * 1.6).toFixed(1)}px)` : '';
        });
      });
    }

    update();
    window.addEventListener('resize', debounce(update, 150));
  }

  function initErosionStatic() {
    const poem = document.getElementById('poem-erosion');
    if (!poem) return;
    poem.querySelectorAll('.pline').forEach((line) => buildLine(line, { letters: false }));
  }

  /* ============================= nav rail state ============================ */

  function initRail() {
    const links = Array.from(document.querySelectorAll('.m-rail a'));
    if (!links.length) return;
    // Movement IV's outer section is a 340vh scroll track for its sticky
    // poem, so it can never fill 50% of the viewport — watch its 100vh
    // sticky inner instead, so the rail dot activates like the others.
    const sections = ['m1', 'm2', 'm3', 'm4rail'].map((id) => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const idx = sections.indexOf(en.target);
        if (idx === -1 || !en.isIntersecting) return;
        links.forEach((l) => l.classList.remove('active'));
        if (links[idx]) links[idx].classList.add('active');
      });
    }, { threshold: 0.5 });
    sections.forEach((s) => io.observe(s));
  }

  function boot() {
    if (!REDUCED) {
      initGravity();
      initMagnet();
      initAssembly();
      initErosion();
    } else {
      initErosionStatic();
    }
    initRail();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
