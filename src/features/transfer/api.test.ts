import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { apiPath, server, setupMswServer } from "@/test/msw";

import { createContact, createTransfer } from "./api";

setupMswServer();

const KEY = "0b9f1f0e-3c1a-4d8e-9a57-2f6d1c3b8e41";
const transferInput = {
  amount: { amount: 25_000, currency: "MXN" as const },
  recipientId: "cnt_luis",
};
const completed = {
  status: "COMPLETED",
  transfer: {
    id: "trf_1",
    idempotencyKey: KEY,
    recipient: { contactId: "cnt_luis", name: "Luis Pérez", phone: "+525511112222" },
    amount: { amount: 25_000, currency: "MXN" },
    createdAt: "2026-10-22T16:42:00.000Z",
  },
};

const problem = (code: string, status: number, issues?: unknown[]) =>
  HttpResponse.json(
    { type: "about:blank", title: code, status, code, ...(issues ? { issues } : {}) },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

describe("createTransfer", () => {
  it("sends the idempotency key and parses the outcome", async () => {
    let received: { key: string | null; body: unknown } | null = null;
    server.use(
      http.post(apiPath("/transfers"), async ({ request }) => {
        received = { key: request.headers.get("Idempotency-Key"), body: await request.json() };
        return HttpResponse.json(completed, { status: 201 });
      }),
    );

    const result = await createTransfer(transferInput, KEY);

    expect(received).toEqual({ key: KEY, body: transferInput });
    expect(result).toEqual({ ok: true, status: 201, data: completed });
  });

  it("maps problem details to their code", async () => {
    server.use(http.post(apiPath("/transfers"), () => problem("INSUFFICIENT_FUNDS", 422)));
    expect(await createTransfer(transferInput, KEY)).toEqual({
      ok: false,
      code: "INSUFFICIENT_FUNDS",
      issues: [],
    });
  });

  it("reports connectivity failures as NETWORK", async () => {
    server.use(http.post(apiPath("/transfers"), () => HttpResponse.error()));
    expect(await createTransfer(transferInput, KEY)).toMatchObject({ ok: false, code: "NETWORK" });
  });

  it("treats responses outside the contract as UNKNOWN", async () => {
    server.use(
      http.post(apiPath("/transfers"), () =>
        HttpResponse.json({ surprise: true }, { status: 201 }),
      ),
    );
    expect(await createTransfer(transferInput, KEY)).toMatchObject({ ok: false, code: "UNKNOWN" });

    server.use(http.post(apiPath("/transfers"), () => new HttpResponse("<html>", { status: 502 })));
    expect(await createTransfer(transferInput, KEY)).toMatchObject({ ok: false, code: "UNKNOWN" });
  });

  it("lets the caller abort the request", async () => {
    server.use(http.post(apiPath("/transfers"), () => new Promise<never>(() => undefined)));
    const controller = new AbortController();

    const pending = createTransfer(transferInput, KEY, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("createContact", () => {
  it("returns the saved contact or the field issues", async () => {
    const contact = { id: "cnt_1", name: "Sofía", phone: "+525522223333", isFavorite: true };
    server.use(http.post(apiPath("/contacts"), () => HttpResponse.json(contact, { status: 201 })));
    expect(await createContact({ name: "Sofía", phone: "55 2222 3333" })).toMatchObject({
      ok: true,
      data: contact,
    });

    server.use(
      http.post(apiPath("/contacts"), () =>
        problem("VALIDATION", 422, [{ field: "phone", code: "CONTACT_ALREADY_EXISTS" }]),
      ),
    );
    expect(await createContact({ name: "Sofía", phone: "55 2222 3333" })).toEqual({
      ok: false,
      code: "VALIDATION",
      issues: [{ field: "phone", code: "CONTACT_ALREADY_EXISTS" }],
    });
  });
});
