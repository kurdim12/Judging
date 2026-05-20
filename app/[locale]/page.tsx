import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("event");
  const tNav = await getTranslations("nav");
  const tBrand = await getTranslations("brand");

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-stone-200 bg-gradient-to-br from-ieee-500 to-ieee-700 px-8 py-14 text-white shadow-sm">
        <p className="text-sm uppercase tracking-wider text-ieee-100">
          {tBrand("tagline")}
        </p>
        <h1 className="mt-2 text-3xl font-bold md:text-5xl">{tBrand("title")}</h1>
        <p className="mt-4 max-w-xl text-ieee-50/90">
          {locale === "ar"
            ? "منصة تحكيم مشاريع الهاكاثون — تسليم، تقييم، ولوحة نتائج عادلة."
            : "Submissions, judging, and a fair leaderboard — all in one place."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/${locale}/login`}
            className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-ieee-700 hover:bg-ieee-50"
          >
            {tNav("login")}
          </Link>
          <Link
            href={`/${locale}/leaderboard`}
            className="rounded-md border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            {tNav("leaderboard")}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-stone-900">
          {locale === "ar" ? "الفعاليات" : "Events"}
        </h2>

        {!events || events.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-stone-500">
              {locale === "ar"
                ? "لا توجد فعاليات نشطة حالياً."
                : "No active events yet. Check back soon."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((ev) => (
              <Card key={ev.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle>{locale === "ar" ? ev.name_ar : ev.name_en}</CardTitle>
                    <Badge variant="primary">{t(`phase.${ev.phase}`)}</Badge>
                  </div>
                  <CardDescription>
                    {locale === "ar" ? ev.description_ar : ev.description_en}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-stone-500 space-y-1">
                    {ev.submission_deadline && (
                      <li>
                        {t("deadlineSubmission")}:{" "}
                        {new Date(ev.submission_deadline).toLocaleString(locale)}
                      </li>
                    )}
                    {ev.anonymous_judging && (
                      <li className="text-petra-600 font-medium">
                        ★ {t("anonymousJudging")}
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
