// Row shapes as returned by get_snapshot (see supabase/schema.sql).

import type { Phase, EventKind, MatchFormat, TicketScale } from '../rules/types';
import { DEFAULT_TICKETS } from '../rules/tickets';
import { theme } from '../theme';

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
  /** Control's "show Ticket Bank on the TV" switch. */
  showTicketBank: boolean;
  /** Rotate to the Ticket Bank for 15 s every 3 min between matches. */
  autoRotateBank: boolean;
  prizeStoreOpen: boolean;
  prizes: Prize[];
  sound: boolean;
  /** Id of the real tournament to return to when demo mode ends. */
  demoReturnTo: string | null;
}

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
  semiBestOf: 1,
  finalBestOf: 3,
  tickets: DEFAULT_TICKETS,
  showTicketBank: false,
  autoRotateBank: true,
  prizeStoreOpen: false,
  prizes: [
    { name: 'Sticker', cost: 5 },
    { name: 'Candy', cost: 5 },
    { name: 'Glow stick', cost: 10 },
    { name: 'Slime', cost: 15 },
    { name: 'Large prize', cost: 25 },
    { name: 'Top shelf', cost: 40 },
  ],
  sound: false,
  demoReturnTo: null,
};

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
  recent_tickets: TicketEvent[];
}
