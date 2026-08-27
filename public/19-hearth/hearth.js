(() => {
  "use strict";

  const html = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =========================================================
     DAY / NIGHT TOGGLE
     ========================================================= */
  const timeSwitch = document.getElementById("timeSwitch");

  function relightWindows() {
    const glowers = document.querySelectorAll(".window, .lantern .lamp");
    glowers.forEach((el) => {
      const delay = (Math.random() * 0.9 + 0.02).toFixed(2);
      el.style.setProperty("--wd", delay + "s");
    });
  }

  function setTime(mode) {
    html.setAttribute("data-time", mode);
    timeSwitch.setAttribute("aria-checked", mode === "day" ? "true" : "false");
    relightWindows();
  }

  timeSwitch.addEventListener("click", () => {
    const next = html.getAttribute("data-time") === "day" ? "night" : "day";
    setTime(next);
  });

  relightWindows();

  /* =========================================================
     TOOLTIP — positioned via getBoundingClientRect, kept
     outside the 3D-transformed hierarchy so it stays flat & crisp.
     ========================================================= */
  const stage = document.getElementById("stage");
  const tooltip = document.getElementById("tooltip");
  const tooltipName = document.getElementById("tooltipName");
  const tooltipTag = document.getElementById("tooltipTag");
  const buildings = document.querySelectorAll(".building");

  function showTooltip(el) {
    const name = el.getAttribute("data-name");
    const tag = el.getAttribute("data-tag");
    if (!name) return;
    tooltipName.textContent = name;
    tooltipTag.textContent = tag ? " — " + tag : "";
    const stageRect = stage.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const x = elRect.left + elRect.width / 2 - stageRect.left;
    const y = elRect.top - stageRect.top;
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
    tooltip.classList.add("visible");
  }
  function hideTooltip() { tooltip.classList.remove("visible"); }

  buildings.forEach((b) => {
    b.addEventListener("mouseenter", () => showTooltip(b));
    b.addEventListener("mouseleave", hideTooltip);
    b.addEventListener("focus", () => showTooltip(b));
    b.addEventListener("blur", hideTooltip);
  });

  /* =========================================================
     AMBIENT PARTICLES — fireflies, birds, smoke
     Interval-driven, paused when tab hidden or reduced motion.
     ========================================================= */
  const critterLayer = document.getElementById("skyCritters");
  const smokeAnchors = document.querySelectorAll(".smoke-anchor");
  let fireflyTimer = null, birdTimer = null, smokeTimer = null;

  function spawnFirefly() {
    if (html.getAttribute("data-time") !== "night") return;
    const fly = document.createElement("span");
    fly.className = "firefly";
    const startX = 8 + Math.random() * 84;
    const startY = 30 + Math.random() * 55;
    fly.style.left = startX + "%";
    fly.style.top = startY + "%";
    const dur = 5 + Math.random() * 4;
    fly.style.animationDuration = dur + "s, " + (dur * 1.4) + "s";
    fly.style.animationDelay = (Math.random() * 2) + "s";
    critterLayer.appendChild(fly);
    setTimeout(() => fly.remove(), (dur * 1.4 + 2) * 1000);
  }

  function spawnBird() {
    if (html.getAttribute("data-time") !== "day") return;
    const bird = document.createElement("span");
    bird.className = "bird";
    bird.style.top = (8 + Math.random() * 22) + "%";
    const dur = 13 + Math.random() * 8;
    bird.style.animationDuration = dur + "s";
    critterLayer.appendChild(bird);
    setTimeout(() => bird.remove(), dur * 1000 + 200);
  }

  function spawnSmoke() {
    smokeAnchors.forEach((anchor) => {
      if (Math.random() < 0.25) return; // stagger chimneys, not all puff together
      const puff = document.createElement("span");
      puff.className = "smoke";
      puff.style.animationDuration = (4 + Math.random() * 2) + "s";
      anchor.appendChild(puff);
      setTimeout(() => puff.remove(), 7000);
    });
  }

  function startAmbient() {
    stopAmbient();
    if (reduceMotion) {
      // gentle static fallback: one visible puff/firefly/bird, no continuous spawning
      spawnSmoke();
      return;
    }
    fireflyTimer = setInterval(spawnFirefly, 900);
    birdTimer = setInterval(spawnBird, 4200);
    smokeTimer = setInterval(spawnSmoke, 2600);
    spawnSmoke();
    spawnBird();
  }
  function stopAmbient() {
    clearInterval(fireflyTimer); clearInterval(birdTimer); clearInterval(smokeTimer);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAmbient();
    else startAmbient();
  });

  startAmbient();

  /* =========================================================
     SUBTLE PARALLAX — pointer-driven tilt on the scene, purely
     decorative, disabled for touch & reduced motion.
     ========================================================= */
  const scene = document.getElementById("scene");
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (canHover && !reduceMotion && scene) {
    let targetX = 0, targetY = 0, curX = 0, curY = 0, raf = null;
    stage.addEventListener("mousemove", (e) => {
      const r = stage.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width - 0.5) * 4;
      targetY = ((e.clientY - r.top) / r.height - 0.5) * 3;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    stage.addEventListener("mouseleave", () => { targetX = 0; targetY = 0; if (!raf) raf = requestAnimationFrame(tick); });
    function tick() {
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;
      scene.style.transform = `rotateX(${58 - curY}deg) rotateZ(${-45 + curX}deg)`;
      if (Math.abs(targetX - curX) > 0.01 || Math.abs(targetY - curY) > 0.01) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    }
  }
})();
