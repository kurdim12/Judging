"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestMagicLink } from "@/lib/actions/auth";
import type { Locale } from "@/i18n";

export function LoginForm({
  locale,
  mode,
}: {
  locale: string;
  mode: "signin" | "signup";
}) {
  const t = useTranslations("auth");
  const tErr = useTranslations("errors");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const result = await requestMagicLink({
        email,
        full_name: mode === "signup" ? fullName : undefined,
        locale: locale === "ar" ? "ar" : "en",
      });
      if (!result.ok) {
        toast.error(result.error ?? tErr("generic"));
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="rounded-md border border-ieee-100 bg-ieee-50 p-4 text-sm text-ieee-800">
        {t("magicLinkSent")}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <Label htmlFor="fullName">{t("fullName")}</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1.5"
            required
          />
        </div>
      )}
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5"
          required
          autoComplete="email"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending || !email}>
        {pending ? "…" : t("sendMagicLink")}
      </Button>
    </form>
  );
}
