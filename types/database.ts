// Hand-written stand-in for `supabase gen types`. Regenerate from a live project when ready.
export type UserRole = "admin" | "judge" | "team_leader" | "team_member";
export type SubmissionStatus = "draft" | "submitted" | "disqualified" | "finalist";
export type EventPhase =
  | "setup"
  | "submissions_open"
  | "submissions_closed"
  | "judging"
  | "results_published";

export interface Profile {
  id: string;
  email: string;
  full_name_en: string | null;
  full_name_ar: string | null;
  role: UserRole;
  university: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  phase: EventPhase;
  anonymous_judging: boolean;
  show_public_leaderboard: boolean;
  submission_deadline: string | null;
  judging_deadline: string | null;
  max_team_size: number | null;
  created_at: string;
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  display_code: string;
  leader_id: string;
  created_at: string;
}

export interface TeamMember {
  team_id: string;
  profile_id: string;
  joined_at: string;
}

export interface Submission {
  id: string;
  team_id: string;
  event_id: string;
  title: string;
  description: string;
  problem_statement: string | null;
  solution_summary: string | null;
  tech_stack: string[] | null;
  github_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  slides_url: string | null;
  attachments: SubmissionAttachment[];
  status: SubmissionStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
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
  created_at: string;
}

export interface JudgeAssignment {
  judge_id: string;
  team_id: string;
  assigned_at: string;
}

export interface Score {
  id: string;
  judge_id: string;
  team_id: string;
  criterion_id: string;
  score: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardRow {
  team_id: string;
  event_id: string;
  name: string;
  display_code: string;
  final_score: number;
  judges_scored: number;
}

export type Database = {
  public: {
    Tables: {
      events: { Row: Event; Insert: Partial<Event>; Update: Partial<Event> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      teams: { Row: Team; Insert: Partial<Team>; Update: Partial<Team> };
      team_members: {
        Row: TeamMember;
        Insert: Partial<TeamMember>;
        Update: Partial<TeamMember>;
      };
      submissions: {
        Row: Submission;
        Insert: Partial<Submission>;
        Update: Partial<Submission>;
      };
      criteria: { Row: Criterion; Insert: Partial<Criterion>; Update: Partial<Criterion> };
      conflicts_of_interest: {
        Row: ConflictOfInterest;
        Insert: Partial<ConflictOfInterest>;
        Update: Partial<ConflictOfInterest>;
      };
      judge_assignments: {
        Row: JudgeAssignment;
        Insert: Partial<JudgeAssignment>;
        Update: Partial<JudgeAssignment>;
      };
      scores: { Row: Score; Insert: Partial<Score>; Update: Partial<Score> };
    };
    Views: {
      leaderboard: { Row: LeaderboardRow };
    };
    Enums: {
      user_role: UserRole;
      submission_status: SubmissionStatus;
      event_phase: EventPhase;
    };
  };
};
