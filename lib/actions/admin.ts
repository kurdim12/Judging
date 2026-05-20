"use server";

import { revalidatePath } from "next/cache";
import { getDB, newId } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { criterionSchema, eventSchema } from "@/lib/validators";
import type { EventPhase, UserRole } from "@/types/database";

export type AdminResult = { ok: boolean; error?: string; data?: unknown };

function dateToEpoch(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

export async function createEventAction(input: {
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  phase: EventPhase;
  anonymous_judging: boolean;
  show_public_leaderboard: boolean;
  submission_deadline?: string | null;
  judging_deadline?: string | null;
  max_team_size: number;
}): Promise<AdminResult> {
  await requireRole("admin");
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid event data" };
  const db = await getDB();
  const id = newId();
  await db
    .prepare(
      `INSERT INTO events (
         id, name_en, name_ar, description_en, description_ar,
         phase, anonymous_judging, show_public_leaderboard,
         submission_deadline, judging_deadline, max_team_size
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      parsed.data.name_en,
      parsed.data.name_ar,
      parsed.data.description_en ?? null,
      parsed.data.description_ar ?? null,
      parsed.data.phase,
      parsed.data.anonymous_judging ? 1 : 0,
      parsed.data.show_public_leaderboard ? 1 : 0,
      dateToEpoch(parsed.data.submission_deadline),
      dateToEpoch(parsed.data.judging_deadline),
      parsed.data.max_team_size,
    )
    .run();
  revalidatePath("/", "layout");
  return { ok: true, data: { id } };
}

export async function updateEventAction(
  id: string,
  patch: Partial<{
    name_en: string;
    name_ar: string;
    description_en: string;
    description_ar: string;
    phase: EventPhase;
    anonymous_judging: boolean;
    show_public_leaderboard: boolean;
    submission_deadline: string | null;
    judging_deadline: string | null;
    max_team_size: number;
  }>,
): Promise<AdminResult> {
  await requireRole("admin");
  const db = await getDB();
  const fields: string[] = [];
  const values: unknown[] = [];
  const push = (col: string, value: unknown) => {
    fields.push(`${col} = ?`);
    values.push(value);
  };
  if (patch.name_en !== undefined) push("name_en", patch.name_en);
  if (patch.name_ar !== undefined) push("name_ar", patch.name_ar);
  if (patch.description_en !== undefined) push("description_en", patch.description_en);
  if (patch.description_ar !== undefined) push("description_ar", patch.description_ar);
  if (patch.phase !== undefined) push("phase", patch.phase);
  if (patch.anonymous_judging !== undefined)
    push("anonymous_judging", patch.anonymous_judging ? 1 : 0);
  if (patch.show_public_leaderboard !== undefined)
    push("show_public_leaderboard", patch.show_public_leaderboard ? 1 : 0);
  if (patch.submission_deadline !== undefined)
    push("submission_deadline", dateToEpoch(patch.submission_deadline));
  if (patch.judging_deadline !== undefined)
    push("judging_deadline", dateToEpoch(patch.judging_deadline));
  if (patch.max_team_size !== undefined) push("max_team_size", patch.max_team_size);

  if (fields.length === 0) return { ok: true };

  values.push(id);
  await db
    .prepare(`UPDATE events SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createCriterionAction(input: {
  event_id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  weight: number;
  max_score: number;
  display_order: number;
}): Promise<AdminResult> {
  await requireRole("admin");
  const parsed = criterionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid criterion data" };
  const db = await getDB();
  await db
    .prepare(
      `INSERT INTO criteria (
         id, event_id, name_en, name_ar, description_en, description_ar,
         weight, max_score, display_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId(),
      parsed.data.event_id,
      parsed.data.name_en,
      parsed.data.name_ar,
      parsed.data.description_en ?? null,
      parsed.data.description_ar ?? null,
      parsed.data.weight,
      parsed.data.max_score,
      parsed.data.display_order,
    )
    .run();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCriterionAction(id: string): Promise<AdminResult> {
  await requireRole("admin");
  const db = await getDB();
  await db.prepare("DELETE FROM criteria WHERE id = ?").bind(id).run();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changeUserRoleAction(
  userId: string,
  role: UserRole,
): Promise<AdminResult> {
  await requireRole("admin");
  const db = await getDB();
  await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, userId).run();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function disqualifyTeamAction(team_id: string): Promise<AdminResult> {
  await requireRole("admin");
  const db = await getDB();
  await db
    .prepare("UPDATE submissions SET status = 'disqualified' WHERE team_id = ?")
    .bind(team_id)
    .run();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function assignJudgeAction(
  judge_id: string,
  team_id: string,
): Promise<AdminResult> {
  await requireRole("admin");
  const db = await getDB();
  await db
    .prepare("INSERT OR IGNORE INTO judge_assignments (judge_id, team_id) VALUES (?, ?)")
    .bind(judge_id, team_id)
    .run();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unassignJudgeAction(
  judge_id: string,
  team_id: string,
): Promise<AdminResult> {
  await requireRole("admin");
  const db = await getDB();
  await db
    .prepare("DELETE FROM judge_assignments WHERE judge_id = ? AND team_id = ?")
    .bind(judge_id, team_id)
    .run();
  revalidatePath("/", "layout");
  return { ok: true };
}
