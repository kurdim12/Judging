"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createEventAction, updateEventAction } from "@/lib/actions/admin";
import type { Event, EventPhase } from "@/types/database";
import type { Locale } from "@/i18n";

const phases: EventPhase[] = [
  "setup",
  "submissions_open",
  "submissions_closed",
  "judging",
  "results_published",
];

export function EventsManager({ events, locale }: { events: Event[]; locale: Locale }) {
  const tAdmin = useTranslations("admin");
  const tEvent = useTranslations("event");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [show, setShow] = useState(events.length === 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setShow((s) => !s)}>
          {show ? tEvent("publicLeaderboard") /* close */ : tAdmin("createEvent")}
        </Button>
      </div>

      {show && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const result = await createEventAction({
                name_en: String(fd.get("name_en") ?? ""),
                name_ar: String(fd.get("name_ar") ?? ""),
                description_en: String(fd.get("description_en") ?? ""),
                description_ar: String(fd.get("description_ar") ?? ""),
                phase: fd.get("phase") as EventPhase,
                anonymous_judging: fd.get("anonymous_judging") === "on",
                show_public_leaderboard: fd.get("show_public_leaderboard") === "on",
                submission_deadline: (fd.get("submission_deadline") as string) || null,
                judging_deadline: (fd.get("judging_deadline") as string) || null,
                max_team_size: Number(fd.get("max_team_size") ?? 5),
              });
              if (!result.ok) {
                toast.error(result.error ?? tErr("generic"));
                return;
              }
              toast.success(tAdmin("saved"));
              setShow(false);
              router.refresh();
            });
          }}
          className="grid gap-4 rounded-md border border-stone-200 bg-stone-50/50 p-5 md:grid-cols-2"
        >
          <div>
            <Label>EN name</Label>
            <Input name="name_en" required className="mt-1.5" />
          </div>
          <div>
            <Label>اسم بالعربية</Label>
            <Input name="name_ar" required dir="rtl" className="mt-1.5" />
          </div>
          <div className="md:col-span-2">
            <Label>EN description</Label>
            <Textarea name="description_en" className="mt-1.5" />
          </div>
          <div className="md:col-span-2">
            <Label>وصف بالعربية</Label>
            <Textarea name="description_ar" dir="rtl" className="mt-1.5" />
          </div>
          <div>
            <Label>{tAdmin("phase")}</Label>
            <Select name="phase" defaultValue="setup" className="mt-1.5">
              {phases.map((p) => (
                <option key={p} value={p}>
                  {tEvent(`phase.${p}`)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Max team size</Label>
            <Input name="max_team_size" type="number" defaultValue={5} min={1} max={20} className="mt-1.5" />
          </div>
          <div>
            <Label>Submission deadline</Label>
            <Input name="submission_deadline" type="datetime-local" className="mt-1.5" />
          </div>
          <div>
            <Label>Judging deadline</Label>
            <Input name="judging_deadline" type="datetime-local" className="mt-1.5" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="anonymous_judging" defaultChecked />
            {tEvent("anonymousJudging")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="show_public_leaderboard" defaultChecked />
            {tEvent("publicLeaderboard")}
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {tAdmin("createEvent")}
            </Button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {events.map((ev) => (
          <li
            key={ev.id}
            className="rounded-md border border-stone-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-stone-900">
                  {locale === "ar" ? ev.name_ar : ev.name_en}
                </p>
                <p className="text-xs text-stone-500">
                  {locale === "ar" ? ev.name_en : ev.name_ar}
                </p>
              </div>
              <Badge variant="primary">{tEvent(`phase.${ev.phase}`)}</Badge>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs">{tAdmin("phase")}</Label>
                <Select
                  defaultValue={ev.phase}
                  className="mt-1 h-9 text-xs"
                  onChange={(e) =>
                    start(async () => {
                      const r = await updateEventAction(ev.id, {
                        phase: e.target.value as EventPhase,
                      });
                      if (!r.ok) toast.error(r.error ?? tErr("generic"));
                      else {
                        toast.success(tAdmin("saved"));
                        router.refresh();
                      }
                    })
                  }
                >
                  {phases.map((p) => (
                    <option key={p} value={p}>
                      {tEvent(`phase.${p}`)}
                    </option>
                  ))}
                </Select>
              </div>
              <label className="mt-5 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  defaultChecked={ev.anonymous_judging}
                  onChange={(e) =>
                    start(async () => {
                      const r = await updateEventAction(ev.id, {
                        anonymous_judging: e.target.checked,
                      });
                      if (!r.ok) toast.error(r.error ?? tErr("generic"));
                      else router.refresh();
                    })
                  }
                />
                {tEvent("anonymousJudging")}
              </label>
              <label className="mt-5 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  defaultChecked={ev.show_public_leaderboard}
                  onChange={(e) =>
                    start(async () => {
                      const r = await updateEventAction(ev.id, {
                        show_public_leaderboard: e.target.checked,
                      });
                      if (!r.ok) toast.error(r.error ?? tErr("generic"));
                      else router.refresh();
                    })
                  }
                />
                {tEvent("publicLeaderboard")}
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
