import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

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
              ? "ادخل ببريدك الإلكتروني وكلمة المرور التي زوّدك بها المنظّمون."
              : "Sign in with the email and password provided by the organizers."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
