"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDB, getEnv, newId, now } from "@/lib/db";
import {
  bootstrapAdminEmail,
  createSession,
  destroySession,
  SESSION_COOKIE,
  setSessionCookie,
} from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/email";
import { upsertUser } from "@/lib/queries";

const MAGIC_LINK_TTL_SECONDS = 15 * 60;

const requestSchema = z.object({
  email: z.string().email(),
  full_name: z.string().max(120).optional(),
  locale: z.enum(["en", "ar"]),
});

export async function requestMagicLink(input: z.infer<typeof requestSchema>) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid email" };

  const db = await getDB();
  const env = await getEnv();
  const token = newId().replace(/-/g, "");
  const expires = now() + MAGIC_LINK_TTL_SECONDS;
  await db
    .prepare(
      "INSERT INTO magic_links (token, email, full_name, expires_at) VALUES (?, ?, ?, ?)",
    )
    .bind(token, parsed.data.email.toLowerCase(), parsed.data.full_name ?? null, expires)
    .run();

  const siteUrl = env.SITE_URL ?? "http://localhost:3000";
  const url = `${siteUrl}/${parsed.data.locale}/auth/verify?token=${token}`;

  try {
    const result = await sendMagicLinkEmail({
      to: parsed.data.email,
      locale: parsed.data.locale,
      url,
    });
    // When Resend isn't configured, surface the link so the user can complete sign-in.
    if (result.dev && result.url) return { ok: true, devUrl: result.url };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  return { ok: true };
}

export async function consumeMagicLink(token: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!token) return { ok: false, error: "Missing token" };
  const db = await getDB();
  const link = await db
    .prepare(
      "SELECT token, email, full_name, expires_at, used FROM magic_links WHERE token = ?",
    )
    .bind(token)
    .first<{
      token: string;
      email: string;
      full_name: string | null;
      expires_at: number;
      used: number;
    }>();
  if (!link) return { ok: false, error: "Invalid link" };
  if (link.used) return { ok: false, error: "Link already used" };
  if (link.expires_at < now()) return { ok: false, error: "Link expired" };

  await db
    .prepare("UPDATE magic_links SET used = 1 WHERE token = ?")
    .bind(token)
    .run();

  const user = await upsertUser({ email: link.email, full_name_en: link.full_name });

  // Auto-promote bootstrap admin email.
  const adminEmail = await bootstrapAdminEmail();
  if (adminEmail && adminEmail.toLowerCase() === user.email.toLowerCase() && user.role !== "admin") {
    await db
      .prepare("UPDATE users SET role = 'admin' WHERE id = ?")
      .bind(user.id)
      .run();
  }

  const sessionToken = await createSession(user.id);
  const jar = await cookies();
  jar.set(setSessionCookie(sessionToken));
  return { ok: true };
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}
