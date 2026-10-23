import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import type { Money } from "@/domain/money/money";
import { formatMoney } from "@/i18n/format";

const CARD = "flex flex-col gap-2 rounded-2xl p-6";

export function BalanceCard({ balance }: { readonly balance: Money }) {
  const t = useTranslations("home");

  return (
    <section
      aria-labelledby="balance-label"
      className={`${CARD} bg-primary text-primary-foreground`}
    >
      <h2 id="balance-label" className="text-sm opacity-90">
        {t("balanceLabel")}
      </h2>
      <p className="flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">
          {formatMoney(balance)}
        </span>
        <span className="text-sm font-medium opacity-90">{balance.currency}</span>
      </p>
    </section>
  );
}

export function BalanceCardSkeleton() {
  return (
    <div className={`${CARD} bg-muted`} aria-hidden>
      <Skeleton className="h-4 w-28 bg-foreground/10" />
      <Skeleton className="h-10 w-48 bg-foreground/10" />
    </div>
  );
}
