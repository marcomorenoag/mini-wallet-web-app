import type { TransferOutcomeDto } from "@/contracts/v1/dto";
import type { ProblemCode } from "@/contracts/v1/problem";
import { TRANSFER_FAILURE_CODES, type TransferFailureCode } from "@/domain/shared/error-codes";

import type { ApiResult } from "../api";

export type ConfirmResult =
  | { readonly status: "COMPLETED"; readonly transferId: string }
  | { readonly status: "FAILED"; readonly code: TransferFailureCode }
  | { readonly status: "UNAUTHENTICATED" };

export interface ConfirmDeps {
  readonly submit: (signal: AbortSignal) => Promise<ApiResult<TransferOutcomeDto>>;
  readonly checkStatus: () => Promise<ApiResult<TransferOutcomeDto>>;
  readonly wait: (ms: number) => Promise<void>;
  /** How long the client waits for the confirmation before treating the outcome as unknown. */
  readonly timeoutMs: number;
  readonly pollIntervalMs: number;
  readonly pollAttempts: number;
  /** Called when the outcome is unknown and the status starts being checked. */
  readonly onVerifying?: () => void;
}

const isTransferFailureCode = (code: ProblemCode): code is TransferFailureCode =>
  (TRANSFER_FAILURE_CODES as readonly string[]).includes(code);

const fromProblem = (code: ProblemCode): ConfirmResult =>
  code === "UNAUTHENTICATED"
    ? { status: "UNAUTHENTICATED" }
    : { status: "FAILED", code: isTransferFailureCode(code) ? code : "UNKNOWN" };

/** Final result of a response, or `null` while the outcome is still pending. */
const settle = (result: ApiResult<TransferOutcomeDto>): ConfirmResult | null => {
  if (!result.ok) return fromProblem(result.code);
  switch (result.data.status) {
    case "COMPLETED":
      return { status: "COMPLETED", transferId: result.data.transfer.id };
    case "FAILED":
      return { status: "FAILED", code: result.data.code };
    case "PENDING":
      return null;
  }
};

/**
 * Recovers the outcome of a confirmation by idempotency key. Pending outcomes are polled; an
 * unknown key means nothing was applied (the attempt was released), so a retry is safe. If the
 * outcome is still unknown after every attempt, TIMEOUT is reported and the check can be repeated.
 */
export const verifyTransfer = async (deps: ConfirmDeps): Promise<ConfirmResult> => {
  deps.onVerifying?.();
  for (let attempt = 0; attempt < deps.pollAttempts; attempt += 1) {
    await deps.wait(deps.pollIntervalMs);
    const status = await deps.checkStatus();
    if (!status.ok && status.code === "NOT_FOUND") return { status: "FAILED", code: "NETWORK" };
    // A lookup that fails on its own (e.g. connectivity) is simply tried again.
    if (!status.ok && status.code !== "UNAUTHENTICATED") continue;
    const result = settle(status);
    if (result) return result;
  }
  return { status: "FAILED", code: "TIMEOUT" };
};

/**
 * Confirms a transfer. The request is aborted after `timeoutMs`; since the server may still apply
 * it, a timed-out or pending confirmation is never retried blindly but checked by its key.
 */
export const confirmTransfer = async (deps: ConfirmDeps): Promise<ConfirmResult> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs);
  let result: ApiResult<TransferOutcomeDto> | null = null;
  try {
    result = await deps.submit(controller.signal);
  } catch (error) {
    if (!controller.signal.aborted) throw error;
  } finally {
    clearTimeout(timer);
  }

  const settled = result ? settle(result) : null;
  return settled ?? verifyTransfer(deps);
};
