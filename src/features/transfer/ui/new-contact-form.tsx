"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProblemCode } from "@/contracts/v1/problem";
import { NewContactInputSchema } from "@/domain/contact/contact";
import type { ValidationErrorCode } from "@/domain/shared/error-codes";
import { toValidationIssues, type ValidationIssue } from "@/domain/shared/validation";
import { problemMessageKey, validationMessageKey } from "@/i18n/error-messages";

import { createContact } from "../api";
import { useTransferFlow } from "../transfer-flow-context";

type Field = "name" | "phone";
type FieldErrors = Partial<Record<Field, ValidationErrorCode>>;

const toFieldErrors = (issues: readonly ValidationIssue[]): FieldErrors =>
  Object.fromEntries(
    issues
      .filter(({ field }) => field === "name" || field === "phone")
      .map(({ field, code }) => [field, code]),
  );

/** Inline form that saves a new favorite contact through the API and selects it. */
export function NewContactForm({ onDone }: { readonly onDone: () => void }) {
  const t = useTranslations("transfer.newContact");
  const tErrors = useTranslations("errors");
  const { dispatch } = useTransferFlow();
  const [values, setValues] = useState({ name: "", phone: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<ProblemCode | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = NewContactInputSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(toValidationIssues(parsed.error)));
      return;
    }

    setPending(true);
    setProblem(null);
    const result = await createContact({ ...values, isFavorite: true });
    setPending(false);

    if (result.ok) {
      dispatch({ type: "CONTACT_SAVED", contact: result.data });
      onDone();
    } else if (result.code === "VALIDATION") {
      setErrors(toFieldErrors(result.issues));
    } else {
      setProblem(result.code);
    }
  };

  const field = (name: Field, type: "text" | "tel") => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`contact-${name}`}>{t(name)}</Label>
      <Input
        id={`contact-${name}`}
        name={name}
        type={type}
        inputMode={type === "tel" ? "tel" : undefined}
        autoComplete={type === "tel" ? "tel-national" : "name"}
        placeholder={t(`${name}Placeholder`)}
        value={values[name]}
        onChange={(event) => {
          setValues((current) => ({ ...current, [name]: event.target.value }));
          setErrors((current) => ({ ...current, [name]: undefined }));
        }}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `contact-${name}-error` : undefined}
        className="h-11 text-base"
      />
      {errors[name] ? (
        <p id={`contact-${name}-error`} className="text-sm text-destructive">
          {tErrors(validationMessageKey(errors[name]))}
        </p>
      ) : null}
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={t("title")}
      className="flex flex-col gap-4 rounded-2xl border bg-card p-4"
    >
      <h3 className="font-heading text-base font-semibold">{t("title")}</h3>
      {problem ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <p className="col-start-2 text-sm">{tErrors(problemMessageKey(problem))}</p>
        </Alert>
      ) : null}
      {field("name", "text")}
      {field("phone", "tel")}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onDone}>
          {t("cancel")}
        </Button>
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
