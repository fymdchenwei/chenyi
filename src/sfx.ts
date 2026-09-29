import { game } from './state';

let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  if (game.settings.muteSfx) return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(freq: number, when: number, dur: number, type: OscillatorType, gain: number): void {
  if (!ctx || game.settings.muteSfx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function sfxTap(): void {
  unlockAudio();
  tone(520, 0, 0.05, 'sine', 0.04);
}

export function sfxCorrect(): void {
  unlockAudio();
  tone(523, 0, 0.09, 'sine', 0.07);
  tone(659, 0.08, 0.1, 'sine', 0.07);
  tone(784, 0.16, 0.14, 'triangle', 0.06);
}

export function sfxCombo(n: number): void {
  unlockAudio();
  tone(600 + n * 40, 0, 0.08, 'triangle', 0.06);
  tone(800 + n * 50, 0.07, 0.12, 'sine', 0.06);
}

export function sfxWrong(): void {
  unlockAudio();
  tone(220, 0, 0.12, 'sine', 0.05);
  tone(180, 0.1, 0.14, 'triangle', 0.04);
}

export function sfxStar(): void {
  unlockAudio();
  tone(880, 0, 0.1, 'sine', 0.06);
  tone(1174, 0.1, 0.16, 'triangle', 0.05);
}

export function sfxLegendary(): void {
  unlockAudio();
  [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.2, 'triangle', 0.07));
}

export function sfxFlip(): void {
  unlockAudio();
  tone(300, 0, 0.08, 'sawtooth', 0.03);
  tone(700, 0.08, 0.12, 'sine', 0.05);
}
