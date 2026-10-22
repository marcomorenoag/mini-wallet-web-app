import { expect, test } from "@playwright/test";

const KEY_HEADER = "Idempotency-Key";

// API contract checks against the running server; one browser project is enough.
test.describe("API v1", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "API checks run once");

  test("login sets a session cookie that authorizes account requests", async ({ request }) => {
    expect((await request.get("/api/v1/account")).status()).toBe(401);

    const login = await request.post("/api/v1/auth/login", {
      data: { identifier: "ana@example.com" },
    });
    expect(login.status()).toBe(200);

    const account = await request.get("/api/v1/account");
    expect(account.status()).toBe(200);
    expect(await account.json()).toMatchObject({ userName: "Ana López" });
  });

  test("a forced NETWORK scenario fails the transfer with 503 problem details", async ({
    request,
  }) => {
    await request.post("/api/v1/auth/login", { data: { identifier: "ana@example.com" } });

    const response = await request.post("/api/v1/transfers", {
      headers: { [KEY_HEADER]: crypto.randomUUID(), "x-mock-scenario": "NETWORK" },
      data: { amount: { amount: 100, currency: "MXN" }, recipientId: "cnt_luis" },
    });

    expect(response.status()).toBe(503);
    expect(response.headers()["content-type"]).toContain("application/problem+json");
    expect(await response.json()).toMatchObject({ code: "NETWORK" });
  });
});
