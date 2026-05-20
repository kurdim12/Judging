-- IEEE UoP Hackathon Judging Platform — initial schema
-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ENUMS
create type user_role as enum ('admin', 'judge', 'team_leader', 'team_member');
create type submission_status as enum ('draft', 'submitted', 'disqualified', 'finalist');
create type event_phase as enum ('setup', 'submissions_open', 'submissions_closed', 'judging', 'results_published');

-- EVENTS
create table events (
  id uuid primary key default uuid_generate_v4(),
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  phase event_phase not null default 'setup',
  anonymous_judging boolean not null default false,
  show_public_leaderboard boolean not null default true,
  submission_deadline timestamptz,
  judging_deadline timestamptz,
  max_team_size int default 5,
  created_at timestamptz not null default now()
);

-- PROFILES (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name_en text,
  full_name_ar text,
  role user_role not null default 'team_member',
  university text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- TEAMS
create table teams (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  display_code text not null,
  leader_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (event_id, name),
  unique (event_id, display_code)
);

create table team_members (
  team_id uuid not null references teams(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

-- SUBMISSIONS
create table submissions (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  title text not null,
  description text not null,
  problem_statement text,
  solution_summary text,
  tech_stack text[],
  github_url text,
  demo_url text,
  video_url text,
  slides_url text,
  attachments jsonb default '[]'::jsonb,
  status submission_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, event_id)
);

-- CRITERIA (rubric)
create table criteria (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  weight numeric(5,2) not null default 1.0,
  max_score int not null default 10,
  display_order int not null default 0
);

-- CONFLICTS OF INTEREST
create table conflicts_of_interest (
  judge_id uuid not null references profiles(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (judge_id, team_id)
);

-- JUDGE ASSIGNMENTS (optional manual assignment; otherwise all judges score all teams)
create table judge_assignments (
  judge_id uuid not null references profiles(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (judge_id, team_id)
);

-- SCORES
create table scores (
  id uuid primary key default uuid_generate_v4(),
  judge_id uuid not null references profiles(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  criterion_id uuid not null references criteria(id) on delete cascade,
  score numeric(5,2) not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (judge_id, team_id, criterion_id),
  check (score >= 0)
);

-- INDEXES
create index idx_submissions_event on submissions(event_id);
create index idx_submissions_team on submissions(team_id);
create index idx_scores_team on scores(team_id);
create index idx_scores_judge on scores(judge_id);
create index idx_team_members_profile on team_members(profile_id);
create index idx_criteria_event on criteria(event_id);

-- LEADERBOARD VIEW (z-score normalized per judge to reduce bias)
create or replace view leaderboard as
with judge_stats as (
  select judge_id, avg(score) as judge_mean, stddev_pop(score) as judge_std
  from scores group by judge_id
),
normalized as (
  select s.team_id, s.criterion_id, c.weight,
    case when js.judge_std > 0
      then (s.score - js.judge_mean) / js.judge_std
      else 0
    end as z_score
  from scores s
  join judge_stats js on js.judge_id = s.judge_id
  join criteria c on c.id = s.criterion_id
),
weighted as (
  select team_id, sum(z_score * weight) / nullif(sum(weight), 0) as final_score
  from normalized group by team_id
)
select t.id as team_id, t.event_id, t.name, t.display_code,
  coalesce(w.final_score, 0) as final_score,
  (select count(distinct judge_id) from scores where team_id = t.id) as judges_scored
from teams t
left join weighted w on w.team_id = t.id;

-- AUTO-UPDATE updated_at
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger submissions_touch before update on submissions
  for each row execute function touch_updated_at();
create trigger scores_touch before update on scores
  for each row execute function touch_updated_at();

-- AUTO-CREATE PROFILE ON SIGNUP
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, email, full_name_en)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
