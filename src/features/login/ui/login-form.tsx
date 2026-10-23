"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useId, useRef, useState, type FormEvent } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginIdentifierSchema } from "@/domain/auth/login-identifier";
import type { ValidationErrorCode } from "@/domain/shared/error-codes";
import { toValidationIssues } from "@/domain/shared/validation";
import { problemMessageKey, validationMessageKey } from "@/i18n/error-messages";

import { loginAction } from "../actions";
import { INITIAL_LOGIN_STATE } from "../login-form-state";

/** Same schema as the server, for instant feedback; the server re-validates on submit. */
const validateIdentifier = (value: string): ValidationErrorCode | null => {
  const result = LoginIdentifierSchema.safeParse(value);
  return result.success ? null : (toValidationIssues(result.error)[0]?.code ?? "INVALID");
};

interface LoginFormProps {
  /** Destination kept by the proxy; validated again on the server. */
  readonly next?: string | undefined;
}

export function LoginForm({ next }: LoginFormProps) {
  const t = useTranslations("login");
  const tErrors = useTranslations("errors");
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_LOGIN_STATE);

  const [clientError, setClientError] = useState<ValidationErrorCode | null>(null);
  // A server error is hidden once the field is edited after that response.
  const [editedAfter, setEditedAfter] = useState<typeof state | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const serverFieldError = editedAfter === state ? undefined : state.fieldError;
  const fieldError = clientError ?? serverFieldError;
  const problem = pending ? undefined : state.problem;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    // The field is read from the DOM, not from state: a value typed or autofilled before the page
    // was hydrated never went through `onChange`, but it is what the user sees and submits.
    const value = new FormData(event.currentTarget).get("identifier");
    const error = validateIdentifier(typeof value === "string" ? value : "");
    if (!error) return;
    // Invalid input never reaches the server.
    event.preventDefault();
    setClientError(error);
    inputRef.current?.focus();
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {problem ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{tErrors(problemMessageKey(problem))}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="identifier">{t("identifierLabel")}</Label>
        <Input
          ref={inputRef}
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t("identifierPlaceholder")}
          // Uncontrolled, so hydration never resets what was typed before it. The submitted value
          // is echoed by the action, and React restores it when it resets the form afterwards.
          defaultValue={state.identifier}
          onChange={(event) => {
            setEditedAfter(state);
            // Once an error was shown, it is re-checked while typing so it clears when fixed.
            if (clientError) setClientError(validateIdentifier(event.target.value));
          }}
          onBlur={(event) => {
            const { value } = event.target;
            if (value.trim()) setClientError(validateIdentifier(value));
          }}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? errorId : undefined}
          className="h-11 text-base"
        />
        <p id={errorId} aria-live="polite" className="min-h-5 text-sm text-destructive">
          {fieldError ? tErrors(validationMessageKey(fieldError)) : null}
        </p>
      </div>

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle aria-hidden className="animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">{t("demoAccounts")}</p>
    </form>
  );
}
