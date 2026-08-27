/* RELIC — Museum of Vanished Sounds
   relic.js — gallery navigation, exhibit reactions, waveform rendering. */
'use strict';

(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)');

  const gallery = $('#gallery');
  const rooms = $$('.room', gallery);
  const floorplan = $('.floorplan');
  const fpButtons = $$('.fp-btn');
  const fpFill = $('#floorplanFill');
  const scrollHint = $('#scrollHint');
  const beginBtn = $('#beginTour');

  function isHorizontal() {
    return getComputedStyle(gallery).flexDirection !== 'column';
  }
  function goTo(id) {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', inline: 'start', block: 'start' });
  }

  /* ---------------- room activation + floor plan sync ---------------- */

  let activeId = rooms[0] ? rooms[0].id : null;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.intersectionRatio > 0.55) {
        entry.target.classList.add('is-active');
        activeId = entry.target.id;
        updateFloorplan();
      } else if (entry.intersectionRatio < 0.2) {
        entry.target.classList.remove('is-active');
      }
    });
  }, { root: gallery, threshold: [0, 0.2, 0.55, 0.8, 1] });
  rooms.forEach((r) => io.observe(r));

  function updateFloorplan() {
    fpButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.target === activeId));
    const btn = fpButtons.find((b) => b.dataset.target === activeId);
    if (btn && fpFill && floorplan) {
      const navRect = floorplan.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      fpFill.style.left = (btnRect.left - navRect.left + btnRect.width / 2) + 'px';
    }
    if (scrollHint) scrollHint.classList.toggle('is-hidden', activeId === 'room-shop');
  }

  fpButtons.forEach((b) => b.addEventListener('click', () => goTo(b.dataset.target)));
  beginBtn && beginBtn.addEventListener('click', () => goTo('room-rotary'));
  scrollHint && scrollHint.addEventListener('click', () => {
    const idx = rooms.findIndex((r) => r.id === activeId);
    const next = rooms[Math.min(idx + 1, rooms.length - 1)];
    if (next) goTo(next.id);
  });

  window.addEventListener('load', updateFloorplan);
  window.addEventListener('resize', updateFloorplan);

  /* ---------------- wheel-to-horizontal (desktop) ---------------- */

  gallery.addEventListener('wheel', (e) => {
    if (!isHorizontal()) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    gallery.scrollLeft += e.deltaY;
  }, { passive: false });

  /* ---------------- exhibit playback ---------------- */

  let activeTimers = [];
  let waveformRaf = null;
  let currentPlayingBtn = null;

  function at(ms, fn) {
    const id = setTimeout(fn, Math.max(0, ms));
    activeTimers.push(id);
  }
  function clearTimers() {
    activeTimers.forEach((id) => clearTimeout(id));
    activeTimers = [];
  }
  function bump(el, cls, holdMs) {
    if (!el) return;
    el.classList.remove(cls);
    void el.getBoundingClientRect();
    el.classList.add(cls);
    if (holdMs) setTimeout(() => el.classList.remove(cls), holdMs);
  }

  function stopCurrent() {
    window.RelicAudio && window.RelicAudio.stop();
    clearTimers();
    if (waveformRaf) { cancelAnimationFrame(waveformRaf); waveformRaf = null; }
    if (currentPlayingBtn) {
      currentPlayingBtn.classList.remove('is-playing');
      currentPlayingBtn = null;
    }
  }

  /* ---- per-exhibit reactions ---- */

  function reactRotary(room, events, duration) {
    const dial = room.querySelector('.dial-face');
    if (!dial) return;
    const releaseT = (events.find((e) => e.type === 'release') || { t: 0 }).t;
    const settleT = (events.find((e) => e.type === 'settle') || { t: duration }).t;
    dial.style.transition = 'none';
    dial.style.transform = 'rotate(-232deg)';
    if (RM.matches) { dial.style.transform = 'rotate(0deg)'; return; }
    at((releaseT + 0.05) * 1000, () => {
      dial.style.transition = `transform ${Math.max(0.3, settleT - releaseT).toFixed(2)}s var(--ease-decel)`;
      dial.style.transform = 'rotate(0deg)';
    });
  }

  function reactTypewriter(room, events, duration) {
    const carriage = room.querySelector('.carriage');
    const bell = room.querySelector('.bell');
    events.forEach((ev) => {
      if (ev.type === 'key') {
        const key = room.querySelector(`.key[data-k="${ev.i}"]`);
        at(ev.t * 1000, () => bump(key, 'is-down', 200));
      } else if (ev.type === 'zip' && !RM.matches) {
        at(ev.t * 1000, () => {
          if (!carriage) return;
          carriage.style.transition = 'none';
          carriage.style.transform = 'translateX(0)';
          void carriage.getBoundingClientRect();
          carriage.style.transition = 'transform .34s var(--ease-decel)';
          carriage.style.transform = 'translateX(-34px)';
        });
      } else if (ev.type === 'bell') {
        at(ev.t * 1000, () => bump(bell, 'is-ringing'));
      }
    });
    at(duration * 1000 + 260, () => {
      if (!carriage) return;
      carriage.style.transition = 'transform .6s var(--ease-out)';
      carriage.style.transform = 'translateX(0)';
    });
  }

  function reactModem(room, events, duration) {
    const leds = $$('.led', room);
    const status = room.querySelector('#modemStatus');
    let li = 0;
    events.forEach((ev) => {
      if (ev.type === 'status') {
        at(ev.t * 1000, () => { if (status) status.textContent = ev.label; });
      } else if (ev.type === 'blip' || ev.type === 'sweep' || ev.type === 'carrier' || ev.type === 'ansam') {
        at(ev.t * 1000, () => { bump(leds[li % leds.length], 'is-lit'); li++; });
      }
    });
    at(duration * 1000 + 400, () => { if (status) status.textContent = 'Ready'; });
  }

  function reactDegauss(room, events, duration) {
    const group = room.querySelector('.screen-group');
    if (!group) return;
    events.forEach((ev) => {
      if (ev.type === 'thunk') {
        at(ev.t * 1000, () => bump(group, 'is-flash', 220));
      } else if (ev.type === 'wobble' && !RM.matches) {
        at(ev.t * 1000, () => bump(group, 'is-wobbling', 1100));
      }
    });
  }

  function reactProjector(room, events) {
    const reels = $$('.reel', room);
    const startEv = events.find((e) => e.type === 'start');
    const stopEv = events.find((e) => e.type === 'stop');
    if (startEv && !RM.matches) {
      at(startEv.t * 1000, () => reels.forEach((r) => { r.style.transition = ''; r.style.transform = ''; r.classList.add('is-spinning'); }));
    }
    if (stopEv) {
      at(stopEv.t * 1000, () => {
        reels.forEach((r) => {
          const cs = getComputedStyle(r).transform;
          r.classList.remove('is-spinning');
          r.style.transform = (cs && cs !== 'none') ? cs : '';
        });
      });
    }
  }

  function reactTelegraph(room, events) {
    const lever = room.querySelector('.key-lever');
    const clapper = room.querySelector('.clapper-group');
    events.forEach((ev) => {
      if (ev.type === 'down') {
        at(ev.t * 1000, () => { lever && lever.classList.add('is-down'); clapper && clapper.classList.add('is-down'); });
      } else if (ev.type === 'up') {
        at(ev.t * 1000, () => { lever && lever.classList.remove('is-down'); clapper && clapper.classList.remove('is-down'); });
      }
    });
  }

  const REACTIONS = {
    rotary: reactRotary, typewriter: reactTypewriter, modem: reactModem,
    degauss: reactDegauss, projector: reactProjector, telegraph: reactTelegraph
  };

  /* ---- waveform canvas ---- */

  function sizeCanvas(canvas) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    return dpr;
  }
  function drawIdle(ctx2d, w, h) {
    ctx2d.clearRect(0, 0, w, h);
    ctx2d.beginPath();
    ctx2d.strokeStyle = 'rgba(176,141,87,.32)';
    ctx2d.lineWidth = 1;
    ctx2d.moveTo(0, h / 2);
    ctx2d.lineTo(w, h / 2);
    ctx2d.stroke();
  }
  function initWaveforms() {
    $$('.waveform').forEach((canvas) => {
      const dpr = sizeCanvas(canvas);
      drawIdle(canvas.getContext('2d'), canvas.width, canvas.height);
    });
  }
  function startWaveform(canvas, durationSec) {
    if (!canvas || !window.RelicAudio) return;
    const analyser = window.RelicAudio.getAnalyser();
    const dpr = sizeCanvas(canvas);
    const ctx2d = canvas.getContext('2d');
    const data = new Uint8Array(analyser.fftSize);
    const start = performance.now();
    const endAt = durationSec * 1000 + 150;
    function frame() {
      analyser.getByteTimeDomainData(data);
      const w = canvas.width, h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);
      ctx2d.beginPath();
      ctx2d.lineWidth = Math.max(1.3, 1.3 * dpr);
      ctx2d.strokeStyle = 'rgba(212,174,121,.92)';
      const slice = w / data.length;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128 - 1;
        const y = h / 2 + v * h * 0.42;
        if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
        x += slice;
      }
      ctx2d.stroke();
      if (performance.now() - start < endAt && document.visibilityState === 'visible') {
        waveformRaf = requestAnimationFrame(frame);
      } else {
        drawIdle(ctx2d, w, h);
      }
    }
    if (waveformRaf) cancelAnimationFrame(waveformRaf);
    waveformRaf = requestAnimationFrame(frame);
  }

  /* ---- wire up listen buttons ---- */

  $$('.listen-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.exhibit;
      if (!id || !window.RelicAudio) return;
      if (currentPlayingBtn === btn) { stopCurrent(); return; }
      stopCurrent();
      const result = window.RelicAudio.play(id);
      if (!result) return;
      const { duration, events } = result;
      btn.classList.add('is-playing');
      currentPlayingBtn = btn;
      const room = btn.closest('.room');
      if (room && REACTIONS[id]) REACTIONS[id](room, events, duration);
      if (room) startWaveform(room.querySelector('.waveform'), duration);
      at(duration * 1000 + 80, () => {
        window.RelicAudio.finish(id);
        btn.classList.remove('is-playing');
        if (currentPlayingBtn === btn) currentPlayingBtn = null;
      });
    });
  });

  /* ---- gift shop postcard tilt ---- */

  if (!RM.matches) {
    $$('.postcard').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateX(${(-py * 9).toFixed(2)}deg) rotateY(${(px * 11).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ---- init ---- */

  document.addEventListener('DOMContentLoaded', () => {
    initWaveforms();
    updateFloorplan();
  });
  window.addEventListener('resize', initWaveforms);
})();
