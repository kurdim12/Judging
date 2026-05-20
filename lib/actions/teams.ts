"use server";

import { revalidatePath } from "next/cache";
import { getDB, newId } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { teamCreateSchema, teamInviteSchema } from "@/lib/validators";
import { findUserByEmail, nextDisplayCodeForEvent } from "@/lib/queries";

export interface ActionResult {
  ok: boolean;
  error?: string;
  data?: unknown;
}

export async function createTeamAction(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("team_leader", "admin");
  const parsed = teamCreateSchema.safeParse({
    event_id: formData.get("event_id"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid team data" };

  const db = await getDB();
  const code = await nextDisplayCodeForEvent(parsed.data.event_id);
  const id = newId();

  try {
    await db
      .prepare(
        "INSERT INTO teams (id, event_id, name, display_code, leader_id) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(id, parsed.data.event_id, parsed.data.name, code, user.id)
      .run();
    await db
      .prepare("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)")
      .bind(id, user.id)
      .run();
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("UNIQUE")) return { ok: false, error: "Team name already taken" };
    return { ok: false, error: msg };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { id } };
}

export async function inviteMemberAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = teamInviteSchema.safeParse({
    team_id: formData.get("team_id"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid email" };

  const db = await getDB();
  const team = await db
    .prepare("SELECT id, leader_id, event_id FROM teams WHERE id = ?")
    .bind(parsed.data.team_id)
    .first<{ id: string; leader_id: string; event_id: string }>();
  if (!team) return { ok: false, error: "Team not found" };
  if (team.leader_id !== user.id && user.role !== "admin") {
    return { ok: false, error: "Only team leaders can invite members" };
  }

  const invitee = await findUserByEmail(parsed.data.email);
  if (!invitee) return { ok: false, error: "inviteNotFound" };

  const existing = await db
    .prepare("SELECT team_id FROM team_members WHERE team_id = ? AND user_id = ?")
    .bind(team.id, invitee.id)
    .first();
  if (existing) return { ok: false, error: "alreadyMember" };

  await db
    .prepare("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)")
    .bind(team.id, invitee.id)
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeMemberAction(
  teamId: string,
  userId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const db = await getDB();
  const team = await db
    .prepare("SELECT leader_id FROM teams WHERE id = ?")
    .bind(teamId)
    .first<{ leader_id: string }>();
  if (!team) return { ok: false, error: "Team not found" };
  if (team.leader_id !== user.id && user.role !== "admin") {
    return { ok: false, error: "Only the team leader can remove members" };
  }
  if (userId === team.leader_id) return { ok: false, error: "Cannot remove team leader" };

  await db
    .prepare("DELETE FROM team_members WHERE team_id = ? AND user_id = ?")
    .bind(teamId, userId)
    .run();
  revalidatePath("/", "layout");
  return { ok: true };
}
