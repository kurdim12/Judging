import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { consumeMagicLink } from "@/lib/actions/auth";
import type { Locale } from "@/i18n";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  const t = await getTranslations("auth");

  if (!token) redirect(`/${locale}/login`);

  const result = await consumeMagicLink(token);
  if (result.ok) redirect(`/${locale}`);

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{t("signIn")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border border-petra-100 bg-petra-50 p-4 text-sm text-petra-700">
            {result.error ?? "Verification failed"}
          </p>
          <p className="mt-4 text-sm text-stone-500">
            <a href={`/${locale}/login`} className="text-ieee-600 hover:underline">
              {locale === "ar" ? "حاول مرة أخرى" : "Try again"}
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
