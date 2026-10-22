import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetMockDatabase } from "@/adapters/mock/mock-database";
import { MOCK_SCENARIO_HEADER } from "@/server/http/request-scenario";
import { call } from "@/test/api-client";

import * as account from "./account/route";
import * as movements from "./account/movements/route";
import * as login from "./auth/login/route";
import * as logout from "./auth/logout/route";
import * as contacts from "./contacts/route";
import * as transferById from "./transfers/[id]/route";
import * as transfers from "./transfers/route";

const KEY = "0b9f1f0e-3c1a-4d8e-9a57-2f6d1c3b8e41";
const transferBody = { amount: { amount: 25_000, currency: "MXN" }, recipientId: "cnt_luis" };

const loginAs = async (identifier: string): Promise<string> => {
  const { sessionCookie } = await call(login.POST, { method: "POST", body: { identifier } });
  if (!sessionCookie?.value) throw new Error("Expected a session cookie");
  return sessionCookie.value;
};

const postTransfer = (session: string, headers: Record<string, string> = {}, body = transferBody) =>
  call(transfers.POST, {
    method: "POST",
    session,
    body,
    headers: { "Idempotency-Key": KEY, ...headers },
  });

beforeEach(() => {
  resetMockDatabase();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/v1/auth/login", () => {
  it("returns the user and sets an httpOnly session cookie", async () => {
    const { status, body, sessionCookie } = await call(login.POST, {
      method: "POST",
      body: { identifier: "55 1234 5678" },
    });

    expect(status).toBe(200);
    expect(body).toEqual({ id: "usr_ana", name: "Ana López" });
    expect(sessionCookie).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("returns 422 problem details with field issues", async () => {
    const { status, body, response } = await call(login.POST, {
      method: "POST",
      body: { identifier: "nobody@example.com" },
    });

    expect(status).toBe(422);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(body).toMatchObject({
      status: 422,
      code: "VALIDATION",
      issues: [{ field: "identifier", code: "IDENTIFIER_NOT_FOUND" }],
    });
  });

  it("returns 400 for malformed JSON", async () => {
    const { status, body } = await call(login.POST, { method: "POST", rawBody: "{nope" });
    expect(status).toBe(400);
    expect(body).toMatchObject({ code: "BAD_REQUEST" });
  });

  it.each([
    ["NETWORK", 503],
    ["UNKNOWN", 500],
  ])("simulates a %s fault when requested", async (scenario, expectedStatus) => {
    const { status, body } = await call(login.POST, {
      method: "POST",
      body: { identifier: "ana@example.com" },
      headers: { [MOCK_SCENARIO_HEADER]: scenario },
    });
    expect(status).toBe(expectedStatus);
    expect(body).toMatchObject({ code: scenario });
  });
});

describe("authenticated endpoints", () => {
  it("rejects requests without a valid session", async () => {
    for (const session of [undefined, "forged-token"]) {
      const { status, body } = await call(account.GET, session ? { session } : {});
      expect(status).toBe(401);
      expect(body).toMatchObject({ code: "UNAUTHENTICATED" });
    }
  });

  it("GET /account returns the overview with no-store caching", async () => {
    const session = await loginAs("ana@example.com");
    const { status, body, response } = await call(account.GET, { session });

    expect(status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({
      userName: "Ana López",
      balance: { amount: 1_250_000, currency: "MXN" },
    });
  });

  it("GET /account/movements honors the limit and returns an empty list for new users", async () => {
    const ana = await loginAs("ana@example.com");
    const bruno = await loginAs("bruno@example.com");

    const limited = await call(movements.GET, { session: ana, path: "/?limit=2" });
    expect((limited.body as { items: unknown[] }).items).toHaveLength(2);

    expect((await call(movements.GET, { session: bruno })).body).toEqual({ items: [] });
  });

  it("GET and POST /contacts list and save contacts", async () => {
    const session = await loginAs("bruno@example.com");

    const created = await call(contacts.POST, {
      method: "POST",
      session,
      body: { name: "Sofía", phone: "55 2222 3333" },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Sofía", phone: "+525522223333", isFavorite: true });

    const duplicate = await call(contacts.POST, {
      method: "POST",
      session,
      body: { name: "Sofía", phone: "5522223333" },
    });
    expect(duplicate.status).toBe(422);

    const list = await call(contacts.GET, { session });
    expect((list.body as { items: unknown[] }).items).toHaveLength(1);
  });

  it("POST /auth/logout ends the session", async () => {
    const session = await loginAs("ana@example.com");

    const { status, sessionCookie } = await call(logout.POST, { method: "POST", session });
    expect(status).toBe(204);
    expect(sessionCookie?.value).toBe("");

    expect((await call(account.GET, { session })).status).toBe(401);
  });
});

describe("POST /api/v1/transfers", () => {
  it("completes a transfer and replays the same result for the same key", async () => {
    const session = await loginAs("ana@example.com");

    const first = await postTransfer(session, { [MOCK_SCENARIO_HEADER]: "SUCCESS" });
    const replay = await postTransfer(session, { [MOCK_SCENARIO_HEADER]: "SUCCESS" });

    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      status: "COMPLETED",
      transfer: { amount: { amount: 25_000, currency: "MXN" }, recipient: { name: "Luis Pérez" } },
    });
    expect(replay).toMatchObject({ status: 201, body: first.body });

    const overview = await call(account.GET, { session });
    expect(overview.body).toMatchObject({ balance: { amount: 1_225_000 } });
  });

  it("requires the Idempotency-Key header", async () => {
    const session = await loginAs("ana@example.com");
    const { status, body } = await call(transfers.POST, {
      method: "POST",
      session,
      body: transferBody,
    });
    expect(status).toBe(422);
    expect(body).toMatchObject({ issues: [{ field: "idempotencyKey", code: "INVALID" }] });
  });

  it("enforces the business rules on the server", async () => {
    const session = await loginAs("ana@example.com");

    const zero = await postTransfer(
      session,
      {},
      { ...transferBody, amount: { amount: 0, currency: "MXN" } },
    );
    expect(zero.body).toMatchObject({ issues: [{ field: "amount", code: "AMOUNT_NOT_POSITIVE" }] });

    const tooMuch = await postTransfer(
      session,
      {},
      { ...transferBody, amount: { amount: 99_999_999, currency: "MXN" } },
    );
    expect(tooMuch).toMatchObject({ status: 422, body: { code: "INSUFFICIENT_FUNDS" } });

    const noRecipient = await postTransfer(session, {}, { amount: transferBody.amount } as never);
    expect(noRecipient.body).toMatchObject({
      issues: [{ field: "recipientId", code: "RECIPIENT_REQUIRED" }],
    });
  });

  it.each([
    ["INSUFFICIENT_FUNDS", 422],
    ["NETWORK", 503],
    ["UNKNOWN", 500],
  ])("maps the %s scenario to HTTP %d", async (scenario, expectedStatus) => {
    const session = await loginAs("ana@example.com");
    const { status, body } = await postTransfer(session, { [MOCK_SCENARIO_HEADER]: scenario });
    expect(status).toBe(expectedStatus);
    expect(body).toMatchObject({ code: scenario });
  });

  it("lets a network failure be retried with the same key", async () => {
    const session = await loginAs("ana@example.com");

    expect((await postTransfer(session, { [MOCK_SCENARIO_HEADER]: "NETWORK" })).status).toBe(503);
    expect((await postTransfer(session, { [MOCK_SCENARIO_HEADER]: "SUCCESS" })).status).toBe(201);
  });

  it("recovers a TIMEOUT through the status endpoint", async () => {
    vi.stubEnv("MOCK_TIMEOUT_DELAY_MS", "50");
    const session = await loginAs("ana@example.com");
    const statusPath = `/?idempotencyKey=${KEY}`;

    const slow = postTransfer(session, { [MOCK_SCENARIO_HEADER]: "TIMEOUT" });
    await new Promise((resolve) => setTimeout(resolve, 10));

    // While the payment network is still answering, the key is reported as pending.
    expect((await call(transfers.GET, { session, path: statusPath })).body).toEqual({
      status: "PENDING",
    });

    expect((await slow).status).toBe(201);
    expect((await call(transfers.GET, { session, path: statusPath })).body).toMatchObject({
      status: "COMPLETED",
    });
  });
});

describe("GET /api/v1/transfers/{id}", () => {
  it("returns the voucher to its owner only", async () => {
    const ana = await loginAs("ana@example.com");
    const bruno = await loginAs("bruno@example.com");
    const created = await postTransfer(ana, { [MOCK_SCENARIO_HEADER]: "SUCCESS" });
    const { id } = (created.body as { transfer: { id: string } }).transfer;

    const own = await call(transferById.GET, { session: ana, params: { id } });
    expect(own).toMatchObject({ status: 200, body: { id, recipient: { name: "Luis Pérez" } } });

    expect((await call(transferById.GET, { session: bruno, params: { id } })).status).toBe(404);
  });
});

describe("error handling", () => {
  it("hides unexpected errors behind a generic 500", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const session = await loginAs("ana@example.com");
    vi.spyOn(Number, "isFinite").mockImplementation(() => {
      throw new Error("internal detail");
    });

    const { status, body } = await call(movements.GET, { session });

    expect(status).toBe(500);
    expect(body).toMatchObject({ code: "UNKNOWN", title: "Unexpected error" });
    expect(JSON.stringify(body)).not.toContain("internal detail");
    expect(consoleError).toHaveBeenCalled();
  });

  it("ignores scenario overrides when they are disabled", async () => {
    vi.stubEnv("MOCK_SCENARIO_OVERRIDE", "disabled");
    const { status } = await call(login.POST, {
      method: "POST",
      body: { identifier: "ana@example.com" },
      headers: { [MOCK_SCENARIO_HEADER]: "NETWORK" },
    });
    expect(status).toBe(200);
  });
});
