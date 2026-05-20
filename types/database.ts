// Domain types matching the D1 (SQLite) schema. Booleans are 0/1 ints; timestamps are unix seconds.
export type UserRole = "admin" | "judge" | "team_leader" | "team_member";
export type SubmissionStatus = "draft" | "submitted" | "disqualified" | "finalist";
export type EventPhase =
  | "setup"
  | "submissions_open"
  | "submissions_closed"
  | "judging"
  | "results_published";

export interface User {
  id: string;
  email: string;
  full_name_en: string | null;
  full_name_ar: string | null;
  role: UserRole;
  university: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: number;
  created_at: number;
}

export interface MagicLink {
  token: string;
  email: string;
  full_name: string | null;
  expires_at: number;
  used: number;
  created_at: number;
}

export interface Event {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  phase: EventPhase;
  anonymous_judging: number;
  show_public_leaderboard: number;
  submission_deadline: number | null;
  judging_deadline: number | null;
  max_team_size: number | null;
  created_at: number;
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  display_code: string;
  leader_id: string;
  created_at: number;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  joined_at: number;
}

export interface SubmissionAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

// Raw row as stored — JSON fields are strings.
export interface SubmissionRow {
  id: string;
  team_id: string;
  event_id: string;
  title: string;
  description: string;
  problem_statement: string | null;
  solution_summary: string | null;
  tech_stack: string;
  github_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  slides_url: string | null;
  attachments: string;
  status: SubmissionStatus;
  submitted_at: number | null;
  created_at: number;
  updated_at: number;
}

// Decoded form used in application code.
export interface Submission {
  id: string;
  team_id: string;
  event_id: string;
  title: string;
  description: string;
  problem_statement: string | null;
  solution_summary: string | null;
  tech_stack: string[];
  github_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  slides_url: string | null;
  attachments: SubmissionAttachment[];
  status: SubmissionStatus;
  submitted_at: number | null;
  created_at: number;
  updated_at: number;
}

export function decodeSubmission(row: SubmissionRow): Submission {
  return {
    ...row,
    tech_stack: safeJsonArray<string>(row.tech_stack),
    attachments: safeJsonArray<SubmissionAttachment>(row.attachments),
  };
}

function safeJsonArray<T>(s: string | null | undefined): T[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export interface Criterion {
  id: string;
  event_id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  weight: number;
  max_score: number;
  display_order: number;
}

export interface ConflictOfInterest {
  judge_id: string;
  team_id: string;
  reason: string | null;
  created_at: number;
}

export interface JudgeAssignment {
  judge_id: string;
  team_id: string;
  assigned_at: number;
}

export interface Score {
  id: string;
  judge_id: string;
  team_id: string;
  criterion_id: string;
  score: number;
  comment: string | null;
  created_at: number;
  updated_at: number;
}

export interface LeaderboardRow {
  team_id: string;
  event_id: string;
  name: string;
  display_code: string;
  final_score: number;
  judges_scored: number;
}
