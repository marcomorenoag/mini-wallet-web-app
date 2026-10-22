"use server";

import { redirect } from "next/navigation";

import type { AppError } from "@/application/errors";
import { getRequestContext } from "@/server/request-context";
import { SESSION_COOKIE } from "@/server/http/cookie-names";
import { sessionCookieOptions } from "@/server/http/session-cookie";

import type { LoginFormState } from "./login-form-state";
import { safeNextPath } from "./safe-next-path";

const toFormState = (error: AppError, identifier: string): LoginFormState => {
  if (error.kind !== "VALIDATION") return { identifier, problem: error.kind };
  const issue = error.issues.find(({ field }) => field === "identifier") ?? error.issues[0];
  return issue ? { identifier, fieldError: issue.code } : { identifier, problem: "VALIDATION" };
};

/**
 * Starts a session from the login form. It runs the same use case as `POST /api/v1/auth/login`
 * in-process and works without JavaScript; input is re-validated here, whatever the client did.
 */
export async function loginAction(
  _previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const raw = formData.get("identifier");
  const identifier = typeof raw === "string" ? raw : "";

  try {
    const { cookies, useCases, simulateFault } = await getRequestContext();

    const fault = await simulateFault();
    if (fault) return { identifier, problem: fault };

    const result = await useCases.login({ identifier });
    if (!result.ok) return toFormState(result.error, identifier);

    const { session } = result.value;
    cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session));
  } catch (error) {
    // Unexpected failures are logged server-side and never leak details to the client.
    console.error("[login] unexpected error", error);
    return { identifier, problem: "UNKNOWN" };
  }

  // Outside the try block: `redirect` throws a control-flow signal that must not be caught.
  redirect(safeNextPath(formData.get("next")));
}
