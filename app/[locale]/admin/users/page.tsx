import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersManager } from "./users-manager";
import type { Locale } from "@/i18n";
import type { User } from "@/types/database";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole("admin");
  const { locale } = await params;
  const t = await getTranslations("admin");
  const db = await getDB();
  const res = await db
    .prepare("SELECT * FROM users ORDER BY created_at DESC")
    .all<User>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("users")}</CardTitle>
      </CardHeader>
      <CardContent>
        <UsersManager users={res.results ?? []} locale={locale} />
      </CardContent>
    </Card>
  );
}
