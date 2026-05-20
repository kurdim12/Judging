-- RLS for all tables. Every table must be locked down.
alter table events enable row level security;
alter table profiles enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table submissions enable row level security;
alter table criteria enable row level security;
alter table conflicts_of_interest enable row level security;
alter table judge_assignments enable row level security;
alter table scores enable row level security;

-- Helpers
create or replace function is_admin() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$ language sql security definer stable;

create or replace function is_judge() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'judge');
$$ language sql security definer stable;

create or replace function current_role_v() returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- EVENTS
create policy "events read" on events for select using (true);
create policy "events admin write" on events for all using (is_admin()) with check (is_admin());

-- PROFILES
create policy "profiles read" on profiles for select using (
  id = auth.uid() or is_admin() or is_judge()
  or exists (
    select 1 from team_members tm
    join team_members tm2 on tm.team_id = tm2.team_id
    where tm.profile_id = auth.uid() and tm2.profile_id = profiles.id
  )
  or exists (
    select 1 from teams t where t.leader_id = auth.uid()
      and exists (select 1 from team_members tm where tm.team_id = t.id and tm.profile_id = profiles.id)
  )
);
create policy "profiles update own" on profiles for update using (id = auth.uid() or is_admin());
create policy "profiles insert" on profiles for insert with check (is_admin() or id = auth.uid());

-- TEAMS
create policy "teams read" on teams for select using (
  is_admin()
  or leader_id = auth.uid()
  or exists (select 1 from team_members where team_id = teams.id and profile_id = auth.uid())
  or is_judge()
);
create policy "teams insert" on teams for insert with check (
  leader_id = auth.uid() and current_role_v() in ('team_leader', 'admin')
);
create policy "teams update" on teams for update using (leader_id = auth.uid() or is_admin());
create policy "teams delete" on teams for delete using (is_admin());

-- TEAM MEMBERS
create policy "team_members read" on team_members for select using (
  is_admin() or is_judge()
  or profile_id = auth.uid()
  or exists (select 1 from teams where teams.id = team_members.team_id and leader_id = auth.uid())
);
create policy "team_members leader manage" on team_members for all using (
  exists (select 1 from teams where teams.id = team_members.team_id and leader_id = auth.uid())
  or is_admin()
) with check (
  exists (select 1 from teams where teams.id = team_members.team_id and leader_id = auth.uid())
  or is_admin()
);

-- SUBMISSIONS
create policy "submissions read" on submissions for select using (
  is_admin()
  or exists (select 1 from teams where teams.id = submissions.team_id and (
    leader_id = auth.uid()
    or exists (select 1 from team_members where team_id = teams.id and profile_id = auth.uid())
  ))
  or (
    is_judge()
    and submissions.status = 'submitted'
    and (
      exists (select 1 from judge_assignments where judge_id = auth.uid() and team_id = submissions.team_id)
      or not exists (select 1 from judge_assignments where team_id = submissions.team_id)
    )
    and not exists (select 1 from conflicts_of_interest where judge_id = auth.uid() and team_id = submissions.team_id)
  )
);
create policy "submissions team write" on submissions for all using (
  exists (select 1 from teams where teams.id = submissions.team_id and (
    leader_id = auth.uid()
    or exists (select 1 from team_members where team_id = teams.id and profile_id = auth.uid())
  ))
  or is_admin()
) with check (
  exists (select 1 from teams where teams.id = submissions.team_id and (
    leader_id = auth.uid()
    or exists (select 1 from team_members where team_id = teams.id and profile_id = auth.uid())
  ))
  or is_admin()
);

-- CRITERIA
create policy "criteria read" on criteria for select using (true);
create policy "criteria admin" on criteria for all using (is_admin()) with check (is_admin());

-- CONFLICTS OF INTEREST
create policy "conflicts read" on conflicts_of_interest for select using (
  judge_id = auth.uid() or is_admin()
);
create policy "conflicts insert" on conflicts_of_interest for insert with check (
  judge_id = auth.uid() and is_judge()
);
create policy "conflicts delete" on conflicts_of_interest for delete using (
  judge_id = auth.uid() or is_admin()
);

-- JUDGE ASSIGNMENTS
create policy "assignments admin write" on judge_assignments for all using (is_admin()) with check (is_admin());
create policy "assignments judge read" on judge_assignments for select using (
  judge_id = auth.uid() or is_admin()
);

-- SCORES
create policy "scores judge write" on scores for insert with check (
  judge_id = auth.uid()
  and is_judge()
  and not exists (select 1 from conflicts_of_interest where judge_id = auth.uid() and team_id = scores.team_id)
);
create policy "scores judge update" on scores for update using (
  judge_id = auth.uid() and is_judge()
) with check (
  judge_id = auth.uid()
  and not exists (select 1 from conflicts_of_interest where judge_id = auth.uid() and team_id = scores.team_id)
);
create policy "scores read" on scores for select using (judge_id = auth.uid() or is_admin());
create policy "scores delete" on scores for delete using (judge_id = auth.uid() or is_admin());
