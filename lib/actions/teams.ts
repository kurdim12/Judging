"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, requireRole } from "@/lib/auth";
import { teamCreateSchema, teamInviteSchema } from "@/lib/validators";
import { nextDisplayCode } from "@/lib/utils";

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

  const supabase = await createClient();

  // Generate next display code per event.
  const { data: existing } = await supabase
    .from("teams")
    .select("display_code")
    .eq("event_id", parsed.data.event_id);
  const code = nextDisplayCode((existing ?? []).map((t) => t.display_code));

  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      event_id: parsed.data.event_id,
      name: parsed.data.name,
      display_code: code,
      leader_id: user.id,
    })
    .select("*")
    .single();

  if (error || !team) return { ok: false, error: error?.message ?? "Failed to create team" };

  // Add leader as a member too.
  await supabase.from("team_members").insert({ team_id: team.id, profile_id: user.id });

  revalidatePath("/", "layout");
  return { ok: true, data: team };
}

export async function inviteMemberAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = teamInviteSchema.safeParse({
    team_id: formData.get("team_id"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid email" };

  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, leader_id, event_id")
    .eq("id", parsed.data.team_id)
    .single();
  if (!team) return { ok: false, error: "Team not found" };
  if (team.leader_id !== user.id && user.profile.role !== "admin") {
    return { ok: false, error: "Only team leaders can invite members" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email.toLowerCase())
    .maybeSingle();
  if (!profile) return { ok: false, error: "inviteNotFound" };

  const { data: existing } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("team_id", team.id)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (existing) return { ok: false, error: "alreadyMember" };

  const { error } = await supabase
    .from("team_members")
    .insert({ team_id: team.id, profile_id: profile.id });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeMemberAction(teamId: string, profileId: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("leader_id")
    .eq("id", teamId)
    .single();
  if (!team) return { ok: false, error: "Team not found" };
  if (team.leader_id !== user.id && user.profile.role !== "admin") {
    return { ok: false, error: "Only the team leader can remove members" };
  }
  if (profileId === team.leader_id) return { ok: false, error: "Cannot remove team leader" };

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("profile_id", profileId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
