import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDB, getEnv, newId, now } from "@/lib/db";
import type { User, UserRole } from "@/types/database";

export const SESSION_COOKIE = "uop_session";
const SESSION_DAYS = 30;

interface SessionPayload {
  sid: string;
  uid: string;
  exp: number;
}

async function importKey(secret: string) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const key = await importKey(secret);
  const enc = new TextEncoder();
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return `${body}.${b64urlEncode(sig)}`;
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  try {
    const key = await importKey(secret);
    const sigBytes = b64urlDecode(sig);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer.slice(sigBytes.byteOffset, sigBytes.byteOffset + sigBytes.byteLength) as ArrayBuffer,
      new TextEncoder().encode(body),
    );
    if (!ok) return null;
    const json = new TextDecoder().decode(b64urlDecode(body));
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload.exp || payload.exp < now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface AuthedUser extends User {}

async function getSecret(): Promise<string> {
  const env = await getEnv();
  const secret = env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is not configured (run `wrangler secret put AUTH_SECRET`)",
    );
  }
  return secret;
}

export async function getUser(): Promise<AuthedUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const secret = await getSecret();
  const payload = await verifySession(token, secret);
  if (!payload) return null;

  const db = await getDB();

  // Confirm session row still exists (instant revocation).
  const row = await db
    .prepare("SELECT id, user_id, expires_at FROM sessions WHERE id = ?")
    .bind(payload.sid)
    .first<{ id: string; user_id: string; expires_at: number }>();
  if (!row || row.expires_at < now() || row.user_id !== payload.uid) return null;

  const user = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(payload.uid)
    .first<User>();
  return user;
}

export async function requireUser(): Promise<AuthedUser> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireRole(...roles: UserRole[]): Promise<AuthedUser> {
  const u = await requireUser();
  if (!roles.includes(u.role)) redirect("/");
  return u;
}

export async function createSession(userId: string): Promise<string> {
  const db = await getDB();
  const secret = await getSecret();
  const sid = newId();
  const exp = now() + SESSION_DAYS * 24 * 60 * 60;
  await db
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(sid, userId, exp)
    .run();
  return await signSession({ sid, uid: userId, exp }, secret);
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const secret = await getSecret();
    const payload = await verifySession(token, secret);
    if (payload) {
      const db = await getDB();
      await db.prepare("DELETE FROM sessions WHERE id = ?").bind(payload.sid).run();
    }
  }
  jar.delete(SESSION_COOKIE);
}

export function setSessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export async function bootstrapAdminEmail(): Promise<string | null> {
  const env = await getEnv();
  return env.BOOTSTRAP_ADMIN_EMAIL ?? null;
}

// ----- Password hashing (PBKDF2-SHA256) -----

const PBKDF2_ITERS = 100_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERS, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2$${PBKDF2_ITERS}$${b64urlEncode(salt)}$${b64urlEncode(new Uint8Array(derived))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iters = parseInt(parts[1], 10);
  const salt = b64urlDecode(parts[2]);
  const expected = b64urlDecode(parts[3]);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const actual = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt as BufferSource, iterations: iters, hash: "SHA-256" },
      key,
      expected.length * 8,
    ),
  );
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
