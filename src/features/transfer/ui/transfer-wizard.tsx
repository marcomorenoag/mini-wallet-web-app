"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { randomUUID } from "@/lib/random-uuid";
import { ROUTES } from "@/lib/routes";

import { firstIncompleteStep, TRANSFER_STEPS, type TransferStep } from "../model/transfer-flow";
import { useTransferFlow } from "../transfer-flow-context";
import { useConfirmTransfer } from "../use-confirm-transfer";
import { useTransferStep } from "../use-transfer-step";
import { AmountStep } from "./amount-step";
import { RecipientStep } from "./recipient-step";
import { StepHeading } from "./step-heading";
import { SummaryStep } from "./summary-step";
import { TransferFailure, TransferVerifying } from "./transfer-outcome-views";

const indexOf = (step: TransferStep) => TRANSFER_STEPS.indexOf(step);

const PREVIOUS: Record<TransferStep, string> = {
  amount: ROUTES.home,
  recipient: `${ROUTES.transfer}?step=amount`,
  summary: `${ROUTES.transfer}?step=recipient`,
};

/** Back link of the top bar; it follows the wizard step. */
export function TransferBackLink() {
  const t = useTranslations("transfer");
  const { step } = useTransferStep();

  return (
    <Button asChild variant="ghost" size="icon" aria-label={t("back")}>
      <Link href={PREVIOUS[step]}>
        <ArrowLeft aria-hidden />
      </Link>
    </Button>
  );
}

/** Amount → recipient → summary, client-rendered over data loaded by the page. */
export function TransferWizard() {
  const t = useTranslations("transfer");
  const { draft, dispatch, balance } = useTransferFlow();
  const { step, goTo } = useTransferStep();
  const confirmation = useConfirmTransfer();
  // Focus moves to the step title on step changes, but not on the first render.
  const [previousStep, setPreviousStep] = useState(step);
  const [hasNavigated, setHasNavigated] = useState(false);
  if (step !== previousStep) {
    setPreviousStep(step);
    setHasNavigated(true);
  }

  // A step whose prerequisites are missing (e.g. after a refresh) falls back to the first gap.
  const missing = firstIncompleteStep(draft, balance);
  const blocked = missing !== null && indexOf(step) > indexOf(missing);

  useEffect(() => {
    if (blocked) goTo(missing, { replace: true });
  }, [blocked, missing, goTo]);

  if (blocked) return null;

  // Outcomes of the confirmation replace the wizard until the user picks the next action.
  if (confirmation.state.status === "verifying") return <TransferVerifying />;
  if (confirmation.state.status === "failed") {
    return (
      <TransferFailure
        code={confirmation.state.code}
        onRetry={confirmation.confirm}
        onCheckStatus={confirmation.checkStatus}
        onChangeAmount={() => {
          dispatch({ type: "NEW_ATTEMPT", idempotencyKey: randomUUID() });
          confirmation.reset();
          goTo("amount");
        }}
      />
    );
  }

  const titles = {
    amount: t("amount.title"),
    recipient: t("recipient.title"),
    summary: t("summary.title"),
  } satisfies Record<TransferStep, string>;

  return (
    <div className="flex flex-col gap-6" key={step}>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          {t("stepProgress", { current: indexOf(step) + 1, total: TRANSFER_STEPS.length })}
        </p>
        <StepHeading focusOnMount={hasNavigated}>{titles[step]}</StepHeading>
      </div>
      {step === "amount" ? <AmountStep onContinue={() => goTo("recipient")} /> : null}
      {step === "recipient" ? <RecipientStep onContinue={() => goTo("summary")} /> : null}
      {step === "summary" ? (
        <SummaryStep
          pending={confirmation.state.status === "submitting"}
          onConfirm={confirmation.confirm}
        />
      ) : null}
    </div>
  );
}
