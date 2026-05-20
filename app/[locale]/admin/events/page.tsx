import { getTranslations } from "next-intl/server";
import { listEvents } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventsManager } from "./events-manager";
import type { Locale } from "@/i18n";

export default async function AdminEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const events = await listEvents();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("events")}</CardTitle>
      </CardHeader>
      <CardContent>
        <EventsManager events={events} locale={locale} />
      </CardContent>
    </Card>
  );
}
