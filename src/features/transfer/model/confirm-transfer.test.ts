import { describe, expect, it, vi } from "vitest";

import type { TransferOutcomeDto } from "@/contracts/v1/dto";
import type { ProblemCode } from "@/contracts/v1/problem";

import type { ApiResult } from "../api";
import { type ConfirmDeps, confirmTransfer, verifyTransfer } from "./confirm-transfer";

type Outcome = ApiResult<TransferOutcomeDto>;

const completed: Outcome = {
  ok: true,
  status: 201,
  data: {
    status: "COMPLETED",
    transfer: {
      id: "trf_1",
      idempotencyKey: "key",
      recipient: { contactId: "cnt_luis", name: "Luis Pérez", phone: "+525511112222" },
      amount: { amount: 25_000, currency: "MXN" },
      createdAt: "2026-10-22T16:42:00.000Z",
    },
  },
};
const pending: Outcome = { ok: true, status: 202, data: { status: "PENDING" } };
const failedOutcome = (
  code: "INSUFFICIENT_FUNDS" | "NETWORK" | "TIMEOUT" | "UNKNOWN",
): Outcome => ({
  ok: true,
  status: 200,
  data: { status: "FAILED", code },
});
const problem = (code: ProblemCode): Outcome => ({ ok: false, code, issues: [] });

const deps = (overrides: Partial<ConfirmDeps>): ConfirmDeps => ({
  submit: vi.fn(async () => completed),
  checkStatus: vi.fn(async () => completed),
  wait: vi.fn(async () => undefined),
  timeoutMs: 1_000,
  pollIntervalMs: 10,
  pollAttempts: 3,
  ...overrides,
});

describe("confirmTransfer", () => {
  it("completes without checking the status when the server answers in time", async () => {
    const d = deps({});
    expect(await confirmTransfer(d)).toEqual({ status: "COMPLETED", transferId: "trf_1" });
    expect(d.checkStatus).not.toHaveBeenCalled();
  });

  it.each(["INSUFFICIENT_FUNDS", "NETWORK", "UNKNOWN"] as const)(
    "reports a %s failure",
    async (code) => {
      expect(await confirmTransfer(deps({ submit: async () => problem(code) }))).toEqual({
        status: "FAILED",
        code,
      });
    },
  );

  it("maps non-transfer problems to UNKNOWN and an expired session to UNAUTHENTICATED", async () => {
    expect(await confirmTransfer(deps({ submit: async () => problem("VALIDATION") }))).toEqual({
      status: "FAILED",
      code: "UNKNOWN",
    });
    expect(await confirmTransfer(deps({ submit: async () => problem("UNAUTHENTICATED") }))).toEqual(
      { status: "UNAUTHENTICATED" },
    );
  });

  it("checks the status by key after a client timeout instead of retrying", async () => {
    vi.useFakeTimers();
    const onVerifying = vi.fn();
    const submit = vi.fn(
      (signal: AbortSignal) =>
        new Promise<Outcome>((_, reject) =>
          signal.addEventListener("abort", () => reject(new DOMException("", "AbortError"))),
        ),
    );
    const d = deps({
      submit,
      checkStatus: vi.fn().mockResolvedValueOnce(pending).mockResolvedValue(completed),
      onVerifying,
    });

    const result = confirmTransfer(d);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(await result).toEqual({ status: "COMPLETED", transferId: "trf_1" });
    expect(submit).toHaveBeenCalledOnce();
    expect(onVerifying).toHaveBeenCalledOnce();
    expect(d.checkStatus).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("checks the status when a duplicate request is still pending", async () => {
    const d = deps({ submit: async () => pending });
    expect(await confirmTransfer(d)).toEqual({ status: "COMPLETED", transferId: "trf_1" });
    expect(d.checkStatus).toHaveBeenCalledOnce();
  });

  it("rethrows errors that are not caused by its own timeout", async () => {
    await expect(
      confirmTransfer(deps({ submit: async () => Promise.reject(new Error("bug")) })),
    ).rejects.toThrow("bug");
  });
});

describe("verifyTransfer", () => {
  it("reports TIMEOUT when the outcome is still unknown after every attempt", async () => {
    const d = deps({ checkStatus: vi.fn(async () => pending) });
    expect(await verifyTransfer(d)).toEqual({ status: "FAILED", code: "TIMEOUT" });
    expect(d.checkStatus).toHaveBeenCalledTimes(3);
  });

  it("keeps checking through lookup failures and returns the final outcome", async () => {
    const d = deps({
      checkStatus: vi
        .fn()
        .mockResolvedValueOnce(problem("NETWORK"))
        .mockResolvedValue(failedOutcome("INSUFFICIENT_FUNDS")),
    });
    expect(await verifyTransfer(d)).toEqual({ status: "FAILED", code: "INSUFFICIENT_FUNDS" });
  });

  it("treats an unknown key as an attempt that was not applied, so it can be retried", async () => {
    expect(await verifyTransfer(deps({ checkStatus: async () => problem("NOT_FOUND") }))).toEqual({
      status: "FAILED",
      code: "NETWORK",
    });
  });
});
