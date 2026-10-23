import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Transfer } from "@/domain/transfer/transfer";
import { formatDateTime, formatMoney, formatPhone } from "@/i18n/format";

import { formatFolio } from "../folio";

/** Receipt of a completed transfer. */
export function VoucherCard({ transfer }: { readonly transfer: Transfer }) {
  const t = useTranslations("voucher");

  const rows: readonly [string, string][] = [
    [t("folio"), formatFolio(transfer.id)],
    [
      t("to"),
      `${transfer.recipient.name} · ${formatPhone(transfer.recipient.phone, { masked: true })}`,
    ],
    [t("amount"), formatMoney(transfer.amount, { currencyDisplay: "code" })],
    [t("date"), formatDateTime(transfer.createdAt, "long")],
    [t("status"), t("completed")],
  ];

  return (
    <section aria-labelledby="voucher-title" className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-success/10 text-success [&_svg]:size-8">
          <CircleCheck aria-hidden />
        </div>
        <h2 id="voucher-title" className="font-heading text-xl font-semibold">
          {t("success")}
        </h2>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {formatMoney(transfer.amount)}
        </p>
      </div>
      <dl className="w-full divide-y rounded-2xl border bg-card px-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-right text-sm font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
