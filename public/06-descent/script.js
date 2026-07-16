/* DESCENT — scroll → depth engine ................................. */
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const sea = $("#sea");
  const rays = $("#rays");
  const tape = $("#tape");
  const rail = document.querySelector(".hud-rail");
  const depthNum = $("#depthNum");
  const zoneLabel = $("#zoneLabel");
  const pressLabel = $("#pressLabel");
  const canvas = $("#snow");
  const ctx = canvas.getContext("2d");
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const MAX_DEPTH = 10935;
  const PPM = 0.06; // tape pixels per metre

  /* ---------- palette over scroll ---------- */
  const COLOR_STOPS = [
    [0.0,  [0x9b, 0xd4, 0xe4]], // surface
    [0.17, [0x1b, 0x3a, 0x5c]], // twilight
    [0.46, [0x0a, 0x14, 0x28]], // midnight
    [0.82, [0x02, 0x03, 0x0f]], // hadal
    [1.0,  [0x02, 0x03, 0x0f]],
  ];
  function paletteAt(p) {
    for (let i = 1; i < COLOR_STOPS.length; i++) {
      if (p <= COLOR_STOPS[i][0]) {
        const [p0, c0] = COLOR_STOPS[i - 1];
        const [p1, c1] = COLOR_STOPS[i];
        const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0);
        return c0.map((c, k) => Math.round(c + (c1[k] - c) * t));
      }
    }
    return COLOR_STOPS[COLOR_STOPS.length - 1][1];
  }

  /* ---------- scroll → depth (piecewise, anchored to the DOM) ---------- */
  let depthStops = [[0, 0], [1, MAX_DEPTH]];
  function buildDepthStops() {
    const vh = innerHeight;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - vh);
    const stops = [[0, 0]];
    document.querySelectorAll("[data-depth]").forEach((el) => {
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + scrollY + rect.height / 2;
      const p = Math.min(1, Math.max(0, (centerY - vh / 2) / scrollable));
      stops.push([p, +el.dataset.depth]);
    });
    stops.push([1, MAX_DEPTH]);
    stops.sort((a, b) => a[0] - b[0]);
    depthStops = stops;
  }
  function depthAt(p) {
    for (let i = 1; i < depthStops.length; i++) {
      if (p <= depthStops[i][0]) {
        const [p0, d0] = depthStops[i - 1];
        const [p1, d1] = depthStops[i];
        const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0);
        return d0 + (d1 - d0) * t;
      }
    }
    return MAX_DEPTH;
  }

  const ZONES = [
    [200, "sunlight"], [1000, "twilight"], [4000, "midnight"],
    [6000, "abyssal"], [Infinity, "hadal"],
  ];
  const zoneAt = (d) => ZONES.find(([lim]) => d < lim)[1];

  /* ---------- HUD tape ---------- */
  function buildTape() {
    const frag = document.createDocumentFragment();
    for (let d = 0; d <= MAX_DEPTH + 250; d += 250) {
      const m = Math.min(d, MAX_DEPTH);
      if (d > MAX_DEPTH && MAX_DEPTH % 250 === 0) break;
      const tick = document.createElement("i");
      tick.className = "tick" + (m % 1000 === 0 || m === MAX_DEPTH ? " major" : "");
      if (m === MAX_DEPTH) tick.className += " floor";
      tick.style.top = m * PPM + "px";
      if (m % 1000 === 0 || m === MAX_DEPTH) {
        const num = document.createElement("span");
        num.className = "tick-num";
        num.textContent = m.toLocaleString("en-US");
        tick.appendChild(num);
      }
      frag.appendChild(tick);
      if (m === MAX_DEPTH) break;
    }
    tape.appendChild(frag);
  }

  /* ---------- marine snow ---------- */
  let W = 0, H = 0, DPR = 1;
  let particles = [];
  function sizeCanvas() {
    DPR = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const target = Math.min(150, Math.round((W * H) / 9200));
    particles = Array.from({ length: target }, () => ({
      x: Math.random() * W,
      y: Math.random() * (H + 40),
      z: 0.25 + Math.random() * 0.75,      // parallax layer
      ph: Math.random() * Math.PI * 2,     // wobble phase
      wf: 0.3 + Math.random() * 0.7,       // wobble frequency
      glow: Math.random() < 0.1,
      hue: Math.random() < 0.62 ? "127,255,212" : "255,126,182",
    }));
  }
  function drawSnow(t, scrollS, progress) {
    ctx.clearRect(0, 0, W, H);
    // dust is thickest through the sunlit/twilight fall, then thins as the
    // water empties out toward the hadal floor — but never vanishes.
    const rise = Math.min(1, progress * 2.4);
    const settle = Math.max(0, (progress - 0.5) / 0.5);
    const visibility = 0.32 + 0.62 * rise - 0.24 * settle * settle;
    // the few motes that ARE bioluminescent burn brighter the deeper you go —
    // "light is something animals make."
    const bioStrength = 0.4 + progress * 0.9;
    for (const p of particles) {
      const drift = reduced ? 0 : t * (3 + p.z * 14);
      let sy = (p.y - scrollS * (0.22 + p.z * 0.55) - drift) % (H + 40);
      if (sy < -20) sy += H + 40;
      const sx = p.x + (reduced ? 0 : Math.sin(t * p.wf + p.ph) * (5 + p.z * 9));
      const r = 0.5 + p.z * 1.5;
      const a = (0.13 + p.z * 0.4) * visibility;
      if (p.glow) {
        const ga = Math.min(1, a * bioStrength);
        ctx.beginPath();
        ctx.arc(sx, sy - 20, r * (3 + progress * 2), 0, 7);
        ctx.fillStyle = `rgba(${p.hue},${(ga * 0.28).toFixed(3)})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy - 20, r * 1.15, 0, 7);
        ctx.fillStyle = `rgba(${p.hue},${Math.min(1, ga * 1.8).toFixed(3)})`;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy - 20, r, 0, 7);
        ctx.fillStyle = `rgba(207,233,242,${a.toFixed(3)})`;
        ctx.fill();
      }
    }
  }

  /* ---------- master update ---------- */
  let targetY = scrollY, smoothY = scrollY, lastT = 0, rafId = 0;

  function update(t, dt) {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    targetY = scrollY;
    if (reduced) smoothY = targetY;
    else smoothY += (targetY - smoothY) * Math.min(1, 1 - Math.exp(-dt * 7));
    if (Math.abs(targetY - smoothY) < 0.1) smoothY = targetY;

    const p = Math.min(1, Math.max(0, smoothY / scrollable));

    // water color + vignette
    const [r, g, b] = paletteAt(p);
    sea.style.backgroundColor = `rgb(${r},${g},${b})`;
    root.style.setProperty("--vig", (0.25 + p * 0.5).toFixed(3));

    // light rays die in the first two viewports
    const rayOp = Math.max(0, 1 - p / 0.21);
    rays.style.opacity = (rayOp * rayOp).toFixed(3);

    // deep-mode chrome (light text HUD)
    root.classList.toggle("is-deep", p > 0.055);

    // depth meter
    const depth = depthAt(p);
    depthNum.textContent = Math.round(depth).toLocaleString("en-US");
    zoneLabel.textContent = zoneAt(depth);
    pressLabel.textContent = Math.round(1 + depth * 0.1003).toLocaleString("en-US") + " atm";
    const railH = rail.clientHeight;
    tape.style.transform = `translateY(${(railH / 2 - depth * PPM).toFixed(2)}px)`;

    drawSnow(t / 1000, smoothY, p);
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    update(t, dt);
    rafId = requestAnimationFrame(loop);
  }

  /* ---------- reveals ---------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }),
    { threshold: 0.3 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------- ascent ---------- */
  $("#ascend").addEventListener("click", () => {
    if (reduced) { scrollTo(0, 0); return; }
    const startY = scrollY;
    const dur = Math.min(2500, 500 + startY * 0.24);
    const t0 = performance.now();
    (function rise(now) {
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      scrollTo(0, startY * (1 - e));
      if (k < 1) requestAnimationFrame(rise);
    })(t0);
  });

  /* ---------- lifecycle ---------- */
  function relayout() { sizeCanvas(); buildDepthStops(); update(lastT || 0, 0.016); }

  buildTape();
  sizeCanvas();
  buildDepthStops();

  addEventListener("resize", relayout);
  addEventListener("load", relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => buildDepthStops());

  if (reduced) {
    update(0, 0.016);
    addEventListener("scroll", () => update(0, 0.016), { passive: true });
  } else {
    rafId = requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(rafId);
      else { lastT = performance.now(); rafId = requestAnimationFrame(loop); }
    });
  }
})();
