import { z } from "zod";

export const teamCreateSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(2).max(60),
});

export const teamInviteSchema = z.object({
  team_id: z.string().uuid(),
  email: z.string().email(),
});

const urlOrEmpty = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\//i.test(v), { message: "Must be a valid URL" })
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const submissionSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(10).max(4000),
  problem_statement: z.string().max(2000).optional().or(z.literal("")),
  solution_summary: z.string().max(2000).optional().or(z.literal("")),
  tech_stack: z.array(z.string().min(1).max(40)).max(20).default([]),
  github_url: urlOrEmpty,
  demo_url: urlOrEmpty,
  video_url: urlOrEmpty,
  slides_url: urlOrEmpty,
});

export const scoreSchema = z.object({
  team_id: z.string().uuid(),
  criterion_id: z.string().uuid(),
  score: z.number().min(0).max(100),
  comment: z.string().max(2000).optional(),
});

export const eventSchema = z.object({
  name_en: z.string().min(2),
  name_ar: z.string().min(2),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  phase: z.enum([
    "setup",
    "submissions_open",
    "submissions_closed",
    "judging",
    "results_published",
  ]),
  anonymous_judging: z.boolean(),
  show_public_leaderboard: z.boolean(),
  submission_deadline: z.string().optional().nullable(),
  judging_deadline: z.string().optional().nullable(),
  max_team_size: z.number().int().min(1).max(20),
});

export const criterionSchema = z.object({
  event_id: z.string().uuid(),
  name_en: z.string().min(2),
  name_ar: z.string().min(2),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  weight: z.number().min(0).max(10),
  max_score: z.number().int().min(1).max(100),
  display_order: z.number().int().default(0),
});

export const conflictSchema = z.object({
  team_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});
