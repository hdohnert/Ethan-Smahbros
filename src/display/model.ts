// Everything the TV draws, in one plain object built from the live snapshot
// (or from sample data when Supabase isn't set up yet).

import { emptyStats } from '../rules/replay';
import type { Derived, SeriesId } from '../rules/types';
import { DEFAULT_SETTINGS, type Settings, type Snapshot } from '../data/types';
import { theme } from '../theme';

export interface BoardPlayer {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  photo_url: string | null;
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
  played: number;
  tickets: number;
  /** Tickets earned tonight before any prizes were bought. */
  earned: number;
}

export interface BoardSeries {
  id: SeriesId;
  a: BoardPlayer | null;
  b: BoardPlayer | null;
  winsA: number;
  winsB: number;
  winner: BoardPlayer | null;
}

export interface BoardModel {
  settings: Settings;
  monogram: string;
  status: Derived['status'];
  phaseLabel: string;
  /** Leaderboard order. */
  standings: BoardPlayer[];
  /** Everyone on the roster, A–Z (Ticket Bank). */
  roster: BoardPlayer[];
  king: BoardPlayer | null;
  challenger: BoardPlayer | null;
  queue: BoardPlayer[];
  bracket: { semi1: BoardSeries; semi2: BoardSeries; final: BoardSeries } | null;
  currentSeries: SeriesId | null;
  champion: BoardPlayer | null;
  lastEventId: number | null;
}

export function buildModel(snap: Snapshot, d: Derived, balances: Record<string, number>): BoardModel {
  const earned = Object.fromEntries(snap.balances.map((b) => [b.player_id, b.earned ?? b.balance]));
  const byId = new Map<string, BoardPlayer>();
  for (const p of snap.players) {
    const s = d.stats[p.id] ?? emptyStats();
    byId.set(p.id, {
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      photo_url: p.photo_url,
      wins: s.wins,
      losses: s.losses,
      streak: s.streak,
      bestStreak: s.bestStreak,
      played: s.played,
      tickets: balances[p.id] ?? 0,
      earned: earned[p.id] ?? balances[p.id] ?? 0,
    });
  }
  const get = (id: string | null | undefined) => (id ? (byId.get(id) ?? null) : null);
  const series = (id: SeriesId): BoardSeries => {
    const s = d.bracket![id];
    return { id, a: get(s.a), b: get(s.b), winsA: s.winsA, winsB: s.winsB, winner: get(s.winner) };
  };

  return {
    settings: snap.settings,
    monogram: (snap.settings.birthdayName || theme.monogram).charAt(0).toUpperCase(),
    status: d.status,
    phaseLabel: phaseLabel(d),
    standings: d.standings.map(get).filter((p): p is BoardPlayer => !!p),
    roster: [...byId.values()].sort((a, b) => a.name.localeCompare(b.name)),
    king: get(d.king),
    challenger: get(d.challenger),
    queue: d.queue.map(get).filter((p): p is BoardPlayer => !!p),
    bracket: d.bracket ? { semi1: series('semi1'), semi2: series('semi2'), final: series('final') } : null,
    currentSeries: d.currentSeries?.id ?? null,
    champion: get(d.champion),
    lastEventId: d.lastEvent?.id ?? null,
  };
}

function phaseLabel(d: Derived): string {
  switch (d.status) {
    case 'setup':
      return 'Getting Ready';
    case 'koth':
      return 'King of the Hill';
    case 'playoff':
      return d.currentSeries?.id === 'final' ? 'Final' : 'Semifinals';
    case 'finished':
      return d.champion ? 'Champion!' : 'Game Over';
  }
}

export const sampleSettings: Settings = DEFAULT_SETTINGS;
