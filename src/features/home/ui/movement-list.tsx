import { ArrowDownLeft, ArrowUpRight, ReceiptText } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatusMessage } from "@/components/layout/status-message";
import { Skeleton } from "@/components/ui/skeleton";
import { isCredit, signedAmount, type Movement } from "@/domain/account/movement";
import { formatDateTime, formatMoney } from "@/i18n/format";
import { cn } from "@/lib/utils";

const LIST = "divide-y rounded-2xl border bg-card px-4";
const ROW = "flex items-center gap-3 py-3";

export function MovementList({ movements }: { readonly movements: readonly Movement[] }) {
  const t = useTranslations("home");

  if (movements.length === 0) {
    return (
      <StatusMessage
        icon={<ReceiptText aria-hidden />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        headingLevel={3}
        className="rounded-2xl border bg-card py-10"
      />
    );
  }

  return (
    <ul className={LIST}>
      {movements.map((movement) => {
        const credit = isCredit(movement);
        const Icon = credit ? ArrowDownLeft : ArrowUpRight;
        return (
          <li key={movement.id} className={ROW}>
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:size-5",
                credit ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon aria-hidden />
              <span className="sr-only">
                {t(credit ? "movementKind.credit" : "movementKind.debit")}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {t(`movement.${movement.type}`, { name: movement.counterpartyName })}
              </p>
              <p className="text-xs text-muted-foreground">
                <time dateTime={movement.createdAt}>{formatDateTime(movement.createdAt)}</time>
              </p>
            </div>
            <p className={cn("text-sm font-semibold tabular-nums", credit && "text-success")}>
              {formatMoney(signedAmount(movement), { sign: "always" })}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function MovementListSkeleton({ rows = 4 }: { readonly rows?: number }) {
  return (
    <div className={LIST} aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={ROW}>
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
