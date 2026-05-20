import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmissionForm } from "@/components/submission-form";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n";
import type { Submission } from "@/types/database";

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const user = await requireUser();
  const t = await getTranslations("submission");
  const supabase = await createClient();

  // Determine which team the user belongs to.
  const { data: leadTeam } = await supabase
    .from("teams")
    .select("*, events(id, phase, name_en, name_ar)")
    .eq("leader_id", user.id)
    .maybeSingle();

  let team: typeof leadTeam | null = leadTeam;
  if (!team) {
    const { data: memberLink } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (memberLink) {
      const { data: t2 } = await supabase
        .from("teams")
        .select("*, events(id, phase, name_en, name_ar)")
        .eq("id", memberLink.team_id)
        .single();
      team = t2 ?? null;
    }
  }

  if (!team) redirect(`/${locale}/team`);

  const { data: submission } = await supabase
    .from("submissions")
    .select("*")
    .eq("team_id", team.id)
    .eq("event_id", team.event_id)
    .maybeSingle();

  const phase = team.events?.phase ?? "setup";
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
          {locked && (
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
            submission={submission as Submission | null}
            locked={locked}
            isLeader={isLeader}
          />
        </CardContent>
      </Card>
    </div>
  );
}
