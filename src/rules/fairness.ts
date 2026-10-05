// Who has played less than everyone else, and which kids catch-up should move
// to the front of the line. Pure: works on the replayed state.

import type { Derived, RulesPlayer } from './types';
import { MATCH_SIZE } from './types';

/** Games behind the average before a kid counts as "behind". */
export const BEHIND_BY = 2;

export interface Fairness {
  /** Average games played by kids who are here. */
  avg: number;
  min: number;
  max: number;
  /** Kids who are here, fewest games first. */
  rows: { id: string; played: number; gap: number }[];
  /** Kids at least BEHIND_BY games under the average, most behind first. */
  behind: { id: string; played: number; gap: number }[];
}

export function fairness(d: Derived, players: readonly RulesPlayer[]): Fairness {
  const here = players.filter((p) => p.active);
  const played = here.map((p) => ({ id: p.id, played: d.stats[p.id]?.played ?? 0 }));
  const avg = played.length ? played.reduce((n, p) => n + p.played, 0) / played.length : 0;
  const rows = played.map((p) => ({ ...p, gap: avg - p.played })).sort((a, b) => a.played - b.played);
  return {
    avg,
    min: rows.length ? rows[0].played : 0,
    max: rows.length ? rows[rows.length - 1].played : 0,
    rows,
    behind: rows.filter((r) => r.gap >= BEHIND_BY),
  };
}

/**
 * Kids to move to the front of the line after a match: the most-behind kids
 * waiting in line, at most one match's worth of challengers, never anyone who
 * just played (so nobody plays twice in a row) and never the king.
 */
export function catchUpPicks(after: Derived, players: readonly RulesPlayer[], justPlayed: readonly string[]): string[] {
  if (after.status !== 'koth') return [];
  const slots = MATCH_SIZE[after.format] - 1;
  const skip = new Set([...justPlayed, after.king ?? '']);
  const front = new Set(after.queue.slice(0, slots));
  const picks = fairness(after, players)
    .behind.filter((r) => !skip.has(r.id) && after.queue.includes(r.id))
    .slice(0, slots)
    .map((r) => r.id);
  // Nothing to do if they're already up next.
  return picks.every((id) => front.has(id)) ? [] : picks;
}
