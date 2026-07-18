/* REVERIE — dreamcore behaviour layer.
   Vanilla JS, no dependencies. Handles: the isometric orb staircase
   (generated + traced along a closed CSS offset-path), the moon's
   scroll-velocity lag, the rotary "hours asleep" dial (custom slider,
   pointer + keyboard), scroll-reveal, a soft cursor halo, and the
   check-in confirmation. */
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- staircase (isometric SVG, generated) ---------- */

  function buildStaircase(svg) {
    const ISO_A = Math.cos(Math.PI / 6);
    const ISO_B = Math.sin(Math.PI / 6);
    const SCALE = 15;
    const S = 6;        // steps per flight
    const N = S * 4;     // total steps around the ring
    const STEP_H = 0.16; // vertical drop per step
    const RISE = 0.16;   // riser face height
    const TREAD = 0.92;  // inward depth of each tread
    const TOP_H = 2.0;   // height of the very first tread

    function proj(gx, gy, gz) {
      return [
        (gx - gy) * SCALE * ISO_A,
        (gx + gy) * SCALE * ISO_B - gz * SCALE
      ];
    }
    function pt(p) { return p[0].toFixed(2) + "," + p[1].toFixed(2); }
    function poly(pts, fill, stroke) {
      const el = document.createElementNS(SVGNS, "polygon");
      el.setAttribute("points", pts.map(pt).join(" "));
      el.setAttribute("fill", fill);
      if (stroke) {
        el.setAttribute("stroke", "rgba(255,248,231,.22)");
        el.setAttribute("stroke-width", "0.6");
        el.setAttribute("vector-effect", "non-scaling-stroke");
      }
      return el;
    }

    const ramp = [
      [255, 248, 231], // cream
      [232, 223, 245], // fog lavender
      [205, 231, 240], // powder sky
      [253, 226, 228], // blush
      [42, 36, 64]      // twilight
    ];
    function lerpColor(t) {
      const n = ramp.length - 1;
      const seg = Math.min(n - 1, Math.floor(t * n));
      const lt = t * n - seg;
      const a = ramp[seg], b = ramp[seg + 1];
      return [a[0] + (b[0] - a[0]) * lt, a[1] + (b[1] - a[1]) * lt, a[2] + (b[2] - a[2]) * lt];
    }
    function shade(rgb, f) {
      return "rgb(" + Math.round(rgb[0] * f) + "," + Math.round(rgb[1] * f) + "," + Math.round(rgb[2] * f) + ")";
    }

    const group = document.createElementNS(SVGNS, "g");

    function footprint(k) {
      const edge = Math.floor(k / S);
      const i = k % S;
      if (edge === 0) return { gx: i, gy: 0, edge };
      if (edge === 1) return { gx: S, gy: i, edge };
      if (edge === 2) return { gx: S - i, gy: S, edge };
      return { gx: 0, gy: S - i, edge };
    }

    for (let k = 0; k < N; k++) {
      const { gx, gy, edge } = footprint(k);
      const gzTop = TOP_H - k * STEP_H;
      const gzBot = gzTop - RISE;
      const t = k / (N - 1);
      const col = lerpColor(t);

      let x0, y0, x1, y1;
      if (edge === 0) { x0 = gx; x1 = gx + 1; y0 = gy; y1 = gy + TREAD; }
      else if (edge === 1) { x0 = gx - TREAD; x1 = gx; y0 = gy; y1 = gy + 1; }
      else if (edge === 2) { x0 = gx - 1; x1 = gx; y0 = gy - TREAD; y1 = gy; }
      else { x0 = gx; x1 = gx + TREAD; y0 = gy - 1; y1 = gy; }

      const top = [proj(x0, y0, gzTop), proj(x1, y0, gzTop), proj(x1, y1, gzTop), proj(x0, y1, gzTop)];
      group.appendChild(poly(top, shade(col, 1), true));

      const right = [proj(x0, y1, gzTop), proj(x1, y1, gzTop), proj(x1, y1, gzBot), proj(x0, y1, gzBot)];
      group.appendChild(poly(right, shade(col, 0.66)));

      const front = [proj(x1, y0, gzTop), proj(x1, y1, gzTop), proj(x1, y1, gzBot), proj(x1, y0, gzBot)];
      group.appendChild(poly(front, shade(col, 0.44)));
    }

    // pillar bridging the seam — where the last step's floor meets the first step's ceiling
    const lowGz = TOP_H - N * STEP_H;
    const highGz = TOP_H + 0.55;
    const pw = 0.46;
    const pTop = [proj(-pw, -pw, highGz), proj(pw, -pw, highGz), proj(pw, pw, highGz), proj(-pw, pw, highGz)];
    const pRight = [proj(-pw, pw, highGz), proj(pw, pw, highGz), proj(pw, pw, lowGz), proj(-pw, pw, lowGz)];
    const pFront = [proj(pw, -pw, highGz), proj(pw, pw, highGz), proj(pw, pw, lowGz), proj(pw, -pw, lowGz)];
    group.appendChild(poly(pFront, shade(ramp[0], 0.5)));
    group.appendChild(poly(pRight, shade(ramp[0], 0.72)));
    group.appendChild(poly(pTop, shade(ramp[0], 1), true));

    const finial = document.createElementNS(SVGNS, "circle");
    const fp = proj(0, 0, highGz + 0.16);
    finial.setAttribute("cx", fp[0].toFixed(2));
    finial.setAttribute("cy", fp[1].toFixed(2));
    finial.setAttribute("r", "5.5");
    finial.setAttribute("fill", "rgb(255,248,231)");
    finial.setAttribute("opacity", "0.92");
    group.appendChild(finial);

    svg.appendChild(group);

    // closed loop path for the orb — constant height, seamless
    const midH = TOP_H - (N * STEP_H) / 2;
    const inset = TREAD / 2 + 0.16;
    const loop = [
      proj(inset, inset, midH),
      proj(S - inset, inset, midH),
      proj(S - inset, S - inset, midH),
      proj(inset, S - inset, midH)
    ];
    const d = "M " + pt(loop[0]) + " L " + pt(loop[1]) + " L " + pt(loop[2]) + " L " + pt(loop[3]) + " Z";

    const guide = document.createElementNS(SVGNS, "path");
    guide.setAttribute("d", d);
    guide.setAttribute("fill", "none");
    guide.setAttribute("stroke", "rgba(255,248,231,.16)");
    guide.setAttribute("stroke-width", "1");
    guide.setAttribute("stroke-dasharray", "1.5 6");
    svg.appendChild(guide);

    const glow = document.createElementNS(SVGNS, "circle");
    glow.setAttribute("r", "9");
    glow.setAttribute("fill", "rgba(255,248,231,.32)");
    glow.setAttribute("class", "orb");
    glow.style.offsetPath = "path('" + d + "')";
    svg.appendChild(glow);

    const orb = document.createElementNS(SVGNS, "circle");
    orb.setAttribute("r", "4");
    orb.setAttribute("fill", "#FFF8E7");
    orb.setAttribute("class", "orb");
    orb.style.offsetPath = "path('" + d + "')";
    // slight phase offset so glow trails the core
    glow.style.animationDelay = "-0.35s";
    svg.appendChild(orb);
  }

  const stairSvg = document.getElementById("stairSvg");
  if (stairSvg) buildStaircase(stairSvg);

  /* ---------- moon: parallax + scroll-velocity lag ---------- */

  const moon = document.getElementById("moon");
  if (moon) {
    if (reduced) {
      moon.style.transform = "translateY(0)";
    } else {
      let lastY = window.scrollY, kick = 0;
      window.addEventListener("scroll", function () {
        const y = window.scrollY;
        kick += (y - lastY) * 0.35;
        kick = Math.max(-70, Math.min(70, kick));
        lastY = y;
      }, { passive: true });

      function tick() {
        if (!document.hidden) {
          kick *= 0.9;
          const base = -window.scrollY * 0.045;
          moon.style.transform = "translateY(" + (base + kick).toFixed(2) + "px)";
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
  }

  /* ---------- scroll progress ---------- */

  const progress = document.getElementById("progress");
  function updateProgress() {
    if (!progress) return;
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = pct + "%";
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  /* ---------- reveal on scroll ---------- */

  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = Array.prototype.indexOf.call(el.parentElement.children, el);
        const delay = reduced ? 0 : Math.min(siblings, 5) * 70;
        setTimeout(function () { el.classList.add("in"); }, delay);
        io.unobserve(el);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- cursor halo (fine pointers only) ---------- */

  const halo = document.getElementById("cursorHalo");
  if (halo && !reduced && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let hx = window.innerWidth / 2, hy = window.innerHeight / 2, cx = hx, cy = hy, seen = false;
    window.addEventListener("pointermove", function (e) {
      hx = e.clientX; hy = e.clientY;
      if (!seen) { cx = hx; cy = hy; seen = true; }
      halo.classList.add("active");
    });
    window.addEventListener("pointerleave", function () { halo.classList.remove("active"); });
    document.addEventListener("pointerdown", function () { halo.style.transform += " scale(.8)"; });
    function loopCursor() {
      cx += (hx - cx) * 0.16;
      cy += (hy - cy) * 0.16;
      halo.style.transform = "translate(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px) translate(-50%,-50%)";
      requestAnimationFrame(loopCursor);
    }
    requestAnimationFrame(loopCursor);
  }

  /* ---------- rotary dial: "how long have you been asleep?" ---------- */

  const dialFace = document.getElementById("dialFace");
  const dialRotor = document.getElementById("dialRotor");
  const dialFill = document.getElementById("dialFill");
  const dialHours = document.getElementById("dialHours");
  const MIN_H = 0, MAX_H = 14;
  const CIRC = 2 * Math.PI * 86;
  let sleepHours = 6;

  function renderDial() {
    const frac = (sleepHours - MIN_H) / (MAX_H - MIN_H);
    if (dialFill) {
      dialFill.style.strokeDasharray = CIRC.toFixed(2);
      dialFill.style.strokeDashoffset = (CIRC * (1 - frac)).toFixed(2);
    }
    if (dialRotor) dialRotor.style.transform = "rotate(" + (frac * 360).toFixed(1) + "deg)";
    const h = Math.floor(sleepHours);
    const m = Math.round((sleepHours - h) * 60);
    if (dialHours) dialHours.textContent = h + "h " + String(m).padStart(2, "0") + "m";
    if (dialFace) {
      dialFace.setAttribute("aria-valuenow", sleepHours.toFixed(2));
      dialFace.setAttribute("aria-valuetext", h + " hours " + m + " minutes");
    }
  }

  function setSleepHours(v) {
    sleepHours = Math.max(MIN_H, Math.min(MAX_H, v));
    renderDial();
  }

  if (dialFace) {
    let dragging = false;

    function angleToHours(clientX, clientY) {
      const rect = dialFace.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx, dy = clientY - cy;
      let deg = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;
      return (deg / 360) * MAX_H;
    }

    dialFace.addEventListener("pointerdown", function (e) {
      dragging = true;
      dialFace.setPointerCapture(e.pointerId);
      setSleepHours(angleToHours(e.clientX, e.clientY));
    });
    dialFace.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      setSleepHours(angleToHours(e.clientX, e.clientY));
    });
    dialFace.addEventListener("pointerup", function () { dragging = false; });
    dialFace.addEventListener("pointercancel", function () { dragging = false; });

    dialFace.addEventListener("keydown", function (e) {
      let handled = true;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") setSleepHours(sleepHours + 0.25);
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") setSleepHours(sleepHours - 0.25);
      else if (e.key === "PageUp") setSleepHours(sleepHours + 1);
      else if (e.key === "PageDown") setSleepHours(sleepHours - 1);
      else if (e.key === "Home") setSleepHours(MIN_H);
      else if (e.key === "End") setSleepHours(MAX_H);
      else handled = false;
      if (handled) e.preventDefault();
    });

    renderDial();
  }

  /* ---------- check-in form ---------- */

  const form = document.getElementById("checkinForm");
  const btn = document.getElementById("checkinBtn");
  const confirmEl = document.getElementById("checkinConfirm");
  const aliasInput = document.getElementById("alias");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (btn.disabled) return;
      const alias = (aliasInput && aliasInput.value.trim()) || "you";
      const h = Math.floor(sleepHours);
      const m = Math.round((sleepHours - h) * 60);
      btn.disabled = true;
      confirmEl.textContent = "Recorded — " + h + "h " + m + "m adrift. Room 000 is being made up for " + alias + ". You will not remember reading this.";
      confirmEl.classList.add("show");
      setTimeout(function () { btn.disabled = false; }, 1800);
    });
  }

})();
