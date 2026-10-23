"use client";

import { CloudOff } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { LinkPendingIcon } from "@/components/feedback/link-pending-icon";
import { RetryButton } from "@/components/feedback/retry-button";
import { PageShell } from "@/components/layout/page-shell";
import { StatusMessage } from "@/components/layout/status-message";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export default function VoucherError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <StatusMessage
        icon={<CloudOff aria-hidden />}
        title={t("voucher.errorTitle")}
        description={t("voucher.errorDescription")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={ROUTES.home}>
                <LinkPendingIcon />
                {t("common.backToHome")}
              </Link>
            </Button>
            <RetryButton retry={retry} />
          </div>
        }
      />
    </PageShell>
  );
}
