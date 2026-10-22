import { describe, expect, it } from "vitest";

import type { AccountId } from "@/domain/account/account";
import type { ContactId } from "@/domain/contact/contact";
import { money } from "@/domain/money/money";
import type { IdempotencyKey, TransferId } from "@/domain/transfer/transfer";
import type { UserId } from "@/domain/user/user";
import { createInMemoryDeps } from "@/test/in-memory-deps";

const ana = "usr_ana" as UserId;
const bruno = "usr_bruno" as UserId;
const anaAccount = "acc_ana" as AccountId;
const key = "0b9f1f0e-3c1a-4d8e-9a57-2f6d1c3b8e41" as IdempotencyKey;

const recipient = {
  contactId: "cnt_luis" as ContactId,
  name: "Luis Pérez",
  phone: "+525511112222",
};

describe("in-memory repositories", () => {
  it("finds users by email or phone", async () => {
    const { users } = createInMemoryDeps();
    expect((await users.findByIdentifier({ type: "email", value: "ana@example.com" }))?.id).toBe(
      "usr_ana",
    );
    expect((await users.findByIdentifier({ type: "phone", value: "+525587654321" }))?.id).toBe(
      "usr_bruno",
    );
    expect(await users.findByIdentifier({ type: "email", value: "x@example.com" })).toBeNull();
  });

  it("scopes contacts to their owner", async () => {
    const { contacts } = createInMemoryDeps();
    expect(await contacts.findById(ana, "cnt_luis" as ContactId)).not.toBeNull();
    expect(await contacts.findById(bruno, "cnt_luis" as ContactId)).toBeNull();
    expect(await contacts.findByPhone(bruno, "+525511112222")).toBeNull();
  });

  it("limits movements and orders them by date, newest first", async () => {
    const { movements } = createInMemoryDeps();
    const list = await movements.listByAccountId(anaAccount, { limit: 3 });
    expect(list).toHaveLength(3);
    expect(list[0]?.createdAt).toBe("2026-10-21T08:45:00.000Z");
  });
});

describe("in-memory transfer ledger", () => {
  it("debits, records the movement and stores the transfer as one unit", async () => {
    const { ledger, db } = createInMemoryDeps();

    const result = await ledger.commit({
      account: { id: anaAccount },
      recipient,
      amount: money(10_000),
      idempotencyKey: key,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        id: "trf_id-1",
        idempotencyKey: key,
        accountId: anaAccount,
        recipient,
        amount: money(10_000),
        createdAt: "2026-10-22T12:00:00.000Z",
      },
    });
    expect(db.accounts.get(anaAccount)?.balance).toEqual(money(1_240_000));
    expect(db.movements.at(-1)).toMatchObject({ id: "mov_id-2", type: "TRANSFER_OUT" });
    expect(db.transfers).toHaveLength(1);
  });

  it("leaves the state untouched when funds are insufficient", async () => {
    const { ledger, db } = createInMemoryDeps();
    const movementsBefore = db.movements.length;

    const result = await ledger.commit({
      account: { id: anaAccount },
      recipient,
      amount: money(1_250_001),
      idempotencyKey: key,
    });

    expect(result).toEqual({ ok: false, error: "INSUFFICIENT_FUNDS" });
    expect(db.accounts.get(anaAccount)?.balance).toEqual(money(1_250_000));
    expect(db.movements).toHaveLength(movementsBefore);
    expect(db.transfers).toHaveLength(0);
  });

  it("finds transfers only within their account", async () => {
    const { ledger } = createInMemoryDeps();
    const result = await ledger.commit({
      account: { id: anaAccount },
      recipient,
      amount: money(100),
      idempotencyKey: key,
    });
    if (!result.ok) throw new Error("Expected a transfer");

    expect(await ledger.findById(anaAccount, result.value.id)).toEqual(result.value);
    expect(await ledger.findById("acc_bruno" as AccountId, result.value.id)).toBeNull();
    expect(await ledger.findById(anaAccount, "trf_missing" as TransferId)).toBeNull();
  });
});

describe("in-memory idempotency store", () => {
  it("reserves a key once per owner", async () => {
    const { idempotency } = createInMemoryDeps();
    expect(await idempotency.reserve(ana, key)).toBe(true);
    expect(await idempotency.reserve(ana, key)).toBe(false);
    expect(await idempotency.reserve(bruno, key)).toBe(true);
    expect(await idempotency.find(ana, key)).toEqual({ status: "PENDING" });
  });

  it("releases pending reservations but never final outcomes", async () => {
    const { idempotency } = createInMemoryDeps();

    await idempotency.reserve(ana, key);
    await idempotency.release(ana, key);
    expect(await idempotency.find(ana, key)).toBeNull();

    await idempotency.reserve(ana, key);
    await idempotency.resolve(ana, key, { status: "FAILED", code: "INSUFFICIENT_FUNDS" });
    await idempotency.release(ana, key);
    expect(await idempotency.find(ana, key)).toEqual({
      status: "FAILED",
      code: "INSUFFICIENT_FUNDS",
    });
  });
});
