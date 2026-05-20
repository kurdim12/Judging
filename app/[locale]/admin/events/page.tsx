import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventsManager } from "./events-manager";
import type { Locale } from "@/i18n";

export default async function AdminEventsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("events")}</CardTitle>
      </CardHeader>
      <CardContent>
        <EventsManager events={events ?? []} locale={locale} />
      </CardContent>
    </Card>
  );
}
