"use server";

import { revalidatePath } from "next/cache";
import { getDB, newId, now } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { submissionSchema } from "@/lib/validators";
import {
  getEvent,
  getSubmissionForTeam,
  getSubmissionById,
} from "@/lib/queries";
import {
  deleteSubmissionFile,
  uploadSubmissionFile,
} from "@/lib/storage";
import type { SubmissionAttachment, SubmissionRow } from "@/types/database";

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

async function canEditTeam(userId: string, teamId: string): Promise<boolean> {
  const db = await getDB();
  const row = await db
    .prepare(
      `SELECT 1 FROM teams t
       LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = ?
       WHERE t.id = ? AND (t.leader_id = ? OR tm.user_id IS NOT NULL)
       LIMIT 1`,
    )
    .bind(userId, teamId, userId)
    .first();
  return !!row;
}

async function isTeamLeader(userId: string, teamId: string): Promise<boolean> {
  const db = await getDB();
  const row = await db
    .prepare("SELECT 1 FROM teams WHERE id = ? AND leader_id = ?")
    .bind(teamId, userId)
    .first();
  return !!row;
}

export async function saveSubmissionAction(input: SubmissionInput) {
  const user = await requireUser();
  if (user.role !== "admin" && !(await canEditTeam(user.id, input.team_id))) {
    return { ok: false, error: "forbidden" };
  }
  if (input.finalize && user.role !== "admin" && !(await isTeamLeader(user.id, input.team_id))) {
    return { ok: false, error: "Only the team leader can submit final" };
  }

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

  const event = await getEvent(input.event_id);
  if (!event) return { ok: false, error: "Event not found" };
  if (event.phase !== "submissions_open" && event.phase !== "setup") {
    return { ok: false, error: "Submissions are closed" };
  }
  if (event.submission_deadline && now() > event.submission_deadline) {
    return { ok: false, error: "Submission deadline has passed" };
  }

  const db = await getDB();
  const existing = await getSubmissionForTeam(input.team_id, input.event_id);
  if (existing && existing.status !== "draft" && !input.finalize) {
    return { ok: false, error: "Submission is locked" };
  }

  const techJson = JSON.stringify(parsed.data.tech_stack);
  const status = input.finalize ? "submitted" : existing?.status ?? "draft";
  const submittedAt = input.finalize ? now() : existing?.submitted_at ?? null;

  if (existing) {
    await db
      .prepare(
        `UPDATE submissions SET
           title = ?, description = ?, problem_statement = ?, solution_summary = ?,
           tech_stack = ?, github_url = ?, demo_url = ?, video_url = ?, slides_url = ?,
           status = ?, submitted_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        parsed.data.title,
        parsed.data.description,
        parsed.data.problem_statement || null,
        parsed.data.solution_summary || null,
        techJson,
        parsed.data.github_url || null,
        parsed.data.demo_url || null,
        parsed.data.video_url || null,
        parsed.data.slides_url || null,
        status,
        submittedAt,
        now(),
        existing.id,
      )
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO submissions (
           id, team_id, event_id, title, description, problem_statement, solution_summary,
           tech_stack, github_url, demo_url, video_url, slides_url, status, submitted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        newId(),
        input.team_id,
        input.event_id,
        parsed.data.title,
        parsed.data.description,
        parsed.data.problem_statement || null,
        parsed.data.solution_summary || null,
        techJson,
        parsed.data.github_url || null,
        parsed.data.demo_url || null,
        parsed.data.video_url || null,
        parsed.data.slides_url || null,
        status,
        submittedAt,
      )
      .run();
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function uploadAttachmentAction(formData: FormData) {
  const user = await requireUser();
  const submissionId = String(formData.get("submission_id") ?? "");
  const file = formData.get("file") as File | null;
  if (!submissionId || !file) return { ok: false, error: "Missing file" };

  const submission = await getSubmissionById(submissionId);
  if (!submission) return { ok: false, error: "Submission not found" };
  if (user.role !== "admin" && !(await canEditTeam(user.id, submission.team_id))) {
    return { ok: false, error: "forbidden" };
  }
  if (submission.attachments.length >= 5) return { ok: false, error: "Max 5 files" };
  if (file.size > 50 * 1024 * 1024) return { ok: false, error: "File exceeds 50 MB" };
  if (!/\.(pdf|zip|pptx|png|jpe?g|mp4)$/i.test(file.name)) {
    return { ok: false, error: "Unsupported file type" };
  }

  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
  const path = `${submission.event_id}/${submission.team_id}/${Date.now()}-${safeName}`;
  const buffer = await file.arrayBuffer();
  await uploadSubmissionFile(path, buffer, {
    contentType: file.type,
    teamId: submission.team_id,
    eventId: submission.event_id,
  });

  const attachment: SubmissionAttachment = {
    path,
    name: file.name,
    size: file.size,
    type: file.type,
  };
  const updated = [...submission.attachments, attachment];
  const db = await getDB();
  await db
    .prepare("UPDATE submissions SET attachments = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(updated), now(), submission.id)
    .run();

  revalidatePath("/", "layout");
  return { ok: true, data: attachment };
}

export async function removeAttachmentAction(submissionId: string, path: string) {
  const user = await requireUser();
  const submission = await getSubmissionById(submissionId);
  if (!submission) return { ok: false, error: "Submission not found" };
  if (user.role !== "admin" && !(await canEditTeam(user.id, submission.team_id))) {
    return { ok: false, error: "forbidden" };
  }

  await deleteSubmissionFile(path);
  const filtered = submission.attachments.filter((a) => a.path !== path);
  const db = await getDB();
  await db
    .prepare("UPDATE submissions SET attachments = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(filtered), now(), submission.id)
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function getAttachmentDownloadAction(path: string) {
  // Only used by clients to fetch a file; we route downloads via /[locale]/files/[path]
  const user = await requireUser();
  const db = await getDB();
  const row = await db
    .prepare(
      `SELECT s.team_id, s.event_id, s.attachments, s.status FROM submissions s
       WHERE s.attachments LIKE ?`,
    )
    .bind(`%"path":"${path}"%`)
    .first<Pick<SubmissionRow, "team_id" | "event_id" | "attachments" | "status">>();
  if (!row) return { ok: false, error: "Not found" };

  if (user.role === "admin") return { ok: true };
  if (await canEditTeam(user.id, row.team_id)) return { ok: true };
  // Judges can read only if submission is submitted and no conflict.
  if (user.role === "judge" && row.status === "submitted") {
    const conflict = await db
      .prepare(
        "SELECT 1 FROM conflicts_of_interest WHERE judge_id = ? AND team_id = ?",
      )
      .bind(user.id, row.team_id)
      .first();
    if (!conflict) return { ok: true };
  }
  return { ok: false, error: "forbidden" };
}
