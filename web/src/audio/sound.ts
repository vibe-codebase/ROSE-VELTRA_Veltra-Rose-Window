/**
 * Rose Window sound, synthesised with Web Audio: a soft choir (formant-filtered voices) over an
 * organ drone in a long stone reverb, handbells for lit medallions and a peal when the window glows.
 */
const semis = (root: number, n: number) => root * Math.pow(2, n / 12);
// church modes, one per hour: Dorian at dawn, Mixolydian at noon, Aeolian at vespers
const MODES = [
  { root: 146.83, scale: [0, 2, 3, 5, 7, 9, 10, 12, 14, 15] },
  { root: 196.0, scale: [0, 2, 4, 5, 7, 9, 10, 12, 14, 16] },
  { root: 164.81, scale: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15] },
];
const VOWEL_AH = [[730, 1], [1090, 0.5], [2440, 0.25]] as const;
const VOWEL_OO = [[300, 1], [870, 0.35], [2240, 0.12]] as const;

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private verb!: ConvolverNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private next = 0;
  private bar = 0;
  private chapter = 0;
  private seed = 3;
  private musicVol = 0.6;
  private sfxVol = 0.8;
  private ducked = false;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain(); this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
      this.master.connect(comp).connect(ctx.destination);
      this.music = ctx.createGain(); this.sfx = ctx.createGain();
      this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(5.5);
      const wet = ctx.createGain(); wet.gain.value = 0.55;
      this.verb.connect(wet).connect(this.master);
      const dry = ctx.createGain(); dry.gain.value = 0.55;
      this.music.connect(dry).connect(this.master); this.music.connect(this.verb);
      this.sfx.connect(this.master); this.sfx.connect(this.verb);
      this.noise = this.makeNoise();
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setVolumes(music: number, sfx: number) { this.musicVol = music; this.sfxVol = sfx; this.applyVolumes(); }
  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(this.musicVol * 0.55 * (this.ducked ? 0.4 : 1), t, 0.25);
    this.sfx.gain.setTargetAtTime(this.sfxVol, t, 0.05);
  }
  duck(on: boolean) { this.ducked = on; this.applyVolumes(); }
  suspend() { void this.ctx?.suspend(); }
  resume() { if (this.ctx?.state === 'suspended') void this.ctx.resume(); }

  // ── music: slow chant-like chords that drift through the mode ──────────
  startMusic(chapter: number) {
    if (!this.ctx) return;
    if (this.timer !== null && chapter === this.chapter) return;
    this.chapter = chapter;
    this.next = this.ctx.currentTime + 0.5;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 200);
  }
  stopMusic() { if (this.timer !== null) { clearInterval(this.timer); this.timer = null; } }
  private rnd() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  private schedule() {
    const ctx = this.ctx!;
    const barLen = 6.4;
    const mode = MODES[this.chapter % MODES.length];
    while (this.next < ctx.currentTime + 1.2) {
      const t = this.next;
      const degs = [0, 3, 4, 0, 5, 3, 1, 0];
      const d = degs[this.bar % degs.length];
      this.organ(t, semis(mode.root / 2, mode.scale[d]), barLen + 0.4);
      [0, 2, 4].forEach((k, i) => this.voice(t + i * 0.15, semis(mode.root, mode.scale[(d + k) % mode.scale.length]), 0.035, barLen, this.rnd() < 0.5 ? VOWEL_AH : VOWEL_OO));
      if (this.rnd() < 0.6) {
        const top = mode.scale[Math.min(mode.scale.length - 1, d + 4 + Math.floor(this.rnd() * 3))];
        this.voice(t + barLen * 0.5, semis(mode.root * 2, top), 0.022, barLen * 0.45, VOWEL_OO);
      }
      this.next += barLen;
      this.bar++;
    }
  }
  /** A sung vowel: a slightly detuned sawtooth pair through formant filters. */
  private voice(t: number, f: number, vol: number, d: number, vowel: readonly (readonly [number, number])[], bus?: GainNode) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + d * 0.35);
    env.gain.linearRampToValueAtTime(vol * 0.8, t + d * 0.75);
    env.gain.linearRampToValueAtTime(0, t + d);
    const vib = ctx.createOscillator(); vib.frequency.value = 5;
    const vg = ctx.createGain(); vg.gain.value = f * 0.006; vib.connect(vg);
    const mix = ctx.createGain(); mix.gain.value = 0.5;
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      vg.connect(o.frequency); o.connect(mix); o.start(t); o.stop(t + d + 0.1);
    }
    for (const [ff, a] of vowel) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = 9;
      const ga = ctx.createGain(); ga.gain.value = a * 2.4;
      mix.connect(bp).connect(ga).connect(env);
    }
    vib.start(t); vib.stop(t + d + 0.1);
    env.connect(bus ?? this.music);
  }
  private organ(t: number, f: number, d: number) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(0.05, t + 0.8); env.gain.setValueAtTime(0.05, t + d - 0.8); env.gain.linearRampToValueAtTime(0, t + d);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    for (const [m, a] of [[0.5, 0.6], [1, 1], [2, 0.5], [3, 0.2], [4, 0.15]] as const) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
      const g = ctx.createGain(); g.gain.value = a;
      o.connect(g).connect(lp); o.start(t); o.stop(t + d + 0.05);
    }
    lp.connect(env).connect(this.music);
  }

  // ── effects ─────────────────────────────────────────────────────────────
  private bell(t: number, f: number, vol: number, d = 3) {
    const ctx = this.ctx!;
    for (const [m, a, dd] of [[0.5, 0.3, 1], [1, 1, 1], [1.19, 0.4, 0.7], [1.5, 0.25, 0.5], [2, 0.4, 0.45], [2.74, 0.15, 0.3]] as const) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * a, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + d * dd);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + d * dd + 0.05);
    }
  }
  private click(t: number, f: number, vol: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    src.connect(bp).connect(g).connect(this.sfx); src.start(t, Math.random()); src.stop(t + 0.1);
  }
  tap() { if (this.ctx) this.click(this.ctx.currentTime, 2400, 0.12); }
  /** Turning a mirror: a glassy click whose pitch follows the column. */
  turn(x: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.click(t, 1800 + x * 1400, 0.22);
    const mode = MODES[this.chapter % MODES.length];
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = semis(mode.root * 4, mode.scale[Math.round(x * 6)] ?? 0);
    g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.55);
  }
  locked() { if (this.ctx) { const t = this.ctx.currentTime; this.click(t, 500, 0.25); this.click(t + 0.06, 420, 0.15); } }
  chime(i: number, _want: number) {
    if (!this.ctx) return;
    const mode = MODES[this.chapter % MODES.length];
    this.bell(this.ctx.currentTime, semis(mode.root * 2, mode.scale[(i * 2) % mode.scale.length]), 0.08, 2.6);
  }
  illuminate(chapter: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const mode = MODES[chapter % MODES.length];
    [0, 2, 4, 7].forEach((d, i) => this.voice(t + 0.1 + i * 0.12, semis(mode.root, mode.scale[d % mode.scale.length] + (d >= mode.scale.length ? 12 : 0)), 0.06, 4.2, VOWEL_AH, this.sfx));
    [7, 4, 2, 0, 4, 7].forEach((d, i) => this.bell(t + 0.4 + i * 0.28, semis(mode.root * 2, mode.scale[d % mode.scale.length]), 0.06, 3));
  }
  candle(i: number) { if (this.ctx) this.bell(this.ctx.currentTime, [880, 1046.5, 1318.5][i] ?? 1318.5, 0.07, 2); }

  private makeNoise() {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2); }
    return b;
  }
}

export const sound = new Sound();
