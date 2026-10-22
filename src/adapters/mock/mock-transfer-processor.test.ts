import { describe, expect, it } from "vitest";

import { money } from "@/domain/money/money";
import type { ContactId } from "@/domain/contact/contact";
import type { IdempotencyKey } from "@/domain/transfer/transfer";

import { noLatency } from "./latency";
import { createMockTransferProcessor } from "./mock-transfer-processor";

const request = {
  idempotencyKey: "0b9f1f0e-3c1a-4d8e-9a57-2f6d1c3b8e41" as IdempotencyKey,
  recipient: { contactId: "cnt_luis" as ContactId, name: "Luis", phone: "+525511112222" },
  amount: money(100),
};

const create = (options: Partial<Parameters<typeof createMockTransferProcessor>[0]> = {}) => {
  const waits: number[] = [];
  const processor = createMockTransferProcessor({
    latency: noLatency,
    timeoutDelayMs: 15_000,
    wait: async (ms) => {
      waits.push(ms);
    },
    ...options,
  });
  return { processor, waits };
};

describe("mock transfer processor", () => {
  it("approves the SUCCESS scenario", async () => {
    const { processor } = create({ scenario: "SUCCESS" });
    expect(await processor.process(request)).toEqual({ status: "APPROVED" });
  });

  it.each(["INSUFFICIENT_FUNDS", "NETWORK", "UNKNOWN"] as const)(
    "rejects the %s scenario with its code",
    async (scenario) => {
      const { processor } = create({ scenario });
      expect(await processor.process(request)).toEqual({ status: "REJECTED", code: scenario });
    },
  );

  it("models TIMEOUT as a slow approval", async () => {
    const { processor, waits } = create({ scenario: "TIMEOUT" });
    expect(await processor.process(request)).toEqual({ status: "APPROVED" });
    expect(waits).toEqual([15_000]);
  });

  it("picks a random scenario when none is forced", async () => {
    const { processor } = create({ scenario: null, random: () => 0.75 });
    expect(await processor.process(request)).toEqual({ status: "REJECTED", code: "NETWORK" });
  });
});
