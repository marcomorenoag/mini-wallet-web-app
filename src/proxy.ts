import { type NextRequest, NextResponse } from "next/server";

import { ROUTES } from "@/lib/routes";
import { SESSION_COOKIE } from "@/server/http/cookie-names";

/** Page prefixes that require a session. */
const PROTECTED_PREFIXES = ["/home", "/transfer", "/voucher"] as const;

const isProtected = (pathname: string): boolean =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/**
 * Optimistic route guard: only the presence of the session cookie is checked, so navigation stays
 * fast. The session is fully verified on the server (route handlers and data access), which
 * remains the real line of defense.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? ROUTES.home : ROUTES.login, request.url));
  }

  if (isProtected(pathname) && !hasSession) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === ROUTES.login && hasSession) {
    return NextResponse.redirect(new URL(ROUTES.home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // API routes authenticate on their own; static assets and metadata files are skipped.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
