import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { User } from "@/domain/user/user";
import { ROUTES } from "@/lib/routes";

import { getRequestContext } from "./request-context";

/**
 * Data access layer entry point for pages: the session is verified against the store (the proxy
 * only checks that a cookie exists). Memoized per request, so layouts and pages share one lookup.
 * An unknown or expired session goes through `/session-expired`, which clears the cookie;
 * redirecting straight to login would loop, since the proxy sends cookie holders back home.
 */
export const getCurrentUser = cache(async (): Promise<User> => {
  const { sessionToken, useCases } = await getRequestContext();
  const result = await useCases.authenticate(sessionToken);
  if (!result.ok) redirect(ROUTES.sessionExpired);
  return result.value;
});
