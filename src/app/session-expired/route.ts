import { type NextRequest, NextResponse } from "next/server";

import { ROUTES } from "@/lib/routes";
import { clearSessionCookie } from "@/server/http/session-cookie";

/** GET /session-expired — drops a stale session cookie and sends the visitor to login. */
export function GET(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL(ROUTES.login, request.url));
  clearSessionCookie(response);
  return response;
}
