import type { RulesEvent } from '../rules/types';
import type { Player } from '../data/types';

const PHASE: Record<string, string> = { semi1: 'Semi 1', semi2: 'Semi 2', final: 'Final' };

export function describeEvent(e: RulesEvent, players: Player[]): string {
  const name = (id: string | null) => players.find((p) => p.id === id)?.name ?? '?';
  switch (e.kind) {
    case 'match':
      return e.phase && e.phase !== 'koth'
        ? `${PHASE[e.phase]} game: ${name(e.winner_id)} beat ${name(e.loser_id)}`
        : `${name(e.winner_id)} beat ${name(e.loser_id)}`;
    case 'queue':
      return 'line change';
    case 'bracket':
      return 'Top-4 bracket start';
    case 'end':
      return 'End tournament';
  }
}
