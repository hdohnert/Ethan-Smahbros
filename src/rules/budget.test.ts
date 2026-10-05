import { describe, expect, it } from 'vitest';
import { projectBudget, type BudgetInput } from './budget';
import { replay } from './replay';
import { DEFAULT_TICKETS } from './tickets';
import type { RulesEvent, RulesPlayer } from './types';

const names = Array.from({ length: 20 }, (_, i) => `Kid${i}`);
const players: RulesPlayer[] = names.map((name, i) => ({ id: name, name, active: true, sort_order: i }));
const T = { status: 'live' as const, starting_king_id: 'Kid0', queue: names.slice(1) };
const base = (over: Partial<BudgetInput> = {}): BudgetInput => ({
  budget: 1000,
  issued: 0,
  d: replay(T, players, [], { defaultFormat: '4-player' }),
  scale: DEFAULT_TICKETS,
  semiBestOf: 1,
  finalBestOf: 3,
  activePlayers: 20,
  sessionMinutes: 75,
  sessionStartedAt: 0,
  now: 0,
  kothMatchTimes: [],
  ...over,
});

describe('projectBudget', () => {
  it('at the start of a 75-minute 4-player session projects about the brief’s 585–700', () => {
    const p = projectBudget(base());
    // 17 matches × 25 + Top 4 60 + final 30 + champion 25 + 5 games × 15
    expect(p.remainingMatches).toBe(17);
    expect(p.expectedMore).toBe(17 * 25 + 60 + 30 + 25 + 5 * 15);
    expect(p.level).toBe('ok');
  });

  it('uses the real average match length once matches have been played', () => {
    const min = 60000;
    const p = projectBudget(base({ now: 30 * min, kothMatchTimes: [5, 10, 15, 20, 25, 30].map((m) => m * min) }));
    // 30 minutes, 6 matches → 5 min each; 45 minutes left → 9 matches
    expect(p.remainingMatches).toBe(9);
  });

  it('warns past 90% issued and flags a projected overrun with a fix', () => {
    expect(projectBudget(base({ issued: 950, d: replay(null, players, []) })).level).not.toBe('ok');
    const p = projectBudget(base({ issued: 500 }));
    expect(p.level).toBe('over');
    expect(p.suggestion).toMatch(/Lower "Play a match" from 5 to \d/);
  });

  it('in the playoff only counts what is still unpaid', () => {
    const seeds = ['Kid0', 'Kid1', 'Kid2', 'Kid3'];
    const ev = (id: number, e: Partial<RulesEvent>): RulesEvent => ({ id, kind: 'match', phase: null, winner_id: null, loser_id: null, payload: {}, undone: false, ...e });
    const events = [ev(1, { kind: 'bracket', payload: { seeds } }), ev(2, { phase: 'semi1', winner_id: 'Kid0', loser_id: 'Kid3', payload: { bestOf: 1 } })];
    const d = replay(T, players, events, { defaultFormat: '4-player', semiBestOf: 1, finalBestOf: 3 });
    const p = projectBudget(base({ d }));
    // semi2 not won: final bonus 15; champion 25; games: semi2 1 + final 3 = 4 × 15
    expect(p.expectedMore).toBe(15 + 25 + 4 * 15);
  });
});

describe('match pace', () => {
  it('ignores a burst of quick test results', () => {
    const p = projectBudget(base({ now: 60000, kothMatchTimes: [10000, 20000, 30000] }));
    expect(p.remainingMatches).toBe(17);
  });
});
