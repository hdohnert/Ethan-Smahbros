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
  /** Event id of this player's latest win (0 if none): earlier means they reached their score first. */
  lastWin?: number;
}

/**
 * Ranks by wins; ties break on best streak, then fewest losses, then who
 * reached their score first (earlier latest win), then name, so there is
 * never a tie.
 */
export function compareStandings(a: PlayerStats, b: PlayerStats): number {
  const reached = (p: PlayerStats) => (p.lastWin ? p.lastWin : Number.MAX_SAFE_INTEGER);
  return (
    b.wins - a.wins ||
    b.bestStreak - a.bestStreak ||
    a.losses - b.losses ||
    reached(a) - reached(b) ||
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

export function rankPlayers<T extends PlayerStats>(players: readonly T[]): T[] {
  return [...players].sort(compareStandings);
}
