-- Reset schema to match docs/backend.md exactly.
-- Safe to run: confirmed no real production data exists yet.
-- Drops any tables that were previously created manually (via SQL Editor)
-- with a different structure than documented, then rebuilds cleanly.

-- Extensions ---------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- Drop old tables (CASCADE handles FK dependencies regardless of order) ----
drop table if exists notifications_log cascade;
drop table if exists facility_settings cascade;
drop table if exists quick_ratings cascade;
drop table if exists rating_history cascade;
drop table if exists queue_entries cascade;
drop table if exists games cascade;
drop table if exists facility_staff cascade;
drop table if exists courts cascade;
drop table if exists facilities cascade;
drop table if exists players cascade;

-- Tables ---------------------------------------------------------------

create table players (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text unique,
  phone text,
  avatar_url text,
  rating numeric(6,2) not null default 2.50,
  rating_dev numeric(6,2) not null default 0.80,
  skill_level text check (skill_level in ('beginner','intermediate','advanced','pro')),
  total_games int not null default 0,
  win_streak int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  timezone text not null default 'America/New_York',
  max_courts int not null,
  queue_algorithm text not null default 'skill_based'
    check (queue_algorithm in ('fifo','skill_based','random')),
  peak_hours jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table courts (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  name text not null,
  surface_type text not null default 'indoor'
    check (surface_type in ('indoor','outdoor')),
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table games (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  court_id uuid not null references courts(id) on delete cascade,
  status text not null default 'scheduled'
    check (status in ('scheduled','in_progress','completed','cancelled')),
  player1_id uuid not null references players(id),
  player2_id uuid not null references players(id),
  player3_id uuid references players(id),
  player4_id uuid references players(id),
  is_doubles boolean not null default false,
  score_team_a int,
  score_team_b int,
  started_at timestamptz,
  ended_at timestamptz,
  duration_min int,
  created_at timestamptz not null default now()
);

create table queue_entries (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting','matched','playing','completed','cancelled','no_show')),
  position int,
  joined_at timestamptz not null default now(),
  matched_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  game_id uuid references games(id),
  squad_id uuid,
  preference_tags jsonb not null default '[]'::jsonb,
  device_push_token text
);

create table rating_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  rating_before numeric(6,2),
  rating_after numeric(6,2),
  deviation_before numeric(6,2),
  deviation_after numeric(6,2),
  created_at timestamptz not null default now()
);

-- Phase 2
create table quick_ratings (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  rating text check (rating in ('too_easy','fair','too_tough')),
  created_at timestamptz not null default now()
);

create table facility_settings (
  facility_id uuid primary key references facilities(id) on delete cascade,
  check_in_method text not null default 'qr'
    check (check_in_method in ('qr','manual','nfc')),
  auto_match boolean not null default true,
  match_interval_sec int not null default 30,
  max_wait_min int not null default 60,
  no_show_grace_min int not null default 5,
  peak_hour_surcharge numeric(6,2) not null default 0
);

create table notifications_log (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  type text check (type in ('youre_up','queue_update','game_result','system')),
  title text,
  body text,
  sent_at timestamptz not null default now(),
  delivered boolean not null default false
);

-- Referenced by RLS policies below but not itemized in docs/backend.md's
-- table list -- inferred from "facility_id IN (SELECT facility_id FROM
-- facility_staff WHERE user_id = auth.uid())".
create table facility_staff (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','manager','staff')),
  created_at timestamptz not null default now(),
  unique (facility_id, user_id)
);

-- Indexes ---------------------------------------------------------------

create index idx_queue_entries_facility_status on queue_entries(facility_id, status);
create index idx_queue_entries_player on queue_entries(player_id, status);
create index idx_queue_entries_facility_joined on queue_entries(facility_id, joined_at);

create index idx_games_facility on games(facility_id, status);
create index idx_games_court on games(court_id, status);
create index idx_games_players on games(player1_id, player2_id);

create index idx_rating_history_player on rating_history(player_id, created_at desc);

create index idx_courts_facility on courts(facility_id, is_active);

create index idx_facility_staff_user on facility_staff(user_id);
create index idx_facility_staff_facility on facility_staff(facility_id);

-- Row Level Security ---------------------------------------------------------------

alter table players enable row level security;
create policy "players_own_profile" on players
  for all using (auth.uid() = id);

alter table queue_entries enable row level security;
create policy "queue_own_entries" on queue_entries
  for select using (player_id = auth.uid());
create policy "facility_queue_view" on queue_entries
  for select using (
    facility_id in (select facility_id from facility_staff where user_id = auth.uid())
  );

alter table games enable row level security;
create policy "games_own_view" on games
  for select using (
    player1_id = auth.uid() or player2_id = auth.uid() or
    player3_id = auth.uid() or player4_id = auth.uid()
  );

alter table facility_staff enable row level security;
create policy "facility_staff_own_view" on facility_staff
  for select using (user_id = auth.uid());

-- Staff/admin bypass via service role key (backend only) -- the NestJS API
-- talks to Supabase using the service role key for staff/admin operations,
-- which bypasses RLS entirely, so no additional policies are defined here
-- for staff writes.
