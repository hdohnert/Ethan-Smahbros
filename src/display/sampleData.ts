// Static sample state for the phase 1 TV test. Phase 2 replaces this with
// live data derived from Supabase events.

import { rankPlayers, type PlayerStats } from '../rules/ranking';

export interface Avatar {
  emoji?: string;
  color: string;
}

export interface BoardPlayer extends PlayerStats {
  avatar: Avatar;
  tickets: number;
}

const c = ['#ff2d95', '#21d4fd', '#b6ff3b', '#ffc83d', '#a66bff', '#ff8a3d'];

// name, emoji, wins, losses, streak, best
const rows: [string, string | undefined, number, number, number, number][] = [
  ['Ethan', '🎂', 6, 1, 4, 4],
  ['Maya', '🦄', 4, 2, 0, 3],
  ['Leo', '🦖', 3, 1, 0, 3],
  ['Ava', '⚡', 3, 2, 0, 2],
  ['Noah', '🚀', 2, 1, 0, 2],
  ['Zoe', undefined, 2, 2, 0, 1],
  ['Kai', '🐉', 1, 1, 0, 1],
  ['Liam', '🍕', 1, 1, 0, 1],
  ['Mia', undefined, 1, 1, 0, 1],
  ['Owen', '👾', 1, 1, 0, 1],
  ['Isla', '🌈', 0, 1, 0, 0],
  ['Jack', undefined, 0, 1, 0, 0],
  ['Ruby', '🐱', 0, 1, 0, 0],
  ['Finn', '🏀', 0, 1, 0, 0],
  ['Ella', undefined, 0, 1, 0, 0],
  ['Max', '🎮', 0, 1, 0, 0],
  ['Lily', '🌸', 0, 0, 0, 0],
  ['Sam', undefined, 0, 0, 0, 0],
  ['Nora', '⭐', 0, 0, 0, 0],
  ['Theo', '🐼', 0, 0, 0, 0],
];

export const samplePlayers: BoardPlayer[] = rankPlayers(
  rows.map(([name, emoji, wins, losses, streak, bestStreak], i) => ({
    id: name.toLowerCase(),
    name,
    avatar: { emoji, color: c[i % c.length] },
    wins,
    losses,
    streak,
    bestStreak,
    played: wins + losses,
    tickets: (wins + losses) * 2 + wins * 2 + (bestStreak >= 3 ? 2 : 0) + (bestStreak >= 5 ? 3 : 0),
  })),
);

const byId = Object.fromEntries(samplePlayers.map((p) => [p.id, p]));

export const sampleMatch = {
  phase: 'King of the Hill' as const,
  king: byId.ethan,
  challenger: byId.lily,
  queue: [byId.sam, byId.nora, byId.theo, byId.isla, byId.jack],
};
