"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createCriterionAction, deleteCriterionAction } from "@/lib/actions/admin";
import type { Criterion } from "@/types/database";
import type { Locale } from "@/i18n";

interface EventOpt {
  id: string;
  name_en: string;
  name_ar: string;
}

export function CriteriaManager({
  events,
  criteria,
  locale,
}: {
  events: EventOpt[];
  criteria: Criterion[];
  locale: string;
}) {
  const t = useTranslations("admin");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const result = await createCriterionAction({
              event_id: String(fd.get("event_id") ?? ""),
              name_en: String(fd.get("name_en") ?? ""),
              name_ar: String(fd.get("name_ar") ?? ""),
              description_en: String(fd.get("description_en") ?? ""),
              description_ar: String(fd.get("description_ar") ?? ""),
              weight: Number(fd.get("weight") ?? 1),
              max_score: Number(fd.get("max_score") ?? 10),
              display_order: Number(fd.get("display_order") ?? 0),
            });
            if (!result.ok) {
              toast.error(result.error ?? tErr("generic"));
              return;
            }
            toast.success(t("saved"));
            (e.target as HTMLFormElement).reset();
            router.refresh();
          });
        }}
        className="grid gap-3 rounded-md border border-stone-200 bg-stone-50/50 p-4 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <Label>Event</Label>
          <Select name="event_id" required className="mt-1.5">
            <option value="">—</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {locale === "ar" ? e.name_ar : e.name_en}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>EN name</Label>
          <Input name="name_en" required className="mt-1.5" />
        </div>
        <div>
          <Label>اسم</Label>
          <Input name="name_ar" required dir="rtl" className="mt-1.5" />
        </div>
        <div>
          <Label>EN description</Label>
          <Input name="description_en" className="mt-1.5" />
        </div>
        <div>
          <Label>وصف</Label>
          <Input name="description_ar" dir="rtl" className="mt-1.5" />
        </div>
        <div>
          <Label>{t("weight")}</Label>
          <Input name="weight" type="number" step="0.1" defaultValue={1} className="mt-1.5" />
        </div>
        <div>
          <Label>{t("maxScore")}</Label>
          <Input name="max_score" type="number" defaultValue={10} className="mt-1.5" />
        </div>
        <div>
          <Label>{t("displayOrder")}</Label>
          <Input name="display_order" type="number" defaultValue={0} className="mt-1.5" />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {t("createCriterion")}
          </Button>
        </div>
      </form>

      <ul className="space-y-2">
        {criteria.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-md border border-stone-200 bg-white p-3"
          >
            <div>
              <p className="text-sm font-semibold text-stone-800">
                {locale === "ar" ? c.name_ar : c.name_en}
              </p>
              <p className="text-xs text-stone-500">
                ×{c.weight} · max {c.max_score} · order {c.display_order}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                start(async () => {
                  const r = await deleteCriterionAction(c.id);
                  if (!r.ok) toast.error(r.error ?? tErr("generic"));
                  else router.refresh();
                })
              }
            >
              ×
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
