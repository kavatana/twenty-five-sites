/* VERDANT — growing vines, botanical plate, season wheel, herbarium, ambient pollen.
   Hand-rolled. No libraries. */
(() => {
"use strict";

const SVGNS = "http://www.w3.org/2000/svg";
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);

function el(name, attrs, parent) {
  const n = document.createElementNS(SVGNS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
// ease-out back — organic "sprout" overshoot
function easeSprout(t) {
  const s = 1.65; t -= 1;
  return t * t * ((s + 1) * t + s) + 1;
}

/* ================================================================
   1. SCROLL REVEAL
================================================================ */
const rvEls = [...document.querySelectorAll(".rv")];
// stagger siblings inside grouped containers
document.querySelectorAll(".packets, .specimens").forEach(group => {
  [...group.children].forEach((c, i) => c.style.setProperty("--d", (i * 0.13) + "s"));
});
document.querySelectorAll(".hero-copy .rv, .hero .plate").forEach((c, i) =>
  c.style.setProperty("--d", (0.1 + i * 0.14) + "s"));

if (REDUCED) {
  rvEls.forEach(e => e.classList.add("in"));
} else {
  const io = new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting) {
      en.target.classList.add("in");
      io.unobserve(en.target);
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  rvEls.forEach(e => io.observe(e));
}

/* ================================================================
   2. HERO PLATE — Digitalis purpurea, drawn in strokes
================================================================ */
function buildHeroPlate() {
  const svg = document.getElementById("hero-plate");
  if (!svg) return;
  const g = el("g", { class: "inkroot", fill: "none", stroke: "#1E2D1F", "stroke-width": "2",
    "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);

  const washes = el("g", { class: "washroot" }, svg);
  svg.insertBefore(washes, g);

  const drawPaths = [];
  const addDraw = (d, opts = {}) => {
    const p = el("path", Object.assign({ d, class: "draw" }, opts), g);
    drawPaths.push(p);
    return p;
  };
  const addWash = (d, fill, op) =>
    el("path", { d, fill, "fill-opacity": op, stroke: "none", class: "wash" }, washes);

  // ground line + roots
  addDraw("M64,552 C160,546 296,558 356,550", { "stroke-width": "1.6", stroke: "#4A5A45" });
  addDraw("M206,556 C198,566 188,570 178,576 M210,556 C212,568 210,578 214,586 M214,555 C224,564 232,566 240,572",
    { "stroke-width": "1.3", stroke: "#4A5A45" });

  // main stem
  const stemD = "M210,552 C204,470 216,380 207,290 C202,232 206,168 211,108";
  const stem = addDraw(stemD, { "stroke-width": "3" });

  // sample stem x at given y
  const sLen = stem.getTotalLength();
  const stemXY = [];
  for (let i = 0; i <= 160; i++) stemXY.push(stem.getPointAtLength(sLen * i / 160));
  const stemX = y => {
    let best = stemXY[0];
    for (const p of stemXY) if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p;
    return best.x;
  };

  // basal leaves — lanceolate, veined
  function bigLeaf(x, y, ang, L, W) {
    const tf = `translate(${x} ${y}) rotate(${ang})`;
    const outline = `M0,0 C${L * .22},${-W} ${L * .62},${-W * .92} ${L},-2 C${L * .62},${W * .78} ${L * .22},${W * .92} 0,0 Z`;
    el("path", { d: outline, fill: "#3E5C3A", "fill-opacity": ".1", stroke: "none",
      class: "wash", transform: tf }, washes);
    const gg = el("g", { transform: tf }, g);
    const o = el("path", { d: outline, class: "draw" }, gg); drawPaths.push(o);
    const mid = el("path", { d: `M4,-1 C${L * .3},-3 ${L * .7},-3 ${L - 6},-2`, class: "draw",
      "stroke-width": "1.2" }, gg); drawPaths.push(mid);
    for (let i = 1; i <= 4; i++) {
      const vx = L * .16 * i + 4;
      const v = el("path", {
        d: `M${vx},-2 C${vx + L * .08},${-W * .42} ${vx + L * .14},${-W * .5} ${vx + L * .2},${-W * .52}
            M${vx},-2 C${vx + L * .08},${W * .36} ${vx + L * .14},${W * .44} ${vx + L * .2},${W * .44}`,
        class: "draw", "stroke-width": ".9", stroke: "#3E5C3A" }, gg);
      drawPaths.push(v);
    }
  }
  bigLeaf(206, 544, -168, 122, 26);
  bigLeaf(212, 546, -14, 132, 28);
  bigLeaf(205, 530, -142, 88, 20);
  bigLeaf(214, 532, -36, 94, 21);

  // bells — hang along the upper stem, alternating
  const bellOutline = "M0,-7 C10,-11 22,-9 28,-3 C34,3 33,12 25,16 C16,20 6,18 2,12 C-1,7 -2,-3 0,-7 Z";
  const bellMouth = "M25,16 C28.5,10 29.5,3 28,-3";
  const bells = [];
  for (let i = 0; i < 8; i++) {
    const y = 322 - i * 26;
    const s = 1.06 - i * 0.075;
    const side = i % 2 ? -1 : 1;
    bells.push({ y, s, side, droop: rand(6, 18) });
  }
  for (const b of bells) {
    const x = stemX(b.y);
    const tf = `translate(${x} ${b.y}) scale(${b.side * b.s} ${b.s}) rotate(${b.droop})`;
    // pedicel
    addDraw(`M${x},${b.y - 4} C${x + b.side * 6},${b.y - 2} ${x + b.side * 9},${b.y} ${x + b.side * 11 * b.s},${b.y + 1}`,
      { "stroke-width": "1.5" });
    el("path", { d: bellOutline, fill: "#C67B4F", "fill-opacity": ".2", stroke: "none",
      class: "wash", transform: tf }, washes);
    const gg = el("g", { transform: tf }, g);
    const o = el("path", { d: bellOutline, class: "draw" }, gg); drawPaths.push(o);
    const m = el("path", { d: bellMouth, class: "draw", "stroke-width": "1.3" }, gg); drawPaths.push(m);
    // throat spots
    for (const [sx, sy] of [[12, 4], [18, 9], [9, 10], [15, 1]])
      el("circle", { cx: sx, cy: sy, r: 1.25, fill: "#C67B4F", stroke: "none", class: "wash" }, gg);
  }

  // buds at the tip
  for (let i = 0; i < 4; i++) {
    const y = 118 - i * 12, s = 1 - i * .16, side = i % 2 ? -1 : 1;
    const x = stemX(Math.max(y, 108)) + side * (5 + i);
    addDraw(`M${x},${y} c${side * 4 * s},-2 ${side * 6 * s},-6 ${side * 3 * s},-10 c${-side * 3 * s},-3 ${-side * 6 * s},0 ${-side * 5 * s},5 c0,3 ${side * 1},4 ${side * 2 * s},5 Z`,
      { "stroke-width": "1.5" });
  }
  addDraw(`M211,108 C212,98 210,90 212,82`, { "stroke-width": "1.6" });

  // small stem leaves
  bigLeaf(208, 372, -158, 62, 13);
  bigLeaf(211, 344, -24, 58, 12);

  // choreograph the draw
  drawPaths.forEach((p, i) => {
    p.setAttribute("pathLength", "1");
    p.style.setProperty("--dd", (0.15 + i * 0.055) + "s");
    p.style.transitionDuration = (REDUCED ? 0.001 : rand(0.9, 1.7)) + "s";
  });
  washes.querySelectorAll(".wash").forEach(w =>
    w.style.setProperty("--dd", (REDUCED ? 0 : 2.2) + "s"));
  g.querySelectorAll(".wash").forEach(w =>
    w.style.setProperty("--dd", (REDUCED ? 0 : 2.5) + "s"));

  requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add("drawn")));
}
buildHeroPlate();

/* ================================================================
   3. VINES — grow with scroll, sprout leaves, unfurl blooms
================================================================ */
const vines = [];
const animatingNodes = new Set();

function buildVine(svg) {
  const path = svg.querySelector(".vine-path");
  const len = path.getTotalLength();
  path.style.strokeDasharray = len;
  path.style.strokeDashoffset = len;

  const nodes = [];
  const step = +svg.dataset.step || 68;
  let side = 1;

  const nodeLayer = el("g", {}, svg);

  // leaves, tendrils along the stem
  let ni = 0;
  for (let d = step * 0.9; d < len - 30; d += step * rand(0.85, 1.15)) {
    const p = path.getPointAtLength(d);
    const p2 = path.getPointAtLength(Math.min(d + 2, len));
    const tan = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI;
    const rot = tan - side * rand(42, 65) + 90;
    const gOuter = el("g", { transform: `translate(${p.x} ${p.y}) rotate(${rot})` }, nodeLayer);
    const gIn = el("g", { transform: "scale(0)" }, gOuter);
    // inner group carries a continuous CSS breeze-sway so grown vines never freeze
    const gSway = el("g", { class: "swayg" }, gIn);
    gSway.style.setProperty("--swd", rand(3, 5.6).toFixed(2) + "s");
    gSway.style.setProperty("--swdel", (-rand(0, 5)).toFixed(2) + "s");
    if (ni % 5 === 4) {
      // curling tendril
      const f = side;
      el("path", {
        d: `M0,0 C${3 * f},-8 ${10 * f},-13 ${16 * f},-11 C${21 * f},-9 ${21 * f},-3 ${16 * f},-2 C${12 * f},-1 ${11 * f},-6 ${14.5 * f},-7.5`,
        class: "tendril"
      }, gIn);
    } else {
      const L = rand(16, 27), W = L * rand(0.36, 0.46);
      el("path", {
        d: `M0,0 C${W},${-L * .32} ${W * .86},${-L * .74} 0,${-L} C${-W * .86},${-L * .74} ${-W},${-L * .32} 0,0 Z`,
        class: "leaf-fill" + (Math.random() < 0.22 ? " alt" : "")
      }, gIn);
      el("path", { d: `M0,-2.5 L0,${-L * .72}`, class: "leaf-vein" }, gIn);
    }
    nodes.push({ at: d, el: gIn, pre: "", dur: rand(650, 950), started: 0, done: false, kind: "leaf" });
    side *= -1; ni++;
  }

  // blooms at declared fractions
  const bloomFr = (svg.dataset.blooms || "").split(",").filter(Boolean).map(Number);
  for (const f of bloomFr) {
    const d = len * f;
    const p = path.getPointAtLength(Math.min(d, len - 1));
    const bg = el("g", { transform: `translate(${p.x} ${p.y})` }, nodeLayer);
    const petals = 8;
    for (let i = 0; i < petals; i++) {
      const ang = i * 360 / petals + rand(-6, 6);
      const pg = el("g", { transform: `rotate(${ang}) scale(0)` }, bg);
      el("path", {
        d: "M0,0 C4.6,-4.2 5.2,-11.5 0,-16.5 C-5.2,-11.5 -4.6,-4.2 0,0 Z",
        class: "petal"
      }, pg);
      nodes.push({ at: d, el: pg, pre: `rotate(${ang}) `, dur: 700,
        delay: i * 70, started: 0, done: false, kind: "petal" });
    }
    const core = el("circle", { cx: 0, cy: 0, r: 4, class: "bloom-core",
      transform: "scale(0)" }, bg);
    nodes.push({ at: d, el: core, pre: "", dur: 600, delay: petals * 70,
      started: 0, done: false, kind: "core" });
  }

  // growing tip — a small glowing bud that leads the ink while the vine draws in,
  // so growth reads as a living thing advancing, not a generic line-reveal
  const tip = el("g", { class: "vine-tip" }, svg);
  el("circle", { r: 9, class: "tip-glow" }, tip);
  el("circle", { cx: 0, cy: 0, r: 2.6, class: "tip-core" }, tip);

  const vine = { svg, path, len, nodes, progress: 0, target: 0, tip };
  if (REDUCED) {
    vine.progress = vine.target = 1;
    path.style.strokeDashoffset = 0;
    nodes.forEach(n => { n.done = true; n.el.setAttribute("transform", n.pre + "scale(1)"); });
    tip.remove(); // fully grown already — no travelling bud needed under reduced motion
    vine.tip = null;
  }
  vines.push(vine);
}
document.querySelectorAll(".vine").forEach(buildVine);

function updateVines(now) {
  const vh = innerHeight;
  for (const v of vines) {
    if (v.progress >= 0.9995 && v.target >= 1) {
      if (v.tip) v.tip.classList.remove("on"); // settled — bud fades, growth is done
      continue;
    }
    const r = v.svg.getBoundingClientRect();
    if (r.top > vh * 1.3) continue; // far below viewport
    const span = Math.max(r.height * 0.85, 420);
    const t = clamp((vh * 0.88 - r.top) / span, 0, 1);
    if (t > v.target) v.target = t; // vines only grow
    v.progress += (v.target - v.progress) * 0.055;
    if (v.target - v.progress < 0.0004) v.progress = v.target;
    v.path.style.strokeDashoffset = v.len * (1 - v.progress);
    const grown = v.len * v.progress;
    for (const n of v.nodes) {
      if (!n.done && !n.started && grown >= n.at + 6) {
        n.started = now + (n.delay || 0);
        animatingNodes.add(n);
      }
    }
    if (v.tip) {
      const p = v.path.getPointAtLength(clamp(grown, 0, v.len));
      v.tip.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      v.tip.classList.add("on");
    }
  }
  for (const n of animatingNodes) {
    const t = (performance.now() - n.started) / n.dur;
    if (t < 0) continue;
    if (t >= 1) {
      n.el.setAttribute("transform", n.pre + "scale(1)");
      n.done = true; animatingNodes.delete(n);
    } else {
      n.el.setAttribute("transform", n.pre + `scale(${easeSprout(t).toFixed(4)})`);
    }
  }
}

/* ================================================================
   4. SEASON WHEEL
================================================================ */
function buildWheel() {
  const svg = document.getElementById("wheel");
  if (!svg) return;
  const C = 280;
  const pol = (r, a) => {
    const rad = (a - 90) * Math.PI / 180; // 0° = top, clockwise
    return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
  };
  const arc = (r, a0, a1, rev) => {
    if (rev) [a0, a1] = [a1, a0];
    const p0 = pol(r, a0), p1 = pol(r, a1);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A${r} ${r} 0 ${large} ${rev ? 0 : 1} ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  };
  const defs = el("defs", {}, svg);

  // outer hairline rings
  el("circle", { cx: C, cy: C, r: 252, fill: "none", stroke: "rgba(247,244,236,.18)", "stroke-width": "1" }, svg);
  el("circle", { cx: C, cy: C, r: 166, fill: "none", stroke: "rgba(247,244,236,.14)", "stroke-width": "1" }, svg);

  // season bands  (angles: 0 = Jan 1 at top, clockwise)
  // SUMMER/AUTUMN nudged a touch lighter than their swatch-key cousins — the dark ink season
  // labels sit directly on these bands, and the original tones only cleared 3.97:1 / 4.38:1
  // against #1E2D1F (measured), short of the 4.5:1 body-text bar. Lightened, they clear 4.7 / 5.0.
  const seasons = [
    { name: "SPRING", a0: 59, a1: 151, col: "#B9C46A" },
    { name: "SUMMER", a0: 149, a1: 241, col: "#7C9C6A" },
    { name: "AUTUMN", a0: 239, a1: 331, col: "#CC8861" },
    { name: "WINTER", a0: -31, a1: 61, col: "#8E9F8B" },
  ];
  seasons.forEach((s, i) => {
    el("path", { d: arc(214, s.a0 + 2, s.a1 - 2), fill: "none", stroke: s.col,
      "stroke-width": "26", "stroke-linecap": "round", opacity: ".92" }, svg);
    const mid = (s.a0 + s.a1) / 2;
    const rev = mid > 90 && mid < 270; // bottom half → reverse path so text is upright
    const tp = el("path", { id: "seas" + i, d: arc(rev ? 208 : 214 + 4.5, s.a0 + 6, s.a1 - 6, rev), fill: "none" }, defs);
    // radius tweak: reversed (bottom) text sits on inner edge baseline
    tp.setAttribute("d", arc(rev ? 209 : 219, s.a0 + 6, s.a1 - 6, rev));
    const t = el("text", { fill: "#1E2D1F", "font-family": "Karla,sans-serif",
      "font-size": "13", "font-weight": "700", "letter-spacing": "5" }, svg);
    const tpath = el("textPath", { href: "#seas" + i, startOffset: "50%",
      "text-anchor": "middle" }, t);
    tpath.textContent = s.name;
  });

  // month ticks + labels
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  months.forEach((m, i) => {
    const a = i * 30;
    const t0 = pol(176, a), t1 = pol(192, a);
    el("line", { x1: t0.x, y1: t0.y, x2: t1.x, y2: t1.y,
      stroke: "rgba(247,244,236,.35)", "stroke-width": "1.2" }, svg);
    const la = a + 15;
    const p = pol(244, la);
    const rot = la > 90 && la < 270 ? la + 180 : la;
    const txt = el("text", { x: p.x, y: p.y, fill: "rgba(247,244,236,.72)",
      "font-family": "Karla,sans-serif", "font-size": "11.5", "font-weight": "500",
      "letter-spacing": "2.5", "text-anchor": "middle", "dominant-baseline": "middle",
      transform: `rotate(${rot} ${p.x} ${p.y})` }, svg);
    txt.textContent = m;
  });

  // sow & harvest bands
  const band = (r, a0, a1, col, id, label) => {
    el("path", { d: arc(r, a0, a1), fill: "none", stroke: col, "stroke-width": "6",
      "stroke-linecap": "round", opacity: ".9" }, svg);
    const rev = ((a0 + a1) / 2) > 90 && ((a0 + a1) / 2) < 270;
    el("path", { id, d: arc(rev ? r - 13 : r + 11, a0, a1, rev), fill: "none" }, defs);
    const t = el("text", { fill: col, "font-family": "Karla,sans-serif",
      "font-size": "9.5", "font-weight": "700", "letter-spacing": "3" }, svg);
    const tp = el("textPath", { href: "#" + id, startOffset: "50%", "text-anchor": "middle" }, t);
    tp.textContent = label;
  };
  band(150, 44, 152, "#B9C46A", "sowA", "SOW UNDER GLASS → DIRECT");
  band(150, 244, 262, "#B9C46A", "sowB", "AUTUMN SOW");
  band(132, 166, 302, "#CC8861", "harv", "HARVEST · COLLECT · DRY SEED"); // same lightened terracotta as the AUTUMN band — was 4.38:1 on pine, now 5.0
  band(132, 312, 402, "#8E9F8B", "rest", "REST · NOTES · REPAIRS");

  // center
  el("circle", { cx: C, cy: C, r: 96, fill: "none", stroke: "rgba(247,244,236,.22)", "stroke-width": "1" }, svg);
  el("circle", { cx: C, cy: C, r: 90, fill: "rgba(247,244,236,.035)", stroke: "none" }, svg);
  const ct = (y, txt, attrs) => {
    const t = el("text", Object.assign({ x: C, y, "text-anchor": "middle", fill: "#F7F4EC" }, attrs), svg);
    t.textContent = txt; return t;
  };
  ct(C - 22, "VERDANT", { "font-family": "Karla,sans-serif", "font-size": "15", "font-weight": "700", "letter-spacing": "7", fill: "#F7F4EC" });
  ct(C + 2, "MMXXVI", { "font-family": "Karla,sans-serif", "font-size": "10", "letter-spacing": "5", fill: "rgba(247,244,236,.55)" });
  ct(C + 30, "the year, read as a circle", { "font-family": "'EB Garamond',serif", "font-style": "italic", "font-size": "13.5", fill: "#B9C46A" });

  // the hand — starts at today, sweeps slowly
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const doy = Math.floor((now - start) / 864e5);
  const a0 = doy / 366 * 360;
  const holder = el("g", { transform: `rotate(${a0.toFixed(1)} ${C} ${C})` }, svg);
  const hand = el("g", { class: "hand-g" }, holder);
  el("path", { d: `M${C - 2.5},${C + 26} L${C},${C - 196} L${C + 2.5},${C + 26} Z`,
    fill: "#F7F4EC", opacity: ".9" }, hand);
  // small leaf counterweight on the tail
  el("path", { d: `M${C},${C + 26} C${C + 9},${C + 34} ${C + 9},${C + 46} ${C},${C + 54} C${C - 9},${C + 46} ${C - 9},${C + 34} ${C},${C + 26} Z`,
    fill: "#B9C46A", opacity: ".9" }, hand);
  el("circle", { cx: C, cy: C, r: 6.5, fill: "#1E2D1F", stroke: "#F7F4EC", "stroke-width": "1.6" }, hand);
  el("circle", { cx: C, cy: C, r: 1.8, fill: "#B9C46A" }, hand);
}
buildWheel();

/* ================================================================
   5. HERBARIUM SPECIMENS — drawn line-art, dash-revealed
================================================================ */
function specimenInk(svg) {
  return el("g", { fill: "none", stroke: "#3E5C3A", "stroke-width": "1.6",
    "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
}
function finishSpecimen(svg, g) {
  // Budget the stagger instead of a flat per-path delay: yarrow's feathered leaves alone run
  // to ~280 barb strokes, and a fixed 45ms/path stagger made it take ~14s to finish drawing —
  // nearly bald for most of a viewer's dwell — while the poppy (22 paths) finished in ~2s.
  // Capping the total spread to a fixed budget keeps every specimen finishing in the same
  // few seconds, so the level of drawn detail no longer punishes the busiest plant.
  const draws = [...g.querySelectorAll("path")].filter(p => !p.classList.contains("wash"));
  const budget = 1.35; // seconds of total stagger spread, regardless of path count
  const step = draws.length ? Math.min(0.045, budget / draws.length) : 0.045;
  draws.forEach((p, i) => {
    p.classList.add("draw");
    p.setAttribute("pathLength", "1");
    p.style.setProperty("--dd", (i * step).toFixed(4) + "s");
    p.style.transitionDuration = REDUCED ? "0.001s" : rand(0.7, 1.2) + "s";
  });
}

function buildYarrow() {
  const svg = document.getElementById("spec-yarrow");
  if (!svg) return;
  const g = specimenInk(svg);
  const add = (d, o = {}) => el("path", Object.assign({ d }, o), g);
  add("M130,322 C126,262 134,196 129,124 C127,96 129,74 130,62", { "stroke-width": "2.2" });
  // feathery leaves — curved vein, dense curved barbs with taper ("millefolium")
  const feather = (x, y, ang, L) => {
    const rad = ang * Math.PI / 180;
    const ex = x + Math.cos(rad) * L, ey = y + Math.sin(rad) * L;
    add(`M${x},${y} Q${x + Math.cos(rad) * L * .5},${y + Math.sin(rad) * L * .5 - 6} ${ex},${ey}`, { "stroke-width": "1.15" });
    for (let i = 1; i < 13; i++) {
      const t = i / 13;
      const px = x + Math.cos(rad) * L * t, py = y + Math.sin(rad) * L * t - 6 * Math.sin(Math.PI * t) * .5;
      const bl = 8.5 * (1 - t * 0.6);
      for (const s of [-1, 1]) {
        const a = rad + s * 1.02;
        const bx = px + Math.cos(a) * bl, by = py + Math.sin(a) * bl;
        // curved barb, plus a tiny secondary spur near its middle
        add(`M${px},${py} Q${px + Math.cos(a) * bl * .5},${py + Math.sin(a) * bl * .5 - 1.6} ${bx},${by}`, { "stroke-width": ".75" });
        if (bl > 4.5)
          add(`M${px + Math.cos(a) * bl * .45},${py + Math.sin(a) * bl * .45 - 1} l${Math.cos(a + s * .8) * bl * .38},${Math.sin(a + s * .8) * bl * .38}`, { "stroke-width": ".6" });
      }
    }
  };
  feather(127, 288, -162, 58);
  feather(128, 270, -160, 66);
  feather(131, 236, -20, 70);
  feather(128, 196, -158, 58);
  feather(130, 162, -26, 54);
  feather(129, 140, -156, 40);
  // corymb — a proper flat-topped dome of flower heads on curved pedicels
  const heads = [
    [58, 58], [76, 42], [96, 31], [116, 25], [134, 22],
    [152, 25], [170, 30], [188, 39], [202, 52],
    [100, 44], [128, 38], [156, 40]
  ];
  for (const [hx, hy] of heads) {
    add(`M130,66 C${130 + (hx - 130) * .3},${56} ${hx - (hx - 130) * .15},${hy + 20} ${hx},${hy + 6}`, { "stroke-width": "1" });
    el("circle", { cx: hx, cy: hy, r: 4.6, fill: "#F7F4EC", stroke: "#3E5C3A", "stroke-width": "1" }, g);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2 + hx * .3;
      el("circle", { cx: hx + Math.cos(a) * 4.5, cy: hy + Math.sin(a) * 4.5, r: 1.8,
        fill: "#F7F4EC", stroke: "#3E5C3A", "stroke-width": ".9", class: "wash" }, g);
    }
    el("circle", { cx: hx, cy: hy, r: 1.3, fill: "#C67B4F", stroke: "none", class: "wash" }, g);
  }
  finishSpecimen(svg, g);
}
function buildPoppy() {
  const svg = document.getElementById("spec-poppy");
  if (!svg) return;
  const g = specimenInk(svg);
  const add = (d, o = {}) => el("path", Object.assign({ d }, o), g);
  add("M118,322 C114,252 126,190 120,132 C117,104 128,84 142,72", { "stroke-width": "2" });
  // stem hairs
  for (let i = 0; i < 12; i++) {
    const y = 300 - i * 19;
    const x = 118 + (i > 6 ? (i - 6) * 1.4 : -1) + Math.sin(i) * 3;
    add(`M${x},${y} l${i % 2 ? 5 : -5},-3`, { "stroke-width": ".7" });
  }
  // dissected leaves
  add("M117,268 C104,262 92,264 82,254 M96,262 l-4,-9 M104,264 l-1,-10 M90,258 l-7,-4", { "stroke-width": "1.2" });
  add("M121,214 C134,208 146,210 158,198 M138,209 l4,-9 M130,211 l1,-10 M150,203 l8,-3", { "stroke-width": "1.2" });
  // flower — four crêpe petals
  const petals = [
    "M148,68 C120,58 106,34 122,16 C138,4 158,14 160,38 Z",
    "M150,66 C136,40 142,14 166,8 C186,6 194,26 180,46 Z",
    "M152,68 C168,42 192,36 204,52 C212,68 198,84 174,80 Z",
    "M150,70 C176,66 194,78 190,96 C184,112 162,112 150,94 Z",
  ];
  for (const d of petals) {
    el("path", { d, fill: "#C67B4F", "fill-opacity": ".24", stroke: "none", class: "wash" }, g);
    add(d, { stroke: "#B05F35", "stroke-width": "1.4" });
  }
  el("circle", { cx: 153, cy: 62, r: 7.5, fill: "#1E2D1F", stroke: "none", class: "wash" }, g);
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2;
    el("circle", { cx: 153 + Math.cos(a) * 12, cy: 62 + Math.sin(a) * 12, r: 1.2,
      fill: "#1E2D1F", stroke: "none", class: "wash" }, g);
  }
  // nodding bud on a bent side stem
  add("M119,240 C144,224 168,210 180,184 C186,172 184,162 176,156", { "stroke-width": "1.6" });
  add("M176,156 C168,148 168,138 176,132 C184,126 194,130 196,140 C198,150 190,158 182,158 C179,158 177,157 176,156 Z",
    { "stroke-width": "1.4" });
  add("M180,150 C184,144 188,142 192,142", { "stroke-width": ".8" });
  finishSpecimen(svg, g);
}
function buildFern() {
  const svg = document.getElementById("spec-fern");
  if (!svg) return;
  const g = specimenInk(svg);
  // main frond
  const frond = (d, n, maxLen, washOp) => {
    const rachis = el("path", { d, "stroke-width": "1.8" }, g);
    const L = rachis.getTotalLength();
    for (let i = 0; i < n; i++) {
      const t = 0.12 + (i / n) * 0.86;
      const p = rachis.getPointAtLength(L * t);
      const p2 = rachis.getPointAtLength(Math.min(L * t + 2, L));
      const tan = Math.atan2(p2.y - p.y, p2.x - p.x);
      const size = maxLen * (1 - Math.pow(t, 1.6)) + 2.5;
      for (const s of [-1, 1]) {
        const a = tan + s * 1.15;
        const mx = p.x + Math.cos(a) * size, my = p.y + Math.sin(a) * size;
        // pinna: little rounded leaflet
        el("ellipse", {
          cx: (p.x + mx) / 2, cy: (p.y + my) / 2, rx: size / 2 + 1.5, ry: Math.max(size / 3.4, 2),
          transform: `rotate(${a * 180 / Math.PI} ${(p.x + mx) / 2} ${(p.y + my) / 2})`,
          fill: "#3E5C3A", "fill-opacity": washOp, stroke: "none", class: "wash"
        }, g);
        el("path", { d: `M${p.x},${p.y} L${mx},${my}`, "stroke-width": ".8" }, g);
      }
    }
  };
  frond("M148,326 C118,262 116,180 138,96 C144,72 152,52 160,40", 16, 30, ".55");
  frond("M150,326 C170,280 186,236 188,182 C189,160 186,146 182,138", 11, 18, ".45");
  // curled fiddlehead accent
  el("path", { d: "M160,40 C166,32 176,30 180,36 C184,42 178,48 172,46 C168,44 168,39 172,38",
    "stroke-width": "1.4" }, g);
  finishSpecimen(svg, g);
}
buildYarrow(); buildPoppy(); buildFern();

/* ================================================================
   6. SEED PACKETS — SVG stamps, sprig dividers, flip for touch & keyboard
================================================================ */
// circular rubber stamp — text on a path (the old span clipped its own text)
document.querySelectorAll(".stamp").forEach((s, si) => {
  s.textContent = "";
  const svg = el("svg", { viewBox: "0 0 100 100" }, s);
  const defs = el("defs", {}, svg);
  el("path", { id: "stamp-ring-" + si,
    d: "M50,50 m-33,0 a33,33 0 1,1 66,0 a33,33 0 1,1 -66,0", fill: "none" }, defs);
  el("circle", { cx: 50, cy: 50, r: 46, fill: "none", stroke: "currentColor",
    "stroke-width": "1.6", "stroke-dasharray": "3 4" }, svg);
  el("circle", { cx: 50, cy: 50, r: 23, fill: "none", stroke: "currentColor",
    "stroke-width": "1" }, svg);
  const t = el("text", { fill: "currentColor", "font-family": "Karla,sans-serif",
    "font-size": "9.2", "font-weight": "700", "letter-spacing": "1.6" }, svg);
  const tp = el("textPath", { href: "#stamp-ring-" + si, startOffset: "0" }, t);
  tp.textContent = "TESTED 2026 · GLASSHOUSE Nº3 ·";
  el("path", { d: "M50,61 C50,52 53.5,46.5 59,43.5 C58,52 55,58 50,61 Z M50,61 C50,54 46.5,49.5 42,47 C43,54 45.8,58.5 50,61 Z",
    fill: "currentColor" }, svg);
});
// sprig divider between packet note and footer
document.querySelectorAll(".packet .face.front").forEach(f => {
  const orn = document.createElement("div");
  orn.className = "packet-orn";
  orn.setAttribute("aria-hidden", "true");
  orn.innerHTML =
    `<svg viewBox="0 0 90 14" fill="none"><path d="M2,7 H32 M58,7 H88" stroke="currentColor" stroke-width="1" opacity=".5"/>` +
    `<path d="M45,12 C45,7 47,3.6 50.5,1.4 C50,6 48.4,9.6 45,12 Z M45,12 C45,8 43,5 39.5,3 C40,7 41.8,10 45,12 Z" fill="currentColor"/></svg>`;
  f.insertBefore(orn, f.querySelector(".packet-foot"));
});
document.querySelectorAll(".packet").forEach(p => {
  const toggle = () => p.classList.toggle("flipped");
  p.addEventListener("click", e => {
    if (matchMedia("(hover: none)").matches) toggle();
  });
  p.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
  });
});

/* ================================================================
   7. AMBIENT — pollen motes & the occasional falling leaf
================================================================ */
const canvas = document.getElementById("ambient");
const ambient = { motes: [], leaves: [], nextLeaf: 0 };
let ctx = null, W = 0, H = 0, DPR = 1;

function sizeCanvas() {
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  ctx = canvas.getContext("2d");
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
function seedMotes() {
  const n = W < 700 ? 14 : 30;
  ambient.motes = [];
  for (let i = 0; i < n; i++) {
    ambient.motes.push({
      x: rand(0, W), y: rand(0, H), r: rand(0.8, 2.2),
      sp: rand(0.08, 0.3), amp: rand(10, 42), om: rand(0.0002, 0.0007),
      ph: rand(0, Math.PI * 2),
      col: Math.random() < 0.82 ? "185,196,106" : "198,123,79",
      al: rand(0.16, 0.42)
    });
  }
}
function spawnLeaf(now) {
  ambient.leaves.push({
    x: rand(W * 0.1, W * 0.9), y: -24, vy: rand(0.4, 0.75),
    amp: rand(24, 60), om: rand(0.0008, 0.0016), ph: rand(0, Math.PI * 2),
    rot: rand(0, Math.PI * 2), vr: rand(-0.012, 0.012),
    size: rand(9, 15),
    col: Math.random() < 0.6 ? "62,92,58" : "198,123,79",
    al: rand(0.5, 0.8)
  });
  ambient.nextLeaf = now + rand(6000, 12000);
}
function drawAmbient(now) {
  ctx.clearRect(0, 0, W, H);
  for (const m of ambient.motes) {
    m.y -= m.sp;
    if (m.y < -8) { m.y = H + 8; m.x = rand(0, W); }
    const x = m.x + Math.sin(now * m.om + m.ph) * m.amp;
    ctx.beginPath();
    ctx.arc(x, m.y, m.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${m.col},${(m.al * (0.75 + 0.25 * Math.sin(now * 0.001 + m.ph))).toFixed(3)})`;
    ctx.fill();
  }
  if (now > ambient.nextLeaf && ambient.leaves.length < 3) spawnLeaf(now);
  for (let i = ambient.leaves.length - 1; i >= 0; i--) {
    const L = ambient.leaves[i];
    L.y += L.vy;
    L.rot += L.vr + Math.sin(now * L.om + L.ph) * 0.006;
    const x = L.x + Math.sin(now * L.om + L.ph) * L.amp;
    if (L.y > H + 30) { ambient.leaves.splice(i, 1); continue; }
    ctx.save();
    ctx.translate(x, L.y);
    ctx.rotate(L.rot);
    ctx.beginPath();
    const s = L.size;
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * .8, -s * .5, s * .8, -s * 1.4, 0, -s * 1.8);
    ctx.bezierCurveTo(-s * .8, -s * 1.4, -s * .8, -s * .5, 0, 0);
    ctx.fillStyle = `rgba(${L.col},${L.al})`;
    ctx.fill();
    ctx.restore();
  }
}

/* ================================================================
   8. CUSTOM CURSOR — a loupe ring that trails with an unhurried lag,
      widening over anything you can act on (packets, buttons, links)
================================================================ */
const cursorDot = document.getElementById("cursor-dot");
const hasFinePointer = matchMedia("(hover:hover) and (pointer:fine)").matches;
const HOVER_SEL = ".packet, .btn, .site-nav a, .wordmark, .site-foot a, .specimen, .scroll-hint";
const cursor = { x: 0, y: 0, cx: 0, cy: 0, active: false };
if (cursorDot && hasFinePointer && !REDUCED) {
  addEventListener("pointermove", e => {
    cursor.x = e.clientX; cursor.y = e.clientY;
    if (!cursor.active) { cursor.active = true; cursor.cx = cursor.x; cursor.cy = cursor.y; cursorDot.classList.add("on"); }
  }, { passive: true });
  document.addEventListener("mouseleave", () => cursorDot.classList.remove("on"));
  document.addEventListener("mouseenter", () => { if (cursor.active) cursorDot.classList.add("on"); });
  document.addEventListener("mouseover", e => {
    if (e.target.closest(HOVER_SEL)) cursorDot.classList.add("hover");
  });
  document.addEventListener("mouseout", e => {
    if (e.target.closest(HOVER_SEL) && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(HOVER_SEL)))
      cursorDot.classList.remove("hover");
  });
}
function updateCursor() {
  if (!cursorDot || !cursor.active) return;
  cursor.cx += (cursor.x - cursor.cx) * 0.22;
  cursor.cy += (cursor.y - cursor.cy) * 0.22;
  cursorDot.style.transform = `translate(${cursor.cx.toFixed(1)}px,${cursor.cy.toFixed(1)}px)`;
}

/* ================================================================
   9. MASTER LOOP — paused when tab hidden
================================================================ */
let rafId = 0;
function tick(now) {
  updateVines(now);
  updateCursor();
  if (ctx) drawAmbient(now);
  rafId = requestAnimationFrame(tick);
}
function startLoop() {
  if (!rafId && !REDUCED) rafId = requestAnimationFrame(tick);
}
function stopLoop() {
  cancelAnimationFrame(rafId); rafId = 0;
}
if (!REDUCED) {
  sizeCanvas(); seedMotes();
  ambient.nextLeaf = performance.now() + 4000;
  addEventListener("resize", () => { sizeCanvas(); seedMotes(); });
  document.addEventListener("visibilitychange", () =>
    document.hidden ? stopLoop() : startLoop());
  startLoop();
} else {
  canvas.remove();
}

})();
