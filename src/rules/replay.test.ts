import { describe, expect, it } from 'vitest';
import { replay, seedTop4 } from './replay';
import { DEFAULT_TICKETS, kothResult, playoffGameTickets, top4Tickets } from './tickets';
import type { Phase, RulesEvent, RulesPlayer, RulesTournament } from './types';

const names = ['Ethan', 'Ava', 'Ben', 'Cal', 'Dee'];
const players: RulesPlayer[] = names.map((name, i) => ({ id: name, name, active: true, sort_order: i }));
const T: RulesTournament = { status: 'live', starting_king_id: 'Ethan', queue: ['Ava', 'Ben', 'Cal', 'Dee'] };

let nextId = 1;
const m = (winner: string, loser: string, extra: Partial<RulesEvent> = {}): RulesEvent => ({
  id: nextId++,
  kind: 'match',
  phase: 'koth',
  winner_id: winner,
  loser_id: loser,
  payload: {},
  undone: false,
  ...extra,
});
const game = (phase: Phase, winner: string, loser: string) => m(winner, loser, { phase });
const bracket = (seeds: string[]): RulesEvent => ({
  id: nextId++,
  kind: 'bracket',
  phase: null,
  winner_id: null,
  loser_id: null,
  payload: { seeds },
  undone: false,
});
const undo = (events: RulesEvent[]) => {
  const live = events.filter((e) => !e.undone);
  return events.map((e) => (e === live[live.length - 1] ? { ...e, undone: true } : e));
};

describe('queue rotation', () => {
  it('starts with the starting king against the front of the line', () => {
    const d = replay(T, players, []);
    expect(d.king).toBe('Ethan');
    expect(d.challenger).toBe('Ava');
    expect(d.queue).toEqual(['Ava', 'Ben', 'Cal', 'Dee']);
  });

  it('keeps the winning king on and sends the loser to the back', () => {
    const d = replay(T, players, [m('Ethan', 'Ava')]);
    expect(d.king).toBe('Ethan');
    expect(d.queue).toEqual(['Ben', 'Cal', 'Dee', 'Ava']);
  });

  it('crowns a winning challenger and sends the old king to the back', () => {
    const d = replay(T, players, [m('Ava', 'Ethan')]);
    expect(d.king).toBe('Ava');
    expect(d.queue).toEqual(['Ben', 'Cal', 'Dee', 'Ethan']);
    expect(d.stats.Ethan.formerKing).toBe(true);
  });

  it('applies queue reorders and drops inactive players from line', () => {
    const reorder: RulesEvent = {
      id: nextId++, kind: 'queue', phase: null, winner_id: null, loser_id: null, undone: false,
      payload: { order: ['Dee', 'Ava', 'Ben', 'Cal'] },
    };
    const away = players.map((p) => (p.id === 'Ava' ? { ...p, active: false } : p));
    const d = replay(T, away, [reorder]);
    expect(d.queue).toEqual(['Dee', 'Ben', 'Cal']);
    expect(d.challenger).toBe('Dee');
  });

  it('adds new players to the back of the line', () => {
    const more = [...players, { id: 'Eve', name: 'Eve', active: true, sort_order: 9 }];
    expect(replay(T, more, [m('Ethan', 'Ava')]).queue).toEqual(['Ben', 'Cal', 'Dee', 'Ava', 'Eve']);
  });

  it("king's rest sends the king to the back and promotes the front of the line", () => {
    const d = replay(T, players, [m('Ethan', 'Ava', { payload: { rest: true } })]);
    expect(d.king).toBe('Ben');
    expect(d.queue).toEqual(['Cal', 'Dee', 'Ava', 'Ethan']);
    expect(d.stats.Ethan.streak).toBe(0);
    expect(d.stats.Ethan.bestStreak).toBe(1);
  });
});

describe('streak math', () => {
  it('counts current and best streaks and resets on a loss', () => {
    const d = replay(T, players, [m('Ethan', 'Ava'), m('Ethan', 'Ben'), m('Ethan', 'Cal'), m('Dee', 'Ethan'), m('Ethan', 'Dee')]);
    expect(d.stats.Ethan).toMatchObject({ wins: 4, losses: 1, streak: 1, bestStreak: 3, played: 5 });
    expect(d.stats.Dee).toMatchObject({ wins: 1, losses: 1, streak: 0, giantSlayer: 1 });
  });

  it('pays streak and Giant Slayer bonuses once, at the right moment', () => {
    let events: RulesEvent[] = [m('Ethan', 'Ava'), m('Ethan', 'Ben')];
    let d = replay(T, players, events);
    const third = kothResult(d, 'Ethan', 'Cal', DEFAULT_TICKETS, true);
    expect(third.awards).toContainEqual({ player_id: 'Ethan', amount: 2, reason: '3-win streak bonus' });
    expect(third.rest).toBe(false);
    events = [...events, m('Ethan', 'Cal')];
    d = replay(T, players, events);
    const fourth = kothResult(d, 'Ethan', 'Dee', DEFAULT_TICKETS, true);
    expect(fourth.awards.map((a) => a.reason)).toEqual(['Played a match', 'Won a match']);
    const slayer = kothResult(d, 'Dee', 'Ethan', DEFAULT_TICKETS, true);
    expect(slayer.awards).toContainEqual({ player_id: 'Dee', amount: 3, reason: 'Giant Slayer bonus' });
    events = [...events, m('Ethan', 'Dee')];
    d = replay(T, players, events);
    const fifth = kothResult(d, 'Ethan', 'Ava', DEFAULT_TICKETS, true);
    expect(fifth.awards).toContainEqual({ player_id: 'Ethan', amount: 3, reason: '5-win streak bonus' });
    expect(fifth.rest).toBe(true);
    expect(kothResult(d, 'Ethan', 'Ava', DEFAULT_TICKETS, false).rest).toBe(false);
  });

  it('pays 2 for playing and 4 for winning', () => {
    const r = kothResult(replay(T, players, []), 'Ava', 'Ethan', DEFAULT_TICKETS, true);
    expect(r.awards).toEqual([
      { player_id: 'Ethan', amount: 2, reason: 'Played a match' },
      { player_id: 'Ava', amount: 4, reason: 'Won a match' },
    ]);
  });
});

describe('tiebreak order', () => {
  it('ranks by wins, then best streak, then fewest losses, then name', () => {
    // Ethan 2W (best 2), Ava 1W (best 1) 1L, Ben 1W best 1 1L, Cal 0
    const d = replay(T, players, [m('Ethan', 'Ava'), m('Ethan', 'Ben'), m('Cal', 'Ethan'), m('Dee', 'Cal'), m('Ava', 'Dee'), m('Ben', 'Ava')]);
    // Wins: Ethan 2, Cal 1, Dee 1, Ava 1, Ben 1. All non-Ethan best 1. Losses: Cal1 Dee1 Ava2 Ben1.
    expect(d.standings).toEqual(['Ethan', 'Ben', 'Cal', 'Dee', 'Ava']);
  });
});

describe('seeding', () => {
  it('seeds the top 4 and pairs 1v4, 2v3', () => {
    const events = [m('Ethan', 'Ava'), m('Ethan', 'Ben'), m('Cal', 'Ethan'), m('Cal', 'Dee')];
    const d = replay(T, players, events);
    const s = seedTop4(d, players);
    expect(s).toEqual({ ok: true, seeds: ['Cal', 'Ethan', 'Ava', 'Ben'] });
    if (!s.ok) return;
    const b = replay(T, players, [...events, bracket(s.seeds)]);
    expect(b.status).toBe('playoff');
    expect(b.bracket?.semi1).toMatchObject({ a: 'Cal', b: 'Ben' });
    expect(b.bracket?.semi2).toMatchObject({ a: 'Ethan', b: 'Ava' });
    expect(top4Tickets(s.seeds, DEFAULT_TICKETS)).toHaveLength(4);
  });

  it('blocks the bracket with fewer than 4 players and says why', () => {
    const three = players.slice(0, 3);
    const s = seedTop4(replay({ ...T, queue: ['Ava', 'Ben'] }, three, []), three);
    expect(s).toEqual({ ok: false, reason: 'Need at least 4 active players for the Top-4 bracket (you have 3).' });
  });
});

describe('best-of-3 completion', () => {
  const seeds = ['Ethan', 'Ava', 'Ben', 'Cal'];
  it('ends each series at 2 wins and crowns the final winner', () => {
    const events = [
      bracket(seeds),
      game('semi1', 'Ethan', 'Cal'),
      game('semi1', 'Cal', 'Ethan'),
      game('semi1', 'Ethan', 'Cal'),
      game('semi2', 'Ben', 'Ava'),
      game('semi2', 'Ben', 'Ava'),
    ];
    let d = replay(T, players, events);
    expect(d.bracket?.semi1).toMatchObject({ winsA: 2, winsB: 1, winner: 'Ethan' });
    expect(d.bracket?.final).toMatchObject({ a: 'Ethan', b: 'Ben', winner: null });
    expect(d.currentSeries?.id).toBe('final');
    expect(playoffGameTickets(d.currentSeries!, 'Ben', DEFAULT_TICKETS)).toEqual([
      { player_id: 'Ethan', amount: 2, reason: 'Played a playoff game' },
      { player_id: 'Ben', amount: 4, reason: 'Won a playoff game' },
    ]);

    d = replay(T, players, [...events, game('final', 'Ben', 'Ethan')]);
    expect(playoffGameTickets(d.currentSeries!, 'Ben', DEFAULT_TICKETS)).toContainEqual({
      player_id: 'Ben', amount: 10, reason: 'Champion!',
    });
    d = replay(T, players, [...events, game('final', 'Ben', 'Ethan'), game('final', 'Ben', 'Ethan')]);
    expect(d.champion).toBe('Ben');
    expect(d.status).toBe('finished');
    expect(d.currentSeries).toBeNull();
  });

  it('ignores extra games once a series is decided', () => {
    const d = replay(T, players, [bracket(seeds), game('semi1', 'Ethan', 'Cal'), game('semi1', 'Ethan', 'Cal'), game('semi1', 'Cal', 'Ethan')]);
    expect(d.bracket?.semi1).toMatchObject({ winsA: 2, winsB: 0, winner: 'Ethan' });
  });
});

describe('deleted players', () => {
  it('ignores matches and brackets that refer to a deleted player', () => {
    const events = [m('Ethan', 'Ava'), bracket(['Ethan', 'Ava', 'Ben', 'Cal'])];
    const withoutCal = players.filter((p) => p.id !== 'Cal');
    const d = replay(T, withoutCal, events);
    expect(d.status).toBe('koth');
    expect(d.bracket).toBeNull();
    expect(d.stats.Ethan.wins).toBe(1);
  });

  it('promotes the front of the line when the starting king was deleted', () => {
    const d = replay(T, players.filter((p) => p.id !== 'Ethan'), []);
    expect(d.king).toBe('Ava');
    expect(d.challenger).toBe('Ben');
  });
});

describe('undo', () => {
  it('reverses a king change, restoring king, line and stats', () => {
    const before = [m('Ethan', 'Ava'), m('Ethan', 'Ben'), m('Ethan', 'Cal')];
    const after = [...before, m('Dee', 'Ethan')];
    expect(replay(T, players, after).king).toBe('Dee');
    const d = replay(T, players, undo(after));
    expect(d).toEqual(replay(T, players, before.concat({ ...after[3], undone: true })));
    expect(d.king).toBe('Ethan');
    expect(d.challenger).toBe('Dee');
    expect(d.stats.Ethan).toMatchObject({ streak: 3, formerKing: false });
    expect(d.stats.Dee.giantSlayer).toBe(0);
  });

  it('reverses a series end, reopening the series and clearing the champion', () => {
    const seeds = ['Ethan', 'Ava', 'Ben', 'Cal'];
    let events = [
      bracket(seeds),
      game('semi1', 'Ethan', 'Cal'), game('semi1', 'Ethan', 'Cal'),
      game('semi2', 'Ava', 'Ben'), game('semi2', 'Ava', 'Ben'),
      game('final', 'Ava', 'Ethan'), game('final', 'Ava', 'Ethan'),
    ];
    expect(replay(T, players, events).champion).toBe('Ava');
    events = undo(events);
    let d = replay(T, players, events);
    expect(d.champion).toBeNull();
    expect(d.status).toBe('playoff');
    expect(d.bracket?.final).toMatchObject({ winsA: 0, winsB: 1, winner: null });
    // Undo twice more: semi2 is reopened and the final loses its second player.
    events = undo(undo(events));
    d = replay(T, players, events);
    expect(d.bracket?.semi2).toMatchObject({ winsA: 1, winner: null });
    expect(d.bracket?.final.b).toBeNull();
    expect(d.currentSeries?.id).toBe('semi2');
  });

  it('allows repeated undos back to the start', () => {
    let events = [m('Ava', 'Ethan'), m('Ava', 'Ben')];
    events = undo(undo(events));
    expect(replay(T, players, events)).toMatchObject({ king: 'Ethan', challenger: 'Ava', lastEvent: null });
  });
});
