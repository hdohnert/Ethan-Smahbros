// Turns the event list into the current tournament state. Pure: no I/O, no UI.
// Every stat is derived here so Control and Display can never disagree, and
// undo is just "ignore that event and replay".

import { compareStandings } from './ranking';
import { MATCH_SIZE } from './types';
import type {
  Bracket,
  BracketPayload,
  Derived,
  MatchPayload,
  QueuePayload,
  RulesEvent,
  RulesPlayer,
  MatchFormat,
  ReplayOptions,
  RulesTournament,
  Series,
  SeriesId,
  Stats,
} from './types';

/** Wins needed to take a best-of-N series. */
export const winsNeeded = (bestOf: number) => Math.floor(Math.max(1, bestOf) / 2) + 1;

export function emptyStats(): Stats {
  return { wins: 0, losses: 0, streak: 0, bestStreak: 0, played: 0, formerKing: false, giantSlayer: 0 };
}

function series(id: SeriesId, a: string | null, b: string | null, need: number): Series {
  return { id, a, b, winsA: 0, winsB: 0, need, winner: null };
}

export function replay(
  t: RulesTournament | null,
  players: readonly RulesPlayer[],
  events: readonly RulesEvent[],
  opts: ReplayOptions = {},
): Derived {
  let format: MatchFormat = opts.defaultFormat ?? '1v1';
  const semiNeed = winsNeeded(opts.semiBestOf ?? 3);
  const finalNeed = winsNeeded(opts.finalBestOf ?? 3);
  const stats: Record<string, Stats> = {};
  const stat = (id: string) => (stats[id] ??= emptyStats());
  for (const p of players) stat(p.id);

  // Skip anything that refers to a player who has since been deleted.
  const known = new Set(players.map((p) => p.id));
  const refsOk = (e: RulesEvent) =>
    (!e.winner_id || known.has(e.winner_id)) &&
    (!e.loser_id || known.has(e.loser_id)) &&
    (e.kind !== 'bracket' || ((e.payload as BracketPayload | null)?.seeds ?? []).every((id) => known.has(id)));
  const live = events.filter((e) => !e.undone && refsOk(e)).sort((a, b) => a.id - b.id);
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
    }, players, format);
  }

  let king: string | null = t.starting_king_id && known.has(t.starting_king_id) ? t.starting_king_id : null;
  let queue = t.queue.filter((id) => id !== king);
  let status: Derived['status'] = 'koth';
  let bracket: Bracket | null = null;
  let champion: string | null = null;

  for (const e of live) {
    if (e.kind === 'match' && e.phase === 'koth' && status === 'koth' && e.winner_id && e.loser_id) {
      const w = e.winner_id;
      const losers = matchLosers(e).filter((id) => known.has(id) && id !== w);
      const ws = stat(w);
      const kingStreakBefore = king ? stat(king).streak : 0;
      ws.wins++;
      ws.played++;
      ws.streak++;
      ws.bestStreak = Math.max(ws.bestStreak, ws.streak);
      for (const l of losers) {
        const ls = stat(l);
        ls.losses++;
        ls.played++;
        ls.streak = 0;
      }
      if (king && losers.includes(king)) {
        stat(king).formerKing = true;
        if (kingStreakBefore >= 3) ws.giantSlayer++;
      }
      // Winner stays (or becomes) king; losers go to the back of the line, in line order.
      const order = [king, ...queue];
      const backOfLine = losers.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
      king = w;
      queue = queue.filter((id) => id !== w && !losers.includes(id));
      queue.push(...backOfLine);

      if ((e.payload as MatchPayload | null)?.rest) {
        // King's rest: champion of the hill takes a break at the back of the line.
        ws.streak = 0;
        queue.push(w);
        king = queue.shift() ?? null;
      }
    } else if (e.kind === 'queue' && status === 'koth') {
      const qp = e.payload as QueuePayload | null;
      if (qp?.format) format = qp.format;
      const order = qp?.order ?? [];
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
          semi1: series('semi1', seeds[0], seeds[3], semiNeed),
          semi2: series('semi2', seeds[1], seeds[2], semiNeed),
          final: series('final', null, null, finalNeed),
        };
      }
    } else if (e.kind === 'match' && bracket && status === 'playoff' && e.phase && e.phase !== 'koth' && e.winner_id) {
      const s = bracket[e.phase];
      if (s.winner || !s.a || !s.b) continue;
      if (e.winner_id === s.a) s.winsA++;
      else if (e.winner_id === s.b) s.winsB++;
      else continue;
      if (s.winsA >= s.need || s.winsB >= s.need) {
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

  return finish({ status, king, queue, stats, bracket, champion, lastEvent }, players, format);
}

/** All losers of a match: payload.losers for 3–4 players, else loser_id. */
export function matchLosers(e: Pick<RulesEvent, 'loser_id' | 'payload'>): string[] {
  const many = (e.payload as MatchPayload | null)?.losers;
  return many?.length ? many : e.loser_id ? [e.loser_id] : [];
}

function finish(
  d: Omit<Derived, 'challenger' | 'challengers' | 'standings' | 'currentSeries' | 'format'>,
  players: readonly RulesPlayer[],
  format: MatchFormat,
): Derived {
  const matchSize = MATCH_SIZE[format];
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
    if (d.status === 'koth' && (!king || !isActive(king))) king = queue.shift() ?? null;
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
    format,
    challenger: d.status === 'koth' ? (queue[0] ?? null) : null,
    challengers: d.status === 'koth' ? queue.slice(0, matchSize - 1) : [],
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
