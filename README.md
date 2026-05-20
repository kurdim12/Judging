# IEEE UoP Hackathon Judging Platform

Bilingual (Arabic/English), fair-by-design judging platform for the IEEE University of Petra Student Branch hackathon.

## Stack

- **Next.js 15** (App Router, Server Actions, RSC)
- **Supabase** (Postgres + Auth + Storage + Realtime + RLS)
- **Tailwind v4** with the IEEE UoP brand palette
- **next-intl** for AR/EN with RTL flipping
- **react-hook-form** + **zod** for validation
- **recharts** for leaderboard visualizations

## Quickstart

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase keys

# Apply migrations to your Supabase project:
#   supabase/migrations/001_init.sql
#   supabase/migrations/002_rls.sql
#   supabase/migrations/003_storage.sql
#   supabase/migrations/004_seed.sql  (optional — demo event)

pnpm dev
```

Visit `http://localhost:3000` — the middleware redirects to `/en`. Append `/ar` to test RTL.

After signing up, promote your account to `admin`:

```sql
update profiles set role='admin' where email='you@uop.edu.jo';
```

## Roles

| Role | Can |
|------|-----|
| `admin` | Manage events, criteria, users, teams; view full leaderboard with raw scores |
| `judge` | Score assigned submissions, flag conflicts of interest |
| `team_leader` | Create teams, invite members, submit final |
| `team_member` | Edit submission drafts on their team |

## Anti-bias features

- **Anonymous mode** — when enabled on an event, judges see only `T-001` style codes, never team/member names.
- **Conflict of interest** — one-click flag removes a team from the judge's queue and blocks scoring via RLS.
- **Z-score normalization** — `leaderboard` view normalizes each judge's scores before weighting, so a strict judge doesn't penalize their assigned teams.

## Documentation

- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — day-of-event operational guide

## Definition of Done checklist

See section 14 of the original build prompt. Each item in the matrix maps to one or more pages in this repo.
