"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signInWithPasswordAction } from "@/lib/actions/auth";

export function LoginForm({
  locale,
}: {
  locale: string;
}) {
  const t = useTranslations("auth");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const result = await signInWithPasswordAction({ email, password });
      if (!result.ok) {
        toast.error(result.error ?? tErr("generic"));
        return;
      }
      router.push(`/${locale}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
      <div>
        <Label htmlFor="password">
          {locale === "ar" ? "كلمة المرور" : "Password"}
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5"
          required
          autoComplete="current-password"
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={pending || !email || !password}
      >
        {pending ? "…" : locale === "ar" ? "تسجيل الدخول" : "Sign in"}
      </Button>
      <p className="text-[11px] text-stone-500 text-center">
        {locale === "ar"
          ? "الحسابات يُنشئها المنظّمون مسبقاً."
          : "Accounts are issued in advance by the organizers."}
      </p>
    </form>
  );
}
