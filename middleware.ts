import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { locales, defaultLocale } from "./i18n";

const intlMiddleware = createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
});

export async function middleware(request: NextRequest) {
  // Refresh Supabase session cookies first so server components see fresh auth.
  const supabaseResponse = await updateSession(request);

  // Then run next-intl which handles /en, /ar routing.
  const intlResponse = intlMiddleware(request);

  if (intlResponse instanceof NextResponse) {
    // Copy supabase auth cookies onto the intl response.
    for (const cookie of supabaseResponse.cookies.getAll()) {
      intlResponse.cookies.set(cookie.name, cookie.value);
    }
    return intlResponse;
  }
  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
