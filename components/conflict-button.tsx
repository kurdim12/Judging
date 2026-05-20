"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { flagConflictAction } from "@/lib/actions/scores";

export function ConflictButton({ teamId }: { teamId: string }) {
  const t = useTranslations("judge");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function flag() {
    start(async () => {
      const result = await flagConflictAction({ team_id: teamId, reason });
      if (!result.ok) {
        toast.error(result.error ?? tErr("generic"));
        return;
      }
      toast.success(t("conflictFlag"));
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t("conflictFlag")}
      </Button>
    );
  }

  return (
    <div className="flex flex-1 items-center gap-2">
      <Input
        placeholder={t("conflictReasonPlaceholder")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-8 text-xs"
      />
      <Button size="sm" variant="secondary" onClick={flag} disabled={pending}>
        {t("conflictConfirm")}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        ×
      </Button>
    </div>
  );
}
