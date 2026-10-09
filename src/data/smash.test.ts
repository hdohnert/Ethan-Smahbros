import { describe, expect, it } from 'vitest';
import { replay } from '../rules/replay';
import { DEFAULT_SETTINGS, smashPlayers, type Player } from './types';

const players: Player[] = ['Ethan', 'Ava', 'Ben', 'Cal', 'Dee'].map((name, i) => ({
  id: name, name, emoji: null, color: null, photo_url: null, photo_url_expires: null, sort_order: i, active: true, is_demo: false,
}));

describe('sitting out Smash', () => {
  it('keeps the kid here but out of the line', () => {
    const snap = { players, settings: { ...DEFAULT_SETTINGS, smashOut: ['Ben'] } };
    const ps = smashPlayers(snap);
    expect(ps.find((p) => p.id === 'Ben')?.active).toBe(false);
    expect(players.find((p) => p.id === 'Ben')?.active).toBe(true);
    const d = replay({ status: 'live', starting_king_id: 'Ethan', queue: ['Ava', 'Ben', 'Cal', 'Dee'] }, ps, [], { defaultFormat: '1v1' });
    expect(d.queue).toEqual(['Ava', 'Cal', 'Dee']);
  });

  it('changes nothing when everyone plays', () => {
    const snap = { players, settings: DEFAULT_SETTINGS };
    expect(smashPlayers(snap)).toBe(players);
  });
});
