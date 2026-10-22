import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function TransferLoading() {
  return (
    <PageShell header={<Skeleton className="h-6 w-48" />}>
      <div className="flex flex-col gap-6" aria-hidden>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </PageShell>
  );
}
