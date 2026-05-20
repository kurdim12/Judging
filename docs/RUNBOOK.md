# Day-of-event runbook

Quick reference for the IEEE UoP Hackathon Judging Platform. Bookmark this and the Supabase dashboard before the event starts.

## 1. Before the event

1. Apply migrations: `supabase db push` (or paste `supabase/migrations/001_init.sql`, `002_rls.sql`, `003_storage.sql`, `004_seed.sql` into the SQL editor in order).
2. Promote yourself: run `update profiles set role='admin' where email='you@uop.edu.jo';` in the Supabase SQL editor.
3. Sign into the deployed site and confirm `/en/admin` loads.
4. Set the event in `Admin → Events`:
   - Set the right phase
   - Toggle anonymous judging if needed (recommended ON)
   - Set submission + judging deadlines
5. Confirm criteria match the rubric in `Admin → Criteria`.
6. Enable Realtime on the `scores` table in `Supabase → Database → Replication`.

## 2. Submissions phase

- Phase: `submissions_open`
- Team leaders sign up → create team → invite members → fill submission form → "Submit Final".
- To extend the deadline: edit `submission_deadline` on the event.
- To reopen a single team's submission: in SQL, `update submissions set status='draft' where team_id='…';` (do this only with a paper trail).

## 3. Judging phase

- Phase: `submissions_closed` then `judging`.
- Promote each judge in `Admin → Users` (set role = `judge`).
- (Optional) Assign judges to teams in SQL: `insert into judge_assignments (judge_id, team_id) values (…, …);`. If no assignment exists for a team, all judges can score it.
- Judges open `/en/judge`, work through their queue, score every criterion, mark complete.
- Watch the live leaderboard at `/en/admin/leaderboard` — variance column flags outlier judges.

## 4. Conflicts of interest

- Judges flag COI with one click on `/en/judge`.
- The COI is recorded in `conflicts_of_interest` and the team disappears from their queue.
- Existing scores for that judge+team are removed automatically.
- Admin sees all flags via the Supabase dashboard.

## 5. Publishing results

1. Switch event phase to `results_published`.
2. If `show_public_leaderboard = true`, `/en/leaderboard` becomes visible.
3. The leaderboard view uses z-score normalization per judge.

## 6. Disqualifying a team

- `Admin → Teams` (or run SQL): `update submissions set status='disqualified' where team_id='…';`
- The team is hidden from judge queues going forward but already-cast scores remain.

## 7. Emergency reseed

- To regenerate the demo data, run `supabase/migrations/004_seed.sql` in the SQL editor.

## 8. Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `NEXT_PUBLIC_SITE_URL` (used to build magic-link redirects)

## 9. Common issues

- Magic link goes to wrong domain → check Supabase Auth URL config and `NEXT_PUBLIC_SITE_URL`.
- Judge can't see a team → confirm the submission status is `submitted`, the judge has the `judge` role, and they haven't flagged a conflict.
- Leaderboard is empty → confirm scores exist and the phase allows viewing.
