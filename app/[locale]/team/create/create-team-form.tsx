"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { createTeamAction } from "@/lib/actions/teams";
import type { Locale } from "@/i18n";

export function CreateTeamForm({
  locale,
  events,
}: {
  locale: Locale;
  events: Array<{ id: string; name: string }>;
}) {
  const t = useTranslations("team");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await createTeamAction(fd);
          if (!result.ok) {
            toast.error(result.error ?? tErr("generic"));
            return;
          }
          toast.success(t("createTeam"));
          router.push(`/${locale}/team`);
        });
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="event_id">{locale === "ar" ? "الفعالية" : "Event"}</Label>
        <Select id="event_id" name="event_id" required className="mt-1.5">
          {events.length === 0 && (
            <option value="" disabled>
              {locale === "ar" ? "لا توجد فعاليات مفتوحة" : "No open events"}
            </option>
          )}
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="name">{t("teamName")}</Label>
        <Input id="name" name="name" required className="mt-1.5" />
      </div>
      <Button type="submit" disabled={pending || events.length === 0}>
        {t("createTeam")}
      </Button>
    </form>
  );
}
