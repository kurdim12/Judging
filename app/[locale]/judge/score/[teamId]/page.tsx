import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { getDB } from "@/lib/db";
import {
  getSubmissionForTeam,
  listCriteriaForEvent,
  listScoresForJudge,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoringPanel } from "@/components/scoring-panel";
import type { Locale } from "@/i18n";

export default async function ScorePage({
  params,
}: {
  params: Promise<{ locale: string; teamId: string }>;
}) {
  const { locale, teamId } = await params;
  const user = await requireRole("judge");
  const t = await getTranslations("scoring");
  const tJudge = await getTranslations("judge");

  const db = await getDB();
  const team = await db
    .prepare(
      `SELECT t.*, e.anonymous_judging AS event_anonymous, e.name_en AS event_name_en,
              e.name_ar AS event_name_ar, e.phase AS event_phase
       FROM teams t JOIN events e ON e.id = t.event_id WHERE t.id = ?`,
    )
    .bind(teamId)
    .first<{
      id: string;
      event_id: string;
      name: string;
      display_code: string;
      leader_id: string;
      created_at: number;
      event_anonymous: number;
      event_name_en: string;
      event_name_ar: string;
      event_phase: string;
    }>();
  if (!team) notFound();

  const conflict = await db
    .prepare(
      "SELECT 1 FROM conflicts_of_interest WHERE judge_id = ? AND team_id = ?",
    )
    .bind(user.id, teamId)
    .first();
  if (conflict) redirect(`/${locale}/judge`);

  const submission = await getSubmissionForTeam(teamId, team.event_id);
  const criteria = await listCriteriaForEvent(team.event_id);
  const myScores = await listScoresForJudge(user.id, teamId);

  const anonymous = team.event_anonymous === 1;
  const heading = anonymous ? team.display_code : `${team.display_code} · ${team.name}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${locale}/judge`}
          className="text-sm text-stone-600 hover:text-ieee-700"
        >
          ← {t("back")}
        </Link>
        {anonymous && (
          <Badge variant="secondary">★ {tJudge("anonymousNotice")}</Badge>
        )}
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-stone-500">
          {locale === "ar" ? team.event_name_ar : team.event_name_en}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">{heading}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{submission?.title ?? "—"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {submission ? (
              <>
                <Field label={locale === "ar" ? "الوصف" : "Description"} value={submission.description} />
                <Field
                  label={locale === "ar" ? "بيان المشكلة" : "Problem"}
                  value={submission.problem_statement}
                />
                <Field
                  label={locale === "ar" ? "ملخص الحل" : "Solution"}
                  value={submission.solution_summary}
                />
                {submission.tech_stack.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-stone-500 mb-1">
                      {locale === "ar" ? "التقنيات" : "Tech"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {submission.tech_stack.map((tech) => (
                        <Badge key={tech} variant="primary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid gap-2 text-xs">
                  <LinkRow label="GitHub" url={submission.github_url} />
                  <LinkRow label="Demo" url={submission.demo_url} />
                  <LinkRow label="Video" url={submission.video_url} />
                  <LinkRow label="Slides" url={submission.slides_url} />
                </div>
                {submission.attachments.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-stone-500 mb-1">
                      {locale === "ar" ? "المرفقات" : "Attachments"}
                    </p>
                    <ul className="space-y-1 text-xs">
                      {submission.attachments.map((a) => (
                        <li key={a.path}>
                          <a
                            href={`/${locale}/files/${encodeURIComponent(a.path)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ieee-600 hover:underline"
                          >
                            {a.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-stone-500">—</p>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <ScoringPanel
            locale={locale}
            teamId={teamId}
            criteria={criteria}
            initialScores={myScores}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs uppercase text-stone-500 mb-1">{label}</p>
      <p className="whitespace-pre-wrap text-stone-700">{value}</p>
    </div>
  );
}

function LinkRow({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return (
    <p>
      <span className="font-medium text-stone-600">{label}:</span>{" "}
      <a href={url} target="_blank" rel="noreferrer" className="text-ieee-600 hover:underline" dir="ltr">
        {url}
      </a>
    </p>
  );
}
