import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTeamForm } from "./create-team-form";
import type { Locale } from "@/i18n";

export default async function CreateTeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser();
  if (user.role !== "team_leader" && user.role !== "admin") {
    redirect(`/${locale}/team`);
  }

  const t = await getTranslations("team");
  const db = await getDB();
  const res = await db
    .prepare(
      "SELECT id, name_en, name_ar, phase FROM events WHERE phase IN ('setup','submissions_open')",
    )
    .all<{ id: string; name_en: string; name_ar: string; phase: string }>();

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
            events={(res.results ?? []).map((e) => ({
              id: e.id,
              name: locale === "ar" ? e.name_ar : e.name_en,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
