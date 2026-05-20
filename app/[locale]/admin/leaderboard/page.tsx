import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import type { Locale } from "@/i18n";

export default async function AdminLeaderboardPage({
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
  const event = events?.[0];

  if (!event) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const [{ data: rows }, { data: criteria }, { data: scores }, { data: judges }] =
    await Promise.all([
      supabase.from("leaderboard").select("*").eq("event_id", event.id),
      supabase
        .from("criteria")
        .select("*")
        .eq("event_id", event.id)
        .order("display_order"),
      supabase
        .from("scores")
        .select("*, profiles!scores_judge_id_fkey(full_name_en, full_name_ar, email)")
        .in(
          "team_id",
          (await supabase.from("teams").select("id").eq("event_id", event.id)).data?.map(
            (t) => t.id,
          ) ?? [],
        ),
      supabase.from("profiles").select("id, full_name_en, full_name_ar, email").eq("role", "judge"),
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
            initial={rows ?? []}
            anonymous={event.anonymous_judging}
            locale={locale}
            criteria={criteria ?? []}
            scores={(scores ?? []) as never}
            judges={(judges ?? []) as never}
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
