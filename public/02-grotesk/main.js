/* GROTESK™ — warp engine, marquee, specimen builders.
   No libraries. Springs, falloff and clocks are hand-rolled. */
(() => {
  "use strict";

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ================= HERO WARP ================= */
  const hero = document.getElementById("hero");
  const word = document.getElementById("word");
  const axesOut = document.getElementById("axes");
  const hint = document.getElementById("hint");
  const letters = Array.from(word.querySelectorAll(".lt"));
  const N = letters.length;

  // per-letter spring state: value + velocity for both axes
  const st = letters.map(() => ({ w: 800, vw: 0, d: 100, vd: 0 }));
  const centers = new Array(N).fill(0);

  // fit-to-viewport: measure the word at fs=100px, default axes, then scale
  const meas = document.createElement("span");
  meas.className = "word-measure";
  meas.textContent = "GROTESK";
  document.body.appendChild(meas);
  const heroMeta = document.querySelector(".hero-meta");
  const heroFoot = document.querySelector(".hero-foot");
  const mobileMQ = matchMedia("(max-width: 720px)");

  function fit() {
    // true content width inside .hero's own padding box (clientWidth
    // includes that padding, so it overstates room for the word — use
    // hero-meta's rendered width, which already sits inside it)
    const hw = heroMeta.getBoundingClientRect().width - 2;
    if (mobileMQ.matches) {
      // mobile: word breaks GRO / TESK — fit to the wider line AND
      // to the vertical space actually free between meta and foot,
      // so the headline owns the viewport instead of floating in a
      // moat of dead white space.
      // measure at a condensed wdth: the live ambient/drag animation
      // sweeps wdth well past 100 anyway, so sizing to the neutral
      // axis wastes space that a brutalist bleed shouldn't apologize
      // for — .hero clips overflow, so occasional edge contact during
      // a wide animation peak reads as intentional, not broken.
      meas.style.fontVariationSettings = '"wght" 800, "wdth" 94';
      meas.textContent = "GRO";
      const w1 = meas.offsetWidth;
      meas.textContent = "TESK";
      const w2 = meas.offsetWidth;
      meas.style.fontVariationSettings = "";
      const per100 = Math.max(w1, w2) / 100;
      if (!per100) return;
      const availH = Math.max(140, heroFoot.getBoundingClientRect().top - heroMeta.getBoundingClientRect().bottom);
      const fsWidth = (hw * 0.99) / per100;
      const fsHeight = (availH * 0.92) / 1.94; // ~2 lines at line-height .96 + a hair of gap
      word.style.fontSize = Math.min(fsWidth, fsHeight).toFixed(1) + "px";
      return;
    }
    meas.textContent = "GROTESK";
    const per100 = meas.offsetWidth / 100;
    if (!per100) return;
    let fs = (hw * 0.965) / per100;
    fs = Math.min(fs, hero.clientHeight * 0.52);
    word.style.fontSize = fs.toFixed(1) + "px";
  }
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  addEventListener("load", fit);
  addEventListener("resize", fit);
  mobileMQ.addEventListener("change", fit);

  // drag state
  let dragging = false;
  let px = innerWidth / 2, py = innerHeight / 2; // live pointer
  let hasDragged = false;

  word.addEventListener("pointerdown", (e) => {
    dragging = true;
    hasDragged = true;
    px = e.clientX; py = e.clientY;
    word.setPointerCapture(e.pointerId);
    cur.classList.add("grab");
    curlab.textContent = "WARP";
    hint.textContent = "THAT'S IT. PUT WEIGHT ON IT.";
  });
  const endDrag = () => {
    dragging = false;
    cur.classList.remove("grab");
    curlab.textContent = "DRAG";
  };
  word.addEventListener("pointerup", endDrag);
  word.addEventListener("pointercancel", endDrag);
  addEventListener("pointermove", (e) => {
    px = e.clientX; py = e.clientY;
    if (curOn) cur.style.transform = `translate3d(${px}px,${py}px,0)`;
  }, { passive: true });

  /* custom cursor (fine pointers only) — a crosshair that relabels
     itself per zone, so the same device reads as DRAG in the hero,
     INVERT over the specimen grid, SCAN over the waterfall. */
  const cur = document.getElementById("cur");
  const curlab = document.getElementById("curlab");
  let curOn = false;
  function armZone(el, label) {
    if (!fine) return;
    el.addEventListener("pointerenter", () => {
      curOn = true;
      cur.classList.add("on");
      cur.classList.remove("grab");
      curlab.textContent = label;
    });
    el.addEventListener("pointerleave", () => { curOn = false; cur.classList.remove("on"); });
  }
  armZone(hero, "DRAG");

  /* ================= MARQUEE ================= */
  const mq = document.getElementById("mq");
  const GLYPHS = "GROTESK™AÆBCDEFGHIJKLMNOØPQRSTUVWXYZ&?!@#%$€0123456789";
  (function buildMarquee() {
    let row = "";
    let i = 0;
    for (const ch of GLYPHS) {
      row += `<b>${ch}</b>`;
      if (++i % 6 === 0) row += "<i></i>";
    }
    row += "<i></i>";
    mq.innerHTML = row + row; // duplicate for seamless wrap
  })();
  let mqHalf = 0, mqPos = 0, skew = 0, mqPaused = false;
  const strip = document.querySelector(".strip");
  strip.addEventListener("pointerenter", () => { mqPaused = true; });
  strip.addEventListener("pointerleave", () => { mqPaused = false; });
  function measureMq() { mqHalf = mq.scrollWidth / 2; }
  measureMq();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureMq);
  addEventListener("resize", measureMq);

  /* ================= SPECIMEN GRID ================= */
  const grid = document.getElementById("grid");
  const SET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const cellsHTML = [];
  for (const ch of SET) {
    const cp = "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
    cellsHTML.push(
      `<div class="cell"><span class="g">${ch}</span><span class="m mono" data-cp="${cp}">${cp}</span></div>`
    );
  }
  grid.innerHTML = cellsHTML.join("");
  grid.querySelectorAll(".cell").forEach((cell) => {
    const g = cell.querySelector(".g");
    const m = cell.querySelector(".m");
    cell.addEventListener("pointerenter", () => {
      const w = (100 + Math.random() * 800) | 0;
      const d = (50 + Math.random() * 100) | 0;
      g.style.fontFamily = '"Anybody", Arial, sans-serif';
      g.style.fontVariationSettings = `"wght" ${w}, "wdth" ${d}`;
      m.textContent = `${m.dataset.cp} · W${w} · ${d}`;
    });
    cell.addEventListener("pointerleave", () => {
      g.style.fontFamily = "";
      g.style.fontVariationSettings = "";
      m.textContent = m.dataset.cp;
    });
  });
  armZone(grid, "INVERT");

  /* ================= WATERFALL ================= */
  const wfall = document.getElementById("wfall");
  const SENTENCE = "TYPE IS INFRASTRUCTURE. ";
  const SIZES = [128, 104, 84, 68, 54, 44, 36, 29, 23, 18, 14, 11];
  wfall.innerHTML = SIZES.map((s) => {
    const reps = Math.max(2, Math.ceil(2400 / (s * SENTENCE.length * 0.55)));
    return `<div class="wrow"><span class="wlab mono">${s}PX</span><span class="wtxt" style="font-size:${s}px">${SENTENCE.repeat(reps).trim()}</span></div>`;
  }).join("");
  armZone(wfall, "SCAN");

  /* ================= REVEALS ================= */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("in");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.18 });
  document.querySelectorAll("[data-reveal]").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 55}ms`;
    io.observe(el);
  });

  /* ================= LICENSE BUTTONS ================= */
  document.querySelectorAll(".btn").forEach((b) => {
    const base = b.textContent;
    let t = 0;
    b.addEventListener("click", () => {
      b.textContent = "SET IN CONCRETE.";
      clearTimeout(t);
      t = setTimeout(() => { b.textContent = base; }, 1400);
    });
  });

  /* ================= FOOTER MARK visibility ================= */
  const mark = document.getElementById("mark");
  let markVisible = false;
  new IntersectionObserver((en) => { markVisible = en[0].isIntersecting; })
    .observe(mark);

  /* ================= MAIN LOOP ================= */
  let last = performance.now();
  let t = 0;
  let lastScroll = scrollY;
  let smoothVel = 0;
  let raf = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = clamp((now - last) / 1000, 0.001, 0.05);
    last = now;
    t += dt;

    /* --- scroll velocity (px/s), smoothed --- */
    const vel = (scrollY - lastScroll) / dt;
    lastScroll = scrollY;
    smoothVel += (vel - smoothVel) * clamp(9 * dt, 0, 1);

    /* --- headline warp --- */
    const hr = hero.getBoundingClientRect();
    const heroOnScreen = hr.bottom > 0 && hr.top < innerHeight;
    if (heroOnScreen) {
      // letter centers feed the Gaussian falloff field below, which is
      // only read while actively dragging — measuring them (a forced
      // layout read, x7) is real per-frame cost, so skip it during the
      // idle ambient wave and only pay for it while a drag is live.
      if (dragging) {
        for (let i = 0; i < N; i++) {
          const r = letters[i].getBoundingClientRect();
          centers[i] = r.left + r.width / 2;
        }
      }
      const gW = 100 + clamp((py - hr.top) / hr.height, 0, 1) * 800;   // y → wght
      const gD = 50 + clamp((px - hr.left) / hr.width, 0, 1) * 100;    // x → wdth
      const sigma = hr.width * 0.16;

      for (let i = 0; i < N; i++) {
        let tw, td;
        if (dragging) {
          const dx = (px - centers[i]) / sigma;
          const inf = Math.exp(-dx * dx);          // gaussian falloff field
          const pull = 0.22 + 0.78 * inf;
          tw = 800 + (gW - 800) * pull;
          td = 100 + (gD - 100) * pull;
        } else if (!reduced) {
          // ambient wave: a slow traveling wave runs letter-to-letter
          // across the full published range (100→900 / 50→150) so the
          // specimen is always demonstrating itself, even untouched —
          // built to read as alive on a still frame or a screen capture.
          // wght can swing hard everywhere (it never changes glyph
          // advance width); wdth is reined in on mobile so the warp
          // never chews through the hero's tight side margins
          const dAmp = mobileMQ.matches ? 26 : 44;
          tw = 500 + Math.sin(t * 0.5 + i * 0.85) * 370;
          td = 100 + Math.sin(t * 0.34 + i * 1.25 + 2.2) * dAmp;
        } else {
          tw = 800; td = 100;
        }
        const s = st[i];
        if (reduced) {
          s.w = tw; s.d = td;
        } else {
          // damped spring integrator (semi-implicit Euler)
          const k = dragging ? 210 : 120;
          const c = dragging ? 22 : 13.5;
          s.vw += (k * (tw - s.w) - c * s.vw) * dt;
          s.w += s.vw * dt;
          s.vd += (k * (td - s.d) - c * s.vd) * dt;
          s.d += s.vd * dt;
        }
        s.w = clamp(s.w, 100, 900);
        s.d = clamp(s.d, 50, 150);
        letters[i].style.fontVariationSettings =
          `"wght" ${s.w.toFixed(0)}, "wdth" ${s.d.toFixed(1)}`;
      }
      const mid = st[3];
      axesOut.textContent =
        `WGHT ${String(Math.round(dragging ? gW : mid.w)).padStart(3, "0")} · ` +
        `WDTH ${String(Math.round(dragging ? gD : mid.d)).padStart(3, "0")}`;
    }

    /* --- marquee: relentless, skewed by scroll velocity --- pauses
       on hover so the glyphs can actually be read, brand-inverts too */
    if (mqHalf > 0 && !reduced) {
      const speed = mqPaused ? 0 : 105 + Math.min(Math.abs(smoothVel) * 0.35, 640);
      mqPos = (mqPos + speed * dt) % mqHalf;
      const targetSkew = clamp(smoothVel * -0.012, -14, 14);
      skew += (targetSkew - skew) * clamp(8 * dt, 0, 1);
      mq.style.transform = `translate3d(${-mqPos}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    }

    /* --- footer mark breathes while visible --- */
    if (markVisible && !reduced) {
      const md = 100 + Math.sin(t * 0.55) * 26;
      mark.style.fontVariationSettings = `"wght" 900, "wdth" ${md.toFixed(1)}`;
    }
  }
  raf = requestAnimationFrame(frame);

  /* pause everything when the tab is hidden */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      last = performance.now();
      lastScroll = scrollY;
      raf = requestAnimationFrame(frame);
    }
  });

  /* idle nudge: if nobody has dragged after 9s, flash the hint */
  if (!reduced) {
    setTimeout(() => {
      if (!hasDragged) {
        hint.style.animation = "blink 0.9s steps(1) 4";
      }
    }, 9000);
  }
})();
