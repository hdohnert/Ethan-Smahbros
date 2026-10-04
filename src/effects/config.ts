// One place to tune or switch off effects. Durations are in milliseconds and
// stay under 2 s each (the champion screen is held on purpose).

import type { EffectType } from './types';

export const EFFECTS: Record<EffectType, { enabled: boolean; ms: number }> = {
  win: { enabled: true, ms: 900 },
  tickets: { enabled: true, ms: 1400 },
  newKing: { enabled: true, ms: 1800 },
  challenger: { enabled: true, ms: 2800 }, // "YOU'RE UP!" + 3-2-1-FIGHT
  bracket: { enabled: true, ms: 1800 },
  seriesWon: { enabled: true, ms: 1800 },
  finalIntro: { enabled: true, ms: 2200 },
  champion: { enabled: true, ms: 9000 },
};

/** Confetti particle cap, to hold 60 fps on an older iPhone. */
export const MAX_CONFETTI = 150;

/** Seconds of no results before the TV starts cycling attract screens. */
export const ATTRACT_AFTER_MS = 60_000;
export const ATTRACT_SLIDE_MS = 12_000;

export const KICKOFF_MS = 5000;
