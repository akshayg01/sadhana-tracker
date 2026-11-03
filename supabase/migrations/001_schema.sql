-- Sadhana Tracker — core schema
-- Roles: devotee (default), coordinator, admin.
-- Privacy model: every devotee owns their rows; coordinator/admin policies are
-- added in a later migration once groups/permissions are finalised.

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles — one row per auth user (created automatically on signup)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  devotee_id   text unique,
  full_name    text,
  email        text,
  phone        text,
  address      text,
  group_name   text,
  role         text not null default 'devotee' check (role in ('devotee', 'coordinator', 'admin')),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- daily_records — one per user per local calendar date.
-- A MISSING row means "no entry". A present row with rounds 0 and no sessions
-- means "a saved zero-value entry" — the two are deliberately distinguishable.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.daily_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  record_date  date not null,
  rounds       integer not null default 0 check (rounds >= 0),
  reflection   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  synced_at    timestamptz,
  unique (user_id, record_date)
);
create index if not exists daily_records_user_date_idx
  on public.daily_records (user_id, record_date desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- reading / hearing sessions — one or more per day
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.reading_sessions (
  id          uuid primary key default gen_random_uuid(),
  record_id   uuid not null references public.daily_records (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  book_title  text not null,
  section     text,
  minutes     integer not null default 0 check (minutes >= 0),
  created_at  timestamptz not null default now()
);
create index if not exists reading_sessions_record_idx on public.reading_sessions (record_id);

create table if not exists public.hearing_sessions (
  id             uuid primary key default gen_random_uuid(),
  record_id      uuid not null references public.daily_records (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  lecture_title  text not null,
  speaker        text,
  source         text,
  minutes        integer not null default 0 check (minutes >= 0),
  created_at     timestamptz not null default now()
);
create index if not exists hearing_sessions_record_idx on public.hearing_sessions (record_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- targets — effective-dated. user_id NULL = congregation-recommended target.
-- The effective target for a given date is the latest row (per scope) with
-- effective_from <= date; a personal row overrides the recommended one.
-- Historical reports read the target that was effective on each date — never
-- silently recalculated with a newer target.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.targets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users (id) on delete cascade,
  japa_rounds      integer not null default 16 check (japa_rounds >= 0),
  reading_minutes  integer not null default 0 check (reading_minutes >= 0),
  hearing_minutes  integer not null default 0 check (hearing_minutes >= 0),
  effective_from   date not null default current_date,
  created_at       timestamptz not null default now()
);
create index if not exists targets_scope_idx on public.targets (user_id, effective_from desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at touch trigger
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists daily_records_touch on public.daily_records;
create trigger daily_records_touch before update on public.daily_records
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-create a profile row on signup
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email)
  )
  on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security — each devotee sees only their own rows.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.daily_records    enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.hearing_sessions enable row level security;
alter table public.targets          enable row level security;

-- profiles: owner read/insert/update (role column is not self-elevatable here
-- because a later admin policy/flow will govern role changes)
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- daily_records + sessions: full ownership
create policy "daily_records_own" on public.daily_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reading_sessions_own" on public.reading_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "hearing_sessions_own" on public.hearing_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- targets: read own + congregation-recommended (NULL scope); write only own
create policy "targets_select_own_or_recommended" on public.targets
  for select using (user_id is null or auth.uid() = user_id);
create policy "targets_insert_own" on public.targets
  for insert with check (auth.uid() = user_id);
create policy "targets_update_own" on public.targets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed a congregation-recommended target (16 rounds). Adjust before launch.
insert into public.targets (user_id, japa_rounds, reading_minutes, hearing_minutes, effective_from)
values (null, 16, 0, 0, current_date)
on conflict do nothing;
