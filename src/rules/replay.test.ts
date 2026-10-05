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
    expect(d.standings).toEqual(['Ethan', 'Cal', 'Dee', 'Ben', 'Ava']);
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

describe('4-player matches', () => {
  const opts = { defaultFormat: '4-player' as const };
  const m4 = (winner: string, losers: string[]): RulesEvent => ({
    id: nextId++, kind: 'match', phase: 'koth', winner_id: winner, loser_id: losers[0], payload: { losers }, undone: false,
  });

  it('the king faces the next 3 in line', () => {
    const d = replay(T, players, [], opts);
    expect(d.king).toBe('Ethan');
    expect(d.challengers).toEqual(['Ava', 'Ben', 'Cal']);
    expect(d.challenger).toBe('Ava');
  });

  it('winner is king, all losers go to the back in line order', () => {
    const d = replay(T, players, [m4('Ben', ['Ethan', 'Ava', 'Cal'])], opts);
    expect(d.king).toBe('Ben');
    expect(d.queue).toEqual(['Dee', 'Ethan', 'Ava', 'Cal']);
    expect(d.challengers).toEqual(['Dee', 'Ethan', 'Ava']);
    expect(d.stats.Ben).toMatchObject({ wins: 1, played: 1, streak: 1 });
    for (const id of ['Ethan', 'Ava', 'Cal']) expect(d.stats[id]).toMatchObject({ losses: 1, played: 1, streak: 0 });
    expect(d.stats.Ethan.formerKing).toBe(true);
  });

  it('pays every loser for playing, and Giant Slayer when the king falls on a streak', () => {
    const events = [m4('Ethan', ['Ava', 'Ben', 'Cal']), m4('Ethan', ['Dee', 'Ava', 'Ben']), m4('Ethan', ['Cal', 'Dee', 'Ava'])];
    const d = replay(T, players, events, opts);
    expect(d.stats.Ethan.streak).toBe(3);
    const r = kothResult(d, 'Ben', ['Ethan', 'Cal', 'Dee'], DEFAULT_TICKETS, true);
    expect(r.awards.filter((a) => a.reason === 'Played a match').map((a) => a.player_id)).toEqual(['Ethan', 'Cal', 'Dee']);
    expect(r.awards).toContainEqual({ player_id: 'Ben', amount: 4, reason: 'Won a match' });
    expect(r.awards).toContainEqual({ player_id: 'Ben', amount: 3, reason: 'Giant Slayer bonus' });
  });

  it('uses everyone who is here when fewer than 4 kids are active', () => {
    const three = players.slice(0, 3);
    const d = replay({ ...T, queue: ['Ava', 'Ben'] }, three, [], opts);
    expect(d.challengers).toEqual(['Ava', 'Ben']);
    const two = players.slice(0, 2);
    expect(replay({ ...T, queue: ['Ava'] }, two, [], opts).challengers).toEqual(['Ava']);
  });

  it("King's Rest after 5 straight wins sends the king back and crowns the front of the line", () => {
    const d = replay(T, players, [m4('Ethan', ['Ava', 'Ben', 'Cal']), { ...m4('Ethan', ['Dee', 'Ava', 'Ben']), payload: { losers: ['Dee', 'Ava', 'Ben'], rest: true } }], opts);
    expect(d.king).toBe('Cal');
    expect(d.queue).toEqual(['Dee', 'Ava', 'Ben', 'Ethan']);
    expect(d.stats.Ethan.streak).toBe(0);
    expect(d.stats.Ethan.bestStreak).toBe(2);
  });

  it('flags rest at the 5th straight win in 4-player', () => {
    const wins = [
      m4('Ethan', ['Ava', 'Ben', 'Cal']), m4('Ethan', ['Dee', 'Ava', 'Ben']), m4('Ethan', ['Cal', 'Dee', 'Ava']),
      m4('Ethan', ['Ben', 'Cal', 'Dee']),
    ];
    const d = replay(T, players, wins, opts);
    expect(kothResult(d, 'Ethan', d.challengers, DEFAULT_TICKETS, true).rest).toBe(true);
    expect(kothResult(d, 'Ava', ['Ethan', ...d.challengers.filter((c) => c !== 'Ava')], DEFAULT_TICKETS, true).rest).toBe(false);
  });

  it('undo of a 4-player match restores everything', () => {
    const e = m4('Dee', ['Ethan', 'Ava', 'Ben']);
    expect(replay(T, players, [{ ...e, undone: true }], opts)).toEqual(replay(T, players, [], opts));
  });
});

describe('format changes', () => {
  const switchTo = (format: '1v1' | '4-player', order: string[]): RulesEvent => ({
    id: nextId++, kind: 'queue', phase: null, winner_id: null, loser_id: null, payload: { order, format }, undone: false,
  });

  it('a format step changes who plays next, and Undo switches it back exactly', () => {
    const e1 = m('Ethan', 'Ava');
    const before = replay(T, players, [e1], { defaultFormat: '1v1' });
    expect(before.challengers).toEqual(['Ben']);
    const sw = switchTo('4-player', before.queue);
    const after = replay(T, players, [e1, sw], { defaultFormat: '1v1' });
    expect(after.format).toBe('4-player');
    expect(after.challengers).toEqual(['Ben', 'Cal', 'Dee']);
    expect(replay(T, players, [e1, { ...sw, undone: true }], { defaultFormat: '1v1' })).toEqual(before);
  });

  it('matches played in either format replay the same after a switch', () => {
    const m4 = (winner: string, losers: string[]): RulesEvent => ({
      id: nextId++, kind: 'match', phase: 'koth', winner_id: winner, loser_id: losers[0], payload: { losers, format: '4-player' }, undone: false,
    });
    const events = [m('Ethan', 'Ava'), switchTo('4-player', ['Ben', 'Cal', 'Dee', 'Ava']), m4('Cal', ['Ethan', 'Ben', 'Dee'])];
    const d = replay(T, players, events, { defaultFormat: '1v1' });
    expect(d.king).toBe('Cal');
    expect(d.queue).toEqual(['Ava', 'Ethan', 'Ben', 'Dee']);
    expect(d.stats.Ethan).toMatchObject({ wins: 1, losses: 1, played: 2 });
    const undone = replay(T, players, [...events.slice(0, 2), { ...events[2], undone: true }], { defaultFormat: '1v1' });
    expect(undone).toEqual(replay(T, players, events.slice(0, 2), { defaultFormat: '1v1' }));
  });
});

describe('series length', () => {
  const seeds = ['Ethan', 'Ava', 'Ben', 'Cal'];
  const bo = (phase: Phase, winner: string, loser: string, bestOf: number) => ({ ...game(phase, winner, loser), payload: { bestOf } });

  it('best of 1: one win takes a semifinal', () => {
    const d = replay(T, players, [bracket(seeds), bo('semi1', 'Cal', 'Ethan', 1)], { semiBestOf: 1, finalBestOf: 3 });
    expect(d.bracket?.semi1).toMatchObject({ winner: 'Cal', bestOf: 1, need: 1 });
    expect(d.bracket?.semi2).toMatchObject({ winner: null, bestOf: 1 });
    expect(d.bracket?.final).toMatchObject({ bestOf: 3, need: 2 });
    expect(playoffGameTickets(d.bracket!.semi2, 'Ava', DEFAULT_TICKETS)).toContainEqual({ player_id: 'Ava', amount: 5, reason: 'Reached the final' });
  });

  it('best of 3: needs 2 wins; best of 5 needs 3', () => {
    let d = replay(T, players, [bracket(seeds), bo('semi1', 'Ethan', 'Cal', 3)], { semiBestOf: 3 });
    expect(d.bracket?.semi1).toMatchObject({ winsA: 1, winner: null, need: 2 });
    d = replay(T, players, [bracket(seeds), bo('semi1', 'Ethan', 'Cal', 5), bo('semi1', 'Ethan', 'Cal', 5)], { semiBestOf: 5 });
    expect(d.bracket?.semi1).toMatchObject({ winsA: 2, winner: null, need: 3 });
  });

  it('a series keeps the length it started with when the setting changes', () => {
    const events = [bracket(seeds), bo('semi1', 'Ethan', 'Cal', 3)];
    const d = replay(T, players, events, { semiBestOf: 1 });
    expect(d.bracket?.semi1).toMatchObject({ bestOf: 3, winner: null });
    expect(d.bracket?.semi2).toMatchObject({ bestOf: 1 });
  });

  it('undo across a best-of-1 series end reopens it', () => {
    const end = bo('semi1', 'Cal', 'Ethan', 1);
    const d = replay(T, players, [bracket(seeds), { ...end, undone: true }], { semiBestOf: 1 });
    expect(d.bracket?.semi1).toMatchObject({ winner: null, winsA: 0, winsB: 0 });
    expect(d.currentSeries?.id).toBe('semi1');
  });
});

describe('no ties in seeding', () => {
  it('breaks a tie at 4th by who reached their score first', () => {
    // Ethan 2 wins; Ava, Ben, Cal, Dee each 1 win, 0-1 losses, best streak 1.
    const events = [m('Ethan', 'Ava'), m('Ethan', 'Ben'), m('Cal', 'Ethan'), m('Dee', 'Cal'), m('Ava', 'Dee'), m('Ben', 'Ava')];
    const d = replay(T, players, events);
    // Tied on wins and streak: Cal (1L), Dee (1L), Ava (2L), Ben (1L). Among 1-loss kids, Cal won first, then Dee, then Ben.
    expect(d.standings).toEqual(['Ethan', 'Cal', 'Dee', 'Ben', 'Ava']);
    const s = seedTop4(d, players);
    expect(s).toEqual({ ok: true, seeds: ['Ethan', 'Cal', 'Dee', 'Ben'] });
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
