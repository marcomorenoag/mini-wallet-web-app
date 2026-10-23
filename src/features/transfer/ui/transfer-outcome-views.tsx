"use client";

import { CircleX, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { LinkPendingIcon } from "@/components/feedback/link-pending-icon";
import { StatusMessage } from "@/components/layout/status-message";
import { Button } from "@/components/ui/button";
import type { TransferFailureCode } from "@/domain/shared/error-codes";
import { ROUTES } from "@/lib/routes";

interface TransferFailureProps {
  readonly code: TransferFailureCode;
  /** Same idempotency key: nothing was applied, so the retry cannot debit twice. */
  readonly onRetry: () => void;
  /** The outcome is unknown, so it is checked by key instead of being retried blindly. */
  readonly onCheckStatus: () => void;
  /** The key has a final outcome, so the draft goes back to the amount with a new one. */
  readonly onChangeAmount: () => void;
}

/** Failure screen with the reason and the next safe action for each error code. */
export function TransferFailure({
  code,
  onRetry,
  onCheckStatus,
  onChangeAmount,
}: TransferFailureProps) {
  const t = useTranslations("transfer.failure");
  const tCommon = useTranslations("common");

  const primary = {
    INSUFFICIENT_FUNDS: { label: t("changeAmount"), onClick: onChangeAmount },
    NETWORK: { label: t("retry"), onClick: onRetry },
    TIMEOUT: { label: t("checkStatus"), onClick: onCheckStatus },
    UNKNOWN: { label: t("retry"), onClick: onRetry },
  }[code];

  return (
    <div role="alert" className="flex flex-1 flex-col">
      <StatusMessage
        icon={<CircleX aria-hidden className="text-destructive" />}
        title={t("title")}
        description={t(code)}
        headingLevel={2}
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button size="lg" onClick={primary.onClick}>
              {primary.label}
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={ROUTES.home}>
                <LinkPendingIcon />
                {tCommon("backToHome")}
              </Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}

/** Shown while an unknown outcome is being recovered by idempotency key. */
export function TransferVerifying() {
  const t = useTranslations("transfer.verifying");

  return (
    <div role="status" aria-live="polite" className="flex flex-1 flex-col">
      <StatusMessage
        icon={<LoaderCircle aria-hidden className="animate-spin" />}
        title={t("title")}
        description={t("description")}
        headingLevel={2}
      />
    </div>
  );
}
