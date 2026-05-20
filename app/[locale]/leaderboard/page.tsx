import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaderboardTable } from "@/components/leaderboard-table";
import type { Locale } from "@/i18n";

export default async function PublicLeaderboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("leaderboard");
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-stone-500">{t("pending")}</CardContent>
      </Card>
    );
  }

  const event = events[0];
  const allowed = event.show_public_leaderboard && event.phase === "results_published";

  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-stone-500">
          {event.show_public_leaderboard ? t("pending") : t("publicDisabled")}
        </CardContent>
      </Card>
    );
  }

  const { data: rows } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("event_id", event.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-stone-500">{t("normalizationNote")}</p>
      </div>
      <LeaderboardTable
        rows={rows ?? []}
        anonymous={event.anonymous_judging}
        locale={locale}
        labels={{
          rank: t("rank"),
          team: t("team"),
          finalScore: t("finalScore"),
          judgesScored: t("judgesScored"),
        }}
      />
    </div>
  );
}
