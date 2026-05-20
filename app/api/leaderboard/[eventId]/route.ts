import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { computeLeaderboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  await requireRole("admin");
  const { eventId } = await params;
  const rows = await computeLeaderboard(eventId);
  return NextResponse.json({ rows });
}
