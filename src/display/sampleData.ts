// Sample state for previewing the TV before Supabase is set up
// (`#/display?sample`, or automatically when no key is configured).

import { replay } from '../rules/replay';
import type { RulesEvent } from '../rules/types';
import { DEFAULT_SETTINGS, type Player, type Snapshot } from '../data/types';
import { buildModel, type BoardModel } from './model';

const c = ['#ff2d95', '#21d4fd', '#b6ff3b', '#ffc83d', '#a66bff', '#ff8a3d'];
const names: [string, string | null][] = [
  ['Ethan', '🎂'], ['Maya', '🦄'], ['Leo', '🦖'], ['Ava', '⚡'], ['Noah', '🚀'], ['Zoe', null], ['Kai', '🐉'],
  ['Liam', '🍕'], ['Mia', null], ['Owen', '👾'], ['Isla', '🌈'], ['Jack', null], ['Ruby', '🐱'], ['Finn', '🏀'],
  ['Ella', null], ['Max', '🎮'], ['Lily', '🌸'], ['Sam', null], ['Nora', '⭐'], ['Theo', '🐼'],
];

export function sampleModel(): BoardModel {
  const players: Player[] = names.map(([name, emoji], i) => ({
    id: name.toLowerCase(),
    name,
    emoji,
    color: c[i % c.length],
    photo_url: null,
    photo_url_expires: null,
    sort_order: i,
    active: true,
    is_demo: true,
  }));
  const ids = players.map((p) => p.id);
  // Ethan wins a few, loses to Maya, Maya loses back, Ethan goes on a streak.
  const results: [string, string][] = [
    ['ethan', 'maya'], ['ethan', 'leo'], ['ava', 'ethan'], ['ava', 'noah'], ['zoe', 'ava'], ['kai', 'zoe'],
    ['liam', 'kai'], ['mia', 'liam'], ['owen', 'mia'], ['isla', 'owen'], ['jack', 'isla'], ['ruby', 'jack'],
    ['finn', 'ruby'], ['ella', 'finn'], ['max', 'ella'], ['lily', 'max'], ['sam', 'lily'], ['nora', 'sam'],
    ['theo', 'nora'], ['maya', 'theo'], ['leo', 'maya'], ['ethan', 'leo'], ['ethan', 'ava'], ['ethan', 'noah'], ['ethan', 'zoe'],
  ];
  const events: RulesEvent[] = results.map(([w, l], i) => ({
    id: i + 1, kind: 'match', phase: 'koth', winner_id: w, loser_id: l, payload: {}, undone: false,
  }));
  const snap: Snapshot = {
    server_time: new Date().toISOString(),
    settings: DEFAULT_SETTINGS,
    has_pin: false,
    tournament: null,
    players,
    events: [],
    balances: [],
    recent_tickets: [],
  };
  const t = { status: 'live' as const, starting_king_id: 'ethan', queue: ids.slice(1) };
  const d = replay(t, players, events, { defaultFormat: DEFAULT_SETTINGS.matchFormat });
  const balances = Object.fromEntries(ids.map((id) => [id, d.stats[id].played * 2 + d.stats[id].wins * 2 + (d.stats[id].bestStreak >= 3 ? 2 : 0)]));
  return buildModel(snap, d, balances);
}
