-- IEEE UoP Hackathon Judging Platform — D1 (SQLite) schema
-- Permissions are enforced in server actions, not at the DB layer.

PRAGMA foreign_keys = ON;

-- USERS (replaces Supabase profiles)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name_en TEXT,
  full_name_ar TEXT,
  role TEXT NOT NULL DEFAULT 'team_member'
    CHECK (role IN ('admin','judge','team_leader','team_member')),
  university TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- SESSIONS (signed in cookie, but a server-side row enables instant revocation)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- MAGIC LINKS (single-use, short-lived)
CREATE TABLE magic_links (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_magic_links_email ON magic_links(email);

-- EVENTS
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  phase TEXT NOT NULL DEFAULT 'setup'
    CHECK (phase IN ('setup','submissions_open','submissions_closed','judging','results_published')),
  anonymous_judging INTEGER NOT NULL DEFAULT 0,
  show_public_leaderboard INTEGER NOT NULL DEFAULT 1,
  submission_deadline INTEGER,
  judging_deadline INTEGER,
  max_team_size INTEGER DEFAULT 5,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- TEAMS
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_code TEXT NOT NULL,
  leader_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (event_id, name),
  UNIQUE (event_id, display_code)
);

CREATE TABLE team_members (
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- SUBMISSIONS (tech_stack and attachments stored as JSON text)
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  problem_statement TEXT,
  solution_summary TEXT,
  tech_stack TEXT NOT NULL DEFAULT '[]',
  github_url TEXT,
  demo_url TEXT,
  video_url TEXT,
  slides_url TEXT,
  attachments TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','disqualified','finalist')),
  submitted_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (team_id, event_id)
);
CREATE INDEX idx_submissions_event ON submissions(event_id);
CREATE INDEX idx_submissions_team ON submissions(team_id);

-- CRITERIA
CREATE TABLE criteria (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  weight REAL NOT NULL DEFAULT 1.0,
  max_score INTEGER NOT NULL DEFAULT 10,
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_criteria_event ON criteria(event_id);

-- CONFLICTS OF INTEREST
CREATE TABLE conflicts_of_interest (
  judge_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (judge_id, team_id)
);

-- JUDGE ASSIGNMENTS (optional manual assignment; empty = open to all judges)
CREATE TABLE judge_assignments (
  judge_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  assigned_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (judge_id, team_id)
);

-- SCORES
CREATE TABLE scores (
  id TEXT PRIMARY KEY,
  judge_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  criterion_id TEXT NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  score REAL NOT NULL CHECK (score >= 0),
  comment TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (judge_id, team_id, criterion_id)
);
CREATE INDEX idx_scores_team ON scores(team_id);
CREATE INDEX idx_scores_judge ON scores(judge_id);

-- Triggers to maintain updated_at
CREATE TRIGGER submissions_touch
  AFTER UPDATE ON submissions FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE submissions SET updated_at = unixepoch() WHERE id = NEW.id;
END;

CREATE TRIGGER scores_touch
  AFTER UPDATE ON scores FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE scores SET updated_at = unixepoch() WHERE id = NEW.id;
END;
