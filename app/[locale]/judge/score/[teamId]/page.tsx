import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoringPanel } from "@/components/scoring-panel";
import type { Locale } from "@/i18n";

export default async function ScorePage({
  params,
}: {
  params: Promise<{ locale: Locale; teamId: string }>;
}) {
  const { locale, teamId } = await params;
  const user = await requireRole("judge");
  const t = await getTranslations("scoring");
  const tJudge = await getTranslations("judge");
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("*, events(id, anonymous_judging, name_en, name_ar, phase)")
    .eq("id", teamId)
    .single();
  if (!team) notFound();

  // Conflict gate
  const { data: conflict } = await supabase
    .from("conflicts_of_interest")
    .select("judge_id")
    .eq("judge_id", user.id)
    .eq("team_id", teamId)
    .maybeSingle();
  if (conflict) redirect(`/${locale}/judge`);

  const { data: submission } = await supabase
    .from("submissions")
    .select("*")
    .eq("team_id", teamId)
    .eq("event_id", team.event_id)
    .maybeSingle();

  const { data: criteria } = await supabase
    .from("criteria")
    .select("*")
    .eq("event_id", team.event_id)
    .order("display_order");

  const { data: myScores } = await supabase
    .from("scores")
    .select("*")
    .eq("judge_id", user.id)
    .eq("team_id", teamId);

  const anonymous = team.events?.anonymous_judging;
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
          {locale === "ar" ? team.events?.name_ar : team.events?.name_en}
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
                {submission.tech_stack && submission.tech_stack.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-stone-500 mb-1">
                      {locale === "ar" ? "التقنيات" : "Tech"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {submission.tech_stack.map((tech: string) => (
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
            criteria={criteria ?? []}
            initialScores={myScores ?? []}
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
