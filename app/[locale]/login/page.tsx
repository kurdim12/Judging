import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import type { Locale } from "@/i18n";
import Link from "next/link";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("auth");
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{t("signIn")}</CardTitle>
          <CardDescription>
            {locale === "ar"
              ? "سنرسل رابط دخول إلى بريدك."
              : "We'll email you a magic link — no password needed."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm locale={locale} mode="signin" />
          <p className="mt-4 text-center text-sm text-stone-500">
            {t("needAccount")}{" "}
            <Link
              href={`/${locale}/signup`}
              className="font-medium text-ieee-600 hover:underline"
            >
              {t("signUp")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
