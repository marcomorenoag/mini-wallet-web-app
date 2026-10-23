"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { RetryButton } from "@/components/feedback/retry-button";
import { PageShell } from "@/components/layout/page-shell";
import { StatusMessage } from "@/components/layout/status-message";

/** Fallback for unexpected render errors; feature routes provide their own, more specific ones. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <StatusMessage
        icon={<TriangleAlert aria-hidden />}
        title={t("errorPage.title")}
        description={t("errorPage.description")}
        action={<RetryButton retry={retry} />}
      />
    </PageShell>
  );
}
