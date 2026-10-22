import { SearchX } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { PageShell } from "@/components/layout/page-shell";
import { StatusMessage } from "@/components/layout/status-message";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations();

  return (
    <PageShell>
      <StatusMessage
        icon={<SearchX aria-hidden />}
        title={t("notFound.title")}
        description={t("notFound.description")}
        action={
          <Button asChild>
            <Link href="/home">{t("common.backToHome")}</Link>
          </Button>
        }
      />
    </PageShell>
  );
}
