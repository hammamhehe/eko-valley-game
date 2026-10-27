// src/audio/SoundFX.js
// Mesin audio kecil berbasis Web Audio API + Web Speech API.
// Semua efek suara, musik menu, "suara misterius" hutan, dan suara Miko
// dibuat langsung lewat kode, jadi TIDAK butuh file audio tambahan.

const AC = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- Data musik tema menu (tangga nada pentatonik C, nuansa pedesaan) ----
const THEME_MENU = (() => {
  const bars = [
    { root: 48, mel: [72, 0, 76, 0, 79, 0, 76, 0] },
    { root: 43, mel: [74, 0, 79, 0, 83, 0, 79, 0] },
    { root: 45, mel: [76, 0, 81, 0, 84, 0, 81, 0] },
    { root: 41, mel: [77, 0, 81, 0, 84, 0, 81, 76] },
  ];
  return { bpm: 100, bars };
})();

class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.analyser = null;
    this.enabled = true;
    this.cueBus = null;
    this._noise = null;
    this._freq = null;
    this._unlockBound = false;

    this.themeName = null;
    this.timer = null;
    this.nextTime = 0;
    this.step = 0;

    this._voice = null;
    this._speechToken = 0;
    this.speaking = false;

    if (this.speechSupported) {
      try {
        window.speechSynthesis.onvoiceschanged = () => {
          this._voice = null;
        };
      } catch (e) {
        /* abaikan */
      }
    }
  }

  // ------------------------------------------------------------------
  // Inisialisasi & pengaturan
  // ------------------------------------------------------------------
  get supported() {
    return !!AC;
  }

  get speechSupported() {
    return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  }

  ensure() {
    if (!AC) return null;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.8 : 0;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.55;
      this.master.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  isRunning() {
    return !!this.ctx && this.ctx.state === "running";
  }

  // Browser memblokir audio sebelum ada interaksi. Pasang pendengar sekali saja.
  unlock() {
    if (this._unlockBound || typeof window === "undefined") return;
    this._unlockBound = true;

    const handler = () => {
      const c = this.ensure();
      if (!c) return;
      const after = () => {
        if (this.themeName && !this.timer && this.enabled) this._runTheme();
      };
      if (c.state === "running") after();
      else c.resume().then(after).catch(() => {});
    };

    ["pointerdown", "keydown", "touchstart"].forEach((ev) => window.addEventListener(ev, handler, { passive: true }));
  }

  setEnabled(value) {
    this.enabled = !!value;

    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.enabled ? 0.8 : 0, this.ctx.currentTime, 0.02);
    }

    if (!this.enabled) {
      this._stopTimer();
      this.stopCue();
      this.cancelSpeech();
    } else if (this.themeName && this.isRunning() && !this.timer) {
      this._runTheme();
    }
  }

  // ------------------------------------------------------------------
  // Bahan dasar: nada & noise
  // ------------------------------------------------------------------
  tone(freq, o = {}) {
    const c = this.ensure();
    if (!c || !this.enabled) return;

    const { at, t = 0, dur = 0.15, type = "square", vol = 0.15, to = null, dest = null } = o;
    const t0 = (at !== undefined ? at : c.currentTime) + t;

    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.min(0.015, dur / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain);
    gain.connect(dest || this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noiseBuffer() {
    if (!this._noise) {
      const c = this.ctx;
      const len = c.sampleRate * 2;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this._noise = buf;
    }
    return this._noise;
  }

  noise(o = {}) {
    const c = this.ensure();
    if (!c || !this.enabled) return;

    const { at, t = 0, dur = 0.1, vol = 0.1, type = "bandpass", freq = 1000, q = 1, to = null, dest = null } = o;
    const t0 = (at !== undefined ? at : c.currentTime) + t;

    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;

    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t0);
    if (to) filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.min(0.01, dur / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest || this.master);
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.05);
  }

  // ------------------------------------------------------------------
  // Efek suara antarmuka
  // ------------------------------------------------------------------
  hover() {
    this.tone(520, { dur: 0.05, vol: 0.05 });
  }

  click() {
    this.tone(660, { dur: 0.06, vol: 0.12 });
    this.tone(990, { t: 0.05, dur: 0.08, vol: 0.1 });
  }

  correct() {
    [523, 659, 784, 1047].forEach((f, i) => {
      this.tone(f, { t: i * 0.09, dur: 0.14, type: "square", vol: 0.1 });
      this.tone(f / 2, { t: i * 0.09, dur: 0.14, type: "triangle", vol: 0.1 });
    });
  }

  wrong() {
    this.tone(260, { dur: 0.28, type: "sawtooth", vol: 0.1, to: 120 });
    this.tone(196, { t: 0.14, dur: 0.34, type: "sawtooth", vol: 0.1, to: 90 });
  }

  star(i = 0) {
    const f = [659, 784, 1047][i % 3];
    this.tone(f, { dur: 0.22, type: "square", vol: 0.1 });
    this.tone(f * 2, { t: 0.06, dur: 0.18, type: "triangle", vol: 0.08 });
  }

  win() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => {
      this.tone(f, { t: i * 0.12, dur: i === notes.length - 1 ? 0.5 : 0.14, type: "square", vol: 0.1 });
      this.tone(f / 2, { t: i * 0.12, dur: i === notes.length - 1 ? 0.5 : 0.14, type: "triangle", vol: 0.1 });
    });
  }

  // ------------------------------------------------------------------
  // "Suara misterius" hutan (dibuat dari osilator & noise)
  // Mengembalikan durasi dalam detik (0 jika tidak bisa diputar).
  // ------------------------------------------------------------------
  playCue(name) {
    const c = this.ensure();
    if (!c || !this.enabled) return 0;

    this.stopCue();

    const bus = c.createGain();
    bus.gain.value = 1;
    bus.connect(this.master);
    this.cueBus = bus;

    const t0 = c.currentTime + 0.08;

    if (name === "birds") return this._birds(bus, t0);
    if (name === "chainsaw") return this._chainsaw(bus, t0);
    if (name === "plastic") return this._plastic(bus, t0);
    return 0;
  }

  stopCue() {
    if (!this.cueBus || !this.ctx) return;
    const bus = this.cueBus;
    this.cueBus = null;
    try {
      bus.gain.cancelScheduledValues(this.ctx.currentTime);
      bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
    } catch (e) {
      /* abaikan */
    }
    setTimeout(() => {
      try {
        bus.disconnect();
      } catch (e) {
        /* abaikan */
      }
    }, 150);
  }

  _birds(bus, t0) {
    const bursts = [
      [0.0, 3, 2800],
      [0.9, 2, 3600],
      [1.7, 4, 3100],
      [2.7, 3, 3900],
    ];
    bursts.forEach(([bt, n, f]) => {
      for (let i = 0; i < n; i++) {
        const st = bt + i * 0.14;
        this.tone(f * (1 + i * 0.05), { at: t0, t: st, dur: 0.1, type: "sine", vol: 0.14, to: f * 1.5, dest: bus });
        this.tone(f * 1.5, { at: t0, t: st + 0.07, dur: 0.07, type: "sine", vol: 0.1, to: f * 1.1, dest: bus });
      }
    });
    return 3.5;
  }

  _chainsaw(bus, t0) {
    const c = this.ctx;
    const dur = 3.2;

    const mkOsc = (type, mult) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(55 * mult, t0);
      o.frequency.linearRampToValueAtTime(115 * mult, t0 + 0.7);
      o.frequency.linearRampToValueAtTime(78 * mult, t0 + 1.3);
      o.frequency.linearRampToValueAtTime(125 * mult, t0 + 2.0);
      o.frequency.linearRampToValueAtTime(70 * mult, t0 + dur);
      return o;
    };

    const o1 = mkOsc("sawtooth", 1);
    const o2 = mkOsc("square", 2);

    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1500;

    // Getaran cepat khas mesin (modulasi amplitudo)
    const am = c.createGain();
    am.gain.value = 0.55;
    const lfo = c.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = 26;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.4;
    lfo.connect(lfoGain);
    lfoGain.connect(am.gain);

    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(0.16, t0 + 0.2);
    env.gain.setValueAtTime(0.16, t0 + dur - 0.35);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    const mix2 = c.createGain();
    mix2.gain.value = 0.5;

    o1.connect(lp);
    o2.connect(mix2);
    mix2.connect(lp);
    lp.connect(am);
    am.connect(env);
    env.connect(bus);

    [o1, o2, lfo].forEach((o) => {
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    });

    this.noise({ at: t0, dur, vol: 0.06, type: "bandpass", freq: 2200, q: 0.7, dest: bus });
    return dur;
  }

  _plastic(bus, t0) {
    for (let i = 0; i < 38; i++) {
      const t = Math.pow(Math.random(), 1.3) * 2.2;
      const f = 3500 + Math.random() * 5500;
      this.noise({
        at: t0,
        t,
        dur: 0.02 + Math.random() * 0.05,
        vol: 0.16 * (0.4 + Math.random() * 0.6),
        type: "bandpass",
        freq: f,
        q: 1.2,
        dest: bus,
      });
    }
    return 2.6;
  }

  // Tingkat suara (0..1) untuk visualizer. null jika tidak tersedia.
  getLevels(n) {
    if (!this.analyser) return null;
    if (!this._freq) this._freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(this._freq);

    const out = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.min(this._freq.length - 1, Math.floor(Math.pow(i / n, 1.6) * 64));
      out.push(Math.pow(this._freq[idx] / 255, 0.9));
    }
    return out;
  }

  // ------------------------------------------------------------------
  // Musik tema (sequencer sederhana dengan look-ahead)
  // ------------------------------------------------------------------
  startTheme(name = "menu") {
    this.themeName = name;
    if (!this.enabled) return;
    this.ensure();
    if (this.isRunning() && !this.timer) this._runTheme();
  }

  stopTheme() {
    this.themeName = null;
    this._stopTimer();
  }

  _stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  _runTheme() {
    this._stopTimer();
    const c = this.ctx;
    if (!c) return;

    this.step = 0;
    this.nextTime = c.currentTime + 0.1;
    this.timer = setInterval(() => this._schedule(), 50);
  }

  _schedule() {
    const c = this.ctx;
    if (!c || !this.enabled || !this.themeName) return;

    const theme = THEME_MENU;
    const stepDur = 60 / theme.bpm / 2;

    if (this.nextTime < c.currentTime - 0.1) this.nextTime = c.currentTime + 0.05;

    while (this.nextTime < c.currentTime + 0.25) {
      const s = this.step % (theme.bars.length * 8);
      const bar = theme.bars[Math.floor(s / 8)];
      const inBar = s % 8;
      const at = this.nextTime;

      const m = bar.mel[inBar];
      if (m) this.tone(midiToFreq(m), { at, dur: stepDur * 1.7, type: "triangle", vol: 0.075 });

      if (inBar === 0 || inBar === 4) {
        this.tone(midiToFreq(bar.root), { at, dur: stepDur * 3.2, type: "triangle", vol: 0.09 });
      }
      if (inBar === 2 || inBar === 6) {
        this.tone(midiToFreq(bar.root + 19), { at, dur: stepDur * 0.9, type: "sine", vol: 0.03 });
      }

      // "Tuk" lembut seperti kayu
      if (inBar % 2 === 0) {
        this.noise({ at, dur: 0.035, vol: inBar === 0 ? 0.035 : 0.018, type: "bandpass", freq: 1800, q: 2 });
      }

      this.nextTime += stepDur;
      this.step++;
    }
  }

  // ------------------------------------------------------------------
  // Suara Miko (Text-to-Speech bahasa Indonesia)
  // ------------------------------------------------------------------
  pickVoice() {
    if (!this.speechSupported) return null;
    if (this._voice) return this._voice;

    const voices = window.speechSynthesis.getVoices() || [];
    this._voice =
      voices.find((v) => (v.lang || "").toLowerCase().replace("_", "-") === "id-id") ||
      voices.find((v) => (v.lang || "").toLowerCase().startsWith("id")) ||
      voices.find((v) => /indonesia/i.test(v.name || "")) ||
      null;

    return this._voice;
  }

  // true = ada daftar suara tetapi tidak ada yang berbahasa Indonesia
  lacksIndonesianVoice() {
    if (!this.speechSupported) return false;
    const voices = window.speechSynthesis.getVoices() || [];
    return voices.length > 0 && !this.pickVoice();
  }

  speak(text, o = {}) {
    if (!this.enabled || !this.speechSupported) return false;

    const { rate = 0.95, pitch = 1.1, onStart = null, onEnd = null } = o;
    const synth = window.speechSynthesis;

    this.cancelSpeech();
    const token = this._speechToken;

    let finished = false;
    let guard = null;

    const done = () => {
      if (finished || token !== this._speechToken) return;
      finished = true;
      clearTimeout(guard);
      this.speaking = false;
      if (onEnd) onEnd();
    };

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    u.rate = rate;
    u.pitch = pitch;
    u.volume = 1;

    const voice = this.pickVoice();
    if (voice) u.voice = voice;

    u.onstart = () => {
      if (token !== this._speechToken) return;
      this.speaking = true;
      if (onStart) onStart();
    };
    u.onend = done;
    u.onerror = done;

    // Pengaman: sebagian browser tidak selalu memicu onend.
    guard = setTimeout(done, Math.max(3000, text.length * 120 + 2500));

    setTimeout(() => {
      if (token === this._speechToken) synth.speak(u);
    }, 60);

    return true;
  }

  cancelSpeech() {
    this._speechToken++;
    this.speaking = false;
    if (this.speechSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        /* abaikan */
      }
    }
  }
}

export default new SoundFX();
