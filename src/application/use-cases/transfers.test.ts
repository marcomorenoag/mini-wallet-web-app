import { beforeEach, describe, expect, it } from "vitest";

import { money } from "@/domain/money/money";
import type { UserId } from "@/domain/user/user";
import { createInMemoryDeps, createStubProcessor } from "@/test/in-memory-deps";

import { makeCreateTransfer, makeGetTransfer, makeGetTransferStatus } from "./transfers";

const ana = "usr_ana" as UserId;
const bruno = "usr_bruno" as UserId;
const KEY = "0b9f1f0e-3c1a-4d8e-9a57-2f6d1c3b8e41";
const OTHER_KEY = "7c1e2d3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f";

const draft = (overrides: Record<string, unknown> = {}) => ({
  amount: money(25_000),
  recipientId: "cnt_luis",
  idempotencyKey: KEY,
  ...overrides,
});

describe("createTransfer", () => {
  let deps: ReturnType<typeof createInMemoryDeps>;

  const setup = (...results: Parameters<typeof createStubProcessor>) => {
    const stub = createStubProcessor(...results);
    const createTransfer = makeCreateTransfer({ ...deps, processor: stub.processor });
    return { createTransfer, calls: stub.calls };
  };
  const balanceOf = (accountId: "acc_ana" | "acc_bruno") =>
    [...deps.db.accounts.values()].find((a) => a.id === accountId)?.balance;

  beforeEach(() => {
    deps = createInMemoryDeps();
  });

  it("debits the balance, records the movement and returns the completed transfer", async () => {
    const { createTransfer } = setup();

    const result = await createTransfer(ana, draft());

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "COMPLETED",
        transfer: {
          amount: money(25_000),
          recipient: { contactId: "cnt_luis", name: "Luis Pérez", phone: "+525511112222" },
          idempotencyKey: KEY,
        },
      },
    });
    expect(balanceOf("acc_ana")).toEqual(money(1_225_000));
    expect(deps.db.movements.at(-1)).toMatchObject({
      type: "TRANSFER_OUT",
      amount: money(25_000),
      counterpartyName: "Luis Pérez",
    });
  });

  describe("idempotency", () => {
    it("returns the stored outcome on retries without debiting twice", async () => {
      const { createTransfer, calls } = setup();

      const first = await createTransfer(ana, draft());
      const second = await createTransfer(ana, draft());

      expect(second).toEqual(first);
      expect(calls).toHaveLength(1);
      expect(balanceOf("acc_ana")).toEqual(money(1_225_000));
    });

    it("reports PENDING while the same key is still being processed", async () => {
      let approve: () => void = () => undefined;
      const createTransfer = makeCreateTransfer({
        ...deps,
        processor: {
          process: () =>
            new Promise((resolve) => {
              approve = () => resolve({ status: "APPROVED" });
            }),
        },
      });

      const inFlight = createTransfer(ana, draft());
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(await createTransfer(ana, draft())).toEqual({
        ok: true,
        value: { status: "PENDING" },
      });

      approve();
      expect((await inFlight).ok).toBe(true);
      expect(balanceOf("acc_ana")).toEqual(money(1_225_000));
    });

    it.each(["NETWORK", "TIMEOUT", "UNKNOWN"] as const)(
      "releases the key after a retryable %s failure, so a retry is processed",
      async (code) => {
        const { createTransfer, calls } = setup({ status: "REJECTED", code });

        expect(await createTransfer(ana, draft())).toEqual({
          ok: true,
          value: { status: "FAILED", code },
        });
        expect(balanceOf("acc_ana")).toEqual(money(1_250_000));

        const retry = await createTransfer(ana, draft());
        expect(retry).toMatchObject({ ok: true, value: { status: "COMPLETED" } });
        expect(calls).toHaveLength(2);
      },
    );

    it("stores INSUFFICIENT_FUNDS from the processor as a final outcome", async () => {
      const { createTransfer, calls } = setup({ status: "REJECTED", code: "INSUFFICIENT_FUNDS" });

      await createTransfer(ana, draft());
      const retry = await createTransfer(ana, draft());

      expect(retry).toEqual({ ok: true, value: { status: "FAILED", code: "INSUFFICIENT_FUNDS" } });
      expect(calls).toHaveLength(1);
    });

    it("scopes keys per user", async () => {
      const { createTransfer } = setup();
      await createTransfer(ana, draft());

      // Bruno reusing Ana's key is not served Ana's outcome.
      const result = await createTransfer(bruno, draft({ recipientId: "cnt_luis" }));
      expect(result).toEqual({
        ok: false,
        error: {
          kind: "VALIDATION",
          issues: [{ field: "recipientId", code: "RECIPIENT_NOT_FOUND" }],
        },
      });
    });

    it("releases the key when an unexpected error is thrown", async () => {
      const createTransfer = makeCreateTransfer({
        ...deps,
        processor: { process: () => Promise.reject(new Error("boom")) },
      });

      await expect(createTransfer(ana, draft())).rejects.toThrow("boom");
      expect(deps.db.idempotency.size).toBe(0);
    });
  });

  describe("business rules (server-side)", () => {
    it("fails with INSUFFICIENT_FUNDS against the current balance, without calling the processor", async () => {
      const { createTransfer, calls } = setup();

      const result = await createTransfer(ana, draft({ amount: money(1_250_001) }));

      expect(result).toEqual({ ok: true, value: { status: "FAILED", code: "INSUFFICIENT_FUNDS" } });
      expect(calls).toHaveLength(0);
      expect(balanceOf("acc_ana")).toEqual(money(1_250_000));
    });

    it("rejects a non-positive amount as a validation error without consuming the key", async () => {
      const { createTransfer } = setup();

      expect(await createTransfer(ana, draft({ amount: money(0) }))).toEqual({
        ok: false,
        error: { kind: "VALIDATION", issues: [{ field: "amount", code: "AMOUNT_NOT_POSITIVE" }] },
      });
      expect(deps.db.idempotency.size).toBe(0);
    });

    it("rejects a missing recipient", async () => {
      const { createTransfer } = setup();

      expect(await createTransfer(ana, draft({ recipientId: undefined }))).toEqual({
        ok: false,
        error: {
          kind: "VALIDATION",
          issues: [{ field: "recipientId", code: "RECIPIENT_REQUIRED" }],
        },
      });
    });

    it("guards against concurrent debits through the ledger's atomic balance check", async () => {
      const { createTransfer } = setup();
      const amount = money(700_000);

      const [first, second] = await Promise.all([
        createTransfer(ana, draft({ amount })),
        createTransfer(ana, draft({ amount, idempotencyKey: OTHER_KEY })),
      ]);

      const statuses = [first, second].map((r) => (r.ok ? r.value.status : r.error.kind));
      expect(statuses.sort()).toEqual(["COMPLETED", "FAILED"]);
      expect(balanceOf("acc_ana")).toEqual(money(550_000));
    });
  });
});

describe("getTransferStatus", () => {
  it("returns the outcome stored for a key, scoped to its owner", async () => {
    const deps = createInMemoryDeps();
    const { processor } = createStubProcessor();
    await makeCreateTransfer({ ...deps, processor })(ana, draft());
    const getTransferStatus = makeGetTransferStatus(deps);

    expect(await getTransferStatus(ana, KEY)).toMatchObject({
      ok: true,
      value: { status: "COMPLETED" },
    });
    expect(await getTransferStatus(bruno, KEY)).toEqual({
      ok: false,
      error: { kind: "NOT_FOUND" },
    });
    expect(await getTransferStatus(ana, OTHER_KEY)).toEqual({
      ok: false,
      error: { kind: "NOT_FOUND" },
    });
  });

  it("rejects malformed keys", async () => {
    const getTransferStatus = makeGetTransferStatus(createInMemoryDeps());
    expect(await getTransferStatus(ana, "nope")).toEqual({
      ok: false,
      error: { kind: "VALIDATION", issues: [{ field: "idempotencyKey", code: "INVALID" }] },
    });
  });
});

describe("getTransfer", () => {
  it("returns a completed transfer only to its owner", async () => {
    const deps = createInMemoryDeps();
    const { processor } = createStubProcessor();
    const created = await makeCreateTransfer({ ...deps, processor })(ana, draft());
    if (!created.ok || created.value.status !== "COMPLETED") throw new Error("Expected a transfer");
    const { id } = created.value.transfer;
    const getTransfer = makeGetTransfer(deps);

    expect(await getTransfer(ana, id)).toEqual({ ok: true, value: created.value.transfer });
    expect(await getTransfer(bruno, id)).toEqual({ ok: false, error: { kind: "NOT_FOUND" } });
    expect(await getTransfer(ana, "")).toEqual({ ok: false, error: { kind: "NOT_FOUND" } });
  });
});
