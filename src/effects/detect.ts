// Pure: which effects should play when the board changes from prev to next.
// Only forward steps celebrate; an undo (or the first load) plays nothing.

import type { BoardModel, BoardPlayer, BoardSeries } from '../display/model';
import { HYPE_WORDS, SHOWER_AT } from './config';
import type { Effect } from './types';

export function detectEffects(prev: BoardModel | null, next: BoardModel): Effect[] {
  if (!prev) return [];
  const out: Effect[] = [];
  const before = new Map(prev.roster.map((p) => [p.id, p]));
  const isBirthday = (p: BoardPlayer) => p.name.trim().toLowerCase() === next.settings.birthdayName.trim().toLowerCase();
  const callUp = (): Effect => ({ type: 'challenger', playerIds: next.challengers.map((p) => p.id), kingId: next.king?.id ?? null });

  // Tickets can come from stations at any time, not just from matches.
  let biggest = 0;
  for (const p of next.roster) {
    const was = before.get(p.id);
    if (was && p.tickets > was.tickets) {
      out.push({ type: 'tickets', playerId: p.id, amount: p.tickets - was.tickets });
      biggest = Math.max(biggest, p.tickets - was.tickets);
    }
  }
  if (biggest >= SHOWER_AT) out.push({ type: 'shower', amount: biggest });

  // Left Right Center: a table just got its winner.
  const r0 = prev.settings.lrc;
  const r1 = next.settings.lrc;
  if (r0 && r1 && r0.id === r1.id) {
    for (const [i, w] of Object.entries(r1.winners)) {
      if (!r0.winners[i]) out.push({ type: 'jackpot', playerId: w.playerId, amount: w.amount });
    }
  }

  // Tournament just started: call up the first challengers.
  if (prev.status === 'setup' && next.status === 'koth' && next.challengers.length) {
    out.push(callUp());
    return out;
  }

  const forward = next.lastEventId != null && (prev.lastEventId == null || next.lastEventId > prev.lastEventId);
  if (!forward) return out;

  if (prev.status === 'koth' && next.status === 'koth') {
    const winner = next.roster.find((p) => p.wins > (before.get(p.id)?.wins ?? 0));
    if (winner) {
      out.push({ type: 'win', playerId: winner.id, gold: isBirthday(winner) });
      out.push({ type: 'hype', word: HYPE_WORDS[next.lastEventId! % HYPE_WORDS.length] });
      const oldKing = prev.king;
      // The king lost on a 3+ streak: siren before the new king is crowned.
      if (oldKing && oldKing.id !== winner.id && oldKing.streak >= 3) {
        out.push({ type: 'upset', playerId: winner.id, kingId: oldKing.id, streak: oldKing.streak });
      }
    }
    if (next.king && prev.king?.id !== next.king.id && winner?.id === next.king.id) out.push({ type: 'newKing', playerId: next.king.id });
    if (winner) {
      if (winner.wins === 1) out.push({ type: 'firstWin', playerId: winner.id });
      // Streak from the result itself (King's Rest resets it right after).
      const streak = prev.king?.id === winner.id ? prev.king.streak + 1 : 1;
      if (streak === 3 || streak === 5 || streak >= 7) out.push({ type: 'streak', playerId: winner.id, streak });
    }
    const ids = next.challengers.map((p) => p.id);
    if (ids.length && (ids.join() !== prev.challengers.map((p) => p.id).join() || next.king?.id !== prev.king?.id)) {
      out.push(callUp());
    }
  }

  if (prev.status === 'koth' && next.status === 'playoff' && next.bracket) {
    const b = next.bracket;
    const seeds = [b.semi1.a, b.semi2.a, b.semi2.b, b.semi1.b].map((p) => p?.id ?? '');
    out.push({ type: 'bracket', seeds });
  }

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
