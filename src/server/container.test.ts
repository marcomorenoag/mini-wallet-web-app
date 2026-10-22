import { afterEach, describe, expect, it, vi } from "vitest";

import { resetMockDatabase } from "@/adapters/mock/mock-database";
import { money } from "@/domain/money/money";

import { getUseCases } from "./container";

const loginAna = async (useCases: ReturnType<typeof getUseCases>) => {
  const result = await useCases.login({ identifier: "ana@example.com" });
  if (!result.ok) throw new Error("Expected login to succeed");
  return result.value.user.id;
};

const draft = {
  amount: money(10_000),
  recipientId: "cnt_luis",
  idempotencyKey: "0b9f1f0e-3c1a-4d8e-9a57-2f6d1c3b8e41",
};

describe("composition root", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetMockDatabase();
  });

  it("wires the use cases to the shared mock database", async () => {
    const userId = await loginAna(getUseCases());

    expect(await getUseCases().getAccountOverview(userId)).toEqual({
      ok: true,
      value: { userName: "Ana López", balance: money(1_250_000) },
    });
  });

  it("honors a requested scenario when overrides are enabled", async () => {
    const useCases = getUseCases({ scenario: "NETWORK" });
    const userId = await loginAna(useCases);

    expect(await useCases.createTransfer(userId, draft)).toEqual({
      ok: true,
      value: { status: "FAILED", code: "NETWORK" },
    });
  });

  it("ignores a requested scenario when overrides are disabled", async () => {
    vi.stubEnv("MOCK_SCENARIO_OVERRIDE", "disabled");
    // Random picks are pinned to SUCCESS (the first weighted bucket).
    vi.spyOn(Math, "random").mockReturnValue(0);
    const useCases = getUseCases({ scenario: "NETWORK" });
    const userId = await loginAna(useCases);

    expect(await useCases.createTransfer(userId, draft)).toMatchObject({
      ok: true,
      value: { status: "COMPLETED" },
    });
  });
});
