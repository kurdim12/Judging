import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getSubmissionForTeam, getTeamForUser } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmissionForm } from "@/components/submission-form";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n";

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser();
  const t = await getTranslations("submission");

  const team = await getTeamForUser(user.id);
  if (!team) redirect(`/${locale}/team`);

  const db = await getDB();
  const event = await db
    .prepare("SELECT id, phase, name_en, name_ar FROM events WHERE id = ?")
    .bind(team.event_id)
    .first<{ id: string; phase: string; name_en: string; name_ar: string }>();

  const submission = await getSubmissionForTeam(team.id, team.event_id);

  const phase = event?.phase ?? "setup";
  const locked =
    submission?.status === "submitted" ||
    submission?.status === "disqualified" ||
    submission?.status === "finalist" ||
    (phase !== "submissions_open" && phase !== "setup");

  const isLeader = team.leader_id === user.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500">
            {team.display_code} · {team.name}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          {submission?.status === "submitted" && (
            <Badge variant="success">{t("submitted")}</Badge>
          )}
          {(!submission || submission.status === "draft") && (
            <Badge variant="muted">{t("draft")}</Badge>
          )}
          {locked && submission?.status !== "submitted" && (
            <Badge variant="warning">{t("lockedAfterDeadline")}</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SubmissionForm
            locale={locale}
            teamId={team.id}
            eventId={team.event_id}
            submission={submission}
            locked={locked}
            isLeader={isLeader}
          />
        </CardContent>
      </Card>
    </div>
  );
}
