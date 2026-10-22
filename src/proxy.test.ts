import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";
import { SESSION_COOKIE } from "./server/http/cookie-names";

const visit = (path: string, { session = false } = {}) => {
  const headers = new Headers(session ? { cookie: `${SESSION_COOKIE}=token` } : {});
  const response = proxy(new NextRequest(new URL(path, "http://localhost"), { headers }));
  const location = response.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : null;
};

describe("proxy", () => {
  it.each(["/home", "/transfer", "/transfer/summary", "/voucher/trf_1"])(
    "redirects %s to login without a session, keeping the destination",
    (path) => {
      expect(visit(path)).toBe(`/login?next=${encodeURIComponent(path)}`);
    },
  );

  it("lets protected pages through with a session cookie", () => {
    expect(visit("/home", { session: true })).toBeNull();
  });

  it("sends signed-in users away from the login page", () => {
    expect(visit("/login", { session: true })).toBe("/home");
    expect(visit("/login")).toBeNull();
  });

  it("routes the root to home or login", () => {
    expect(visit("/", { session: true })).toBe("/home");
    expect(visit("/")).toBe("/login");
  });

  it("does not treat look-alike paths as protected", () => {
    expect(visit("/homepage")).toBeNull();
  });
});
