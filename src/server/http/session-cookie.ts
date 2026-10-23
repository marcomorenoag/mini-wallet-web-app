import "server-only";

import type { NextResponse } from "next/server";

import { type Session, type SessionToken, SessionTokenSchema } from "@/domain/auth/session";

import { SESSION_COOKIE } from "./cookie-names";

/** The cookie holds an opaque token; the session itself lives on the server. */
export const readSessionToken = (request: {
  readonly cookies: { get(name: string): { value: string } | undefined };
}): SessionToken | undefined => {
  const parsed = SessionTokenSchema.safeParse(request.cookies.get(SESSION_COOKIE)?.value);
  return parsed.success ? parsed.data : undefined;
};

/**
 * The cookie is `Secure` in production. `SESSION_COOKIE_SECURE=false` lets a production build be
 * served over plain HTTP: the E2E suite runs one on `localhost`, where WebKit on Linux drops
 * `Secure` cookies (Chromium and Safari on macOS treat `localhost` as a secure origin).
 */
export const isSessionCookieSecure = (): boolean => {
  const override = process.env.SESSION_COOKIE_SECURE;
  return override ? override !== "false" : process.env.NODE_ENV === "production";
};

/** Shared by route handlers (`NextResponse.cookies`) and Server Actions (`cookies()`). */
export const sessionCookieOptions = (session: Session) =>
  ({
    httpOnly: true,
    sameSite: "lax",
    secure: isSessionCookieSecure(),
    path: "/",
    expires: new Date(session.expiresAt),
  }) as const;

export const setSessionCookie = (response: NextResponse, session: Session): void => {
  response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session));
};

export const clearSessionCookie = (response: NextResponse): void => {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
};
