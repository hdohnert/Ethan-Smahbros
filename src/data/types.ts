// Row shapes as returned by get_snapshot (see supabase/schema.sql).

import type { Phase, EventKind, TicketScale } from '../rules/types';
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
  tickets: TicketScale;
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
