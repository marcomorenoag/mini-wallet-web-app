import { describe, expect, it } from "vitest";

import { money } from "@/domain/money/money";
import type { UserId } from "@/domain/user/user";
import { createInMemoryDeps } from "@/test/in-memory-deps";

import { makeGetAccountOverview, makeListMovements, MAX_MOVEMENTS_LIMIT } from "./account";

const ana = "usr_ana" as UserId;
const bruno = "usr_bruno" as UserId;
const ghost = "usr_ghost" as UserId;

describe("getAccountOverview", () => {
  it("returns the user name and balance", async () => {
    const getAccountOverview = makeGetAccountOverview(createInMemoryDeps());
    expect(await getAccountOverview(ana)).toEqual({
      ok: true,
      value: { userName: "Ana López", balance: money(1_250_000) },
    });
  });

  it("returns NOT_FOUND for an unknown user", async () => {
    const getAccountOverview = makeGetAccountOverview(createInMemoryDeps());
    expect(await getAccountOverview(ghost)).toEqual({ ok: false, error: { kind: "NOT_FOUND" } });
  });
});

describe("listMovements", () => {
  it("lists the user's movements, most recent first", async () => {
    const listMovements = makeListMovements(createInMemoryDeps());
    const result = await listMovements(ana);
    if (!result.ok) throw new Error("Expected movements");

    const dates = result.value.map((m) => m.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(result.value.every((m) => m.accountId === "acc_ana")).toBe(true);
  });

  it("returns an empty list for a user without movements", async () => {
    const listMovements = makeListMovements(createInMemoryDeps());
    expect(await listMovements(bruno)).toEqual({ ok: true, value: [] });
  });

  it("clamps the limit to a safe range", async () => {
    const deps = createInMemoryDeps();
    const calls: number[] = [];
    const listMovements = makeListMovements({
      ...deps,
      movements: {
        listByAccountId: async (_, { limit }) => {
          calls.push(limit);
          return [];
        },
      },
    });

    await listMovements(ana, { limit: 0 });
    await listMovements(ana, { limit: 10_000 });
    await listMovements(ana, { limit: 5.9 });
    expect(calls).toEqual([1, MAX_MOVEMENTS_LIMIT, 5]);
  });

  it("returns NOT_FOUND for an unknown user", async () => {
    const listMovements = makeListMovements(createInMemoryDeps());
    expect(await listMovements(ghost)).toEqual({ ok: false, error: { kind: "NOT_FOUND" } });
  });
});
