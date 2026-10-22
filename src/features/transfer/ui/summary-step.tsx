"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toMoneyDto } from "@/contracts/v1/dto";
import type { ProblemCode } from "@/contracts/v1/problem";
import { zero } from "@/domain/money/money";
import { problemMessageKey } from "@/i18n/error-messages";
import { formatMoney, formatPhone } from "@/i18n/format";
import { ROUTES } from "@/lib/routes";

import { createTransfer } from "../api";
import { checkAmount, selectedRecipient } from "../model/transfer-flow";
import { useTransferFlow } from "../transfer-flow-context";
import { ContactAvatar } from "./contact-avatar";

export function SummaryStep() {
  const t = useTranslations("transfer.summary");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const { draft, balance } = useTransferFlow();
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<ProblemCode | null>(null);

  const recipient = selectedRecipient(draft);
  const amount = checkAmount(draft.amountInput, balance);
  // The wizard only renders this step once both are valid.
  if (!recipient || !amount.ok) return null;

  const fee = zero(amount.amount.currency);

  const confirm = async () => {
    setPending(true);
    setProblem(null);
    const result = await createTransfer(
      { amount: toMoneyDto(amount.amount), recipientId: recipient.id },
      draft.idempotencyKey,
    );
    if (result.ok && result.data.status === "COMPLETED") {
      router.push(`${ROUTES.voucher}/${result.data.transfer.id}`);
      return;
    }
    setPending(false);
    setProblem(result.ok ? "UNKNOWN" : result.code);
  };

  const row = (label: string, value: string, emphasis = false) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={emphasis ? "text-lg font-semibold tabular-nums" : "text-sm tabular-nums"}>
        {value}
      </dd>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {problem ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{tErrors(problemMessageKey(problem))}</AlertDescription>
        </Alert>
      ) : null}

      <dl className="divide-y rounded-2xl border bg-card px-4">
        <div className="flex items-center gap-3 py-3">
          <dt className="sr-only">{t("to")}</dt>
          <dd className="flex items-center gap-3">
            <ContactAvatar name={recipient.name} />
            <span className="flex flex-col">
              <span className="text-sm font-medium">{recipient.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatPhone(recipient.phone, { masked: true })}
              </span>
            </span>
          </dd>
        </div>
        {row(t("amount"), formatMoney(amount.amount))}
        {row(t("fee"), formatMoney(fee))}
        {row(t("total"), formatMoney(amount.amount, { currencyDisplay: "code" }), true)}
      </dl>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          className="h-11 w-full text-base"
          disabled={pending}
          onClick={confirm}
        >
          {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
          {pending ? t("confirming") : t("confirm")}
        </Button>
        <Button asChild variant="ghost" size="lg" className="h-11 w-full text-base">
          <Link href={ROUTES.home} aria-disabled={pending}>
            {t("cancel")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
