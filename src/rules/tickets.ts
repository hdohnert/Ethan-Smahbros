// Ticket math for the tournament. Pure. Control calls these right before it
// records an event, and stores the awards linked to that event so undoing the
// event removes exactly those tickets.

import type { Derived, Series, TicketAward, TicketScale } from './types';

/** Night of 20 kids against 1,000 physical tickets: about 585 from the tournament. */
export const DEFAULT_TICKETS: TicketScale = {
  play: 5,
  win: 5,
  streak3: 5,
  streak5: 10,
  giantSlayer: 10,
  top4: 15,
  final: 15,
  champion: 25,
};

/** Bumped when DEFAULT_TICKETS changes, so Control rewrites saved amounts once. */
export const TICKET_SCALE_VERSION = 2;

export const REST_STREAK = 5;

/** Tickets and king's-rest decision for a King of the Hill result (any number of losers). */
export function kothResult(
  d: Derived,
  winner: string,
  losers: string | string[],
  scale: TicketScale,
  kingsRest: boolean,
): { awards: TicketAward[]; rest: boolean } {
  const awards: TicketAward[] = [];
  const all = (Array.isArray(losers) ? losers : [losers]).filter((l) => l !== winner);
  const newStreak = (d.stats[winner]?.streak ?? 0) + 1;

  for (const loser of all) awards.push({ player_id: loser, amount: scale.play, reason: 'Played a match' });
  awards.push({ player_id: winner, amount: scale.play + scale.win, reason: 'Won a match' });
  if (newStreak === 3 && scale.streak3) awards.push({ player_id: winner, amount: scale.streak3, reason: '3-win streak bonus' });
  if (newStreak === 5 && scale.streak5) awards.push({ player_id: winner, amount: scale.streak5, reason: '5-win streak bonus' });
  if (d.king && all.includes(d.king) && winner !== d.king && (d.stats[d.king]?.streak ?? 0) >= 3 && scale.giantSlayer) {
    awards.push({ player_id: winner, amount: scale.giantSlayer, reason: 'Giant Slayer bonus' });
  }
  return { awards: awards.filter((a) => a.amount > 0), rest: kingsRest && newStreak >= REST_STREAK };
}

/**
 * Tickets for one playoff game. Every game pays like a regular match (play +
 * win), and the game that ends a series adds the final/champion bonus.
 */
export function playoffGameTickets(s: Series, winner: string, scale: TicketScale): TicketAward[] {
  const loser = winner === s.a ? s.b! : s.a!;
  const awards: TicketAward[] = [
    { player_id: loser, amount: scale.play, reason: 'Played a playoff game' },
    { player_id: winner, amount: scale.play + scale.win, reason: 'Won a playoff game' },
  ];
  const wins = (winner === s.a ? s.winsA : s.winsB) + 1;
  if (wins >= s.need) {
    if (s.id === 'final') awards.push({ player_id: winner, amount: scale.champion, reason: 'Champion!' });
    else awards.push({ player_id: winner, amount: scale.final, reason: 'Reached the final' });
  }
  return awards.filter((a) => a.amount > 0);
}

export function top4Tickets(seeds: string[], scale: TicketScale): TicketAward[] {
  return scale.top4 ? seeds.map((id) => ({ player_id: id, amount: scale.top4, reason: 'Made the Top 4' })) : [];
}
