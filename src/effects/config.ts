// One place to tune or switch off effects. Durations are in milliseconds
// (the champion, bracket reveal and fighter intro are held on purpose).

import type { EffectType } from './types';

export const EFFECTS: Record<EffectType, { enabled: boolean; ms: number }> = {
  win: { enabled: true, ms: 900 },
  tickets: { enabled: true, ms: 1400 },
  hype: { enabled: true, ms: 1100 }, // BOOM! / SMASHED! pop
  shower: { enabled: true, ms: 2600 }, // ticket rain for a big payout
  upset: { enabled: true, ms: 2400 }, // 🚨 UPSET! siren
  newKing: { enabled: true, ms: 1800 },
  firstWin: { enabled: true, ms: 1700 },
  streak: { enabled: true, ms: 1800 }, // ON FIRE / UNSTOPPABLE
  challenger: { enabled: true, ms: 4200 }, // fighter intro cards + 3-2-1-FIGHT
  bracket: { enabled: true, ms: 6800 }, // Top 4 revealed one at a time
  seriesWon: { enabled: true, ms: 1800 },
  finalIntro: { enabled: true, ms: 2200 },
  jackpot: { enabled: true, ms: 2600 },
  champion: { enabled: true, ms: 9000 },
};

/** A single award this big rains tickets over the whole screen. */
export const SHOWER_AT = 15;

/** Hype words for King of the Hill wins, picked by event id so every TV shows the same one. */
export const HYPE_WORDS = ['BOOM!', 'SMASHED!', 'POW!', 'K.O.!', 'WHAM!', 'KABOOM!', 'GG!', 'ZAP!'];

/** How long the birthday song screen stays up after "Everybody sing!". */
export const SING_MS = 60_000;

/** Confetti particle cap, to hold 60 fps on an older iPhone. */
export const MAX_CONFETTI = 150;

/** Seconds of no results before the TV starts cycling attract screens. */
export const ATTRACT_AFTER_MS = 60_000;
export const ATTRACT_SLIDE_MS = 12_000;

export const KICKOFF_MS = 5000;
