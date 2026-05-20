import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CriteriaManager } from "./criteria-manager";
import type { Locale } from "@/i18n";

export default async function AdminCriteriaPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const { data: events } = await supabase.from("events").select("id, name_en, name_ar");
  const { data: criteria } = await supabase
    .from("criteria")
    .select("*")
    .order("display_order");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("criteria")}</CardTitle>
      </CardHeader>
      <CardContent>
        <CriteriaManager events={events ?? []} criteria={criteria ?? []} locale={locale} />
      </CardContent>
    </Card>
  );
}
