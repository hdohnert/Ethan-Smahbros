// Tiny synthesized sound effects (no audio files). They only play after the
// start-screen tap has unlocked Web Audio and when sound is on in Control.

import { getAudioContext } from '../lib/screen';

function tone(ctx: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'square', gain = 0.18) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function noise(ctx: AudioContext, start: number, dur: number, gain = 0.3) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(g).connect(ctx.destination);
  src.start(start);
}

export type Sound = 'ko' | 'newKing' | 'champion';

/** Happy Birthday: [frequency, beats] per note, one line per lyric line. */
export const BIRTHDAY_LINES: [number, number][][] = [
  [[392, 0.75], [392, 0.25], [440, 1], [392, 1], [523, 1], [494, 2]],
  [[392, 0.75], [392, 0.25], [440, 1], [392, 1], [587, 1], [523, 2]],
  [[392, 0.75], [392, 0.25], [784, 1], [659, 1], [523, 1], [494, 1], [440, 2]],
  [[698, 0.75], [698, 0.25], [659, 1], [523, 1], [587, 1], [523, 2]],
];
export const BIRTHDAY_BEAT = 0.6;

/** Plays the tune once, starting `delay` seconds from now. */
export function playBirthday(delay = 0) {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;
  let t = ctx.currentTime + 0.05 + delay;
  for (const line of BIRTHDAY_LINES) {
    for (const [f, beats] of line) {
      tone(ctx, f, t, beats * BIRTHDAY_BEAT * 0.9, 'triangle', 0.25);
      t += beats * BIRTHDAY_BEAT;
    }
  }
}

export function play(sound: Sound) {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + 0.02;
  if (sound === 'ko') {
    noise(ctx, t, 0.18);
    tone(ctx, 110, t, 0.25, 'sine', 0.4);
  } else if (sound === 'newKing') {
    [523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, t + i * 0.11, 0.22));
  } else {
    [523, 523, 523, 698, 880, 1047].forEach((f, i) => tone(ctx, f, t + [0, 0.15, 0.3, 0.45, 0.75, 1.0][i], i === 5 ? 0.8 : 0.16));
  }
}
