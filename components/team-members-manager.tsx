"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { inviteMemberAction, removeMemberAction } from "@/lib/actions/teams";
import type { Locale } from "@/i18n";

interface Member {
  profile_id: string;
  email: string;
  name?: string | null;
}

export function TeamMembersManager({
  teamId,
  leaderId,
  currentUserId,
  isLeader,
  members,
  locale,
}: {
  teamId: string;
  leaderId: string;
  currentUserId: string;
  isLeader: boolean;
  members: Member[];
  locale: Locale;
}) {
  const t = useTranslations("team");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");

  function invite() {
    if (!email) return;
    start(async () => {
      const fd = new FormData();
      fd.append("team_id", teamId);
      fd.append("email", email);
      const result = await inviteMemberAction(fd);
      if (!result.ok) {
        if (result.error === "inviteNotFound") toast.error(t("inviteNotFound"));
        else if (result.error === "alreadyMember") toast.error(t("alreadyMember"));
        else toast.error(result.error ?? tErr("generic"));
        return;
      }
      toast.success(t("inviteSuccess"));
      setEmail("");
      router.refresh();
    });
  }

  function remove(profileId: string) {
    start(async () => {
      const result = await removeMemberAction(teamId, profileId);
      if (!result.ok) {
        toast.error(result.error ?? tErr("generic"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.profile_id}
            className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-stone-800">{m.name || m.email}</p>
              <p className="text-xs text-stone-500">
                {m.email}
                {m.profile_id === leaderId && (
                  <span className="ms-2 inline-block rounded bg-petra-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-petra-700">
                    {t("leader")}
                  </span>
                )}
              </p>
            </div>
            {isLeader && m.profile_id !== leaderId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove(m.profile_id)}
                disabled={pending}
              >
                {t("remove")}
              </Button>
            )}
          </li>
        ))}
      </ul>

      {isLeader && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            placeholder={t("inviteByEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir={locale === "ar" ? "rtl" : "ltr"}
          />
          <Button onClick={invite} disabled={pending || !email}>
            {t("invite")}
          </Button>
        </div>
      )}
    </div>
  );
}
