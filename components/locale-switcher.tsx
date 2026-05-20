"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { locales, type Locale } from "@/i18n";

export function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname() ?? "/";
  const t = useTranslations("nav");

  const next = locales.find((l) => l !== current) ?? current;
  const stripped = pathname.replace(new RegExp(`^/${current}`), "") || "/";
  const href = `/${next}${stripped === "/" ? "" : stripped}`;

  return (
    <Link
      href={href}
      className="rounded-md border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
      aria-label="Switch language"
    >
      {t("language")}
    </Link>
  );
}
