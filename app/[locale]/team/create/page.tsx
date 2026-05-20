import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTeamForm } from "./create-team-form";
import type { Locale } from "@/i18n";

export default async function CreateTeamPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const user = await requireUser();
  if (user.profile.role !== "team_leader" && user.profile.role !== "admin") {
    redirect(`/${locale}/team`);
  }

  const t = await getTranslations("team");
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name_en, name_ar, phase")
    .in("phase", ["setup", "submissions_open"]);

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("createTitle")}</CardTitle>
          <CardDescription>
            {locale === "ar"
              ? "اختر الفعالية واختر اسماً واضحاً لفريقك."
              : "Pick an event and give your team a memorable name."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTeamForm
            locale={locale}
            events={(events ?? []).map((e) => ({
              id: e.id,
              name: locale === "ar" ? e.name_ar : e.name_en,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
