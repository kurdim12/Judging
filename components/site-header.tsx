import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getUser } from "@/lib/auth";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoutButton } from "@/components/logout-button";
import type { Locale } from "@/i18n";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations("nav");
  const tBrand = await getTranslations("brand");
  const user = await getUser();
  const role = user?.profile.role;

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-3 text-stone-900 font-semibold"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-md bg-ieee-500 text-white font-bold shadow-sm"
          >
            ⚡
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm">{tBrand("title")}</span>
            <span className="text-[11px] font-normal text-petra-500">
              {tBrand("tagline")}
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href={`/${locale}`} label={t("home")} />
          <NavLink href={`/${locale}/leaderboard`} label={t("leaderboard")} />
          {user && (
            <>
              {(role === "team_leader" || role === "team_member" || role === "admin") && (
                <NavLink href={`/${locale}/team`} label={t("team")} />
              )}
              {role === "judge" && <NavLink href={`/${locale}/judge`} label={t("judge")} />}
              {role === "admin" && <NavLink href={`/${locale}/admin`} label={t("admin")} />}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher current={locale} />
          {user ? (
            <LogoutButton label={t("logout")} />
          ) : (
            <Link
              href={`/${locale}/login`}
              className="rounded-md bg-ieee-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-ieee-600"
            >
              {t("login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100 hover:text-ieee-700"
    >
      {label}
    </Link>
  );
}
