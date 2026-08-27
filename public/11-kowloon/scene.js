/* KOWLOON NIGHTS — street builder, rain, camera drift */
(() => {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const world = document.getElementById("world");
  const rig = document.getElementById("rig");
  const tilt = document.getElementById("tilt");
  const hero = document.getElementById("street");

  /* ───────── deterministic rand (stable street every load) ───────── */
  let seed = 20471;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ───────── buildings ─────────
     world is 1600×1600 · street band y ≈ 790–970 · far row walls at y=800 */
  const FAR = 800, NEAR = 972;
  const BUILDINGS = [
    { x:  20, y: FAR - 230, w: 250, d: 230, h: 350 },
    { x: 300, y: FAR - 205, w: 215, d: 205, h: 285 },
    { x: 548, y: FAR - 245, w: 270, d: 245, h: 432 },
    { x: 850, y: FAR - 215, w: 235, d: 215, h: 330 },
    { x:1118, y: FAR - 200, w: 255, d: 200, h: 262 },
    { x:1405, y: FAR - 225, w: 195, d: 225, h: 372 },
    /* near row — low stalls so the street stays visible */
    { x:  60, y: NEAR, w: 190, d: 150, h: 168, stall: true },
    { x: 330, y: NEAR, w: 150, d: 120, h:  78, stall: true, awning: true },
    { x: 560, y: NEAR, w: 220, d: 130, h:  92, stall: true, awning: true, lit: true },
    { x: 880, y: NEAR, w: 170, d: 125, h: 118, stall: true },
    { x:1130, y: NEAR, w: 150, d: 115, h:  70, stall: true, awning: true },
    { x:1360, y: NEAR, w: 200, d: 150, h: 150, stall: true },
  ];

  const WIN_COLORS = [
    ["#FFD9A0", .58], ["#FFC97C", .20], ["#FFEFCB", .12], ["#9FEFFF", .06], ["#FF9EC4", .03], ["#FFE33D", .01],
  ];
  const pickColor = () => {
    let r = rnd(), acc = 0;
    for (const [c, p] of WIN_COLORS) { acc += p; if (r <= acc) return c; }
    return "#FFD9A0";
  };

  const px = (n) => n + "px";

  function windows(wall, wpx, hpx, sparse) {
    const cols = Math.max(2, Math.floor((wpx - 16) / 19));
    const rows = Math.max(2, Math.floor((hpx - 20) / 22));
    wall.style.gridTemplateColumns = `repeat(${cols},12px)`;
    wall.style.gridTemplateRows = `repeat(${rows},15px)`;
    const litP = sparse ? 0.24 : 0.46;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < cols * rows; i++) {
      const cell = document.createElement("i");
      cell.className = "win";
      if (rnd() > litP) {
        cell.classList.add("off");
      } else {
        cell.style.setProperty("--w", pickColor());
        cell.style.setProperty("--o", (0.35 + rnd() * 0.45).toFixed(2));
        if (rnd() < 0.14 && !REDUCED) {
          cell.classList.add("flick");
          cell.style.setProperty("--fd", (2.5 + rnd() * 6).toFixed(2) + "s");
          cell.style.setProperty("--fl", (-rnd() * 6).toFixed(2) + "s");
        }
      }
      frag.appendChild(cell);
    }
    wall.appendChild(frag);
  }

  function face(cls, w, h) {
    const f = document.createElement("div");
    f.className = "face " + cls;
    f.style.width = px(w);
    f.style.height = px(h);
    return f;
  }

  for (const b of BUILDINGS) {
    const el = document.createElement("div");
    el.className = "bld";
    el.style.left = px(b.x);
    el.style.top = px(b.y);
    el.style.width = px(b.w);
    el.style.height = px(b.d);

    const roof = face("roof" + (b.awning ? " awning" : ""), b.w, b.d);
    roof.style.transform = `translateZ(${b.h}px)`;

    const wa = face("wa", b.w, b.h);           // wall along y = d (faces street/camera)
    wa.style.left = "0"; wa.style.top = px(b.d);

    const wb = face("wb", b.d, b.h);           // wall along x = w
    wb.style.left = px(b.w); wb.style.top = "0";

    if (!b.stall) {
      windows(wa, b.w, b.h, false);
      windows(wb, b.d, b.h, true);
    } else if (b.lit) {
      wa.style.background =
        "linear-gradient(to bottom, rgba(255,186,92,.42), rgba(255,140,60,.1) 70%, #0B0B18)";
      wa.style.boxShadow = "inset 0 14px 40px rgba(255,170,80,.35)";
    } else if (b.h > 100) {
      windows(wa, b.w, b.h, true);
    }

    el.append(roof, wa, wb);
    world.appendChild(el);
  }

  /* warm pool of light in front of the noodle stall */
  const glow = document.createElement("div");
  glow.className = "stall-glow";
  glow.style.cssText = "left:520px;top:840px;width:300px;height:150px;";
  world.appendChild(glow);

  /* ───────── neon signs (billboarded to camera) ───────── */
  const SIGNS = [
    { x: 690, y: 940, z: 252, cls: "tone-yellow-s", fs: 40,
      html: '<span class="zh">金碗麺家</span><small>GOLDEN BOWL</small>' },
    { x: 385, y: 818, z: 258, cls: "tone-cyan-s vert", fs: 30,
      html: '<span class="zh">蘭花酒吧</span>' },
    { id: "sign-electric", x: 985, y: 930, z: 224, cls: "tone-pink-s", fs: 36,
      html: 'OK<span class="zh">電器</span><small>ELECTRI<span class="dying">C</span></small>' },
    { id: "sign-pharmacy", x: 1268, y: 880, z: 150, cls: "tone-red-s vert", fs: 26,
      html: '<span class="zh">藥</span>' },
    { id: "sign-leaf", x: 1400, y: 1040, z: 118, cls: "tone-yellow-s", fs: 18,
      html: '<span class="zh">茶</span> MIDNIGHT&nbsp;LEAF<span class="dying">·</span>' },
    { id: "sign-fortune", x: 1500, y: 930, z: 168, cls: "tone-pink-s vert", fs: 24,
      html: '<span class="zh">占卜</span>' },
    { x: 655, y: 1005, z: 132, cls: "tone-pink-s", fs: 26,
      html: '<span class="zh">麺</span>' },
    { id: "sign-keys", x: 1180, y: 1000, z: 104, cls: "tone-cyan-s", fs: 15,
      html: '<span class="zh">鎖匙</span> KEYS' },
  ];
  for (const s of SIGNS) {
    const el = document.createElement("div");
    if (s.id) el.id = s.id;
    el.className = "sign " + s.cls;
    el.style.fontSize = s.fs + "px";
    el.style.transform =
      `translate3d(${s.x}px,${s.y}px,${s.z}px) rotateZ(45deg) rotateX(-60deg) translate(-50%,-50%)`;
    el.style.animationDelay = (-rnd() * 3).toFixed(2) + "s, " + (-rnd() * 6).toFixed(2) + "s";
    el.innerHTML = s.html;
    world.appendChild(el);
  }

  /* ───────── puddles + neon reflections on the road ───────── */
  const PUDDLES = [
    { x: 240, y: 855, w: 210, h: 60, c: "rgba(0,229,255,.30)" },
    { x: 620, y: 890, w: 300, h: 78, c: "rgba(255,163,77,.34)" },
    { x: 960, y: 848, w: 190, h: 52, c: "rgba(255,46,136,.30)" },
    { x: 1290, y: 885, w: 240, h: 66, c: "rgba(0,229,255,.22)" },
  ];
  for (const p of PUDDLES) {
    const el = document.createElement("div");
    el.className = "puddle";
    el.style.cssText =
      `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;` +
      `background:radial-gradient(closest-side, ${p.c}, transparent 72%);` +
      `animation-delay:${(-rnd() * 5).toFixed(2)}s;`;
    world.appendChild(el);
  }
  const REFLS = [
    { x: 665, y: 800, w: 70, h: 175, c: "255,227,61" },
    { x: 372, y: 800, w: 46, h: 150, c: "0,229,255" },
    { x: 962, y: 800, w: 58, h: 160, c: "255,46,136" },
    { x: 1232, y: 800, w: 34, h: 120, c: "255,94,84" },
    { x: 122, y: 800, w: 40, h: 130, c: "255,227,61" },
  ];
  for (const r of REFLS) {
    const el = document.createElement("div");
    el.className = "refl";
    el.style.cssText =
      `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;` +
      `background:linear-gradient(to bottom, rgba(${r.c},.42), rgba(${r.c},.08) 70%, transparent);` +
      `animation-delay:${(-rnd() * 4).toFixed(2)}s;`;
    world.appendChild(el);
  }

  /* ───────── steam vents ───────── */
  const steam = document.querySelectorAll(".steam i");
  const VENTS = [
    { sx: "38%", sb: "30%", st: "6.5s", sl: "0s" },
    { sx: "41%", sb: "28%", st: "8s", sl: "-3s" },
    { sx: "62%", sb: "22%", st: "7s", sl: "-1.5s" },
    { sx: "65%", sb: "24%", st: "9s", sl: "-5s" },
    { sx: "40%", sb: "29%", st: "7.5s", sl: "-6s" },
  ];
  steam.forEach((el, i) => {
    const v = VENTS[i % VENTS.length];
    el.style.setProperty("--sx", v.sx);
    el.style.setProperty("--sb", v.sb);
    el.style.setProperty("--st", v.st);
    el.style.setProperty("--sl", v.sl);
  });

  /* ───────── directory entrance — cards ignite in on scroll, staggered ───────── */
  const cards = [...document.querySelectorAll(".card")];
  if (cards.length) {
    if (REDUCED) {
      cards.forEach((c) => c.classList.add("in"));
    } else {
      const entryIO = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (!en.isIntersecting) continue;
            const i = cards.indexOf(en.target);
            en.target.style.transitionDelay = (i % 3) * 0.1 + "s";
            en.target.classList.add("in");
            entryIO.unobserve(en.target);
          }
        },
        { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
      );
      cards.forEach((c) => entryIO.observe(c));
    }
  }

  /* ───────── ambient ignite — one stall wakes at a time ───────── */
  if (cards.length && !REDUCED) {
    const order = [2, 4, 0, 5, 1, 3];
    let ci = 0;
    let dirVisible = false;
    new IntersectionObserver(
      (entries) => { dirVisible = entries[0].isIntersecting; },
      { threshold: 0.15 }
    ).observe(document.getElementById("directory"));
    setInterval(() => {
      if (document.hidden || !dirVisible) return;
      if (cards.some((c) => c.matches(":hover"))) return; // hands off while the visitor browses
      cards.forEach((c) => c.classList.remove("lit"));
      cards[order[ci++ % order.length]].classList.add("lit");
    }, 3600);
  }

  /* ───────── LED ticker ───────── */
  const TICK =
    "本夜市 OPEN TILL LAST TRAIN ◈ RAIN EXPECTED · RAIN DELIVERED ◈ " +
    "LOST: ONE WHITE CAT · ANSWERS TO 貓貓 · REWARD: SOUP ◈ " +
    "BLUE ORCHID: LIVE BAND CANCELLED · JUKEBOX FORGIVEN ◈ " +
    "OK電器 BUYS DEAD BATTERIES AND OLD REGRETS ◈ " +
    "MADAME SEVEN PREDICTS: WET ◈ 小心地滑 MIND THE WET FLOOR ◈ ";
  const ta = document.getElementById("tick-a");
  const tb = document.getElementById("tick-b");
  ta.textContent = TICK;
  tb.textContent = TICK;

  /* ───────── rain canvas ───────── */
  const canvas = document.getElementById("rain");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  let drops = [], splashes = [];

  function sizeRain() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = hero.clientWidth;
    H = hero.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = W < 720 ? 85 : 190;
    drops = Array.from({ length: n }, () => newDrop(true));
  }

  function newDrop(anywhere) {
    const deep = Math.random();
    return {
      x: Math.random() * (W + 200) - 100,
      y: anywhere ? Math.random() * H : -30 - Math.random() * 120,
      len: 9 + deep * 18,
      spd: 10 + deep * 15,
      a: 0.14 + deep * 0.3,
      lw: 0.9 + deep * 0.7,
      floor: H * (0.62 + Math.random() * 0.36),
    };
  }

  const SLANT = 0.18; // px of x-drift per px of fall

  function drawRain() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    for (const d of drops) {
      ctx.strokeStyle = `rgba(180,208,255,${d.a})`;
      ctx.lineWidth = d.lw;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * SLANT, d.y - d.len);
      ctx.stroke();
      d.y += d.spd;
      d.x += d.spd * SLANT;
      if (d.y >= d.floor) {
        if (splashes.length < 56 && Math.random() < 0.68)
          splashes.push({ x: d.x, y: d.floor, r: 1, a: 0.44 });
        Object.assign(d, newDrop(false));
      }
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      ctx.strokeStyle = `rgba(190,215,255,${s.a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r * 2.4, s.r * 0.8, 0, 0, Math.PI * 2);
      ctx.stroke();
      s.r += 1.15;
      s.a -= 0.055;
      if (s.a <= 0) splashes.splice(i, 1);
    }
  }

  function staticRain() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    for (const d of drops) {
      ctx.strokeStyle = `rgba(170,200,255,${d.a * 0.6})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * SLANT, d.y - d.len);
      ctx.stroke();
    }
  }

  /* ───────── custom cursor — a neon dot that trails the pointer ───────── */
  const finePointer = matchMedia("(hover:hover) and (pointer:fine)").matches;
  const cursorGlow = document.getElementById("cursorGlow");
  let mx = innerWidth / 2, my = innerHeight / 2, curX = mx, curY = my;
  if (finePointer && !REDUCED) {
    hero.classList.add("has-cursor");
    hero.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      cursorGlow.style.opacity = "1";
    });
    hero.addEventListener("pointerleave", () => { cursorGlow.style.opacity = "0"; });
    hero.addEventListener("pointerenter", (e) => { curX = mx = e.clientX; curY = my = e.clientY; });
    document.querySelectorAll(".mast-cta").forEach((el) => {
      el.addEventListener("pointerenter", () => cursorGlow.classList.add("cta"));
      el.addEventListener("pointerleave", () => cursorGlow.classList.remove("cta"));
    });
  }

  /* ───────── camera: cursor parallax + ambient drift + scroll dolly ───────── */
  let tx = 0, ty = 0, cx = 0, cy = 0;   // target / current cursor influence
  let heroVisible = true;
  let scrollP = 0;                     // 0→1 as the hero scrolls out of frame

  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX / r.width - 0.5) * 2;   // -1..1
    ty = (e.clientY / r.height - 0.5) * 2;
  });
  hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; });

  new IntersectionObserver(
    (entries) => { heroVisible = entries[0].isIntersecting; },
    { threshold: 0.02 }
  ).observe(hero);

  addEventListener("scroll", () => {
    const span = Math.max(1, hero.offsetHeight * 0.82);
    scrollP = Math.min(1, Math.max(0, scrollY / span));
  }, { passive: true });

  const scaleOf = () =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
  let scale = 1;
  const masthead = document.querySelector(".masthead");
  const tickerEl = document.querySelector(".ticker");

  function frame(t) {
    requestAnimationFrame(frame);
    if (document.hidden || !heroVisible) return;
    const s = t / 1000;
    cx += (tx - cx) * 0.045;
    cy += (ty - cy) * 0.045;
    curX += (mx - curX) * 0.14;
    curY += (my - curY) * 0.14;
    const ax = Math.sin(s * 0.21) * 1.7;          // ambient degrees — deliberately visible
    const az = Math.cos(s * 0.13) * 2.1;
    const dx = Math.sin(s * 0.09) * 20;           // ambient drift px
    const dolly = 1 + scrollP * 0.16;             // the street pulls closer as you scroll in
    world.style.transform =
      `rotateX(${60 + ax + cy * 1.6}deg) rotateZ(${-45 + az + cx * 1.8}deg) scale(${scale * dolly})`;
    rig.style.transform =
      `translate3d(${dx - cx * 26}px,${Math.cos(s * 0.11) * 10 - cy * 18 - scrollP * 90}px,0)`;
    if (masthead) {
      masthead.style.opacity = String(Math.max(0, 1 - scrollP * 1.7));
      masthead.style.transform = `translateY(${-scrollP * 52}px)`;
    }
    if (tickerEl) tickerEl.style.opacity = String(Math.max(0, 1 - scrollP * 2.4));
    if (finePointer) {
      cursorGlow.style.transform = `translate3d(${curX}px,${curY}px,0)`;
    }
    drawRain();
  }

  function boot() {
    scale = scaleOf();
    sizeRain();
    if (REDUCED) {
      staticRain();
      world.style.transform = `rotateX(60deg) rotateZ(-45deg) scale(${scale})`;
      return;
    }
    requestAnimationFrame(frame);
  }

  let rszT;
  addEventListener("resize", () => {
    clearTimeout(rszT);
    rszT = setTimeout(() => {
      scale = scaleOf();
      sizeRain();
      if (REDUCED) staticRain();
    }, 160);
  });

  boot();
})();
