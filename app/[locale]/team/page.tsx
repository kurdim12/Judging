import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getTeamForUser, listTeamMembers } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamMembersManager } from "@/components/team-members-manager";
import type { Locale } from "@/i18n";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser();
  const t = await getTranslations("team");

  const team = await getTeamForUser(user.id);
  if (!team) {
    if (user.role !== "team_leader" && user.role !== "admin") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{t("noTeam")}</CardTitle>
            <CardDescription>
              {locale === "ar"
                ? "اطلب من قائد فريقك أن يدعوك بعنوان بريدك الإلكتروني."
                : "Ask your team leader to invite you by email."}
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }
    redirect(`/${locale}/team/create`);
  }

  const db = await getDB();
  const event = await db
    .prepare("SELECT name_en, name_ar, phase, max_team_size FROM events WHERE id = ?")
    .bind(team.event_id)
    .first<{
      name_en: string;
      name_ar: string;
      phase: string;
      max_team_size: number | null;
    }>();

  const members = await listTeamMembers(team.id);
  const isLeader = team.leader_id === user.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500">{t("myTeam")}</p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">{team.name}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {locale === "ar" ? event?.name_ar : event?.name_en}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary">{team.display_code}</Badge>
          <Link href={`/${locale}/submission`}>
            <Button>
              {locale === "ar" ? "تحرير المشروع" : "Edit submission"}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("members")}</CardTitle>
            <CardDescription>
              {locale === "ar"
                ? `الحد الأقصى ${event?.max_team_size ?? 5} أعضاء`
                : `Up to ${event?.max_team_size ?? 5} members`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMembersManager
              teamId={team.id}
              leaderId={team.leader_id}
              currentUserId={user.id}
              isLeader={isLeader}
              members={members.map((m) => ({
                profile_id: m.user_id,
                email: m.email,
                name: locale === "ar" ? m.full_name_ar ?? m.full_name_en : m.full_name_en,
              }))}
              locale={locale}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{locale === "ar" ? "الإجراءات" : "Quick actions"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/${locale}/submission`} className="block">
              <Button className="w-full">
                {locale === "ar" ? "تحرير المشروع" : "Edit submission"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
