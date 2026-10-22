"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ContactDto } from "@/contracts/v1/dto";
import { validationMessageKey } from "@/i18n/error-messages";
import { formatPhone } from "@/i18n/format";

import { selectedRecipient } from "../model/transfer-flow";
import { useTransferFlow } from "../transfer-flow-context";
import { ContactAvatar } from "./contact-avatar";
import { NewContactForm } from "./new-contact-form";

function ContactGroup({
  legend,
  contacts,
  selectedId,
  onSelect,
}: {
  readonly legend: string;
  readonly contacts: readonly ContactDto[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
}) {
  if (contacts.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-muted-foreground">{legend}</legend>
      {contacts.map((contact) => (
        <label
          key={contact.id}
          className="group flex cursor-pointer items-center gap-3 rounded-2xl border bg-card p-3 transition-colors hover:bg-accent has-checked:border-primary has-checked:ring-2 has-checked:ring-primary/30 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
        >
          <input
            type="radio"
            name="recipient"
            value={contact.id}
            checked={contact.id === selectedId}
            onChange={() => onSelect(contact.id)}
            className="sr-only"
          />
          <ContactAvatar name={contact.name} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{contact.name}</span>
            <span className="text-xs text-muted-foreground">{formatPhone(contact.phone)}</span>
          </span>
          <span
            aria-hidden
            className="size-4 shrink-0 rounded-full border-2 border-input group-has-checked:border-5 group-has-checked:border-primary"
          />
        </label>
      ))}
    </fieldset>
  );
}

export function RecipientStep({ onContinue }: { readonly onContinue: () => void }) {
  const t = useTranslations("transfer.recipient");
  const tErrors = useTranslations("errors");
  const { draft, dispatch } = useTransferFlow();
  const [adding, setAdding] = useState(false);
  const [showError, setShowError] = useState(false);
  const errorId = useId();

  const favorites = draft.contacts.filter(({ isFavorite }) => isFavorite);
  const others = draft.contacts.filter(({ isFavorite }) => !isFavorite);
  const select = (contactId: string) => {
    dispatch({ type: "RECIPIENT_SELECTED", contactId });
    setShowError(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {draft.contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-6" aria-describedby={showError ? errorId : undefined}>
          <ContactGroup
            legend={t("favorites")}
            contacts={favorites}
            selectedId={draft.recipientId}
            onSelect={select}
          />
          <ContactGroup
            legend={t("others")}
            contacts={others}
            selectedId={draft.recipientId}
            onSelect={select}
          />
        </div>
      )}

      {adding ? (
        <NewContactForm onDone={() => setAdding(false)} />
      ) : (
        <Button type="button" variant="outline" onClick={() => setAdding(true)}>
          <Plus aria-hidden />
          {t("new")}
        </Button>
      )}

      <p id={errorId} aria-live="polite" className="min-h-5 text-sm text-destructive">
        {showError ? tErrors(validationMessageKey("RECIPIENT_REQUIRED")) : null}
      </p>

      <Button
        type="button"
        size="lg"
        className="h-11 w-full text-base"
        onClick={() => {
          if (selectedRecipient(draft)) onContinue();
          else setShowError(true);
        }}
      >
        {t("continue")}
      </Button>
    </div>
  );
}
