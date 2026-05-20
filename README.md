# IEEE UoP Hackathon Judging Platform

Bilingual (Arabic/English), fair-by-design judging platform for the IEEE University of Petra Student Branch hackathon. Runs entirely on Cloudflare: Next.js on Workers, D1 for the database, R2 for file storage.

## Stack

- **Next.js 15** (App Router, Server Actions, RSC)
- **Cloudflare Workers** via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)
- **Cloudflare D1** (SQLite) for relational data
- **Cloudflare R2** for submission file storage
- **Resend** for transactional email (magic-link sign-in)
- **Tailwind v4** with the IEEE UoP brand palette
- **next-intl** for AR/EN with RTL flipping
- **react-hook-form** + **zod** for validation
- **recharts** for leaderboard visualizations

## Quickstart

```bash
pnpm install
cp .env.example .env.local

# 1. Create the D1 database and update wrangler.jsonc with the returned database_id:
pnpm wrangler d1 create judging

# 2. Create the R2 buckets:
pnpm wrangler r2 bucket create judging-submissions
pnpm wrangler r2 bucket create judging-avatars

# 3. Apply migrations and seed (run twice — once --local for dev, once --remote for prod):
pnpm db:migrate:local
pnpm db:seed:local

# 4. Set secrets (these never go into wrangler.jsonc):
pnpm wrangler secret put AUTH_SECRET          # 32+ random characters
pnpm wrangler secret put RESEND_API_KEY       # from resend.com
pnpm wrangler secret put BOOTSTRAP_ADMIN_EMAIL # your email — auto-promoted to admin on first sign-in

# 5. Develop:
pnpm dev

# 6. Test the Workers runtime locally:
pnpm preview

# 7. Deploy:
pnpm deploy
```

Visit `http://localhost:3000` — the middleware redirects to `/en`. Append `/ar` to test RTL. After signing in with the bootstrap admin email, your account is promoted to `admin`. Other admins can be created from `/en/admin/users`.

## Roles

| Role | Can |
|------|-----|
| `admin` | Manage events, criteria, users, teams; view full leaderboard with raw scores |
| `judge` | Score assigned submissions, flag conflicts of interest |
| `team_leader` | Create teams, invite members, submit final |
| `team_member` | Edit submission drafts on their team |

## Auth model

- **Magic-link sign-in.** Email → server creates a one-time token in `magic_links` → user clicks the link → server creates a session row and signs an HttpOnly cookie with HMAC-SHA256.
- **No passwords.** No third-party auth provider needed beyond Resend for delivering the email.
- **Instant revocation.** The signed cookie carries a session id that's checked against `sessions` on every request — deleting the row signs the user out everywhere.

## Anti-bias features

- **Anonymous mode** — when enabled on an event, judges see only `T-001` style codes, never team/member names.
- **Conflict of interest** — one-click flag removes a team from the judge's queue and clears any existing scores from that judge for that team.
- **Z-score normalization** — `computeLeaderboard()` normalizes each judge's scores before weighting, so a strict judge doesn't penalize their assigned teams. (Implemented in TS rather than as a SQL view because SQLite lacks `stddev_pop`.)

## Permissions

D1 has no RLS, so permissions live in server actions (`lib/actions/*`) and in the file-proxy route (`/[locale]/files/[...path]`). Every mutating action calls `requireUser()` or `requireRole(...)`, then re-checks team/judge/conflict relationships against the DB before writing.

## Documentation

- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — day-of-event operational guide

## File structure (high level)

```
app/[locale]/        # all UI, organized by audience: (public), auth, team, judge, admin
app/api/             # JSON endpoints (leaderboard polling)
lib/db.ts            # D1 / env binding helpers
lib/auth.ts          # cookie-signed sessions + role guards
lib/queries.ts       # typed reads
lib/actions/         # server actions (mutations + permission checks)
lib/email.ts         # Resend integration
lib/storage.ts       # R2 upload/delete/read
db/migrations/       # D1 SQL migrations
wrangler.jsonc       # bindings + vars
open-next.config.ts  # OpenNext adapter config
```
