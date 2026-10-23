"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { parseStep, type TransferStep } from "./model/transfer-flow";

/**
 * The current wizard step lives in `?step=`, so refresh and the browser back button work.
 *
 * Steps are changed through the native History API, which is synced with `useSearchParams` by
 * Next.js. A router navigation would re-render the page on the server (reloading the balance and
 * contacts) on every step, with no feedback while waiting; a history entry is applied instantly.
 */
export function useTransferStep() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const step = parseStep(searchParams.get("step"));

  const goTo = useCallback(
    (next: TransferStep, { replace = false }: { replace?: boolean } = {}) => {
      const url = `${pathname}?step=${next}`;
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
    },
    [pathname],
  );

  return { step, goTo };
}
