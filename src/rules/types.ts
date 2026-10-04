// Shared shapes for the pure rules module. These mirror the database rows
// (see supabase/schema.sql) but carry only what the rules need.

export type Phase = 'koth' | 'semi1' | 'semi2' | 'final';
export type SeriesId = Exclude<Phase, 'koth'>;
export type EventKind = 'match' | 'queue' | 'bracket' | 'end';

export interface RulesPlayer {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
}

export interface RulesTournament {
  status: 'setup' | 'live';
  starting_king_id: string | null;
  /** Line order at the moment the tournament started (king excluded or not; both work). */
  queue: string[];
}

export interface MatchPayload {
  /** King's rest: the winner (king) heads to the back of the line after this match. */
  rest?: boolean;
}
export interface QueuePayload {
  order: string[];
  note?: string;
}
export interface BracketPayload {
  seeds: string[];
}

export interface RulesEvent {
  id: number;
  kind: EventKind;
  phase: Phase | null;
  winner_id: string | null;
  loser_id: string | null;
  payload: MatchPayload | QueuePayload | BracketPayload | Record<string, never> | null;
  undone: boolean;
}

export interface Stats {
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
  played: number;
  /** Was king at some point and then lost the crown. */
  formerKing: boolean;
  /** Times this player knocked off a king on a 3+ streak. */
  giantSlayer: number;
}

export interface Series {
  id: SeriesId;
  a: string | null;
  b: string | null;
  winsA: number;
  winsB: number;
  winner: string | null;
}

export interface Bracket {
  seeds: string[];
  semi1: Series;
  semi2: Series;
  final: Series;
}

export type DerivedStatus = 'setup' | 'koth' | 'playoff' | 'finished';

export interface Derived {
  status: DerivedStatus;
  king: string | null;
  challenger: string | null;
  /** Players waiting in line, front first (excludes king). */
  queue: string[];
  stats: Record<string, Stats>;
  /** Player ids in leaderboard order (active players plus anyone who has played). */
  standings: string[];
  bracket: Bracket | null;
  /** Series being played now, or null outside the playoff. */
  currentSeries: Series | null;
  champion: string | null;
  /** Most recent event that counts (not undone). */
  lastEvent: RulesEvent | null;
}

export interface TicketScale {
  play: number;
  win: number;
  streak3: number;
  streak5: number;
  giantSlayer: number;
  top4: number;
  final: number;
  champion: number;
}

export interface TicketAward {
  player_id: string;
  amount: number;
  reason: string;
}
