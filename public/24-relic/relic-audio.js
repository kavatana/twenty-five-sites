/* RELIC — Museum of Vanished Sounds
   relic-audio.js — every exhibit is synthesized live from oscillators and
   filtered noise. No samples, no recordings, no <audio> tags anywhere. */
'use strict';

(function () {

  /* ---------- low-level helpers ---------- */

  function makeNoiseBuffer(ctx) {
    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // a short filtered noise burst — clicks, thunks, static, flutter
  function burst(ctx, out, sources, opts) {
    const {
      t, dur = 0.03, ftype = 'bandpass', freq = 1500, Q = 2,
      peak = 0.3, attack = 0.002, decay = 0.05
    } = opts;
    const src = ctx.createBufferSource();
    src.buffer = ctx._relicNoise;
    const filt = ctx.createBiquadFilter();
    filt.type = ftype; filt.frequency.value = Math.max(20, freq); filt.Q.value = Q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    src.connect(filt); filt.connect(g); g.connect(out);
    const playLen = attack + decay + 0.03;
    const offset = Math.random() * Math.max(0.01, src.buffer.duration - playLen - 0.05);
    src.start(t, offset, playLen);
    sources.push(src);
    return src;
  }

  // a short synthesized tone — beeps, bells, hums
  function tone(ctx, out, sources, opts) {
    const {
      t, dur = 0.12, freq = 440, freqEnd = null, type = 'sine',
      peak = 0.22, attack = 0.006, rel = 0.05
    } = opts;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), t);
    if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dur);
    const g = ctx.createGain();
    const holdAt = Math.max(t + attack, t + dur - rel);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, holdAt);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + dur + 0.03);
    sources.push(osc);
    return osc;
  }

  // amplitude-modulated oscillator — degauss wobble, modem warble
  function amOsc(ctx, out, sources, opts) {
    const { t, dur, freqStart, freqEnd, lfoStart, lfoEnd, oscType = 'sawtooth', peakStart = 0.2, peakEnd = 0.05 } = opts;
    const osc = ctx.createOscillator(); osc.type = oscType;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dur);
    const lfo = ctx.createOscillator(); lfo.type = 'sine';
    lfo.frequency.setValueAtTime(lfoStart, t);
    lfo.frequency.exponentialRampToValueAtTime(Math.max(1, lfoEnd), t + dur);
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.5;
    const amGain = ctx.createGain(); amGain.gain.value = 0.5;
    lfo.connect(lfoGain); lfoGain.connect(amGain.gain);
    const env = ctx.createGain();
    env.gain.setValueAtTime(peakStart, t);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakEnd), t + dur);
    osc.connect(amGain); amGain.connect(env); env.connect(out);
    osc.start(t); osc.stop(t + dur + 0.05);
    lfo.start(t); lfo.stop(t + dur + 0.05);
    sources.push(osc, lfo);
  }

  /* ---------- exhibit 1 : rotary dial ---------- */
  // A dial pulled, released, and ratcheting back — clicks decelerating
  // as the mainspring runs out of urgency.
  function genRotary(ctx, out, sources, t0) {
    const events = [];
    let t = t0 + 0.08;
    burst(ctx, out, sources, { t, ftype: 'lowpass', freq: 220, Q: 0.7, peak: 0.45, attack: 0.001, decay: 0.05 });
    events.push({ t: t - t0, type: 'release' });
    t += 0.14;
    let gap = 0.082;
    const n = 9;
    for (let i = 0; i < n; i++) {
      burst(ctx, out, sources, { t, dur: 0.018, ftype: 'bandpass', freq: 1850 + Math.random() * 250, Q: 3.4, peak: 0.32, attack: 0.001, decay: 0.02 });
      burst(ctx, out, sources, { t, dur: 0.02, ftype: 'lowpass', freq: 260, Q: 0.8, peak: 0.15, attack: 0.001, decay: 0.03 });
      events.push({ t: t - t0, type: 'click', i, n });
      t += gap;
      gap *= 1.15;
    }
    burst(ctx, out, sources, { t, dur: 0.04, ftype: 'lowpass', freq: 170, Q: 0.6, peak: 0.28, attack: 0.001, decay: 0.09 });
    events.push({ t: t - t0, type: 'settle' });
    return { duration: (t + 0.35) - t0, events };
  }

  /* ---------- exhibit 2 : typewriter + carriage bell ---------- */
  function genTypewriter(ctx, out, sources, t0) {
    const events = [];
    let t = t0 + 0.06;
    const nKeys = 12;
    for (let i = 0; i < nKeys; i++) {
      burst(ctx, out, sources, { t, dur: 0.01, ftype: 'highpass', freq: 2500 + Math.random() * 1000, Q: 1.1, peak: 0.27, attack: 0.001, decay: 0.015 });
      burst(ctx, out, sources, { t, dur: 0.02, ftype: 'lowpass', freq: 190 + Math.random() * 90, Q: 0.9, peak: 0.2, attack: 0.001, decay: 0.03 });
      events.push({ t: t - t0, type: 'key', i, n: nKeys });
      t += 0.082 + Math.random() * 0.07;
    }
    t += 0.14;
    const zipT = t;
    const src = ctx.createBufferSource();
    src.buffer = ctx._relicNoise;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.Q.value = 6;
    filt.frequency.setValueAtTime(3200, zipT);
    filt.frequency.exponentialRampToValueAtTime(650, zipT + 0.32);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, zipT);
    g.gain.linearRampToValueAtTime(0.22, zipT + 0.03);
    g.gain.linearRampToValueAtTime(0.0001, zipT + 0.34);
    src.connect(filt); filt.connect(g); g.connect(out);
    src.start(zipT, 0, 0.4);
    sources.push(src);
    events.push({ t: zipT - t0, type: 'zip' });
    t += 0.36;
    tone(ctx, out, sources, { t, dur: 0.5, freq: 2450, type: 'triangle', peak: 0.22, attack: 0.002, rel: 0.42 });
    tone(ctx, out, sources, { t, dur: 0.4, freq: 3600, type: 'sine', peak: 0.07, attack: 0.002, rel: 0.32 });
    events.push({ t: t - t0, type: 'bell' });
    t += 0.55;
    return { duration: t - t0, events };
  }

  /* ---------- exhibit 3 : dial-up modem handshake (abridged 6s) ---------- */
  function genModem(ctx, out, sources, t0) {
    const events = [];
    let t = t0 + 0.05;
    events.push({ t: t - t0, type: 'status', label: 'Dialing' });
    const dtmf = [[697, 1209], [770, 1336], [852, 1477], [697, 1336]];
    for (const [f1, f2] of dtmf) {
      tone(ctx, out, sources, { t, dur: 0.09, freq: f1, type: 'sine', peak: 0.12, attack: 0.003, rel: 0.02 });
      tone(ctx, out, sources, { t, dur: 0.09, freq: f2, type: 'sine', peak: 0.1, attack: 0.003, rel: 0.02 });
      events.push({ t: t - t0, type: 'blip' });
      t += 0.13;
    }
    t += 0.3;
    events.push({ t: t - t0, type: 'status', label: 'Ringing' });
    t += 0.28;
    events.push({ t: t - t0, type: 'status', label: 'Handshaking' });
    tone(ctx, out, sources, { t, dur: 0.55, freq: 1400, type: 'sine', peak: 0.17, attack: 0.05, rel: 0.06 });
    events.push({ t: t - t0, type: 'carrier' });
    t += 0.6;
    const ansT = t, ansDur = 0.5;
    amOsc(ctx, out, sources, { t: ansT, dur: ansDur, freqStart: 2100, freqEnd: 2100, lfoStart: 18, lfoEnd: 18, oscType: 'sine', peakStart: 0.18, peakEnd: 0.16 });
    events.push({ t: ansT - t0, type: 'ansam' });
    t += ansDur + 0.05;
    events.push({ t: t - t0, type: 'status', label: 'Negotiating' });
    const sweeps = [[900, 2600, 0.26], [2500, 850, 0.22], [1000, 2400, 0.22], [2300, 750, 0.2]];
    for (const [f1, f2, d] of sweeps) {
      const osc2 = ctx.createOscillator(); osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(f1, t);
      osc2.frequency.exponentialRampToValueAtTime(f2, t + d);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0, t);
      g2.gain.linearRampToValueAtTime(0.1, t + 0.02);
      g2.gain.linearRampToValueAtTime(0.0001, t + d);
      osc2.connect(g2); g2.connect(out);
      osc2.start(t); osc2.stop(t + d + 0.02);
      sources.push(osc2);
      burst(ctx, out, sources, { t: t + d * 0.3, dur: d * 0.45, ftype: 'bandpass', freq: (f1 + f2) / 2, Q: 1.4, peak: 0.14, attack: 0.005, decay: d * 0.35 });
      events.push({ t: t - t0, type: 'sweep' });
      t += d + 0.03;
    }
    events.push({ t: t - t0, type: 'status', label: 'Synchronizing' });
    const staccatoEnd = t0 + 5.55;
    while (t < staccatoEnd) {
      const f = 900 + Math.random() * 1800;
      tone(ctx, out, sources, { t, dur: 0.045, freq: f, type: Math.random() < 0.5 ? 'square' : 'sine', peak: 0.08, attack: 0.002, rel: 0.02 });
      events.push({ t: t - t0, type: 'blip' });
      t += 0.04 + Math.random() * 0.045;
    }
    events.push({ t: t - t0, type: 'status', label: 'Connected' });
    burst(ctx, out, sources, { t, dur: 0.3, ftype: 'lowpass', freq: 1200, Q: 0.7, peak: 0.05, attack: 0.05, decay: 0.28 });
    t += 0.35;
    return { duration: Math.max(t - t0, 5.9), events };
  }

  /* ---------- exhibit 4 : cathode-ray degauss thunk + hum ---------- */
  function genDegauss(ctx, out, sources, t0) {
    const events = [];
    const t = t0 + 0.06;
    tone(ctx, out, sources, { t, dur: 0.14, freq: 68, type: 'sine', peak: 0.48, attack: 0.001, rel: 0.12 });
    burst(ctx, out, sources, { t, dur: 0.03, ftype: 'lowpass', freq: 380, Q: 0.6, peak: 0.32, attack: 0.001, decay: 0.04 });
    events.push({ t: t - t0, type: 'thunk' });
    const wobT = t + 0.03, wobDur = 1.05;
    amOsc(ctx, out, sources, { t: wobT, dur: wobDur, freqStart: 190, freqEnd: 56, lfoStart: 38, lfoEnd: 6, oscType: 'sawtooth', peakStart: 0.22, peakEnd: 0.05 });
    events.push({ t: wobT - t0, type: 'wobble' });
    const humT = wobT + wobDur * 0.7, humDur = 0.85;
    tone(ctx, out, sources, { t: humT, dur: humDur, freq: 60, type: 'sine', peak: 0.075, attack: 0.16, rel: 0.32 });
    tone(ctx, out, sources, { t: humT, dur: humDur, freq: 120, type: 'sine', peak: 0.025, attack: 0.16, rel: 0.32 });
    events.push({ t: humT - t0, type: 'hum' });
    return { duration: (humT + humDur) - t0, events };
  }

  /* ---------- exhibit 5 : film projector flutter ---------- */
  function genProjector(ctx, out, sources, t0) {
    const events = [];
    let t = t0 + 0.06;
    const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 92;
    const humFilt = ctx.createBiquadFilter(); humFilt.type = 'lowpass'; humFilt.frequency.value = 260; humFilt.Q.value = 0.7;
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0, t);
    humGain.gain.linearRampToValueAtTime(0.085, t + 0.15);
    hum.connect(humFilt); humFilt.connect(humGain); humGain.connect(out);
    hum.start(t);
    sources.push(hum);
    events.push({ t: t - t0, type: 'start' });
    t += 0.2;
    const rate = 12.5;
    const runEnd = t + 2.4;
    let ft = t;
    while (ft < runEnd) {
      burst(ctx, out, sources, { t: ft, dur: 0.013, ftype: 'bandpass', freq: 1500 + Math.random() * 500, Q: 2.4, peak: 0.13 + Math.random() * 0.05, attack: 0.001, decay: 0.017 });
      events.push({ t: ft - t0, type: 'flutter' });
      ft += (1 / rate) * (0.88 + Math.random() * 0.24);
    }
    t = ft;
    let gap = 1 / rate;
    for (let i = 0; i < 6; i++) {
      burst(ctx, out, sources, { t, dur: 0.02, ftype: 'bandpass', freq: 1300, Q: 2, peak: 0.15, attack: 0.001, decay: 0.03 });
      events.push({ t: t - t0, type: 'flutter' });
      gap *= 1.3;
      t += gap;
    }
    humGain.gain.linearRampToValueAtTime(0.0001, t + 0.1);
    hum.stop(t + 0.15);
    events.push({ t: t - t0, type: 'stop' });
    return { duration: (t + 0.25) - t0, events };
  }

  /* ---------- exhibit 6 : telegraph sounder, SOS ---------- */
  // A real sounder does not sing a tone — it clacks down, then clacks up.
  // A dot is a short silence between two clacks; a dash is a long one.
  function genTelegraph(ctx, out, sources, t0) {
    const events = [];
    const unit = 0.11;
    let t = t0 + 0.15;
    function clack(tt, down) {
      burst(ctx, out, sources, { t: tt, dur: 0.01, ftype: 'bandpass', freq: down ? 2600 : 1900, Q: 5, peak: down ? 0.32 : 0.22, attack: 0.001, decay: 0.012 });
    }
    function symbol(isDash) {
      const dur = isDash ? unit * 3 : unit;
      clack(t, true);
      events.push({ t: t - t0, type: 'down', dash: isDash });
      t += dur;
      clack(t, false);
      events.push({ t: t - t0, type: 'up', dash: isDash });
      t += unit;
    }
    const letters = [[0, 0, 0], [1, 1, 1], [0, 0, 0]];
    letters.forEach((letter) => {
      letter.forEach((sym) => symbol(!!sym));
      t += unit * 2;
    });
    return { duration: (t + 0.25) - t0, events };
  }

  const GEN = {
    rotary: genRotary,
    typewriter: genTypewriter,
    modem: genModem,
    degauss: genDegauss,
    projector: genProjector,
    telegraph: genTelegraph
  };

  /* ---------- controller ---------- */
  let ctx = null, master = null, analyser = null, session = null;

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.9;
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.55;
      master.connect(analyser);
      analyser.connect(ctx.destination);
      ctx._relicNoise = makeNoiseBuffer(ctx);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function stop() {
    if (!session || !ctx) return;
    const { gate, sources } = session;
    const now = ctx.currentTime;
    try {
      gate.gain.cancelScheduledValues(now);
      gate.gain.setValueAtTime(gate.gain.value, now);
      gate.gain.linearRampToValueAtTime(0.0001, now + 0.03);
    } catch (e) { /* noop */ }
    setTimeout(() => {
      sources.forEach((s) => { try { s.stop(); } catch (e) { /* already stopped */ } });
      try { gate.disconnect(); } catch (e) { /* noop */ }
    }, 45);
    session = null;
  }

  function play(id) {
    if (!GEN[id]) return null;
    ensure();
    stop();
    const gate = ctx.createGain();
    gate.gain.value = 1;
    gate.connect(master);
    const sources = [];
    const t0 = ctx.currentTime;
    const { duration, events } = GEN[id](ctx, gate, sources, t0);
    session = { gate, sources, id };
    return { duration, events };
  }

  function finish(id) {
    if (session && session.id === id) session = null;
  }

  function getAnalyser() {
    ensure();
    return analyser;
  }

  window.RelicAudio = {
    play, stop, finish, getAnalyser,
    get isPlaying() { return !!session; },
    get currentId() { return session ? session.id : null; }
  };
})();
