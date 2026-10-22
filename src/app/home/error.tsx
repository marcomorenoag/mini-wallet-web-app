"use client";

import { CloudOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { StatusMessage } from "@/components/layout/status-message";
import { Button } from "@/components/ui/button";

/** Error state of Home (e.g. a simulated network failure); the header stays usable above it. */
export default function HomeError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusMessage
      icon={<CloudOff aria-hidden />}
      title={t("home.errorTitle")}
      description={t("home.errorDescription")}
      headingLevel={2}
      action={<Button onClick={retry}>{t("common.retry")}</Button>}
    />
  );
}
