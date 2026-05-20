import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { getDB } from "@/lib/db";
import {
  computeLeaderboard,
  listCriteriaForEvent,
  listEvents,
  listScoresForEvent,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import type { Locale } from "@/i18n";

export default async function AdminLeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole("admin");
  const { locale } = await params;
  const t = await getTranslations("leaderboard");

  const events = await listEvents();
  const event = events[0];
  if (!event) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const [rows, criteria, scores, judgesRes] = await Promise.all([
    computeLeaderboard(event.id),
    listCriteriaForEvent(event.id),
    listScoresForEvent(event.id),
    (await getDB())
      .prepare("SELECT id, full_name_en, full_name_ar, email FROM users WHERE role = 'judge'")
      .all<{ id: string; full_name_en: string | null; full_name_ar: string | null; email: string }>(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-stone-500">{t("normalizationNote")}</p>
      </div>
      <Card>
        <CardContent className="pt-5">
          <LiveLeaderboard
            eventId={event.id}
            initial={rows}
            anonymous={!!event.anonymous_judging}
            locale={locale}
            criteria={criteria}
            scores={scores}
            judges={judgesRes.results ?? []}
            labels={{
              rank: t("rank"),
              team: t("team"),
              finalScore: t("finalScore"),
              judgesScored: t("judgesScored"),
              raw: t("raw"),
              variance: t("variance"),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
