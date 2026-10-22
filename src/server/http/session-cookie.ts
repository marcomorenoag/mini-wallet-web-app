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

/** Shared by route handlers (`NextResponse.cookies`) and Server Actions (`cookies()`). */
export const sessionCookieOptions = (session: Session) =>
  ({
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  }) as const;

export const setSessionCookie = (response: NextResponse, session: Session): void => {
  response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session));
};

export const clearSessionCookie = (response: NextResponse): void => {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
};
