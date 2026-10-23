"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { toMoneyDto } from "@/contracts/v1/dto";
import type { TransferFailureCode } from "@/domain/shared/error-codes";
import { ROUTES } from "@/lib/routes";

import { createTransfer, getAccountOverview, getTransferStatus } from "./api";
import { type ConfirmDeps, confirmTransfer, verifyTransfer } from "./model/confirm-transfer";
import { checkAmount, selectedRecipient } from "./model/transfer-flow";
import { useTransferFlow } from "./transfer-flow-context";

export type ConfirmationState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "verifying" }
  | { readonly status: "failed"; readonly code: TransferFailureCode };

/** Client-side patience for a confirmation; overridable at build time (E2E uses a short one). */
const TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_TRANSFER_TIMEOUT_MS) || 10_000;
const POLL_INTERVAL_MS = 1_500;
const POLL_ATTEMPTS = 20;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Confirmation of the current draft: submit, recover unknown outcomes, and route the result. */
export function useConfirmTransfer() {
  const { draft, balance, updateBalance } = useTransferFlow();
  const router = useRouter();
  const [state, setState] = useState<ConfirmationState>({ status: "idle" });
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The balance on screen was stale (e.g. spent from another device), so the current one is
  // fetched for the amount step. A router refresh is not used: it would restore the URL of the
  // step it was started on, undoing the client-side step change.
  const refreshBalance = useCallback(async () => {
    const result = await getAccountOverview();
    if (result.ok && mounted.current) updateBalance(result.data.balance);
  }, [updateBalance]);

  const run = useCallback(
    async (mode: "submit" | "verify") => {
      const recipient = selectedRecipient(draft);
      const amount = checkAmount(draft.amountInput, balance);
      if (!recipient || !amount.ok) return;

      setState({ status: mode === "submit" ? "submitting" : "verifying" });
      const deps: ConfirmDeps = {
        submit: (signal) =>
          createTransfer(
            { amount: toMoneyDto(amount.amount), recipientId: recipient.id },
            draft.idempotencyKey,
            { signal },
          ),
        checkStatus: () => getTransferStatus(draft.idempotencyKey),
        wait,
        timeoutMs: TIMEOUT_MS,
        pollIntervalMs: POLL_INTERVAL_MS,
        pollAttempts: POLL_ATTEMPTS,
        onVerifying: () => {
          if (mounted.current) setState({ status: "verifying" });
        },
      };

      const result = await (mode === "submit" ? confirmTransfer(deps) : verifyTransfer(deps));
      if (!mounted.current) return;

      switch (result.status) {
        case "COMPLETED":
          // The pending state is kept while the voucher loads.
          router.push(`${ROUTES.voucher}/${result.transferId}`);
          return;
        case "UNAUTHENTICATED":
          // A route handler clears the stale cookie, so a full navigation is used.
          window.location.assign(ROUTES.sessionExpired);
          return;
        case "FAILED":
          if (result.code === "INSUFFICIENT_FUNDS") void refreshBalance();
          setState({ status: "failed", code: result.code });
      }
    },
    [draft, balance, router, refreshBalance],
  );

  return {
    state,
    confirm: useCallback(() => run("submit"), [run]),
    checkStatus: useCallback(() => run("verify"), [run]),
    reset: useCallback(() => setState({ status: "idle" }), []),
  };
}
