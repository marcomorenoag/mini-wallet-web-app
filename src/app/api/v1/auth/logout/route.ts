import { NextResponse } from "next/server";

import { publicHandler } from "@/server/http/api-handler";
import { NO_STORE_HEADERS } from "@/server/http/problem";
import { clearSessionCookie, readSessionToken } from "@/server/http/session-cookie";

/** POST /api/v1/auth/logout — ends the session; idempotent. */
export const POST = publicHandler(
  async ({ request, useCases }) => {
    const token = readSessionToken(request);
    if (token) await useCases.logout(token);

    const response = new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
    clearSessionCookie(response);
    return response;
  },
  // Logging out must always succeed, regardless of simulated faults.
  { simulateFaults: false },
);
