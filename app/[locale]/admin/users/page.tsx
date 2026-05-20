import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersManager } from "./users-manager";
import type { Locale } from "@/i18n";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("users")}</CardTitle>
      </CardHeader>
      <CardContent>
        <UsersManager users={users ?? []} locale={locale} />
      </CardContent>
    </Card>
  );
}
