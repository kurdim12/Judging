import "server-only";
import { getDB, newId, now } from "@/lib/db";
import {
  decodeSubmission,
  type Criterion,
  type Event,
  type Score,
  type Submission,
  type SubmissionRow,
  type Team,
  type User,
  type LeaderboardRow,
} from "@/types/database";

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDB();
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<User>();
}

export async function upsertUser(opts: {
  email: string;
  full_name_en?: string | null;
}): Promise<User> {
  const db = await getDB();
  const existing = await findUserByEmail(opts.email);
  if (existing) return existing;
  const id = newId();
  await db
    .prepare(
      "INSERT INTO users (id, email, full_name_en) VALUES (?, ?, ?)",
    )
    .bind(id, opts.email.toLowerCase(), opts.full_name_en ?? null)
    .run();
  const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<User>();
  if (!row) throw new Error("Failed to create user");
  return row;
}

export async function listEvents(): Promise<Event[]> {
  const db = await getDB();
  const res = await db.prepare("SELECT * FROM events ORDER BY created_at DESC").all<Event>();
  return res.results ?? [];
}

export async function getEvent(id: string): Promise<Event | null> {
  const db = await getDB();
  return db.prepare("SELECT * FROM events WHERE id = ?").bind(id).first<Event>();
}

export async function listCriteriaForEvent(eventId: string): Promise<Criterion[]> {
  const db = await getDB();
  const res = await db
    .prepare("SELECT * FROM criteria WHERE event_id = ? ORDER BY display_order")
    .bind(eventId)
    .all<Criterion>();
  return res.results ?? [];
}

export async function getTeamForUser(userId: string): Promise<Team | null> {
  const db = await getDB();
  const led = await db
    .prepare("SELECT * FROM teams WHERE leader_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(userId)
    .first<Team>();
  if (led) return led;
  const member = await db
    .prepare(
      `SELECT t.* FROM teams t
       JOIN team_members tm ON tm.team_id = t.id
       WHERE tm.user_id = ?
       ORDER BY tm.joined_at DESC LIMIT 1`,
    )
    .bind(userId)
    .first<Team>();
  return member;
}

export async function listTeamMembers(teamId: string): Promise<
  Array<{ user_id: string; email: string; full_name_en: string | null; full_name_ar: string | null }>
> {
  const db = await getDB();
  const res = await db
    .prepare(
      `SELECT u.id AS user_id, u.email, u.full_name_en, u.full_name_ar
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = ?
       ORDER BY tm.joined_at`,
    )
    .bind(teamId)
    .all<{
      user_id: string;
      email: string;
      full_name_en: string | null;
      full_name_ar: string | null;
    }>();
  return res.results ?? [];
}

export async function nextDisplayCodeForEvent(eventId: string): Promise<string> {
  const db = await getDB();
  const res = await db
    .prepare("SELECT display_code FROM teams WHERE event_id = ?")
    .bind(eventId)
    .all<{ display_code: string }>();
  let max = 0;
  for (const row of res.results ?? []) {
    const m = row.display_code.match(/^T-(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `T-${String(max + 1).padStart(3, "0")}`;
}

export async function getSubmissionForTeam(
  teamId: string,
  eventId: string,
): Promise<Submission | null> {
  const db = await getDB();
  const row = await db
    .prepare("SELECT * FROM submissions WHERE team_id = ? AND event_id = ?")
    .bind(teamId, eventId)
    .first<SubmissionRow>();
  return row ? decodeSubmission(row) : null;
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const db = await getDB();
  const row = await db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .bind(id)
    .first<SubmissionRow>();
  return row ? decodeSubmission(row) : null;
}

export async function listJudgeQueue(judgeId: string): Promise<
  Array<Team & { event_name_en: string; event_name_ar: string; event_anonymous: number; submission_status: string | null }>
> {
  const db = await getDB();
  const res = await db
    .prepare(
      `SELECT t.*, e.name_en AS event_name_en, e.name_ar AS event_name_ar,
              e.anonymous_judging AS event_anonymous,
              s.status AS submission_status
       FROM teams t
       JOIN events e ON e.id = t.event_id
       LEFT JOIN submissions s ON s.team_id = t.id
       WHERE e.phase IN ('submissions_closed','judging','submissions_open','results_published')
         AND s.status = 'submitted'
         AND NOT EXISTS (SELECT 1 FROM conflicts_of_interest c WHERE c.judge_id = ? AND c.team_id = t.id)
         AND (
           EXISTS (SELECT 1 FROM judge_assignments ja WHERE ja.judge_id = ? AND ja.team_id = t.id)
           OR NOT EXISTS (SELECT 1 FROM judge_assignments ja WHERE ja.team_id = t.id)
         )`,
    )
    .bind(judgeId, judgeId)
    .all();
  return (res.results ?? []) as never;
}

export async function listScoresForJudge(
  judgeId: string,
  teamId: string,
): Promise<Score[]> {
  const db = await getDB();
  const res = await db
    .prepare("SELECT * FROM scores WHERE judge_id = ? AND team_id = ?")
    .bind(judgeId, teamId)
    .all<Score>();
  return res.results ?? [];
}

export async function listScoresForEvent(eventId: string): Promise<Score[]> {
  const db = await getDB();
  const res = await db
    .prepare(
      `SELECT s.* FROM scores s
       JOIN teams t ON t.id = s.team_id
       WHERE t.event_id = ?`,
    )
    .bind(eventId)
    .all<Score>();
  return res.results ?? [];
}

export async function computeLeaderboard(eventId: string): Promise<LeaderboardRow[]> {
  const db = await getDB();
  // 1. Load all scores + criteria + teams for the event
  const [teamsRes, criteriaRes, scoresRes] = await Promise.all([
    db
      .prepare("SELECT id, event_id, name, display_code FROM teams WHERE event_id = ?")
      .bind(eventId)
      .all<{ id: string; event_id: string; name: string; display_code: string }>(),
    db
      .prepare("SELECT id, weight FROM criteria WHERE event_id = ?")
      .bind(eventId)
      .all<{ id: string; weight: number }>(),
    db
      .prepare(
        `SELECT s.judge_id, s.team_id, s.criterion_id, s.score
         FROM scores s
         JOIN teams t ON t.id = s.team_id
         WHERE t.event_id = ?`,
      )
      .bind(eventId)
      .all<{ judge_id: string; team_id: string; criterion_id: string; score: number }>(),
  ]);

  const teams = teamsRes.results ?? [];
  const criteria = criteriaRes.results ?? [];
  const scores = scoresRes.results ?? [];

  const weightById = new Map(criteria.map((c) => [c.id, c.weight]));

  // Per-judge mean/stddev (population).
  const byJudge = new Map<string, number[]>();
  for (const s of scores) {
    if (!byJudge.has(s.judge_id)) byJudge.set(s.judge_id, []);
    byJudge.get(s.judge_id)!.push(s.score);
  }
  const judgeStats = new Map<string, { mean: number; std: number }>();
  for (const [jid, arr] of byJudge) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
    judgeStats.set(jid, { mean, std: Math.sqrt(variance) });
  }

  // Per-team aggregate of weighted z-scores, plus distinct judge count.
  const teamAggregate = new Map<string, { weighted: number; weightSum: number; judges: Set<string> }>();
  for (const s of scores) {
    const w = weightById.get(s.criterion_id) ?? 1;
    const stats = judgeStats.get(s.judge_id);
    const z = stats && stats.std > 0 ? (s.score - stats.mean) / stats.std : 0;
    const acc =
      teamAggregate.get(s.team_id) ?? { weighted: 0, weightSum: 0, judges: new Set<string>() };
    acc.weighted += z * w;
    acc.weightSum += w;
    acc.judges.add(s.judge_id);
    teamAggregate.set(s.team_id, acc);
  }

  return teams.map((t) => {
    const acc = teamAggregate.get(t.id);
    const final = acc && acc.weightSum > 0 ? acc.weighted / acc.weightSum : 0;
    return {
      team_id: t.id,
      event_id: t.event_id,
      name: t.name,
      display_code: t.display_code,
      final_score: final,
      judges_scored: acc ? acc.judges.size : 0,
    };
  });
}

export async function touchUpdatedAt(table: "submissions" | "scores", id: string) {
  const db = await getDB();
  await db
    .prepare(`UPDATE ${table} SET updated_at = ? WHERE id = ?`)
    .bind(now(), id)
    .run();
}
