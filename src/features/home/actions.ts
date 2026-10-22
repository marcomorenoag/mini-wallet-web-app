"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/routes";
import { SESSION_COOKIE } from "@/server/http/cookie-names";
import { getRequestContext } from "@/server/request-context";

/** Ends the session on the server and drops the cookie; works without JavaScript. */
export async function logoutAction(): Promise<void> {
  const { cookies, sessionToken, useCases } = await getRequestContext();
  try {
    if (sessionToken) await useCases.logout(sessionToken);
  } catch (error) {
    // The cookie is dropped anyway, so the user is signed out of this browser regardless.
    console.error("[logout] session could not be deleted", error);
  }
  cookies.delete(SESSION_COOKIE);
  redirect(ROUTES.login);
}
