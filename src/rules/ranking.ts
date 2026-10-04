// Pure leaderboard ordering. Phase 2 grows this folder into the full rules
// module (queue rotation, streaks, playoff, undo); no UI code belongs here.

export interface PlayerStats {
  id: string;
  name: string;
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
  played: number;
}

/** Ranks by wins; ties break on best streak, then fewest losses, then name. */
export function compareStandings(a: PlayerStats, b: PlayerStats): number {
  return (
    b.wins - a.wins ||
    b.bestStreak - a.bestStreak ||
    a.losses - b.losses ||
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

export function rankPlayers<T extends PlayerStats>(players: readonly T[]): T[] {
  return [...players].sort(compareStandings);
}
