"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { submissionSchema } from "@/lib/validators";

interface SubmissionInput {
  team_id: string;
  event_id: string;
  title: string;
  description: string;
  problem_statement?: string | null;
  solution_summary?: string | null;
  tech_stack: string[];
  github_url?: string | null;
  demo_url?: string | null;
  video_url?: string | null;
  slides_url?: string | null;
  finalize?: boolean;
}

export async function saveSubmissionAction(input: SubmissionInput) {
  await requireUser();
  const parsed = submissionSchema.safeParse({
    title: input.title,
    description: input.description,
    problem_statement: input.problem_statement ?? "",
    solution_summary: input.solution_summary ?? "",
    tech_stack: input.tech_stack ?? [],
    github_url: input.github_url ?? "",
    demo_url: input.demo_url ?? "",
    video_url: input.video_url ?? "",
    slides_url: input.slides_url ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission" };
  }
  const supabase = await createClient();

  // Block edits if the event has moved past submissions_open.
  const { data: event } = await supabase
    .from("events")
    .select("phase")
    .eq("id", input.event_id)
    .single();
  if (!event) return { ok: false, error: "Event not found" };
  if (event.phase !== "submissions_open" && event.phase !== "setup") {
    return { ok: false, error: "Submissions are closed" };
  }

  const status = input.finalize ? ("submitted" as const) : undefined;
  const submitted_at = input.finalize ? new Date().toISOString() : undefined;

  // Upsert (one submission per team/event).
  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("team_id", input.team_id)
    .eq("event_id", input.event_id)
    .maybeSingle();

  if (existing && existing.status !== "draft" && !input.finalize) {
    return { ok: false, error: "Submission is locked" };
  }

  const payload = {
    team_id: input.team_id,
    event_id: input.event_id,
    title: parsed.data.title,
    description: parsed.data.description,
    problem_statement: parsed.data.problem_statement || null,
    solution_summary: parsed.data.solution_summary || null,
    tech_stack: parsed.data.tech_stack,
    github_url: parsed.data.github_url || null,
    demo_url: parsed.data.demo_url || null,
    video_url: parsed.data.video_url || null,
    slides_url: parsed.data.slides_url || null,
    ...(status ? { status, submitted_at } : {}),
  };

  if (existing) {
    const { error } = await supabase.from("submissions").update(payload).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("submissions").insert(payload);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addAttachmentAction(
  submissionId: string,
  attachment: { path: string; name: string; size: number; type: string },
) {
  await requireUser();
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("submissions")
    .select("attachments")
    .eq("id", submissionId)
    .single();
  const existing = (sub?.attachments as Array<typeof attachment>) ?? [];
  if (existing.length >= 5) return { ok: false, error: "Max 5 files" };
  const { error } = await supabase
    .from("submissions")
    .update({ attachments: [...existing, attachment] })
    .eq("id", submissionId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeAttachmentAction(submissionId: string, path: string) {
  await requireUser();
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("submissions")
    .select("attachments")
    .eq("id", submissionId)
    .single();
  const existing = (sub?.attachments as Array<{ path: string }>) ?? [];
  const filtered = existing.filter((a) => a.path !== path);
  const { error } = await supabase
    .from("submissions")
    .update({ attachments: filtered })
    .eq("id", submissionId);
  if (error) return { ok: false, error: error.message };
  await supabase.storage.from("submissions").remove([path]);
  revalidatePath("/", "layout");
  return { ok: true };
}
