import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n";

export default async function AdminTeamsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select("*, events(name_en, name_ar), submissions(status, title), team_members(profile_id)")
    .order("created_at", { ascending: false });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("teams")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH>Code</TH>
              <TH>{locale === "ar" ? "الاسم" : "Name"}</TH>
              <TH>{locale === "ar" ? "الفعالية" : "Event"}</TH>
              <TH>{locale === "ar" ? "الأعضاء" : "Members"}</TH>
              <TH>{locale === "ar" ? "الحالة" : "Status"}</TH>
            </TR>
          </THead>
          <TBody>
            {(teams ?? []).map((tm) => {
              const submission = (tm.submissions as { status: string; title?: string }[])?.[0];
              const memberCount = (tm.team_members as { profile_id: string }[])?.length ?? 0;
              return (
                <TR key={tm.id}>
                  <TD className="font-mono text-xs">{tm.display_code}</TD>
                  <TD>
                    <p className="font-medium">{tm.name}</p>
                    {submission?.title && (
                      <p className="text-xs text-stone-500">{submission.title}</p>
                    )}
                  </TD>
                  <TD className="text-stone-600 text-xs">
                    {locale === "ar"
                      ? (tm.events as { name_ar: string } | null)?.name_ar
                      : (tm.events as { name_en: string } | null)?.name_en}
                  </TD>
                  <TD className="text-center">{memberCount}</TD>
                  <TD>
                    {submission?.status === "submitted" && (
                      <Badge variant="success">submitted</Badge>
                    )}
                    {submission?.status === "draft" && <Badge variant="muted">draft</Badge>}
                    {submission?.status === "disqualified" && (
                      <Badge variant="danger">disqualified</Badge>
                    )}
                    {!submission && <Badge variant="muted">no submission</Badge>}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
