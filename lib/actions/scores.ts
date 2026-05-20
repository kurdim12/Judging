"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();

  // Confirm event phase allows judging.
  const { data: criterion } = await supabase
    .from("criteria")
    .select("event_id, max_score")
    .eq("id", input.criterion_id)
    .single();
  if (!criterion) return { ok: false, error: "Criterion not found" };
  if (parsed.data.score > criterion.max_score) {
    return { ok: false, error: `Score exceeds max (${criterion.max_score})` };
  }
  const { data: event } = await supabase
    .from("events")
    .select("phase")
    .eq("id", criterion.event_id)
    .single();
  if (!event) return { ok: false, error: "Event not found" };
  if (event.phase !== "judging" && event.phase !== "submissions_closed") {
    return { ok: false, error: "Judging is not active" };
  }

  // Check conflict
  const { data: conflict } = await supabase
    .from("conflicts_of_interest")
    .select("judge_id")
    .eq("judge_id", user.id)
    .eq("team_id", input.team_id)
    .maybeSingle();
  if (conflict) return { ok: false, error: "Conflict of interest flagged" };

  const { data: existing } = await supabase
    .from("scores")
    .select("id")
    .eq("judge_id", user.id)
    .eq("team_id", input.team_id)
    .eq("criterion_id", input.criterion_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("scores")
      .update({
        score: parsed.data.score,
        comment: parsed.data.comment ?? null,
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("scores").insert({
      judge_id: user.id,
      team_id: input.team_id,
      criterion_id: input.criterion_id,
      score: parsed.data.score,
      comment: parsed.data.comment ?? null,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function flagConflictAction(input: { team_id: string; reason?: string }) {
  const user = await requireRole("judge");
  const parsed = conflictSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const supabase = await createClient();

  // Delete any existing scores for this judge+team to avoid orphan data.
  await supabase
    .from("scores")
    .delete()
    .eq("judge_id", user.id)
    .eq("team_id", parsed.data.team_id);

  const { error } = await supabase
    .from("conflicts_of_interest")
    .insert({ judge_id: user.id, team_id: parsed.data.team_id, reason: parsed.data.reason ?? null });
  if (error && !error.message.includes("duplicate")) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearConflictAction(team_id: string) {
  const user = await requireRole("judge", "admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("conflicts_of_interest")
    .delete()
    .eq("judge_id", user.id)
    .eq("team_id", team_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
