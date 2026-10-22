import type { UserId } from "@/domain/user/user";

import { loadAccountOverview, loadMovements } from "../data";
import { BalanceCard } from "./balance-card";
import { MovementList } from "./movement-list";

// Async Server Components, each streamed behind its own Suspense boundary.

export async function BalanceSection({ userId }: { readonly userId: UserId }) {
  const { balance } = await loadAccountOverview(userId);
  return <BalanceCard balance={balance} />;
}

export async function MovementsSection({ userId }: { readonly userId: UserId }) {
  return <MovementList movements={await loadMovements(userId)} />;
}
