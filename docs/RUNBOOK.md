# Day-of-event runbook (Cloudflare)

Quick reference for the IEEE UoP Hackathon Judging Platform running on Cloudflare Workers + D1 + R2.

## 1. Before the event

1. Have these created in your Cloudflare account:
   - A D1 database (run `wrangler d1 create judging` once, paste the returned `database_id` into `wrangler.jsonc`).
   - Two R2 buckets: `judging-submissions` and `judging-avatars`.
2. Apply migrations:
   ```bash
   pnpm db:migrate:remote
   pnpm db:seed:remote   # optional: creates a demo event + criteria
   ```
3. Configure secrets:
   ```bash
   pnpm wrangler secret put AUTH_SECRET
   pnpm wrangler secret put RESEND_API_KEY
   pnpm wrangler secret put BOOTSTRAP_ADMIN_EMAIL
   ```
4. Deploy: `pnpm deploy`.
5. Sign in once with the bootstrap admin email — your account is promoted to `admin` automatically.
6. In `Admin → Events`, set the event phase, anonymous-judging toggle, and deadlines.
7. In `Admin → Criteria`, confirm the rubric matches the printed scorecards.

## 2. Submissions phase

- Phase: `submissions_open`
- Team leaders sign up → create team → invite members → fill submission form → **Submit Final**.
- To extend the deadline: edit `submission_deadline` on the event.
- To reopen a single team's submission, run from the wrangler shell:
  ```bash
  pnpm wrangler d1 execute judging --remote --command \
    "UPDATE submissions SET status='draft' WHERE team_id='…';"
  ```

## 3. Judging phase

- Set event phase to `submissions_closed`, then `judging`.
- Promote each judge in `Admin → Users` (set role = `judge`).
- (Optional) Assign specific judges to teams by inserting into `judge_assignments`. If no assignments exist for a team, all judges can score it.
- Judges open `/en/judge`, work through their queue, score every criterion, mark complete.
- Watch the live leaderboard at `/en/admin/leaderboard` — variance column flags outlier judges.

## 4. Conflicts of interest

- Judges flag COI with one click on `/en/judge`.
- The COI is recorded in `conflicts_of_interest` and the team disappears from their queue.
- Existing scores from that judge for that team are removed automatically.
- Admin can review all flags via:
  ```bash
  pnpm wrangler d1 execute judging --remote --command "SELECT * FROM conflicts_of_interest;"
  ```

## 5. Publishing results

1. Switch event phase to `results_published`.
2. If `show_public_leaderboard = 1`, `/en/leaderboard` becomes visible to everyone.
3. The leaderboard uses per-judge z-score normalization before weighting.

## 6. Disqualifying a team

- In `Admin → Teams`, or via SQL:
  ```bash
  pnpm wrangler d1 execute judging --remote --command \
    "UPDATE submissions SET status='disqualified' WHERE team_id='…';"
  ```
- The team is removed from judge queues going forward; previously-cast scores remain in the DB but are still factored into the leaderboard. To exclude them entirely, also delete the corresponding `scores` rows.

## 7. Emergency: roll a new admin

If you lose access to the bootstrap admin email, promote any signed-in user:

```bash
pnpm wrangler d1 execute judging --remote --command \
  "UPDATE users SET role='admin' WHERE email='you@uop.edu.jo';"
```

## 8. Bindings & secrets summary

| Name | Type | Configured via |
|------|------|---------------|
| `DB` | D1 binding | `wrangler.jsonc` |
| `SUBMISSIONS_BUCKET` | R2 binding | `wrangler.jsonc` |
| `AVATARS_BUCKET` | R2 binding | `wrangler.jsonc` |
| `SITE_URL` | var | `wrangler.jsonc` |
| `EMAIL_FROM` | var | `wrangler.jsonc` |
| `AUTH_SECRET` | secret | `wrangler secret put` |
| `RESEND_API_KEY` | secret | `wrangler secret put` |
| `BOOTSTRAP_ADMIN_EMAIL` | secret | `wrangler secret put` |

## 9. Common issues

- **Magic-link email doesn't arrive** → verify `RESEND_API_KEY` and `EMAIL_FROM` (the from-address domain must be verified in Resend).
- **`AUTH_SECRET is not configured`** → secret not yet set or not deployed; run `wrangler secret put` and redeploy.
- **Judge can't see a team** → confirm the submission status is `submitted`, the judge has the `judge` role, no COI was flagged, and the event is in `judging` (or `submissions_closed`) phase.
- **Leaderboard is empty** → confirm scores exist and the event is in `results_published` phase (public leaderboard) or you're on the admin route.
- **File downloads return 403** → check the user is signed in and either belongs to the team, is admin, or is a judge with no COI for that team.
