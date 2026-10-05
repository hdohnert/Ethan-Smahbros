import { describe, expect, it } from 'vitest';
import { replay } from '../rules/replay';
import type { RulesEvent } from '../rules/types';
import { DEFAULT_SETTINGS, type Player, type Snapshot } from '../data/types';
import { buildModel } from '../display/model';
import { detectEffects } from './detect';

const names = ['Ethan', 'Ava', 'Ben', 'Cal', 'Dee'];
const players: Player[] = names.map((name, i) => ({
  id: name, name, emoji: null, color: null, photo_url: null, photo_url_expires: null, sort_order: i, active: true, is_demo: false,
}));

function board(events: RulesEvent[], status: 'setup' | 'live' = 'live', balances: Record<string, number> = {}) {
  const t = { id: 't', status, starting_king_id: 'Ethan', queue: names.slice(1), ticket_bank_id: 'b', is_demo: false, version: 0, created_at: '' };
  const snap: Snapshot = {
    server_time: '', settings: DEFAULT_SETTINGS, has_pin: false, tournament: t, players,
    events: events as Snapshot['events'], balances: [], recent_tickets: [],
  };
  return buildModel(snap, replay(t, players, events), balances);
}

let id = 1;
const m = (w: string, l: string, phase: RulesEvent['phase'] = 'koth'): RulesEvent =>
  ({ id: id++, kind: 'match', phase, winner_id: w, loser_id: l, payload: {}, undone: false });
const bracket = (seeds: string[]): RulesEvent =>
  ({ id: id++, kind: 'bracket', phase: null, winner_id: null, loser_id: null, payload: { seeds }, undone: false });
const types = (xs: { type: string }[]) => xs.map((x) => x.type);

describe('detectEffects', () => {
  it('plays nothing on first load', () => {
    expect(detectEffects(null, board([m('Ethan', 'Ava')]))).toEqual([]);
  });

  it('a king win: KO flash (gold for the birthday kid) and the next challenger', () => {
    const e1 = m('Ethan', 'Ava');
    const fx = detectEffects(board([]), board([e1]));
    expect(fx).toContainEqual({ type: 'win', playerId: 'Ethan', gold: true });
    expect(fx).toContainEqual({ type: 'challenger', playerIds: ['Ben'] });
    expect(types(fx)).not.toContain('newKing');
  });

  it('a challenger win crowns a new king', () => {
    const fx = detectEffects(board([]), board([m('Ava', 'Ethan')]));
    expect(fx).toContainEqual({ type: 'win', playerId: 'Ava', gold: false });
    expect(fx).toContainEqual({ type: 'newKing', playerId: 'Ava' });
  });

  it('undo plays nothing', () => {
    const e1 = m('Ethan', 'Ava');
    const e2 = m('Ben', 'Ethan');
    const before = board([e1, e2]);
    const after = board([e1, { ...e2, undone: true }]);
    expect(detectEffects(before, after)).toEqual([]);
  });

  it('ticket increases fly in, decreases do not', () => {
    expect(detectEffects(board([], 'live', { Ava: 2 }), board([], 'live', { Ava: 5, Ben: 0 }))).toEqual([
      { type: 'tickets', playerId: 'Ava', amount: 3 },
    ]);
    expect(detectEffects(board([], 'live', { Ava: 5 }), board([], 'live', { Ava: 0 }))).toEqual([]);
  });

  it('starting the tournament calls up the first challenger', () => {
    expect(detectEffects(board([], 'setup'), board([], 'live'))).toEqual([{ type: 'challenger', playerIds: ['Ava'] }]);
  });

  it('bracket, series won, final intro and champion', () => {
    const seeds = ['Ethan', 'Ava', 'Ben', 'Cal'];
    const b = bracket(seeds);
    expect(types(detectEffects(board([]), board([b])))).toEqual(['bracket']);

    const s1 = [b, m('Ethan', 'Cal', 'semi1')];
    const s2 = [...s1, m('Ethan', 'Cal', 'semi1')];
    const fx = detectEffects(board(s1), board(s2));
    expect(fx).toContainEqual({ type: 'seriesWon', playerId: 'Ethan', toFinal: true });

    const s3 = [...s2, m('Ava', 'Ben', 'semi2')];
    const s4 = [...s3, m('Ava', 'Ben', 'semi2')];
    expect(detectEffects(board(s3), board(s4))).toContainEqual({ type: 'finalIntro', a: 'Ethan', b: 'Ava' });

    const s5 = [...s4, m('Ethan', 'Ava', 'final')];
    const s6 = [...s5, m('Ethan', 'Ava', 'final')];
    expect(detectEffects(board(s5), board(s6))).toContainEqual({ type: 'champion', playerId: 'Ethan', birthday: true });
  });
});
