import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export interface AuthedUser {
  id: string;
  email: string;
  profile: Profile;
}

export async function getUser(): Promise<AuthedUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // Self-heal: handle_new_user trigger should have created this, but recover otherwise.
    const { data: created } = await supabase
      .from("profiles")
      .insert({ id: user.id, email: user.email ?? "" })
      .select("*")
      .single();
    if (!created) return null;
    return { id: user.id, email: user.email ?? "", profile: created };
  }

  return { id: user.id, email: user.email ?? profile.email, profile };
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: UserRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.profile.role)) redirect("/");
  return user;
}
