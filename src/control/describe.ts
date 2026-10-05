import type { RulesEvent } from '../rules/types';
import type { Player } from '../data/types';

const PHASE: Record<string, string> = { semi1: 'Semi 1', semi2: 'Semi 2', final: 'Final' };

export function describeEvent(e: RulesEvent, players: Player[]): string {
  const name = (id: string | null) => players.find((p) => p.id === id)?.name ?? '?';
  switch (e.kind) {
    case 'match':
      return e.phase && e.phase !== 'koth'
        ? `${PHASE[e.phase]} game: ${name(e.winner_id)} beat ${name(e.loser_id)}`
        : ((e.payload as { losers?: string[] } | null)?.losers?.length ?? 0) > 1
          ? `${name(e.winner_id)} won a ${(e.payload as { losers: string[] }).losers.length + 1}-player match`
          : `${name(e.winner_id)} beat ${name(e.loser_id)}`;
    case 'queue': {
      const format = (e.payload as { format?: string } | null)?.format;
      return format ? `switch to ${format}` : 'line change';
    }
    case 'bracket':
      return 'Top-4 bracket start';
    case 'end':
      return 'End tournament';
  }
}
