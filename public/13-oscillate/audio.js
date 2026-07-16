// audio.js — OSCILLATE synth engine
// Signal path per voice: OSC1 + OSC2 (detuned) -> voice gain (envelope) -> shared
// lowpass filter -> [dry] + [delay -> feedback loop -> wet] -> master -> analyser -> out.
// No samples, no libraries: everything below is WebAudio native nodes.

export class SynthEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.master = null;
    this.filter = null;
    this.delay = null;
    this.feedback = null;
    this.wet = null;
    this.dry = null;
    this.analyser = null;
    this.voices = new Map(); // id -> { osc1, osc2, gain }
    this.waveform = 'sawtooth';
    this.params = { cutoff: 2200, resonance: 4.5, detune: 9, delayMix: 0.3 };
  }

  boot() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.8;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.params.cutoff;
    filter.Q.value = this.params.resonance;

    const dry = ctx.createGain();
    const wet = ctx.createGain();
    dry.gain.value = 1 - this.params.delayMix;
    wet.gain.value = this.params.delayMix;

    const delay = ctx.createDelay(1.2);
    delay.delayTime.value = 0.27;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.33;

    filter.connect(dry);
    filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;

    dry.connect(master);
    wet.connect(master);
    master.connect(analyser);
    analyser.connect(ctx.destination);

    this.master = master;
    this.filter = filter;
    this.dry = dry;
    this.wet = wet;
    this.delay = delay;
    this.feedback = feedback;
    this.analyser = analyser;
    this.ready = true;
  }

  async resume() {
    if (!this.ready) this.boot();
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch (e) { /* ignored: gesture policy */ }
    }
  }

  suspend() {
    if (this.ready && this.ctx.state === 'running') this.ctx.suspend();
  }

  get running() {
    return this.ready && this.ctx.state === 'running';
  }

  setWaveform(type) {
    this.waveform = type;
  }

  setParam(name, value) {
    this.params[name] = value;
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    if (name === 'cutoff') this.filter.frequency.setTargetAtTime(value, now, 0.012);
    if (name === 'resonance') this.filter.Q.setTargetAtTime(value, now, 0.012);
    if (name === 'delayMix') {
      this.dry.gain.setTargetAtTime(1 - value, now, 0.03);
      this.wet.gain.setTargetAtTime(value, now, 0.03);
    }
    if (name === 'detune') {
      for (const v of this.voices.values()) {
        v.osc1.detune.setTargetAtTime(-value / 2, now, 0.03);
        v.osc2.detune.setTargetAtTime(value / 2, now, 0.03);
      }
    }
  }

  noteOn(id, freq) {
    if (!this.running) return;
    if (this.voices.has(id)) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = this.waveform;
    osc2.type = this.waveform;
    osc1.frequency.value = freq;
    osc2.frequency.value = freq;
    const d = this.params.detune;
    osc1.detune.value = -d / 2;
    osc2.detune.value = d / 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.16);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.filter);

    osc1.start(now);
    osc2.start(now);

    this.voices.set(id, { osc1, osc2, gain });
  }

  noteOff(id) {
    if (!this.ready) return;
    const v = this.voices.get(id);
    if (!v) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    try {
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(v.gain.gain.value, now);
      v.gain.gain.linearRampToValueAtTime(0, now + 0.16);
      v.osc1.stop(now + 0.19);
      v.osc2.stop(now + 0.19);
    } catch (e) { /* node already stopped */ }
    this.voices.delete(id);
    setTimeout(() => {
      try { v.osc1.disconnect(); v.osc2.disconnect(); v.gain.disconnect(); } catch (e) {}
    }, 260);
  }

  allNotesOff() {
    for (const id of Array.from(this.voices.keys())) this.noteOff(id);
  }
}
