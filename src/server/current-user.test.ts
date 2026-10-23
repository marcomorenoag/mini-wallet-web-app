import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMockDatabase, resetMockDatabase } from "@/adapters/mock/mock-database";
import { createFakeRequest, Redirect } from "@/test/next-request-mocks";

import { getCurrentUser } from "./current-user";
import { SESSION_COOKIE } from "./http/cookie-names";

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

const storeSession = (expiresAt: string) =>
  getMockDatabase().sessions.set(
    TOKEN as never,
    {
      token: TOKEN,
      userId: "usr_ana",
      expiresAt,
    } as never,
  );

beforeEach(() => {
  resetMockDatabase();
  request.current = createFakeRequest();
});

describe("getCurrentUser", () => {
  it("resolves the user behind a valid session cookie", async () => {
    storeSession("2099-01-01T00:00:00.000Z");
    request.current.cookies.set(SESSION_COOKIE, { value: TOKEN });

    expect(await getCurrentUser()).toMatchObject({ id: "usr_ana", name: "Ana López" });
  });

  it.each([
    ["no cookie", () => undefined],
    ["an unknown session", () => request.current.cookies.set(SESSION_COOKIE, { value: TOKEN })],
    [
      "an expired session",
      () => {
        storeSession("2000-01-01T00:00:00.000Z");
        request.current.cookies.set(SESSION_COOKIE, { value: TOKEN });
      },
    ],
  ])("sends %s through the session-expired route", async (_, arrange) => {
    arrange();
    await expect(getCurrentUser()).rejects.toEqual(new Redirect("/session-expired"));
  });
});
