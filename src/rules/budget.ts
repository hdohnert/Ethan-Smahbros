// Ticket budget math. Pure. The night has a hard limit of physical tickets;
// this projects what the rest of the tournament will still pay so Control can
// warn early and suggest smaller amounts before the limit is ever close.

import type { Derived, TicketScale } from './types';
import { MATCH_SIZE } from './types';

export interface BudgetInput {
  budget: number;
  /** Tickets awarded so far (prize purchases don't count). */
  issued: number;
  d: Derived;
  scale: TicketScale;
  semiBestOf: number;
  finalBestOf: number;
  activePlayers: number;
  sessionMinutes: number;
  /** When the main session started (ms), or null before Start. */
  sessionStartedAt: number | null;
  now: number;
  /** Times (ms) of King of the Hill matches played so far. */
  kothMatchTimes: number[];
}

export interface Projection {
  issued: number;
  remaining: number;
  /** Tickets the rest of the tournament is still expected to pay. */
  expectedMore: number;
  expectedTotal: number;
  parts: { label: string; amount: number }[];
  remainingMatches: number;
  level: 'ok' | 'warn' | 'over';
  suggestion: string | null;
}

/** Until real matches give a better number. */
export const DEFAULT_MATCH_MINUTES = 4.5;

function project(i: BudgetInput, scale: TicketScale) {
  const { d } = i;
  const parts: { label: string; amount: number }[] = [];
  const size = d.format === '4-player' ? Math.max(2, Math.min(MATCH_SIZE['4-player'], i.activePlayers)) : 2;
  const perMatch = size * scale.play + scale.win;
  const perGame = 2 * scale.play + scale.win;
  let remainingMatches = 0;

  if (d.status === 'setup' || d.status === 'koth') {
    const played = i.kothMatchTimes.length;
    const start = i.sessionStartedAt ?? (played ? Math.min(...i.kothMatchTimes) : i.now);
    const elapsed = d.status === 'setup' ? 0 : Math.max(0, (i.now - start) / 60000);
    // Trust the real pace only after a few matches; keep it within a sane range.
    const avg = played >= 3 && elapsed >= 10 ? Math.min(8, Math.max(3, elapsed / played)) : DEFAULT_MATCH_MINUTES;
    remainingMatches = Math.ceil(Math.max(0, i.sessionMinutes - elapsed) / avg);
    parts.push({ label: `${remainingMatches} more ${size}-player matches × ${perMatch}`, amount: remainingMatches * perMatch });
    parts.push({ label: 'Top 4 (4 × ' + scale.top4 + ')', amount: 4 * scale.top4 });
    parts.push({ label: 'Reaching the final (2 × ' + scale.final + ')', amount: 2 * scale.final });
    parts.push({ label: 'Champion', amount: scale.champion });
    const games = 2 * i.semiBestOf + i.finalBestOf;
    parts.push({ label: `Up to ${games} playoff games × ${perGame}`, amount: games * perGame });
  } else if (d.status === 'playoff' && d.bracket) {
    const b = d.bracket;
    const semisLeft = [b.semi1, b.semi2].filter((s) => !s.winner).length;
    if (semisLeft) parts.push({ label: `Reaching the final (${semisLeft} × ${scale.final})`, amount: semisLeft * scale.final });
    if (!d.champion) parts.push({ label: 'Champion', amount: scale.champion });
    const games = [b.semi1, b.semi2, b.final].filter((s) => !s.winner).reduce((n, s) => n + (s.bestOf - s.winsA - s.winsB), 0);
    if (games) parts.push({ label: `Up to ${games} playoff games × ${perGame}`, amount: games * perGame });
  }
  const expectedMore = parts.reduce((n, p) => n + p.amount, 0);
  return { parts, expectedMore, remainingMatches };
}

export function projectBudget(i: BudgetInput): Projection {
  const { parts, expectedMore, remainingMatches } = project(i, i.scale);
  const remaining = Math.max(0, i.budget - i.issued);
  const expectedTotal = i.issued + expectedMore;
  const level = expectedTotal > i.budget ? 'over' : i.issued > 0.9 * i.budget ? 'warn' : 'ok';
  return {
    issued: i.issued,
    remaining,
    expectedMore,
    expectedTotal,
    parts,
    remainingMatches,
    level,
    suggestion: level === 'over' ? suggest(i) : null,
  };
}

/** The smallest cut to "play" (then "win") that brings the projection under the budget. */
function suggest(i: BudgetInput): string {
  const fits = (scale: TicketScale) => i.issued + project(i, scale).expectedMore <= i.budget;
  for (let play = i.scale.play - 1; play >= 1; play--) {
    if (fits({ ...i.scale, play })) return `Lower "Play a match" from ${i.scale.play} to ${play} in Settings.`;
  }
  for (let win = i.scale.win - 1; win >= 0; win--) {
    if (fits({ ...i.scale, play: 1, win })) return `Lower "Play a match" to 1 and "Win a match" from ${i.scale.win} to ${win} in Settings.`;
  }
  return 'Lower the ticket amounts in Settings, or raise "Tickets available" if you have more tickets.';
}
