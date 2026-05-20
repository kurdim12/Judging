import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n";

export default async function AdminHome({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ count: usersCount }, { count: teamsCount }, { count: submissionsCount }, { count: scoresCount }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("teams").select("*", { count: "exact", head: true }),
      supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "submitted"),
      supabase.from("scores").select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-900">{t("title")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={locale === "ar" ? "المستخدمون" : "Users"} value={usersCount ?? 0} />
        <Stat label={locale === "ar" ? "الفرق" : "Teams"} value={teamsCount ?? 0} />
        <Stat
          label={locale === "ar" ? "المشاريع المُسلَّمة" : "Submissions"}
          value={submissionsCount ?? 0}
        />
        <Stat label={locale === "ar" ? "الدرجات المُسجَّلة" : "Scores"} value={scoresCount ?? 0} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs uppercase text-stone-500 font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-ieee-600">{value}</p>
      </CardContent>
    </Card>
  );
}
