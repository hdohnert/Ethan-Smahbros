// Turns the event list into the current tournament state. Pure: no I/O, no UI.
// Every stat is derived here so Control and Display can never disagree, and
// undo is just "ignore that event and replay".

import { compareStandings } from './ranking';
import type {
  Bracket,
  BracketPayload,
  Derived,
  MatchPayload,
  QueuePayload,
  RulesEvent,
  RulesPlayer,
  RulesTournament,
  Series,
  SeriesId,
  Stats,
} from './types';

export const SERIES_WINS = 2;

export function emptyStats(): Stats {
  return { wins: 0, losses: 0, streak: 0, bestStreak: 0, played: 0, formerKing: false, giantSlayer: 0 };
}

function series(id: SeriesId, a: string | null, b: string | null): Series {
  return { id, a, b, winsA: 0, winsB: 0, winner: null };
}

export function replay(t: RulesTournament | null, players: readonly RulesPlayer[], events: readonly RulesEvent[]): Derived {
  const stats: Record<string, Stats> = {};
  const stat = (id: string) => (stats[id] ??= emptyStats());
  for (const p of players) stat(p.id);

  const live = events.filter((e) => !e.undone).sort((a, b) => a.id - b.id);
  const lastEvent = live.length ? live[live.length - 1] : null;

  if (!t || t.status === 'setup') {
    return finish({
      status: 'setup',
      king: t?.starting_king_id ?? null,
      queue: (t?.queue ?? []).filter((id) => id !== t?.starting_king_id),
      stats,
      bracket: null,
      champion: null,
      lastEvent,
    }, players);
  }

  let king: string | null = t.starting_king_id;
  let queue = t.queue.filter((id) => id !== king);
  let status: Derived['status'] = 'koth';
  let bracket: Bracket | null = null;
  let champion: string | null = null;

  for (const e of live) {
    if (e.kind === 'match' && e.phase === 'koth' && status === 'koth' && e.winner_id && e.loser_id) {
      const w = e.winner_id;
      const l = e.loser_id;
      const ws = stat(w);
      const ls = stat(l);
      const loserStreakBefore = ls.streak;
      ws.wins++;
      ws.played++;
      ws.streak++;
      ws.bestStreak = Math.max(ws.bestStreak, ws.streak);
      ls.losses++;
      ls.played++;
      ls.streak = 0;

      if (l === king) {
        ls.formerKing = true;
        if (loserStreakBefore >= 3) ws.giantSlayer++;
      }
      // Winner stays (or becomes) king; loser goes to the back of the line.
      king = w;
      queue = queue.filter((id) => id !== w && id !== l);
      queue.push(l);

      if ((e.payload as MatchPayload | null)?.rest) {
        // King's rest: champion of the hill takes a break at the back of the line.
        ws.streak = 0;
        queue.push(w);
        king = queue.shift() ?? null;
      }
    } else if (e.kind === 'queue' && status === 'koth') {
      const order = (e.payload as QueuePayload | null)?.order ?? [];
      const known = new Set(queue);
      const next = order.filter((id) => known.has(id));
      const placed = new Set(next);
      queue = [...next, ...queue.filter((id) => !placed.has(id))];
    } else if (e.kind === 'bracket' && status === 'koth') {
      const seeds = (e.payload as BracketPayload | null)?.seeds ?? [];
      if (seeds.length === 4) {
        status = 'playoff';
        bracket = {
          seeds,
          semi1: series('semi1', seeds[0], seeds[3]),
          semi2: series('semi2', seeds[1], seeds[2]),
          final: series('final', null, null),
        };
      }
    } else if (e.kind === 'match' && bracket && status === 'playoff' && e.phase && e.phase !== 'koth' && e.winner_id) {
      const s = bracket[e.phase];
      if (s.winner || !s.a || !s.b) continue;
      if (e.winner_id === s.a) s.winsA++;
      else if (e.winner_id === s.b) s.winsB++;
      else continue;
      if (s.winsA >= SERIES_WINS || s.winsB >= SERIES_WINS) {
        s.winner = e.winner_id;
        if (s.id === 'final') {
          champion = s.winner;
          status = 'finished';
        } else {
          bracket.final = {
            ...bracket.final,
            a: bracket.semi1.winner,
            b: bracket.semi2.winner,
          };
        }
      }
    } else if (e.kind === 'end') {
      status = 'finished';
    }
  }

  return finish({ status, king, queue, stats, bracket, champion, lastEvent }, players);
}

function finish(
  d: Omit<Derived, 'challenger' | 'standings' | 'currentSeries'>,
  players: readonly RulesPlayer[],
): Derived {
  const byId = new Map(players.map((p) => [p.id, p]));
  const isActive = (id: string) => byId.get(id)?.active ?? false;
  let { king, queue } = d;

  if (d.status === 'koth' || d.status === 'setup') {
    // Players who stepped away drop out of line; new or returning players join the back.
    queue = queue.filter(isActive);
    const inLine = new Set(queue);
    const newcomers = [...players]
      .filter((p) => p.active && p.id !== king && !inLine.has(p.id))
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    queue = [...queue, ...newcomers.map((p) => p.id)];
    if (d.status === 'koth' && king && !isActive(king)) king = queue.shift() ?? null;
  }

  const standings = players
    .filter((p) => p.active || (d.stats[p.id]?.played ?? 0) > 0)
    .map((p) => ({ id: p.id, name: p.name, ...(d.stats[p.id] ?? emptyStats()) }))
    .sort(compareStandings)
    .map((p) => p.id);

  let currentSeries: Series | null = null;
  if (d.bracket && d.status === 'playoff') {
    currentSeries = [d.bracket.semi1, d.bracket.semi2, d.bracket.final].find((s) => !s.winner && s.a && s.b) ?? null;
  }

  return {
    ...d,
    king,
    queue,
    challenger: d.status === 'koth' ? (queue[0] ?? null) : null,
    standings,
    currentSeries,
  };
}

/** Top 4 by the leaderboard order (wins, best streak, fewest losses, name). */
export function seedTop4(
  d: Derived,
  players: readonly RulesPlayer[],
): { ok: true; seeds: string[] } | { ok: false; reason: string } {
  if (d.status !== 'koth') return { ok: false, reason: 'The bracket can only start during King of the Hill.' };
  const active = new Set(players.filter((p) => p.active).map((p) => p.id));
  const eligible = d.standings.filter((id) => active.has(id));
  if (eligible.length < 4) {
    return { ok: false, reason: `Need at least 4 active players for the Top-4 bracket (you have ${eligible.length}).` };
  }
  return { ok: true, seeds: eligible.slice(0, 4) };
}
