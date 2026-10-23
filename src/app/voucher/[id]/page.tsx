import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { formatFolio } from "@/features/voucher/folio";
import { loadVoucher } from "@/features/voucher/data";
import { ShareVoucherButton } from "@/features/voucher/ui/share-voucher-button";
import { VoucherCard } from "@/features/voucher/ui/voucher-card";
import { formatDateTime, formatMoney } from "@/i18n/format";
import { ROUTES } from "@/lib/routes";
import { getCurrentUser } from "@/server/current-user";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("voucher");
  return { title: t("metadataTitle") };
}

/** Server-rendered by transfer id, so the voucher survives a refresh and can be revisited. */
export default async function VoucherPage({ params }: PageProps<"/voucher/[id]">) {
  const [{ id }, user, t] = await Promise.all([
    params,
    getCurrentUser(),
    getTranslations("voucher"),
  ]);
  const transfer = await loadVoucher(user.id, id);

  const shareText = t("shareText", {
    amount: formatMoney(transfer.amount, { currencyDisplay: "code" }),
    name: transfer.recipient.name,
    folio: formatFolio(transfer.id),
    date: formatDateTime(transfer.createdAt, "long"),
  });

  return (
    <PageShell header={<h1 className="font-heading text-lg font-semibold">{t("title")}</h1>}>
      <VoucherCard transfer={transfer} />
      <div className="flex flex-col gap-2">
        <Button asChild size="lg" className="h-11 w-full text-base">
          <Link href={ROUTES.home}>{t("backToHome")}</Link>
        </Button>
        <ShareVoucherButton text={shareText} />
      </div>
    </PageShell>
  );
}
