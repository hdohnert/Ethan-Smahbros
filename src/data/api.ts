// Every write the app makes. Owner-only calls rely on row-level security and
// the owner checks inside the database functions.

import { replay, seedTop4 } from '../rules/replay';
import { catchUpPicks } from '../rules/fairness';
import { kothResult, playoffGameTickets, top4Tickets } from '../rules/tickets';
import { makeTables, roundCost, tablePayout } from '../rules/lrc';
import type { Derived, MatchFormat, MatchPayload, RulesEvent, SeriesId, TicketAward } from '../rules/types';
import { supabase } from './supabase';
import { replayOptions, type LrcRound, type Player, type Settings, type Snapshot, type Tournament } from './types';

export class StaleError extends Error {
  constructor() {
    super('Someone else just changed the score. Check the board and tap again.');
  }
}

/** Retries network failures (not database refusals) a few times with backoff. */
async function withRetry<T = unknown>(
  fn: () => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>,
): Promise<T> {
  let last: { message: string; code?: string } | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { data, error } = await fn();
      if (!error) return data as T;
      last = error;
      const network = /fetch|network|timeout|Failed to/i.test(error.message) && !error.code;
      if (!network) break;
    } catch (e) {
      last = { message: e instanceof Error ? e.message : String(e) };
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
  }
  const err = new Error(friendly(last));
  (err as Error & { code?: string }).code = last?.code;
  throw err;
}

function friendly(e: { message: string; code?: string } | null): string {
  if (!e) return 'Something went wrong';
  if (e.code === '42501' || /row-level security|not allowed/i.test(e.message)) return 'Not allowed. Are you signed in as the owner?';
  return e.message;
}

type RpcResult = { ok: boolean; error?: string; id?: number; version?: number; event?: RulesEvent; wanted?: number; paid?: number };

async function rpcOk(name: string, args: Record<string, unknown>): Promise<RpcResult> {
  const res = await withRetry<RpcResult>(() => supabase.rpc(name, args));
  if (!res.ok) {
    if (res.error === 'stale') throw new StaleError();
    throw new Error(res.error ?? 'Failed');
  }
  return res;
}

// ------------------------------------------------------------ tournament

function record(
  t: Tournament,
  kind: string,
  opts: { phase?: string; winner?: string; loser?: string; payload?: object; tickets?: TicketAward[] } = {},
) {
  return rpcOk('record_event', {
    p_tournament: t.id,
    p_version: t.version,
    p_kind: kind,
    p_phase: opts.phase ?? null,
    p_winner: opts.winner ?? null,
    p_loser: opts.loser ?? null,
    p_payload: opts.payload ?? {},
    p_tickets: opts.tickets ?? [],
  });
}

/** Everyone in the current match: the king plus the challengers. */
export const matchPlayers = (d: Derived) => [d.king, ...d.challengers].filter((id): id is string => !!id);

/** Records a King of the Hill result; everyone else in the match is a loser. */
export async function recordKoth(snap: Snapshot, d: Derived, winner: string) {
  const t = snap.tournament!;
  const losers = matchPlayers(d).filter((id) => id !== winner);
  const { awards, rest } = kothResult(d, winner, losers, snap.settings.tickets, snap.settings.kingsRest);
  const payload: MatchPayload = { format: d.format, ...(rest ? { rest: true } : {}), ...(losers.length > 1 ? { losers } : {}) };
  // Catch-up rides on the match event itself, so Undo puts the line back exactly.
  const catchUp = snap.settings.autoCatchUp ? kothCatchUp(snap, winner, losers, payload) : [];
  if (catchUp.length) payload.catchUp = catchUp;
  const res = await record(t, 'match', { phase: 'koth', winner, loser: losers[0], payload, tickets: awards });
  return { awards, rest, catchUp, wanted: res.wanted ?? 0, paid: res.paid ?? 0 };
}

/** Replays the night as if this match were recorded, then picks who catches up. */
function kothCatchUp(snap: Snapshot, winner: string, losers: string[], payload: MatchPayload): string[] {
  const events = snap.events as RulesEvent[];
  const id = events.reduce((n, e) => Math.max(n, e.id), 0) + 1;
  const next: RulesEvent = { id, kind: 'match', phase: 'koth', winner_id: winner, loser_id: losers[0] ?? null, payload, undone: false };
  const after = replay(snap.tournament, snap.players, [...events, next], replayOptions(snap.settings));
  return catchUpPicks(after, snap.players, [winner, ...losers]);
}

export async function recordGame(snap: Snapshot, d: Derived, series: SeriesId, winner: string) {
  const s = d.bracket?.[series];
  if (!s || !s.a || !s.b || s.winner) throw new Error('That series is not being played');
  const loser = winner === s.a ? s.b : s.a;
  const tickets = playoffGameTickets(s, winner, snap.settings.tickets);
  // Store the length with each game: the first game locks it for the series.
  const res = await record(snap.tournament!, 'match', { phase: series, winner, loser, tickets, payload: { bestOf: s.bestOf } });
  return Object.assign(tickets, { wanted: res.wanted ?? 0, paid: res.paid ?? 0 });
}

export async function startBracket(snap: Snapshot, d: Derived) {
  const seeding = seedTop4(d, snap.players);
  if (!seeding.ok) throw new Error(seeding.reason);
  await record(snap.tournament!, 'bracket', {
    payload: { seeds: seeding.seeds },
    tickets: top4Tickets(seeding.seeds, snap.settings.tickets),
  });
}

export const endTournament = (snap: Snapshot) => record(snap.tournament!, 'end');

export const setQueue = (snap: Snapshot, order: string[], note?: string) =>
  record(snap.tournament!, 'queue', { payload: { order, note } });

/**
 * Switches the match format. During King of the Hill it is a step in the
 * event log, so Undo switches it back; before the tournament starts it just
 * changes the saved default.
 */
export async function setMatchFormat(snap: Snapshot, d: Derived, format: MatchFormat) {
  if (d.status === 'koth') await record(snap.tournament!, 'queue', { payload: { order: d.queue, note: 'format', format } });
  else await saveSettings(snap, { matchFormat: format });
}

export async function undoLast(snap: Snapshot): Promise<RulesEvent | undefined> {
  const t = snap.tournament!;
  const res = await rpcOk('undo_last', { p_tournament: t.id, p_version: t.version });
  return res.event;
}

/** Creates a tournament in setup and makes it current. */
export async function newTournament(opts: { bankId?: string; isDemo?: boolean; players: Player[] }) {
  const queue = opts.players.filter((p) => p.active).map((p) => p.id);
  const row = await withRetry<Tournament>(() =>
    supabase
      .from('tournaments')
      .insert({ status: 'setup', queue, is_demo: opts.isDemo ?? false, ...(opts.bankId ? { ticket_bank_id: opts.bankId } : {}) })
      .select()
      .single(),
  );
  await withRetry(() => supabase.from('app_state').update({ current_tournament_id: row.id }).eq('id', 1));
  return row;
}

export async function startTournament(t: Tournament, kingId: string, queue: string[], snap?: Snapshot) {
  if (snap) await saveSettings(snap, { sessionStart: { tournamentId: t.id, at: new Date().toISOString() } });
  await withRetry(() =>
    supabase
      .from('tournaments')
      .update({ status: 'live', starting_king_id: kingId, queue: queue.filter((id) => id !== kingId) })
      .eq('id', t.id),
  );
}

export async function setupTournament(t: Tournament, patch: Partial<Pick<Tournament, 'starting_king_id' | 'queue'>>) {
  await withRetry(() => supabase.from('tournaments').update(patch).eq('id', t.id));
}

/** Start time of the current tournament's main session (ms), or null. */
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

/** King of the Hill matches played so far. */
export const kothMatchCount = (snap: Snapshot) => snap.events.filter((e) => !e.undone && e.kind === 'match' && e.phase === 'koth').length;

/** "Everybody sing!": the TV plays the birthday song screen. */
export const startSing = (snap: Snapshot) => saveSettings(snap, { singAt: Date.now() });
export const stopSing = (snap: Snapshot) => saveSettings(snap, { singAt: null });

export async function restartFromScratch(snap: Snapshot, keepTickets: boolean) {
  return newTournament({
    players: snap.players,
    bankId: keepTickets ? snap.tournament?.ticket_bank_id : undefined,
    isDemo: snap.tournament?.is_demo,
  });
}

// ------------------------------------------------------------ settings

export async function saveSettings(snap: Snapshot, patch: Partial<Settings>) {
  const settings = { ...snap.settings, ...patch };
  await withRetry(() =>
    supabase.from('app_state').update({ settings, updated_at: new Date().toISOString() }).eq('id', 1),
  );
}

// ------------------------------------------------------------ players

/** Adds many real (non-demo) players at once, in the order given. */
export async function addPlayers(names: string[], existing: Player[]) {
  const start = existing.reduce((m, p) => Math.max(m, p.sort_order), 0) + 1;
  const rows = names.map((name, i) => ({
    name,
    emoji: null,
    color: AVATAR_COLORS[(existing.length + i) % AVATAR_COLORS.length],
    sort_order: start + i,
    is_demo: false,
  }));
  if (rows.length) await withRetry(() => supabase.from('players').insert(rows));
}

export async function updatePlayer(id: string, patch: Partial<Player> & { photo_path?: string | null }) {
  await withRetry(() => supabase.from('players').update(patch).eq('id', id));
}

/**
 * Removes a player for good: their tickets, the matches they played (and the
 * tickets those matches paid), then the player. Order matters because tickets
 * and matches point at players.
 */
export async function deletePlayer(id: string) {
  await withRetry(() => supabase.from('ticket_events').delete().eq('player_id', id));
  await withRetry(() => supabase.from('match_events').delete().eq('winner_id', id));
  await withRetry(() => supabase.from('match_events').delete().eq('loser_id', id));
  await withRetry(() => supabase.from('tournaments').update({ starting_king_id: null }).eq('starting_king_id', id));
  await withRetry(() => supabase.from('players').delete().eq('id', id));
}

/** Everyone back to 0 tickets: the current tournament starts a fresh, empty Ticket Bank. */
export async function resetTicketBank(snap: Snapshot) {
  if (snap.settings.ticketsFrozen) throw new Error('Tickets are frozen for payout. Unfreeze them first.');
  await withRetry(() =>
    supabase.from('tournaments').update({ ticket_bank_id: crypto.randomUUID() }).eq('id', snap.tournament!.id),
  );
}

// ------------------------------------------------------------ tickets

/** Tickets left in the night's budget (awards only; prizes don't give any back). */
export function ticketsLeft(snap: Snapshot): number {
  const issued = snap.balances.reduce((n, b) => n + (b.earned ?? Math.max(0, b.balance)), 0);
  return Math.max(0, snap.settings.ticketBudget - issued);
}

function checkBudget(snap: Snapshot, total: number) {
  if (snap.settings.ticketsFrozen) throw new Error('Tickets are frozen for payout. Unfreeze them first.');
  const left = ticketsLeft(snap);
  if (total > left) throw new Error(`Over the ticket budget: only ${left} left`);
}

export async function awardTickets(snap: Snapshot, playerId: string, amount: number, reason: string, source = 'Control') {
  checkBudget(snap, amount);
  await withRetry(() =>
    supabase.from('ticket_events').insert({
      bank_id: snap.tournament!.ticket_bank_id,
      player_id: playerId,
      amount,
      reason,
      source,
    }),
  );
}

/** One award for every kid in the list, in a single insert. */
export async function awardEveryone(snap: Snapshot, playerIds: string[], amount: number, reason: string) {
  if (!playerIds.length) return;
  checkBudget(snap, amount * playerIds.length);
  await withRetry(() =>
    supabase.from('ticket_events').insert(
      playerIds.map((player_id) => ({
        bank_id: snap.tournament!.ticket_bank_id,
        player_id,
        amount,
        reason: reason.slice(0, 80),
        source: 'Control',
      })),
    ),
  );
}

// ------------------------------------------------------------ freeze and payout

/** Locks every award and undo (Control and stations) while tickets are handed out. */
export async function setFrozen(snap: Snapshot, frozen: boolean) {
  await saveSettings(snap, { ticketsFrozen: frozen });
}

/** Ticks a kid off the payout list (or back on). */
export async function setPaid(snap: Snapshot, playerId: string, paid: boolean) {
  const bank = snap.tournament!.ticket_bank_id;
  await withRetry(() => supabase.from('payout_marks').delete().eq('bank_id', bank).eq('player_id', playerId));
  if (paid) await withRetry(() => supabase.from('payout_marks').insert({ bank_id: bank, player_id: playerId, paid: true }));
}

/** 37 → { strips: 3, singles: 7 }: physical tickets come in strips of 10. */
export const strips = (n: number) => ({ strips: Math.floor(Math.max(0, n) / 10), singles: Math.max(0, n) % 10 });

// ------------------------------------------------------------ Left Right Center

/** The active round for this tournament, if any. */
export function currentLrc(snap: Snapshot) {
  const r = snap.settings.lrc;
  return r && r.tournamentId === snap.tournament?.id ? r : null;
}

/** Deals the kids who are here into tables, after checking the bank can cover the round. */
export async function startLrcRound(snap: Snapshot) {
  if (snap.settings.ticketsFrozen) throw new Error('Tickets are frozen for payout. Unfreeze them first.');
  const s = snap.settings;
  const here = snap.players.filter((p) => p.active).map((p) => p.id);
  if (here.length < 2) throw new Error('Need at least 2 kids switched on to play.');
  const cost = roundCost(here.length, s.lrcTicketsEach);
  const left = ticketsLeft(snap);
  if (cost > left) {
    throw new Error(`Not enough tickets in the bank: this round needs ${cost} (${here.length} kids × ${s.lrcTicketsEach}), only ${left} left.`);
  }
  const round: LrcRound = {
    id: crypto.randomUUID(),
    name: s.lrcName || 'Left Right Center',
    ticketsEach: s.lrcTicketsEach,
    tables: makeTables(here, s.lrcTableSize),
    winners: {},
    tournamentId: snap.tournament!.id,
  };
  await saveSettings(snap, { lrc: round });
}

/** The last kid with tickets at a table takes every ticket at that table. */
export async function setLrcWinner(snap: Snapshot, table: number, playerId: string) {
  const r = currentLrc(snap);
  if (!r) throw new Error('No round in progress');
  if (r.winners[table]) throw new Error('That table already has a winner. Undo it first.');
  const amount = tablePayout(r.tables[table], r.ticketsEach);
  checkBudget(snap, amount);
  const row = await withRetry<{ id: string }>(() =>
    supabase
      .from('ticket_events')
      .insert({
        bank_id: snap.tournament!.ticket_bank_id,
        player_id: playerId,
        amount,
        reason: `Won table ${table + 1}`,
        source: r.name.slice(0, 40),
      })
      .select('id')
      .single(),
  );
  await saveSettings(snap, { lrc: { ...r, winners: { ...r.winners, [table]: { playerId, ticketId: row.id, amount } } } });
  return amount;
}

export async function undoLrcTable(snap: Snapshot, table: number) {
  const r = currentLrc(snap);
  const w = r?.winners[table];
  if (!r || !w) return;
  await undoTicket(w.ticketId, snap);
  const winners = { ...r.winners };
  delete winners[table];
  await saveSettings(snap, { lrc: { ...r, winners } });
}

/** Takes back every table's tickets and cancels the round. */
export async function undoLrcRound(snap: Snapshot) {
  const r = currentLrc(snap);
  if (!r) return;
  for (const w of Object.values(r.winners)) await undoTicket(w.ticketId, snap);
  await saveSettings(snap, { lrc: null });
}

/** Ends the round; the tickets stay with the winners. */
export async function finishLrcRound(snap: Snapshot) {
  await saveSettings(snap, { lrc: null });
}

export async function undoTicket(id: string, snap?: Snapshot) {
  if (snap?.settings.ticketsFrozen) throw new Error('Tickets are frozen for payout. Unfreeze them first.');
  await withRetry(() => supabase.from('ticket_events').update({ undone: true }).eq('id', id));
}

export async function buyPrize(playerId: string, cost: number, prize: string, pin: string | null, device: string) {
  const res = await withRetry<{ ok: boolean; error?: string; balance?: number }>(() =>
    supabase.rpc('prize_purchase', { p_pin: pin, p_device: device, p_player: playerId, p_cost: cost, p_prize: prize }),
  );
  if (!res.ok) throw new Error(res.error ?? 'Purchase failed');
  return res.balance ?? 0;
}

export async function setStationPin(pin: string) {
  await withRetry(() => supabase.rpc('set_station_pin', { p_pin: pin }));
}

// ------------------------------------------------------------ display link

export async function getOrCreateDisplayToken(): Promise<string> {
  const rows = await withRetry<{ token: string }[]>(() =>
    supabase.from('display_tokens').select('token').order('created_at').limit(1),
  );
  if (rows.length) return rows[0].token;
  // 28 chars from a 31-symbol alphabet ≈ 138 bits: unguessable, still typeable once.
  const bytes = crypto.getRandomValues(new Uint8Array(28));
  const token = Array.from(bytes, (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
  await withRetry(() => supabase.from('display_tokens').insert({ token }));
  return token;
}

export async function resetDisplayTokens() {
  await withRetry(() => supabase.from('display_tokens').delete().neq('token', ''));
}

// ------------------------------------------------------------ photos

const SIGNED_URL_SECONDS = 60 * 60 * 24;

export async function uploadPhoto(blob: Blob, name: string): Promise<{ path: string; url: string; expires: string }> {
  const path = `${name}-${Date.now()}.jpg`;
  await withRetry(() => supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true }));
  return { path, ...(await signPhoto(path)) };
}

export async function signPhoto(path: string): Promise<{ url: string; expires: string }> {
  const { signedUrl } = await withRetry<{ signedUrl: string }>(() =>
    supabase.storage.from('photos').createSignedUrl(path, SIGNED_URL_SECONDS),
  );
  return { url: signedUrl, expires: new Date(Date.now() + SIGNED_URL_SECONDS * 1000).toISOString() };
}

/** Re-signs photo links that expire within 8 hours. Control runs this while open. */
export async function refreshPhotoLinks(snap: Snapshot) {
  const soon = Date.now() + 8 * 3600 * 1000;
  const due = (exp: string | null) => !exp || Date.parse(exp) < soon;
  const rows = await withRetry<{ id: string; photo_path: string | null; photo_url_expires: string | null }[]>(() =>
    supabase.from('players').select('id, photo_path, photo_url_expires').not('photo_path', 'is', null),
  );
  for (const r of rows) {
    if (r.photo_path && due(r.photo_url_expires)) {
      const { url, expires } = await signPhoto(r.photo_path);
      await updatePlayer(r.id, { photo_url: url, photo_url_expires: expires });
    }
  }
  const s = snap.settings;
  if (s.heroPhotoPath && due(s.heroPhotoExpires)) {
    const { url, expires } = await signPhoto(s.heroPhotoPath);
    await saveSettings(snap, { heroPhotoUrl: url, heroPhotoExpires: expires });
  }
}

/** Center-crops an image file to a square JPEG (max 512 px). */
export async function squareJpeg(file: Blob, crop?: { x: number; y: number; size: number }): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const size = crop?.size ?? Math.min(bmp.width, bmp.height);
  const sx = crop?.x ?? (bmp.width - size) / 2;
  const sy = crop?.y ?? (bmp.height - size) / 2;
  const out = Math.min(512, size);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = out;
  canvas.getContext('2d')!.drawImage(bmp, sx, sy, size, size, 0, 0, out, out);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not read photo'))), 'image/jpeg', 0.85));
}

// ------------------------------------------------------------ demo mode

const DEMO_NAMES = [
  'Ethan', 'Maya', 'Leo', 'Ava', 'Noah', 'Zoe', 'Kai', 'Liam', 'Mia', 'Owen',
  'Isla', 'Jack', 'Ruby', 'Finn', 'Ella', 'Max', 'Lily', 'Sam', 'Nora', 'Theo',
];
const DEMO_EMOJI = ['🎂', '🦄', '🦖', '⚡', '🚀', null, '🐉', '🍕', null, '👾', '🌈', null, '🐱', '🏀', null, '🎮', '🌸', null, '⭐', '🐼'];
export const AVATAR_COLORS = ['#ff2d95', '#21d4fd', '#b6ff3b', '#ffc83d', '#a66bff', '#ff8a3d'];

export async function startDemo(snap: Snapshot) {
  if (snap.tournament?.is_demo) return;
  const rows = DEMO_NAMES.map((name, i) => ({
    name,
    emoji: DEMO_EMOJI[i],
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    sort_order: i,
    is_demo: true,
  }));
  const players = await withRetry<Player[]>(() => supabase.from('players').insert(rows).select());
  await saveSettings(snap, { demoReturnTo: snap.tournament?.id ?? null });
  const t = await newTournament({ players, isDemo: true });
  const king = players.find((p) => p.name === snap.settings.birthdayName) ?? players[0];
  await startTournament(t, king.id, players.map((p) => p.id));
}

export async function exitDemo(snap: Snapshot) {
  const t = snap.tournament;
  if (!t?.is_demo) return;
  await withRetry(() => supabase.from('app_state').update({ current_tournament_id: snap.settings.demoReturnTo }).eq('id', 1));
  await saveSettings(snap, { demoReturnTo: null });
  // Order matters: events reference players, tickets reference events and players.
  const demoTournaments = await withRetry<{ id: string; ticket_bank_id: string }[]>(() =>
    supabase.from('tournaments').select('id, ticket_bank_id').eq('is_demo', true),
  );
  for (const dt of demoTournaments) {
    await withRetry(() => supabase.from('ticket_events').delete().eq('bank_id', dt.ticket_bank_id));
    await withRetry(() => supabase.from('tournaments').delete().eq('id', dt.id));
  }
  await withRetry(() => supabase.from('players').delete().eq('is_demo', true));
}

/** One random step of the demo: a match, a station award, or a playoff game. */
export async function demoStep(snap: Snapshot): Promise<string> {
  const d = replay(snap.tournament, snap.players, snap.events as RulesEvent[], replayOptions(snap.settings));
  const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
  const name = (id: string) => snap.players.find((p) => p.id === id)?.name ?? '?';

  if (d.status === 'koth') {
    const kothMatches = snap.events.filter((e) => !e.undone && e.phase === 'koth').length;
    // About a 75-minute main session: ~17 four-player matches, ~24 one-on-one.
    if (kothMatches >= (d.format === '4-player' ? 17 : 24)) {
      await startBracket(snap, d);
      return 'Top-4 bracket started';
    }
    if (Math.random() < 0.2) {
      const p = pick(snap.players);
      await awardTickets(snap, p.id, pick([1, 2, 3, 5]), 'Ring Toss', 'Ring Toss');
      return `Ring Toss tickets for ${p.name}`;
    }
    if (!d.king || !d.challenger) return 'Waiting for players';
    // The king wins a bit more often so streaks and fire effects show up.
    const w = Math.random() < 0.5 ? d.king : pick(d.challengers);
    await recordKoth(snap, d, w);
    return `${name(w)} won the match`;
  }
  if (d.status === 'playoff' && d.currentSeries) {
    const s = d.currentSeries;
    const w = pick([s.a!, s.b!]);
    await recordGame(snap, d, s.id, w);
    return `${name(w)} won a ${s.id === 'final' ? 'final' : 'semifinal'} game`;
  }
  return 'Demo finished';
}
