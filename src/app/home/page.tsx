import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { BalanceCardSkeleton } from "@/features/home/ui/balance-card";
import { MovementListSkeleton } from "@/features/home/ui/movement-list";
import { BalanceSection, MovementsSection } from "@/features/home/ui/sections";
import { ROUTES } from "@/lib/routes";
import { getCurrentUser } from "@/server/current-user";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("metadataTitle") };
}

/** Rendered on the server; balance and movements stream in independently behind skeletons. */
export default async function HomePage() {
  const [user, t] = await Promise.all([getCurrentUser(), getTranslations("home")]);

  return (
    <>
      <Suspense fallback={<BalanceCardSkeleton />}>
        <BalanceSection userId={user.id} />
      </Suspense>

      <Button asChild size="lg" className="h-11 text-base">
        <Link href={ROUTES.transfer}>
          <Plus aria-hidden />
          {t("newTransfer")}
        </Link>
      </Button>

      <section aria-labelledby="movements-title" className="flex flex-col gap-3">
        <h2 id="movements-title" className="font-heading text-base font-semibold">
          {t("movementsTitle")}
        </h2>
        <Suspense fallback={<MovementListSkeleton />}>
          <MovementsSection userId={user.id} />
        </Suspense>
      </section>
    </>
  );
}
