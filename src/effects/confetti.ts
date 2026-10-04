import confetti from 'canvas-confetti';
import { theme } from '../theme';
import { MAX_CONFETTI } from './config';

const NEON = [theme.colors.pink, theme.colors.blue, theme.colors.lime, theme.colors.gold];
const GOLD = [theme.colors.gold, '#fff1a8', '#ffb300', '#ffffff'];

let fire: confetti.CreateTypes | null = null;
function shooter() {
  // One shared canvas; resize handled by the library; worker keeps the main thread free.
  fire ??= confetti.create(undefined, { resize: true, useWorker: true, disableForReducedMotion: true });
  return fire;
}

export function burst(opts: { gold?: boolean; count?: number; x?: number; y?: number } = {}) {
  void shooter()({
    particleCount: Math.min(opts.count ?? 70, MAX_CONFETTI),
    spread: 80,
    startVelocity: 45,
    origin: { x: opts.x ?? 0.5, y: opts.y ?? 0.6 },
    colors: opts.gold ? GOLD : NEON,
    scalar: 1.1,
    ticks: 180,
  });
}

/** Two cannons from the sides, for kickoff and champion. */
export function cannons(gold = false) {
  const count = Math.floor(MAX_CONFETTI / 2);
  burst({ gold, count, x: 0.1, y: 0.8 });
  burst({ gold, count, x: 0.9, y: 0.8 });
}
