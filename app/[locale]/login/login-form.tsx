"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n";

export function LoginForm({
  locale,
  mode,
}: {
  locale: Locale;
  mode: "signin" | "signup";
}) {
  const t = useTranslations("auth");
  const tErr = useTranslations("errors");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const supabase = createClient();
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ??
        (typeof window !== "undefined" ? window.location.origin : "");

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${siteUrl}/${locale}/callback`,
          data: mode === "signup" && fullName ? { full_name: fullName } : undefined,
        },
      });
      if (error) throw error;
      setSent(true);
      toast.success(t("magicLinkSent"));
    } catch (err) {
      toast.error((err as Error).message || tErr("generic"));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-md border border-ieee-100 bg-ieee-50 p-4 text-sm text-ieee-800">
        {t("magicLinkSent")}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
