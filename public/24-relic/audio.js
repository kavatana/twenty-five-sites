/* ============================================================
   RELIC — audio.js
   Six extinct machine sounds, synthesized live from oscillators
   and filtered noise. No samples, no recordings, ever.
   ============================================================ */
'use strict';

let noiseBufferCache = null;
function getNoiseBuffer(ctx){
  if (noiseBufferCache && noiseBufferCache.sampleRate === ctx.sampleRate) return noiseBufferCache;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noiseBufferCache = buf;
  return buf;
}

/* a short filtered noise transient — clicks, clacks, thunks */
function noiseBurst(ctx, out, tAbs, { dur = 0.02, freq = 1200, q = 2, type = 'bandpass', gain = 0.5 } = {}){
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const filt = ctx.createBiquadFilter();
  filt.type = type; filt.frequency.value = freq; filt.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, tAbs);
  g.gain.linearRampToValueAtTime(gain, tAbs + Math.min(0.004, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, tAbs + dur);
  src.connect(filt); filt.connect(g); g.connect(out);
  src.start(tAbs); src.stop(tAbs + dur + 0.02);
}

/* a filtered noise sweep — sliding carriage, projector whine bed */
function noiseSweep(ctx, out, tAbs, { dur = 0.3, f0 = 3000, f1 = 400, q = 3, gain = 0.4, loop = false } = {}){
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  src.loop = loop;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass'; filt.Q.value = q;
  filt.frequency.setValueAtTime(f0, tAbs);
  filt.frequency.linearRampToValueAtTime(f1, tAbs + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, tAbs);
  g.gain.linearRampToValueAtTime(gain, tAbs + dur * 0.18);
  g.gain.linearRampToValueAtTime(0.0001, tAbs + dur);
  src.connect(filt); filt.connect(g); g.connect(out);
  src.start(tAbs); src.stop(tAbs + dur + 0.03);
  return { src, g };
}

/* a tone burst — bells, beeps, hums */
function tone(ctx, out, tAbs, { freq = 440, freqEnd = null, dur = 0.2, type = 'sine', gain = 0.3, attack = 0.006, curve = 'exp' } = {}){
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, tAbs);
  if (freqEnd !== null){
    if (curve === 'exp' && freq > 0 && freqEnd > 0) osc.frequency.exponentialRampToValueAtTime(freqEnd, tAbs + dur);
    else osc.frequency.linearRampToValueAtTime(freqEnd, tAbs + dur);
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, tAbs);
  g.gain.linearRampToValueAtTime(gain, tAbs + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, tAbs + dur);
  osc.connect(g); g.connect(out);
  osc.start(tAbs); osc.stop(tAbs + dur + 0.03);
  return osc;
}

/* a sustained tone with its own gain node, caller controls the envelope */
function sustainedTone(ctx, out, tAbs, { freq = 60, type = 'sine' } = {}){
  const osc = ctx.createOscillator();
  osc.type = type; osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = 0;
  osc.connect(g); g.connect(out);
  osc.start(tAbs);
  return { osc, g };
}

const rand = (a, b) => a + Math.random() * (b - a);

/* ---------------------------------------------------------
   1. ROTARY DIAL — decelerating filtered-noise clicks
--------------------------------------------------------- */
function playRotary(ctx, out){
  const t0 = ctx.currentTime + 0.03;
  const events = [];

  function pull(startRel, count){
    let rel = startRel;
    let interval = 0.066;
    for (let i = 0; i < count; i++){
      noiseBurst(ctx, out, t0 + rel, { dur: 0.015, freq: 1500, q: 2.4, gain: 0.5 });
      events.push({ t: rel, type: 'click' });
      rel += interval;
      interval *= 1.09;
    }
    tone(ctx, out, t0 + rel + 0.01, { freq: 115, freqEnd: 60, dur: 0.09, type: 'triangle', gain: 0.3 });
    noiseBurst(ctx, out, t0 + rel + 0.01, { dur: 0.05, freq: 260, q: 1, gain: 0.22 });
    events.push({ t: rel + 0.01, type: 'thunk' });
    return rel + 0.14;
  }

  let rel = pull(0, 7);
  rel += 0.4;
  rel = pull(rel, 10);
  return { duration: rel + 0.2, events };
}

/* ---------------------------------------------------------
   2. TYPEWRITER + CARRIAGE BELL
--------------------------------------------------------- */
function playTypewriter(ctx, out){
  const t0 = ctx.currentTime + 0.03;
  const events = [];
  let rel = 0;
  const keys = 9;
  for (let i = 0; i < keys; i++){
    noiseBurst(ctx, out, t0 + rel, { dur: 0.024, freq: rand(2600, 3600), q: 1.6, gain: 0.42 });
    tone(ctx, out, t0 + rel, { freq: rand(1500, 2000), dur: 0.012, type: 'square', gain: 0.06, attack: 0.001 });
    events.push({ t: rel, type: 'key', key: i % 7 });
    rel += rand(0.085, 0.15);
  }
  rel += 0.16;
  tone(ctx, out, t0 + rel, { freq: 2500, dur: 0.3, type: 'sine', gain: 0.28, attack: 0.002 });
  tone(ctx, out, t0 + rel, { freq: 4900, dur: 0.2, type: 'sine', gain: 0.08, attack: 0.002 });
  events.push({ t: rel, type: 'bell' });
  rel += 0.2;
  noiseSweep(ctx, out, t0 + rel, { dur: 0.34, f0: 3200, f1: 350, q: 2.2, gain: 0.32 });
  events.push({ t: rel, type: 'carriage', dur: 0.34 });
  rel += 0.34;
  return { duration: rel + 0.25, events };
}

/* ---------------------------------------------------------
   3. DIAL-UP MODEM — the full chirp choreography, abridged 6s
--------------------------------------------------------- */
function playModem(ctx, out){
  const t0 = ctx.currentTime + 0.03;
  const events = [];

  // stage 1 — dial tone (0.00–0.30)
  tone(ctx, out, t0 + 0.0, { freq: 350, dur: 0.3, type: 'sine', gain: 0.14, attack: 0.02 });
  tone(ctx, out, t0 + 0.0, { freq: 440, dur: 0.3, type: 'sine', gain: 0.14, attack: 0.02 });

  // stage 2 — DTMF-ish dial blips (0.34–0.6)
  for (let i = 0; i < 4; i++){
    const t = 0.34 + i * 0.065;
    tone(ctx, out, t0 + t, { freq: rand(620, 950), dur: 0.045, type: 'sine', gain: 0.18, attack: 0.002 });
    tone(ctx, out, t0 + t, { freq: rand(1200, 1450), dur: 0.045, type: 'sine', gain: 0.14, attack: 0.002 });
    events.push({ t, type: 'led', i: 0 });
  }

  // stage 3 — answer tone, the classic steady 2100Hz (0.75–1.35)
  tone(ctx, out, t0 + 0.75, { freq: 2100, dur: 0.6, type: 'sine', gain: 0.22, attack: 0.03 });
  events.push({ t: 0.75, type: 'led', i: 1 });

  // stage 4 — negotiation chirps (1.5–3.4)
  let t = 1.5;
  let i2 = 0;
  while (t < 3.4){
    const f0 = rand(900, 1400);
    const f1 = rand(1800, 2900);
    const dur = rand(0.09, 0.16);
    const flip = Math.random() > 0.5;
    tone(ctx, out, t0 + t, { freq: flip ? f0 : f1, freqEnd: flip ? f1 : f0, dur, type: 'sine', gain: 0.2, attack: 0.004, curve: 'linear' });
    if (Math.random() > 0.55) noiseBurst(ctx, out, t0 + t + dur * 0.4, { dur: 0.03, freq: rand(1500, 3200), q: 1.4, gain: 0.16 });
    events.push({ t, type: 'led', i: 2 + (i2++ % 3) });
    t += dur + rand(0.01, 0.05);
  }

  // stage 5 — training burst, denser + wider (3.4–5.0)
  while (t < 5.0){
    const f0 = rand(500, 3200);
    const f1 = rand(500, 3200);
    const dur = rand(0.045, 0.09);
    tone(ctx, out, t0 + t, { freq: f0, freqEnd: f1, dur, type: Math.random() > 0.7 ? 'sawtooth' : 'sine', gain: 0.15, attack: 0.002, curve: 'linear' });
    events.push({ t, type: 'led', i: (i2++) % 5 });
    t += dur * 0.7;
  }
  noiseBurst(ctx, out, t0 + 3.42, { dur: 0.14, freq: 2200, q: 0.9, gain: 0.22 });

  // stage 6 — connected carrier hum, then fade (5.0–6.0)
  const c1 = sustainedTone(ctx, out, t0 + 5.0, { freq: 1200, type: 'sine' });
  const c2 = sustainedTone(ctx, out, t0 + 5.0, { freq: 2400, type: 'sine' });
  c1.g.gain.setValueAtTime(0, t0 + 5.0);
  c1.g.gain.linearRampToValueAtTime(0.16, t0 + 5.08);
  c1.g.gain.setValueAtTime(0.16, t0 + 5.7);
  c1.g.gain.linearRampToValueAtTime(0.0001, t0 + 6.0);
  c2.g.gain.setValueAtTime(0, t0 + 5.0);
  c2.g.gain.linearRampToValueAtTime(0.1, t0 + 5.08);
  c2.g.gain.setValueAtTime(0.1, t0 + 5.7);
  c2.g.gain.linearRampToValueAtTime(0.0001, t0 + 6.0);
  c1.osc.stop(t0 + 6.05); c2.osc.stop(t0 + 6.05);
  events.push({ t: 5.0, type: 'led', i: 4, hold: 1.0 });

  return { duration: 6.05, events };
}

/* ---------------------------------------------------------
   4. CATHODE-RAY DEGAUSS + HUM
--------------------------------------------------------- */
function playDegauss(ctx, out){
  const t0 = ctx.currentTime + 0.03;
  const events = [];

  tone(ctx, out, t0, { freq: 100, freqEnd: 40, dur: 0.11, type: 'sine', gain: 0.55, attack: 0.003 });
  tone(ctx, out, t0, { freq: 200, freqEnd: 80, dur: 0.08, type: 'square', gain: 0.12, attack: 0.002 });
  noiseBurst(ctx, out, t0, { dur: 0.06, freq: 220, q: 0.8, gain: 0.3 });
  events.push({ t: 0, type: 'flash' });

  tone(ctx, out, t0 + 0.13, { freq: 70, freqEnd: 35, dur: 0.07, type: 'sine', gain: 0.24, attack: 0.002 });
  events.push({ t: 0.13, type: 'flash' });

  const h1 = sustainedTone(ctx, out, t0 + 0.22, { freq: 60, type: 'sine' });
  const h2 = sustainedTone(ctx, out, t0 + 0.22, { freq: 120, type: 'triangle' });
  h1.g.gain.setValueAtTime(0, t0 + 0.22);
  h1.g.gain.linearRampToValueAtTime(0.06, t0 + 0.4);
  h1.g.gain.setValueAtTime(0.06, t0 + 2.4);
  h1.g.gain.linearRampToValueAtTime(0.0001, t0 + 2.85);
  h2.g.gain.setValueAtTime(0, t0 + 0.22);
  h2.g.gain.linearRampToValueAtTime(0.03, t0 + 0.4);
  h2.g.gain.setValueAtTime(0.03, t0 + 2.4);
  h2.g.gain.linearRampToValueAtTime(0.0001, t0 + 2.85);
  h1.osc.stop(t0 + 2.9); h2.osc.stop(t0 + 2.9);
  events.push({ t: 0.22, type: 'hum-on', hold: 2.6 });

  return { duration: 2.9, events };
}

/* ---------------------------------------------------------
   5. FILM PROJECTOR FLUTTER
--------------------------------------------------------- */
function playProjector(ctx, out){
  const t0 = ctx.currentTime + 0.03;
  const events = [];
  const total = 4.2;

  const whine = sustainedTone(ctx, out, t0, { freq: 132, type: 'sawtooth' });
  const whineFilt = ctx.createBiquadFilter();
  whineFilt.type = 'lowpass'; whineFilt.frequency.value = 500;
  whine.osc.disconnect(); whine.osc.connect(whineFilt); whineFilt.connect(whine.g);
  whine.g.gain.setValueAtTime(0, t0);
  whine.g.gain.linearRampToValueAtTime(0.05, t0 + 0.25);
  whine.g.gain.setValueAtTime(0.05, t0 + total - 0.3);
  whine.g.gain.linearRampToValueAtTime(0.0001, t0 + total);
  whine.osc.frequency.setValueAtTime(132, t0);
  for (let i = 0; i < 8; i++) whine.osc.frequency.setTargetAtTime(rand(126, 138), t0 + i * 0.5, 0.2);
  whine.osc.stop(t0 + total + 0.05);

  let rel = 0.05;
  const interval = 1 / 24;
  let gainEnv = 0;
  while (rel < total - 0.1){
    gainEnv = rel < 0.3 ? (rel / 0.3) : (rel > total - 0.4 ? Math.max(0, (total - 0.1 - rel) / 0.3) : 1);
    noiseBurst(ctx, out, t0 + rel, { dur: 0.018, freq: rand(700, 1400), q: 1.8, gain: 0.22 * gainEnv * rand(0.75, 1.1) });
    rel += interval;
  }
  events.push({ t: 0, type: 'reel-on', hold: total });

  return { duration: total + 0.15, events };
}

/* ---------------------------------------------------------
   6. TELEGRAPH — 'SOS' in Morse
--------------------------------------------------------- */
function playTelegraph(ctx, out){
  const t0 = ctx.currentTime + 0.03;
  const events = [];
  const d = 0.1;
  // [tone-units, gap-units-after] — standard Morse timing (dot=1, dash=3, gap=1, letter-gap=3)
  const seq = [
    [1, 1], [1, 1], [1, 3],     // S: . . .   (letter gap after)
    [3, 1], [3, 1], [3, 3],     // O: - - -   (letter gap after)
    [1, 1], [1, 1], [1, 0],     // S: . . .   (no trailing gap)
  ];
  let rel = 0;
  for (const [toneUnits, gapUnits] of seq){
    tone(ctx, out, t0 + rel, { freq: 620, dur: toneUnits * d * 0.92, type: 'sine', gain: 0.4, attack: 0.004 });
    events.push({ t: rel, type: 'press', dur: toneUnits * d });
    rel += toneUnits * d + gapUnits * d;
  }
  return { duration: rel + 0.25, events };
}

/* ---------------------------------------------------------
   public API
--------------------------------------------------------- */
export const EXHIBITS = {
  rotary: playRotary,
  typewriter: playTypewriter,
  modem: playModem,
  degauss: playDegauss,
  projector: playProjector,
  telegraph: playTelegraph,
};
