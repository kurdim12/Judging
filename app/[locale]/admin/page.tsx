import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n";

async function count(sql: string, ...bind: unknown[]): Promise<number> {
  const db = await getDB();
  const row = await db
    .prepare(sql)
    .bind(...bind)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export default async function AdminHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");

  const [usersCount, teamsCount, submissionsCount, scoresCount] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM users"),
    count("SELECT COUNT(*) AS n FROM teams"),
    count("SELECT COUNT(*) AS n FROM submissions WHERE status = 'submitted'"),
    count("SELECT COUNT(*) AS n FROM scores"),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-900">{t("title")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={locale === "ar" ? "المستخدمون" : "Users"} value={usersCount} />
        <Stat label={locale === "ar" ? "الفرق" : "Teams"} value={teamsCount} />
        <Stat
          label={locale === "ar" ? "المشاريع المُسلَّمة" : "Submissions"}
          value={submissionsCount}
        />
        <Stat label={locale === "ar" ? "الدرجات المُسجَّلة" : "Scores"} value={scoresCount} />
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
