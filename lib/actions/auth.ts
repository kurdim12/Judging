"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDB } from "@/lib/db";
import {
  createSession,
  destroySession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import type { User } from "@/types/database";

const passwordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function signInWithPasswordAction(input: {
  email: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid email or password" };

  const db = await getDB();
  const user = await db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(parsed.data.email.toLowerCase())
    .first<User & { password_hash: string | null }>();
  if (!user || !user.password_hash) {
    return { ok: false, error: "Invalid email or password" };
  }
  const ok = await verifyPassword(parsed.data.password, user.password_hash);
  if (!ok) return { ok: false, error: "Invalid email or password" };

  const sessionToken = await createSession(user.id);
  const jar = await cookies();
  jar.set(setSessionCookie(sessionToken));
  return { ok: true };
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}
