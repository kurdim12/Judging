import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getSubmissionFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const path = parts.join("/");

  const user = await getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Find the submission this attachment belongs to.
  const db = await getDB();
  const row = await db
    .prepare(
      `SELECT s.team_id, s.status FROM submissions s WHERE s.attachments LIKE ?`,
    )
    .bind(`%"path":"${path}"%`)
    .first<{ team_id: string; status: string }>();
  if (!row) return new NextResponse("Not found", { status: 404 });

  // Authorization
  let allowed = false;
  if (user.role === "admin") {
    allowed = true;
  } else {
    const member = await db
      .prepare(
        `SELECT 1 FROM teams t
         LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = ?
         WHERE t.id = ? AND (t.leader_id = ? OR tm.user_id IS NOT NULL)
         LIMIT 1`,
      )
      .bind(user.id, row.team_id, user.id)
      .first();
    if (member) allowed = true;
    else if (user.role === "judge" && row.status === "submitted") {
      const conflict = await db
        .prepare(
          "SELECT 1 FROM conflicts_of_interest WHERE judge_id = ? AND team_id = ?",
        )
        .bind(user.id, row.team_id)
        .first();
      if (!conflict) allowed = true;
    }
  }
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  const obj = await getSubmissionFile(path);
  if (!obj) return new NextResponse("Not found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "private, max-age=300");
  return new NextResponse(obj.body, { headers });
}
