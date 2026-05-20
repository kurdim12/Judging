"use server";

import { revalidatePath } from "next/cache";
import { getDB, newId, now } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { conflictSchema, scoreSchema } from "@/lib/validators";

export async function upsertScoreAction(input: {
  team_id: string;
  criterion_id: string;
  score: number;
  comment?: string;
}) {
  const user = await requireRole("judge");
  const parsed = scoreSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid score" };

  const db = await getDB();
  const criterion = await db
    .prepare("SELECT event_id, max_score FROM criteria WHERE id = ?")
    .bind(input.criterion_id)
    .first<{ event_id: string; max_score: number }>();
  if (!criterion) return { ok: false, error: "Criterion not found" };
  if (parsed.data.score > criterion.max_score) {
    return { ok: false, error: `Score exceeds max (${criterion.max_score})` };
  }

  const event = await db
    .prepare("SELECT phase FROM events WHERE id = ?")
    .bind(criterion.event_id)
    .first<{ phase: string }>();
  if (!event) return { ok: false, error: "Event not found" };
  if (event.phase !== "judging" && event.phase !== "submissions_closed") {
    return { ok: false, error: "Judging is not active" };
  }

  const conflict = await db
    .prepare(
      "SELECT 1 FROM conflicts_of_interest WHERE judge_id = ? AND team_id = ?",
    )
    .bind(user.id, input.team_id)
    .first();
  if (conflict) return { ok: false, error: "Conflict of interest flagged" };

  const existing = await db
    .prepare(
      "SELECT id FROM scores WHERE judge_id = ? AND team_id = ? AND criterion_id = ?",
    )
    .bind(user.id, input.team_id, input.criterion_id)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare(
        "UPDATE scores SET score = ?, comment = ?, updated_at = ? WHERE id = ?",
      )
      .bind(parsed.data.score, parsed.data.comment ?? null, now(), existing.id)
      .run();
  } else {
    await db
      .prepare(
        "INSERT INTO scores (id, judge_id, team_id, criterion_id, score, comment) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(
        newId(),
        user.id,
        input.team_id,
        input.criterion_id,
        parsed.data.score,
        parsed.data.comment ?? null,
      )
      .run();
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function flagConflictAction(input: { team_id: string; reason?: string }) {
  const user = await requireRole("judge");
  const parsed = conflictSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const db = await getDB();
  // Remove any existing scores for this judge+team.
  await db
    .prepare("DELETE FROM scores WHERE judge_id = ? AND team_id = ?")
    .bind(user.id, parsed.data.team_id)
    .run();
  // Insert or ignore COI.
  await db
    .prepare(
      "INSERT OR REPLACE INTO conflicts_of_interest (judge_id, team_id, reason) VALUES (?, ?, ?)",
    )
    .bind(user.id, parsed.data.team_id, parsed.data.reason ?? null)
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearConflictAction(team_id: string) {
  const user = await requireRole("judge", "admin");
  const db = await getDB();
  await db
    .prepare("DELETE FROM conflicts_of_interest WHERE judge_id = ? AND team_id = ?")
    .bind(user.id, team_id)
    .run();
  revalidatePath("/", "layout");
  return { ok: true };
}
