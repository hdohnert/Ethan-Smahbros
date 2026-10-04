import { describe, expect, it } from 'vitest';
import { rankPlayers, type PlayerStats } from './ranking';

const p = (name: string, wins: number, bestStreak: number, losses: number): PlayerStats => ({
  id: name,
  name,
  wins,
  losses,
  bestStreak,
  streak: 0,
  played: wins + losses,
});

describe('rankPlayers', () => {
  it('orders by wins, then best streak, then fewest losses, then name', () => {
    const ranked = rankPlayers([
      p('Zoe', 3, 2, 1),
      p('Ava', 3, 2, 1),
      p('Max', 3, 3, 4),
      p('Leo', 5, 1, 0),
      p('Kai', 3, 2, 0),
    ]);
    expect(ranked.map((r) => r.name)).toEqual(['Leo', 'Max', 'Kai', 'Ava', 'Zoe']);
  });

  it('does not mutate its input', () => {
    const input = [p('B', 1, 1, 0), p('A', 2, 1, 0)];
    rankPlayers(input);
    expect(input[0].name).toBe('B');
  });
});
