# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**Sadhana Tracker** — a simple, mobile-first app for Sharanagati devotees to record
daily sadhana (japa rounds, reading, hearing), follow targets, review weekly
progress, and build consistency. Coordinators/admins get congregation reporting
(not yet built). Individual records are private to the owner and authorized staff.

Design goal #1: **recording a day takes a few seconds** — keep that flow fast and
thumb-friendly above all else.

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # tsc + vite build (type-check + bundle)
npm run preview      # preview production build
npm test             # Vitest (pure logic only)

supabase link --project-ref ffrpsrndadkbtktrlokm   # one-time
supabase db push                                    # apply migrations to remote
```

## Stack

Same stack as all the user's projects: **Vite + React 18 + TypeScript (strict) +
Tailwind 3 + Supabase**, Google OAuth via `supabase.auth.signInWithOAuth`.
Supabase project ref: `ffrpsrndadkbtktrlokm`. Deployed on Vercel (SPA rewrite in
`vercel.json`). PWA-ready (`public/manifest.webmanifest`); install flow/offline
sync come later.

## Architecture

- **Auth**: `src/hooks/useSession.ts` wraps `supabase.auth`. `src/App.tsx` shows
  `LandingPage` when signed out, else the app shell with a role-gated bottom nav.
- **Routing**: `src/lib/hashRoute.ts` (`useHashSegments`) — hash router, no lib.
  Pages: `record | progress | coordinator | admin`; coordinator/admin tabs only
  appear for the matching role; unknown routes fall back to `record`.
- **Profile / roles**: `src/hooks/useProfile.ts`, `src/hooks/useRole.ts`. A DB
  trigger (`handle_new_user`) creates a `profiles` row on signup. `role` ∈
  `devotee | coordinator | admin` (no row → devotee).
- **Recording**: `src/components/RecordSadhana.tsx` is the core screen. Pure-ish
  data layer in `src/lib/records.ts` (`loadDay` / `saveDay` / draft helpers).
  Sessions are rewritten wholesale (delete + insert) on save — only a few per day.
- **Progress** (`src/components/Progress.tsx`): streaks, weekly summary, and a
  `MonthCalendar` heatmap. All analytics are **pure** in `src/lib/stats.ts`
  (`resolveTarget`, `computeStreaks`, `summarizeDays`, week helpers) — unit-tested
  in `stats.test.ts`. Data fetched via `src/lib/progress.ts` from the
  `daily_totals` view.
- **Coordinator** (`CoordinatorDashboard.tsx`): pick an authorized group + week,
  see each devotee's totals vs target, drill in, export CSV. Admins see all groups.
- **Admin** (`AdminPanel.tsx`): users (role/active/group), groups, coordinator
  authorization, recommended targets (effective-dated), and the audit log.
- **Dates**: `src/lib/date.ts` — always the devotee's **local** calendar date
  (`YYYY-MM-DD`), never UTC-shifted.

## Permissions (migration `002_roles_groups.sql`)

- `groups`, `coordinator_groups` (coordinator→group authorization), `app_settings`,
  `audit_log`; `profiles.group_id` added.
- RLS helpers (SECURITY DEFINER, avoid recursion): `is_admin()`, `is_coordinator()`,
  `can_view_user(target)`. Coordinators can read profiles/records/sessions/targets
  for users in their authorized groups; admins see all.
- **Self-escalation guard**: `enforce_profile_privileges` trigger blocks non-admins
  from changing their own `role`/`active`/`group_id` (skipped when `auth.uid()` is
  null, so SQL-editor/service writes and admin bootstrap still work).
- `daily_totals` **view** is `security_invoker = true` so the *querying* user's RLS
  applies (not the view owner's) — important, don't drop that.
- Bootstraps `akshayg01@gmail.com` as admin.

## Not yet built

Personal-target UI for devotees, profile-edit page, reminders, PWA service worker
(offline/install), password resets (Google-only auth for now), account hard-delete.
`profiles.active` is set by admin but not yet enforced at login.

## Data model (migration `001_schema.sql`)

- `profiles` — one per user.
- `daily_records` — unique `(user_id, record_date)`. **A missing row = no entry;
  a present row with rounds 0 = a saved zero entry.** Keep this distinction.
- `reading_sessions` / `hearing_sessions` — FK to `daily_records`, cascade delete.
- `targets` — effective-dated; `user_id NULL` = congregation-recommended, a
  personal row overrides it. **Historical reports must read the target effective
  on each date — never recalculate with a newer target.**

RLS: each devotee sees only their own rows (+ recommended targets). Coordinator/
admin cross-user policies are deliberately deferred to a later migration.

## Roadmap (PRD-driven)

1. ✅ Auth + fast daily recording.
2. Targets UI — admin recommended target done; devotee personal-target UI pending.
3. ✅ Weekly summary, history (calendar heatmap), streaks.
4. Reminders (push/email) + offline entry & sync. — pending
5. ✅ Coordinator dashboard (congregation reports, group/week filters, CSV export).
6. ✅ Admin (accounts, roles/groups, recommended targets, audit). Password resets
   pending (Google-only auth for now).

Note: PRD mentions "Devotee ID + password" sign-in; current build uses Google
OAuth (matches the user's other projects). `profiles.devotee_id` exists for IDs.
