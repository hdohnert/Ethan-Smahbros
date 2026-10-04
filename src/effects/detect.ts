// Pure: which effects should play when the board changes from prev to next.
// Only forward steps celebrate; an undo (or the first load) plays nothing.

import type { BoardModel, BoardPlayer, BoardSeries } from '../display/model';
import type { Effect } from './types';

export function detectEffects(prev: BoardModel | null, next: BoardModel): Effect[] {
  if (!prev) return [];
  const out: Effect[] = [];
  const before = new Map(prev.roster.map((p) => [p.id, p]));
  const isBirthday = (p: BoardPlayer) => p.name.trim().toLowerCase() === next.settings.birthdayName.trim().toLowerCase();

  // Tickets can come from stations at any time, not just from matches.
  for (const p of next.roster) {
    const was = before.get(p.id);
    if (was && p.tickets > was.tickets) out.push({ type: 'tickets', playerId: p.id, amount: p.tickets - was.tickets });
  }

  // Tournament just started: call up the first challenger.
  if (prev.status === 'setup' && next.status === 'koth' && next.challenger) {
    out.push({ type: 'challenger', playerId: next.challenger.id });
    return out;
  }

  const forward = next.lastEventId != null && (prev.lastEventId == null || next.lastEventId > prev.lastEventId);
  if (!forward) return out;

  if (prev.status === 'koth' && next.status === 'koth') {
    const winner = next.roster.find((p) => p.wins > (before.get(p.id)?.wins ?? 0));
    if (winner) out.push({ type: 'win', playerId: winner.id, gold: isBirthday(winner) });
    if (next.king && prev.king?.id !== next.king.id) out.push({ type: 'newKing', playerId: next.king.id });
    if (next.challenger && (next.challenger.id !== prev.challenger?.id || next.king?.id !== prev.king?.id)) {
      out.push({ type: 'challenger', playerId: next.challenger.id });
    }
  }

  if (prev.status === 'koth' && next.status === 'playoff') out.push({ type: 'bracket' });

  if (next.bracket && prev.bracket) {
    for (const id of ['semi1', 'semi2', 'final'] as const) {
      const a = prev.bracket[id];
      const b = next.bracket[id];
      const gameWinner = pipWinner(a, b);
      if (gameWinner) out.push({ type: 'win', playerId: gameWinner.id, gold: isBirthday(gameWinner) });
      if (!a.winner && b.winner && id !== 'final') out.push({ type: 'seriesWon', playerId: b.winner.id, toFinal: true });
    }
    const f0 = prev.bracket.final;
    const f1 = next.bracket.final;
    if (!(f0.a && f0.b) && f1.a && f1.b) out.push({ type: 'finalIntro', a: f1.a.id, b: f1.b.id });
  }

  if (!prev.champion && next.champion) {
    out.push({ type: 'champion', playerId: next.champion.id, birthday: isBirthday(next.champion) });
  }
  return out;
}

function pipWinner(a: BoardSeries, b: BoardSeries): BoardPlayer | null {
  if (b.winsA > a.winsA) return b.a;
  if (b.winsB > a.winsB) return b.b;
  return null;
}
