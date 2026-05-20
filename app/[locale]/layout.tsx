import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";
import { locales, localeDir, type Locale } from "@/i18n";
import { SiteHeader } from "@/components/site-header";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const messages = await getMessages();
  const dir = localeDir[locale as Locale];

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-dvh bg-stone-50 text-stone-800">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <SiteHeader locale={locale as Locale} />
          <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">{children}</main>
          <Toaster richColors position={dir === "rtl" ? "top-left" : "top-right"} />
          <footer className="border-t border-stone-200 mt-16 py-6 text-center text-xs text-stone-500">
            IEEE UoP Student Branch · {new Date().getFullYear()}
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
