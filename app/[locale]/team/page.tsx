import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamMembersManager } from "@/components/team-members-manager";
import type { Locale } from "@/i18n";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const user = await requireUser();
  const t = await getTranslations("team");
  const supabase = await createClient();

  // Find a team where user is leader or member.
  const { data: leadTeams } = await supabase
    .from("teams")
    .select("*, events(name_en, name_ar, phase)")
    .eq("leader_id", user.id);

  const { data: memberRows } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("profile_id", user.id);

  const memberTeamIds = (memberRows ?? []).map((r) => r.team_id);
  const { data: memberTeams } = memberTeamIds.length
    ? await supabase
        .from("teams")
        .select("*, events(name_en, name_ar, phase)")
        .in("id", memberTeamIds)
    : { data: [] };

  const allTeams = [...(leadTeams ?? []), ...(memberTeams ?? [])];
  const uniqueById = new Map<string, (typeof allTeams)[number]>();
  for (const team of allTeams) uniqueById.set(team.id, team);
  const teams = Array.from(uniqueById.values());

  if (teams.length === 0) {
    if (user.profile.role !== "team_leader" && user.profile.role !== "admin") {
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

  // Load members for the first team.
  const team = teams[0];
  const { data: rawMembers } = await supabase
    .from("team_members")
    .select("profile_id, joined_at, profiles(id, email, full_name_en, full_name_ar, role)")
    .eq("team_id", team.id);

  type MemberRow = {
    profile_id: string;
    joined_at: string;
    profiles: {
      id: string;
      email: string;
      full_name_en: string | null;
      full_name_ar: string | null;
      role: string;
    } | null;
  };
  const members = (rawMembers ?? []) as unknown as MemberRow[];

  const isLeader = team.leader_id === user.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500">{t("myTeam")}</p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">{team.name}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {locale === "ar" ? team.events?.name_ar : team.events?.name_en}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary">{team.display_code}</Badge>
          <Link href={`/${locale}/submission`}>
            <Button>{t("inviteByEmail") /* placeholder unused */}</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("members")}</CardTitle>
            <CardDescription>
              {locale === "ar"
                ? `الحد الأقصى ${team.events?.name_en ? "5" : ""} أعضاء`
                : "Add team members by their registered email."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMembersManager
              teamId={team.id}
              leaderId={team.leader_id}
              currentUserId={user.id}
              isLeader={isLeader}
              members={members.map((m) => ({
                profile_id: m.profile_id,
                email: m.profiles?.email ?? "—",
                name:
                  locale === "ar"
                    ? m.profiles?.full_name_ar ?? m.profiles?.full_name_en
                    : m.profiles?.full_name_en,
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
