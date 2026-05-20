import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConflictButton } from "@/components/conflict-button";
import type { Locale } from "@/i18n";

export default async function JudgePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const user = await requireRole("judge");
  const t = await getTranslations("judge");
  const supabase = await createClient();

  // Find current active event (judging or submissions_closed phase).
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .in("phase", ["judging", "submissions_closed", "submissions_open"]);

  // Combine all teams across active events.
  const eventIds = (events ?? []).map((e) => e.id);
  if (eventIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("noTeams")}</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("*, events(name_en, name_ar, anonymous_judging, phase)")
    .in("event_id", eventIds);

  // Pull related data for status calculations
  const teamIds = (teams ?? []).map((t) => t.id);
  const [assignmentsRes, submissionsRes, conflictsRes, scoresRes, criteriaRes] = await Promise.all([
    supabase.from("judge_assignments").select("team_id").eq("judge_id", user.id),
    supabase.from("submissions").select("team_id, status").in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("conflicts_of_interest").select("team_id").eq("judge_id", user.id),
    supabase.from("scores").select("team_id, criterion_id").eq("judge_id", user.id),
    supabase.from("criteria").select("id, event_id").in("event_id", eventIds),
  ]);

  const myAssignments = new Set((assignmentsRes.data ?? []).map((a) => a.team_id));
  const allAssignmentsRes = await supabase
    .from("judge_assignments")
    .select("team_id")
    .in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);
  const assignedTeams = new Set((allAssignmentsRes.data ?? []).map((a) => a.team_id));
  const submitted = new Map((submissionsRes.data ?? []).map((s) => [s.team_id, s.status]));
  const conflicts = new Set((conflictsRes.data ?? []).map((c) => c.team_id));
  const criteriaByEvent = new Map<string, number>();
  for (const c of criteriaRes.data ?? []) {
    criteriaByEvent.set(c.event_id, (criteriaByEvent.get(c.event_id) ?? 0) + 1);
  }
  const myScores = new Map<string, Set<string>>();
  for (const s of scoresRes.data ?? []) {
    if (!myScores.has(s.team_id)) myScores.set(s.team_id, new Set());
    myScores.get(s.team_id)!.add(s.criterion_id);
  }

  // Filter visible teams: assigned-to-me OR unassigned, minus conflicts, only submitted.
  const visible = (teams ?? []).filter((team) => {
    if (conflicts.has(team.id)) return false;
    if (submitted.get(team.id) !== "submitted" && submitted.get(team.id) !== "finalist") {
      return false;
    }
    if (assignedTeams.has(team.id)) return myAssignments.has(team.id);
    return true;
  });

  const anonymous = (events ?? []).some((e) => e.anonymous_judging);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{t("queue")}</h1>
        {anonymous && (
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-petra-700 bg-petra-50 border border-petra-100 rounded-md px-3 py-1.5">
            ★ {t("anonymousNotice")}
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("noTeams")}</CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((team) => {
            const totalCriteria = criteriaByEvent.get(team.event_id) ?? 0;
            const myDone = myScores.get(team.id)?.size ?? 0;
            const status =
              myDone === 0
                ? "notStarted"
                : myDone >= totalCriteria
                  ? "complete"
                  : "inProgress";
            const eventName =
              locale === "ar" ? team.events?.name_ar : team.events?.name_en;
            const anonMode = team.events?.anonymous_judging;
            const displayName = anonMode ? team.display_code : `${team.display_code} · ${team.name}`;
            return (
              <Card key={team.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{displayName}</CardTitle>
                    <Badge
                      variant={
                        status === "complete"
                          ? "success"
                          : status === "inProgress"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {t(`status.${status}`)} · {myDone}/{totalCriteria}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">{eventName}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Link href={`/${locale}/judge/score/${team.id}`}>
                    <Button size="sm">{t("scoreNow")}</Button>
                  </Link>
                  <ConflictButton teamId={team.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
