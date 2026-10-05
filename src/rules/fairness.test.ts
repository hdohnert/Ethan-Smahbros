import { describe, expect, it } from 'vitest';
import { catchUpPicks, fairness } from './fairness';
import { replay } from './replay';
import type { RulesEvent, RulesPlayer, RulesTournament } from './types';

const names = ['Ethan', 'Ava', 'Ben', 'Cal', 'Dee', 'Eli'];
const players: RulesPlayer[] = names.map((name, i) => ({ id: name, name, active: true, sort_order: i }));
const T: RulesTournament = { status: 'live', starting_king_id: 'Ethan', queue: ['Ava', 'Ben', 'Cal', 'Dee', 'Eli'] };
let id = 1;
const m = (winner: string, loser: string, payload: RulesEvent['payload'] = {}): RulesEvent => ({
  id: id++, kind: 'match', phase: 'koth', winner_id: winner, loser_id: loser, payload, undone: false,
});

describe('fairness', () => {
  it('lists kids 2+ games under the average as behind', () => {
    // Ethan keeps winning; Ava and Ben play twice each, the rest not yet... plus a late kid.
    const late: RulesPlayer = { id: 'Zed', name: 'Zed', active: true, sort_order: 9 };
    const ev = [m('Ethan', 'Ava'), m('Ethan', 'Ben'), m('Ethan', 'Cal'), m('Ethan', 'Dee'), m('Ethan', 'Eli'), m('Ethan', 'Ava'), m('Ethan', 'Ben')];
    const d = replay(T, [...players, late], ev, { defaultFormat: '1v1' });
    const f = fairness(d, [...players, late]);
    expect(f.max).toBe(7);
    expect(f.min).toBe(0);
    expect(f.behind.map((r) => r.id)).toContain('Zed');
    expect(f.behind.map((r) => r.id)).not.toContain('Ethan');
  });

  it('moves the late kid up front, and the move is part of the match event', () => {
    const late: RulesPlayer = { id: 'Zed', name: 'Zed', active: true, sort_order: 9 };
    const all = [...players, late];
    const lap = () => ['Ava', 'Ben', 'Cal', 'Dee', 'Eli'].map((k) => m('Ethan', k));
    const ev = [...lap(), ...lap()];
    const before = replay(T, all, ev, { defaultFormat: '1v1' });
    expect(before.queue[before.queue.length - 1]).toBe('Zed');
    const next = m('Ethan', 'Ava');
    const after = replay(T, all, [...ev, next], { defaultFormat: '1v1' });
    const picks = catchUpPicks(after, all, ['Ethan', 'Ava']);
    expect(picks).toEqual(['Zed']);
    const withCatchUp = replay(T, all, [...ev, { ...next, payload: { catchUp: picks } }], { defaultFormat: '1v1' });
    expect(withCatchUp.challenger).toBe('Zed');
    // Undo the match: the line is exactly as it was.
    const undone = replay(T, all, [...ev, { ...next, payload: { catchUp: picks }, undone: true }], { defaultFormat: '1v1' });
    expect(undone.queue).toEqual(before.queue);
  });

  it('never picks someone who just played, and does nothing when the behind kids are already next', () => {
    const ev = [m('Ethan', 'Ava')];
    const d = replay(T, players, ev, { defaultFormat: '1v1' });
    expect(catchUpPicks(d, players, ['Ethan', 'Ava'])).toEqual([]);
  });
});
