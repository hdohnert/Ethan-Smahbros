// Ticket math for the tournament. Pure. Control calls these right before it
// records an event, and stores the awards linked to that event so undoing the
// event removes exactly those tickets.

import { SERIES_WINS } from './replay';
import type { Derived, Series, TicketAward, TicketScale } from './types';

export const DEFAULT_TICKETS: TicketScale = {
  play: 2,
  win: 2,
  streak3: 2,
  streak5: 3,
  giantSlayer: 3,
  top4: 5,
  final: 5,
  champion: 10,
};

export const REST_STREAK = 5;

/** Tickets and king's-rest decision for a King of the Hill result. */
export function kothResult(
  d: Derived,
  winner: string,
  loser: string,
  scale: TicketScale,
  kingsRest: boolean,
): { awards: TicketAward[]; rest: boolean } {
  const awards: TicketAward[] = [];
  const newStreak = (d.stats[winner]?.streak ?? 0) + 1;

  awards.push({ player_id: loser, amount: scale.play, reason: 'Played a match' });
  awards.push({ player_id: winner, amount: scale.play + scale.win, reason: 'Won a match' });
  if (newStreak === 3 && scale.streak3) awards.push({ player_id: winner, amount: scale.streak3, reason: '3-win streak bonus' });
  if (newStreak === 5 && scale.streak5) awards.push({ player_id: winner, amount: scale.streak5, reason: '5-win streak bonus' });
  if (loser === d.king && winner !== d.king && (d.stats[loser]?.streak ?? 0) >= 3 && scale.giantSlayer) {
    awards.push({ player_id: winner, amount: scale.giantSlayer, reason: 'Giant Slayer bonus' });
  }
  return { awards: awards.filter((a) => a.amount > 0), rest: kingsRest && newStreak >= REST_STREAK };
}

/** Tickets for one playoff game; only the game that ends a series pays. */
export function playoffGameTickets(s: Series, winner: string, scale: TicketScale): TicketAward[] {
  const wins = (winner === s.a ? s.winsA : s.winsB) + 1;
  if (wins < SERIES_WINS) return [];
  if (s.id === 'final') return scale.champion ? [{ player_id: winner, amount: scale.champion, reason: 'Champion!' }] : [];
  return scale.final ? [{ player_id: winner, amount: scale.final, reason: 'Reached the final' }] : [];
}

export function top4Tickets(seeds: string[], scale: TicketScale): TicketAward[] {
  return scale.top4 ? seeds.map((id) => ({ player_id: id, amount: scale.top4, reason: 'Made the Top 4' })) : [];
}
