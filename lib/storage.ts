import "server-only";
import { getEnv } from "@/lib/db";

export async function uploadSubmissionFile(
  path: string,
  data: ArrayBuffer | ReadableStream | Blob,
  metadata: { contentType?: string; teamId: string; eventId: string },
) {
  const env = await getEnv();
  if (!env.SUBMISSIONS_BUCKET) {
    throw new Error("R2 binding SUBMISSIONS_BUCKET is not configured");
  }
  await env.SUBMISSIONS_BUCKET.put(path, data, {
    httpMetadata: { contentType: metadata.contentType },
    customMetadata: { teamId: metadata.teamId, eventId: metadata.eventId },
  });
  return { ok: true };
}

export async function deleteSubmissionFile(path: string) {
  const env = await getEnv();
  if (!env.SUBMISSIONS_BUCKET) return { ok: false };
  await env.SUBMISSIONS_BUCKET.delete(path);
  return { ok: true };
}

export async function getSubmissionFile(path: string) {
  const env = await getEnv();
  if (!env.SUBMISSIONS_BUCKET) return null;
  return env.SUBMISSIONS_BUCKET.get(path);
}
