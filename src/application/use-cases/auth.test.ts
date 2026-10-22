import { describe, expect, it } from "vitest";

import type { SessionToken } from "@/domain/auth/session";
import { createInMemoryDeps } from "@/test/in-memory-deps";

import { makeAuthenticate, makeLogin, makeLogout, SESSION_TTL_MS } from "./auth";

const setup = () => {
  const deps = createInMemoryDeps();
  return {
    deps,
    login: makeLogin(deps),
    logout: makeLogout(deps),
    authenticate: makeAuthenticate(deps),
  };
};

describe("login", () => {
  it.each(["ana@example.com", "ANA@example.com", "55 1234 5678", "+52 55 1234 5678"])(
    "creates a session for %j",
    async (identifier) => {
      const { login, deps } = setup();

      const result = await login({ identifier });

      expect(result).toMatchObject({
        ok: true,
        value: {
          user: { id: "usr_ana", name: "Ana López" },
          session: { token: "id-1", userId: "usr_ana", expiresAt: "2026-10-22T13:00:00.000Z" },
        },
      });
      expect(deps.db.sessions.size).toBe(1);
    },
  );

  it("reports validation issues for malformed input", async () => {
    const { login } = setup();
    expect(await login({ identifier: "ana@" })).toEqual({
      ok: false,
      error: { kind: "VALIDATION", issues: [{ field: "identifier", code: "IDENTIFIER_INVALID" }] },
    });
    expect(await login(null)).toMatchObject({ ok: false, error: { kind: "VALIDATION" } });
  });

  it("reports unknown identifiers", async () => {
    const { login } = setup();
    expect(await login({ identifier: "nobody@example.com" })).toEqual({
      ok: false,
      error: {
        kind: "VALIDATION",
        issues: [{ field: "identifier", code: "IDENTIFIER_NOT_FOUND" }],
      },
    });
  });
});

describe("authenticate", () => {
  const loginAna = async (ctx: ReturnType<typeof setup>) => {
    const result = await ctx.login({ identifier: "ana@example.com" });
    if (!result.ok) throw new Error("Expected login to succeed");
    return result.value.session.token;
  };

  it("resolves the user behind a valid session", async () => {
    const ctx = setup();
    const token = await loginAna(ctx);
    expect(await ctx.authenticate(token)).toMatchObject({ ok: true, value: { id: "usr_ana" } });
  });

  it("rejects missing and unknown tokens", async () => {
    const { authenticate } = setup();
    expect(await authenticate(undefined)).toEqual({
      ok: false,
      error: { kind: "UNAUTHENTICATED" },
    });
    expect(await authenticate("forged" as SessionToken)).toEqual({
      ok: false,
      error: { kind: "UNAUTHENTICATED" },
    });
  });

  it("rejects and removes expired sessions", async () => {
    const ctx = setup();
    const token = await loginAna(ctx);
    ctx.deps.advance(SESSION_TTL_MS);

    expect(await ctx.authenticate(token)).toEqual({
      ok: false,
      error: { kind: "UNAUTHENTICATED" },
    });
    expect(ctx.deps.db.sessions.size).toBe(0);
  });

  it("rejects the token after logout", async () => {
    const ctx = setup();
    const token = await loginAna(ctx);
    await ctx.logout(token);
    expect((await ctx.authenticate(token)).ok).toBe(false);
  });
});
