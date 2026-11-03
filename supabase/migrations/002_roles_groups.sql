-- Sadhana Tracker — roles, groups, coordinator scoping, audit, settings.
-- Builds on 001. Devotees still own their rows; this adds:
--   • groups + coordinator→group authorization
--   • admin full access, coordinator read access scoped to authorized groups
--   • a trigger so non-admins can't self-elevate role/active/group
--   • audit log + app_settings
--   • daily_totals view (rounds + reading/hearing minutes per day)

-- ─────────────────────────────────────────────────────────────────────────────
-- groups + membership
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

alter table public.profiles
  add column if not exists group_id uuid references public.groups (id) on delete set null;

-- which groups a coordinator is authorized to see
create table if not exists public.coordinator_groups (
  coordinator_id uuid not null references auth.users (id) on delete cascade,
  group_id       uuid not null references public.groups (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (coordinator_id, group_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- app_settings (key/value) + audit_log
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.audit_log (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid references auth.users (id) on delete set null,
  action          text not null,
  target_user_id  uuid,
  detail          jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Security helper functions (SECURITY DEFINER → bypass RLS to avoid recursion)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_coordinator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role in ('coordinator', 'admin'));
$$;

-- Can the current user view the target user's records?
-- true if: self, admin, or coordinator authorized for the target's group.
create or replace function public.can_view_user(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    auth.uid() = target
    or public.is_admin()
    or exists (
      select 1
      from public.profiles p
      join public.coordinator_groups cg on cg.group_id = p.group_id
      where p.user_id = target
        and cg.coordinator_id = auth.uid()
    );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Prevent non-admins from changing privileged columns on their own profile.
-- Skips enforcement when there is no auth context (service role / SQL editor),
-- so admin bootstrapping and server-side writes still work.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if not public.is_admin() then
    new.role     := old.role;
    new.active   := old.active;
    new.group_id := old.group_id;
  end if;
  return new;
end; $$;

drop trigger if exists profiles_enforce_privileges on public.profiles;
create trigger profiles_enforce_privileges before update on public.profiles
  for each row execute function public.enforce_profile_privileges();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — add coordinator/admin reach on top of the owner policies from 001.
-- Multiple permissive policies are OR'd together.
-- ─────────────────────────────────────────────────────────────────────────────

-- profiles
create policy "profiles_select_visible" on public.profiles
  for select using (public.can_view_user(user_id));
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- daily_records + sessions: owner (from 001) + anyone who can_view_user
create policy "daily_records_select_visible" on public.daily_records
  for select using (public.can_view_user(user_id));
create policy "reading_sessions_select_visible" on public.reading_sessions
  for select using (public.can_view_user(user_id));
create policy "hearing_sessions_select_visible" on public.hearing_sessions
  for select using (public.can_view_user(user_id));

-- targets: visible users' targets + recommended; admin manages all
create policy "targets_select_visible" on public.targets
  for select using (user_id is null or public.can_view_user(user_id));
create policy "targets_admin_all" on public.targets
  for all using (public.is_admin()) with check (public.is_admin());

-- groups: any authenticated user may read (for labels/dropdowns); admin writes
alter table public.groups enable row level security;
create policy "groups_select_all" on public.groups
  for select using (auth.uid() is not null);
create policy "groups_admin_all" on public.groups
  for all using (public.is_admin()) with check (public.is_admin());

-- coordinator_groups: the coordinator sees their own rows; admin manages all
alter table public.coordinator_groups enable row level security;
create policy "coord_groups_select_own_or_admin" on public.coordinator_groups
  for select using (coordinator_id = auth.uid() or public.is_admin());
create policy "coord_groups_admin_all" on public.coordinator_groups
  for all using (public.is_admin()) with check (public.is_admin());

-- app_settings: all authenticated read; admin writes
alter table public.app_settings enable row level security;
create policy "app_settings_select_all" on public.app_settings
  for select using (auth.uid() is not null);
create policy "app_settings_admin_all" on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- audit_log: admin reads; admin (or server) inserts
alter table public.audit_log enable row level security;
create policy "audit_select_admin" on public.audit_log
  for select using (public.is_admin());
create policy "audit_insert_admin" on public.audit_log
  for insert with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- daily_totals view — one row per recorded day with summed minutes.
-- security_invoker = true so the querying user's RLS applies (NOT the owner's).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.daily_totals
with (security_invoker = true) as
select
  dr.id                      as record_id,
  dr.user_id,
  dr.record_date,
  dr.rounds,
  coalesce(r.minutes, 0)     as reading_minutes,
  coalesce(h.minutes, 0)     as hearing_minutes
from public.daily_records dr
left join (
  select record_id, sum(minutes)::int as minutes
  from public.reading_sessions group by record_id
) r on r.record_id = dr.id
left join (
  select record_id, sum(minutes)::int as minutes
  from public.hearing_sessions group by record_id
) h on h.record_id = dr.id;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seeds
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.app_settings (key, value) values
  ('week_starts_on', '1'::jsonb)            -- 1 = Monday
on conflict (key) do nothing;

-- Bootstrap the project owner as admin (profile row already exists post-signin).
update public.profiles set role = 'admin', active = true
where email = 'akshayg01@gmail.com';
