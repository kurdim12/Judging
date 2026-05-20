import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { listJudgeQueue } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConflictButton } from "@/components/conflict-button";
import type { Locale } from "@/i18n";

export default async function JudgePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireRole("judge");
  const t = await getTranslations("judge");
  const db = await getDB();

  const queue = await listJudgeQueue(user.id);
  if (queue.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("noTeams")}</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Compute per-team scored/total counts for this judge.
  const eventIds = Array.from(new Set(queue.map((q) => q.event_id)));
  const placeholders = eventIds.map(() => "?").join(",");
  const criteriaRes = await db
    .prepare(`SELECT event_id, COUNT(*) AS n FROM criteria WHERE event_id IN (${placeholders}) GROUP BY event_id`)
    .bind(...eventIds)
    .all<{ event_id: string; n: number }>();
  const totalByEvent = new Map(criteriaRes.results?.map((r) => [r.event_id, r.n]) ?? []);

  const scoresRes = await db
    .prepare("SELECT team_id, COUNT(DISTINCT criterion_id) AS n FROM scores WHERE judge_id = ? GROUP BY team_id")
    .bind(user.id)
    .all<{ team_id: string; n: number }>();
  const myScoresPerTeam = new Map(scoresRes.results?.map((r) => [r.team_id, r.n]) ?? []);

  const anonymousAny = queue.some((q) => q.event_anonymous);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{t("queue")}</h1>
        {anonymousAny && (
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-petra-700 bg-petra-50 border border-petra-100 rounded-md px-3 py-1.5">
            ★ {t("anonymousNotice")}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {queue.map((team) => {
          const total = totalByEvent.get(team.event_id) ?? 0;
          const done = myScoresPerTeam.get(team.id) ?? 0;
          const status = done === 0 ? "notStarted" : done >= total ? "complete" : "inProgress";
          const eventName = locale === "ar" ? team.event_name_ar : team.event_name_en;
          const anon = team.event_anonymous === 1;
          const displayName = anon ? team.display_code : `${team.display_code} · ${team.name}`;
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
                    {t(`status.${status}`)} · {done}/{total}
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
    </div>
  );
}
