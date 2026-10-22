import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { SESSION_COOKIE } from "@/server/http/cookie-names";

import { GET } from "./route";

describe("GET /session-expired", () => {
  it("clears the session cookie and redirects to login", () => {
    const response = GET(
      new NextRequest("http://localhost/session-expired", {
        headers: { cookie: `${SESSION_COOKIE}=stale` },
      }),
    );

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/login");
    expect(response.cookies.get(SESSION_COOKIE)).toMatchObject({ value: "", maxAge: 0 });
  });
});
