import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDB() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("D1 binding 'DB' is not configured");
  return env.DB;
}

export async function getEnv() {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Math.floor(Date.now() / 1000);
}
