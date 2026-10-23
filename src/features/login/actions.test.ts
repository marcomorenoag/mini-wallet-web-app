import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetMockDatabase } from "@/adapters/mock/mock-database";
import { SESSION_COOKIE } from "@/server/http/cookie-names";
import { createFakeRequest, Redirect } from "@/test/next-request-mocks";

import { loginAction } from "./actions";
import { INITIAL_LOGIN_STATE } from "./login-form-state";

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

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

const submit = (fields: Record<string, string>) => loginAction(INITIAL_LOGIN_STATE, form(fields));

beforeEach(() => {
  resetMockDatabase();
  request.current = createFakeRequest();
});

describe("loginAction", () => {
  it("sets an httpOnly session cookie and redirects to the validated destination", async () => {
    await expect(submit({ identifier: "ana@example.com", next: "/transfer" })).rejects.toEqual(
      new Redirect("/transfer"),
    );

    expect(request.current.cookies.get(SESSION_COOKIE)).toMatchObject({
      value: expect.any(String),
      options: { httpOnly: true, sameSite: "lax", path: "/" },
    });
  });

  it("falls back to home for unsafe destinations", async () => {
    await expect(
      submit({ identifier: "55 1234 5678", next: "https://evil.example" }),
    ).rejects.toEqual(new Redirect("/home"));
  });

  it("returns field errors and echoes the submitted value", async () => {
    expect(await submit({ identifier: "nobody@example.com" })).toEqual({
      identifier: "nobody@example.com",
      fieldError: "IDENTIFIER_NOT_FOUND",
    });
    expect(await submit({ identifier: "" })).toEqual({
      identifier: "",
      fieldError: "IDENTIFIER_REQUIRED",
    });
    expect(request.current.cookies.has(SESSION_COOKIE)).toBe(false);
  });

  it("returns a problem on a simulated network failure", async () => {
    request.current.headers.set("x-mock-scenario", "NETWORK");
    expect(await submit({ identifier: "ana@example.com" })).toEqual({
      identifier: "ana@example.com",
      problem: "NETWORK",
    });
  });

  it("hides unexpected errors behind UNKNOWN", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    request.current.headers = {
      get: () => {
        throw new Error("internal detail");
      },
    } as never;

    expect(await submit({ identifier: "ana@example.com" })).toEqual({
      identifier: "ana@example.com",
      problem: "UNKNOWN",
    });
    expect(consoleError).toHaveBeenCalled();
  });
});
