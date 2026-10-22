import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMockDatabase, resetMockDatabase } from "@/adapters/mock/mock-database";
import { SESSION_COOKIE } from "@/server/http/cookie-names";
import { createFakeRequest, Redirect } from "@/test/next-request-mocks";

import { logoutAction } from "./actions";

const request = vi.hoisted(() => ({
  current: undefined as never as ReturnType<typeof createFakeRequest>,
}));

vi.mock("next/headers", async () => {
  const { nextHeadersMock } = await import("@/test/next-request-mocks");
  return {
    headers: () => nextHeadersMock(request.current).headers(),
    cookies: () => nextHeadersMock(request.current).cookies(),
  };
});
vi.mock("next/navigation", async () =>
  (await import("@/test/next-request-mocks")).nextNavigationMock(),
);

const TOKEN = "0b9f1f0e-3c1a-4d8e-9a57-2f6d1c3b8e41";

beforeEach(() => {
  resetMockDatabase();
  request.current = createFakeRequest();
});

describe("logoutAction", () => {
  it("deletes the session and the cookie, then goes to login", async () => {
    getMockDatabase().sessions.set(
      TOKEN as never,
      {
        token: TOKEN,
        userId: "usr_ana",
        expiresAt: "2099-01-01T00:00:00.000Z",
      } as never,
    );
    request.current.cookies.set(SESSION_COOKIE, { value: TOKEN });

    await expect(logoutAction()).rejects.toEqual(new Redirect("/login"));

    expect(getMockDatabase().sessions.has(TOKEN as never)).toBe(false);
    expect(request.current.cookies.has(SESSION_COOKIE)).toBe(false);
  });

  it("still signs out when there is no session cookie", async () => {
    await expect(logoutAction()).rejects.toEqual(new Redirect("/login"));
  });
});
