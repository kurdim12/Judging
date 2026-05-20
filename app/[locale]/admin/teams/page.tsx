import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n";

interface TeamRow {
  id: string;
  name: string;
  display_code: string;
  event_id: string;
  event_name_en: string;
  event_name_ar: string;
  submission_status: string | null;
  submission_title: string | null;
  member_count: number;
}

export default async function AdminTeamsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole("admin");
  const { locale } = await params;
  const t = await getTranslations("admin");
  const db = await getDB();

  const res = await db
    .prepare(
      `SELECT
         t.id, t.name, t.display_code, t.event_id,
         e.name_en AS event_name_en, e.name_ar AS event_name_ar,
         s.status AS submission_status,
         s.title AS submission_title,
         (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
       FROM teams t
       JOIN events e ON e.id = t.event_id
       LEFT JOIN submissions s ON s.team_id = t.id
       ORDER BY t.created_at DESC`,
    )
    .all<TeamRow>();
  const teams = res.results ?? [];

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
            {teams.map((tm) => (
              <TR key={tm.id}>
                <TD className="font-mono text-xs">{tm.display_code}</TD>
                <TD>
                  <p className="font-medium">{tm.name}</p>
                  {tm.submission_title && (
                    <p className="text-xs text-stone-500">{tm.submission_title}</p>
                  )}
                </TD>
                <TD className="text-stone-600 text-xs">
                  {locale === "ar" ? tm.event_name_ar : tm.event_name_en}
                </TD>
                <TD className="text-center">{tm.member_count}</TD>
                <TD>
                  {tm.submission_status === "submitted" && (
                    <Badge variant="success">submitted</Badge>
                  )}
                  {tm.submission_status === "draft" && <Badge variant="muted">draft</Badge>}
                  {tm.submission_status === "disqualified" && (
                    <Badge variant="danger">disqualified</Badge>
                  )}
                  {!tm.submission_status && <Badge variant="muted">no submission</Badge>}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
