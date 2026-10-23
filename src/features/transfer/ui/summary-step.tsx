"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { LinkPendingIcon } from "@/components/feedback/link-pending-icon";
import { Button } from "@/components/ui/button";
import { zero } from "@/domain/money/money";
import { formatMoney, formatPhone } from "@/i18n/format";
import { ROUTES } from "@/lib/routes";

import { checkAmount, selectedRecipient } from "../model/transfer-flow";
import { useTransferFlow } from "../transfer-flow-context";
import { ContactAvatar } from "./contact-avatar";

interface SummaryStepProps {
  readonly pending: boolean;
  readonly onConfirm: () => void;
}

export function SummaryStep({ pending, onConfirm }: SummaryStepProps) {
  const t = useTranslations("transfer.summary");
  const { draft, balance } = useTransferFlow();

  const recipient = selectedRecipient(draft);
  const amount = checkAmount(draft.amountInput, balance);
  // The wizard only renders this step once both are valid.
  if (!recipient || !amount.ok) return null;

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
        {row(t("fee"), formatMoney(zero(amount.amount.currency)))}
        {row(t("total"), formatMoney(amount.amount, { currencyDisplay: "code" }), true)}
      </dl>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          className="h-11 w-full text-base"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
          {pending ? t("confirming") : t("confirm")}
        </Button>
        {pending ? null : (
          <Button asChild variant="ghost" size="lg" className="h-11 w-full text-base">
            <Link href={ROUTES.home}>
              <LinkPendingIcon />
              {t("cancel")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
