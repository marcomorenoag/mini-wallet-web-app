import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function VoucherLoading() {
  return (
    <PageShell header={<Skeleton className="h-6 w-32" />}>
      <div className="flex flex-col items-center gap-6" aria-hidden>
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </PageShell>
  );
}
