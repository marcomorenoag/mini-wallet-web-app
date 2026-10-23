"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

/**
 * "Reintentar" of an error boundary. `retry()` re-fetches the segment inside a transition, so it is
 * wrapped in one here as well: the button stays disabled with a spinner until the segment is
 * rendered again (or fails again).
 */
export function RetryButton({ retry }: { readonly retry: () => void }) {
  const t = useTranslations("common");
  const [pending, startTransition] = useTransition();

  return (
    <Button disabled={pending} onClick={() => startTransition(retry)}>
      {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
      {t("retry")}
    </Button>
  );
}
