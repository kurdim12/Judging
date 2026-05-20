"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { criterionSchema, eventSchema } from "@/lib/validators";
import type { UserRole, EventPhase } from "@/types/database";

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
}) {
  await requireRole("admin");
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid event data" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").insert(parsed.data).select("*").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, data };
}

export async function updateEventAction(id: string, patch: Partial<{
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
}>) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("events").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
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
}) {
  await requireRole("admin");
  const parsed = criterionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid criterion data" };
  const supabase = await createClient();
  const { error } = await supabase.from("criteria").insert(parsed.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCriterionAction(id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("criteria").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changeUserRoleAction(profile_id: string, role: UserRole) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profile_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function disqualifyTeamAction(team_id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("submissions")
    .update({ status: "disqualified" })
    .eq("team_id", team_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function assignJudgeAction(judge_id: string, team_id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("judge_assignments")
    .insert({ judge_id, team_id });
  if (error && !error.message.includes("duplicate")) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unassignJudgeAction(judge_id: string, team_id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("judge_assignments")
    .delete()
    .eq("judge_id", judge_id)
    .eq("team_id", team_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
