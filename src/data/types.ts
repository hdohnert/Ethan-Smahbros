// Row shapes as returned by get_snapshot (see supabase/schema.sql).

import type { Phase, EventKind, MatchFormat, TicketScale } from '../rules/types';
import { DEFAULT_TICKETS } from '../rules/tickets';
import { theme } from '../theme';
import { DEFAULT_TRIVIA, type TriviaLive, type TriviaQ } from './trivia';

export interface Player {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  photo_url: string | null;
  photo_url_expires: string | null;
  sort_order: number;
  active: boolean;
  is_demo: boolean;
}

export interface Tournament {
  id: string;
  status: 'setup' | 'live';
  starting_king_id: string | null;
  queue: string[];
  ticket_bank_id: string;
  is_demo: boolean;
  version: number;
  created_at: string;
}

export interface MatchEvent {
  id: number;
  tournament_id: string;
  kind: EventKind;
  phase: Phase | null;
  winner_id: string | null;
  loser_id: string | null;
  payload: Record<string, unknown>;
  undone: boolean;
  created_at: string;
}

export interface TicketEvent {
  id: string;
  player_id: string;
  amount: number;
  reason: string;
  source: string;
  station: string | null;
  match_event_id: number | null;
  undone: boolean;
  created_at: string;
}

export interface Prize {
  name: string;
  cost: number;
}

/** A Left Right Center round in progress (stored in settings so every screen sees it). */
export interface LrcRound {
  id: string;
  name: string;
  ticketsEach: number;
  tables: string[][];
  /** Winner per table index, with the ticket award so it can be undone. */
  winners: Record<string, { playerId: string; ticketId: string; amount: number }>;
  /** Tournament the round's tickets belong to (rounds don't carry across a restart). */
  tournamentId: string;
}

/** What the TV shows: Auto follows the night; the rest pin a screen. */
export type TvScreen = 'auto' | 'bank' | 'pickup' | 'prizes' | 'smash' | 'photos' | 'thanks';

/** One slideshow photo: storage path, a signed link the TV can load, and an optional caption. */
export interface SlidePhoto {
  path: string;
  url: string;
  expires: string;
  caption: string;
}

/** One line of the "Smash rules to set" card. `key` marks which part of the night it is for. */
export interface SmashRule {
  key: 'koth4' | 'koth1' | 'playoff' | 'items';
  mode: string;
  settings: string;
}

/** Which rows apply right now: the current King of the Hill format, or the playoffs. */
export function activeRuleKeys(status: string | undefined, format: string | undefined): SmashRule['key'][] {
  if (status === 'playoff') return ['playoff', 'items'];
  if (status === 'koth' || status === 'setup') return [format === '1v1' ? 'koth1' : 'koth4', 'items'];
  return [];
}

export const DEFAULT_SMASH_RULES: SmashRule[] = [
  { key: 'koth4', mode: '4-player King of the Hill', settings: '2 stocks, 3-minute time limit' },
  { key: 'koth1', mode: '1v1 King of the Hill', settings: '1 stock, 3-minute time limit' },
  { key: 'playoff', mode: 'Playoffs', settings: '2 stocks, 5-minute time limit, stage hazards off, Battlefield' },
  { key: 'items', mode: 'Items and Final Smash', settings: "Kids' choice for regular play; off for playoffs" },
];

export interface Settings {
  title: string;
  subtitle: string;
  birthdayName: string;
  age: number | null;
  heroPhotoPath: string | null;
  heroPhotoUrl: string | null;
  heroPhotoExpires: string | null;
  kingsRest: boolean;
  /** King of the Hill format used until a format step changes it. */
  matchFormat: MatchFormat;
  /** Playoff series lengths (1, 3 or 5). Apply to series that haven't started. */
  semiBestOf: number;
  finalBestOf: number;
  tickets: TicketScale;
  /** Which DEFAULT_TICKETS the saved amounts came from (absent = the original 2/2/2/3/3/5/5/10). */
  ticketsVersion?: number;
  /** Physical tickets available for the whole night; awards can never go past it. */
  ticketBudget: number;
  /** Locks every award and undo while tickets are being handed out. */
  ticketsFrozen: boolean;
  /** Main session length in minutes (used by the budget projection and the session clock). */
  sessionMinutes: number;
  /** Move kids who've played 2+ games fewer than average to the front of the line. */
  autoCatchUp: boolean;
  /** TV: "5 minutes left" alert and a corner countdown for the last 5 minutes of the main session. */
  tvFiveMinuteAlert: boolean;
  /** When Control last pressed "Everybody sing!" (ms); the TV plays the birthday song screen. */
  singAt: number | null;
  /** Left Right Center: tickets each player starts with, and players per table. */
  lrcTicketsEach: number;
  lrcTableSize: number;
  lrcName: string;
  lrc: LrcRound | null;
  /** When the main session of a tournament started, set by Start Tournament. */
  sessionStart: { tournamentId: string; at: string } | null;
  /** Control's "show Ticket Bank on the TV" switch (older; tvScreen replaces it). */
  showTicketBank: boolean;
  /** Screen pinned on the TV from Control, or 'auto'. */
  tvScreen: TvScreen;
  /** Rotate to the Ticket Bank for 15 s every 3 min between matches. */
  autoRotateBank: boolean;
  prizeStoreOpen: boolean;
  /** Price board only: show prices, kids pay with physical tickets. Deduct in app: the old buy flow. */
  prizeStoreMode: 'board' | 'deduct';
  /** Slideshow photos shown on the TV between matches, in quiet moments, or pinned. */
  photos: SlidePhoto[];
  /** Minutes between photo peeks on the TV (0 = off). */
  photoEveryMinutes: number;
  /** Trivia questions (editable) and tickets for a right answer (1, 2, 3 or 5). */
  trivia: TriviaQ[];
  triviaTickets: number;
  /** What to set on the Switch for each part of the night (editable). */
  smashRules: SmashRule[];
  prizes: Prize[];
  /** Which default prize list the saved one came from (absent = the original six). */
  prizesVersion?: number;
  sound: boolean;
  /** Id of the real tournament to return to when demo mode ends. */
  demoReturnTo: string | null;
}

export const DEFAULT_PRIZES: Prize[] = [
  { name: 'Small', cost: 10 },
  { name: 'Medium', cost: 20 },
  { name: 'Large', cost: 40 },
  { name: 'Top shelf', cost: 75 },
];

/** Bumped when DEFAULT_PRIZES changes, so Control rewrites the saved list once. */
export const PRIZES_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  title: theme.title,
  subtitle: theme.subtitle,
  birthdayName: theme.birthdayName,
  age: theme.age,
  heroPhotoPath: null,
  heroPhotoUrl: null,
  heroPhotoExpires: null,
  kingsRest: true,
  matchFormat: '4-player',
  ticketBudget: 1000,
  ticketsFrozen: false,
  sessionMinutes: 75,
  autoCatchUp: true,
  tvFiveMinuteAlert: true,
  singAt: null,
  sessionStart: null,
  lrcTicketsEach: 3,
  lrcTableSize: 5,
  lrcName: 'Left Right Center',
  lrc: null,
  semiBestOf: 1,
  finalBestOf: 3,
  tickets: DEFAULT_TICKETS,
  showTicketBank: false,
  tvScreen: 'auto',
  autoRotateBank: true,
  prizeStoreOpen: false,
  prizeStoreMode: 'board',
  smashRules: DEFAULT_SMASH_RULES,
  photos: [],
  photoEveryMinutes: 3,
  trivia: DEFAULT_TRIVIA,
  triviaTickets: 2,
  prizes: DEFAULT_PRIZES,
  sound: false,
  demoReturnTo: null,
};

export function sessionStartMs(snap: Snapshot): number | null {
  const s = snap.settings.sessionStart;
  return s && s.tournamentId === snap.tournament?.id ? Date.parse(s.at) : null;
}

/** When the session clock started: Start Tournament, else the first match (older tournaments). */
export function clockStartMs(snap: Snapshot): number | null {
  const set = sessionStartMs(snap);
  if (set) return set;
  const first = snap.events.filter((e) => !e.undone && e.kind === 'match' && e.phase === 'koth').map((e) => Date.parse(e.created_at));
  return first.length ? Math.min(...first) : null;
}

/** Rules options taken from settings (players per match, series lengths). */
export function replayOptions(s: Settings) {
  return { defaultFormat: s.matchFormat, semiBestOf: s.semiBestOf, finalBestOf: s.finalBestOf };
}

/** Kid-friendly rules text that matches the current settings. */
/** "Winner advances" for one game, else "Best of N". */
export const seriesFormat = (bestOf: number) => (bestOf <= 1 ? 'Winner advances' : `Best of ${bestOf}`);

export function rulesText(format: MatchFormat, semiBestOf = 1, finalBestOf = 3) {
  const semis = semiBestOf <= 1 ? 'one game, winner advances' : `best of ${semiBestOf}`;
  return {
    koth: `${format === '1v1' ? 'One on one.' : '4 players at a time: the king plus the next 3 in line.'} Win and you stay on as king. Lose and you go to the back of the line. Most wins leads!`,
    playoff: `The top 4 by wins make it. Semis are 1 vs 4 and 2 vs 3 (${semis}). The final is ${finalBestOf <= 1 ? 'one game' : `best of ${finalBestOf}`}. Win it and you're the champion!`,
  };
}

export function withDefaults(s: Partial<Settings> | null | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...(s ?? {}), tickets: { ...DEFAULT_TICKETS, ...(s?.tickets ?? {}) } };
}

export interface Snapshot {
  server_time: string;
  settings: Settings;
  has_pin: boolean;
  tournament: Tournament | null;
  players: Player[];
  events: MatchEvent[];
  balances: { player_id: string; balance: number; earned?: number }[];
  /** Kids whose physical tickets have been handed out (payout checklist). */
  paid?: string[];
  recent_tickets: TicketEvent[];
  /** What the trivia TV shows (older databases don't send it). */
  trivia_live?: TriviaLive | null;
  /** Right trivia answers per kid tonight. */
  trivia_counts?: Record<string, number>;
}
