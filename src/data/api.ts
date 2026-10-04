// Every write the app makes. Owner-only calls rely on row-level security and
// the owner checks inside the database functions.

import { replay, seedTop4 } from '../rules/replay';
import { kothResult, playoffGameTickets, top4Tickets } from '../rules/tickets';
import type { Derived, RulesEvent, SeriesId, TicketAward } from '../rules/types';
import { supabase } from './supabase';
import type { Player, Settings, Snapshot, Tournament } from './types';

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
  if (e.code === '23503') return 'That player has results or tickets. Set them inactive instead.';
  if (e.code === '42501' || /row-level security|not allowed/i.test(e.message)) return 'Not allowed. Are you signed in as the owner?';
  return e.message;
}

type RpcResult = { ok: boolean; error?: string; id?: number; version?: number; event?: RulesEvent };

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

export async function recordKoth(snap: Snapshot, d: Derived, winner: string, loser: string) {
  const t = snap.tournament!;
  const { awards, rest } = kothResult(d, winner, loser, snap.settings.tickets, snap.settings.kingsRest);
  await record(t, 'match', { phase: 'koth', winner, loser, payload: rest ? { rest: true } : {}, tickets: awards });
  return { awards, rest };
}

export async function recordGame(snap: Snapshot, d: Derived, series: SeriesId, winner: string) {
  const s = d.bracket?.[series];
  if (!s || !s.a || !s.b || s.winner) throw new Error('That series is not being played');
  const loser = winner === s.a ? s.b : s.a;
  const tickets = playoffGameTickets(s, winner, snap.settings.tickets);
  await record(snap.tournament!, 'match', { phase: series, winner, loser, tickets });
  return tickets;
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

export async function startTournament(t: Tournament, kingId: string, queue: string[]) {
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

export function restartFromScratch(snap: Snapshot, keepTickets: boolean) {
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

export async function addPlayer(p: Pick<Player, 'name' | 'emoji' | 'color'> & { sort_order: number; is_demo?: boolean }) {
  return withRetry<Player>(() => supabase.from('players').insert(p).select().single());
}

export async function updatePlayer(id: string, patch: Partial<Player> & { photo_path?: string | null }) {
  await withRetry(() => supabase.from('players').update(patch).eq('id', id));
}

export async function deletePlayer(id: string) {
  await withRetry(() => supabase.from('players').delete().eq('id', id));
}

// ------------------------------------------------------------ tickets

export async function awardTickets(snap: Snapshot, playerId: string, amount: number, reason: string, source = 'Control') {
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

export async function undoTicket(id: string) {
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
  const d = replay(snap.tournament, snap.players, snap.events as RulesEvent[]);
  const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
  const name = (id: string) => snap.players.find((p) => p.id === id)?.name ?? '?';

  if (d.status === 'koth') {
    const kothMatches = snap.events.filter((e) => !e.undone && e.phase === 'koth').length;
    if (kothMatches >= 24) {
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
    const kingWins = Math.random() < 0.62;
    const [w, l] = kingWins ? [d.king, d.challenger] : [d.challenger, d.king];
    await recordKoth(snap, d, w, l);
    return `${name(w)} beat ${name(l)}`;
  }
  if (d.status === 'playoff' && d.currentSeries) {
    const s = d.currentSeries;
    const w = pick([s.a!, s.b!]);
    await recordGame(snap, d, s.id, w);
    return `${name(w)} won a ${s.id === 'final' ? 'final' : 'semifinal'} game`;
  }
  return 'Demo finished';
}
