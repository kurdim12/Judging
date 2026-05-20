import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "../login/login-form";
import type { Locale } from "@/i18n";

export default async function SignupPage({
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
          <CardTitle>{t("signUp")}</CardTitle>
          <CardDescription>
            {locale === "ar"
              ? "أنشئ حسابك وانضم إلى الهاكاثون."
              : "Create your account to enter the hackathon."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm locale={locale} mode="signup" />
          <p className="mt-4 text-center text-sm text-stone-500">
            {t("alreadyHaveAccount")}{" "}
            <Link
              href={`/${locale}/login`}
              className="font-medium text-ieee-600 hover:underline"
            >
              {t("signIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
