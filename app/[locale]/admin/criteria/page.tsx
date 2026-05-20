import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CriteriaManager } from "./criteria-manager";
import type { Locale } from "@/i18n";

export default async function AdminCriteriaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const db = await getDB();

  const events = await db
    .prepare("SELECT id, name_en, name_ar FROM events ORDER BY created_at DESC")
    .all<{ id: string; name_en: string; name_ar: string }>();
  const criteria = await db
    .prepare("SELECT * FROM criteria ORDER BY display_order")
    .all();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("criteria")}</CardTitle>
      </CardHeader>
      <CardContent>
        <CriteriaManager
          events={events.results ?? []}
          criteria={(criteria.results ?? []) as never}
          locale={locale}
        />
      </CardContent>
    </Card>
  );
}
