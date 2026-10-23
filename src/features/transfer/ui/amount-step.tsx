"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ValidationErrorCode } from "@/domain/shared/error-codes";
import { validationMessageKey } from "@/i18n/error-messages";
import { formatMoney } from "@/i18n/format";

import { checkAmount } from "../model/transfer-flow";
import { useTransferFlow } from "../transfer-flow-context";

export function AmountStep({ onContinue }: { readonly onContinue: () => void }) {
  const t = useTranslations("transfer.amount");
  const tErrors = useTranslations("errors");
  const { draft, dispatch, balance } = useTransferFlow();
  const [error, setError] = useState<ValidationErrorCode | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const check = checkAmount(draft.amountInput, balance);
    if (!check.ok) {
      setError(check.code);
      inputRef.current?.focus();
      return;
    }
    onContinue();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="amount">{t("label")}</Label>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-2xl text-muted-foreground"
          >
            $
          </span>
          <Input
            ref={inputRef}
            id="amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={draft.amountInput}
            onChange={(event) => {
              dispatch({ type: "AMOUNT_CHANGED", input: event.target.value });
              // Once an error was shown, it is re-checked while typing so it clears when fixed.
              if (error) {
                const check = checkAmount(event.target.value, balance);
                setError(check.ok ? null : check.code);
              }
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${errorId}-hint ${error ? errorId : ""}`.trim()}
            className="h-14 pr-14 pl-8 text-2xl font-semibold tabular-nums md:text-2xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
          >
            {balance.currency}
          </span>
        </div>
        <p id={`${errorId}-hint`} className="text-sm text-muted-foreground">
          {t("available", { balance: formatMoney(balance) })}
        </p>
        <p id={errorId} aria-live="polite" className="min-h-5 text-sm text-destructive">
          {error ? tErrors(validationMessageKey(error)) : null}
        </p>
      </div>
      <Button type="submit" size="lg" className="h-11 w-full text-base">
        {t("continue")}
      </Button>
    </form>
  );
}
