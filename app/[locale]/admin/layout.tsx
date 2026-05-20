import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import type { Locale } from "@/i18n";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await requireRole("admin");
  const { locale } = await params;
  const t = await getTranslations("admin");

  const links = [
    { href: `/${locale}/admin`, label: t("title") },
    { href: `/${locale}/admin/events`, label: t("events") },
    { href: `/${locale}/admin/criteria`, label: t("criteria") },
    { href: `/${locale}/admin/users`, label: t("users") },
    { href: `/${locale}/admin/teams`, label: t("teams") },
    { href: `/${locale}/admin/leaderboard`, label: t("leaderboard") },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-ieee-50 hover:text-ieee-700"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
