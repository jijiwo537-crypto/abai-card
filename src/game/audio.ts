/**
 * WebAudio sound engine.
 *
 * Everything is synthesised at play time — the game ships as one offline HTML file, so
 * there are no samples to load. What replaces them is the structure real card-game audio
 * uses: every sound is a transient plus a body plus a tail, played through a shared bus
 * with a generated room so the hits land in the same space rather than in the listener's
 * head. A soft-knee compressor on the master keeps a busy combat step from clipping.
 */

let ctx: AudioContext | null = null;

/** Master chain, built once with the context. */
let master: GainNode | null = null;
/** Send bus into the reverb; sounds dial in as much tail as they need. */
let wetIn: GainNode | null = null;

/** A short, bright plate built from decaying noise — cheap, and enough to place a sound. */
function buildRoom(a: AudioContext): ConvolverNode {
  const len = Math.floor(a.sampleRate * 1.6);
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // Early reflections are dense and bright; the tail thins out and darkens.
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (i < 900 ? 0.55 : 1);
    }
  }
  const c = a.createConvolver();
  c.buffer = buf;
  return c;
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 26;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;

    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(comp).connect(ctx.destination);

    const room = buildRoom(ctx);
    const wetOut = ctx.createGain();
    wetOut.gain.value = 0.5;
    wetIn = ctx.createGain();
    wetIn.gain.value = 1;
    wetIn.connect(room).connect(wetOut).connect(master);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Routes a voice to the master, sending `wet` of it into the room. */
function out(a: AudioContext, node: AudioNode, wet: number) {
  node.connect(master!);
  if (wet > 0 && wetIn) {
    const send = a.createGain();
    send.gain.value = wet;
    node.connect(send).connect(wetIn);
  }
}

/** Percussive envelope: near-instant attack, exponential fall. */
function hit(g: GainNode, t0: number, peak: number, atk: number, dur: number) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + atk + dur);
}

interface ToneOpts {
  type?: OscillatorType;
  peak?: number;
  dur?: number;
  delay?: number;
  /** Sweep destination in Hz. */
  to?: number;
  atk?: number;
  wet?: number;
  /** Detune in cents — two voices a few cents apart read as one thicker voice. */
  detune?: number;
  /** Lowpass cutoff; sweeps to `filterTo` across the sound when given. */
  filter?: number;
  filterTo?: number;
}

function tone(freq: number, o: ToneOpts = {}) {
  const a = ac();
  if (!a) return;
  const {
    type = 'sine', peak = 0.06, dur = 0.25, delay = 0, to,
    atk = 0.006, wet = 0.12, detune = 0, filter, filterTo,
  } = o;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);

  const gain = a.createGain();
  hit(gain, t0, peak, atk, dur);

  let node: AudioNode = osc;
  if (filter) {
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(filter, t0);
    if (filterTo) lp.frequency.exponentialRampToValueAtTime(Math.max(60, filterTo), t0 + dur);
    node = osc.connect(lp);
  }
  node.connect(gain);
  out(a, gain, wet);
  osc.start(t0);
  osc.stop(t0 + dur + atk + 0.08);
}

interface NoiseOpts {
  peak?: number;
  dur?: number;
  delay?: number;
  /** Bandpass centre; sweeps to `to` when given. */
  band?: number;
  to?: number;
  q?: number;
  hp?: number;
  wet?: number;
  atk?: number;
}

function noise(o: NoiseOpts = {}) {
  const a = ac();
  if (!a) return;
  const { peak = 0.05, dur = 0.16, delay = 0, band = 2000, to, q = 1, hp = 120, wet = 0.15, atk = 0.004 } = o;
  const t0 = a.currentTime + delay;
  const n = Math.max(1, Math.floor(a.sampleRate * (dur + 0.05)));
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;

  const high = a.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = hp;
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = q;
  bp.frequency.setValueAtTime(band, t0);
  if (to) bp.frequency.exponentialRampToValueAtTime(Math.max(60, to), t0 + dur);

  const gain = a.createGain();
  hit(gain, t0, peak, atk, dur);
  src.connect(high).connect(bp).connect(gain);
  out(a, gain, wet);
  src.start(t0);
  src.stop(t0 + dur + 0.1);
}

/** A struck bell: a few inharmonic partials that decay at different rates. */
function bell(freq: number, peak: number, dur: number, delay = 0, wet = 0.3) {
  [
    [1, 1, 1],
    [2.02, 0.42, 0.62],
    [3.01, 0.24, 0.42],
    [4.16, 0.12, 0.28],
  ].forEach(([mult, amp, len]) =>
    tone(freq * mult, { type: 'sine', peak: peak * amp, dur: dur * len, delay, wet, atk: 0.003 }),
  );
}

export const sfx = {
  /** A card is drawn, discarded or milled: card stock sliding over card stock. */
  draw(delay = 0) {
    noise({ peak: 0.055, dur: 0.13, delay, band: 3200, to: 1100, q: 0.7, hp: 700, wet: 0.08 });
    noise({ peak: 0.03, dur: 0.05, delay: delay + 0.1, band: 5200, q: 2, hp: 1800, wet: 0.05 });
  },

  /** A spell is cast: a rising charge that blooms into a chord. */
  cast() {
    tone(180, { type: 'triangle', peak: 0.05, dur: 0.3, to: 720, filter: 900, filterTo: 5200, wet: 0.2 });
    noise({ peak: 0.035, dur: 0.34, band: 900, to: 6500, q: 0.8, wet: 0.3 });
    bell(784, 0.045, 0.5, 0.16, 0.4);
    bell(1174, 0.03, 0.42, 0.2, 0.4);
  },

  /** A permanent lands on the board: weight first, shimmer after. */
  summon() {
    tone(90, { type: 'sine', peak: 0.13, dur: 0.26, to: 48, wet: 0.12 });
    noise({ peak: 0.06, dur: 0.2, band: 1400, to: 320, q: 0.6, wet: 0.18 });
    bell(523, 0.03, 0.4, 0.1, 0.35);
  },

  /** Impact — the thud half of a combat strike, and player damage. */
  impact(delay = 0) {
    tone(120, { type: 'sine', peak: 0.16, dur: 0.16, delay, to: 42, wet: 0.1 });
    noise({ peak: 0.09, dur: 0.1, delay, band: 700, to: 180, q: 0.5, wet: 0.14 });
    noise({ peak: 0.05, dur: 0.03, delay, band: 5000, q: 1.5, hp: 2500, wet: 0.05 });
  },

  /** The slash half of a combat strike: steel drawn across steel. */
  slash(delay = 0) {
    noise({ peak: 0.075, dur: 0.11, delay, band: 6500, to: 1600, q: 1.6, hp: 1500, wet: 0.16 });
    tone(1800, { type: 'triangle', peak: 0.028, dur: 0.09, delay, to: 420, wet: 0.14 });
  },

  /** A creature dies: the note collapses and the dust settles. */
  die(delay = 0) {
    tone(300, { type: 'sawtooth', peak: 0.07, dur: 0.42, delay, to: 52, filter: 2600, filterTo: 260, wet: 0.28 });
    tone(302, { type: 'sawtooth', peak: 0.05, dur: 0.42, delay, to: 50, detune: -14, filter: 2000, filterTo: 200, wet: 0.28 });
    noise({ peak: 0.045, dur: 0.34, delay: delay + 0.06, band: 520, to: 140, q: 0.6, wet: 0.3 });
  },

  /** Damage lands on a player: felt in the chest, not the ears. */
  hit(delay = 0) {
    tone(78, { type: 'sine', peak: 0.2, dur: 0.34, delay, to: 36, wet: 0.14 });
    tone(150, { type: 'square', peak: 0.06, dur: 0.14, delay, to: 70, filter: 1400, filterTo: 300, wet: 0.1 });
    noise({ peak: 0.07, dur: 0.22, delay, band: 400, to: 110, q: 0.5, wet: 0.2 });
  },

  /** Life gain: a clean bell pair rising. */
  heal(delay = 0) {
    bell(880, 0.045, 0.55, delay, 0.45);
    bell(1318, 0.035, 0.5, delay + 0.09, 0.45);
  },

  /**
   * A card breaks apart: a hard crack, then the pieces. Nothing like the creature death
   * note, because what is breaking is a card, not a body.
   */
  shatter(delay = 0) {
    noise({ peak: 0.09, dur: 0.05, delay, band: 3400, to: 1400, q: 1.1, hp: 900, wet: 0.1 });
    tone(520, { type: 'triangle', peak: 0.06, dur: 0.09, delay, to: 130, filter: 4000, filterTo: 700, wet: 0.16 });
    // The debris, spread out behind the crack so it reads as pieces rather than one hit.
    [0.05, 0.09, 0.15, 0.23].forEach((d, i) =>
      noise({
        peak: 0.032 - i * 0.005, dur: 0.09, delay: delay + d,
        band: 5200 - i * 700, q: 2.2, hp: 2400, wet: 0.26,
      }));
    bell(1568, 0.02, 0.28, delay + 0.03, 0.4);
  },

  /** A spent spell coming apart: paper and light, gone upward. */
  dissolve(delay = 0) {
    noise({ peak: 0.05, dur: 0.26, delay, band: 1800, to: 6800, q: 0.8, hp: 1200, wet: 0.34 });
    tone(660, { type: 'sine', peak: 0.035, dur: 0.3, delay, to: 1980, filter: 1800, filterTo: 7000, wet: 0.4 });
    bell(2093, 0.022, 0.4, delay + 0.08, 0.5);
  },

  /** An orb leaves its card: a short charged push, pitched up as it goes. */
  launch(delay = 0) {
    tone(240, { type: 'triangle', peak: 0.055, dur: 0.22, delay, to: 900, filter: 1200, filterTo: 5200, wet: 0.22 });
    noise({ peak: 0.03, dur: 0.2, delay, band: 1200, to: 5200, q: 1, wet: 0.2 });
  },

  /** A spell is countered: the charge is snuffed and swept away. */
  counter() {
    tone(1400, { type: 'sine', peak: 0.07, dur: 0.3, to: 180, filter: 6000, filterTo: 500, wet: 0.35 });
    noise({ peak: 0.05, dur: 0.28, band: 7000, to: 700, q: 1.2, hp: 900, wet: 0.35 });
  },

  /** Your banner: an open fifth on soft brass. */
  bannerGood() {
    [392, 587].forEach((f, i) =>
      tone(f, { type: 'sawtooth', peak: 0.045, dur: 0.42, delay: i * 0.06, filter: 900, filterTo: 2600, atk: 0.03, wet: 0.4 }),
    );
    bell(1568, 0.02, 0.5, 0.16, 0.5);
  },

  /** The opponent's banner: the same shape, turned minor and heavy. */
  bannerBad() {
    [147, 175].forEach((f, i) =>
      tone(f, { type: 'sawtooth', peak: 0.055, dur: 0.4, delay: i * 0.07, filter: 700, filterTo: 300, atk: 0.02, wet: 0.35 }),
    );
    noise({ peak: 0.04, dur: 0.3, band: 300, to: 90, q: 0.5, wet: 0.3 });
  },

  victory() {
    [523, 659, 784, 1046].forEach((f, i) => {
      tone(f, { type: 'triangle', peak: 0.06, dur: 0.5, delay: i * 0.15, filter: 2400, filterTo: 4200, atk: 0.02, wet: 0.5 });
      bell(f * 2, 0.022, 0.7, i * 0.15 + 0.04, 0.55);
    });
    noise({ peak: 0.025, dur: 1.1, delay: 0.55, band: 6000, to: 3000, q: 0.6, hp: 2500, wet: 0.5 });
  },

  defeat() {
    [392, 330, 262, 196].forEach((f, i) =>
      tone(f, { type: 'sawtooth', peak: 0.06, dur: 0.6, delay: i * 0.2, filter: 1200, filterTo: 260, atk: 0.02, wet: 0.45 }),
    );
    tone(98, { type: 'sine', peak: 0.1, dur: 1.2, delay: 0.6, to: 44, wet: 0.4 });
  },

  /** UI feedback: card hover and taps. Dry and short, so they never muddy the mix. */
  hover() {
    tone(2100, { type: 'sine', peak: 0.014, dur: 0.05, to: 2600, wet: 0.05 });
  },

  tap() {
    noise({ peak: 0.035, dur: 0.035, band: 2600, q: 1.4, hp: 900, wet: 0.04 });
    tone(420, { type: 'triangle', peak: 0.035, dur: 0.07, to: 260, wet: 0.06 });
  },

  /**
   * The pointer comes to rest on a die you may aim at: a struck crystal, a fifth above it,
   * and a breath of air sweeping up behind them as the satellites come round. Quiet enough
   * to sit under a spell being cast, since that is exactly when it plays.
   */
  dieFocus() {
    bell(1568, 0.026, 0.75, 0, 0.42);
    bell(2349, 0.014, 0.55, 0.045, 0.45);
    tone(660, { type: 'sine', peak: 0.02, dur: 0.3, to: 1320, atk: 0.02, wet: 0.3 });
    noise({ peak: 0.018, dur: 0.34, band: 1800, to: 7200, q: 0.9, hp: 900, wet: 0.24, atk: 0.05 });
  },

  error() {
    tone(140, { type: 'square', peak: 0.05, dur: 0.13, to: 96, filter: 900, filterTo: 240, wet: 0.08 });
    tone(139, { type: 'square', peak: 0.04, dur: 0.13, detune: 22, to: 94, filter: 900, filterTo: 240, wet: 0.08 });
  },
};

/** The 3D board module imports this name; keep both spellings working. */
export const soundFx = {
  playHover: sfx.hover,
  playTapLand: sfx.tap,
  playError: sfx.error,
  playCastSpell: sfx.cast,
  playAttackSlash: sfx.slash,
  playDraw: sfx.draw,
  playDieFocus: sfx.dieFocus,
};
