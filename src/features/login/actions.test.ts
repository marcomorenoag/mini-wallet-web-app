import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetMockDatabase } from "@/adapters/mock/mock-database";
import { SESSION_COOKIE } from "@/server/http/cookie-names";

import { loginAction } from "./actions";
import { INITIAL_LOGIN_STATE } from "./login-form-state";

const request = vi.hoisted(() => ({
  headers: new Headers(),
  cookies: new Map<string, { value: string; options?: unknown }>(),
}));

vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({
    get: (name: string) => request.cookies.get(name),
    set: (name: string, value: string, options: unknown) =>
      request.cookies.set(name, { value, options }),
  }),
}));

// `redirect` throws a control-flow signal in Next.js; the destination is captured instead.
class Redirect extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

const submit = (fields: Record<string, string>) => loginAction(INITIAL_LOGIN_STATE, form(fields));

beforeEach(() => {
  resetMockDatabase();
  request.headers = new Headers();
  request.cookies.clear();
});

describe("loginAction", () => {
  it("sets an httpOnly session cookie and redirects to the validated destination", async () => {
    await expect(submit({ identifier: "ana@example.com", next: "/transfer" })).rejects.toEqual(
      new Redirect("/transfer"),
    );

    expect(request.cookies.get(SESSION_COOKIE)).toMatchObject({
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
    expect(request.cookies.has(SESSION_COOKIE)).toBe(false);
  });

  it("returns a problem on a simulated network failure", async () => {
    request.headers.set("x-mock-scenario", "NETWORK");
    expect(await submit({ identifier: "ana@example.com" })).toEqual({
      identifier: "ana@example.com",
      problem: "NETWORK",
    });
  });

  it("hides unexpected errors behind UNKNOWN", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    request.headers = {
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
