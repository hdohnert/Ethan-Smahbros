-- Ethan's Birthday Showdown: database setup.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run again after an update (it only creates or replaces).
--
-- Security model
--   * Row-level security on every table. Only the owner (the account listed in
--     public.admins) can read or write tables directly.
--   * The first signed-in account claims ownership once (claim_ownership);
--     after that nobody else can.
--   * The TV reads everything through get_snapshot(token) with a long random
--     read-only token.
--   * Helper Station phones use a shared PIN and can only add, undo (their own
--     last award) or spend tickets, through the station_* functions below.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tables

create table if not exists public.admins (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.app_state (
  id int primary key default 1 check (id = 1),
  current_tournament_id uuid,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.app_state (id) values (1) on conflict do nothing;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  emoji text check (emoji is null or char_length(emoji) <= 16),
  color text check (color is null or char_length(color) <= 16),
  photo_path text,
  photo_url text,
  photo_url_expires timestamptz,
  sort_order int not null default 0,
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'setup' check (status in ('setup', 'live')),
  starting_king_id uuid references public.players (id) on delete set null,
  queue uuid[] not null default '{}',
  ticket_bank_id uuid not null default gen_random_uuid(),
  is_demo boolean not null default false,
  version int not null default 0,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.app_state
    add constraint app_state_current_tournament_fk
    foreign key (current_tournament_id) references public.tournaments (id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.match_events (
  id bigint generated always as identity primary key,
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  kind text not null check (kind in ('match', 'queue', 'bracket', 'end')),
  phase text check (phase in ('koth', 'semi1', 'semi2', 'final')),
  winner_id uuid references public.players (id) on delete restrict,
  loser_id uuid references public.players (id) on delete restrict,
  payload jsonb not null default '{}'::jsonb,
  undone boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists match_events_tournament_idx on public.match_events (tournament_id, id);

create table if not exists public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null,
  player_id uuid not null references public.players (id) on delete restrict,
  amount int not null check (amount <> 0 and abs(amount) <= 1000),
  reason text not null default '' check (char_length(reason) <= 80),
  source text not null default 'Tournament' check (char_length(source) <= 40),
  station text check (station is null or char_length(station) <= 40),
  device_id text check (device_id is null or char_length(device_id) <= 64),
  match_event_id bigint references public.match_events (id) on delete cascade,
  undone boolean not null default false,
  created_at timestamptz not null default now()
);
-- Added later: groups awards made together (Left Right Center round, everyone-bonus) so they can be undone as one.
alter table public.ticket_events add column if not exists batch_id uuid;
create index if not exists ticket_events_bank_idx on public.ticket_events (bank_id, player_id);
create index if not exists ticket_events_batch_idx on public.ticket_events (batch_id);
create index if not exists ticket_events_match_idx on public.ticket_events (match_event_id);
create index if not exists ticket_events_device_idx on public.ticket_events (device_id, created_at desc);

-- Payout checklist: which kids have been handed their physical tickets.
create table if not exists public.payout_marks (
  bank_id uuid not null,
  player_id uuid not null references public.players (id) on delete cascade,
  paid boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (bank_id, player_id)
);

create table if not exists public.display_tokens (
  token text primary key check (char_length(token) >= 24),
  created_at timestamptz not null default now()
);

-- Station PIN hash. RLS with no policies: only the functions below can read it.
create table if not exists public.station_secret (
  id int primary key default 1 check (id = 1),
  pin_hash text
);
insert into public.station_secret (id) values (1) on conflict do nothing;

create table if not exists public.pin_failures (
  id bigint generated always as identity primary key,
  at timestamptz not null default now()
);

-- ---------------------------------------------------------------- row-level security

alter table public.admins enable row level security;
alter table public.app_state enable row level security;
alter table public.players enable row level security;
alter table public.tournaments enable row level security;
alter table public.match_events enable row level security;
alter table public.ticket_events enable row level security;
alter table public.display_tokens enable row level security;
alter table public.pin_failures enable row level security;
alter table public.station_secret enable row level security;
alter table public.payout_marks enable row level security;

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

do $$
declare t text;
begin
  foreach t in array array['app_state', 'players', 'tournaments', 'match_events', 'ticket_events', 'display_tokens', 'payout_marks'] loop
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format(
      'create policy owner_all on public.%I for all to authenticated using (public.is_owner()) with check (public.is_owner())', t);
  end loop;
  drop policy if exists owner_read on public.admins;
  create policy owner_read on public.admins for select to authenticated using (user_id = auth.uid());
end $$;

-- Keep the PIN hash and failure log away from every client, owner included.
revoke all on public.station_secret, public.pin_failures from anon, authenticated;

-- ---------------------------------------------------------------- ownership

create or replace function public.whoami()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'signed_in', auth.uid() is not null,
    'owner', public.is_owner(),
    'claimable', auth.uid() is not null and not exists (select 1 from public.admins)
  )
$$;

-- The first signed-in account becomes the owner. Afterwards this does nothing.
create or replace function public.claim_ownership()
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then return false; end if;
  lock table public.admins in exclusive mode;
  if exists (select 1 from public.admins) then
    return public.is_owner();
  end if;
  insert into public.admins (user_id) values (auth.uid());
  return true;
end $$;

-- ---------------------------------------------------------------- ticket budget and freeze

-- Total physical tickets for the night (Settings → Tickets available), default 1000.
create or replace function public.ticket_budget()
returns int
language sql stable security definer set search_path = ''
as $$ select coalesce(nullif(settings->>'ticketBudget', '')::int, 1000) from public.app_state where id = 1 $$;

-- Freeze for payout: no awards or undos while true.
create or replace function public.tickets_frozen()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((settings->>'ticketsFrozen')::boolean, false) from public.app_state where id = 1 $$;

-- Tickets handed out so far in a bank: awards only. Prize deductions don't count
-- and don't give tickets back to the budget.
create or replace function public.bank_issued(p_bank uuid)
returns int
language sql stable security definer set search_path = ''
as $$ select coalesce(sum(amount), 0)::int from public.ticket_events where bank_id = p_bank and amount > 0 and not undone $$;

-- Every ticket write passes through here, whoever makes it (Control, a station,
-- a match result), so the budget and the freeze can't be bypassed.
create or replace function public.guard_ticket_events()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  counts_now boolean;
  counted_before boolean;
  left_over int;
begin
  counts_now := new.amount > 0 and not new.undone;
  counted_before := tg_op = 'UPDATE' and old.amount > 0 and not old.undone;
  if public.tickets_frozen() then
    if tg_op = 'INSERT' and new.amount > 0 then
      raise exception 'Tickets are frozen for payout' using errcode = 'P0001';
    end if;
    if tg_op = 'UPDATE' and new.undone is distinct from old.undone then
      raise exception 'Tickets are frozen for payout' using errcode = 'P0001';
    end if;
  end if;
  if counts_now and not counted_before then
    -- One writer per bank at a time, so two phones can't both squeeze past the limit.
    perform pg_advisory_xact_lock(hashtextextended(new.bank_id::text, 1));
    left_over := public.ticket_budget() - public.bank_issued(new.bank_id);
    if new.amount > left_over then
      raise exception 'Over the ticket budget: only % left', greatest(left_over, 0) using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_ticket_events on public.ticket_events;
create trigger guard_ticket_events before insert or update on public.ticket_events
  for each row execute function public.guard_ticket_events();

-- ---------------------------------------------------------------- snapshot (Control + Display)

create or replace function public.ticket_bank_balances(p_bank uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('player_id', player_id, 'balance', total, 'earned', earned)), '[]'::jsonb)
  from (
    select player_id, sum(amount)::int as total, coalesce(sum(amount) filter (where amount > 0), 0)::int as earned
    from public.ticket_events
    where bank_id = p_bank and not undone
    group by player_id
  ) b
$$;

create or replace function public.get_snapshot(p_token text default null)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  st public.app_state;
  t public.tournaments;
  demo boolean;
begin
  if not public.is_owner()
     and not exists (select 1 from public.display_tokens where token = p_token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into st from public.app_state where id = 1;
  select * into t from public.tournaments where id = st.current_tournament_id;
  demo := coalesce(t.is_demo, false);

  return jsonb_build_object(
    'server_time', now(),
    'settings', st.settings,
    'has_pin', exists (select 1 from public.station_secret where pin_hash is not null),
    'tournament', case when t.id is null then null else to_jsonb(t) end,
    'players', coalesce((
      select jsonb_agg(to_jsonb(p) - 'photo_path' order by p.sort_order, p.name)
      from public.players p where p.is_demo = demo), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.id)
      from public.match_events e where e.tournament_id = t.id), '[]'::jsonb),
    'balances', case when t.id is null then '[]'::jsonb else public.ticket_bank_balances(t.ticket_bank_id) end,
    'paid', coalesce((
      select jsonb_agg(m.player_id) from public.payout_marks m
      where m.bank_id = t.ticket_bank_id and m.paid), '[]'::jsonb),
    'recent_tickets', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select id, player_id, amount, reason, source, station, match_event_id, undone, created_at
        from public.ticket_events
        where bank_id = t.ticket_bank_id
        order by created_at desc
        limit 60
      ) x), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------- tournament writes (owner only)

-- Records one event plus the tickets it pays, atomically. p_version must match
-- the tournament's version, so a double tap or a stale screen can't record twice.
create or replace function public.record_event(
  p_tournament uuid,
  p_version int,
  p_kind text,
  p_phase text default null,
  p_winner uuid default null,
  p_loser uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_tickets jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  t public.tournaments;
  new_id bigint;
  x jsonb;
  amt int;
  left_over int;
  wanted int := 0;
  paid int := 0;
begin
  if not public.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  if public.tickets_frozen() and jsonb_array_length(coalesce(p_tickets, '[]'::jsonb)) > 0 then
    return jsonb_build_object('ok', false, 'error', 'Tickets are frozen for payout. Unfreeze them first.');
  end if;
  select * into t from public.tournaments where id = p_tournament for update;
  if t.id is null then raise exception 'no such tournament'; end if;
  if t.version <> p_version then
    return jsonb_build_object('ok', false, 'error', 'stale');
  end if;

  insert into public.match_events (tournament_id, kind, phase, winner_id, loser_id, payload)
  values (p_tournament, p_kind, p_phase, p_winner, p_loser, coalesce(p_payload, '{}'::jsonb))
  returning id into new_id;

  -- The result always counts; its tickets are paid only up to what's left in the budget.
  perform pg_advisory_xact_lock(hashtextextended(t.ticket_bank_id::text, 1));
  left_over := public.ticket_budget() - public.bank_issued(t.ticket_bank_id);
  for x in select * from jsonb_array_elements(coalesce(p_tickets, '[]'::jsonb)) loop
    amt := (x->>'amount')::int;
    wanted := wanted + amt;
    amt := least(amt, greatest(left_over, 0));
    if amt > 0 then
      insert into public.ticket_events (bank_id, player_id, amount, reason, source, match_event_id)
      values (t.ticket_bank_id, (x->>'player_id')::uuid, amt, left(coalesce(x->>'reason', ''), 80), 'Tournament', new_id);
      left_over := left_over - amt;
      paid := paid + amt;
    end if;
  end loop;

  update public.tournaments set version = version + 1 where id = p_tournament;
  return jsonb_build_object('ok', true, 'id', new_id, 'version', t.version + 1, 'wanted', wanted, 'paid', paid);
end $$;

-- Undoes the latest event that still counts, and every ticket it paid.
create or replace function public.undo_last(p_tournament uuid, p_version int)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  t public.tournaments;
  e public.match_events;
begin
  if not public.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  if public.tickets_frozen() then
    return jsonb_build_object('ok', false, 'error', 'Tickets are frozen for payout. Unfreeze them first.');
  end if;
  select * into t from public.tournaments where id = p_tournament for update;
  if t.version <> p_version then
    return jsonb_build_object('ok', false, 'error', 'stale');
  end if;
  select * into e from public.match_events
  where tournament_id = p_tournament and not undone
  order by id desc limit 1;
  if e.id is null then
    return jsonb_build_object('ok', false, 'error', 'nothing to undo');
  end if;
  update public.match_events set undone = true where id = e.id;
  update public.ticket_events set undone = true where match_event_id = e.id;
  update public.tournaments set version = version + 1 where id = p_tournament;
  return jsonb_build_object('ok', true, 'event', to_jsonb(e), 'version', t.version + 1);
end $$;

create or replace function public.set_station_pin(p_pin text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,8}$' then raise exception 'PIN must be 4 to 8 digits'; end if;
  update public.station_secret
  set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 8))
  where id = 1;
end $$;

-- ---------------------------------------------------------------- stations (PIN)

-- Returns null when the PIN is right, otherwise an error message. Wrong PINs
-- are counted; after 25 misses in 10 minutes every station waits.
create or replace function public.check_station_pin(p_pin text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare h text;
begin
  if (select count(*) from public.pin_failures where at > now() - interval '10 minutes') >= 25 then
    return 'Too many wrong PINs. Wait a few minutes.';
  end if;
  select pin_hash into h from public.station_secret where id = 1;
  if h is null then return 'Stations are not set up yet (no PIN).'; end if;
  if p_pin is null or extensions.crypt(p_pin, h) <> h then
    insert into public.pin_failures default values;
    delete from public.pin_failures where at < now() - interval '1 day';
    return 'Wrong PIN';
  end if;
  return null;
end $$;

create or replace function public.current_bank()
returns table (bank_id uuid, is_demo boolean)
language sql stable security definer set search_path = ''
as $$
  select t.ticket_bank_id, t.is_demo
  from public.app_state s join public.tournaments t on t.id = s.current_tournament_id
  where s.id = 1
$$;

create or replace function public.station_roster(p_pin text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  err text;
  b record;
  st public.app_state;
begin
  err := public.check_station_pin(p_pin);
  if err is not null then return jsonb_build_object('ok', false, 'error', err); end if;
  select * into b from public.current_bank();
  select * into st from public.app_state where id = 1;
  return jsonb_build_object(
    'ok', true,
    'prize_store_open', coalesce((st.settings->>'prizeStoreOpen')::boolean, false),
    'frozen', public.tickets_frozen(),
    'remaining', public.ticket_budget() - public.bank_issued(b.bank_id),
    'prizes', coalesce(st.settings->'prizes', '[]'::jsonb),
    'title', st.settings->>'title',
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'emoji', p.emoji, 'color', p.color, 'photo_url', p.photo_url,
        'balance', coalesce((select sum(amount) from public.ticket_events te
                             where te.bank_id = b.bank_id and te.player_id = p.id and not te.undone), 0))
        order by lower(p.name))
      from public.players p
      where p.is_demo = coalesce(b.is_demo, false)), '[]'::jsonb)
  );
end $$;

create or replace function public.station_award(p_pin text, p_station text, p_device text, p_player uuid, p_amount int)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  err text;
  b record;
  new_id uuid;
begin
  err := public.check_station_pin(p_pin);
  if err is not null then return jsonb_build_object('ok', false, 'error', err); end if;
  if p_amount not in (1, 2, 3, 5) then return jsonb_build_object('ok', false, 'error', 'Amount must be 1, 2, 3 or 5'); end if;
  if coalesce(trim(p_station), '') = '' then return jsonb_build_object('ok', false, 'error', 'Pick a game name first'); end if;
  select * into b from public.current_bank();
  if b.bank_id is null then return jsonb_build_object('ok', false, 'error', 'No tournament is set up yet'); end if;
  if not exists (select 1 from public.players where id = p_player and is_demo = b.is_demo) then
    return jsonb_build_object('ok', false, 'error', 'Unknown player');
  end if;
  if public.tickets_frozen() then
    return jsonb_build_object('ok', false, 'error', 'Tickets are frozen for payout');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(b.bank_id::text, 1));
  if p_amount > public.ticket_budget() - public.bank_issued(b.bank_id) then
    return jsonb_build_object('ok', false, 'error',
      format('Ticket budget reached: only %s left', greatest(public.ticket_budget() - public.bank_issued(b.bank_id), 0)));
  end if;
  insert into public.ticket_events (bank_id, player_id, amount, reason, source, station, device_id)
  values (b.bank_id, p_player, p_amount, left(trim(p_station), 40), left(trim(p_station), 40), left(trim(p_station), 40), left(p_device, 64))
  returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end $$;

-- A station may undo only its own most recent award.
create or replace function public.station_undo(p_pin text, p_device text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  err text;
  b record;
  e public.ticket_events;
begin
  err := public.check_station_pin(p_pin);
  if err is not null then return jsonb_build_object('ok', false, 'error', err); end if;
  if coalesce(p_device, '') = '' then return jsonb_build_object('ok', false, 'error', 'Nothing to undo'); end if;
  if public.tickets_frozen() then return jsonb_build_object('ok', false, 'error', 'Tickets are frozen for payout'); end if;
  select * into b from public.current_bank();
  select * into e from public.ticket_events
  where device_id = p_device and bank_id = b.bank_id and amount > 0
  order by created_at desc limit 1;
  if e.id is null or e.undone then return jsonb_build_object('ok', false, 'error', 'Nothing to undo'); end if;
  update public.ticket_events set undone = true where id = e.id;
  return jsonb_build_object('ok', true, 'player_id', e.player_id, 'amount', e.amount);
end $$;

-- Prize Store: spend tickets, never below zero. Owner (p_pin null) or a station
-- PIN; either way only while the Prize Store is open.
create or replace function public.prize_purchase(p_pin text, p_device text, p_player uuid, p_cost int, p_prize text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  err text;
  b record;
  bal int;
begin
  if p_pin is null then
    if not public.is_owner() then return jsonb_build_object('ok', false, 'error', 'Not allowed'); end if;
  else
    err := public.check_station_pin(p_pin);
    if err is not null then return jsonb_build_object('ok', false, 'error', err); end if;
  end if;
  if not coalesce((select (settings->>'prizeStoreOpen')::boolean from public.app_state where id = 1), false) then
    return jsonb_build_object('ok', false, 'error', 'The Prize Store is closed');
  end if;
  if p_cost is null or p_cost < 1 or p_cost > 1000 then return jsonb_build_object('ok', false, 'error', 'Bad price'); end if;
  select * into b from public.current_bank();
  if not exists (select 1 from public.players where id = p_player and is_demo = b.is_demo) then
    return jsonb_build_object('ok', false, 'error', 'Unknown player');
  end if;
  -- One purchase at a time per kid, so two helpers can't overspend a balance.
  perform pg_advisory_xact_lock(hashtextextended(p_player::text, 0));
  select coalesce(sum(amount), 0) into bal from public.ticket_events
  where bank_id = b.bank_id and player_id = p_player and not undone;
  if bal < p_cost then
    return jsonb_build_object('ok', false, 'error', 'Not enough tickets', 'balance', bal);
  end if;
  insert into public.ticket_events (bank_id, player_id, amount, reason, source, station, device_id)
  values (b.bank_id, p_player, -p_cost, left('Prize: ' || coalesce(p_prize, ''), 80), 'Prize Store', 'Prize Store', left(p_device, 64));
  return jsonb_build_object('ok', true, 'balance', bal - p_cost);
end $$;

-- Keep-alive target for the scheduled GitHub Action.
create or replace function public.ping()
returns int
language sql stable
as $$ select 1 $$;

-- ---------------------------------------------------------------- function permissions

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_owner(), public.whoami(), public.claim_ownership(), public.get_snapshot(text),
  public.record_event(uuid, int, text, text, uuid, uuid, jsonb, jsonb), public.undo_last(uuid, int),
  public.set_station_pin(text), public.prize_purchase(text, text, uuid, int, text)
  to authenticated;
grant execute on function
  public.get_snapshot(text), public.station_roster(text), public.station_award(text, text, text, uuid, int),
  public.station_undo(text, text), public.prize_purchase(text, text, uuid, int, text), public.ping()
  to anon, authenticated;
-- Internal helpers stay private.
revoke execute on function public.check_station_pin(text), public.current_bank(), public.ticket_bank_balances(uuid),
  public.ticket_budget(), public.tickets_frozen(), public.bank_issued(uuid), public.guard_ticket_events()
  from public, anon, authenticated;

-- ---------------------------------------------------------------- live updates

-- Control (signed in) listens to table changes directly.
do $$
declare t text;
begin
  foreach t in array array['app_state', 'players', 'tournaments', 'match_events', 'ticket_events', 'payout_marks'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- The TV has no login, so it gets a tiny "something changed" broadcast on a
-- topic named after its secret token, then re-reads get_snapshot(token).
create or replace function public.notify_displays()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare tok text;
begin
  for tok in select token from public.display_tokens loop
    begin
      perform realtime.send(jsonb_build_object('table', tg_table_name), 'changed', 'display:' || tok, false);
    exception when others then
      null; -- never let a broadcast problem block a score
    end;
  end loop;
  return null;
end $$;
revoke execute on function public.notify_displays() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['app_state', 'players', 'tournaments', 'match_events', 'ticket_events', 'payout_marks'] loop
    execute format('drop trigger if exists notify_displays on public.%I', t);
    execute format(
      'create trigger notify_displays after insert or update or delete on public.%I for each statement execute function public.notify_displays()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- photos (private bucket)

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "owner manages photos" on storage.objects;
create policy "owner manages photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'photos' and public.is_owner())
  with check (bucket_id = 'photos' and public.is_owner());
