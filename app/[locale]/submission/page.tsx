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
    .prepare(
      "SELECT id, phase, name_en, name_ar, submission_deadline FROM events WHERE id = ?",
    )
    .bind(team.event_id)
    .first<{
      id: string;
      phase: string;
      name_en: string;
      name_ar: string;
      submission_deadline: number | null;
    }>();

  const submission = await getSubmissionForTeam(team.id, team.event_id);

  const phase = event?.phase ?? "setup";
  const nowSeconds = Math.floor(Date.now() / 1000);
  const deadlinePassed =
    !!event?.submission_deadline && nowSeconds > event.submission_deadline;
  const locked =
    submission?.status === "submitted" ||
    submission?.status === "disqualified" ||
    submission?.status === "finalist" ||
    (phase !== "submissions_open" && phase !== "setup") ||
    deadlinePassed;

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

      {event?.submission_deadline && (
        <DeadlineBanner
          deadline={event.submission_deadline}
          passed={deadlinePassed}
          locale={locale}
        />
      )}

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

function DeadlineBanner({
  deadline,
  passed,
  locale,
}: {
  deadline: number;
  passed: boolean;
  locale: string;
}) {
  const date = new Date(deadline * 1000);
  const display = date.toLocaleString(locale === "ar" ? "ar-JO" : "en-GB", {
    timeZone: "Asia/Amman",
    dateStyle: "medium",
    timeStyle: "short",
  });
  if (passed) {
    return (
      <div className="rounded-md border border-petra-200 bg-petra-50 px-4 py-3 text-sm text-petra-800">
        {locale === "ar"
          ? `🔒 أُغلق التسليم في ${display}`
          : `🔒 Submissions closed at ${display}`}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-ieee-200 bg-ieee-50 px-4 py-3 text-sm text-ieee-800">
      {locale === "ar"
        ? `⏰ آخر موعد للتسليم: ${display}`
        : `⏰ Submission deadline: ${display}`}
    </div>
  );
}
